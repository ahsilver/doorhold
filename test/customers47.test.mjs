// node --test test/customers47.test.mjs — d47b: Customers (person / company, masked tax ID, fee terms, payout last 4),
// customer page data, Add a property mine vs managed (new / picked customer, fee terms, management mode only when asked), no tax IDs across companies.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker47b.mjs');
const worker = (await import('/tmp/pm-test-worker47b.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') }, PM_TODAY: '2026-12-02' };
const raw = async (p, body, method, tok) => worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} });
const call = async (p, body, method, tok) => { const r = await raw(p, body, method, tok); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '';
const set = k => (sq.prepare('SELECT v FROM settings WHERE k=?').get(k) || {}).v;
const C = (p, b, m) => call(p, b, m, tok);

test('setup: sign in', { skip: !PW }, async () => { const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; });

test('customer CRUD: person / company, tax ID encrypted + masked, payout last 4 only, fee terms', { skip: !PW }, async () => {
  assert.equal((await C('m/x47/customer', { kind: '', company: 'X' })).status, 400, 'person or company required');
  assert.equal((await C('m/x47/customer', { kind: 'company', company: 'Bad TIN LLC', tin: '12-34' })).status, 400);
  assert.equal((await C('m/x47/customer', { kind: 'person', first: 'A', last: 'B', payout_last4: '123456789' })).status, 400, 'full account number refused');
  const r = await C('m/x47/customer', { kind: 'company', company: 'Rivera Holdings LLC', cls: 'llc_single', contact: 'Luis Rivera', phone: '732-555-0148', email: 'luis@rivera.example', addr1: '40 Oak Ave', city: 'Edison', state: 'nj', zip: '08817', tin: '12-3456789', fee_type: 'pct', fee_pct: '7.5', payout_method: 'Zelle', payout_bank: 'Chase', payout_last4: '4821', notes: 'Statements by the 5th' });
  assert.equal(r.status, 200, r.text); const id = r.json.id;
  const row = sq.prepare('SELECT * FROM cust47 WHERE owner_id=?').get(id); assert.ok(row.tin_enc && !row.tin_enc.includes('3456789'), 'stored encrypted'); assert.equal(row.tin_last4, '6789');
  const o = sq.prepare('SELECT * FROM owners WHERE id=?').get(id); assert.equal(o.client, 1); assert.equal(JSON.parse(o.agreement).fee_pct, 7.5); assert.equal(JSON.parse(o.agreement).payout_method, 'Zelle');
  const d = (await C('m/x47/customer/' + id)).json; assert.equal(d.tin_masked, '••-•••6789'); assert.equal(d.state, 'NJ'); assert.equal(d.payout_last4, '4821'); assert.equal(d.label, 'Company · LLC (single-member)'); assert.equal(d.fee_text, '7.5% of rent');
  for (const t of [JSON.stringify(d), (await C('m/x47/customers')).text, (await C('m/mgmt/clients')).text]) assert.ok(!t.includes('3456789') && !t.includes(row.tin_enc), 'no tax ID in JSON');
  // edit: blank tax ID keeps it, person switch, flat fee
  const e = await C('m/x47/customer/' + id, { kind: 'person', first: 'Luis', last: 'Rivera', phone: '732-555-0148', tin: '', fee_type: 'flat', fee_flat: '95' }); assert.equal(e.status, 200, e.text);
  const d2 = (await C('m/x47/customer/' + id)).json; assert.equal(d2.name, 'Luis Rivera'); assert.equal(d2.kind, 'person'); assert.ok(d2.has_tin); assert.equal(d2.fee_text, '$95/door');
  assert.equal((await C('m/x47/customer/' + id, { kind: 'person', first: 'Luis', last: 'Rivera', tin: null })).status, 200); assert.equal((await C('m/x47/customer/' + id)).json.has_tin, false, 'tax ID cleared');
  const L = (await C('m/x47/customers')).json; assert.ok(L.customers.some(c => c.id === id && c.label === 'Person'));
});

test('customer page: houses, owed to them, statements, documents', { skip: !PW }, async () => {
  const L = (await C('m/x47/customers')).json; const own = L.others[0]; assert.ok(own && own.houses > 0, 'demo owner with houses');
  const r = await C('m/x47/customer/' + own.id, { kind: 'company', company: own.name, fee_type: 'pct', fee_pct: '6' }); assert.equal(r.status, 200, r.text);
  const d = (await C('m/x47/customer/' + own.id)).json;
  assert.equal(d.houses.length, own.houses); assert.ok(d.money && Number.isFinite(d.money.due) && Number.isFinite(d.money.cash));
  assert.ok(Array.isArray(d.statements) && Array.isArray(d.documents) && Array.isArray(d.payouts));
  assert.equal((await C('m/x47/customer/999999')).status, 404);
});

test('add a property: "Mine" keeps today\'s owner choices; "I manage it" needs management mode, ticks it on only when asked', { skip: !PW }, async () => {
  const mine = await C('m/mgmt/house', { address: '9 Mine St', city: 'Trenton', state: 'NJ', units: 1, who: 'me', person: 'Pat Owner' }); assert.equal(mine.status, 200, mine.text);
  const p1 = sq.prepare('SELECT * FROM properties WHERE id=?').get(mine.json.id); assert.ok(!p1.managed); assert.ok(p1.entity_id);
  sq.prepare(`INSERT OR REPLACE INTO settings(k,v) VALUES('mgmt_mode','0')`).run();
  const off = await C('m/mgmt/house', { address: '10 Managed St', units: 1, who: 'client', c47: { kind: 'person', first: 'Mei', last: 'Chen' }, fee47: { fee_type: 'flat', fee_flat: '90' } });
  assert.equal(off.status, 400); assert.match(off.json.error, /Turn on management mode/); assert.equal(set('mgmt_mode'), '0', 'nothing turned on');
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM owners WHERE name='Mei Chen'`).get().n, 0, 'no customer created on a refused save');
  const ok = await C('m/mgmt/house', { address: '10 Managed St', units: 2, who: 'client', c47: { kind: 'person', first: 'Mei', last: 'Chen', phone: '917-555-0101' }, fee47: { fee_type: 'flat', fee_flat: '90' }, mgmt_on47: true });
  assert.equal(ok.status, 200, ok.text); assert.equal(set('mgmt_mode'), '1');
  const p2 = sq.prepare('SELECT * FROM properties WHERE id=?').get(ok.json.id); assert.equal(p2.managed, 1);
  const o = sq.prepare('SELECT * FROM owners WHERE id=?').get(p2.owner_id); assert.equal(o.name, 'Mei Chen'); assert.equal(o.client, 1);
  const a = JSON.parse(o.agreement); assert.equal(a.fee_type, 'flat'); assert.equal(a.fee_flat, 9000);
  assert.equal(sq.prepare('SELECT kind FROM cust47 WHERE owner_id=?').get(o.id).kind, 'person');
  // picked customer + new fee terms update that customer's agreement
  const ok2 = await C('m/mgmt/house', { address: '11 Managed St', units: 1, who: 'client', client_id: o.id, fee47: { fee_type: 'pct', fee_pct: '9' } }); assert.equal(ok2.status, 200, ok2.text);
  assert.equal(sq.prepare('SELECT owner_id FROM properties WHERE id=?').get(ok2.json.id).owner_id, o.id);
  assert.equal(JSON.parse(sq.prepare('SELECT agreement FROM owners WHERE id=?').get(o.id).agreement).fee_pct, 9);
  const d = (await C('m/x47/customer/' + o.id)).json; assert.equal(d.houses.length, 2); assert.equal(d.fee_text, '9% of rent');
  assert.equal((await C('m/mgmt/house', { address: '12 X St', units: 1, who: 'client', fee47: { fee_type: 'pct', fee_pct: '9' } })).status, 400, 'customer required');
});

test('customer tax IDs stay inside their company', { skip: !PW }, async () => {
  const sg = await call('signup', { email: 'cust47co@example.com', password: 'Cust47-Leak-Test-99', company: 'Other Co 47', name: 'Other' });
  assert.equal(sg.status, 200, sg.text); const t2 = sg.json.token; assert.ok(t2);
  const mine = (await C('m/x47/customers')).json.customers; assert.ok(mine.length > 0);
  const other = (await call('m/x47/customers', null, 'GET', t2)).json; assert.equal(other.customers.length, 0, 'other company sees none');
  for (const c of mine) { const r = await call('m/x47/customer/' + c.id, null, 'GET', t2); assert.ok(r.status === 404 || (r.json && r.json.name !== c.name), 'no cross-company read'); }
  const r = await call('m/x47/customer', { kind: 'company', company: 'Theirs LLC', tin: '98-7654321' }, 'POST', t2); assert.equal(r.status, 200, r.text);
  assert.ok(!(await C('m/x47/customers')).text.includes('Theirs LLC'));
});
