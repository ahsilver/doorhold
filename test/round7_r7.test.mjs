import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'), app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
const fn = (s, name) => { const a = s.indexOf('function ' + name + '('); return s.slice(a, s.indexOf('\n}\n', a) + 2); };
const A = { 1: { name: 'Undeposited Funds', type: 'asset' }, 2: { name: 'Rent Income', type: 'income' }, 3: { name: 'Loan from ISSIAK', type: 'liability' }, 4: { name: 'Owner Contribution', type: 'equity' }, 5: { name: 'Other Income', type: 'income' }, 6: { name: 'Repairs', type: 'expense' }, 7: { name: 'Earnest Money Deposit', type: 'asset' } };
const acc = id => A[id] || null;
const rule = new Function(fn(wk, 'postRule6') + '; return postRule6;')();

test('r7: postRule6 is the same text in the server and the app', () => { assert.equal(fn(wk, 'postRule6'), fn(app, 'postRule6')); });

test('r7: each deposit kind is accepted only with its required fields', () => {
  const ok = { type: 'income', k7: 'loan', account_id: 3, property_id: 9, memo: 'Loan received' };
  assert.equal(rule(ok, acc), '');
  assert.match(rule({ ...ok, account_id: 5 }, acc), /lender/i); // loan must be a liability
  assert.match(rule({ ...ok, property_id: '' }, acc), /property/i);
  assert.equal(rule({ ...ok, property_id: '', company_wide: 1 }, acc), '');
  assert.match(rule({ ...ok, memo: '  ' }, acc), /memo/i);
  assert.match(rule({ ...ok, account_id: 1 }, acc), /can’t take a bank line/); // never Undeposited Funds
  assert.equal(rule({ type: 'owner', k7: 'owner', account_id: 4, property_id: 'co', memo: 'Owner contribution' }, acc), '');
  assert.match(rule({ type: 'owner', k7: 'owner', account_id: 4, memo: 'x' }, acc), /property/i); // r7: owner contribution now needs property / Whole company too
  assert.match(rule({ type: 'owner', k7: 'owner', account_id: 3, property_id: 9, memo: 'x' }, acc), /equity/i);
  assert.match(rule({ type: 'income', k7: 'owner', account_id: 4, property_id: 9, memo: 'x' }, acc), /Choose what/);
  assert.equal(rule({ type: 'income', k7: 'sale', account_id: 7, property_id: 9, memo: 'Closing' }, acc), '');
  assert.match(rule({ type: 'income', k7: 'sale', account_id: 6, property_id: 9, memo: 'Closing' }, acc), /sale/i);
  assert.equal(rule({ type: 'income', k7: 'refund', account_id: 6, property_id: 9, memo: 'Refund' }, acc), '');
  assert.equal(rule({ type: 'income', k7: 'other', account_id: 6, property_id: 9, memo: 'x' }, acc), '');
  assert.match(rule({ type: 'income', k7: 'other', account_id: 2, property_id: 9, memo: 'x' }, acc), /tenant/i); // rent still needs the tenant
  assert.match(rule({ type: 'income', k7: 'bogus', account_id: 5, property_id: 9, memo: 'x' }, acc), /Choose what/);
  // round-6 rule intact
  assert.match(rule({ type: 'income', account_id: 1, property_id: 9 }, acc), /can’t take a bank line/);
  assert.match(rule({ type: 'income', account_id: 5 }, acc), /property/i);
  assert.match(rule({ type: 'payment' }, acc), /tenant/i);
  assert.match(rule({ type: 'unknown' }, acc), /Choose what/);
});

