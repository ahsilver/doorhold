// node --test test/liab51.test.mjs — d51 server side: liabilities split into Current / Long-term (a per-account group, defaults by kind,
// his change stored), balance sheet "Current portion of mortgage" from each loan's own schedule (no entries, totals unchanged), loans with no
// schedule stay long-term with a note, and the rows import used by the Excel / PDF statement import (dupes skipped, auto-match runs).
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker51.mjs');
const worker = (await import('/tmp/pm-test-worker51.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<!doctype html><html><head><title>x</title></head><body></body></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-10-21' };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t }; };
let tok = '', ch = null, pid = 0, pid2 = 0, bank = null, mort = null;
const byName = n => ch.accounts.find(a => a.name === n);
test('new company: liabilities carry a group — Mortgage Payable long-term, bills / deposits current', async () => {
  const r = await call('signup', { name: 'Lia Bility', company: 'Liab Test 51 LLC', email: 'lia51@example.com', password: 'LiabTest-5151', phone: '' }); assert.equal(r.status, 200, r.text); tok = r.json.token;
  ch = (await call('m/chart', null, 'GET', tok)).json;
  const L = ch.accounts.filter(a => a.type === 'liability'); assert.ok(L.length >= 3); assert.ok(L.every(a => a.term === 'current' || a.term === 'long'));
  mort = L.find(a => /mortgage/i.test(a.name)); assert.ok(mort, 'has a mortgage account'); assert.equal(mort.term, 'long');
  assert.equal(L.find(a => /accounts payable/i.test(a.name)).term, 'current'); assert.equal(L.find(a => /security deposit/i.test(a.name)).term, 'current');
  const co = (await call('m/coa', null, 'GET', tok)).json; assert.equal(co.accounts.find(a => a.id === mort.id).term, 'long');
});
test('chart: add a long-term liability; move an account between groups and back (only his change is stored)', async () => {
  const a = await call('m/coa', { name: 'Note Payable - Seller', type: 'liability', term: 'long' }, 'POST', tok); assert.equal(a.status, 200, a.text);
  ch = (await call('m/chart', null, 'GET', tok)).json; assert.equal(ch.accounts.find(x => x.id === a.json.id).term, 'long');
  const b = await call('m/coa', { name: 'Credit line', type: 'liability', term: 'current', code: '2560' }, 'POST', tok); assert.equal(b.status, 200, b.text);
  ch = (await call('m/chart', null, 'GET', tok)).json; assert.equal(ch.accounts.find(x => x.id === b.json.id).term, 'current', 'his choice beats the 25xx number default');
  const ap = byName('Accounts Payable');
  assert.equal((await call('m/x51/term', { account_id: ap.id, term: 'long' }, 'POST', tok)).status, 200);
  assert.equal((await call('m/x51/terms', null, 'GET', tok)).json.terms[ap.id], 'long');
  await call('m/x51/term', { account_id: ap.id, term: 'current' }, 'POST', tok);
  assert.equal((await call('m/x51/terms', null, 'GET', tok)).json.terms[ap.id], 'current');
  const inc = ch.accounts.find(x => x.type === 'income'); assert.equal((await call('m/x51/term', { account_id: inc.id, term: 'long' }, 'POST', tok)).status, 400, 'only liabilities');
  const ed = await call('m/coa/' + b.json.id, { term: 'long', name: 'Credit line' }, 'POST', tok); assert.equal(ed.status, 200, ed.text);
  assert.equal((await call('m/x51/terms', null, 'GET', tok)).json.terms[b.json.id], 'long', 'edit in the chart moves it');
});
// independent amortization: principal of the 12 payments after the report date
// the loan's balance is the balance before the payment due in its balance month (the loan page's own convention); skip = payments before the window
function principal12(bal0, rate, pi, months, skip = 0) { let b = bal0; const i = rate / 100 / 12; let p = 0; for (let s = 0; s < skip; s++) b -= pi - Math.round(b * i); for (let k = 0; k < months; k++) { const int = Math.round(b * i); const pr = Math.min(b, pi - int); p += pr; b -= pr; } return p; }
test('balance sheet: Current portion of mortgage from the loan schedule; long-term shows the rest; totals unchanged; no entries made', async () => {
  const ps = (await call('m/properties', { name: '12 Test Lane', address: '12 Test Lane', city: 'Trenton', state: 'NJ', zip: '08618', type: 'Single-Family', units: 1 }, 'POST', tok)); assert.ok(ps.status === 200, ps.text); pid = ps.json.id;
  const ps2 = (await call('m/properties', { name: '14 Test Lane', address: '14 Test Lane', city: 'Trenton', state: 'NJ', zip: '08618', type: 'Single-Family', units: 1 }, 'POST', tok)); pid2 = ps2.json.id;
  if (!ch.banks.length) { const nb = await call('m/bank-accounts', { name: 'Operating', institution: 'Test Bank', last4: '1234', kind: 'bank' }, 'POST', tok); assert.equal(nb.status, 200, nb.text); ch = (await call('m/chart', null, 'GET', tok)).json; }
  bank = ch.banks[0]; assert.ok(bank, 'has a bank');
  // the loan on the books: Dr house cost / Cr Mortgage Payable 200,000.00
  const pc = byName('Property Cost');
  const je = await call('m/x39/je', { date: '2026-09-01', memo: 'Purchase 12 Test Lane', lines: [{ account_id: pc.id, property_id: pid, debit: 25000000, credit: 0 }, { account_id: mort.id, property_id: pid, debit: 0, credit: 20000000 }, { account_id: bank.account_id, property_id: pid, debit: 0, credit: 5000000 }] }, 'POST', tok); assert.equal(je.status, 200, je.text);
  const ln = await call('m/loans/add', { lender: 'Test Lender', balance: '200000.00', rate: 7.5, pi: '1398.43', escrow: '300.00', due_day: 1, houses: [{ property_id: pid }], repeat: false }, 'POST', tok); assert.equal(ln.status, 200, ln.text);
  const ln2 = await call('m/loans/add', { lender: 'No Rate Bank', balance: '50000.00', pi: '500.00', due_day: 1, houses: [{ property_id: pid2 }], repeat: false }, 'POST', tok); assert.equal(ln2.status, 200, ln2.text);
  const nJ = sq.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%journal'").all().map(r => r.name);
  const cnt = () => nJ.reduce((s, t) => s + sq.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n, 0); const before = cnt();
  const tb0 = (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals;
  const bs = (await call('m/reports/balance-sheet?to=2026-10-21', null, 'GET', tok)).json; assert.ok(bs.rows, JSON.stringify(bs).slice(0, 300));
  const row = n => bs.rows.find(r => r.account === n);
  const want = principal12(20000000, 7.5, 139843, 12, 1); // balance month Oct; report date Oct 21 is past the 1st, so the window is the Nov..Oct payments
  assert.equal(bs.current_portion.total, want); assert.equal(row('Current portion of mortgage').amount, want);
  assert.equal(row('Total liabilities').amount, row('Total current liabilities').amount + row('Total long-term liabilities').amount);
  const lt = bs.rows.find(r => /Mortgage Payable \(less current portion\)/.test(r.account)); assert.ok(lt, 'long-term mortgage line'); assert.equal(lt.amount, 20000000 - want);
  assert.equal(row('Total liabilities').amount, 20000000, 'total liabilities = the books');
  assert.equal(row('TOTAL ASSETS').amount, row('TOTAL LIABILITIES & EQUITY').amount);
  assert.ok(bs.rows.some(r => r._note && /No payment schedule/.test(r.account) && /No Rate Bank/.test(r.account)), 'no-schedule loan noted');
  assert.ok(bs.rows.some(r => r._note && /no entries are made/i.test(r.account)));
  assert.equal(cnt(), before, 'no journal entries'); assert.deepEqual((await call('m/reports/trial-balance', null, 'GET', tok)).json.totals, tb0);
  // as of a date before the loan was booked: nothing moves
  const bs0 = (await call('m/reports/balance-sheet?to=2026-08-15', null, 'GET', tok)).json; assert.ok(!bs0.rows.some(r => r.account === 'Current portion of mortgage'));
  // mortgage moved to Current by him: no split, all current
  await call('m/x51/term', { account_id: mort.id, term: 'current' }, 'POST', tok);
  const bs2 = (await call('m/reports/balance-sheet?to=2026-10-21', null, 'GET', tok)).json; assert.ok(!bs2.rows.some(r => r.account === 'Current portion of mortgage')); assert.equal(bs2.rows.find(r => r.account === 'Total liabilities').amount, 20000000);
  await call('m/x51/term', { account_id: mort.id, term: 'long' }, 'POST', tok);
});
test('rows import (Excel / PDF statement): lines added, re-import skipped as duplicates, bad rows ignored', async () => {
  const rows = [{ date: '2026-10-02', amount: -84500, description: 'TRENTON WATER' }, { date: '10/05/2026', amount: 125000, description: 'RENT 12 TEST LANE' }, { date: 'x', amount: 5 }, { date: '2026-10-06', amount: 0 }];
  const r = await call(`m/x51/bank/${bank.id}/rows`, { rows, format: 'PDF statement', filename: 's.pdf' }, 'POST', tok); assert.equal(r.status, 200, r.text);
  assert.equal(r.json.added, 2); assert.equal(r.json.found, 2); assert.equal(r.json.format, 'PDF statement');
  const r2 = await call(`m/x51/bank/${bank.id}/rows`, { rows, format: 'Excel' }, 'POST', tok); assert.equal(r2.json.added, 0); assert.equal(r2.json.duplicates, 2);
  assert.equal((await call(`m/x51/bank/${bank.id}/rows`, { rows: [] }, 'POST', tok)).status, 400);
  assert.equal((await call(`m/x51/bank/999999/rows`, { rows }, 'POST', tok)).status, 404);
  const l = (await call(`m/bank/${bank.id}?status=all`, null, 'GET', tok)).json; assert.ok(l.txns.some(t => t.description === 'RENT 12 TEST LANE' && t.amount === 125000));
});
test('bank import UI wiring present: PDF / Excel accepted, scan message, reconcile prefill; GL By date has Debit / Credit and Total paid', () => {
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  assert.ok(app.includes('importSheet = importSheet51') && app.indexOf('importSheet = importSheet51') < app.lastIndexOf('render();'));
  assert.ok(/\.xlsx,\.xls,\.pdf/.test(app) && app.includes("can't be read") && app.includes('S.pre51'));
  assert.ok(app.includes("col12('debit', 'Debit', 'money'), col12('credit', 'Credit', 'money')") && app.includes("date: 'Total paid'"));
  assert.ok(fs.existsSync(path.join(SITE, 'vendor', 'xlsx.full.min.js')) && fs.existsSync(path.join(SITE, 'bank-statement.js')));
});
