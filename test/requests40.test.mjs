// node --test test/requests40.test.mjs — v40: repair request status + close reason, reopen, tenant category/urgency, old requests migrated
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker40.mjs');
const worker = (await import('/tmp/pm-test-worker40.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') } };
let token = '';
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', authorization: 'Bearer ' + (tok || token) }, body: body ? JSON.stringify(body) : undefined }), env, {}); return { status: r.status, json: await r.json() }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1], TPW = (LOG.match(/tenant@example\.com\s+password:\s*(\S+)/) || [])[1];
const row = id => sq.prepare('SELECT * FROM work_orders WHERE id=?').get(id);
let legacy = [], pid;
test('sign in; old requests are migrated without losing their status', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); token = r.json.token;
  pid = sq.prepare('SELECT id FROM properties ORDER BY id LIMIT 1').get().id;
  // requests saved before v40 (old status words, old priority, old category labels)
  for (const [st, pr, cat] of [['new', 'emergency', 'Plumbing'], ['assigned', 'high', 'Doors & locks'], ['scheduled', 'normal', 'Appliance'], ['in_progress', 'low', 'Heating'], ['completed', 'normal', 'Pest'], ['closed', 'normal', 'Roofing gutters']])
    legacy.push(Number(sq.prepare(`INSERT INTO work_orders(property_id,title,description,category,priority,status,created,updated) VALUES(?,?,?,?,?,?,?,?)`).run(pid, 'Old ' + st, '', cat, pr, st, '2026-01-02T12:00:00.000Z', '2026-01-02T12:00:00.000Z').lastInsertRowid));
  const x = (await call('m/x40/reqs')).json; const by = Object.fromEntries(x.items.map(w => [w.id, w]));
  assert.deepEqual(legacy.map(id => by[id].grp), ['open', 'open', 'progress', 'progress', 'completed', 'closed']);
  assert.deepEqual(legacy.map(id => by[id].urg), ['emergency', 'urgent', 'soon', 'low', 'soon', 'soon']);
  assert.deepEqual(legacy.map(id => by[id].cat), ['plumbing', 'doors', 'appliances', 'heating', 'pests', 'other']);
  assert.equal(by[legacy[5]].cat_label, 'Roofing gutters', 'unknown old category shown as written');
  for (const [i, st] of ['new', 'assigned', 'scheduled', 'in_progress', 'completed', 'closed'].entries()) { const w = row(legacy[i]); assert.equal(w.status, st, 'stored status untouched'); assert.equal(w.status_old, st, 'original status kept'); }
  assert.equal(row(legacy[0]).priority, 'emergency'); assert.ok(x.counts.by_urg.emergency >= 1);
  const seeded = sq.prepare(`SELECT COUNT(*) n FROM work_orders WHERE status_old IS NULL OR urgency IS NULL`).get().n; assert.equal(seeded, 0, 'every request migrated');
  // emergency sorts first on the list screen data
  assert.ok(x.statuses.waiting && x.reasons.duplicate && x.cats.length >= 18);
});
test('close needs a reason; Other needs words; closing records who/when/reason/note', { skip: !PW }, async () => {
  const id = legacy[1];
  let r = await call(`m/x40/req/${id}/status`, { status: 'closed' }); assert.equal(r.status, 400); assert.match(r.json.error, /reason/i);
  r = await call(`m/workorders/${id}`, { status: 'closed', note: 'x' }); assert.equal(r.status, 400, 'old save path refuses a close without a reason too');
  r = await call(`m/x40/req/${id}/status`, { status: 'closed', reason: 'other' }); assert.equal(r.status, 400);
  assert.equal(row(id).status, 'assigned', 'nothing changed');
  r = await call(`m/x40/req/${id}/status`, { status: 'closed', reason: 'duplicate', note: 'same as #1', date: '2026-10-19' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const w = row(id); assert.equal(w.status, 'closed'); assert.equal(w.close_reason, 'duplicate'); assert.equal(w.close_note, 'same as #1'); assert.equal(w.closed, '2026-10-19'); assert.ok(w.closed_by);
  assert.equal(r.json.grp, 'closed'); assert.equal(r.json.reason_label, 'Duplicate');
  const ev = sq.prepare(`SELECT * FROM wo_events WHERE wo_id=? ORDER BY id DESC LIMIT 1`).get(id); assert.equal(ev.kind, 'closed'); assert.match(ev.body, /Duplicate/); assert.ok(ev.author && ev.created);
  r = await call(`m/workorders/${legacy[0]}`, { status: 'closed', close_reason: 'other', reason_other: 'Owner fixed it himself' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(row(legacy[0]).close_other, 'Owner fixed it himself');
});
test('reopen works and keeps the history', { skip: !PW }, async () => {
  const id = legacy[1];
  const r = await call(`m/x40/req/${id}/status`, { status: 'open', note: 'tenant says it is back' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  const w = row(id); assert.equal(grpOf(w.status), 'open'); assert.equal(w.closed, null); assert.equal(w.close_reason, null);
  const evs = sq.prepare(`SELECT kind, body FROM wo_events WHERE wo_id=? ORDER BY id`).all(id); assert.ok(evs.some(e => e.kind === 'closed')); assert.match(evs[evs.length - 1].body, /Reopened/);
  // waiting on vendor, then in progress, then completed
  for (const [st, want] of [['waiting', 'waiting'], ['progress', 'in_progress'], ['completed', 'completed']]) { const q = await call(`m/x40/req/${id}/status`, { status: st, wait_on: 'vendor' }); assert.equal(q.status, 200); assert.equal(row(id).status, want); }
  assert.equal(row(id).wait_on, null);
  // the old priority control (triage card) keeps urgency in step
  const q2 = await call(`m/workorders/${id}`, { priority: 'emergency' }); assert.equal(q2.status, 200); assert.equal(row(id).urgency, 'emergency');
});
const grpOf = s => ({ new: 'open', assigned: 'open' }[s] || s);
test('tenant creates a request: category, subcategory, urgency, entry times, pets saved', { skip: !PW || !TPW }, async () => {
  const t = await call('login', { email: 'tenant@example.com', password: TPW }); assert.equal(t.status, 200); const tt = t.json.token;
  let r = await call('t/workorders', { problem: 'appliance', title: 'Dishwasher not draining', description: 'water sits at the bottom', cat40: 'appliances', subcat: 'Dishwasher', urg40: 'urgent', entry: 'yes', entry_times: 'Weekday evenings, Weekends · Tue after 5pm', pets: 'One dog', phone: '6095550123' }, 'POST', tt);
  assert.equal(r.status, 200, JSON.stringify(r.json)); let w = row(r.json.id);
  assert.equal(w.category, 'Appliances'); assert.equal(w.subcat, 'Dishwasher'); assert.equal(w.urgency, 'urgent'); assert.equal(w.priority, 'high'); assert.equal(w.entry_times, 'Weekday evenings, Weekends · Tue after 5pm'); assert.equal(w.pets, 'One dog'); assert.equal(w.entry_ok, 1);
  r = await call('t/workorders', { title: 'Other thing', cat40: 'other', cat_other: 'Mailbox', urg40: 'low', pets: 'no' }, 'POST', tt);
  assert.equal(r.status, 200, JSON.stringify(r.json)); w = row(r.json.id); assert.equal(w.category, 'Other'); assert.equal(w.cat_other, 'Mailbox'); assert.equal(w.urgency, 'low'); assert.equal(w.priority, 'low'); assert.equal(w.pets, 'no');
  // gas smell stays an emergency even if "Soon" was tapped
  r = await call('t/workorders', { problem: 'gas', cat40: 'other', urg40: 'soon' }, 'POST', tt); assert.equal(r.status, 200); assert.equal(row(r.json.id).urgency, 'emergency');
  // manager "New request"
  r = await call('m/workorders', { title: 'Ceiling drip', property_id: pid, cat40: 'roof', subcat: 'Ceiling leak', urg40: 'emergency', entry_ok: 0, entry_times: 'Call first', pets: 'Cat', dispatch: false }); assert.equal(r.status, 200, JSON.stringify(r.json));
  w = row(r.json.id); assert.equal(w.category, 'Roof / Leak from ceiling'); assert.equal(w.urgency, 'emergency'); assert.equal(w.priority, 'emergency'); assert.equal(grpOf(w.status), 'open');
  const x = (await call('m/x40/reqs')).json; const it = x.items.find(z => z.id === r.json.id); assert.equal(it.urg_label, 'Emergency'); assert.equal(it.cat_label, 'Roof / Leak from ceiling');
});
