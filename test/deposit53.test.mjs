// node --test test/deposit53.test.mjs — d53: a bank deposit line is found in the books first (Undeposited Funds -> Deposit, nothing added to the tenant ledger);
// only when it is not there it is recorded (tenant payment with a duplicate warning, or other income), and it is matched to the bank line.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker53.mjs');
const worker = (await import('/tmp/pm-test-worker53.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list() { return { objects: [] }; } }, ASSETS: { fetch: async () => new Response('') } };
let token = '';
const call = async (p, body, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); let json = null; try { json = await r.json(); } catch (e) { } return { status: r.status, json }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
const tb = async () => { const t = (await call('m/reports/trial-balance')).json.totals; assert.equal(t.debit, t.credit, 'trial balance balanced'); return t; };
const pays = leaseId => sq.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM journal WHERE kind='payment' AND void=0 AND lease_id=?`).get(leaseId);
let L, bank, today, seq = 0;
const line = async (amount, desc, date) => { const r = await call(`m/x51/bank/${bank.id}/rows`, { rows: [{ date: date || today, amount, description: desc + ' ' + (++seq) }], format: 'CSV', filename: 't.csv' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const t = sq.prepare(`SELECT id, status FROM bank_txns WHERE bank_account_id=? AND amount=? AND description LIKE ? ORDER BY id DESC LIMIT 1`).get(bank.id, amount, '%' + desc + ' ' + seq); assert.ok(t, 'bank line imported');
  if (t.status !== 'unmatched') { sq.prepare(`UPDATE bank_txns SET status='unmatched', journal_id=NULL, how=NULL WHERE id=?`).run(t.id); } return t.id; };
const status = tid => sq.prepare('SELECT status, journal_id, how FROM bank_txns WHERE id=?').get(tid);
test('sign in', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); token = r.json.token;
  await call('m/x37/housebanks');
  L = sq.prepare(`SELECT l.id, l.tenant_id, u.property_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.status='active' ORDER BY l.id LIMIT 1`).get(); assert.ok(L);
  bank = sq.prepare(`SELECT id, account_id FROM bank_accounts WHERE kind='bank' ORDER BY id LIMIT 1`).get(); assert.ok(bank);
  today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()); await tb();
});
test('find first: the undeposited cash payments that add up to the bank deposit are suggested; Deposit adds nothing to the tenant ledger', { skip: !PW }, async () => {
  const p1 = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '321.17', date: today, method: 'Cash', deposit_to: 'undeposited' }); assert.equal(p1.status, 200); assert.equal(p1.json.undeposited, true);
  const p2 = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '78.94', date: today, method: 'Check', deposit_to: 'undeposited' }); assert.equal(p2.status, 200);
  const before = pays(L.id); const tb0 = await tb();
  const tid = await line(40011, 'MOBILE DEPOSIT');
  const f = await call('m/x53/find/' + tid); assert.equal(f.status, 200, JSON.stringify(f.json));
  assert.ok(f.json.items.some(i => i.id === p1.json.id) && f.json.items.some(i => i.id === p2.json.id), 'both undeposited items listed');
  const sum = f.json.suggest.reduce((s, id) => s + f.json.items.find(i => i.id === id).amount, 0); assert.equal(sum, 40011, 'suggestion adds up exactly');
  assert.deepEqual([...f.json.suggest].sort(), [p1.json.id, p2.json.id].sort());
  const bad = await call('m/x53/deposit/' + tid, { journal_ids: [p1.json.id] }); assert.equal(bad.status, 400, 'wrong total refused');
  const dep = await call('m/x53/deposit/' + tid, { journal_ids: f.json.suggest }); assert.equal(dep.status, 200, JSON.stringify(dep.json));
  const st = status(tid); assert.equal(st.status, 'matched'); assert.equal(st.journal_id, dep.json.deposit_id);
  const dj = sq.prepare('SELECT kind, jtype, bank_account_id, bank_amount FROM journal WHERE id=?').get(dep.json.deposit_id); assert.equal(dj.jtype, 'Deposit'); assert.equal(dj.bank_amount, 40011); assert.equal(dj.bank_account_id, bank.id);
  assert.equal(sq.prepare('SELECT COUNT(*) n FROM journal WHERE deposit_id=?').get(dep.json.deposit_id).n, 2);
  const after = pays(L.id); assert.equal(after.n, before.n, 'tenant ledger: no new payment'); assert.equal(after.s, before.s);
  const t1 = await tb(); assert.equal(t1.debit, tb0.debit, 'TB total unchanged by a deposit (money moves Undeposited -> bank)');
  const u = (await call('m/x37/undeposited')).json; assert.ok(!(u.items || []).some(i => i.id === p1.json.id), 'no longer undeposited');
  const again = await call('m/x53/deposit/' + tid, { journal_ids: f.json.suggest }); assert.equal(again.status, 409, 'matched line cannot be deposited twice');
});
test('record it (not in the system): tenant payment goes on the tenant ledger once, into this bank, matched', { skip: !PW }, async () => {
  const before = pays(L.id); const tid = await line(55555, 'ZELLE FROM SOMEONE');
  const ls = (await call('m/x53/leases?tid=' + tid)).json.leases; assert.ok(ls.length && ls.some(x => x.lease_id === L.id));
  const r = await call('m/x53/record/' + tid, { kind: 'tenant', lease_id: L.id }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const after = pays(L.id); assert.equal(after.n, before.n + 1); assert.equal(after.s - before.s, 55555);
  const j = sq.prepare('SELECT bank_account_id, method, date FROM journal WHERE id=?').get(r.json.id); assert.equal(j.bank_account_id, bank.id); assert.equal(j.method, 'Zelle'); assert.equal(j.date, today);
  const st = status(tid); assert.equal(st.status, 'matched'); assert.equal(st.journal_id, r.json.id); await tb();
});
test('duplicate warning: the tenant already has an undeposited item / a payment of that amount -> 409 with the list; Use that instead = Deposit', { skip: !PW }, async () => {
  const p = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '612.00', date: today, method: 'Cash', deposit_to: 'undeposited' }); assert.equal(p.status, 200);
  const before = pays(L.id); const tid = await line(61200, 'DEPOSIT');
  const dl = await call(`m/x53/dupes?lease_id=${L.id}&amount=61200&date=${today}`); assert.equal(dl.status, 200); assert.ok(dl.json.list.some(x => x.id === p.json.id && x.where === 'undeposited'));
  const r = await call('m/x53/record/' + tid, { kind: 'tenant', lease_id: L.id }); assert.equal(r.status, 409); assert.ok(r.json.maybe_recorded.some(x => x.id === p.json.id));
  assert.equal(pays(L.id).n, before.n, 'nothing posted on the warning'); assert.equal(status(tid).status, 'unmatched');
  const dep = await call('m/x53/deposit/' + tid, { journal_ids: [p.json.id] }); assert.equal(dep.status, 200);
  assert.equal(pays(L.id).n, before.n, 'used the existing one: still one payment'); assert.equal(status(tid).status, 'matched');
  // a payment of the same amount within 10 days that went straight to a bank also warns
  const tid2 = await line(55555, 'ZELLE AGAIN', today);
  const r2 = await call('m/x53/record/' + tid2, { kind: 'tenant', lease_id: L.id }); assert.equal(r2.status, 409); assert.ok(r2.json.maybe_recorded.some(x => x.where === 'matched'));
  const r3 = await call('m/x53/record/' + tid2, { kind: 'tenant', lease_id: L.id, confirm_new: true }); assert.equal(r3.status, 200, 'confirmed as a new payment');
  assert.equal(pays(L.id).n, before.n + 1); await tb();
});
test('other income: bank + income account only, no tenant ledger', { skip: !PW }, async () => {
  const n0 = sq.prepare(`SELECT COUNT(*) n FROM journal WHERE kind='payment' AND void=0`).get().n; const tid = await line(15000, 'FORFEITED DEPOSIT JOHN');
  const inc = (await call('m/x53/income')).json; assert.ok(inc.accounts.length && inc.props.length);
  const acct = inc.accounts.find(a => /other/i.test(a.name)) || inc.accounts[0];
  const no = await call('m/x53/record/' + tid, { kind: 'other' }); assert.equal(no.status, 400);
  const r = await call('m/x53/record/' + tid, { kind: 'other', account_id: acct.id, property_id: L.property_id, memo: 'Forfeited deposit' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const j = sq.prepare('SELECT kind, lease_id, tenant_id, bank_account_id, property_id FROM journal WHERE id=?').get(r.json.id); assert.equal(j.kind, 'other_income'); assert.equal(j.lease_id, null); assert.equal(j.tenant_id, null); assert.equal(j.bank_account_id, bank.id); assert.equal(j.property_id, L.property_id);
  const cr = sq.prepare(`SELECT SUM(credit) c FROM jlines WHERE journal_id=? AND account_id=?`).get(r.json.id, acct.id); assert.equal(cr.c, 15000, 'credited the income account');
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM journal WHERE kind='payment' AND void=0`).get().n, n0); assert.equal(status(tid).status, 'matched'); await tb();
});
test('money out and matched lines are refused', { skip: !PW }, async () => {
  const tid = await line(-2500, 'WITHDRAWAL');
  assert.equal((await call('m/x53/find/' + tid)).status, 400);
  assert.equal((await call('m/x53/record/' + tid, { kind: 'other', account_id: 1 })).status, 400);
});
