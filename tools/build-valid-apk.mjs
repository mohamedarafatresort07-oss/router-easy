#!/usr/bin/env node
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'quizmedx-apk-'));
const nitronDir = path.join(tmpRoot, 'nitron');
const projectDir = path.join(tmpRoot, 'project');
const finalApk = path.join(root, 'QuizMedX-offline-debug.apk');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: opts.cwd || root, stdio: opts.capture ? 'pipe' : 'inherit', encoding: 'utf8', env: { ...process.env, ...(opts.env || {}) } });
  if (res.status !== 0) {
    const out = `${res.stdout || ''}${res.stderr || ''}`;
    throw new Error(`${cmd} ${args.join(' ')} failed\n${out}`);
  }
  return res.stdout || '';
}
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const ent of await fs.readdir(src, { withFileTypes: true })) {
    const a = path.join(src, ent.name), b = path.join(dest, ent.name);
    if (ent.isDirectory()) await copyDir(a, b);
    else if (ent.isFile()) await fs.copyFile(a, b);
  }
}
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

try {
  await fs.mkdir(nitronDir, { recursive: true });
  const packName = run('npm', ['pack', 'nitron@1.0.0', '--silent'], { cwd: nitronDir, capture: true }).trim().split(/\s+/).pop();
  run('tar', ['-xzf', packName], { cwd: nitronDir });
  const pkgDir = path.join(nitronDir, 'package');
  run('npm', ['install', '--no-audit', '--no-fund', '--omit=dev'], { cwd: pkgDir });

  // Patch Nitron 1.0 to build the exact offline profile we need and to skip
  // Java/JAR signing. We add Android v2 signing in Python afterwards.
  const cliPath = path.join(pkgDir, 'dist', 'cli.js');
  let cli = await fs.readFile(cliPath, 'utf8');
  cli = cli.replace('const permissions = [.../* @__PURE__ */ new Set([...config.permissions, "INTERNET"])]', 'const permissions = [.../* @__PURE__ */ new Set([...config.permissions])]');
  cli = cli.replace('this.attr(nsUriIdx, this.getIdx("minSdkVersion"), 21, TYPE_INT_DEC),\n      this.attr(nsUriIdx, this.getIdx("targetSdkVersion"), 34, TYPE_INT_DEC)', 'this.attr(nsUriIdx, this.getIdx("minSdkVersion"), 26, TYPE_INT_DEC),\n      this.attr(nsUriIdx, this.getIdx("targetSdkVersion"), 28, TYPE_INT_DEC)');
  cli = cli.replace('this.attr(nsUriIdx, this.getIdx("usesCleartextTraffic"), true, TYPE_INT_BOOLEAN)', 'this.attr(nsUriIdx, this.getIdx("usesCleartextTraffic"), false, TYPE_INT_BOOLEAN)');
  await fs.writeFile(cliPath, cli);
  const signerPath = path.join(pkgDir, 'dist', 'chunk-JJ4NDXSO.js');
  let signer = await fs.readFile(signerPath, 'utf8');
  signer = signer.replace(/async function signApk\(unsignedApkPath, outputDir, options\) \{[\s\S]*?\n\}/, 'async function signApk(unsignedApkPath, outputDir, options) { return unsignedApkPath; }');
  await fs.writeFile(signerPath, signer);

  await copyDir(path.join(root, 'www'), projectDir);
  // Nitron excludes app.js because it is normally config; keep the bundle as bundle.js.
  await fs.rename(path.join(projectDir, 'app.js'), path.join(projectDir, 'bundle.js'));
  const indexPath = path.join(projectDir, 'index.html');
  const index = (await fs.readFile(indexPath, 'utf8')).replace('src="app.js"', 'src="bundle.js"');
  await fs.writeFile(indexPath, index);
  await fs.writeFile(path.join(projectDir, 'package.json'), '{"name":"quizmedx-apk-project","version":"1.0.0","type":"module"}\n');
  await fs.writeFile(path.join(projectDir, 'app.js'), `import { app } from '../nitron/package/dist/index.js'\napp.init({\n  name: 'QuizMed X',\n  packageId: 'com.quizmedx.offline',\n  version: '1.0.0',\n  entry: 'index.html',\n  orientation: 'auto',\n  permissions: [],\n  statusBar: true\n})\n`);
  run('node', [path.join(pkgDir, 'dist', 'cli.js'), 'build', '--debug'], { cwd: projectDir });
  const unsignedApk = path.join(projectDir, 'dist', 'app.apk');
  if (!(await exists(unsignedApk))) throw new Error('Nitron did not produce unsigned APK');
  run('python3', [path.join(root, 'tools', 'sign_apk_v2.py'), unsignedApk, finalApk]);
  run('unzip', ['-t', finalApk], { capture: true });
  const size = (await fs.stat(finalApk)).size;
  console.log(`\n✅ Built valid APK: ${finalApk} (${(size / 1024 / 1024).toFixed(1)} MB)`);
} finally {
  if (!process.env.QUIZMEDX_KEEP_TMP) await fs.rm(tmpRoot, { recursive: true, force: true });
}
