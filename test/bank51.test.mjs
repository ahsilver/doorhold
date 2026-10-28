// d51: bank statements without a live feed — PDF statements (3 layouts + a scan), Excel .xlsx/.xls and CSV with the column step,
// the rows import route, the current / long-term liability split and the balance sheet's current portion. Run: node --test test/bank51.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SITE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'site'); const FX = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures', 'bank51');
const B = require(path.join(SITE, 'bank-statement.js'));
const EXP = JSON.parse(fs.readFileSync(path.join(FX, 'expected.json'), 'utf8'));
// the same text the browser gets: pdf.js text items -> closing-extract.js layout lines
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(SITE, 'closing-extract.js'), 'utf8'), ctx);
async function pdfText(file) {
  const lib = await import(path.join(SITE, 'vendor', 'pdf.min.mjs')); lib.GlobalWorkerOptions.workerSrc = path.join(SITE, 'vendor', 'pdf.worker.min.mjs');
  const doc = await lib.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false, disableFontFace: true }).promise; const pages = []; let empty = 0;
  for (let p = 1; p <= doc.numPages; p++) { const pg = await doc.getPage(p); const vp = pg.getViewport({ scale: 1 }); const tc = await pg.getTextContent(); const t = ctx.clLinesFromTextItems(tc.items, vp.width); if (t.replace(/\s/g, '').length < 20) empty++; pages.push(t); }
  await doc.destroy(); return { text: pages.join('\n\f\n'), scanned: pages.length > 0 && empty * 2 >= pages.length };
}
const pairs = rows => rows.map(r => [r.date, r.amount]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]);
for (const f of ['a-sections.pdf', 'b-signed.pdf', 'c-running.pdf']) {
  test('PDF statement ' + f + ': every line, signed right, balances and date found, adds up', async () => {
    const { text, scanned } = await pdfText(path.join(FX, f)); assert.equal(scanned, false);
    const st = B.bs51Statement(text); const e = EXP[f];
    assert.deepEqual(pairs(st.rows), e.rows.slice().sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
    assert.equal(st.ending, e.ending); assert.equal(st.beginning, e.beginning); assert.equal(st.end, e.end);
    assert.ok(st.adds && st.adds.ok, 'beginning + lines = ending');
    assert.ok(st.rows.every(r => r.description && r.description.length > 2));
  });
}
test('PDF: a continued description is joined; a check line reads "Check 1043"', async () => {
  const st = B.bs51Statement((await pdfText(path.join(FX, 'a-sections.pdf'))).text);
  assert.ok(st.rows.some(r => /PSE&G Billpay Orig ID/.test(r.description)), JSON.stringify(st.rows.map(r => r.description)));
  assert.ok(st.rows.some(r => /^Check 1043/.test(r.description) && r.amount === -25000));
});
test('PDF: a scanned statement has no text layer and is reported as such', async () => {
  const { text, scanned } = await pdfText(path.join(FX, 'd-scanned.pdf')); assert.equal(scanned, true); assert.equal(B.bs51Statement(text).rows.length, 0);
});
function sheetRows(file) { const X = require(path.join(SITE, 'vendor', 'xlsx.full.min.js')); const wb = X.read(fs.readFileSync(file), { type: 'buffer', cellDates: false }); return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).map(r => r.map(c => String(c == null ? '' : c))).filter(r => r.some(c => c.trim())); }
for (const f of ['e-export.xlsx', 'f-export.xls', 'g-export.csv']) {
  test('spreadsheet ' + f + ': heading row found below the bank name, columns mapped, rows signed', () => {
    const rows = f.endsWith('.csv') ? require(path.join(SITE, 'bank-statement.js')) && fs.readFileSync(path.join(FX, f), 'utf8').trim().split('\n').map(l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))) : sheetRows(path.join(FX, f));
    const am = B.bs51AutoMap(rows); assert.ok(am.head >= 0); assert.ok(am.map.date >= 0 && (am.map.amount >= 0 || am.map.debit >= 0));
    const r = B.bs51Rows(rows, am.head, am.map); const e = EXP[f.replace('f-export.xls', 'e-export.xlsx')];
    assert.deepEqual(r.rows.map(x => [x.date, x.amount]), e.rows); assert.equal(r.rows[r.rows.length - 1].balance, e.ending);
  });
}
test('dates and money as banks write them', () => {
  assert.equal(B.bs51Date('09/05', 2026, 9), '2026-09-05'); assert.equal(B.bs51Date('12/30', 2027, 1), '2026-12-30'); assert.equal(B.bs51Date('Sep 5, 2026'), '2026-09-05'); assert.equal(B.bs51Date('46270'), '2026-09-05'); assert.equal(B.bs51Date('31/02/2026'), null);
  assert.deepEqual(B.bs51Money('(45.00)'), { v: -4500, sign: -1 }); assert.deepEqual(B.bs51Money('1,234.56-'), { v: -123456, sign: -1 }); assert.deepEqual(B.bs51Money('12.00 CR'), { v: 1200, sign: 1 }); assert.equal(B.bs51Money('n/a'), null);
});
