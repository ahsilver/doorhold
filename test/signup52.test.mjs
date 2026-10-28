// node --test test/signup52.test.mjs — d52: short sign-up (step 2 optional: size + phone), Home "Finish setting up" checklist
// (only companies that signed up with the short form; never company 1), items tick off from real data, hide / show.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker52.mjs');
const worker = (await import('/tmp/pm-test-worker52.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const INDEX = '<!doctype html><html><head><title>ACME Management · Property Manager</title><meta name="description" content="x"><meta property="og:title" content="ACME"><meta property="og:description" content="y"></head><body><div id="root"></div></body></html>';
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response(INDEX, { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-12-02' };
const raw = async (p, body, method, tok) => worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} });
const call = async (p, body, method, tok) => { const r = await raw(p, body, method, tok); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t, headers: r.headers }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '', ttok = '', co = 0;
const SHOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const LISTS = ['m/properties', 'm/tenants', 'm/vendors', 'm/owners', 'm/bills', 'm/bank', 'm/txns', 'm/workorders', 'm/x47/customers', 'm/loans'];
const n = j => Array.isArray(j) ? j.length : j && typeof j === 'object' ? Object.values(j).filter(Array.isArray).reduce((s, a) => s + a.length, 0) : 0;


let co52 = 0, t52 = '';
test('main company: no checklist, cannot hide one, stays onboarded', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  const st = await call('m/x52/setup', null, 'GET', tok); assert.equal(st.status, 200); assert.equal(st.json.show, false); assert.equal(st.json.eligible, false);
  assert.equal((await call('m/x52/setup/hide', {}, 'POST', tok)).status, 400);
  assert.equal((await call('me', null, 'GET', tok)).json.onboarded, true);
  assert.equal(sq.prepare(`SELECT v FROM settings WHERE k='setup52'`).get(), undefined, 'company 1 is never marked');
});
test('sign-up step 1 marks the new company; step 2 (size + phone) is optional and writes no late fees / banks', { skip: !PW }, async () => {
  const r = await call('signup', { name: 'Sam Short', company: 'Short Form Rentals', email: 'sam52@example.com', password: 'ShortForm-52' });
  assert.equal(r.status, 200, r.text); t52 = r.json.token; co52 = r.json.company_id; assert.ok(co52 > 1);
  assert.ok(sq.prepare(`SELECT v FROM c${co52}_settings WHERE k='setup52'`).get(), 'setup52 written');
  assert.equal((await call('me', null, 'GET', t52)).json.onboarded, false);
  let st = (await call('m/x52/setup', null, 'GET', t52)).json;
  assert.equal(st.show, true); assert.equal(st.done, 1); assert.equal(st.total, 6, 'd53: the owners & LLCs row shows only once a house has partners or is managed'); assert.ok(!st.items.some(i => i.k === 'owners')); assert.equal(st.next, 'property');
  assert.deepEqual(st.items.map(i => i.k), ['account', 'property', 'tenants', 'bank', 'opening', 'late']);
  const ob = await call('m/onboard', { zelle_to: 'sam52@example.com', size52: { properties: '2-5', units: 8 }, phone52: '555-201-3344' }, 'POST', t52); assert.equal(ob.status, 200, ob.text);
  assert.deepEqual(ob.json, { ok: true, entities: 0, properties: 0, units: 0, tenants: 0, banks: 0 });
  const S = Object.fromEntries(sq.prepare(`SELECT k,v FROM c${co52}_settings`).all().map(x => [x.k, x.v]));
  assert.deepEqual(JSON.parse(S.size52), { properties: '2-5', units: 8 }); assert.equal(S.office_phone, '555-201-3344'); assert.equal(S.zelle_to, 'sam52@example.com');
  assert.equal(S.lf44co, undefined, 'no late-fee rule is asked or written at sign-up'); assert.equal(S.late_fee_auto, undefined);
  const o = sq.prepare('SELECT status, owner_phone FROM orgs WHERE id=?').get(co52); assert.equal(o.status, 'active');
  assert.equal((await call('me', null, 'GET', t52)).json.onboarded, true);
  st = (await call('m/x52/setup', null, 'GET', t52)).json; assert.equal(st.show, true); assert.equal(st.done, 1);
});
test('skip: an empty step 2 also finishes sign-up', { skip: !PW }, async () => {
  const r = await call('signup', { name: 'Kim Skip', company: 'Skip Homes', email: 'kim52@example.com', password: 'SkipHomes-52' }); assert.equal(r.status, 200);
  const ob = await call('m/onboard', { zelle_to: 'kim52@example.com' }, 'POST', r.json.token); assert.equal(ob.status, 200);
  assert.equal((await call('me', null, 'GET', r.json.token)).json.onboarded, true);
  assert.equal((await call('m/x52/setup', null, 'GET', r.json.token)).json.done, 1);
});
test('items tick off by themselves from real data (late fees, bank + opening balance)', { skip: !PW }, async () => {
  const lf = await call('m/x44/company', { on: true, due_day: 1, grace: 4, t1: 'fixed', v1: '50' }, 'POST', t52); assert.equal(lf.status, 200, lf.text);
  let st = (await call('m/x52/setup', null, 'GET', t52)).json; assert.equal(st.items.find(i => i.k === 'late').done, true); assert.equal(st.done, 2); assert.equal(st.next, 'property');
  const bk = await call('m/bank-accounts', { institution: 'Test Bank', last4: '4411', name: 'Operating', opening_balance: '1000', start: '2026-12-01' }, 'POST', t52); assert.equal(bk.status, 200, bk.text);
  st = (await call('m/x52/setup', null, 'GET', t52)).json; assert.equal(st.items.find(i => i.k === 'bank').done, true); assert.equal(st.items.find(i => i.k === 'opening').done, true); assert.equal(st.done, 4); assert.ok(st.first_bank_id);
});
test('hide / show; the other company and company 1 are unaffected', { skip: !PW }, async () => {
  let st = (await call('m/x52/setup/hide', {}, 'POST', t52)).json; assert.equal(st.show, false); assert.equal(st.hidden, true);
  st = (await call('m/x52/setup', null, 'GET', t52)).json; assert.equal(st.show, false);
  st = (await call('m/x52/setup/show', {}, 'POST', t52)).json; assert.equal(st.show, true); assert.equal(st.hidden, false);
  assert.equal((await call('m/x52/setup', null, 'GET', tok)).json.show, false);
  assert.equal(sq.prepare(`SELECT v FROM settings WHERE k IN ('setup52','setup52_hidden','size52')`).all().length, 0, 'company 1 settings untouched');
});
