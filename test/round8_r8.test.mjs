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

test('r8: a bank line with nothing in the books has no candidate (Not in books), never Confident', async () => {
  const { cand8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ journal: [J(9, -4217, '2026-09-01')] }), [T(1, -4217, '2026-10-10', 'OHIO MUTUAL INSURANCE')]);
  assert.equal(o[1].cs.length, 0); assert.equal(o[1].conf, null);
});
test('r8: same amount + name + close date in the books = Confident, with the entry shown', async () => {
  const { cand8, s8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ journal: [J(7, -4217, '2026-10-08', { kind: 'check', jtype: 'Check', ref: '123', payee: 'Ohio Mutual', property: '14 Maple' })] }), [T(1, -4217, '2026-10-10', 'OHIO MUTUAL INS')]);
  assert.equal(o[1].conf, 'high'); const s = s8(o[1].top, o[1].why); assert.equal(s.type, 'match'); assert.equal(s.journal_id, 7);
  assert.match(s.m81, /^Check #123 · 2026-10-08 · \$42\.17 · 14 Maple$/);
});
test('r8: an entry already linked to another bank line is never a candidate; 11+ days apart is not either', async () => {
  const { cand8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ matched: [{ journal_id: 7, how: 'manual' }, { journal_id: 3, how: 'split:8' }], journal: [J(7, -500, '2026-10-10'), J(8, -500, '2026-10-10'), J(5, -500, '2026-09-20')] }), [T(1, -500, '2026-10-10', 'X')]);
  assert.equal(o[1].cs.length, 0);
});
test('r8: two lines and one entry with the same amount: only one gets it as its top match; several same-amount entries are not Confident', async () => {
  const { cand8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, async () => null);
  const o = await cand8(fakeD({ journal: [J(7, -1000, '2026-10-10')] }), [T(1, -1000, '2026-10-10', 'A'), T(2, -1000, '2026-10-12', 'B')]);
  assert.equal(o[1].top.id, 7); assert.equal(o[2].conf, 'low');
  const p = await cand8(fakeD({ journal: [J(7, -1000, '2026-10-10'), J(8, -1000, '2026-10-11')] }), [T(1, -1000, '2026-10-10', 'A')]);
  assert.notEqual(p[1].conf, 'high');
});
test('r8: one undeposited payment with the payer name = Confident (Already received)', async () => {
  const sug7 = async () => ({ rows: { 1: { ids: [41], total: 44000 } }, items: [{ id: 41, date: '2026-10-05', amount: 44000, from: 'Nora Smith', property: '233 Orchard' }] });
  const { cand8, s8 } = mk(NAMEWORDS53, daysBetween53, fmtD37, usd39, sug7);
  const o = await cand8(fakeD({}), [T(1, 44000, '2026-10-06', 'ZELLE FROM NORA SMITH')]);
  assert.equal(o[1].conf, 'high'); const s = s8(o[1].top, o[1].why); assert.equal(s.type, 'undep'); assert.deepEqual(s.journal_ids, [41]);
});
test('r8: server Post refuses a not-in-books line without his choice; manual multi match checks the total and links', () => {
  assert.match(wk, /throw new HttpError\('Not in your books yet: choose Record new, Match, or Ignore'\)/);
  const m = fn(wk, 'match8'); assert.match(m, /need\(sum === t\.amount/); assert.match(m, /already matched to another bank line/); assert.match(m, /matchPost24\(d, t\.bank_account_id/);
  assert.match(wk, /parts\[1\] === 'match8' && req\.method === 'POST'/);
});
test('r8: filter order All · Confident · Probably · Not sure · Not in books; Match (n) or "No match in books" + Search books', () => {
  assert.match(app, /const o = \{ all: 'All', exact: 'Exact', high: 'Sure', medium: 'Likely', low: 'Guess', none: 'Needs you' \}/);
  assert.match(app, /CONFL80\.all = 'All'; CONFL80\.none = 'Not in books'/);
  assert.match(app, /Match \(\$\{n\}\)/); assert.match(app, /No match in books<\/span><button type="button" class="lnk8/); assert.match(app, />Search books</);
  assert.match(app, /Suggest: \$\{esc\(what\)\}/);
});
