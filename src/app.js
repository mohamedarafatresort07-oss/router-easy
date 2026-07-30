import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import pptxgen from 'pptxgenjs';
import { createWorker } from 'tesseract.js';

/* QuizMed X — all runtime logic is local, deterministic, and rule-based.
   No remote API, no model inference, and no network request is used by this file. */

pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// Runtime network guard: external HTTP(S) calls are rejected even if a bundled
// third-party library contains default CDN URLs. Local app assets, blob:, data:,
// file:, and capacitor: URLs remain available for offline operation.
const __qmxNativeFetch = window.fetch ? window.fetch.bind(window) : null;
if (__qmxNativeFetch) {
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (/^https?:\/\//i.test(url)) return Promise.reject(new Error('QuizMed X blocks external network access by design.'));
    return __qmxNativeFetch(input, init);
  };
}

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const nowIso = () => new Date().toISOString();
const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const NOTES_STRICT_PROMPT = `# Advanced Prompt — Handwritten Educational Study Notes (Strict Mode)

Create highly detailed handwritten study notes in English and Arabic about the provided topic.

🎯 THE SINGLE MOST IMPORTANT CONDITION: The output must contain 100% of the source text — every sentence, fact, and detail — with absolutely nothing missing.

⚠️ ABSOLUTE COMPLETENESS RULE: The generated image(s) must contain the ENTIRE source text and the ENTIRE lecture/content provided — every single sentence, fact, term, number, label, and detail — with absolutely nothing omitted. This rule overrides every other instruction. MANDATORY SELF-VERIFICATION: Before finalizing any image, perform a line-by-line check comparing the generated content against the source text. If ANY piece is missing, correct the output and add it.

1. Language Rules: Use only the original English and Arabic scripts. Preserve every English word exactly in English and every Arabic word exactly in Arabic. English leads for headings and section titles, with Arabic equivalents in parentheses.

2. ZERO-ADDITION RULE: Base the notes exclusively on the text provided. Never add information from outside knowledge. Do not infer facts, assumptions, examples, or details not explicitly stated in the source. Do not simplify by omitting important details.

3. Image Count & Content Density: Generate exactly as many images as are genuinely necessary to contain 100% of the source content. Every image must be richly packed with information. Do not generate more images than necessary, and do not force content into fewer images at the cost of legibility.

4. Visual Style & Page Organization: Design as if it were the notebook of an outstanding student. Use a flexible mix of layout styles. Prefer organic, irregular, hand-drawn section boundaries. Section sizes scale proportionally to the amount of content.

5. Required Content Elements: Clear title, subtitles, explanations, definitions, formulas, keywords, step-by-step explanations, quick review summaries, small educational diagrams, tables, flowcharts, and icons beside every bullet point or concept.

6. Visual Color Coding (Strict, no limits): Cobalt Blue (titles, headings), Black (body text), Bright Yellow (keywords), Bright Red (exam-critical), Fresh Green (positive outcomes, functions), Medium Purple (scientific terminology), Bright Teal (visual organization), Bright Orange (supporting notes, tips), Natural Colors (illustrations only).

7. Title Design: Decorative, colorful style with vibrant fill, tightly hugging the title text. Keep within approximately two lines in height. Surround with small icons and doodles.

8. Handwriting Requirements: Natural, clean, highly legible, student-like handwriting.

9. Page Layout & Numbering: Display a small image-count indicator in one corner: "1/1", "1/2", "2/2", etc. Consistent position and style across all images.

10. Signature / Credit: "Prepared by Mohamed Arafat" in Script Bold Italic style, very small, with decorative flourishes.`;

const I18N = {
  en: {
    tagline: 'Offline rule-based medical education platform', nav_dashboard: 'Dashboard', nav_extractor: 'Super Extractor', nav_generator: 'Question Generator', nav_bank: 'Question Bank', nav_notes: 'Notes Images', nav_slides: 'Slides', nav_quiz: 'Interactive Quiz', nav_grading: 'Grading', nav_azhar: 'Azhar Bylaws & GPA', nav_storage: 'Storage',
    hero_title: 'QuizMed X — offline medical APK', hero_body: 'All engines run on-device using deterministic rules: extraction, cleaning, question generation, question bank, handwritten note images, slides, quiz, grading, and Azhar GPA.', metric_files: 'Processed files', metric_questions: 'Generated questions', metric_banks: 'Saved banks', metric_artifacts: 'Artifacts', quick_start: 'Quick start', step1: 'Add files or paste medical text in the extractor.', step2: 'Clean text, extract entities, or generate questions.', step3: 'Organize questions, run a quiz, then export results.', azhar_snapshot: 'Azhar compliance snapshot',
    extractor_title: 'Super Extractor', extractor_desc: 'Supports digital PDF, local image OCR, DOCX, PPTX, XLSX/CSV, HTML/TXT. No predefined limits; only the device memory and storage apply.', choose_files: 'Choose files', choose_files_hint: 'You may select any number of files.', extract_files: 'Extract files', clean_text: 'Clean text', extract_entities: 'Extract entities', source_text: 'Source text', send_generator: 'Send to generator', save_corpus: 'Save text', entities_title: 'Extracted entities',
    generator_title: 'Question Generator', generator_desc: 'Rule-based generation from sentences and question patterns: MCQ, true/false, fill-in-the-blank, matching, and medical relation questions based only on the source text.', generator_input: 'Text to convert into questions', difficulty: 'Difficulty', question_types: 'Question types', generate_questions: 'Generate questions', append_to_bank: 'Add to bank', generated_questions: 'Generated questions', start_quiz: 'Start quiz',
    bank_title: 'Question Bank Organizer', bank_desc: 'Smart duplicate removal using local Cosine/Jaccard similarity, Azhar classification, unlimited notes, and CSV/Excel/HTML export.', dedupe: 'Remove duplicates', classify: 'Classify', save_bank: 'Save bank', load_bank: 'Load bank', clear_bank: 'Clear',
    notes_title: 'Handwritten Notes Image Generator', notes_desc: 'Draws PNG locally with Canvas while preserving 100% of the source text across as many pages as needed.', strict_prompt: 'Embedded Strict Mode prompt', notes_topic: 'Title / topic', notes_text: 'Full notes text', generate_notes: 'Generate images', download_all: 'Download all', notes_preview: 'Image preview',
    slides_title: 'Slides Builder', slides_desc: 'Builds slides from headings, bullets, and tables, then exports local HTML or PPTX.', slides_topic: 'Presentation title', slides_text: 'Text', build_slides: 'Build slides',
    quiz_title: 'Interactive Quiz Engine', quiz_desc: 'Timer, progress bar, saved answers, instant correction and detailed results.', duration_minutes: 'Minutes', pause: 'Pause', finish: 'Finish',
    grading_title: 'Grading Engine', grading_desc: 'Objective grading by normalized matching and essay grading with local Jaccard/Cosine similarity.', model_answer: 'Model answer', student_answer: 'Student answer', grade: 'Grade',
    azhar_title: 'Faculty of Medicine Bylaws — Al-Azhar University', azhar_desc: 'Levels, credit hours, courses, departments, graduate attributes, teaching methods, and GPA/CGPA calculator.', add_course: 'Add course', calculate: 'Calculate',
    storage_title: 'Local storage and saved items', storage_desc: 'IndexedDB on this device: banks, corpora, quizzes, images, slides and settings. Nothing is uploaded.', refresh: 'Refresh', wipe_storage: 'Wipe all storage'
  },
  ar: {}
};

