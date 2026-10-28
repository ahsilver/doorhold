// node --test test/c53.test.mjs — d53 C + D: who owns each house (I own it / with partners / I manage it), partner and management features only once used
// (the main company keeps everything), the checklist rows that follow them, management fees (company default, per-house override, late-fee share)
// on top of the existing fee logic, and the top search (accounts by name or number, owners) scoped to the signed-in company.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker53c.mjs');
const worker = (await import('/tmp/pm-test-worker53c.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
const F = { failOn: null, hangBatch: false, hangQuery: null };
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { if (F.hangQuery && F.hangQuery.test(this.sql)) { F.hangQuery = null; return new Promise(() => {}); } return { results: this._s().all(...this.args) }; }
  async first() { if (F.hangQuery && F.hangQuery.test(this.sql)) { F.hangQuery = null; return new Promise(() => {}); } return this._s().get(...this.args) ?? null; }
  async run() { if (F.failOn && F.failOn.test(this.sql)) { F.failOn = null; throw new Error('D1_ERROR: injected failure'); } const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { if (F.hangBatch) { F.hangBatch = false; return new Promise(() => {}); } sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) } };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];

const T = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); const M = T.slice(0, 7);
let main = '', tok = '', co = 0;
test('main company keeps every feature', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); main = r.json.token;
  const me = (await call('me', null, 'GET', main)).json; assert.equal(me.f53.main, true); assert.equal(me.f53.partners, true);
});
test('a new company: partner and management features appear only once a house uses them', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'Ann Tester', company: 'C53 Rentals', email: 'c53@example.com', password: 'C53-rentals!' }); assert.equal(s.status, 200, s.text); tok = s.json.token; co = s.json.company_id;
  await call('m/onboard', {}, 'POST', tok);
  let f = (await call('m/x53/features', null, 'GET', tok)).json; assert.deepEqual([f.main, f.partners, f.mgmt], [false, false, false]);
  let st = (await call('m/x52/setup', null, 'GET', tok)).json; assert.ok(!st.items.some(i => i.k === 'owners'), 'owners row hidden at first'); assert.ok(!st.items.some(i => i.k === 'mgfee'));
  assert.equal((await call('m/mgmt/house', { address: '1 Own St', units: 1, who: 'me' }, 'POST', tok)).status, 200);
  f = (await call('m/x53/features', null, 'GET', tok)).json; assert.equal(f.partners, false, 'I own it turns nothing on');
  const bad = await call('m/mgmt/house', { address: '2 Part St', units: 2, who: 'partners', partners: [{ name: 'Ann Tester', pct: 60 }, { name: 'Bob Pal', pct: 30 }] }, 'POST', tok); assert.equal(bad.status, 400); assert.match(bad.json.error, /100%/);
  const ph = await call('m/mgmt/house', { address: '2 Part St', units: 2, who: 'partners', partners: [{ name: 'Ann Tester', pct: 60 }, { name: 'Bob Pal', pct: 40 }] }, 'POST', tok); assert.equal(ph.status, 200, ph.text);
  f = (await call('m/x53/features', null, 'GET', tok)).json; assert.equal(f.partners, true); assert.equal(f.mgmt, false);
  st = (await call('m/x52/setup', null, 'GET', tok)).json; const ow = st.items.find(i => i.k === 'owners'); assert.ok(ow && ow.done, 'owners row shows and ticks'); assert.equal(st.total, st.items.length);
  const o = (await call('m/x53/own/' + ph.json.id, null, 'GET', tok)).json; assert.equal(o.mode, 'partners'); assert.deepEqual(o.partners.map(p => [p.name, p.pct]), [['Ann Tester', 60], ['Bob Pal', 40]]);
  assert.equal((await call('me', null, 'GET', main)).json.f53.main, true, 'main company unchanged');
});
test('who owns it can be changed later; I manage it turns management on and adds the fee row', { skip: !PW }, async () => {
  const two = await call('m/x53/own/1', { mode: 'partners', partners: [{ name: 'A', pct: 50 }, { name: 'B', pct: 40 }] }, 'POST', tok); assert.equal(two.status, 400);
  const dup = await call('m/x53/own/1', { mode: 'partners', partners: [{ name: 'Bob Pal', pct: 50 }, { name: 'bob pal', pct: 50 }] }, 'POST', tok); assert.equal(dup.status, 400);
  const m = await call('m/x53/own/1', { mode: 'managed', owner_name: 'Dan Owner', owner_phone: '609-555-0101' }, 'POST', tok); assert.equal(m.status, 200, m.text); assert.equal(m.json.mode, 'managed'); assert.equal(m.json.owner.name, 'Dan Owner');
  const f = (await call('m/x53/features', null, 'GET', tok)).json; assert.equal(f.mgmt, true); assert.equal((await call('me', null, 'GET', tok)).json.mgmt, true, 'management mode on');
  let st = (await call('m/x52/setup', null, 'GET', tok)).json; const r = st.items.find(i => i.k === 'mgfee'); assert.ok(r && !r.done);
  assert.equal((await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '' }, 'POST', tok)).status, 400, 'a fee is needed');
  const d = await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '7', fee_min: '50', leasing_type: 'pct', leasing_pct: '50', late_share_pct: '50' }, 'POST', tok); assert.equal(d.status, 200, d.text); assert.equal(d.json.def.fee_min, 5000);
  st = (await call('m/x52/setup', null, 'GET', tok)).json; assert.ok(st.items.find(i => i.k === 'mgfee').done, 'fee row ticks');
  const back = await call('m/x53/own/2', { mode: 'mine' }, 'POST', tok); assert.equal(back.json.mode, 'mine');
});
test('management fees: company default for owners with no terms, per-house override, late-fee share', { skip: !PW }, async () => {
  const pr = (await call('m/properties/1', null, 'GET', tok)).json; const uid = pr.units[0].unit_id;
  const tn = await call('m/tenants', { first: 'Tia', last: 'Fee', email: 'tia53@example.com', phone: '', unit_id: uid, rent: '1500.00', start: M + '-01', deposit: '0' }, 'POST', tok); assert.equal(tn.status, 200, tn.text);
  assert.equal((await call('m/ledger', { kind: 'payment', lease_id: tn.json.lease_id, amount: '1500.00', date: T, method: 'Cash', deposit_to: 'undeposited' }, 'POST', tok)).status, 200);
  assert.equal((await call('m/ledger', { kind: 'latefee', lease_id: tn.json.lease_id, amount: '50.00', date: T }, 'POST', tok)).status, 200);
  const fees = async () => (await call('m/mgmt/pay?month=' + M, null, 'GET', tok)).json.rows.find(r => r.name === 'Dan Owner').fee_lines;
  let L = await fees(); const mg = L.find(l => l.kind === 'mgmt'); assert.equal(mg.amount, 10500, '7% of 1,500 collected'); assert.ok(L.find(l => l.kind === 'leasing' && l.amount === 75000), 'leasing 50% of first month');
  assert.ok(!L.some(l => l.kind === 'latefee'), 'd54: the 50.00 late fee is charged but not collected yet, so no share (was: half of it as charged)');
  const ov = await call('m/x53/mgfee/prop/1', { fee_type: 'flat', fee_flat: '99', leasing_type: 'none' }, 'POST', tok); assert.equal(ov.status, 200);
  L = await fees(); assert.equal(L.find(l => l.kind === 'mgmt').amount, 9900, 'the house fee wins'); assert.ok(!L.some(l => l.kind === 'leasing'), 'no leasing fee on this house'); assert.ok(!L.some(l => l.kind === 'latefee'));
  const g = (await call('m/x53/mgfee', null, 'GET', tok)).json; assert.equal(g.props.length, 1); assert.equal(g.props[0].override.fee_flat, 9900);
  await call('m/x53/mgfee/prop/1', { use_default: true }, 'POST', tok); L = await fees(); assert.equal(L.find(l => l.kind === 'mgmt').amount, 10500);
});
test('top search: own accounts by number or name, owners, nothing from another company', { skip: !PW }, async () => {
  const S = async (q, t) => (await call('m/search?q=' + encodeURIComponent(q), null, 'GET', t)).json.results;
  const a = await S('4100', tok); assert.ok(a.some(r => r.type === 'account' && /^4100 /.test(r.title)));
  const own = await S('Dan', tok); assert.ok(own.some(r => r.type === 'owner' && r.title === 'Dan Owner' && /^customer\//.test(r.href)));
  const bob = await S('Bob Pal', tok); assert.ok(bob.some(r => r.type === 'owner' && /^property\//.test(r.href)));
  const mt = sq.prepare('SELECT first, last FROM tenants ORDER BY id LIMIT 1').get(); const nm = mt.last;
  assert.ok((await S(nm, main)).some(r => r.type === 'tenant'), 'main company finds its tenant');
  const leak = await S(nm, tok); assert.ok(!leak.some(r => ['tenant', 'lease', 'unit', 'entry'].includes(r.type)), 'no tenant of the main company: ' + JSON.stringify(leak.slice(0, 3)));
  const mainProp = sq.prepare('SELECT name FROM properties ORDER BY id LIMIT 1').get().name;
  assert.ok(!(await S(mainProp, tok)).some(r => r.type === 'property'), 'no property of the main company');
  assert.ok(!(await S('Dan Owner', main)).some(r => r.title === 'Dan Owner'), 'the main company does not see this owner');
});