test('r7: combo7 finds 1–4 undeposited payments that add up exactly, this bank first', () => {
  const daysBetween53 = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);
  const combo7 = new Function('daysBetween53', fn(wk, 'combo7') + '; return combo7;')(daysBetween53);
  const P = [{ id: 1, uf: 220000, date: '2026-10-20', mine7: 1 }, { id: 2, uf: 220000, date: '2026-10-21', mine7: 1 }, { id: 3, uf: 150000, date: '2026-10-22', mine7: 0 }, { id: 4, uf: 50000, date: '2026-10-22', mine7: 1 }, { id: 5, uf: 9900, date: '2026-12-30', mine7: 1 }];
  assert.deepEqual(combo7(P, 220000, '2026-10-25').length, 1);
  assert.deepEqual(combo7(P, 440000, '2026-10-25').sort(), [1, 2]);
  assert.deepEqual(combo7(P, 640000, '2026-10-25').sort(), [1, 2, 3, 4]);
  assert.deepEqual(combo7(P, 9900, '2026-10-25'), []); // a payment dated after the bank line is never suggested
  assert.deepEqual(combo7(P, 123, '2026-10-25'), []);
});

test('r7: sug7 route, deposit kinds, Already received list, row suggestion and reconcile chip are wired', () => {
  assert.match(wk, /parts\[1\] === 'sug7' && req\.method === 'GET'/);
  assert.match(wk, /SELECT id, date, amount FROM bank_txns WHERE bank_account_id=\? AND status='unmatched' AND amount>0/);
  assert.match(wk, /combo7\(pool\.filter\(r => !used\.has\(r\.id\)\), t\.amount, t\.date\)/); // one payment, one suggested line
  for (const k of ['rent', 'deposit', 'undep', 'loan', 'owner', 'sale', 'refund', 'transfer', 'other']) assert.match(app, new RegExp(`\\['${k}', '`));
  assert.match(app, /Already received \(undeposited payments\)/);
  assert.match(app, /data-u7=/); assert.match(app, /data-sug7/); assert.match(app, /Use these/);
  assert.match(app, /Undeposited<span class="r10l"> for this bank<\/span> <b>/);
  assert.match(app, /Books \+ tenant ledger/); assert.match(app, /Bank register only/);
  // Already received posts through the deposit route (no new income, no tenant-ledger entry); the old Post path for undep is unchanged
  assert.match(app, /await api\('m\/x53\/deposit\/' \+ t\.id, \{ body: \{ journal_ids: eff80\(t\)\.journal_ids \} \}\)/);
  assert.match(app, /if \(e\.type === 'undep'\) return !!\(e\.journal_ids && e\.journal_ids\.length && e\.und_sum === t\.amount\)/);
});

test('r7: gw4apply maps each kind to a type and a default account', () => {
  const src = ['const K7 = ', 'const K7M = ', 'const K7T = ', 'const BAD7 = '].map(p => { const a = app.indexOf(p); return app.slice(a, app.indexOf('\n', a)); }).join('\n');
  const f = new Function(src + '\n' + fn(app, 'gw4acc') + fn(app, 'gw4apply') + '; return { gw4apply, gw4acc };')();
  const L = { accAll: Object.entries(A).map(([id, a]) => ({ id: +id, ...a })), leases: [] }; L.accts = L.accAll;
  let g = f.gw4apply({}, { g4k: 'loan' }, L); assert.equal(g.type, 'income'); assert.equal(g.k7, 'loan'); assert.equal(g.account_id, 3); assert.equal(g.memo, 'Loan received');
  g = f.gw4apply({}, { g4k: 'owner' }, L); assert.equal(g.type, 'owner'); assert.equal(g.account_id, 4);
  g = f.gw4apply({}, { g4k: 'other' }, L); assert.equal(g.account_id, 5);
  g = f.gw4apply({}, { g4k: 'undep', journal_ids: [1, 2], und_sum: 5 }, L); assert.equal(g.type, 'undep'); assert.equal(g.k7, undefined);
  g = f.gw4apply(g, { g4k: 'rent', g4b: 'add', lease_id: 4 }, L); assert.equal(g.type, 'payment'); assert.equal(g.journal_ids, undefined);
  g = f.gw4apply({}, { g4k: 'rent' }, L); assert.equal(g.type, 'unknown');
});
