/*
 * ocr.js — read scanned PDFs and photos in the browser, no API key (tesseract.js from a CDN, loaded on first use).
 * Classic script; globals:
 *   pmReadDocFiles(files, onProgress) -> { text, ocr, pages, conf, kind:'pdf'|'image' }
 *       PDFs with a real text layer use it (fast); scans and photos are OCR'd page by page.
 *   pmOcrCanvasList(canvases, onProgress) -> { text, conf, pages }
 * Text comes back in the same "light layout" shape clExtractPdfText produces (one column per 3pt), so the
 * closing / mortgage parsers read it the same way.
 */
var PM_OCR_CDNS = [
  { js: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js', core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1', lang: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int' },
  { js: 'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js', worker: 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js', core: 'https://unpkg.com/tesseract.js-core@5.1.1', lang: 'https://unpkg.com/@tesseract.js-data/eng@1.0.0/4.0.0_best_int' }
];
var PM_HEIC_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
var pmOcrCdn = null, pmOcrWorkerP = null, pmOcrLog = null;

function pmLoadScript(src) {
  return new Promise(function (ok, bad) {
    var s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = function () { ok(); }; s.onerror = function () { s.remove(); bad(new Error('load failed: ' + src)); };
    document.head.appendChild(s);
  });
}
async function pmOcrLib() {
  if (window.Tesseract && pmOcrCdn) return window.Tesseract;
  for (var i = 0; i < PM_OCR_CDNS.length; i++) {
    try { await pmLoadScript(PM_OCR_CDNS[i].js); if (window.Tesseract) { pmOcrCdn = PM_OCR_CDNS[i]; return window.Tesseract; } } catch (e) { }
  }
  throw new Error('Could not load the scan reader. Check the internet connection and try again.');
}
function pmOcrWorker() {
  if (!pmOcrWorkerP) {
    pmOcrWorkerP = (async function () {
      var T = await pmOcrLib();
      var w = await T.createWorker('eng', 1, {
        workerPath: pmOcrCdn.worker, corePath: pmOcrCdn.core, langPath: pmOcrCdn.lang, workerBlobURL: true,
        logger: function (m) { if (pmOcrLog) pmOcrLog(m); }
      });
      await w.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
      return w;
    })();
    pmOcrWorkerP.catch(function () { pmOcrWorkerP = null; });
  }
  return pmOcrWorkerP;
}

// ---- images -> canvas ----
function pmIsHeic(f) { return /heic|heif/i.test(f.type || '') || /\.(heic|heif)$/i.test(f.name || ''); }
function pmDecodeImage(blob) {
  return new Promise(function (ok, bad) {
    var u = URL.createObjectURL(blob), im = new Image();
    im.onload = function () { URL.revokeObjectURL(u); ok(im); };
    im.onerror = function () { URL.revokeObjectURL(u); bad(new Error('Could not open that picture')); };
    im.src = u;
  });
}
async function pmImageToCanvas(file, maxSide) {
  var im;
  try { im = await pmDecodeImage(file); }
  catch (e) {
    if (!pmIsHeic(file)) throw new Error('Could not open ' + (file.name || 'that picture') + ' (try a JPG or PNG)');
    if (!window.heic2any) await pmLoadScript(PM_HEIC_URL);
    var jpg = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    im = await pmDecodeImage(Array.isArray(jpg) ? jpg[0] : jpg);
  }
  var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  var k = Math.min(1, (maxSide || 3000) / Math.max(w, h));
  var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
  return c;
}
// grayscale + stretch contrast (ignores the darkest/lightest 1%), helps photos with uneven light
function pmPrep(c) {
  var g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height), a = d.data, n = a.length / 4, hist = new Uint32Array(256), i, v;
  for (i = 0; i < a.length; i += 4) { v = (a[i] * 299 + a[i + 1] * 587 + a[i + 2] * 114) / 1000 | 0; a[i] = v; hist[v]++; }
  var lo = 0, hi = 255, s = 0;
  for (lo = 0, s = 0; lo < 255 && (s += hist[lo]) < n * 0.01; lo++);
  for (hi = 255, s = 0; hi > 0 && (s += hist[hi]) < n * 0.02; hi--);
  if (hi - lo < 40) { lo = 0; hi = 255; }
  var sc = 255 / (hi - lo);
  for (i = 0; i < a.length; i += 4) { v = (a[i] - lo) * sc; v = v < 0 ? 0 : v > 255 ? 255 : v; a[i] = a[i + 1] = a[i + 2] = v; }
  g.putImageData(d, 0, 0); return c;
}

// adaptive threshold (local mean, Bradley) + removal of long ruled lines (table borders confuse the reader)
function pmBinarize(c) {
  var W = c.width, H = c.height, g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, W, H), a = d.data;
  var gray = new Uint8ClampedArray(W * H), i, x, y;
  for (i = 0; i < W * H; i++) gray[i] = a[i * 4];
  if (Math.min(W, H) > 1400) { // 3x3 mean first: photo grain and scanner noise otherwise turn into specks
    var bl = new Uint8ClampedArray(W * H);
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) { var p = y * W + x; bl[p] = (gray[p - W - 1] + gray[p - W] + gray[p - W + 1] + gray[p - 1] + gray[p] + gray[p + 1] + gray[p + W - 1] + gray[p + W] + gray[p + W + 1]) / 9; }
    gray = bl;
  }
  var ii = new Float64Array((W + 1) * (H + 1));
  for (y = 0; y < H; y++) { var rs = 0; for (x = 0; x < W; x++) { rs += gray[y * W + x]; ii[(y + 1) * (W + 1) + x + 1] = ii[y * (W + 1) + x + 1] + rs; } }
  var r = Math.max(8, Math.round(Math.max(W, H) / 70)), T = 0.16;
  var ink = new Uint8Array(W * H);
  for (y = 0; y < H; y++) {
    var y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
    for (x = 0; x < W; x++) {
      var x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
      var sum = ii[y1 * (W + 1) + x1] - ii[y0 * (W + 1) + x1] - ii[y1 * (W + 1) + x0] + ii[y0 * (W + 1) + x0];
      var mean = sum / ((x1 - x0) * (y1 - y0));
      var v = gray[y * W + x];
      ink[y * W + x] = (v < mean * (1 - T) && v < 215) ? 1 : 0;
    }
  }
  // ruled lines: runs of ink (in a 5-row / 5-column band, so slightly tilted lines still count) longer than L
  var L = Math.max(60, Math.round(Math.min(W, H) * 0.05)), kill = new Uint8Array(W * H), run, st;
  for (y = 0; y < H; y++) {
    run = 0; st = 0;
    for (x = 0; x <= W; x++) {
      var on = x < W && (ink[y * W + x] || (y > 0 && ink[(y - 1) * W + x]) || (y < H - 1 && ink[(y + 1) * W + x]) || (y > 1 && ink[(y - 2) * W + x]) || (y < H - 2 && ink[(y + 2) * W + x]));
      if (on) { if (!run) st = x; run++; }
      else { if (run > L) for (var q = st; q < x; q++) kill[y * W + q] = 1; run = 0; }
    }
  }
  var Lv = Math.max(50, Math.round(Math.min(W, H) * 0.035));
  for (x = 0; x < W; x++) {
    run = 0; st = 0;
    for (y = 0; y <= H; y++) {
      var on2 = y < H && (ink[y * W + x] || (x > 0 && ink[y * W + x - 1]) || (x < W - 1 && ink[y * W + x + 1]));
      if (on2) { if (!run) st = y; run++; }
      else { if (run > Lv) for (var q2 = st; q2 < y; q2++) kill[q2 * W + x] = 1; run = 0; }
    }
  }
  for (i = 0; i < W * H; i++) { var o = (ink[i] && !kill[i]) ? 0 : 255; a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = o; a[i * 4 + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
}
function pmCopy(c) { var r = document.createElement('canvas'); r.width = c.width; r.height = c.height; r.getContext('2d').drawImage(c, 0, 0); return r; }
function pmRotate(c, deg) {
  if (!deg) return c;
  var r = document.createElement('canvas'), q = deg % 180 !== 0;
  r.width = q ? c.height : c.width; r.height = q ? c.width : c.height;
  var g = r.getContext('2d'); g.translate(r.width / 2, r.height / 2); g.rotate(deg * Math.PI / 180); g.drawImage(c, -c.width / 2, -c.height / 2);
  return r;
}

// ---- OCR result -> layout text ----
function pmFixNum(tok) {
  // repair money-like tokens: O->0, l/I/|->1, S$ at start, dot/comma confusions, {} -> ()
  var core = tok.replace(/[^0-9A-Za-z]/g, ''); if (!core) return tok;
  var digits = (core.match(/\d/g) || []).length;
  var like = (core.match(/[\dOolI]/g) || []).length;
  if (!digits && like === core.length && core.length >= 3 && /^[($-]*[OolI]*[.,][OolI\d.,]*[)]*$/.test(tok)) digits = 1;
  if (digits < 1 || (like < core.length && digits < core.length * 0.6) || (digits < 2 && !/[.,]/.test(tok))) return tok;
  var t = tok.replace(/^[{\[]/, '(').replace(/[}\]]$/, ')').replace(/^S(?=\d)/, '$');
  for (var pass = 0; pass < 6; pass++) {
    var t2 = t.replace(/[OolI|]/g, function (ch, i, all) {
      var near = /[\d.,]/.test(all.charAt(i - 1) || '') || /[\d.,]/.test(all.charAt(i + 1) || '');
      return near ? (/[Oo]/.test(ch) ? '0' : '1') : ch;
    });
    if (t2 === t) break; t = t2;
  }
  if (/^\(?\$\d{3,}\)?$/.test(t)) t = t.replace(/(\d{2})(\)?)$/, '.$1$2');
  var m = t.match(/^([($-]*)(\d[\d.,]*)([)]*)$/);
  if (m && /[.,]\d{2}$/.test(m[2]) && /\d[.,]\d{2}$/.test(m[2])) {
    var parts = m[2].split(/[.,]/);
    var okGroups = parts.length === 2 || (parts[0].length <= 3 && parts.slice(1, -1).every(function (p) { return p.length === 3; }));
    if (okGroups) {
      var ip = parts.slice(0, -1).join('').replace(/^0+(?=\d)/, ''), dp = parts[parts.length - 1];
      t = m[1] + ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dp + m[3];
    }
  }
  return t;
}
function pmJoinSplitNums(s) {
  // "12, 845.00" / "12 ,845.00" -> "12,845.00" ; "$ 1,234.00" -> "$1,234.00"
  return s.replace(/(\d{1,3}) ?, ?(\d{3}\.\d{2})(?!\d)/g, '$1,$2').replace(/\$ (?=\d)/g, '$');
}
function pmOcrToText(data, k) {
  // k = pixels per PDF point. Uses tesseract's own lines (already deskewed), positions words in 3pt columns,
  // and merges lines from side-by-side columns that share a baseline, like the PDF text path does.
  var items = [], conf = [], H = 0;
  var blocks = data.blocks || [];
  var lines = [];
  blocks.forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) { lines.push(l); }); }); });
  if (!lines.length && data.lines) lines = data.lines;
  lines.forEach(function (l) {
    var lb = l.bbox, base = l.baseline && l.baseline.y0 != null ? (l.baseline.y0 + l.baseline.y1) / 2 : lb.y1;
    var lh = Math.max(4, (lb.y1 - lb.y0) * 0.75);
    (l.words || []).forEach(function (w) {
      var s = String(w.text || '').trim(); if (!s) return;
      if (w.confidence < 25 && !/\d/.test(s)) return; // drop specks
      if (/[A-Za-z0-9]/.test(s) && s.length >= 2) conf.push(w.confidence);
      s = pmFixNum(s);
      var wb = w.bbox; if (wb.y1 > H) H = wb.y1;
      items.push({ str: s, transform: [1, 0, 0, 1, wb.x0 / k, -base / k], width: (wb.x1 - wb.x0) / k, height: lh / k });
    });
  });
  var text = typeof clLinesFromTextItems === 'function' ? clLinesFromTextItems(items, 612) : (data.text || '');
  text = text.split('\n').map(pmJoinSplitNums).join('\n');
  var mean = conf.length ? conf.reduce(function (a, b) { return a + b; }, 0) / conf.length : 0;
  return { text: text, conf: Math.round(mean), words: conf.length };
}