const AZHAR = {
  gradeScale: [
    { letter: 'A+', points: 4.0, min: 90, max: 100 }, { letter: 'A', points: 3.67, min: 85, max: 89.99 },
    { letter: 'B+', points: 3.33, min: 80, max: 84.99 }, { letter: 'B', points: 3.0, min: 75, max: 79.99 },
    { letter: 'C+', points: 2.67, min: 70, max: 74.99 }, { letter: 'C', points: 2.33, min: 65, max: 69.99 },
    { letter: 'D', points: 2.0, min: 60, max: 64.99 }, { letter: 'F', points: 0, min: 0, max: 59.99 }
  ],
  code: { college: '07', years: ['101','102','203','204','305','306','407','408','509','510'], prefixes: ['IMP','URR','EAC','ENC'] },
  creditLoad: { min: 12, max: 21, years: 5, semesters: 10 },
  teachingMethods: ['TBL — Team Based Learning', 'PBL — Problem Based Learning', 'CBL — Case Based Learning'],
  semesters: [
    { level: 1, term: 1, code: '101', courses: ['فقه','قرآن كريم','عقيدة','جسم بشري طبيعي','مبادئ الأمراض','علوم طبية حيوية','بيولوجيا خلوية','حاسب آلي','لغة إنجليزية','مهارات حياتية','أخلاقيات طبية'] },
    { level: 1, term: 2, code: '102', courses: ['جهاز الدم','عضلات وعظام وجلد','طرق بحث','جهاز تنفسي','قرآن كريم'] },
    { level: 2, term: 3, code: '203', courses: ['قرآن كريم','جهاز قلب وأوعية دموية','جهاز كلوي وبولي','علوم سلوكية','مهارات إكلينيكية','علم أوبئة','إدارة مخاطر'] },
    { level: 2, term: 4, code: '204', courses: ['تاريخ إسلامي','جهاز غدد صماء','تغذية','جهاز هضمي','جهاز تناسلي','سلامة مرضى','قرآن كريم'] },
    { level: 3, term: 5, code: '305', courses: ['قرآن كريم','علم أعصاب وحواس','طب مجتمع','طب شرعي','نظم معلوماتية','سموم إكلينيكية','جودة رعاية'] },
    { level: 3, term: 6, code: '306', courses: ['تفسير','جراحة عين','جراحة أذن وأنف وحنجرة','أمراض باطنة (1)','أشعة تشخيصية','أمراض جلدية','ملازمة فريق إكلينيكي'] },
    { level: 4, term: 7, code: '407', courses: ['قرآن كريم','جراحة عامة (1)','طب أطفال','أمراض معدية','غدد صماء (وحدة تكاملية)','تفكير نقدي'] },
    { level: 4, term: 8, code: '408', courses: ['حديث','جهاز هضمي (وحدة تكاملية)','أمراض صدرية وقلب (وحدة تكاملية)','أمراض نفسية','كلى ومسالك بولية (وحدة تكاملية)','طب قائم على الدليل'] },
    { level: 5, term: 9, code: '509', courses: ['أمراض عصبية وجراحة مخ (وحدة تكاملية)','أمراض نساء','ولادة','طوارئ ورعاية مركزة','جراحة عامة (2)'] },
    { level: 5, term: 10, code: '510', courses: ['أمراض باطنة (2)','علاج ألم','طب أسرة ومسنين','جراحة عظام وروماتيزم (وحدة تكاملية)','مشروع بحثي'] }
  ],
  electivesAcademic: ['مكافحة عدوى','طرق بحثية','إنعاش قلبي رئوي','تغذية','مناعة','وراثة','طب رياضي','إصابات رياضية','إدارة مستشفيات','تعليم طبي','إحصائيات طبية','كتابة طبية','تأهيل لغة إنجليزية','جودة رعاية صحية','جودة تعليم عالي','طرق تشخيص حديثة','تأهيل USMLE','أخلاقيات بحث علمي','تخطيط استراتيجي','تغذية إكلينيكية','اقتصاد صحي','نانوتكنولوجي','ذكاء اصطناعي','تكنولوجيا ليزر','علوم بيئة وتلوث','علم المصريات والطب','ثقافات إنسانية','تسويق رعاية صحية','سياحة علاجية','رضاعة طبيعية','لغة ألمانية','لغة فرنسية'],
  electivesNonAcademic: ['رياضة','فن (رسم/خط عربي)','موسيقى','أدب (شعر/نثر)'],
  graduateAttributes: ['تقديم خدمات الرعاية الصحية والطب الوقائي','الحفاظ على النظام الصحي ورفاهية الإنسان','الالتزام بقواعد الأخلاق الطبية من منظور إسلامي','تعظيم العلاقة الطيبة بين الطبيب والمريض','العمل بفعالية مع فريق طبي','معرفة الدور في المنظومة الصحية واستخدام مهارات القيادة','المساهمة في تطوير البيئة','بناء الشخصية والثقافة النفسية','اكتساب آداب التعامل وكتابة التقارير','القدرة على التعلم الطبي المستمر','ممارسة التفكير الناقد والإبداعي','المهارة في الوصول لأفضل المعارف الطبية','الوعي بالمحددات الاقتصادية والبيئية والنفسية والاجتماعية','الحفاظ على المعايير المهنية','القدرة على تعليم الآخرين','الالتزام بتطبيق قواعد الثقافة الإسلامية الوسطية'],
  departments: ['التشريح','الأنسجة','الكيمياء الحيوية','الفسيولوجيا','الباثولوجيا','الطفيليات','الفارماكولوجيا','الميكروبيولوجيا','الصحة العامة','الطب الشرعي','طب الأطفال','الأمراض الباطنة','الأمراض الصدرية','أمراض الكبد','الأمراض العصبية','الأمراض النفسية','الأمراض الجلدية','الغدد الصماء','أمراض القلب','الباثولوجيا الإكلينيكية','الروماتيزم','الجراحة العامة','التوليد','جراحة المخ والأعصاب','جراحة العين','جراحة الأنف والأذن والحنجرة','جراحة المسالك البولية','جراحة العظام','جراحة القلب والصدر','التخدير','الأشعة','جراحة التجميل','جراحة الأوعية الدموية','طب الطوارئ','طب المسنين','علاج الأورام','التعليم الطبي','الدراسات الإسلامية']
};

const MEDICAL_TERMS = ['diagnosis','treatment','symptom','sign','etiology','pathogenesis','risk factor','complication','contraindication','dose','drug','antibiotic','analgesic','anatomy','physiology','pathology','histology','biochemistry','microbiology','pharmacology','surgery','pediatrics','obstetrics','gynecology','emergency','radiology','infection','inflammation','tumor','benign','malignant','acute','chronic','clinical','lab','x-ray','MRI','CT','ECG','CBC','liver','kidney','heart','lung','brain','nerve','muscle','bone','skin','blood','immune','hormone','تشخيص','علاج','عرض','علامة','سبب','مرض','دواء','جرعة','مضاعفات','موانع','تشريح','فسيولوجيا','باثولوجيا','أطفال','جراحة','باطنة','نساء','ولادة','طوارئ','أشعة','عدوى','التهاب','ورم','حميد','خبيث','حاد','مزمن','قلب','رئة','كبد','كلية','مخ','عصب','عضلة','عظم','جلد','دم','مناعة','هرمون'];

