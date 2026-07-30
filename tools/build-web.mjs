import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const www = path.join(root, 'www');
const src = path.join(root, 'src');

async function copyFileSafe(from, to) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function copyDirFiltered(from, to, predicate = () => true) {
  await fs.mkdir(to, { recursive: true });
  for (const ent of await fs.readdir(from, { withFileTypes: true })) {
    const a = path.join(from, ent.name);
    const b = path.join(to, ent.name);
    if (ent.isDirectory()) await copyDirFiltered(a, b, predicate);
    else if (predicate(a)) await copyFileSafe(a, b);
  }
}

await fs.rm(www, { recursive: true, force: true });
await fs.mkdir(path.join(www, 'assets'), { recursive: true });
await copyFileSafe(path.join(src, 'index.html'), path.join(www, 'index.html'));
await copyFileSafe(path.join(src, 'styles.css'), path.join(www, 'styles.css'));

await build({
  entryPoints: [path.join(src, 'app.js')],
  bundle: true,
  format: 'iife',
  globalName: 'QuizMedXBundle',
  outfile: path.join(www, 'app.js'),
  platform: 'browser',
  target: ['chrome61'],
  sourcemap: false,
  minify: true,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: {
    '.wasm': 'file',
    '.worker.js': 'file'
  }
});

// Local OCR runtime assets — no CDN and no external API at runtime.
const nm = path.join(root, 'node_modules');
const tessDist = path.join(nm, 'tesseract.js', 'dist');
const tessCore = path.join(nm, 'tesseract.js-core');
const tessAssets = path.join(www, 'assets', 'tesseract');
try {
  await copyFileSafe(path.join(tessDist, 'worker.min.js'), path.join(tessAssets, 'worker.min.js'));
  await copyDirFiltered(tessCore, tessAssets, file => /tesseract-core.*\.(js|wasm)$/.test(path.basename(file)));
} catch (err) {
  console.warn('Tesseract runtime assets were not copied:', err.message);
}

// Trained data packages are copied into the APK for offline Arabic + English OCR.
const tessData = path.join(www, 'assets', 'tessdata');
await fs.mkdir(tessData, { recursive: true });
for (const lang of ['eng', 'ara']) {
  const pkgDir = path.join(nm, '@tesseract.js-data', lang, '4.0.0');
  const direct = path.join(nm, '@tesseract.js-data', lang, `${lang}.traineddata.gz`);
  try {
    const candidates = [direct, path.join(pkgDir, `${lang}.traineddata.gz`)];
    let copied = false;
    for (const c of candidates) {
      try { await copyFileSafe(c, path.join(tessData, `${lang}.traineddata.gz`)); copied = true; break; } catch {}
    }
    if (!copied) {
      const files = await fs.readdir(path.join(nm, '@tesseract.js-data', lang), { recursive: true });
      const found = files.find(f => String(f).endsWith(`${lang}.traineddata.gz`));
      if (found) await copyFileSafe(path.join(nm, '@tesseract.js-data', lang, found), path.join(tessData, `${lang}.traineddata.gz`));
    }
  } catch (err) {
    console.warn(`Language data ${lang} not copied:`, err.message);
  }
}

await fs.writeFile(path.join(www, 'native.js'), '/* QuizMed X is fully offline. No native network bridge is used. */\n', 'utf8');
console.log('QuizMed X web bundle created at www/');