async function pmOcrOne(c, k) {
  var w = await pmOcrWorker();
  var r = await w.recognize(c, { rotateAuto: true }, { text: true, blocks: true });
  return pmOcrToText(r.data, k);
}
function pmMoneyCount(t) { var m = t.match(/\$?\d{1,3}(?:,\d{3})*\.\d{2}(?!\d)/g); return m ? m.length : 0; }
// tries the page as is; if it reads poorly, tries it turned 90/180/270 and keeps the best; then, unless the page
// already read cleanly, reads a cleaned-up copy (local threshold, ruled lines removed) and keeps whichever found more amounts
async function pmOcrPage(c, k, say) {
  var best = await pmOcrOne(c, k); best.rot = 0;
  if (!(best.conf >= 72 && best.words >= 25)) {
    var degs = [90, 270, 180];
    for (var i = 0; i < degs.length; i++) {
      if (say) say('turn');
      var r = await pmOcrOne(pmRotate(c, degs[i]), k); r.rot = degs[i];
      if (r.conf * Math.min(1, r.words / 25) > best.conf * Math.min(1, best.words / 25) + 3) best = r;
      if (best.conf >= 80 && best.words >= 25) break;
    }
  }
  best.money = pmMoneyCount(best.text);
  if (window.PM_OCR_MODE === 'raw') return best;
  if (best.conf >= 93 && best.money >= 3 && window.PM_OCR_MODE !== 'bin') return best;
  if (say) say('clean');
  var b = await pmOcrOne(pmBinarize(pmRotate(best.rot ? c : pmCopy(c), best.rot)), k); b.rot = best.rot; b.money = pmMoneyCount(b.text);
  if ((b.money > best.money && b.conf >= best.conf - 3) || (b.money === best.money && b.conf > best.conf)) { b.cleaned = true; return b; }
  return best;
}

