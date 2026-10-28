// node --test test/signup53.test.mjs — d53: sign-up is one atomic batch (tables + chart + settings + login + session), a failure leaves nothing behind and
// answers with a clear error, "Try again" works (same email), a sign-up whose answer was lost signs in on retry, unfinished sign-ups are swept,
// and a request that never released the per-company lock no longer blocks other companies forever.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker53s.mjs');
const worker = (await import('/tmp/pm-test-worker53s.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
const F = { failOn: null, hangBatch: false, hangQuery: null };
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { if (F.hangQuery && F.hangQuery.test(this.sql)) { F.hangQuery = null; return new Promise(() => {}); } return { results: this._s().all(...this.args) }; }
  async first() { if (F.hangQuery && F.hangQuery.test(this.sql)) { F.hangQuery = null; return new Promise(() => {}); } return this._s().get(...this.args) ?? null; }
  async run() { if (F.failOn && F.failOn.test(this.sql)) { F.failOn = null; throw new Error('D1_ERROR: injected failure'); } const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { if (F.hangBatch) { F.hangBatch = false; return new Promise(() => {}); } sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) }, PM_PROV_MS: '400' };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
const tables = co => sq.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name LIKE ?`).get(`c${co}\\_%`.replace('\\', '')).n;
const ctables = co => sq.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().filter(r => r.name.startsWith(`c${co}_`)).length;
const org = co => sq.prepare('SELECT * FROM orgs WHERE id=?').get(co);
const lastOrg = () => sq.prepare('SELECT MAX(id) id FROM orgs').get().id;
let base = 0, main = '';
test('warm up: main company works', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); main = r.json.token;
  assert.equal((await call('m/x52/setup', null, 'GET', main)).status, 200);
  const s = await call('signup', { name: 'Ann Base', company: 'Base Rentals', email: 'base53@example.com', password: 'BaseRent-53' }); assert.equal(s.status, 200, s.text);
  base = ctables(s.json.company_id); assert.ok(base > 50, 'a full company has its tables: ' + base);
  assert.ok(sq.prepare(`SELECT COUNT(*) n FROM c${s.json.company_id}_gl_accounts`).get().n > 20, 'chart of accounts');
  assert.ok(sq.prepare(`SELECT v FROM c${s.json.company_id}_settings WHERE k='setup52'`).get(), 'checklist flag in the same batch');
  assert.equal((await call('m/x52/setup', null, 'GET', s.json.token)).json.eligible, true, 'the new login + session work');
});
test('a failure in the middle of provisioning leaves nothing behind, says so clearly, and Try again works', { skip: !PW }, async () => {
  F.failOn = /INSERT OR IGNORE INTO c\d+_gl_accounts/;
  const r = await call('signup', { name: 'Fay Fail', company: 'Fail Once LLC', email: 'fail53@example.com', password: 'FailOnce-53' });
  assert.equal(r.status, 503); assert.match(r.json.error, /couldn’t finish creating your account.*try again/i);
  const co = lastOrg(); assert.equal(org(co).status, 'deleted'); assert.equal(ctables(co), 0, 'no half-made tables');
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM users WHERE lower(email)='fail53@example.com'`).get().n, 0, 'no login left');
  const r2 = await call('signup', { name: 'Fay Fail', company: 'Fail Once LLC', email: 'fail53@example.com', password: 'FailOnce-53' }); assert.equal(r2.status, 200, r2.text);
  assert.equal(ctables(r2.json.company_id), base); assert.equal((await call('m/x52/setup', null, 'GET', r2.json.token)).status, 200);
});
test('provisioning that hangs is cut off, cleaned up, and answered (no endless "Creating your account")', { skip: !PW }, async () => {
  F.hangBatch = true; const t0 = Date.now();
  const r = await call('signup', { name: 'Hal Hang', company: 'Hang Rentals', email: 'hang53@example.com', password: 'HangRent-53' });
  assert.equal(r.status, 503); assert.ok(Date.now() - t0 < 5000, 'answered quickly');
  const co = lastOrg(); assert.equal(org(co).status, 'deleted'); assert.equal(ctables(co), 0);
  const r2 = await call('signup', { name: 'Hal Hang', company: 'Hang Rentals', email: 'hang53@example.com', password: 'HangRent-53' }); assert.equal(r2.status, 200, r2.text);
});
test('a lost answer: retry with the same email + password signs straight in; another password does not', { skip: !PW }, async () => {
  const r = await call('signup', { name: 'Lou Lost', company: 'Lost Answer Co', email: 'lost53@example.com', password: 'LostAnswer-53' }); assert.equal(r.status, 200);
  const r2 = await call('signup', { name: 'Lou Lost', company: 'Lost Answer Co', email: 'lost53@example.com', password: 'LostAnswer-53' }); assert.equal(r2.status, 200); assert.equal(r2.json.resumed, true); assert.equal(r2.json.company_id, r.json.company_id);
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM orgs WHERE owner_email='lost53@example.com'`).get().n, 1, 'no second company');
  const r3 = await call('signup', { name: 'Xavier', company: 'Lost Answer Co', email: 'lost53@example.com', password: 'Different-53' }); assert.equal(r3.status, 400); assert.match(r3.json.error, /already has an account/);
  const main2 = await call('signup', { name: 'Xavier', company: 'Main', email: 'manager@example.com', password: PW }); assert.equal(main2.status, 400, 'company 1 login is never "resumed"');
});
test('unfinished sign-ups (company row, no login, over 10 minutes old) are swept; real companies are not', { skip: !PW }, async () => {
  const old = new Date(Date.now() - 3600e3).toISOString();
  const a = Number(sq.prepare(`INSERT INTO orgs(name,created,owner_email,status,plan) VALUES('Half Made',?,'half@example.com','onboarding','trial')`).run(old).lastInsertRowid);
  sq.exec(`CREATE TABLE c${a}_settings(k TEXT PRIMARY KEY, v TEXT)`);
  const keep = sq.prepare(`SELECT id FROM orgs WHERE owner_email='base53@example.com'`).get().id; sq.prepare(`UPDATE orgs SET created=? WHERE id=?`).run(old, keep);
  const s = await call('signup', { name: 'Sid Sweep', company: 'Sweep Co', email: 'sweep53@example.com', password: 'SweepCo-53' }); assert.equal(s.status, 200);
  assert.equal(org(a).status, 'deleted'); assert.equal(ctables(a), 0);
  assert.notEqual(org(keep).status, 'deleted', 'a company with a login is never swept'); assert.equal(ctables(keep), base);
});
test('a request that never released the company lock (client went away) does not block other companies forever', { skip: !PW }, async () => {
  globalThis.PM_CO_STALE_MS = 600;
  F.hangQuery = /FROM sessions s JOIN users u|SELECT \* FROM settings|FROM bank_accounts/i; // the main company's request below never finishes
  const stuck = call('m/x52/setup', null, 'GET', main); void stuck;
  await new Promise(r => setTimeout(r, 50));
  const t0 = Date.now();
  const s = await call('signup', { name: 'Lee Lock', company: 'Lock Free Co', email: 'lock53@example.com', password: 'LockFree-53' });
  assert.equal(s.status, 200, s.text); assert.ok(Date.now() - t0 < 5000, 'signed up in ' + (Date.now() - t0) + ' ms');
  const me = await call('m/x52/setup', null, 'GET', s.json.token); assert.equal(me.status, 200);
  delete globalThis.PM_CO_STALE_MS;
});
