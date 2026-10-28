import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'), app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
const fn = (s, name) => { const a = s.indexOf('async function ' + name + '(') >= 0 ? s.indexOf('async function ' + name + '(') : s.indexOf('function ' + name + '('); return s.slice(a, s.indexOf('\n}\n', a) + 2); };
const line = (s, start) => { const a = s.indexOf(start); return s.slice(a, s.indexOf('\n', a)); };
const daysBetween53 = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);
const NAMEWORDS53 = new Set(['zelle', 'from', 'to', 'payment', 'deposit', 'online', 'transfer', 'ach', 'check', 'chk']);
const fmtD37 = s => s; const usd39 = c => '$' + (c / 100).toFixed(2);
const pre = [line(wk, 'const W8 = '), line(wk, 'const JT8 = '), line(wk, 'function lab8('), line(wk, 'async function taken8('), fn(wk, 'cand8'), wk.slice(wk.indexOf('function s8('), wk.indexOf('\n{ const _cs8'))].join('\n');
const mk = new Function('NAMEWORDS53', 'daysBetween53', 'fmtD37', 'usd39', 'sug7', pre + '; return { cand8, s8, lab8 };');
const fakeD = ({ matched = [], journal = [], bills = [] }) => ({ all: async (sql) => /FROM bank_txns WHERE status='matched'/.test(sql) ? matched : /FROM bills/.test(sql) ? bills : /FROM journal j/.test(sql) ? journal : [] });
const T = (id, amount, date, description, bank = 2) => ({ id, amount, date, description, bank_account_id: bank, status: 'unmatched' });
const J = (id, bank_amount, date, x = {}) => ({ id, bank_amount, date, bank_account_id: 2, kind: 'expense', jtype: 'Expense', ref: '', payee: '', memo: '', ...x });


// r9 (owner, Oct 27 6:15–6:39 PM): Exact group + Accept all exact; equal candidates → pick one; Reconcile statement; Cleared view; Deposit these chip
test('r9: the only candidate, same amount, within 3 days, nobody else wants it = Exact', async () => {
  const { cand8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ journal: [J(7, -15000, '2026-10-09', { payee: 'Hardware Co' })] }), [T(1, -15000, '2026-10-10', 'HARDWARE CO')]);
  assert.equal(o[1].conf, 'high'); assert.equal(o[1].exact9, true); assert.ok(!o[1].multi9);
  const far = await cand8(fakeD({ journal: [J(7, -15000, '2026-10-03', { payee: 'Hardware Co' })] }), [T(1, -15000, '2026-10-10', 'HARDWARE CO')]);
  assert.equal(far[1].exact9, false); // 7 days apart: Confident at most, never Exact
});
test('r9: two $500 the same day with nothing in the name = pick one, never Exact or Confident', async () => {
  const { cand8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ journal: [J(7, 50000, '2026-10-10', { kind: 'gl', jtype: 'Deposit' }), J(8, 50000, '2026-10-10', { kind: 'gl', jtype: 'Deposit' })] }), [T(1, 50000, '2026-10-10', 'MOBILE DEPOSIT')]);
  assert.notEqual(o[1].conf, 'high'); assert.equal(o[1].exact9, false); assert.equal(o[1].multi9.length, 2);
  const two = await cand8(fakeD({ journal: [J(7, 50000, '2026-10-10', { kind: 'gl', jtype: 'Deposit' }), J(8, 50000, '2026-10-10', { kind: 'gl', jtype: 'Deposit' })] }), [T(1, 50000, '2026-10-10', 'DEP A'), T(2, 50000, '2026-10-10', 'DEP B')]);
  for (const k of [1, 2]) { assert.notEqual(two[k].conf, 'high'); assert.equal(two[k].exact9, false); }
});
test('r9: a name that tells two equal entries apart still gives a Confident match', async () => {
  const { cand8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ journal: [J(7, 50000, '2026-10-10', { payee: 'Gina Torres' }), J(8, 50000, '2026-10-10', { payee: 'Mark Lee' })] }), [T(1, 50000, '2026-10-10', 'ZELLE FROM GINA TORRES')]);
  assert.equal(o[1].top.id, 7); assert.ok(!o[1].multi9); assert.equal(o[1].exact9, false); // two candidates: not Exact
});
test('r9: server — Exact filter/count, Accept all exact with 10-minute batch undo, untouched pick-one refused', () => {
  assert.match(wk, /const counts = \{ all: 0, exact: 0, high: 0/);
  assert.match(wk, /const cf = o\.exact9 \? 'exact' : \(o\.conf \|\| 'none'\)/);
  assert.match(wk, /const EX9MS = 10 \* 60 \* 1000;/);
  assert.match(wk, /possible matches in your books: pick one/);
  assert.match(fn(wk, 'exact9undo'), /t\.how !== 'auto'/); assert.match(fn(wk, 'exact9undo'), /undoDeposit37\(d, user/);
  assert.match(wk, /p === 'exact9' && M === 'POST'/);
});
test('r9: server — Reconcile statement saves only at difference 0, stores bank/date/balance/user/time, only the latest undoes', () => {
  const p = fn(wk, 'rec9post'); assert.match(p, /need\(diff === 0, `Not balanced yet/); assert.match(p, /date, ending, starting: start, cleared: sum, entries: ids\.length, at: nowISO\(\), by:/);
  assert.match(p, /'rcl71_' \+ bid/); assert.match(p, /Enter the beginning balance from the statement/);
  const u = fn(wk, 'rec9undo'); assert.match(u, /Only the latest reconciliation can be undone/); assert.match(u, /C\.recs\.slice\(0, -1\)/);
  const c = fn(wk, 'rec9ctx'); assert.match(c, /last \? last\.ending : \(b\.opening_balance/);
});
test('r9: app — Exact chip after All, Accept all exact, pick one, Reconcile statement page, Cleared chip, Deposit these chip', () => {
  assert.match(app, /const o = \{ all: 'All', exact: 'Exact', high: 'Sure'/); assert.match(app, /CONFL80\.exact = 'Exact'/);
  assert.match(app, /Accept all exact \(\$\{n\}\)/); assert.match(app, /Undo this batch/); assert.match(app, /possible matches — pick one/);
  assert.match(app, /MV\.rec9 = async/); assert.match(app, /Cleared balance <b>/); assert.match(app, /Difference must be \$0\.00/);
  assert.match(app, /firstChild\.textContent = 'Cleared '/);
  assert.match(app, /<u>Deposit<span class="r10s"> these<\/span><\/u>/); assert.match(app, /go\('bdeposit\/new\?bank=' \+ bid\)/);
  assert.ok(!/· <u>view<\/u><\/span><\/button><\/div>`\);\n    \$\('#ud7'/.test(app));
});