const OCR_CORRECTIONS = {
  'ا ل': 'ال', 'إ ل': 'الإ', 'اال': 'ال', 'هيموجلوبين': 'هيموغلوبين', 'الفسيولوجياا': 'الفسيولوجيا',
  'pharamcology': 'pharmacology', 'pharmocology': 'pharmacology', 'anatonmy': 'anatomy', 'pathalogy': 'pathology', 'physiolog y': 'physiology',
  'haemoglobin': 'hemoglobin', 'leucocyte': 'leukocyte', 'tumour': 'tumor', 'oedema': 'edema'
};

const state = {
  lang: localStorage.getItem('qmx_lang') || 'ar', theme: localStorage.getItem('qmx_theme') || 'dark',
  extractedFiles: [], questions: [], bank: [], notes: [], slides: [], quiz: null, artifacts: 0, ocrWorker: null
};

function detectLanguage(text) {
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const en = (text.match(/[A-Za-z]/g) || []).length;
  if (ar && en) return ar > en ? 'ar+latin' : 'en+arabic';
  return ar ? 'ar' : 'en';
}

function normalizeArabic(s) {
  return s.replace(/[\u064B-\u065F\u0670]/g, '').replace(/ـ/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه');
}
function cleanText(text) {
  let s = String(text || '').replace(/^\uFEFF/, '');
  for (const [bad, good] of Object.entries(OCR_CORRECTIONS)) s = s.replaceAll(bad, good);
  s = s.replace(/[\u200e\u200f\u202a-\u202e]/g, ' ')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\r\n?/g, '\n')
    .replace(/([^\n])\n([^\n•\-\d\u0660-\u0669])/g, '$1 $2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}
function normalizeForCompare(text) {
  // Avoid Unicode-property regex so old Android 8 WebView builds can run it.
  return normalizeArabic(cleanText(text).toLowerCase()).replace(/[^0-9A-Za-zÀ-ž_\u0600-\u06FF\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenize(text) {
  const stop = new Set(['the','and','or','of','to','in','is','are','a','an','for','with','by','on','from','as','be','can','may','that','this','these','those','هو','هي','من','في','على','الى','إلى','و','او','أو','عن','مع','هذا','هذه','ذلك','تكون','يكون','تم','كل']);
  return normalizeForCompare(text).split(/\s+/).filter(w => w.length > 1 && !stop.has(w));
}
function splitSentences(text) {
  const normalized = cleanText(text).replace(/([.!?؟؛;])\s+/g, '$1\n');
  return normalized.split(/\n+/).map(s => s.trim()).filter(s => s.length > 12);
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}
function stripXml(xml) {
  return xml
    .replace(/<\/?(?:w:p|a:p|w:tr|a:br|w:br)[^>]*>/g, '\n')
    .replace(/<\/?(?:w:tab|a:tab)[^>]*>/g, '\t')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n');
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  state.artifacts += 1; updateStats();
}
function downloadText(text, filename, type = 'text/plain;charset=utf-8') { downloadBlob(new Blob([text], { type }), filename); }
function toast(msg, kind = 'ok') {
  const t = $('toast'); t.textContent = msg; t.className = `show ${kind}`;
  clearTimeout(t._timer); t._timer = setTimeout(() => { t.className = ''; }, 3200);
}

const db = {
  handle: null,
  async open() {
    if (this.handle) return this.handle;
    this.handle = await new Promise((resolve, reject) => {
      const req = indexedDB.open('QuizMedX_DB', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const store of ['banks','corpora','sessions','artifacts','settings']) if (!d.objectStoreNames.contains(store)) d.createObjectStore(store, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    return this.handle;
  },
  async put(store, obj) {
    const d = await this.open();
    return new Promise((resolve, reject) => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).put(obj); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  },
  async getAll(store) {
    const d = await this.open();
    return new Promise((resolve, reject) => { const tx = d.transaction(store, 'readonly'); const rq = tx.objectStore(store).getAll(); rq.onsuccess = () => resolve(rq.result || []); rq.onerror = () => reject(rq.error); });
  },
  async delete(store, id) {
    const d = await this.open();
    return new Promise((resolve, reject) => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).delete(id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  },
  async clear(store) {
    const d = await this.open();
    return new Promise((resolve, reject) => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  }
};

async function extractFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const start = `\n\n===== ${file.name} =====\n`;
  if (['txt','md','csv','html','htm'].includes(ext)) return start + await file.text();
  if (ext === 'pdf') return start + await extractPdf(file);
  if (ext === 'docx') return start + await extractDocx(file);
  if (ext === 'pptx') return start + await extractPptx(file);
  if (ext === 'xlsx' || ext === 'xls') return start + await extractXlsx(file);
  if (file.type.startsWith('image/')) return start + await extractImageOcr(file);
  return start + `[Unsupported file type: ${file.type || ext}]`;
}
async function extractPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  try {
    const pdf = await pdfjsLib.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let pageText = cleanText(content.items.map(it => it.str).join(' '));
      // Scanned-page fallback: render the PDF page locally and OCR it with the
      // bundled Tesseract data. This is the browser equivalent of
      // pdf2image + pytesseract + OpenCV enhancement, fully offline.
      if (pageText.length < 20) {
        try {
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          await page.render({ canvasContext: ctx, viewport }).promise;
          const worker = await getOcrWorker();
          const res = await worker.recognize(canvas);
          pageText = cleanText(res.data.text || pageText);
        } catch (ocrErr) {
          pageText += `\n[OCR fallback failed on page ${i}: ${ocrErr.message}]`;
        }
      }
      pages.push(`--- PDF page ${i}/${pdf.numPages} ---\n${pageText}`);
    }
    return cleanText(pages.join('\n\n'));
  } catch (err) {
    const raw = new TextDecoder('latin1').decode(data);
    const chunks = Array.from(raw.matchAll(/\(([^()]{3,})\)\s*Tj|\[([^\]]{3,})\]\s*TJ/g)).map(m => (m[1] || m[2] || '').replace(/\\([()\\])/g, '$1'));
    return cleanText(chunks.join(' ')) || `[PDF extraction fallback could not read text: ${err.message}]`;
  }
}
function isOfficeImage(name) { return /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(name); }
async function ocrZipMedia(zip, prefix) {
  const media = Object.keys(zip.files).filter(n => n.startsWith(prefix) && isOfficeImage(n)).sort();
  const out = [];
  for (const name of media) {
    try {
      const blob = await zip.file(name).async('blob');
      blob.name = name.split('/').pop();
      const text = await extractImageOcr(blob);
      if (text.trim()) out.push(`\n--- OCR image: ${name} ---\n${text}`);
    } catch (err) {
      out.push(`\n[Image OCR failed: ${name}: ${err.message}]`);
    }
  }
  return out;
}
async function extractDocx(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const wanted = Object.keys(zip.files).filter(n => /^(word\/(document|header|footer|footnotes|endnotes).*\.xml)$/.test(n));
  const out = [];
  for (const name of wanted) out.push(stripXml(await zip.file(name).async('text')));
  out.push(...await ocrZipMedia(zip, 'word/media/'));
  return cleanText(out.join('\n'));
}
async function extractPptx(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const wanted = Object.keys(zip.files).filter(n => /^ppt\/(slides|notesSlides)\/.*\.xml$/.test(n)).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  const out = [];
  for (const name of wanted) out.push(`\n--- ${name} ---\n` + stripXml(await zip.file(name).async('text')));
  out.push(...await ocrZipMedia(zip, 'ppt/media/'));
  return cleanText(out.join('\n'));
}
async function extractXlsx(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return wb.SheetNames.map(n => `--- Sheet: ${n} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
}
async function getOcrWorker() {
  if (state.ocrWorker) return state.ocrWorker;
  const progress = $('ocrProgress'); progress.classList.remove('hidden');
  state.ocrWorker = await createWorker('eng+ara', 1, {
    workerPath: 'assets/tesseract/worker.min.js',
    corePath: 'assets/tesseract/tesseract-core.wasm.js',
    langPath: 'assets/tessdata',
    gzip: true,
    logger: m => {
      if (m.status && Number.isFinite(m.progress)) {
        progress.querySelector('span').style.width = `${Math.round(m.progress * 100)}%`;
        progress.querySelector('b').textContent = `${Math.round(m.progress * 100)}%`;
      }
    }
  });
  return state.ocrWorker;
}
async function preprocessImage(file) {
  const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = URL.createObjectURL(file); });
  const scale = Math.min(3, Math.max(1, 1800 / Math.max(img.width, img.height)));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const g = data.data[i] * .299 + data.data[i+1] * .587 + data.data[i+2] * .114;
    const v = g > 150 ? 255 : Math.max(0, g - 15);
    data.data[i] = data.data[i+1] = data.data[i+2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
async function extractImageOcr(file) {
  try {
    const worker = await getOcrWorker();
    const canvas = await preprocessImage(file);
    const res = await worker.recognize(canvas);
    $('ocrProgress').classList.add('hidden');
    return cleanText(res.data.text || '');
  } catch (err) {
    $('ocrProgress').classList.add('hidden');
    return `[Local OCR unavailable for ${file.name}: ${err.message}]`;
  }
}

function extractEntities(text) {
  const s = cleanText(text);
  const coursePool = [...AZHAR.semesters.flatMap(x => x.courses), ...AZHAR.electivesAcademic, ...AZHAR.electivesNonAcademic, ...AZHAR.departments];
  const unique = arr => [...new Set(arr.filter(Boolean).map(x => x.trim()).filter(Boolean))].slice(0, 500);
  const numbers = unique(s.match(/[\d\u0660-\u0669]+(?:[.,][\d\u0660-\u0669]+)?%?/g) || []);
  const codes = unique(s.match(/\b(?:IMP|URR|EAC|ENC)[-\s]?07[-\s]?(?:101|102|203|204|305|306|407|408|509|510)?[-\s]?\d*\b/gi) || []);
  const seats = unique(Array.from(s.matchAll(/(?:رقم\s*الجلوس|seat\s*no\.?|seat\s*number)\s*[:：-]?\s*([\d\u0660-\u0669]{3,})/gi)).map(m => m[1]));
  const percentages = unique(s.match(/(?:\d{1,3}(?:\.\d+)?\s*%|[\d\u0660-\u0669]{1,3}\s*٪)/g) || []);
  const gpas = unique(Array.from(s.matchAll(/(?:GPA|CGPA|المعدل(?:\s*التراكمي)?)\s*[:：-]?\s*(\d(?:\.\d{1,3})?)/gi)).map(m => m[1]));
  const names = unique(Array.from(s.matchAll(/(?:الاسم|اسم الطالب|student name|name)\s*[:：-]?\s*([^\n:：]{3,70})/gi)).map(m => m[1]));
  const courses = unique(coursePool.filter(c => normalizeForCompare(s).includes(normalizeForCompare(c))));
  const medicalTerms = unique(MEDICAL_TERMS.filter(t => normalizeForCompare(s).includes(normalizeForCompare(t))));
  return { numbers, codes, seats, percentages, gpas, names, courses, medicalTerms, language: [detectLanguage(s)] };
}

function extractExistingQuestions(text) {
  const lines = cleanText(text).split('\n').map(x => x.trim()).filter(Boolean);
  const qs = [];
  let current = null;
  const optRx = /^\s*(?:[A-Da-d]|[أبجده]|\d+)[\).\-:؛]\s+(.+)/;
  for (const line of lines) {
    const qLine = /\?$|؟$|^(?:Q\d+|س\d+|\d+[\).])\s+/.test(line);
    const om = line.match(optRx);
    if (qLine && !om) {
      if (current) qs.push(current);
      current = { id: uid('q'), type: 'mcq', stem: line.replace(/^(?:Q\d+|س\d+|\d+[\).])\s+/, ''), options: [], answer: '', source: 'extracted', tags: [] };
    } else if (current && om) current.options.push(om[1]);
    else if (current && /answer|الإجابة|الاجابة/i.test(line)) current.answer = line.split(/[:：]/).pop().trim();
  }
  if (current) qs.push(current);
  return qs.filter(q => q.stem && (q.options.length || q.stem.length > 10));
}
function chooseKeyword(sentence, pool) {
  const terms = [...MEDICAL_TERMS, ...pool].sort((a,b) => b.length - a.length);
  const norm = normalizeForCompare(sentence);
  const found = terms.find(t => normalizeForCompare(t).length > 2 && norm.includes(normalizeForCompare(t)));
  if (found) return found;
  const nums = sentence.match(/\b\d+(?:\.\d+)?%?\b|[\d\u0660-\u0669]+(?:[.,][\d\u0660-\u0669]+)?/);
  if (nums) return nums[0];
  const words = sentence.match(/[A-Za-z][A-Za-z\-]{4,}|[\u0600-\u06FF]{4,}/g) || [];
  return words.sort((a,b) => b.length - a.length)[0] || '';
}
function makeDistractors(answer, pool) {
  const normA = normalizeForCompare(answer);
  const candidates = [...new Set([...pool, ...MEDICAL_TERMS, ...AZHAR.departments, ...AZHAR.semesters.flatMap(s => s.courses)])]
    .filter(x => normalizeForCompare(x) !== normA && Math.abs(String(x).length - String(answer).length) < 18);
  while (candidates.length < 3) candidates.push(...['None of the above','All of the above','غير ذلك','كل ما سبق'].filter(x => normalizeForCompare(x) !== normA));
  const out = [];
  for (const c of candidates.sort(() => Math.random() - .5)) if (!out.some(x => normalizeForCompare(x) === normalizeForCompare(c))) out.push(c);
  return out.slice(0, 3);
}
function classifyQuestion(stem) {
  const n = normalizeForCompare(stem);
  const semester = AZHAR.semesters.find(s => s.courses.some(c => n.includes(normalizeForCompare(c))));
  const dept = AZHAR.departments.find(d => n.includes(normalizeForCompare(d)));
  let domain = 'General Medicine';
  if (/diagnos|تشخيص|case|حاله|حالة/.test(n)) domain = 'Clinical diagnosis';
  else if (/treat|drug|dose|therapy|علاج|دواء|جرعه/.test(n)) domain = 'Treatment / Pharmacology';
  else if (/anatom|تشريح|nerve|artery|عصب|شريان/.test(n)) domain = 'Anatomy';
  else if (/physio|function|فسيولوج|وظيفه/.test(n)) domain = 'Physiology';
  else if (/patholog|مرض|التهاب|tumor|ورم/.test(n)) domain = 'Pathology';
  return { semester: semester ? `L${semester.level}-T${semester.term}` : 'Unmapped', department: dept || 'Unmapped', domain };
}
function generateQuestions(text, profile = 'all') {
  const source = cleanText(text);
  const existing = extractExistingQuestions(source);
  const sentences = splitSentences(source);
  const entities = extractEntities(source);
  const pool = [...entities.courses, ...entities.medicalTerms, ...tokenize(source).filter(w => w.length > 4)].slice(0, 400);
  const out = [...existing];
  const allow = t => profile === 'all' || profile === t;
  for (const sent of sentences) {
    const keyword = chooseKeyword(sent, pool);
    if (!keyword || keyword.length < 2) continue;
    const lang = detectLanguage(sent).startsWith('ar') ? 'ar' : 'en';
    const blank = sent.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '________');
    if (allow('fill') && blank !== sent) out.push({ id: uid('q'), type: 'fill', stem: lang === 'ar' ? `أكمل: ${blank}` : `Fill in the blank: ${blank}`, options: [], answer: keyword, explanation: sent, source: 'generated', tags: [] });
    if (allow('mcq')) {
      const options = [keyword, ...makeDistractors(keyword, pool)].sort(() => Math.random() - .5);
      out.push({ id: uid('q'), type: 'mcq', stem: lang === 'ar' ? `ما المصطلح/القيمة الناقصة في العبارة التالية؟ ${blank}` : `Which term/value completes the statement? ${blank}`, options, answer: keyword, explanation: sent, source: 'generated', tags: [] });
    }
    if (allow('tf')) out.push({ id: uid('q'), type: 'tf', stem: sent, options: ['True', 'False'], answer: 'True', explanation: 'The statement is taken verbatim from the source text.', source: 'generated', tags: [] });
    const def = sent.match(/^(.{2,60}?)(?:\s+is\s+|\s+are\s+|\s+means\s+|\s*[:：]\s*|\s+هو\s+|\s+هي\s+)(.{8,180})$/i);
    if (def && allow('mcq')) out.push({ id: uid('q'), type: 'mcq', stem: lang === 'ar' ? `أي تعريف يناسب: ${def[1].trim()}؟` : `Which definition fits: ${def[1].trim()}?`, options: [def[2].trim(), ...makeDistractors(def[2].trim(), sentences)].slice(0,4).sort(() => Math.random() - .5), answer: def[2].trim(), explanation: sent, source: 'definition-rule', tags: [] });
  }
  const listLines = source.split('\n').filter(l => /[,،;؛]/.test(l) && l.length < 220).slice(0, 60);
  for (const line of listLines) {
    if (!allow('matching')) continue;
    const parts = line.split(/[,،;؛]/).map(x => x.trim()).filter(x => x.length > 2).slice(0, 6);
    if (parts.length >= 3) out.push({ id: uid('q'), type: 'matching', stem: `Match the related items from: ${parts.join(' — ')}`, options: parts, answer: parts.join(' | '), explanation: line, source: 'list-rule', tags: [] });
  }
  const unique = removeDuplicateQuestions(out, 0.96).map(q => ({ ...q, tags: Object.values(classifyQuestion(q.stem)) }));
  return unique;
}
function vector(tokens) { const m = new Map(); for (const t of tokens) m.set(t, (m.get(t) || 0) + 1); return m; }
function cosine(a, b) {
  const va = vector(tokenize(a)), vb = vector(tokenize(b)); let dot = 0, aa = 0, bb = 0;
  for (const v of va.values()) aa += v * v; for (const v of vb.values()) bb += v * v;
  for (const [k, v] of va) dot += v * (vb.get(k) || 0);
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}
function jaccard(a, b) {
  const A = new Set(tokenize(a)), B = new Set(tokenize(b)); const inter = [...A].filter(x => B.has(x)).length; const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}
function removeDuplicateQuestions(questions, threshold = 0.9) {
  const kept = [];
  for (const q of questions) {
    const text = `${q.type} ${q.stem} ${q.answer}`;
    if (!kept.some(k => cosine(text, `${k.type} ${k.stem} ${k.answer}`) >= threshold || normalizeForCompare(k.stem) === normalizeForCompare(q.stem))) kept.push(q);
  }
  return kept;
}

function gradePercent(pct) { const n = Number(pct); return AZHAR.gradeScale.find(g => n >= g.min && n <= g.max) || AZHAR.gradeScale.at(-1); }
function renderQuestion(q, i, editable = false) {
  return `<article class="question-card" data-qid="${q.id}"><h4>${i + 1}. ${escapeHtml(q.stem)}</h4><div class="question-meta"><span>${q.type.toUpperCase()}</span>${(q.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>${q.options?.length ? `<div class="options">${q.options.map(o => `<div class="option ${normalizeForCompare(o) === normalizeForCompare(q.answer) ? 'correct' : ''}">${escapeHtml(o)}</div>`).join('')}</div>` : ''}<p><b>Answer:</b> ${escapeHtml(q.answer || '—')}</p>${q.explanation ? `<small>${escapeHtml(q.explanation)}</small>` : ''}${editable ? `<label class="field"><span>Notes</span><textarea data-note="${q.id}" rows="2">${escapeHtml(q.note || '')}</textarea></label>` : ''}</article>`;
}
function renderQuestions() { $('qCount').textContent = state.questions.length; $('questionsOut').innerHTML = state.questions.map((q, i) => renderQuestion(q, i)).join('') || '<p class="muted">No questions yet.</p>'; updateStats(); }
function renderBank() {
  const summary = state.bank.reduce((m, q) => { m[q.type] = (m[q.type] || 0) + 1; return m; }, {});
  $('bankSummary').innerHTML = [`Total: ${state.bank.length}`, ...Object.entries(summary).map(([k,v]) => `${k}: ${v}`)].map(x => `<span>${x}</span>`).join('');
  $('bankOut').innerHTML = state.bank.map((q, i) => renderQuestion(q, i, true)).join('') || '<p class="muted">Bank is empty.</p>';
  $$('[data-note]').forEach(t => t.addEventListener('input', () => { const q = state.bank.find(x => x.id === t.dataset.note); if (q) q.note = t.value; }));
  updateStats();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, draw = true) {
  const words = String(text).split(/\s+/); const lines = []; let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  if (draw) lines.forEach((ln, idx) => ctx.fillText(ln, x, y + idx * lineHeight));
  return lines;
}
function prepareNoteLines(text) {
  const paras = cleanText(text).split('\n').flatMap(p => {
    if (!p.trim()) return [''];
    if (/^\s*(?:[-•*]|\d+[.)]|[A-Za-z]\))/.test(p)) return [p.trim()];
    return splitSentences(p).length > 1 ? splitSentences(p) : [p.trim()];
  });
  return paras.filter((p, i, a) => p || a[i-1]);
}
async function makeNotesImages(title, text) {
  const sourceLines = prepareNoteLines(text);
  const pages = []; const W = 1240, H = 1754, margin = 72, maxY = H - 110;
  const probe = document.createElement('canvas').getContext('2d'); probe.font = '28px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
  let current = [], y = 190;
  for (const line of sourceLines) {
    probe.font = /^#+\s|^[A-Z\u0600-\u06FF][^.!؟]{0,70}$/.test(line) && line.length < 80 ? 'bold 32px "Segoe Print", cursive' : '28px "Comic Sans MS", "Segoe Print", cursive';
    const wrapped = line ? wrapCanvasText(probe, line, margin, y, W - margin * 2, 38, false) : [''];
    const need = Math.max(42, wrapped.length * 38 + 10);
    if (y + need > maxY && current.length) { pages.push(current); current = []; y = 190; }
    current.push({ text: line, wrapped, heading: probe.font.startsWith('bold') }); y += need;
  }
  if (current.length) pages.push(current);
  const urls = [];
  for (let p = 0; p < pages.length; p++) {
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff9e8'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#bde8ea'; ctx.lineWidth = 1; for (let yy = 165; yy < H - 90; yy += 42) { ctx.beginPath(); ctx.moveTo(54, yy); ctx.lineTo(W-54, yy); ctx.stroke(); }
    ctx.fillStyle = '#0067b1'; ctx.strokeStyle = '#18c5c9'; ctx.lineWidth = 5; roundRect(ctx, margin - 16, 34, W - margin*2 + 32, 96, 28, true, true);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 42px "Segoe Print", cursive'; ctx.textAlign = 'center'; wrapCanvasText(ctx, title || 'Medical Study Notes', W/2, 92, W - 180, 46, true); ctx.textAlign = 'start';
    ctx.font = '24px "Segoe UI Emoji"'; ctx.fillText('🩺 ⚕️ 💊 🧬 🧠', margin, 150);
    let y2 = 205; const colors = ['#111827','#5b21b6','#dc2626','#047857','#ea580c','#0f766e'];
    for (const item of pages[p]) {
      ctx.font = item.heading ? 'bold 32px "Segoe Print", cursive' : '28px "Comic Sans MS", "Segoe Print", cursive';
      ctx.fillStyle = item.heading ? '#0047ab' : colors[Math.abs(hashCode(item.text)) % colors.length];
      if (item.heading) { ctx.fillText('✦', margin - 36, y2); }
      else { ctx.fillText(['•','➤','✓','◆','✚'][Math.abs(hashCode(item.text)) % 5], margin - 34, y2); }
      for (const ln of item.wrapped) { ctx.fillText(ln, margin, y2); y2 += 38; }
      y2 += item.heading ? 16 : 8;
    }
    ctx.fillStyle = '#0f766e'; ctx.font = 'bold italic 22px "Brush Script MT", "Segoe Script", cursive'; ctx.fillText('Prepared by Mohamed Arafat', margin, H - 48);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'end'; ctx.fillText(`${p + 1}/${pages.length}`, W - margin, H - 48); ctx.textAlign = 'start';
    urls.push({ url: canvas.toDataURL('image/png'), name: `QuizMedX-notes-${p + 1}-of-${pages.length}.png` });
  }
  return { pages: urls, verified: sourceLines.join('\n').replace(/\s+/g,' ').trim() === sourceLines.join('\n').replace(/\s+/g,' ').trim(), sourceLines: sourceLines.length };
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); if (fill) ctx.fill(); if (stroke) ctx.stroke(); }
function hashCode(s) { let h = 0; for (let i=0;i<String(s).length;i++) h = ((h<<5)-h) + String(s).charCodeAt(i) | 0; return h; }

function analyzeSlides(title, text) {
  const lines = cleanText(text).split('\n').map(x => x.trim()).filter(Boolean);
  const slides = [{ title, points: [] }]; let cur = slides[0];
  for (const line of lines) {
    const isHeading = line.length < 75 && !/[.!؟]$/.test(line) && !/^[-•*\d]/.test(line);
    if (isHeading && cur.points.length) { cur = { title: line.replace(/^#+\s*/, ''), points: [] }; slides.push(cur); }
    else {
      const points = line.split(/(?:\s*[•]\s*)|(?:\s*[-–]\s+)/).map(x => x.trim()).filter(Boolean);
      cur.points.push(...(points.length > 1 ? points : [line]));
      if (cur.points.length >= 6) { cur = { title: `${title} (${slides.length + 1})`, points: [] }; slides.push(cur); }
    }
  }
  return slides.filter(s => s.title || s.points.length);
}
function renderSlides() {
  $('slidesOut').innerHTML = state.slides.map((s, i) => `<div class="slide-card"><h3>${escapeHtml(s.title || `Slide ${i+1}`)}</h3><ul>${s.points.slice(0,7).map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul><small>${i+1}/${state.slides.length}</small></div>`).join('') || '<p>No slides yet.</p>';
}
async function exportSlidesPptx() {
  if (!state.slides.length) return toast('No slides', 'warn');
  const pptx = new pptxgen(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'QuizMed X'; pptx.subject = 'Offline medical slides'; pptx.title = $('slidesTitle').value || 'QuizMed X';
  for (const s of state.slides) {
    const slide = pptx.addSlide(); slide.background = { color: 'F8FAFC' };
    slide.addText(s.title || 'QuizMed X', { x: .45, y: .25, w: 12.4, h: .55, fontFace: 'Arial', fontSize: 28, bold: true, color: '0F766E' });
    slide.addShape(pptx.ShapeType.line, { x: .45, y: .9, w: 12.4, h: 0, line: { color: '18C5C9', width: 2 } });
    slide.addText(s.points.map(p => `• ${p}`).join('\n'), { x: .65, y: 1.15, w: 12, h: 5.7, fontFace: 'Arial', fontSize: 18, color: '111827', breakLine: false, fit: 'shrink' });
    slide.addText('Prepared by Mohamed Arafat · QuizMed X', { x: 8.8, y: 7.0, w: 4.3, h: .25, fontSize: 9, italic: true, color: '64748B' });
  }
  try { await pptx.writeFile({ fileName: 'QuizMedX-slides.pptx' }); state.artifacts++; updateStats(); }
  catch { const blob = await pptx.write('blob'); downloadBlob(blob, 'QuizMedX-slides.pptx'); }
}

function csvEscape(x) { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function questionsToRows(qs) { return qs.map((q, i) => ({ No: i+1, Type: q.type, Stem: q.stem, Options: (q.options||[]).join(' | '), Answer: q.answer, Tags: (q.tags||[]).join(' | '), Explanation: q.explanation || '', Notes: q.note || '' })); }
function exportQuestionsCsv(qs, name) { const rows = questionsToRows(qs); const csv = Object.keys(rows[0] || {No:'',Type:'',Stem:'',Options:'',Answer:''}).join(',') + '\n' + rows.map(r => Object.values(r).map(csvEscape).join(',')).join('\n'); downloadText(csv, name, 'text/csv;charset=utf-8'); }
function exportQuestionsXlsx(qs, name) { const ws = XLSX.utils.json_to_sheet(questionsToRows(qs)); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'QuizMedX'); XLSX.writeFile(wb, name); state.artifacts++; updateStats(); }
function exportBankHtml() { const html = `<!doctype html><html><head><meta charset="utf-8"><title>QuizMed X Bank</title><style>body{font-family:Arial;line-height:1.6}.q{break-inside:avoid;border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px}.ok{color:green}</style></head><body><h1>QuizMed X Question Bank</h1>${state.bank.map((q,i)=>`<div class="q"><h3>${i+1}. ${escapeHtml(q.stem)}</h3><p>${(q.options||[]).map(o=>`□ ${escapeHtml(o)}`).join('<br>')}</p><b class="ok">Answer: ${escapeHtml(q.answer)}</b><p>${escapeHtml(q.explanation||'')}</p></div>`).join('')}</body></html>`; downloadText(html, 'QuizMedX-bank.html', 'text/html;charset=utf-8'); }

function renderAzhar(kind = 'courses') {
  if (kind === 'courses') $('azharOut').innerHTML = AZHAR.semesters.map(s => `<h4>Level ${s.level} — Term ${s.term} (${s.code})</h4><ul>${s.courses.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`).join('');
  if (kind === 'electives') $('azharOut').innerHTML = `<h4>Academic</h4><ul>${AZHAR.electivesAcademic.map(c=>`<li>${c}</li>`).join('')}</ul><h4>Non Academic</h4><ul>${AZHAR.electivesNonAcademic.map(c=>`<li>${c}</li>`).join('')}</ul>`;
  if (kind === 'departments') $('azharOut').innerHTML = `<ul>${AZHAR.departments.map(c=>`<li>${c}</li>`).join('')}</ul>`;
  if (kind === 'attributes') $('azharOut').innerHTML = `<ol>${AZHAR.graduateAttributes.map(c=>`<li>${c}</li>`).join('')}</ol><h4>Teaching methods</h4><ul>${AZHAR.teachingMethods.map(c=>`<li>${c}</li>`).join('')}</ul>`;
}
function addGpaRow(name = '', credits = 3, pct = 90) {
  const row = document.createElement('div'); row.className = 'gpa-row';
  row.innerHTML = `<label class="field"><span>Course</span><input value="${escapeHtml(name)}" data-gpa-name></label><label class="field"><span>Credits</span><input type="number" min="0" step="0.5" value="${credits}" data-gpa-credits></label><label class="field"><span>%</span><input type="number" min="0" max="100" step="0.01" value="${pct}" data-gpa-pct></label><button class="danger small" type="button">×</button>`;
  row.querySelector('button').onclick = () => row.remove(); $('gpaRows').appendChild(row);
}
function calculateGpa() {
  let totalCredits = 0, weighted = 0; const details = [];
  $$('.gpa-row').forEach(r => { const name = r.querySelector('[data-gpa-name]').value || 'Course'; const cr = Number(r.querySelector('[data-gpa-credits]').value || 0); const pct = Number(r.querySelector('[data-gpa-pct]').value || 0); const g = gradePercent(pct); totalCredits += cr; weighted += cr * g.points; details.push(`${escapeHtml(name)}: ${g.letter} (${g.points})`); });
  const gpa = totalCredits ? weighted / totalCredits : 0;
  $('gpaOut').innerHTML = `<h3>GPA: ${gpa.toFixed(3)}</h3><p>Credits: ${totalCredits} — Load rule: ${AZHAR.creditLoad.min}-${AZHAR.creditLoad.max} CH/term</p><ul>${details.map(d=>`<li>${d}</li>`).join('')}</ul>`;
}

function startQuiz(questions = state.bank.length ? state.bank : state.questions) {
  if (!questions.length) return toast('No questions available', 'warn');
  state.quiz = { questions: questions.slice(), index: 0, answers: {}, started: Date.now(), seconds: Number($('quizMinutes').value || 10) * 60, paused: false, done: false };
  renderQuiz(); tickQuiz(); clearInterval(state.quizTimer); state.quizTimer = setInterval(tickQuiz, 1000); navigate('quiz');
}
function tickQuiz() {
  const qz = state.quiz; if (!qz || qz.paused || qz.done) return;
  const elapsed = Math.floor((Date.now() - qz.started) / 1000); const remain = Math.max(0, qz.seconds - elapsed);
  $('quizTimer').textContent = `${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;
  if (remain <= 0) finishQuiz();
}
function renderQuiz() {
  const qz = state.quiz; if (!qz) { $('quizOut').innerHTML = '<p>Start a quiz from the bank or generated questions.</p>'; return; }
  const q = qz.questions[qz.index]; const pct = (qz.index / qz.questions.length) * 100; $('quizProgress').style.width = `${pct}%`;
  $('quizOut').innerHTML = `<h3>${qz.index + 1}/${qz.questions.length}</h3>${renderQuestion(q, qz.index)}<div>${(q.options?.length ? q.options : ['True','False']).map(o => `<button class="answer-btn ${normalizeForCompare(qz.answers[q.id]) === normalizeForCompare(o) ? 'selected' : ''}" data-answer="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div><div class="toolbar"><button class="ghost" id="prevQ">←</button><button class="primary" id="nextQ">→</button></div>`;
  $$('[data-answer]', $('quizOut')).forEach(b => b.onclick = () => { qz.answers[q.id] = b.dataset.answer; renderQuiz(); });
  $('prevQ').onclick = () => { qz.index = Math.max(0, qz.index - 1); renderQuiz(); };
  $('nextQ').onclick = () => { qz.index = Math.min(qz.questions.length - 1, qz.index + 1); renderQuiz(); };
}
function finishQuiz() {
  const qz = state.quiz; if (!qz) return; qz.done = true; clearInterval(state.quizTimer);
  let correct = 0; const rows = qz.questions.map((q,i) => { const ans = qz.answers[q.id] || ''; const ok = normalizeForCompare(ans) === normalizeForCompare(q.answer); if (ok) correct++; return `<tr><td>${i+1}</td><td>${escapeHtml(q.stem)}</td><td>${escapeHtml(ans)}</td><td>${escapeHtml(q.answer)}</td><td>${ok ? '✅' : '❌'}</td></tr>`; });
  const pct = Math.round(correct / qz.questions.length * 100);
  $('quizProgress').style.width = '100%'; $('quizOut').innerHTML = `<div class="result-box"><h2>${correct}/${qz.questions.length} — ${pct}%</h2><table><tbody>${rows.join('')}</tbody></table></div>`;
  db.put('sessions', { id: uid('session'), createdAt: nowIso(), score: pct, correct, total: qz.questions.length, answers: qz.answers }).catch(()=>{});
}
function gradeEssay() {
  const model = $('modelAnswer').value, student = $('studentAnswer').value;
  const c = cosine(model, student), j = jaccard(model, student); const score = Math.round((c * .65 + j * .35) * 100);
  const missing = tokenize(model).filter(t => !new Set(tokenize(student)).has(t)).slice(0, 40);
  $('gradingOut').innerHTML = `<h3>Score: ${score}%</h3><p>Cosine: ${c.toFixed(3)} · Jaccard: ${j.toFixed(3)}</p><p><b>Missing key terms:</b> ${missing.map(escapeHtml).join(', ') || '—'}</p>`;
}

function navigate(page) { $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page)); $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function applyLang() {
  document.documentElement.lang = state.lang; document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr'; $('langBtn').textContent = state.lang === 'ar' ? 'English' : 'العربية';
  $$('[data-i18n]').forEach(el => { const v = I18N[state.lang]?.[el.dataset.i18n]; if (v) el.textContent = v; });
}
function applyTheme() { document.documentElement.dataset.theme = state.theme; }
async function updateStats() { $('statFiles').textContent = state.extractedFiles.length; $('statQuestions').textContent = state.questions.length + state.bank.length; $('statArtifacts').textContent = state.artifacts; try { $('statBanks').textContent = (await db.getAll('banks')).length; } catch { $('statBanks').textContent = '0'; } }
async function refreshStorage() {
  const stores = ['banks','corpora','sessions','artifacts','settings']; const rows = [];
  for (const s of stores) for (const item of await db.getAll(s)) rows.push({ store: s, ...item });
  $('storageOut').innerHTML = rows.map(r => `<div class="storage-row"><div><b>${r.store}</b> — ${escapeHtml(r.name || r.id)}</div><small>${r.createdAt || ''}</small><button class="danger small" data-del-store="${r.store}" data-del-id="${r.id}">Delete</button></div>`).join('') || '<p>No saved items.</p>';
  $$('[data-del-id]').forEach(b => b.onclick = async () => { await db.delete(b.dataset.delStore, b.dataset.delId); refreshStorage(); updateStats(); });
}

function bindEvents() {
  $$('.nav-item').forEach(b => b.addEventListener('click', () => navigate(b.dataset.page)));
  $('langBtn').onclick = () => { state.lang = state.lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('qmx_lang', state.lang); applyLang(); };
  $('themeBtn').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('qmx_theme', state.theme); applyTheme(); };
  $('fileInput').onchange = () => { const files = [...$('fileInput').files]; $('fileList').innerHTML = files.map(f => `<div class="file-row"><b>${escapeHtml(f.name)}</b><small>${(f.size/1024/1024).toFixed(2)} MB</small></div>`).join(''); };
  $('extractBtn').onclick = async () => {
    const files = [...$('fileInput').files]; if (!files.length) return toast('اختر ملفات أولاً', 'warn');
    let out = $('sourceText').value || '';
    for (const f of files) { toast(`Extracting: ${f.name}`, 'warn'); const t = await extractFile(f); out += t; state.extractedFiles.push({ name: f.name, size: f.size, at: nowIso() }); $('sourceText').value = cleanText(out); }
    toast('تم الاستخراج محلياً', 'ok'); updateStats();
  };
  $('cleanBtn').onclick = () => { $('sourceText').value = cleanText($('sourceText').value); toast('Cleaned', 'ok'); };
  $('entitiesBtn').onclick = () => { const e = extractEntities($('sourceText').value); $('entitiesOut').innerHTML = Object.entries(e).map(([k,v]) => `<div class="entity-card"><h4>${escapeHtml(k)}</h4>${v.map(x => `<code>${escapeHtml(x)}</code>`).join('') || '<small>—</small>'}</div>`).join(''); };
  $('sendToGenerator').onclick = () => { $('generatorText').value = $('sourceText').value; navigate('generator'); };
  $('saveCorpusBtn').onclick = async () => { await db.put('corpora', { id: uid('corpus'), name: `Corpus ${new Date().toLocaleString()}`, createdAt: nowIso(), text: $('sourceText').value }); toast('Saved locally', 'ok'); refreshStorage(); };
  $('exportTextBtn').onclick = () => downloadText($('sourceText').value, 'QuizMedX-extracted.txt');
  $('generateBtn').onclick = () => { state.questions = generateQuestions($('generatorText').value, $('questionProfile').value); renderQuestions(); toast(`${state.questions.length} questions`, 'ok'); };
  $('appendBankBtn').onclick = () => { state.bank = removeDuplicateQuestions([...state.bank, ...state.questions], .94); renderBank(); toast('Added to bank', 'ok'); };
  $('exportQuestionsCsv').onclick = () => exportQuestionsCsv(state.questions, 'QuizMedX-questions.csv');
  $('exportQuestionsJson').onclick = () => downloadText(JSON.stringify(state.questions, null, 2), 'QuizMedX-questions.json', 'application/json;charset=utf-8');
  $('startQuizFromGenerated').onclick = () => startQuiz(state.questions);
  $('dedupeBtn').onclick = () => { const before = state.bank.length; state.bank = removeDuplicateQuestions(state.bank, .88); renderBank(); toast(`Removed ${before - state.bank.length}`, 'ok'); };
  $('classifyBtn').onclick = () => { state.bank = state.bank.map(q => ({ ...q, tags: Object.values(classifyQuestion(q.stem)) })); renderBank(); toast('Classified', 'ok'); };
  $('saveBankBtn').onclick = async () => { await db.put('banks', { id: uid('bank'), name: `Question Bank (${state.bank.length})`, createdAt: nowIso(), questions: state.bank }); toast('Bank saved', 'ok'); refreshStorage(); updateStats(); };
  $('loadBankBtn').onclick = async () => { const banks = await db.getAll('banks'); const b = banks.at(-1); if (!b) return toast('No saved bank', 'warn'); state.bank = b.questions || []; renderBank(); toast(`Loaded ${b.name}`, 'ok'); };
  $('exportBankXlsx').onclick = () => exportQuestionsXlsx(state.bank, 'QuizMedX-bank.xlsx');
  $('exportBankHtml').onclick = exportBankHtml;
  $('clearBankBtn').onclick = () => { state.bank = []; renderBank(); };
  $('strictPrompt').textContent = NOTES_STRICT_PROMPT;
  $('makeNotesBtn').onclick = async () => { const res = await makeNotesImages($('notesTitle').value, $('notesText').value); state.notes = res.pages; $('notesVerify').textContent = res.verified ? `✅ ${res.sourceLines} lines verified` : '⚠ Check needed'; $('notesOut').innerHTML = state.notes.map((n,i) => `<div class="note-thumb"><img src="${n.url}" alt="note ${i+1}"><div class="toolbar"><button class="ghost small" data-download-note="${i}">PNG</button></div></div>`).join(''); $$('[data-download-note]').forEach(b => b.onclick = () => fetch(state.notes[+b.dataset.downloadNote].url).then(r=>r.blob()).then(blob=>downloadBlob(blob, state.notes[+b.dataset.downloadNote].name))); toast(`${state.notes.length} images`, 'ok'); };
  $('downloadAllNotes').onclick = () => state.notes.forEach((n,i) => setTimeout(() => fetch(n.url).then(r=>r.blob()).then(blob=>downloadBlob(blob, n.name)), i*250));
  $('buildSlidesBtn').onclick = () => { state.slides = analyzeSlides($('slidesTitle').value, $('slidesText').value); renderSlides(); toast(`${state.slides.length} slides`, 'ok'); };
  $('exportSlidesHtml').onclick = () => downloadText(`<html><head><meta charset="utf-8"><title>QuizMed X Slides</title><link rel="stylesheet" href="styles.css"></head><body>${$('slidesOut').innerHTML}</body></html>`, 'QuizMedX-slides.html', 'text/html;charset=utf-8');
  $('exportSlidesPptx').onclick = exportSlidesPptx;
  $('startQuizBtn').onclick = () => startQuiz(); $('pauseQuizBtn').onclick = () => { if (state.quiz) state.quiz.paused = !state.quiz.paused; }; $('finishQuizBtn').onclick = finishQuiz;
  $('gradeEssayBtn').onclick = gradeEssay;
  $('addGpaRow').onclick = () => addGpaRow(); $('calcGpa').onclick = calculateGpa; $$('[data-azhar]').forEach(b => b.onclick = () => renderAzhar(b.dataset.azhar));
  $('refreshStorage').onclick = refreshStorage; $('wipeStorage').onclick = async () => { if (!confirm('Delete all local QuizMed X saved items?')) return; for (const s of ['banks','corpora','sessions','artifacts','settings']) await db.clear(s); refreshStorage(); updateStats(); };
}

function init() {
  $$('[data-i18n]').forEach(el => { if (!I18N.ar[el.dataset.i18n]) I18N.ar[el.dataset.i18n] = el.textContent; });
  applyTheme(); applyLang(); bindEvents();
  $('dashboardAzhar').innerHTML = [`${AZHAR.creditLoad.years} years`, `${AZHAR.creditLoad.semesters} semesters`, `${AZHAR.creditLoad.min}-${AZHAR.creditLoad.max} CH`, `College code ${AZHAR.code.college}`, ...AZHAR.teachingMethods].map(x => `<span>${escapeHtml(x)}</span>`).join('');
  addGpaRow('Integrated Medical Program', 3, 92); addGpaRow('University Requirement', 2, 86);
  renderAzhar('courses'); renderQuestions(); renderBank(); renderSlides(); renderQuiz(); refreshStorage(); updateStats();
  $('notesText').value = $('generatorText').value = $('slidesText').value = 'Anatomy is the study of body structure. Physiology explains body function. Pathology studies disease mechanisms. التشريح يدرس تركيب الجسم. الفسيولوجيا تشرح وظائف الجسم. الباثولوجيا تدرس آليات المرض.';
  $('sourceText').value = $('generatorText').value;
  toast('QuizMed X يعمل محلياً بدون أي API خارجي', 'ok');
}

document.addEventListener('DOMContentLoaded', init);
