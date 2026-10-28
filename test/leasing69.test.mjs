// d69: online rental applications + sandbox screening, pay-rent links + autopay (test mode), vacancy listings + feed. Every feature is a per-company setting, off by default.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker69.mjs');
const worker = (await import('/tmp/pm-test-worker69.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) } };
const call = async (p, body, tok, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j }; };
const L = fs.readFileSync('demo-logins.local.txt', 'utf8'); const pw = e => (L.match(new RegExp(e.replace('.', '\\.') + '\\s+password:\\s*(\\S+)')) || [])[1];
const login = async (e, p) => (await call('login', { email: e, password: p || pw(e) })).json.token;
const pub = async (p, body, hdrs = {}, method) => { const r = await worker.fetch(new Request('http://x/api/pub/x69/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...hdrs }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t, headers: r.headers }; };
const page = async (p) => { const r = await worker.fetch(new Request('http://x' + p), env, { waitUntil: () => {} }); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') }; };
const tb = async (M) => { const t = (await call('m/reports/trial-balance', null, M)).json.totals; return [t.debit, t.credit]; };
const T = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let M, K, unit, LST, TOK, APP;
test('everything is off by default; public endpoints need the company key', async () => {
  M = await login('manager@example.com');
  assert.equal((await call('m/x69/mode', null, M)).json.pay, 'off', 'light read for the tenant page');
  const c = (await call('m/x69/cfg', null, M)).json; assert.equal(c.cfg.pay.mode, 'off'); assert.equal(c.cfg.app.on, false); assert.equal(c.cfg.lst.on, false);
  K = c.links.apply.split('k=1-')[1]; assert.match(K, /^[0-9a-f]{12}$/);
  assert.ok(!JSON.stringify(c).includes('sk_'), 'no secrets');
  assert.equal((await pub('co', null, { 'x-k': 'nope' })).status, 404);
  assert.equal((await pub('listings', null, { 'x-k': K })).status, 404, 'listings off');
  assert.equal((await pub('app/start', { first: 'A', last: 'B', email: 'a@b.co', phone: '2125551212', unit_id: 1 }, { 'x-k': K })).status, 403, 'applications off');
});
test('settings: test mode, sandbox screening, listings on; live Stripe keys refused', async () => {
  const r = await call('m/x69/cfg', { pay: { mode: 'test', card_fee_by: 'tenant' }, app: { on: true, fee: '45', docs: ['id', 'income'] }, scr: { provider: 'sandbox' }, lst: { on: true, contact_name: 'Leasing office' } }, M); assert.equal(r.status, 200);
  assert.equal(r.json.cfg.app.fee, 4500); assert.equal(r.json.cfg.pay.mode, 'test');
  assert.equal((await call('m/x69/cfg', { pay: { mode: 'stripe' } }, M)).status, 400, 'stripe needs a connected account');
  assert.equal((await call('m/x69/cfg', { stripe: { sk: 'sk_live_' + 'a'.repeat(24), pk: 'pk_live_' + 'a'.repeat(24) } }, M)).status, 400, 'live keys refused');
  assert.equal((await call('m/x69/cfg', { stripe: { sk: 'hello', pk: 'x' } }, M)).status, 400);
  const s = (await call('m/x69/cfg', null, M)).json; assert.equal(s.secrets.stripe_sk, ''); assert.equal(s.platform_connect, false);
  assert.equal((await call('m/x69/connect', null, M)).status, 409, 'Connect needs the platform account');
});
test('listing on a vacant unit: public page data, photo guard, Zillow-style feed', async () => {
  const x = (await call('m/x69/listings', null, M)).json; unit = x.units.find(u => u.vacant); assert.ok(unit, 'demo has a vacant unit');
  assert.equal((await call('m/x69/listings', { unit_id: unit.id, rent: '0' }, M)).status, 400);
  const r = await call('m/x69/listings', { unit_id: unit.id, title: 'Sunny 2 bed', rent: '2450', deposit: '2450', beds: 2, baths: 1, sqft: 850, available: T, descr: 'Bright & quiet <b>', status: 'active' }, M); assert.equal(r.status, 200); LST = r.json.id;
  const l = (await pub('listings', null, { 'x-k': K })).json; assert.equal(l.listings.length, 1); assert.equal(l.listings[0].rent, 245000);
  assert.equal((await pub('photo/1', null, { 'x-k': K })).status, 404, 'only photos of active listings are public');
  const f = await pub(`feed.xml?co=1&k=${K}`); assert.equal(f.status, 200); assert.match(f.headers.get('content-type'), /xml/); assert.match(f.text, /<hotPadsItems version="2.1">/); assert.match(f.text, /<price>2450<\/price>/); assert.match(f.text, /Bright &amp; quiet &lt;b&gt;/);
  assert.equal((await page(`/apply/1-${K}/${LST}`)).status, 302, 'old pretty links redirect to the static page'); assert.equal((await pub(`feed.xml?co=1&k=${'0'.repeat(12)}`)).status, 404); assert.match(f.text, /apply\/\?k=1-/);
});
test('application: start, save, documents, consent + test-card fee, sandbox screening, approve to tenant + lease', async () => {
  const before = await tb(M);
  assert.equal((await pub('app/start', { first: 'Jordan', last: 'Rivera', email: 'bad', phone: '2125551212', listing_id: LST }, { 'x-k': K })).status, 400);
  const s = await pub('app/start', { first: 'Jordan', last: 'Rivera', email: 'jordan@example.com', phone: '(212) 555-1212', listing_id: LST }, { 'x-k': K }); assert.equal(s.status, 200); TOK = s.json.tok; APP = s.json.id;
  assert.equal((await pub('app/' + 'f'.repeat(32), null, { 'x-k': K })).status, 404);
  assert.equal((await pub(`app/${TOK}/save`, { step: 2, dob: '1994-03-02', move_in: T, addr: '1 Main St', employer: 'Acme', income: '9000', evil: 'x' }, { 'x-k': K })).status, 200);
  let a = (await pub('app/' + TOK, null, { 'x-k': K })).json; assert.equal(a.data.employer, 'Acme'); assert.equal(a.data.evil, undefined);
  assert.equal((await pub(`app/${TOK}/submit`, { consent: true, sign: 'Jordan Rivera', card: { number: '4242424242424242', exp: '12/30', cvc: '123' } }, { 'x-k': K })).status, 400, 'documents required');
  for (const kind of ['id', 'income']) { const fd = new FormData(); fd.append('kind', kind); fd.append('file', new Blob([new Uint8Array([255, 216, 255, 0])], { type: 'image/jpeg' }), kind + '.jpg');
    const r = await worker.fetch(new Request('http://x/api/pub/x69/app/' + TOK + '/file', { method: 'POST', headers: { 'x-k': K }, body: fd }), env, { waitUntil: () => {} }); assert.equal(r.status, 200); }
  assert.equal((await pub(`app/${TOK}/submit`, { consent: false, sign: 'Jordan Rivera' }, { 'x-k': K })).status, 400, 'consent required');
  assert.equal((await pub(`app/${TOK}/submit`, { consent: true, sign: 'Jordan Rivera', card: { number: '4000000000000002', exp: '12/30', cvc: '123' } }, { 'x-k': K })).status, 402, 'declined test card');
  assert.equal((await pub(`app/${TOK}/submit`, { consent: true, sign: 'Jordan Rivera', card: { number: '4111111111111111', exp: '12/30', cvc: '123' } }, { 'x-k': K })).status, 400, 'real-looking numbers never accepted in test mode');
  const sub = await pub(`app/${TOK}/submit`, { consent: true, sign: 'Jordan Rivera', card: { number: '4242 4242 4242 4242', exp: '12/30', cvc: '123' } }, { 'x-k': K }); assert.equal(sub.status, 200);
  assert.equal(sub.json.fee_status, 'paid'); assert.equal(sub.json.screening.status, 'waiting_applicant'); assert.equal(sub.json.status, 'screening');
  const v = await pub(`app/${TOK}/verify`, { confirm: true }, { 'x-k': K }); assert.equal(v.status, 200); assert.equal(v.json.screening.status, 'complete'); assert.equal(v.json.status, 'review');
  const after = await tb(M); assert.equal(after[0], after[1]); assert.equal(after[0] - before[0], 4500, 'fee posted to the books once');
  const list = (await call('m/x69/apps', null, M)).json; const row = list.apps.find(z => z.id === APP); assert.equal(row.status, 'review'); assert.ok(row.score >= 548); assert.equal(row.sample, true);
  const det = (await call('m/x69/apps/' + APP, null, M)).json; assert.equal(det.screening.report.sample, true); assert.ok(det.screening.report.eviction); assert.equal(det.docs.length, 2); assert.ok(det.applicant_id);
  const ap = await call(`m/x26/applicants/${det.applicant_id}/approve`, { rent: '2450', deposit: '2450', start: T }, M); assert.equal(ap.status, 200);
  const d2 = (await call('m/x69/apps/' + APP, null, M)).json; assert.equal(d2.status, 'approved'); assert.ok(d2.tenant_id);
  assert.equal((await pub(`app/${TOK}/save`, { step: 2 }, { 'x-k': K })).status, 409);
});
test('sandbox eviction record + decline / reopen', async () => {
  const s = await pub('app/start', { first: 'Pat', last: 'Eviction', email: 'pat@example.com', phone: '2125550000', unit_id: unit.id }, { 'x-k': K }); const tok = s.json.tok;
  await pub(`app/${tok}/save`, { step: 4, move_in: T, income: '3000' }, { 'x-k': K });
  await call('m/x69/cfg', { app: { docs: [] } }, M);
  const r = await pub(`app/${tok}/submit`, { consent: true, sign: 'Pat Eviction', card: { number: '4242424242424242', exp: '01/31', cvc: '999' } }, { 'x-k': K }); assert.equal(r.status, 200);
  await pub(`app/${tok}/verify`, { confirm: true }, { 'x-k': K });
  const det = (await call('m/x69/apps/' + s.json.id, null, M)).json; assert.equal(det.screening.report.eviction.records.length, 1); assert.equal(det.screening.report.recommendation, 'Decline');
  assert.equal((await call(`m/x69/apps/${s.json.id}/decline`, {}, M)).status, 200); assert.equal((await call('m/x69/apps/' + s.json.id, null, M)).json.status, 'declined');
  assert.equal((await call(`m/x69/apps/${s.json.id}/reopen`, {}, M)).status, 200);
});
test('pay link: card payment posts to the tenant ledger, fee rules, autopay, revoke, test entries removable', async () => {
  const ts = (await call('m/x69/pay', null, M)).json; const t = ts.tenants[0]; assert.ok(t);
  const pl = (await call('m/x69/paylink/' + t.id, {}, M)).json; assert.match(pl.link, /\/pay\/\?t=1-[0-9a-f]{24}$/); assert.match(pl.message, /pay your rent online/);
  const tok = pl.link.split('t=1-')[1]; const info = (await pub('pay/' + tok)).json; assert.equal(info.test, true); assert.ok(!('email' in info)); assert.ok(info.fees);
  const before = await tb(M); const bal0 = info.balance;
  assert.equal((await pub(`pay/${tok}/pay`, { amount: '100', method: 'card', card: { number: '4000000000009995', exp: '12/30', cvc: '123' } })).status, 402);
  const p = await pub(`pay/${tok}/pay`, { amount: '100', method: 'card', autopay: true, day: 3, card: { number: '4242424242424242', exp: '12/30', cvc: '123' } }); assert.equal(p.status, 200);
  assert.equal(p.json.amount, 10000); assert.equal(p.json.fee, 290, 'd80: credit surcharge capped at min(3%, configured 2.9%)'); assert.equal(p.json.autopay.day, 3);
  const after = await tb(M); assert.equal(after[0], after[1]);
  const info2 = (await pub('pay/' + tok)).json; assert.equal(info2.balance, bal0 - 10000); assert.equal(info2.autopay.day, 3); assert.equal(info2.history.length, 1);
  await call('m/x69/cfg', { pay: { ach_fee_by: 'company' } }, M);
  assert.equal((await pub(`pay/${tok}/pay`, { amount: '50', method: 'ach', bank: { routing: '021000021', account: '123' } })).status, 400, 'test mode bank numbers only');
  const b = await pub(`pay/${tok}/pay`, { amount: '50', method: 'ach', bank: { routing: '110000000', account: '000123456789' } }); assert.equal(b.status, 200); assert.equal(b.json.fee, 0);
  const pays = (await call('m/x69/pay', null, M)).json; assert.ok(pays.payments.filter(z => z.kind === 'Pay link').length >= 2); assert.ok(pays.tenants.find(z => z.id === t.id).autopay);
  const nl = (await call('m/x69/paylink/' + t.id, { op: 'new' }, M)).json; assert.notEqual(nl.link, pl.link); assert.equal((await pub('pay/' + tok)).status, 404, 'old link revoked');
  const cl = await call('m/x69/cleartest', { confirm: true }, M); assert.equal(cl.status, 200, cl.text); assert.ok(cl.json.voided >= 4, JSON.stringify(cl.json));
  const fin = await tb(M); assert.equal(fin[0], fin[1]);
  const tok2 = nl.link.split('t=1-')[1]; const info3 = (await pub('pay/' + tok2)).json; assert.equal(info3.balance, bal0, 'test payments voided'); assert.equal(info3.autopay, null);
  await call('m/x69/cfg', { pay: { mode: 'off' } }, M); assert.equal((await pub('pay/' + tok2)).status, 403);
});
test('stripe webhook needs a valid signature', async () => {
  assert.equal((await pub('stripe/hook', { type: 'x' })).status, 400);
});
