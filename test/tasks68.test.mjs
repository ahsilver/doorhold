// d68: tasks (manual + automatic, snooze / dismiss / done / assign, per company) and the platform owner's back office (sources, billing fields, visits)
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker68.mjs');
const worker = (await import('/tmp/pm-test-worker68.mjs?' + Date.now())).default;
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

const T = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let M;
test('manual tasks: add with due time, priority, property; snooze, done, reopen, dismiss, delete; history keeps who', async () => {
  M = await login('manager@example.com');
  const a = await call('x68/new', { title: 'Call PSEG tomorrow', due: T, due_time: '00:01', priority: 'high', property_id: 1, notes: 'meter' }, M); assert.equal(a.status, 200);
  let x = (await call('x68', null, M)).json; let t = x.items.find(i => i.key === 'm' + a.json.id);
  assert.equal(t.status, 'open'); assert.equal(t.priority, 'high'); assert.equal(t.overdue, true); assert.ok(t.property);
  assert.equal((await call('x68/new', { title: '  ' }, M)).status, 400);
  const s = await call(`x68/m/${a.json.id}/snooze`, { preset: '2d' }, M); assert.equal(s.status, 200);
  x = (await call('x68?box=1', null, M)).json; assert.ok(!x.items.some(i => i.key === 'm' + a.json.id), 'snoozed task leaves the box');
  x = (await call('x68', null, M)).json; t = x.items.find(i => i.key === 'm' + a.json.id); assert.ok(t.snooze_until > T); assert.equal(t.overdue, false);
  assert.equal((await call(`x68/m/${a.json.id}/snooze`, { until: T }, M)).status, 400);
  assert.equal((await call(`x68/m/${a.json.id}/done`, {}, M)).status, 200);
  x = (await call('x68', null, M)).json; t = x.items.find(i => i.key === 'm' + a.json.id); assert.equal(t.status, 'done'); assert.ok(t.closed_by_name);
  await call(`x68/m/${a.json.id}/reopen`, {}, M); await call(`x68/m/${a.json.id}/dismiss`, {}, M);
  x = (await call('x68', null, M)).json; assert.equal(x.items.find(i => i.key === 'm' + a.json.id).status, 'dismissed');
  assert.equal((await call(`x68/m/${a.json.id}/delete`, {}, M)).status, 200);
  x = (await call('x68', null, M)).json; assert.ok(!x.items.some(i => i.key === 'm' + a.json.id));
  // the old Tasks API (assistant) still reads the same table
  assert.equal((await call('m/tasks', null, M)).status, 200);
});
test('automatic tasks come from existing data; done / snooze / dismiss / assign stick to that one reminder', async () => {
  const x = (await call('x68', null, M)).json; const auto = x.items.filter(i => i.kind === 'auto' && i.status === 'open');
  const rules = new Set(auto.map(a => a.rule)); for (const r of ['rent', 'lease', 'bill']) assert.ok(rules.has(r), 'rule ' + r + ' fires on the demo data');
  assert.ok(x.rules.every(r => r.live));
  const k = auto.find(a => a.rule === 'bill').key; const p = 'x68/a/' + encodeURIComponent(k);
  assert.equal((await call(p + '/snooze', { preset: 'tomorrow', title: 'bill' }, M)).status, 200);
  let y = (await call('x68?box=1', null, M)).json; assert.ok(!y.items.some(i => i.key === k));
  assert.equal((await call(p + '/assign', { assignee_id: 999999 }, M)).status, 400, 'only people of this company');
  assert.equal((await call(p + '/assign', { assignee_id: x.me }, M)).status, 200);
  assert.equal((await call(p + '/dismiss', {}, M)).status, 200);
  y = (await call('x68', null, M)).json; const t = y.items.find(i => i.key === k); assert.equal(t.status, 'dismissed'); assert.equal(t.assignee_id, x.me);
  assert.equal((await call('x68/a/' + encodeURIComponent('evil:1') + '/done', {}, M)).status, 404);
  await call(p + '/reopen', {}, M);
  const tn = await login('tenant@example.com'); assert.equal((await call('x68', null, tn)).status, 403);
});
let C2;
test('a new company: sign-up source is recorded, its tasks are its own, and it cannot open the back office', async () => {
  const s = await call('signup', { name: 'Tia Two', company: 'Two Rentals 68', email: 'two68@example.com', password: 'TwoRent-6868', src68: { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'fall', referrer: 'https://l.facebook.com/x', landing: '/#/signup', vid: 'abcdef123456', click: 'fbclid' } });
  assert.equal(s.status, 200); C2 = s.json.token; const co = s.json.company_id;
  const g = sq.prepare('SELECT * FROM sig68 WHERE company_id=?').get(co); assert.equal(g.utm_campaign, 'fall'); assert.equal(g.referrer, 'l.facebook.com/x');
  const a = await call('x68/new', { title: 'Two only task' }, C2); assert.equal(a.status, 200);
  const x2 = (await call('x68', null, C2)).json; assert.ok(x2.items.some(i => i.title === 'Two only task'));
  const x1 = (await call('x68', null, M)).json; assert.ok(!x1.items.some(i => i.title === 'Two only task'), 'company 1 never sees company 2 tasks');
  assert.ok(!x2.users.some(u => x1.users.some(v => v.id === u.id)), 'assignees are only this company');
  assert.equal((await call(`x68/m/${a.json.id}/edit`, { assignee_id: x1.me }, C2)).status, 400);
  assert.equal((await call('x68/plat', null, C2)).status, 403);
});
test('back office: visits (bots skipped, one per person per page per day), sources, billing set by hand, MRR, cancelled', async () => {
  const v = (body, ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile') => worker.fetch(new Request('http://x/api/v68', { method: 'POST', headers: { 'user-agent': ua, 'content-type': 'text/plain' }, body: JSON.stringify(body) }), env, { waitUntil: () => {} });
  await v({ vid: 'visitor00001', page: 'signup', utm_source: 'google', utm_medium: 'cpc' }); await v({ vid: 'visitor00001', page: 'signup' }); await v({ vid: 'visitor00002', page: 'login' });
  await v({ vid: 'visitor00003', page: 'signup' }, 'Googlebot/2.1'); await v({ vid: 'x', page: 'signup' });
  assert.equal(sq.prepare('SELECT COUNT(*) n FROM vis68').get().n, 2);
  const p = (await call('x68/plat', null, M)); assert.equal(p.status, 200);
  const c = p.json.companies.find(x => x.name === 'Two Rentals 68'); assert.equal(c.source, 'Facebook'); assert.equal(c.status, 'trial'); assert.ok(c.usage.logins >= 1);
  assert.equal(p.json.visitors30, 2); assert.equal(p.json.totals.mrr, 0); assert.equal(p.json.billing_connected, false);
  assert.equal((await call('x68/plat/bill/' + c.id, { status: 'paying', mrr: '$99', plan: 'Standard', paid_since: T }, M)).status, 200);
  let q = (await call('x68/plat', null, M)).json; assert.equal(q.totals.paying, 1); assert.equal(q.totals.mrr, 9900);
  assert.equal((await call('x68/plat/bill/' + c.id, { status: 'cancelled', reason: 'Too small', mrr: '99' }, M)).status, 200);
  q = (await call('x68/plat', null, M)).json; assert.equal(q.totals.cancelled, 1); assert.equal(q.totals.mrr, 0); assert.equal(q.companies.find(x => x.id === c.id).cancelled_at, T);
  assert.equal((await call('x68/plat/bill/1', { status: 'paying' }, M)).status, 404, 'the main company is not a customer');
  assert.equal((await call('x68/plat/bill/' + c.id, { status: 'test' }, M)).status, 200);
  q = (await call('x68/plat', null, M)).json; assert.equal(q.totals.test, 1); assert.equal(q.totals.cancelled, 0); assert.ok(q.totals.signups >= 0 && !q.companies.filter(x => x.status !== 'test' && x.status !== 'deleted').some(x => x.id === c.id));
});
