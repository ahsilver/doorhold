/*
 * extract-text.js — in-browser PDF text extraction for closing statements.
 * Classic script (no ES-module syntax at top level); exposes globals:
 *   async function clExtractPdfText(file)  -> { text, pages, scanned, pageTexts }
 *   function clLinesFromTextItems(items, pageWidth) -> string (one page)
 * Needs /vendor/pdf.min.mjs and /vendor/pdf.worker.min.mjs (pdfjs-dist 4.10.38 legacy build).
 *
 * Line reconstruction: text items are grouped by baseline y (tolerance ~40% of the font
 * height), sorted by x, and joined with spaces. Spaces are padded so each item starts near
 * the character column matching its x-position (one column per 3pt) — a light
 * "layout" mode, so table columns stay apart ("Debit   Credit") and the parser can tell
 * which column an amount sits in. Plain single-space joins also parse (with weaker column
 * assignment).
 */
var CL_PDFJS_URL = '/vendor/pdf.min.mjs';
var CL_PDFJS_WORKER_URL = '/vendor/pdf.worker.min.mjs';

function clLinesFromTextItems(items, pageWidth) {
  // one character column per 3pt: smaller than the average glyph of 6.5pt+ text, so labels
  // never push later columns out of place (no drift); a letter page is ~204 columns wide.
  var unit = 3;
  var its = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it || typeof it.str !== 'string') continue;
    var s = it.str.replace(/\s+/g, ' ');
    if (!s.trim()) continue;
    var tr = it.transform || [1, 0, 0, 1, 0, 0];
    var h = Math.abs(it.height || tr[3] || tr[0] || 10);
    its.push({ s: s, x: tr[4], y: tr[5], w: it.width || s.length * h * 0.5, h: h });
  }
  // top-to-bottom, then left-to-right
  its.sort(function (a, b) { return (b.y - a.y) || (a.x - b.x); });
  var lines = [];
  for (var j = 0; j < its.length; j++) {
    var cur = its[j], placed = false;
    for (var k = lines.length - 1; k >= 0 && k >= lines.length - 3; k--) {
      var L = lines[k];
      if (Math.abs(L.y - cur.y) <= Math.max(1.5, Math.min(L.h, cur.h) * 0.4)) { L.items.push(cur); placed = true; break; }
    }
    if (!placed) lines.push({ y: cur.y, h: cur.h, items: [cur] });
  }
  var out = [];
  for (var m = 0; m < lines.length; m++) {
    var row = lines[m].items.sort(function (a, b) { return a.x - b.x; });
    var str = '', lastEnd = null;
    for (var n = 0; n < row.length; n++) {
      var t = row[n];
      var col = Math.max(0, Math.round(t.x / unit));
      if (lastEnd === null) {
        str = new Array(col + 1).join(' ');
      } else {
        var gap = t.x - lastEnd;
        if (gap > t.h * 0.15 || gap < -t.h * 0.3) {
          str += ' ';
          if (gap > t.h * 0.9 && col > str.length) str += new Array(col - str.length + 1).join(' ');
        }
      }
      str += t.s;
      lastEnd = t.x + t.w;
    }
    out.push(str.replace(/\s+$/, ''));
  }
  return out.join('\n');
}

var clPdfjsPromise = null;
function clLoadPdfjs() {
  if (!clPdfjsPromise) {
    clPdfjsPromise = import(CL_PDFJS_URL).then(function (lib) {
      lib.GlobalWorkerOptions.workerSrc = CL_PDFJS_WORKER_URL;
      return lib;
    });
  }
  return clPdfjsPromise;
}

async function clExtractPdfText(file) {
  var lib = await clLoadPdfjs();
  var buf = new Uint8Array(await file.arrayBuffer());
  var doc = await lib.getDocument({ data: buf, isEvalSupported: false, disableFontFace: true }).promise;
  var pageTexts = [], emptyPages = 0;
  try {
    for (var p = 1; p <= doc.numPages; p++) {
      var page = await doc.getPage(p);
      var vp = page.getViewport({ scale: 1 });
      var tc = await page.getTextContent();
      var t = clLinesFromTextItems(tc.items, vp.width);
      if (t.replace(/\s/g, '').length < 20) emptyPages++;
      pageTexts.push(t);
      page.cleanup();
    }
  } finally {
    doc.destroy();
  }
  return {
    text: pageTexts.join('\n\f\n'),
    pageTexts: pageTexts,
    pages: pageTexts.length,
    // scanned: true when at least half the pages carry no text layer (image-only scan -> needs OCR)
    scanned: pageTexts.length > 0 && emptyPages * 2 >= pageTexts.length
  };
}