async function pmOcrCanvasList(list, onProgress) {
  // list: [{canvas, k}] ; k = px per point (for photos: width/612)
  var out = [], confs = [], rots = [];
  pmOcrLog = function (m) {
    if (!onProgress) return;
    if (/loading|initializ/i.test(m.status || '') && m.progress < 1) onProgress('Getting the scan reader ready… ' + Math.round((m.progress || 0) * 100) + '%');
  };
  try {
    onProgress && onProgress('Getting the scan reader ready…');
    await pmOcrWorker();
    for (var i = 0; i < list.length; i++) {
      var lab = list.length > 1 ? 'Reading scanned page ' + (i + 1) + ' of ' + list.length + '…' : 'Reading the scanned page…';
      onProgress && onProgress(lab);
      pmOcrLog = function (m) { if (onProgress && m.status === 'recognizing text') onProgress(lab + ' ' + Math.round((m.progress || 0) * 100) + '%'); };
      var r = await pmOcrPage(pmPrep(list[i].canvas), list[i].k, function (w) { onProgress && onProgress(lab.replace('…', '') + (w === 'turn' ? ' (turning it)…' : ' (second look)…')); });
      out.push(r.text); confs.push(r.conf); rots.push(r.rot || 0);
    }
  } finally { pmOcrLog = null; }
  return { text: out.join('\n\f\n'), pages: out.length, conf: confs.length ? Math.round(confs.reduce(function (a, b) { return a + b; }, 0) / confs.length) : 0, pageConf: confs, rots: rots };
}

