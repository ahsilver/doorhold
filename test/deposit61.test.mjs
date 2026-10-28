// node --test test/deposit61.test.mjs — d61: deposit held = cash side of the current lease only; move-out apply / keep / refund / close + undo
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker61.mjs');
const worker = (await import('/tmp/pm-test-worker61.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') }, PM_TODAY: '2026-10-22' };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, json: j }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '', L = null, P2 = null; const acct = code => sq.prepare('SELECT id FROM gl_accounts WHERE code=?').get(code).id;
const tb = async () => { const r = await call('m/reports/trial-balance', null, 'GET', tok); return r.json.totals; };
const open = async lid => (await call('m/x45/open?lease=' + lid, null, 'GET', tok)).json;
const cash = jid => Object.fromEntries(sq.prepare(`SELECT account_id, SUM(credit-debit) v FROM jlines WHERE journal_id=? AND basis='c' GROUP BY account_id`).all(jid).map(r => [r.account_id, r.v]));
const charge = async (lid, amount, date, code, memo) => { const r = await call('m/ledger', { kind: 'charge', lease_id: lid, amount: (amount / 100).toFixed(2), date, memo, account_code: code }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.id; };
const pay = async (lid, amount, date) => { const r = await call('m/ledger', { kind: 'payment', lease_id: lid, amount: (amount / 100).toFixed(2), date, method: 'Zelle', deposited: 'yes', bank_account_id: 1 }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.id; };
const tbOk = async () => { const t = await tb(); assert.equal(t.debit, t.credit, 'trial balance balanced'); return t; };
let H, U, OLD, CUR, T0, T1;
test('setup: one property, a past tenant whose deposit was applied at move-out, a current tenant with a $2,000 deposit', { skip: !PW }, async () => {
  let r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  r = await call('m/properties', { name: '61 Deposit Test Street', city: 'Trenton', unit_count: 1, market_rent: '2000' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); H = r.json.id;
  U = sq.prepare('SELECT id FROM units WHERE property_id=? ORDER BY id').get(H).id;
  T0 = Number(sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Fred','Past','past')`).run().lastInsertRowid); T1 = Number(sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Gina','Now','current')`).run().lastInsertRowid);
  OLD = Number(sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status) VALUES(?,?,?,?,?,?,'active')`).run(U, T0, '2026-04-01', '2027-03-31', 200000, 200000).lastInsertRowid);
  await charge(OLD, 200000, '2026-04-01', '2100', 'Security deposit'); await pay(OLD, 200000, '2026-04-02');
  await charge(OLD, 200000, '2026-07-01', '4000', 'Rent'); await charge(OLD, 200000, '2026-08-01', '4000', 'Rent');
  r = await call(`m/x26/moveout/${OLD}`, { date: '2026-08-12', full_month: true }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  // the move-out "transfer deposit to rent" step, partial (not closed)
  r = await call(`m/x61/dep/${OLD}`, { apply: '2000', confirm: true }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.held_now, 0);
  CUR = Number(sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status) VALUES(?,?,?,?,?,?,'active')`).run(U, T1, '2026-09-01', '2027-08-31', 200000, 200000).lastInsertRowid);
  await charge(CUR, 200000, '2026-09-01', '2100', 'Security deposit'); await pay(CUR, 200000, '2026-09-02');
  await tbOk();
});
test('held shows only the current tenant (old code summed both books + past tenants = $6,000)', { skip: !PW }, async () => {
  const raw = sq.prepare(`SELECT SUM(jl.credit-jl.debit) v FROM jlines jl JOIN journal j ON j.id=jl.journal_id WHERE j.void=0 AND jl.account_id=? AND jl.property_id=?`).get(acct('2100'), H).v; assert.equal(raw, 600000, 'the old sum');
  const pf = (await call('m/x59/propfin/' + H, null, 'GET', tok)).json; assert.equal(pf.deposits_held, 200000); assert.equal(pf.deposits_on_leases, 200000); assert.equal(pf.deposits.other, 0); assert.equal(pf.deposits.current.length, 1);
  const td = (await call('m/x59/tenantdep/' + T1, null, 'GET', tok)).json; assert.equal(td.held, 200000); assert.equal(td.received, '2026-09-02');
  const t0 = (await call('m/x59/tenantdep/' + T0, null, 'GET', tok)).json; assert.equal(t0.held, 0);
  const dp = (await call('m/x27/deposits?property_id=' + H, null, 'GET', tok)).json; assert.equal(dp.total, 200000);
});
test('a past tenant still holding a deposit and an entry with no lease show apart, not as the current tenant', { skip: !PW }, async () => {
  const OLD2 = Number(sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status,moved_out) VALUES(?,?,?,?,?,?,'ended',?)`).run(U, T0, '2025-01-01', '2025-12-31', 150000, 50000, '2025-12-31').lastInsertRowid);
  await charge(OLD2, 50000, '2025-01-01', '2100', 'Security deposit'); await pay(OLD2, 50000, '2025-01-02');
  const pf = (await call('m/x59/propfin/' + H, null, 'GET', tok)).json; assert.equal(pf.deposits_held, 200000); assert.equal(pf.deposits.other, 50000); assert.equal(pf.deposits.past[0].lease_id, OLD2);
  sq.prepare('UPDATE journal SET void=1 WHERE lease_id=?').run(OLD2); await tbOk();
});
test('validation: more than held, more than owed, close with money left', { skip: !PW }, async () => {
  await charge(CUR, 150000, '2026-10-01', '4000', 'Rent');
  let r = await call(`m/x61/dep/${CUR}`, { apply: '1500', refund: '600' }, 'POST', tok); assert.equal(r.status, 400); assert.match(r.json.error, /Only \$2,000\.00/);
  r = await call(`m/x61/dep/${CUR}`, { apply: '1600' }, 'POST', tok); assert.equal(r.status, 400); assert.match(r.json.error, /owes \$1,500\.00/);
  r = await call(`m/x61/dep/${CUR}`, { apply: '1500', close: true }, 'POST', tok); assert.equal(r.status, 400); assert.match(r.json.error, /\$500\.00 is left/);
  r = await call(`m/x61/dep/${CUR}`, { refund: '100' }, 'POST', tok); assert.equal(r.status, 400); assert.match(r.json.error, /bank account/);
});
test('apply $1,500 + keep $200 as income + refund $300 by check from a bank + close: lease ended, unit vacant, books balanced; undo restores', { skip: !PW }, async () => {
  const st = (await call(`m/x61/dep/${CUR}`, null, 'GET', tok)).json; assert.equal(st.held, 200000); assert.equal(st.owed, 150000); assert.ok(st.banks.length); assert.ok(st.income.find(a => a.code === '4000'));
  const body = { apply: '1500', keep: '200', keep_account_id: acct('4000'), refund: '300', refund_bank: 1, method: 'Check', check_no: '1042', date: '2026-10-20', close: true };
  const pv = (await call(`m/x61/dep/${CUR}`, body, 'POST', tok)).json; assert.equal(pv.preview, true); assert.equal(pv.book.length, 3); assert.equal(pv.held_after, 0); assert.equal(pv.ends_lease, true);
  assert.equal(sq.prepare(`SELECT status FROM leases WHERE id=?`).get(CUR).status, 'active', 'preview writes nothing');
  const t0 = await tbOk();
  const r = await call(`m/x61/dep/${CUR}`, { ...body, confirm: true }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.held_now, 0); assert.equal(r.json.balance_now, 0);
  const l = sq.prepare(`SELECT status, moved_out FROM leases WHERE id=?`).get(CUR); assert.deepEqual([l.status, l.moved_out], ['ended', '2026-10-20']);
  assert.equal(sq.prepare('SELECT vacant_since FROM units WHERE id=?').get(U).vacant_since, '2026-10-20');
  const rf = sq.prepare(`SELECT * FROM journal WHERE lease_id=? AND jtype='Deposit refund' AND void=0`).get(CUR); assert.equal(rf.bank_amount, -30000); assert.equal(rf.ref, '1042'); assert.equal(rf.payee, 'Gina Now');
  const kp = sq.prepare(`SELECT jl.account_id, jl.credit FROM journal j JOIN jlines jl ON jl.journal_id=j.id WHERE j.lease_id=? AND j.jtype='Deposit kept' AND jl.credit>0`).get(CUR); assert.deepEqual([kp.account_id, kp.credit], [acct('4000'), 20000]);
  const pf = (await call('m/x59/propfin/' + H, null, 'GET', tok)).json; assert.equal(pf.deposits_held, 0); assert.equal(pf.deposits.books_total, 0);
  const dep = (await call(`m/x26/deposit/${CUR}`, null, 'GET', tok)).json; assert.equal(dep.settled.closed, true); assert.equal(dep.settled.refund, 30000);
  const t1 = await tbOk(); assert.equal(t1.debit, t1.debit);
  assert.equal((await call(`m/x61/dep/${CUR}`, { keep: '1' }, 'POST', tok)).status, 400, 'closed ledger refuses more');
  const u = await call(`m/x26/deposit/${CUR}/undo`, {}, 'POST', tok); assert.equal(u.status, 200, JSON.stringify(u.json)); assert.equal(u.json.held_now, 200000);
  assert.equal(sq.prepare(`SELECT status FROM leases WHERE id=?`).get(CUR).status, 'active'); assert.equal(sq.prepare('SELECT vacant_since FROM units WHERE id=?').get(U).vacant_since, '2026-08-12', 'back to what it was');
  assert.equal((await call(`m/x26/deposit/${CUR}`, null, 'GET', tok)).json.settled, null); await tbOk();
});
test('owes more than the deposit: apply all, write the rest off, close', { skip: !PW }, async () => {
  await charge(CUR, 100000, '2026-10-05', '4000', 'Rent');
  const r = await call(`m/x61/dep/${CUR}`, { apply: '2000', close: true, owes: 'writeoff', confirm: true, date: '2026-10-21' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.written_off, 50000); assert.equal(r.json.balance_now, 0);
  await tbOk(); const u = await call(`m/x61/dep/${CUR}/undo`, {}, 'POST', tok); assert.equal(u.status, 200); await tbOk();
});
