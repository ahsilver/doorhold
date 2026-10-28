// R14: bank statement files — Chase / Bank of America / TD / Wells Fargo layouts read right (header rows, blank lines, $ and commas, (negatives), debit/credit columns)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const SITE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'site');
const require = createRequire(import.meta.url); const B = require(path.join(SITE, 'bank-statement.js'));
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const i = app.indexOf('function csvParse25'); const ctx = {}; vm.createContext(ctx); vm.runInContext(app.slice(i, app.indexOf('\n}', i) + 2) + ';this.csv=csvParse25;', ctx);
const read = txt => { const rows = ctx.csv(txt); const am = B.bs51AutoMap(rows); return B.bs51Rows(rows, am.head, am.map, {}); };
const sum = r => r.rows.reduce((s, x) => s + x.amount, 0);
test('R14 Chase CSV: words come from Description (not the CREDIT/DEBIT Details column)', () => {
  const r = read('Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #\r\nCREDIT,10/14/2026,ZELLE FROM NEYKA,400.00,QUICKPAY_CREDIT,"12,400.00",\r\nDEBIT,10/15/2026,ZELLE TO BENJAMIN,-450.00,QUICKPAY_DEBIT,"11,950.00",\r\n\r\nDEBIT,10/16/2026,HOME DEPOT,"-$1,234.56",DEBIT_CARD,"10,715.44",\r\n');
  assert.equal(r.rows.length, 3); assert.equal(r.rows[0].description, 'ZELLE FROM NEYKA'); assert.equal(sum(r), 40000 - 45000 - 123456);
});
test('R14 Bank of America CSV: summary block above the heading row is skipped; (negatives) and $ read', () => {
  const r = read('Description,,Summary Amt.\r\nBeginning balance as of 10/01/2026,,"$9,000.00"\r\n\r\nDate,Description,Amount,Running Bal.\r\n10/01/2026,Beginning balance as of 10/01/2026,,"9,000.00"\r\n10/02/2026,SHELLPOINT MTG,"-1,617.74","7,382.26"\r\n10/09/2026,PSE&G,(250.00),"7,132.26"\r\n10/12/2026,Counter Credit,$500.00,"7,632.26"\r\n');
  assert.equal(r.rows.length, 3); assert.equal(sum(r), -161774 - 25000 + 50000); assert.equal(r.rows[0].balance, 738226);
});
test('R14 TD CSV: Debit and Credit columns under a title block', () => {
  const r = read('TD Bank — Account Activity\r\n\r\nDate,Description,Debit,Credit,Balance\r\n10/03/2026,WATER,$86.40,,"4,913.60"\r\n10/06/2026,RENT,,"$1,650.00","6,563.60"\r\n');
  assert.deepEqual(r.rows.map(x => x.amount), [-8640, 165000]);
});
test('R14 Wells Fargo CSV: amount before the description, check number column', () => {
  const r = read('Wells Fargo — Checking\r\n\r\nDate,Amount,Check Number,Description\r\n10/04/2026,(75.25),,GOOGLE\r\n10/11/2026,"(1,050.00)",3301,CHECK 3301\r\n10/19/2026,"2,250.00",,ZELLE\r\n');
  assert.deepEqual(r.rows.map(x => [x.amount, x.description]), [[-7525, 'GOOGLE'], [-105000, 'CHECK 3301'], [225000, 'ZELLE']]);
});
test('R14 Excel date serials and bad files: clear messages, nothing imported', () => {
  assert.equal(B.bs51Date('46309'), '2026-10-14');
  const seg = app.slice(app.indexOf('async function bk51Read'), app.indexOf('function bk51Scan'));
  for (const w of ['could not be opened', 'password-protected', 'is empty: no rows', "doesn't look like a bank download"]) assert.ok(seg.includes(w), w);
});

test('R14 reconcile page: Upload statement button beside Settings opens the import', () => {
  const i = app.indexOf('// R14: "Upload statement" right on each bank'); assert.ok(i > 0); const seg = app.slice(i, i + 1200);
  for (const w of ["$('.set11b', root)", 'class="btn sm up14b"', 'importSheet(bid)', 'Upload statement']) assert.ok(seg.includes(w), w);
});
