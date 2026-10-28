// node --test test/tester61.test.mjs — d61 tester fixes: LLC/partnership members fill the property partner list; loan put on the books; tenant late-fee text = late-fee engine
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker61t.mjs');
const worker = (await import('/tmp/pm-test-worker61t.mjs?' + Date.now())).default;
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
const tbOk = async () => { const t = await tb(); assert.equal(t.debit, t.credit, 'trial balance balanced'); return t; };
let H, H2;
test('login + two properties', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  H = (await call('m/properties', { name: '61 Partner Street', city: 'Trenton', unit_count: 1, market_rent: '1500' }, 'POST', tok)).json.id;
  H2 = (await call('m/properties', { name: '62 Custom Street', city: 'Trenton', unit_count: 1, market_rent: '1500' }, 'POST', tok)).json.id;
});
test('an LLC saved with members and a property fills the partner list; adding a member later updates it; a hand-made list is left alone', { skip: !PW }, async () => {
  // H2 has its own partner list already
  const o1 = Number(sq.prepare(`INSERT INTO owners(name,contact,email,phone,fee_pct) VALUES('Custom One','','','',0)`).run().lastInsertRowid);
  await call(`m/partners/${H2}/setup`, { on: true, partners: [{ owner_id: o1, pct: 100 }] }, 'POST', tok);
  let r = await call('m/entities', { name: 'Sixty One Partners LLC', type: 'llc_multi', members: [{ name: 'Ann Alpha', pct: 60 }, { name: 'Ben Beta', pct: 40 }], property_ids: [H, H2], confirmed: true }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const eid = r.json.entities.find(e => e.name === 'Sixty One Partners LLC').id;
  let p = (await call(`m/partners/${H}`, null, 'GET', tok)).json; assert.equal(p.property.partners_on, 1); assert.deepEqual(p.partners.map(x => [x.name, x.pct]).sort(), [['Ann Alpha', 60], ['Ben Beta', 40]]);
  assert.deepEqual((await call(`m/partners/${H2}`, null, 'GET', tok)).json.partners.map(x => x.name), ['Custom One'], 'hand-made list untouched');
  const ann = p.partners.find(x => x.name === 'Ann Alpha').owner_id;
  r = await call(`m/partners/${H}/txn`, { owner_id: ann, kind: 'contribution', amount: '1000', date: '2026-10-20', bank_account_id: 1 }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call(`m/entities/${eid}`, { name: 'Sixty One Partners LLC', type: 'llc_multi', members: [{ name: 'Ann Alpha', pct: 50 }, { name: 'Ben Beta', pct: 30 }, { name: 'Cy Gamma', pct: 20 }], confirmed: true }, 'POST', tok); assert.equal(r.status, 200);
  p = (await call(`m/partners/${H}`, null, 'GET', tok)).json; assert.deepEqual(p.partners.map(x => [x.name, x.pct]).sort(), [['Ann Alpha', 50], ['Ben Beta', 30], ['Cy Gamma', 20]]);
  assert.equal(p.partners.find(x => x.name === 'Ann Alpha').owner_id, ann, 'same owner, contributions stay linked'); assert.equal(p.partners.find(x => x.name === 'Ann Alpha').put_in, 100000);
  await tbOk();
});
test('a saved loan is flagged as not on the books; preview, post (split over properties), undo', { skip: !PW }, async () => {
  const lid = Number(sq.prepare(`INSERT INTO loans(property_id,lender,last4,balance,balance_date,pi,escrow,total,due_day,status,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(H, 'Test Bank', '7788', 15000000, '2026-10-01', 90000, 30000, 120000, 1, 'active', '2026-10-22').lastInsertRowid);
  let s = (await call(`m/x61/loanbook/${lid}`, null, 'GET', tok)).json; assert.equal(s.needs, true); assert.equal(s.balance, 15000000);
  let pf = (await call('m/x59/propfin/' + H, null, 'GET', tok)).json; assert.equal(pf.loans.find(L => L.id === lid).on_books, false);
  const t0 = await tbOk();
  const pv = (await call(`m/x61/loanbook/${lid}`, { amount: '150000', date: '2026-10-01', counter: 'property' }, 'POST', tok)).json; assert.equal(pv.preview, true); assert.equal(pv.lines.length, 2);
  const r = await call(`m/x61/loanbook/${lid}`, { amount: '150000', date: '2026-10-01', counter: 'property', confirm: true }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const cr = sq.prepare(`SELECT SUM(jl.credit-jl.debit) v FROM jlines jl JOIN journal j ON j.id=jl.journal_id WHERE j.void=0 AND jl.account_id=? AND jl.property_id=?`).get(acct('2500'), H).v; assert.equal(cr, 15000000);
  pf = (await call('m/x59/propfin/' + H, null, 'GET', tok)).json; assert.equal(pf.loans.find(L => L.id === lid).on_books, true); assert.equal(pf.mortgage_balance, 15000000);
  const t1 = await tbOk(); assert.equal(t1.debit - t0.debit, 15000000);
  assert.equal((await call(`m/x61/loanbook/${lid}`, { amount: '1', counter: 'equity', confirm: true }, 'POST', tok)).status, 400, 'no second entry');
  assert.equal((await call(`m/x61/loanbook/${lid}/undo`, {}, 'POST', tok)).status, 200); assert.equal((await call(`m/x61/loanbook/${lid}`, null, 'GET', tok)).json.needs, true); await tbOk();
  const b = await call(`m/x61/loanbook/${lid}`, { amount: '150000', counter: 'bank', confirm: true }, 'POST', tok); assert.equal(b.status, 400); assert.match(b.json.error, /bank account/);
});
test('tenant page late-fee text is the late-fee engine text (company rule, property override, tenant override)', { skip: !PW }, async () => {
  const L = sq.prepare(`SELECT l.id, l.tenant_id, u.property_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.status='active' ORDER BY l.id LIMIT 1`).get();
  const td = (await call('m/tenants/' + L.tenant_id, null, 'GET', tok)).json; assert.ok(td.lease.late44, 'late44 on the tenant');
  const info = (await call('m/x44/lease/' + td.lease.id, null, 'GET', tok)).json; assert.equal(td.lease.late44.text, info.text);
});
