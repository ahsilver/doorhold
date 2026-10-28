
// node --test test/deposits37.test.mjs — bank deposits (v37): payment -> Undeposited Funds -> deposit -> one bank line; guards
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker37.mjs');
const worker = (await import('/tmp/pm-test-worker37.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') } };
let token = '';
const call = async (p, body, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined }), env, {}); return { status: r.status, json: await r.json() }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
const tb = async () => { const t = (await call('m/reports/trial-balance')).json.totals; assert.equal(t.debit, t.credit, 'trial balance balanced'); return t; };
let L, cashId, achId, depId, bank, today;
test('sign in + pick a lease', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); token = r.json.token;
  await call('m/x37/housebanks');
  L = sq.prepare(`SELECT l.id, u.property_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.status='active' ORDER BY l.id LIMIT 1`).get(); assert.ok(L);
  bank = sq.prepare(`SELECT id, account_id FROM bank_accounts WHERE kind='bank' ORDER BY id LIMIT 1`).get(); assert.ok(bank);
  today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()); await tb();
});
test('payment -> Undeposited Funds -> deposit -> one bank line', { skip: !PW }, async () => {
  const hb = (await call('m/x37/housebanks')).json; assert.ok(hb.house_banks[L.property_id], 'house has an operating bank entry');
  const before = (await call('m/x37/undeposited?summary=1')).json;
  const p1 = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '321.00', date: today, method: 'Cash', deposit_to: 'undeposited' }); assert.equal(p1.status, 200); assert.equal(p1.json.undeposited, true); cashId = p1.json.id;
  const p2 = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '45.00', date: today, method: 'ACH', deposit_to: String(bank.id) }); assert.equal(p2.json.undeposited, false); achId = p2.json.id;
  assert.equal(sq.prepare('SELECT bank_account_id FROM journal WHERE id=?').get(achId).bank_account_id, bank.id);
  const u = (await call('m/x37/undeposited')).json; assert.equal(u.n, before.n + 1); assert.ok(u.items.some(i => i.id === cashId && i.amount === 32100));
  const inc = u.accounts.find(a => a.type === 'income');
  const d = await call('m/x37/deposit', { bank_account_id: bank.id, date: today, memo: 'slip 1', journal_ids: [cashId], others: [{ account_id: inc.id, property_id: L.property_id, amount: '10.50', memo: 'Laundry', from: 'Coin box' }] });
  assert.equal(d.status, 200, JSON.stringify(d.json)); depId = d.json.id; assert.equal(d.json.total, 33150); assert.equal(d.json.payments.length, 1); assert.equal(d.json.others.length, 1);
  const j = sq.prepare('SELECT * FROM journal WHERE id=?').get(depId); assert.equal(j.bank_account_id, bank.id); assert.equal(j.bank_amount, 33150); assert.equal(j.jtype, 'Deposit');
  const bl = sq.prepare(`SELECT SUM(debit-credit) v FROM jlines WHERE journal_id=? AND account_id=?`).get(depId, bank.account_id).v; assert.equal(bl, 33150, 'one bank line for the whole deposit');
  const uf = sq.prepare(`SELECT id FROM gl_accounts WHERE code='1100'`).get().id; assert.equal(sq.prepare(`SELECT SUM(credit-debit) v FROM jlines WHERE journal_id=? AND account_id=?`).get(depId, uf).v, 32100, 'Undeposited Funds credited');
  assert.equal(sq.prepare('SELECT deposit_id FROM journal WHERE id=?').get(cashId).deposit_id, depId);
  assert.equal((await call('m/x37/undeposited?summary=1')).json.n, before.n); await tb();
});
test('a payment in a deposit cannot be voided or have its amount changed', { skip: !PW }, async () => {
  for (const p of [`m/entry/${cashId}/void`, `m/journal/${cashId}/void`]) { const r = await call(p, {}); assert.equal(r.status, 409); assert.match(r.json.error, new RegExp(`This payment is in deposit #${depId} on .+\\. Undo the deposit first\\.`)); }
  const lines = sq.prepare(`SELECT account_id, debit, credit, basis FROM jlines WHERE journal_id=?`).all(cashId).map(l => ({ ...l, debit: l.debit ? l.debit - 100 : 0, credit: l.credit ? l.credit - 100 : 0 }));
  const e = await call(`m/entry/${cashId}/save`, { lines }); assert.equal(e.status, 409); assert.match(e.json.error, /Undo the deposit first/);
  const m = await call(`m/entry/${cashId}/save`, { memo: 'cash at office' }); assert.equal(m.status, 200, 'memo edits still allowed');
});
test('a matched deposit cannot be undone until it is unmatched', { skip: !PW }, async () => {
  sq.prepare(`INSERT INTO bank_txns(bank_account_id, date, description, amount, status, created) VALUES(?,?,?,?,?,?)`).run(bank.id, today, 'COUNTER DEPOSIT', 33150, 'unmatched', 't');
  const tid = Number(sq.prepare('SELECT MAX(id) n FROM bank_txns').get().n);
  const mt = await call(`m/x24/match/${bank.id}`, { txn_ids: [tid], entry_ids: [depId] }); assert.equal(mt.status, 200, JSON.stringify(mt.json));
  for (const p of [`m/x37/deposit/${depId}/undo`, `m/entry/${depId}/void`]) { const r = await call(p, {}); assert.equal(r.status, 409); assert.ok(['This deposit is matched in reconciliation. Unmatch it first.', 'This transaction is matched to a bank line. Unmatch it first to edit.'].includes(r.json.error), r.json.error); /* d71: entry screens use the owner's lock wording */ }
  const ed = await call(`m/x37/deposit/${depId}`, { bank_account_id: bank.id, date: today, journal_ids: [] , others: [{ account_id: sq.prepare(`SELECT id FROM gl_accounts WHERE code='4000'`).get().id, amount: '1' }] }); assert.equal(ed.status, 409);
  assert.equal((await call(`m/x24/unmatch/${bank.id}`, { txn_id: tid })).status, 200);
  const u = await call(`m/x37/deposit/${depId}/undo`, {}); assert.equal(u.status, 200); assert.equal(u.json.returned, 1);
  assert.equal(sq.prepare('SELECT void FROM journal WHERE id=?').get(depId).void, 1);
  assert.ok((await call('m/x37/undeposited')).json.items.some(i => i.id === cashId), 'payment is back in Undeposited Funds');
  assert.equal((await call(`m/entry/${cashId}/void`, {})).status, 200, 'now the payment can be voided'); await tb();
});
test('a matched payment cannot be voided until it is unmatched', { skip: !PW }, async () => {
  sq.prepare(`INSERT INTO bank_txns(bank_account_id, date, description, amount, status, created) VALUES(?,?,?,?,?,?)`).run(bank.id, today, 'ACH CREDIT', 4500, 'unmatched', 't');
  const tid = Number(sq.prepare('SELECT MAX(id) n FROM bank_txns').get().n);
  assert.equal((await call(`m/x24/match/${bank.id}`, { txn_ids: [tid], entry_ids: [achId] })).status, 200);
  const r = await call(`m/entry/${achId}/void`, {}); assert.equal(r.status, 409); assert.equal(r.json.error, 'This transaction is matched to a bank line. Unmatch it first to edit.'); /* d71: owner's lock wording (was: This payment is matched in reconciliation. Unmatch it first.) */
  assert.equal((await call(`m/x24/unmatch/${bank.id}`, { txn_id: tid })).status, 200);
  assert.equal((await call(`m/entry/${achId}/void`, {})).status, 200); await tb();
});
test('edit a deposit: add / remove payments, then the house bank setting', { skip: !PW }, async () => {
  const p = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '100', date: today, method: 'Check', deposit_to: 'undeposited' });
  const q = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '200', date: today, method: 'Money order', deposit_to: 'undeposited' });
  const d = await call('m/x37/deposit', { bank_account_id: bank.id, date: today, journal_ids: [p.json.id] }); assert.equal(d.json.total, 10000);
  const e = await call(`m/x37/deposit/${d.json.id}`, { bank_account_id: bank.id, date: today, journal_ids: [q.json.id], others: [] }); assert.equal(e.status, 200); assert.equal(e.json.total, 20000); assert.equal(e.json.id, d.json.id);
  assert.equal(sq.prepare('SELECT deposit_id FROM journal WHERE id=?').get(p.json.id).deposit_id, null); assert.equal(sq.prepare('SELECT deposit_id FROM journal WHERE id=?').get(q.json.id).deposit_id, d.json.id);
  const hs = await call(`m/x37/housebank/${L.property_id}`, { bank_account_id: bank.id }); assert.equal(hs.json.house_bank.source, 'setting'); await tb();
});
