import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
const a = app.indexOf('// ===== r12:'), b = app.indexOf('async function orig12(');
const blk = app.slice(a, b);
const mk = () => new Function('esc', 'money', '$', '$$', blk + '; return { R12, grp12, tl12, nm12, list12, row12, md12 };')(s => String(s), c => '$' + (c / 100).toFixed(2), () => null, () => []);
const rows = [
  { id: 1, date: '2026-10-20', payee: 'Card payment', memo: 'Card payment', house: '', type: 'Card payment', ref: '', amount: -300000, balance: 100 },
  { id: 2, date: '2026-10-16', payee: 'Nora Wells', memo: 'Payment - Zelle', house: '198 Meadow Street', type: 'payment', amount: 50000, balance: 200 },
  { id: 3, date: '2026-09-04', payee: 'Shellpoint', memo: '', house: '212 Forest', type: 'Check', ref: '1042', amount: -161774, balance: 300 },
  { id: 4, date: '2026-08-01', payee: '', memo: 'fix', house: '', type: 'Gen Journal', amount: 1000, balance: 400 },
  { id: 5, date: '2026-07-01', payee: 'To savings', memo: '', house: '', type: 'Transfer', amount: -5000, balance: 500 },
  { id: 6, date: '2026-06-01', payee: '', memo: '', house: '', type: 'Deposit', amount: 275000, balance: 600 }];
test('r12 groups: bank types land in deposits / checks / withdrawals / transfers / journal', () => {
  const { grp12 } = mk();
  assert.deepEqual(rows.map(e => grp12(e, false)), ['wd', 'dep', 'chk', 'je', 'xfer', 'dep']);
  assert.equal(grp12({ type: 'Credit Card Purchase', amount: -100 }, true), 'chg'); assert.equal(grp12({ type: 'Credit Card Balance Payment', amount: 100 }, true), 'pay');
});
test('r12 list: search by amount, name, memo; type and date filters', () => {
  const m = mk(); m.R12.x = { account: { kind: 'bank' }, rows };
  const ids = () => m.list12().map(e => e.id);
  m.R12.f = { q: '', g: 'all', d1: '', d2: '' }; assert.equal(ids().length, 6);
  m.R12.f.q = '1,617.74'; assert.deepEqual(ids(), [3]);
  m.R12.f.q = 'zelle'; assert.deepEqual(ids(), [2]);
  m.R12.f.q = 'meadow'; assert.deepEqual(ids(), [2]);
  m.R12.f.q = '1042'; assert.deepEqual(ids(), [3]);
  m.R12.f = { q: '', g: 'dep', d1: '', d2: '' }; assert.deepEqual(ids(), [2, 6]);
  m.R12.f = { q: '', g: 'all', d1: '2026-08-01', d2: '2026-09-30' }; assert.deepEqual(ids(), [3, 4]);
});
test('r12 rows: no data-jid (so the old entry sheet does not hijack the tap), card shows owed', () => {
  const m = mk(); m.R12.x = { account: { kind: 'card' }, rows };
  const h = m.row12({ id: 9, date: '2026-10-13', payee: 'BHL', type: 'Credit Card Purchase', amount: -200000, balance: -2053941 }, true);
  assert.ok(!/data-jid/.test(h)); assert.ok(/data-a12="9"/.test(h)); assert.ok(h.includes('$2000.00')); assert.ok(h.includes('$20539.41'));
  assert.equal(m.md12('2026-10-03'), '10/3/26'); assert.equal(m.tl12({ type: 'Gen Journal' }), 'Journal entry');
});
test('r12 wiring: account page replaces the register, reconcile tab kept, Banking opens #/banks, rows one line', () => {
  assert.ok(app.includes("if (!bid || tab === 'rec' || tab === 'old') return _bk12(root, r)"));
  assert.ok(app.includes('href="#/catchup/${bid}"'));
  assert.ok(app.includes("closest('[data-fly33=\"bank\"]')") && app.includes("location.replace('#/banks')"));
  assert.ok(app.includes('#/bdeposit/new?bank=${bid}') && app.includes('#/writecheck?bank=${bid}&amp;rec=1') && app.includes('#/checkstation?bank=${bid}'));
  assert.ok(app.indexOf('// ===== r12:') < app.indexOf('// ===== d79'));
  assert.ok(/\.ba29 \.bx29\.bx12\{display:grid!important;grid-template-columns:108px 78px 88px 80px/.test(css));
  assert.ok(/\.a12dt input\{font-size:16px/.test(css) && /\.a12q input\{font-size:16px\}/.test(css));
});
