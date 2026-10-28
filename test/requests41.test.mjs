// node --test test/requests41.test.mjs — d41: tenant quick fix. "That fixed it" makes NO request; "Still need help → continue" records steps_tried for the manager.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker41.mjs');
const worker = (await import('/tmp/pm-test-worker41.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') } };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, json: j }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1], TPW = (LOG.match(/tenant@example\.com\s+password:\s*(\S+)/) || [])[1];
const nWO = () => sq.prepare('SELECT COUNT(*) n FROM work_orders').get().n;
let mtok = '', ttok = '', ptok = '';
test('sign in (manager + tenant) and find a public repair link', { skip: !PW || !TPW }, async () => {
  let r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); mtok = r.json.token;
  r = await call('login', { email: 'tenant@example.com', password: TPW }); assert.equal(r.status, 200); ttok = r.json.token;
  await call('m/x40/reqs', null, 'GET', mtok); // makes sure the request tables exist
  r = await call('t/fixinfo', null, 'GET', ttok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const p = sq.prepare(`SELECT p.id FROM properties p JOIN units u ON u.property_id=p.id ORDER BY p.id LIMIT 1`).get();
  ptok = sq.prepare('SELECT fix_token FROM properties WHERE id=?').get(p.id).fix_token || 'a41b41c41d';
  sq.prepare('UPDATE properties SET fix_token=? WHERE id=?').run(ptok, p.id); // the repair link the office hands out for this house
  r = await call('pub/fix/' + ptok); assert.equal(r.status, 200, JSON.stringify(r.json));
});
test('"That fixed it" creates no request (tenant portal and public link); it is only logged as fixed', { skip: !PW || !TPW }, async () => {
  const before = nWO(); const logs = sq.prepare(`SELECT COUNT(*) n FROM selfhelp_log WHERE outcome='fixed'`).get().n;
  let r = await call('t/selfhelp', { problem: 'drain', lang: 'en' }, 'POST', ttok); assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call(`pub/fix/${ptok}/fixed`, { problem: 'toilet_run', name: 'Test Tenant', phone: '6095550123', lang: 'en' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(nWO(), before, 'no work order was created');
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM selfhelp_log WHERE outcome='fixed'`).get().n, logs + 2);
  assert.equal(sq.prepare(`SELECT wo_id FROM selfhelp_log ORDER BY id DESC LIMIT 1`).get().wo_id, null);
});
test('"Still need help → continue" records steps_tried; the manager sees them', { skip: !PW || !TPW }, async () => {
  const tried = ['Clean the stopper', 'Run very hot water for 1 minute', 'Use a sink plunger 10 times', 'Baking soda + vinegar'];
  let r = await call('t/workorders', { problem: 'drain', title: 'Plumbing – Clogged drain', description: 'still slow', cat40: 'plumbing', subcat: 'Clogged drain', urg40: 'soon', entry: 'yes', entry_times: 'Weekends', pets: 'no', phone: '6095550123', tried, lang: 'en' }, 'POST', ttok);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const w = sq.prepare('SELECT * FROM work_orders WHERE id=?').get(r.json.id);
  assert.deepEqual(JSON.parse(w.selfhelp).steps_tried, tried); assert.equal(w.urgency, 'soon'); assert.equal(w.subcat, 'Clogged drain'); assert.equal(w.category, 'Plumbing');
  const d = await call(`m/workorders/${r.json.id}`, null, 'GET', mtok); assert.equal(d.status, 200, JSON.stringify(d.json));
  assert.deepEqual(d.json.maint.selfhelp.steps_tried, tried, 'manager detail carries the quick fixes tried (shown as "Tenant tried the quick fixes first")');
  // public link: same
  const before = nWO();
  r = await call(`pub/fix/${ptok}/submit`, { problem: 'toilet_run', title: 'Plumbing – Toilet', cat40: 'plumbing', subcat: 'Toilet', urg40: 'urgent', name: 'Test Tenant', phone: '6095550123', entry: 'call', tried: ['Lift the tank lid'], lang: 'en' });
  assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(nWO(), before + 1);
  const w2 = sq.prepare('SELECT * FROM work_orders WHERE id=?').get(r.json.id); assert.deepEqual(JSON.parse(w2.selfhelp).steps_tried, ['Lift the tank lid']); assert.equal(w2.urgency, 'urgent');
  // emergency skips the quick fix: nothing tried, still emergency
  r = await call('t/workorders', { problem: 'sparks', cat40: 'electrical', subcat: 'Sparks / burning smell', urg40: 'emergency', urgency: 'urgent', tried: [], phone: '6095550123' }, 'POST', ttok);
  assert.equal(r.status, 200); const w3 = sq.prepare('SELECT * FROM work_orders WHERE id=?').get(r.json.id); assert.equal(w3.urgency, 'emergency'); assert.deepEqual(JSON.parse(w3.selfhelp).steps_tried, []);
});
