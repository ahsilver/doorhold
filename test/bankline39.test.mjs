
// node --test test/bankline39.test.mjs — v39: bank-line Add (transfer / bill payment / expense) matched in one step; general journal entry balanced; Deposit to on deductions
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker39.mjs');
const worker = (await import('/tmp/pm-test-worker39.mjs?' + Date.now())).default;
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

let bank, bank2, card, T, exp, pid, L;
const line = (bid, amount, desc) => Number(sq.prepare(`INSERT INTO bank_txns(bank_account_id,date,description,amount,status,source) VALUES(?,?,?,?, 'unmatched','test')`).run(bid, T, desc, amount).lastInsertRowid);
const bt = id => sq.prepare('SELECT status, journal_id, how FROM bank_txns WHERE id=?').get(id);
const onGl = (jid, bid) => sq.prepare(`SELECT COALESCE(SUM(jl.debit-jl.credit),0) v FROM jlines jl WHERE jl.journal_id=? AND jl.basis IN ('b','c') AND jl.account_id=(SELECT account_id FROM bank_accounts WHERE id=?)`).get(jid, bid).v;
test('sign in + accounts', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); token = r.json.token;
  const ch = (await call('m/chart')).json; T = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const c = await call('m/cards', { name: 'Test card 39', institution: 'Amex', last4: '3939' }); assert.equal(c.status, 200, JSON.stringify(c.json));
  const s2 = await call('m/bank-accounts', { name: 'Savings 39', institution: 'Test Bank', last4: '3940' }); assert.equal(s2.status, 200, JSON.stringify(s2.json));
  const ch2 = (await call('m/chart')).json; bank = ch2.banks.find(b => b.id === 1); bank2 = ch2.banks.find(b => b.id === s2.json.id); card = ch2.banks.find(b => b.id === c.json.id);
  assert.ok(bank && bank2 && card, 'two banks and a card'); exp = ch.accounts.find(a => a.type === 'expense');
  L = sq.prepare(`SELECT l.id, u.property_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.status='active' ORDER BY l.id LIMIT 1`).get(); pid = L.property_id; await tb();
});
test('transfer from a bank line posts balanced to both accounts and matches both lines', { skip: !PW }, async () => {
  const t1 = line(bank.id, -25000, 'Online transfer to SAV'), t2 = line(bank2.id, 25000, 'Online transfer from CHK');
  const lx = (await call('m/x39/line/' + t1)).json; assert.ok(lx.pairs.some(p => p.id === t2), 'other side offered');
  await tb();
  const r = await call('m/x39/add/' + t1, { kind: 'transfer', bank_account_id: bank.id, other_id: bank2.id, pair_id: t2 }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const j = r.json.journal_id; assert.equal(onGl(j, bank.id), -25000); assert.equal(onGl(j, bank2.id), 25000);
  const tot = sq.prepare(`SELECT SUM(debit) d, SUM(credit) c FROM jlines WHERE journal_id=?`).get(j); assert.equal(tot.d, tot.c, 'entry balanced');
  assert.equal(bt(t1).status, 'matched'); assert.equal(bt(t1).journal_id, j); assert.equal(bt(t2).status, 'matched'); assert.equal(bt(t2).journal_id, j);
  await tb();
  const m2 = (await call('m/x24/match/' + bank2.id)).json; const e = m2.books.find(z => z.id === j); assert.ok(e && e.amount === 25000 && e.txns.includes(t2), 'transfer shows on the receiving account, matched');
  // bank -> card payment, card side matched too
  const c1 = line(bank.id, -4000, 'CARD EPAY'), c2 = line(card.id, 4000, 'Payment thank you');
  const r2 = await call('m/x39/add/' + c2, { kind: 'transfer', bank_account_id: card.id, other_id: bank.id, pair_id: c1 }); assert.equal(r2.status, 200, JSON.stringify(r2.json));
  assert.equal(onGl(r2.json.journal_id, card.id), 4000); assert.equal(onGl(r2.json.journal_id, bank.id), -4000); assert.equal(bt(c1).status, 'matched');
  // a line can't be added twice
  const again = await call('m/x39/add/' + t1, { kind: 'transfer', bank_account_id: bank.id, other_id: bank2.id }); assert.equal(again.status, 400);
});
test('bill payment from a bank line lowers the open bill and matches the line', { skip: !PW }, async () => {
  const b = await call('m/bills', { vendor_name: 'Test Plumber V39', property_id: pid, account_id: exp.id, amount: '300.00', bill_date: T, memo: 'Fix leak', ref: 'INV-39' }); assert.equal(b.status, 200, JSON.stringify(b.json));
  const ob = (await call('m/x39/openbills')).json.bills; const bill = ob.find(z => z.ref === 'INV-39'); assert.ok(bill && bill.balance === 30000);
  const t = line(bank.id, -12000, 'CHECK 1001'); await tb();
  const wrong = await call('m/x39/add/' + t, { kind: 'billpay', bank_account_id: bank.id, bills: [{ id: bill.id, amount: 10000 }] }); assert.equal(wrong.status, 400, 'applied must equal the bank line');
  const r = await call('m/x39/add/' + t, { kind: 'billpay', bank_account_id: bank.id, paid_by: 'check', check_no: '1001', bills: [{ id: bill.id, amount: 12000 }] }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const after = (await call('m/x39/openbills')).json.bills.find(z => z.id === bill.id); assert.equal(after.balance, 18000, 'open balance went down by the payment');
  assert.equal(sq.prepare('SELECT amount_paid FROM bills WHERE id=?').get(bill.id).amount_paid, 12000);
  const j = r.json.journal_ids[0]; assert.equal(bt(t).status, 'matched'); assert.equal(bt(t).journal_id, j); assert.equal(onGl(j, bank.id), -12000);
  assert.match(sq.prepare('SELECT jtype FROM journal WHERE id=?').get(j).jtype, /^Bill pa/, 'a bill payment, not a new expense');
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM journal WHERE kind='expense' AND date=? AND amount=12000`).get(T).n, 0, 'no expense entry made');
  await tb();
  // two bills on one card line
  const b2 = await call('m/bills', { vendor_name: 'Test Plumber V39', property_id: pid, account_id: exp.id, amount: '50.00', bill_date: T, memo: 'Parts', ref: 'INV-40' });
  const ob2 = (await call('m/x39/openbills')).json.bills; const x2 = ob2.find(z => z.ref === 'INV-40');
  const ct = line(card.id, -9000, 'HOME DEPOT');
  const r2 = await call('m/x39/add/' + ct, { kind: 'billpay', bank_account_id: card.id, bills: [{ id: bill.id, amount: 4000 }, { id: x2.id, amount: 5000 }] }); assert.equal(r2.status, 200, JSON.stringify(r2.json));
  assert.equal(r2.json.journal_ids.length, 2); assert.equal(bt(ct).how, 'split:' + r2.json.journal_ids[1]);
  assert.ok(!(await call('m/x39/openbills')).json.bills.some(z => z.id === x2.id), 'second bill paid in full');
});
test('purchase / check from a bank line is one expense, matched to that exact line', { skip: !PW }, async () => {
  const a = line(bank.id, -7777, 'HARDWARE STORE'), b = line(bank.id, -7777, 'HARDWARE STORE 2');
  const r = await call('m/x39/add/' + b, { kind: 'check', bank_account_id: bank.id, vendor_name: 'Hardware', account_id: exp.id, property_id: pid, check_no: '2002' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(bt(b).status, 'matched'); assert.equal(bt(a).status, 'unmatched', 'the other same-amount line is left alone');
  const j = sq.prepare('SELECT jtype, ref, bank_amount FROM journal WHERE id=?').get(r.json.journal_id); assert.equal(j.jtype, 'Check'); assert.equal(j.ref, '2002'); assert.equal(j.bank_amount, -7777);
  const cp = line(card.id, -1234, 'GAS STATION'); const r2 = await call('m/x39/add/' + cp, { kind: 'expense', bank_account_id: card.id, vendor_name: 'Gas', account_id: exp.id }); assert.equal(r2.status, 200); assert.equal(bt(cp).status, 'matched');
  const nope = await call('m/x39/add/' + a, { kind: 'expense', bank_account_id: card.id, account_id: exp.id }); assert.equal(nope.status, 400, 'line must be on that account');
  await tb();
});
test('general journal entry cannot be saved unbalanced; balanced one posts with a house per line', { skip: !PW }, async () => {
  const t0 = await tb();
  const bad = await call('m/x39/je', { date: T, memo: 'x', lines: [{ account_id: exp.id, property_id: pid, debit: 10000 }, { account_id: bank.account_id, credit: 9000 }] }); assert.equal(bad.status, 400); assert.match(bad.json.error, /must be equal/);
  const one = await call('m/x39/je', { date: T, memo: 'x', lines: [{ account_id: exp.id, debit: 10000 }] }); assert.equal(one.status, 400);
  const both = await call('m/x39/je', { date: T, memo: 'x', lines: [{ account_id: exp.id, debit: 100, credit: 100 }, { account_id: bank.account_id, credit: 100 }] }); assert.equal(both.status, 400);
  assert.deepEqual(await tb(), t0, 'nothing posted');
  const ok = await call('m/x39/je', { date: T, memo: 'Reclass', lines: [{ account_id: exp.id, property_id: pid, debit: 10000, memo: 'repair' }, { account_id: exp.id, property_id: null, debit: 2500 }, { account_id: bank.account_id, credit: 12500 }] }); assert.equal(ok.status, 200, JSON.stringify(ok.json));
  const ls = sq.prepare('SELECT account_id, property_id, debit, credit, memo FROM jlines WHERE journal_id=? ORDER BY id').all(ok.json.id); assert.equal(ls.length, 3); assert.equal(ls[0].property_id, pid); assert.equal(ls[0].memo, 'repair');
  const j = sq.prepare('SELECT kind, jtype, bank_account_id, bank_amount FROM journal WHERE id=?').get(ok.json.id); assert.equal(j.jtype, 'Gen Journal'); assert.equal(j.bank_account_id, bank.id); assert.equal(j.bank_amount, -12500);
  await tb();
});
test('standalone transfer matches the bank lines he ticked', { skip: !PW }, async () => {
  const f = line(bank.id, -3300, 'XFER OUT'), t = line(bank2.id, 3300, 'XFER IN');
  const p = (await call(`m/x39/pairs?from=${bank.id}&to=${bank2.id}&amount=33.00&date=${T}`)).json; assert.ok(p.from.some(z => z.id === f) && p.to.some(z => z.id === t));
  const r = await call('m/x39/transfer', { from_id: bank.id, to_id: bank2.id, amount: '33.00', date: T, from_tid: f, to_tid: t }); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.matched, 2);
  assert.equal(bt(f).journal_id, r.json.id); assert.equal(bt(t).journal_id, r.json.id); await tb();
});
test('received with deductions can wait in Undeposited Funds (Deposit to)', { skip: !PW }, async () => {
  const u0 = (await call('m/x37/undeposited?summary=1')).json;
  const r = await call('m/net/post', { mode: 'broker', property_id: pid, date: T, bank_account_id: 'undeposited', tenants: [{ lease_id: L.id, rent: '1000.00' }], deductions: [{ type: 'broker', amount: '100.00', memo: 'Broker fee' }] }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const u1 = (await call('m/x37/undeposited')).json; const it = u1.items.find(i => i.id === r.json.bank_journal_id); assert.ok(it, 'net is waiting to be deposited'); assert.equal(it.amount, 90000); assert.equal(u1.n, u0.n + 1);
  assert.equal(sq.prepare('SELECT bank_account_id FROM journal WHERE id=?').get(r.json.bank_journal_id).bank_account_id, null); await tb();
});
test('reconcile on the receiving account counts transfers in (matched there)', { skip: !PW }, async () => {
  const m = (await call('m/x24/match/' + bank2.id)).json; const cl = m.books.filter(e => e.cleared || e.txns.length).reduce((s, e) => s + e.amount, 0); assert.equal(cl, 28300, 'client-side cleared = 250 + 33');
  const r = await call('m/x24/rec/' + bank2.id, { date: T, starting: '0.00', ending: (cl / 100).toFixed(2) }); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.rec.cleared, 28300);
});