async function pmPdfToCanvases(file, maxPages, scale) {
  var lib = await clLoadPdfjs();
  var doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise;
  var out = [];
  try {
    for (var p = 1; p <= Math.min(doc.numPages, maxPages || 10); p++) {
      var page = await doc.getPage(p), vp1 = page.getViewport({ scale: 1 });
      var sc = Math.min(scale || 3, 3400 / Math.max(vp1.width, vp1.height));
      var vp = page.getViewport({ scale: sc });
      var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport: vp }).promise; page.cleanup();
      out.push({ canvas: c, k: c.width / 612 });
    }
  } finally { doc.destroy(); }
  return out;
}

async function pmReadDocFiles(files, onProgress) {
  files = Array.prototype.slice.call(files || []);
  if (!files.length) throw new Error('No file chosen');
  var pdf = files.find(function (f) { return /pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || ''); });
  if (pdf) {
    onProgress && onProgress('Reading ' + pdf.name + '…');
    var ex = await clExtractPdfText(pdf);
    var t = ex.text || '';
    if (!ex.scanned && t.replace(/\s/g, '').length >= 200) return { text: t, ocr: false, pages: ex.pages, kind: 'pdf' };
    onProgress && onProgress('This PDF is a scan. Reading it…');
    var cv = await pmPdfToCanvases(pdf, 10, 3);
    var o = await pmOcrCanvasList(cv, onProgress);
    // keep any real text the PDF did have (e.g. a typed first page) ahead of the OCR text
    return { text: (t.replace(/\s/g, '').length > 60 ? t + '\n\f\n' : '') + o.text, ocr: true, pages: o.pages, conf: o.conf, kind: 'pdf' };
  }
  var list = [];
  for (var i = 0; i < files.length && i < 12; i++) {
    onProgress && onProgress('Opening photo ' + (i + 1) + (files.length > 1 ? ' of ' + files.length : '') + '…');
    var c = await pmImageToCanvas(files[i], 3000);
    list.push({ canvas: c, k: Math.min(c.width, c.height) / 612 });
  }
  var r = await pmOcrCanvasList(list, onProgress);
  return { text: r.text, ocr: true, pages: r.pages, conf: r.conf, kind: 'image', canvases: list.map(function (x, i) { return pmRotate(x.canvas, r.rots[i] || 0); }) };
}

