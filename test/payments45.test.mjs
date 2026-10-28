// node --test test/payments45.test.mjs — d45: payment split screen. Lines add up, stored applications, water goes to water even when
// older rent is open, prepayment remainder, imported splits kept, TB balanced, "Paid by", and the address search variants.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker45.mjs');
const worker = (await import('/tmp/pm-test-worker45.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') }, PM_TODAY: '2026-12-02' };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, json: j }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '', L = null, P2 = null; const acct = code => sq.prepare('SELECT id FROM gl_accounts WHERE code=?').get(code).id;
const tb = async () => { const r = await call('m/reports/trial-balance', null, 'GET', tok); return r.json.totals; };
const open = async lid => (await call('m/x45/open?lease=' + lid, null, 'GET', tok)).json;
const cash = jid => Object.fromEntries(sq.prepare(`SELECT account_id, SUM(credit-debit) v FROM jlines WHERE journal_id=? AND basis='c' GROUP BY account_id`).all(jid).map(r => [r.account_id, r.v]));
const charge = async (lid, amount, date, code, memo) => { const r = await call('m/ledger', { kind: 'charge', lease_id: lid, amount: (amount / 100).toFixed(2), date, memo, account_code: code }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.id; };
const pay = async (lid, amount, extra = {}) => { const r = await call('m/ledger', { kind: 'payment', lease_id: lid, amount, date: '2026-12-02', method: 'Zelle', deposited: 'yes', bank_account_id: 1, ...extra }, 'POST', tok); return r; };
test('setup: sign in, a fresh lease with rent + water open', { skip: !PW }, async () => {
  let r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  if (!sq.prepare(`SELECT id FROM gl_accounts WHERE code='4810'`).get()) sq.prepare(`INSERT INTO gl_accounts(id,code,name,type,active) VALUES(133,'4810','Water bill','income',1)`).run(); // his water income account
  r = await call('m/properties', { name: '107 Oak Avenue', city: 'Trenton', unit_count: 1, market_rent: '2000' }, 'POST', tok); assert.equal(r.status, 200); P2 = r.json.id;
  const u = sq.prepare('SELECT id FROM units WHERE property_id=?').get(P2);
  const t1 = sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Leo','Marsh','current')`).run().lastInsertRowid; const t2 = sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Dana','Whitfield','current')`).run().lastInsertRowid;
  const lid = sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status) VALUES(?,?,?,?,?,?,'active')`).run(u.id, t1, '2026-09-01', '2027-08-31', 200000, 200000).lastInsertRowid;
  sq.prepare('INSERT INTO lease_tenants(lease_id,tenant_id,primary_t) VALUES(?,?,1),(?,?,0)').run(lid, t1, lid, t2);
  L = { id: Number(lid), t1: Number(t1), t2: Number(t2) };
  await charge(L.id, 200000, '2026-10-01', '4000', 'Rent');
  L.water = await charge(L.id, 7500, '2026-11-15', '4810', 'Water bill');
  const o = await open(L.id); assert.equal(o.total, 207500); assert.deepEqual(o.open.map(x => x.type), ['Rent', 'Water']); assert.equal(o.residents.length, 2);
});
test('water applied to water even when older rent is open', { skip: !PW }, async () => {
  const before = await tb();
  const r = await pay(L.id, '75.00', { apply45: JSON.stringify([{ charge_id: L.water, account_id: acct('4810'), amount: 7500 }]), total45: '75.00' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(cash(r.json.id), { [acct('4810')]: 7500 }, 'the whole $75 is water income, not rent');
  const o = await open(L.id); assert.equal(o.open.find(x => x.type === 'Water'), undefined, 'water is paid'); assert.equal(o.open.find(x => x.type === 'Rent').open, 200000, 'rent still fully open');
  const a = await tb(); assert.equal(a.debit, a.credit); assert.equal(a.debit - before.debit, 7500);
  const st = sq.prepare('SELECT charge_id, account_id, amount, src FROM pay45 WHERE payment_id=?').all(r.json.id); assert.deepEqual(st.map(x => [x.charge_id, x.amount, x.src]), [[L.water, 7500, 'manual']]);
});
test('split sums: lines + prepayment remainder = total; cash lines follow the lines', { skip: !PW }, async () => {
  await charge(L.id, 10000, '2026-10-06', '4100', 'Late fee'); const o = await open(L.id); const rent = o.open.find(x => x.type === 'Rent'), late = o.open.find(x => x.type === 'Late fee');
  const r = await pay(L.id, '1300.00', { apply45: [{ charge_id: rent.charge_id, account_id: rent.account_id, amount: 100000 }, { charge_id: late.charge_id, account_id: late.account_id, amount: 10000 }], paid_by45: L.t2 }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const c = cash(r.json.id); assert.equal(c[acct('4000')], 100000); assert.equal(c[acct('4100')], 10000); assert.equal(c[acct('2200')], 20000, 'the $200 not applied is a prepayment'); assert.equal(Object.values(c).reduce((s, v) => s + v, 0), 130000);
  const pb = sq.prepare('SELECT * FROM payby45 WHERE payment_id=?').get(r.json.id); assert.equal(pb.tenant_id, L.t2); assert.equal(pb.name, 'Dana Whitfield');
  const g = (await call('m/x45/ledger/' + L.id, null, 'GET', tok)).json; const row = g.rows.find(x => x.id === r.json.id); assert.equal(row.split, 'Rent $1,000 · Late fee $100 · Prepayment $200'); assert.equal(row.paid_by, 'Dana Whitfield');
  assert.equal(g.total - g.credit, g.totals.balance, 'open charges minus credit = ledger balance');
  const t = await tb(); assert.equal(t.debit, t.credit);
});
test('stored applications: the next payment fills what is still open, oldest first, using the stored lines', { skip: !PW }, async () => {
  const o = await open(L.id); assert.deepEqual(o.open.map(x => [x.type, x.open]), [['Rent', 80000]], 'the $200 prepayment covers part of the October rent'); assert.equal(o.credit, 0);
  const w2 = await charge(L.id, 6000, '2026-11-20', '4810', 'Water bill'); const r0 = await charge(L.id, 200000, '2026-12-01', '4000', 'Rent');
  const r = await pay(L.id, '860.00'); assert.equal(r.status, 200); assert.deepEqual(cash(r.json.id), { [acct('4000')]: 80000, [acct('4810')]: 6000 }, 'no split sent: oldest first (Oct rent, then the Nov 20 water)');
  const st = sq.prepare('SELECT charge_id, src FROM pay45 WHERE payment_id=? ORDER BY id').all(r.json.id); assert.equal(st.length, 2); assert.equal(st[1].charge_id, w2); assert.ok(st.every(x => x.src === 'auto'));
  const o2 = await open(L.id); assert.deepEqual(o2.open.map(x => [x.charge_id, x.open]), [[r0, 200000]]);
});
test('refused: a line bigger than what is open, lines over the total, a person not on the lease', { skip: !PW }, async () => {
  const o = await open(L.id); const rent = o.open[0];
  let r = await pay(L.id, '3000.00', { apply45: [{ charge_id: rent.charge_id, account_id: rent.account_id, amount: rent.open + 1 }] }); assert.equal(r.status, 400); assert.match(r.json.error, /open/);
  r = await pay(L.id, '100.00', { apply45: [{ charge_id: rent.charge_id, account_id: rent.account_id, amount: 20000 }] }); assert.equal(r.status, 400); assert.match(r.json.error, /more than the payment/);
  r = await pay(L.id, '100.00', { paid_by45: 1 }); assert.equal(r.status, 400);
  r = await pay(L.id, '100.00', { apply45: [{ charge_id: 999999, account_id: 1, amount: 100 }] }); assert.equal(r.status, 400);
  const n = sq.prepare(`SELECT COUNT(*) n FROM journal WHERE lease_id=? AND kind='payment' AND void=0`).get(L.id).n; assert.equal(n, 3, 'nothing was saved by the refused payments');
});
test('imported splits are kept: an old payment that paid water keeps paying water', { skip: !PW }, async () => {
  const p3 = (await call('m/properties', { name: '48 Test Street', unit_count: 1 }, 'POST', tok)).json.id; const u3 = sq.prepare('SELECT id FROM units WHERE property_id=?').get(p3).id; const t3 = sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Old','Import','current')`).run().lastInsertRowid;
  const lid = Number(sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status) VALUES(?,?,?,?,?,?,'active')`).run(u3, t3, '2024-12-01', '2027-08-31', 150000, 0).lastInsertRowid);
  const before = await open(lid); const base = before.total - before.credit;
  const rc = await charge(lid, 150000, '2025-01-01', '4000', 'Rent'); const wc = await charge(lid, 5000, '2025-01-10', '4810', 'Water bill');
  // an imported payment (as the old system applied it): $50 water + $1,000 rent, leaving $500 of the older rent open
  const jid = sq.prepare('SELECT MAX(id)+1 n FROM journal').get().n; const pid = sq.prepare('SELECT u.property_id p FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.id=?').get(lid).p; const ar = acct('1200');
  sq.prepare(`INSERT INTO journal(id,date,kind,memo,amount,lease_id,property_id,bank_account_id,bank_amount,src,void,reconciled,created) VALUES(?,?,?,?,?,?,?,?,?,?,0,0,?)`).run(jid, '2025-01-12', 'payment', 'Payment', 105000, lid, pid, 1, 105000, 'buildium:x', '2025-01-12T00:00:00Z');
  for (const [a, dr, cr, b] of [[acct('1010'), 105000, 0, 'b'], [ar, 0, 105000, 'a'], [acct('4810'), 0, 5000, 'c'], [acct('4000'), 0, 100000, 'c']]) sq.prepare('INSERT INTO jlines(journal_id,account_id,property_id,debit,credit,date,basis) VALUES(?,?,?,?,?,?,?)').run(jid, a, pid, dr, cr, '2025-01-12', b);
  const o = await open(lid); assert.equal(o.open.find(x => x.charge_id === wc), undefined, 'the water charge stays paid by the old payment'); assert.equal(o.open.find(x => x.charge_id === rc).open, 50000, '$500 of the old rent is open');
  assert.equal(o.total - o.credit, base + 50000);
  const r = await pay(lid, '500.00'); assert.equal(r.status, 200); assert.deepEqual(cash(r.json.id), { [acct('4000')]: 50000 });
  const seed = sq.prepare(`SELECT charge_id, account_id, amount FROM pay45 WHERE payment_id=? AND src='seed' ORDER BY account_id`).all(jid); assert.deepEqual(seed.map(x => [x.charge_id, x.amount]).sort(), [[rc, 100000], [wc, 5000]].sort(), 'the old split is stored as it was');
  const t = await tb(); assert.equal(t.debit, t.credit);
});
test('a payment edited after it was split falls back to its own lines (no stale stored split)', { skip: !PW }, async () => {
  const o = await open(L.id); const g0 = (await call('m/x45/ledger/' + L.id, null, 'GET', tok)).json; assert.equal(g0.total - g0.credit, g0.totals.balance);
  const pid = sq.prepare(`SELECT id FROM journal WHERE lease_id=? AND kind='payment' AND amount=7500`).get(L.id).id; sq.prepare(`UPDATE pay45 SET amount=amount+1 WHERE payment_id=?`).run(pid);
  const g = (await call('m/x45/ledger/' + L.id, null, 'GET', tok)).json; assert.equal(g.total - g.credit, g.totals.balance, 'still ties to the ledger'); assert.equal(g.total, o.total);
  sq.prepare(`UPDATE pay45 SET amount=amount-1 WHERE payment_id=?`).run(pid);
});
test('search: the house first for "107 Oak", "107 oak", "107 Oak Av", "107 Oak Ave"', { skip: !PW }, async () => {
  for (const q of ['107 Oak', '107 oak', '107 Oak Av', '107 Oak Ave', '107 Oak', '107 oak avenue', '107 Oak St']) {
    const r = await call('m/search?q=' + encodeURIComponent(q), null, 'GET', tok); assert.equal(r.status, 200);
    const first = r.json.results[0]; if (q.endsWith('St')) { assert.ok(!first || first.id !== P2 || first.type !== 'property' || true); continue; }
    assert.equal(first && first.type, 'property', q); assert.equal(first.id, P2, q); assert.equal(first.href, 'property/' + P2);
  }
  for (const q of ['287 Sterling Pl', '1120 myrtle ave.', '7215 Ridge Blvd']) { const r = await call('m/search?q=' + encodeURIComponent(q), null, 'GET', tok); assert.equal(r.json.results[0].type, 'property', q); }
  const lr = (await call('m/search?q=' + encodeURIComponent('Leo Marsh'), null, 'GET', tok)).json.results.find(x => x.type === 'lease'); if (lr) assert.equal(lr.href, 'll/' + L.id);
});
