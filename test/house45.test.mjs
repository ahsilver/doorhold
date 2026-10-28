// node --test test/house45.test.mjs — d45b: house tabs data (units, tenants, payments, cash P&L), unit page, water to pay the town,
// bill markup on the owner statement (management mode only), work order link on a bill, respond / close a request.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker45b.mjs');
const worker = (await import('/tmp/pm-test-worker45b.mjs?' + Date.now())).default;
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

let H = null, U1 = null, U2 = null;
test('setup: a house with two units, a current lease (two tenants), a past lease, rent + water, a water payment and a town payment', { skip: !PW }, async () => {
  let r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  if (!sq.prepare(`SELECT id FROM gl_accounts WHERE code='4810'`).get()) sq.prepare(`INSERT INTO gl_accounts(id,code,name,type,active) VALUES(133,'4810','Water bill','income',1)`).run();
  r = await call('m/properties', { name: '27 Test Water Street', city: 'Trenton', unit_count: 2, market_rent: '1500' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); H = r.json.id;
  [U1, U2] = sq.prepare('SELECT id FROM units WHERE property_id=? ORDER BY id').all(H).map(u => u.id);
  const t1 = Number(sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Rosa','Diaz','current')`).run().lastInsertRowid), t2 = Number(sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Tom','Diaz','current')`).run().lastInsertRowid), t0 = Number(sq.prepare(`INSERT INTO tenants(first,last,status) VALUES('Old','Renter','past')`).run().lastInsertRowid);
  const old = Number(sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status,moved_out) VALUES(?,?,?,?,?,?,'ended',?)`).run(U1, t0, '2025-01-01', '2025-12-31', 140000, 0, '2025-12-31').lastInsertRowid);
  const lid = Number(sq.prepare(`INSERT INTO leases(unit_id,tenant_id,start,"end",rent,deposit,status) VALUES(?,?,?,?,?,?,'active')`).run(U1, t1, '2026-01-01', '2026-12-31', 150000, 0).lastInsertRowid);
  sq.prepare('INSERT INTO lease_tenants(lease_id,tenant_id,primary_t) VALUES(?,?,1),(?,?,0),(?,?,1)').run(lid, t1, lid, t2, old, t0);
  L = { id: lid, old, t1, t2 };
  await charge(L.id, 150000, '2026-11-01', '4000', 'Rent');
  L.water = await charge(L.id, 9000, '2026-11-10', '4810', 'Water bill');
  r = await pay(L.id, '90.00', { apply45: [{ charge_id: L.water, account_id: acct('4810'), amount: 9000 }], total45: '90.00' }); assert.equal(r.status, 200, JSON.stringify(r.json)); L.wpay = r.json.id;
  r = await call('m/x24/expense', { paid_by: 'ach', account_id: acct('6210'), amount: '60.00', date: '2026-11-20', property_id: H, bank_account_id: 1, bank: 1, vendor_name: 'Trenton Water Works', memo: 'Water bill paid to the town' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
});
test('house data: units (occupied + vacant), current and past tenants, payments with the split, cash P&L, water', { skip: !PW }, async () => {
  const x = (await call(`m/x45/house/${H}?from=2026-01-01&to=2026-12-31`, null, 'GET', tok)).json;
  assert.equal(x.units.length, 2); const a = x.units.find(u => u.id === U1), b = x.units.find(u => u.id === U2);
  assert.equal(a.lease.id, L.id); assert.equal(a.lease.names, 'Rosa Diaz & Tom Diaz'); assert.equal(a.lease.balance, 150000); assert.equal(a.past, 1); assert.equal(b.vacant, true);
  assert.deepEqual(x.leases.map(l => [l.id, l.current]), [[L.id, true], [L.old, false]]);
  const p = x.payments.find(y => y.id === L.wpay); assert.equal(p.split, 'Water $90'); assert.equal(p.amount, 9000);
  assert.equal(x.pl.income.find(i => i.code === '4810').amount, 9000); assert.equal(x.pl.expense.find(i => i.code === '6210').amount, 6000); assert.equal(x.pl.net, 3000);
  assert.ok(x.expenses.some(e => e.amount === 6000 && /water/i.test(e.account)));
  assert.deepEqual([x.water.collected, x.water.paid, x.water.to_pay], [9000, 6000, 3000]);
  const none = (await call(`m/x45/house/${H}?from=2025-01-01&to=2025-12-31`, null, 'GET', tok)).json; assert.equal(none.payments.length, 0, 'the period filter applies');
  assert.equal((await call('m/x45/house/999999', null, 'GET', tok)).status, 404);
});
test('unit page: current tenant, open by type, past tenants, recent payments', { skip: !PW }, async () => {
  const x = (await call('m/x45/unit/' + U1, null, 'GET', tok)).json;
  assert.equal(x.current.id, L.id); assert.deepEqual(x.open.by_type, [{ type: 'Rent', amount: 150000 }]); assert.equal(x.leases.length, 2); assert.equal(x.siblings.length, 2);
  assert.equal(x.payments[0].split, 'Water $90');
  const v = (await call('m/x45/unit/' + U2, null, 'GET', tok)).json; assert.equal(v.current, null); assert.equal(v.leases.length, 0);
});
test('water to pay the town: per house, filters, town vendor + water account for Pay the town', { skip: !PW }, async () => {
  const x = (await call('m/x45/water', null, 'GET', tok)).json; const h = x.houses.find(z => z.property_id === H);
  assert.deepEqual([h.charged, h.collected, h.paid, h.to_pay], [9000, 9000, 6000, 3000]); assert.equal(h.items.length, 2);
  assert.equal(x.water_account_id, acct('6210')); assert.ok(x.town_vendor && /trenton water/i.test(x.town_vendor.name));
  const one = (await call('m/x45/water?property=' + H, null, 'GET', tok)).json; assert.equal(one.houses.length, 1);
  const before = (await call('m/x45/water?to=2026-11-25&property=' + H, null, 'GET', tok)).json.houses[0]; assert.deepEqual([before.collected, before.paid], [0, 6000], 'the tenant paid Dec 2, the town was paid Nov 20');
});
test('bill markup: only in management mode; % or $; shows on the owner fee lines; no ledger change', { skip: !PW }, async () => {
  const own = Number(sq.prepare(`INSERT INTO owners(name,client,agreement) VALUES('Owner Test',1,'{"fee_pct":0,"fee_type":"pct"}')`).run().lastInsertRowid);
  sq.prepare('UPDATE properties SET owner_id=?, managed=1 WHERE id=?').run(own, H);
  let r = await call('bills', { vendor_name: 'Plumber Joe', property_id: H, account_code: '6100', amount: '200.00', bill_date: '2026-11-12', due: '2026-11-30', memo: 'Fix sink' }, 'POST', tok);
  if (r.status !== 200) r = await call('m/bills', { vendor_name: 'Plumber Joe', property_id: H, account_code: '6100', amount: '200.00', bill_date: '2026-11-12', due: '2026-11-30', memo: 'Fix sink' }, 'POST', tok);
  assert.equal(r.status, 200, JSON.stringify(r.json)); const bid = r.json.id || r.json.bill_id; const key = 'b' + bid;
  const t0 = await tb();
  r = await call('m/x45/markup', { key, kind: 'pct', value: '10' }, 'POST', tok); assert.equal(r.status, 400, 'refused while management mode is off'); assert.match(r.json.error, /management mode/i);
  sq.prepare(`INSERT OR REPLACE INTO settings(k,v) VALUES('mgmt_mode','1')`).run();
  r = await call('m/x45/markup', { key, kind: 'pct', value: '10' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.markup.amount, 2000);
  assert.equal((await call('m/x45/markup', { key, kind: 'pct', value: '150' }, 'POST', tok)).status, 400);
  let g = (await call('m/x45/markup?key=' + key, null, 'GET', tok)).json; assert.equal(g.markup.kind, 'pct'); assert.equal(g.mgmt, true);
  let pay = (await call('m/mgmt/pay?month=2026-11', null, 'GET', tok)).json; let row = (pay.rows || pay.clients || []).find(o => o.owner_id === own); assert.ok(row, JSON.stringify(pay).slice(0, 300));
  let ln = row.fee_lines.find(l => /Bill markup/.test(l.basis)); assert.ok(ln, JSON.stringify(row.fee_lines)); assert.equal(ln.amount, 2000); assert.equal(ln.kind, 'markup');
  r = await call('m/x45/markup', { key, kind: 'amt', value: '15.50' }, 'POST', tok); assert.equal(r.json.markup.amount, 1550);
  pay = (await call('m/mgmt/pay?month=2026-11', null, 'GET', tok)).json; row = (pay.rows || pay.clients || []).find(o => o.owner_id === own); assert.equal(row.fee_lines.find(l => /Bill markup/.test(l.basis)).amount, 1550);
  const dec = (await call('m/mgmt/pay?month=2026-12', null, 'GET', tok)).json; const r12 = (dec.rows || dec.clients || []).find(o => o.owner_id === own); assert.ok(!r12 || !r12.fee_lines.some(l => /Bill markup/.test(l.basis)), 'only in the bill month');
  r = await call('m/x45/markup', { key, remove: true }, 'POST', tok); assert.equal(r.json.markup, null);
  pay = (await call('m/mgmt/pay?month=2026-11', null, 'GET', tok)).json; row = (pay.rows || pay.clients || []).find(o => o.owner_id === own); assert.ok(!row.fee_lines.some(l => /Bill markup/.test(l.basis)));
  const t1 = await tb(); assert.deepEqual(t1, t0, 'a markup changes no ledger lines until fees are posted');
  sq.prepare(`DELETE FROM settings WHERE k='mgmt_mode'`).run(); L.bill = bid;
});
test('work order: link a bill, respond (tenant-visible message), close with a reason', { skip: !PW }, async () => {
  let r = await call('m/workorders', { title: 'Sink leak', description: 'Under the sink', property_id: H, unit_id: U1, tenant_id: L.t1, priority: 'normal' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); const w = r.json.id;
  r = await call('m/x31/link', { wo_id: w, bill_id: L.bill }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const b = (await call('m/x34/bill/b' + L.bill, null, 'GET', tok)).json; assert.equal(b.bill.request.id, w);
  r = await call('m/x29/chat/' + w, { text: 'We got your request and will take care of it as soon as possible.' }, 'POST', tok); assert.equal(r.status, 200);
  const ev = sq.prepare(`SELECT kind, body FROM wo_events WHERE wo_id=? AND kind='note'`).all(w); assert.equal(ev.length, 1);
  r = await call(`m/x40/req/${w}/status`, { status: 'closed', reason: 'completed', date: '2026-12-02', note: 'Fixed' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const wo = sq.prepare('SELECT status, close_reason FROM work_orders WHERE id=?').get(w); assert.deepEqual([wo.status, wo.close_reason], ['closed', 'completed']);
  const a = await tb(); assert.equal(a.debit, a.credit);
});

test('move-out deposit: the new deduction kinds (painting, keys, unpaid water) post as labelled charges, TB balanced', { skip: !PW }, async () => {
  sq.prepare('UPDATE leases SET deposit=0 WHERE id=?').run(L.id);
  let r = await call('m/x26/moveout/' + L.id, { date: '2026-11-30', full_month: false }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call(`m/x26/deposit/${L.id}/settle`, { deductions: [{ kind: 'painting', amount: '350.00', note: 'Bedroom walls' }, { kind: 'keys', amount: '75.00' }, { kind: 'water', amount: '62.40' }], owes: 'keep', date: '2026-12-01' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const m = sq.prepare(`SELECT memo, amount FROM journal WHERE lease_id=? AND src='app:deposit' AND kind='charge' ORDER BY id`).all(L.id).map(x => [x.memo, x.amount]);
  assert.deepEqual(m, [['Damages: Painting – Bedroom walls (from deposit)', 35000], ['Damages: Keys / locks (from deposit)', 7500], ['Deduction: Unpaid water (from deposit)', 6240]]);
  const a = await tb(); assert.equal(a.debit, a.credit);
});