// photos of the pages -> one small PDF (JPEG pages, letter width) so the statement is filed as a single document
async function pmJpegPdf(canvases) {
  var enc = new TextEncoder(), parts = [], off = 0, offs = [];
  var push = function (x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); off += b.length; };
  var obj = function (n, body) { offs[n] = off; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  var n = canvases.length, kids = [];
  for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
  obj(1, function () { push('<< /Type /Catalog /Pages 2 0 R >>'); });
  obj(2, function () { push('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>'); });
  for (var p = 0; p < n; p++) {
    var c = canvases[p], k = Math.min(1, 1700 / Math.max(c.width, c.height));
    var t = document.createElement('canvas'); t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
    var g = t.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, t.width, t.height); g.drawImage(c, 0, 0, t.width, t.height);
    var blob = await new Promise(function (ok) { t.toBlob(ok, 'image/jpeg', 0.72); });
    var jpg = new Uint8Array(await blob.arrayBuffer());
    var W = 612, H = Math.round(612 * t.height / t.width), base = 3 + p * 3;
    var cs = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
    obj(base, function () { push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + (base + 1) + ' 0 R >> >> /Contents ' + (base + 2) + ' 0 R >>'); });
    obj(base + 1, function () { push('<< /Type /XObject /Subtype /Image /Width ' + t.width + ' /Height ' + t.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); push(jpg); push('\nendstream'); });
    obj(base + 2, function () { push('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'); });
  }
  var total = 3 + n * 3, xref = off;
  var x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (var q = 1; q < total; q++) x += String(offs[q]).padStart(10, '0') + ' 00000 n \n';
  push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(parts, { type: 'application/pdf' });
}
