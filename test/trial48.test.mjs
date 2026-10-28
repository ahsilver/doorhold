// node --test test/trial48.test.mjs — d48: free 30-day trial sign-up (no payment), trial stored per company, chip data in /me,
// company isolation, in-app feedback (global table, only company #1's owner reads it), billing_required flag, deleting a trial company.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker48.mjs');
const worker = (await import('/tmp/pm-test-worker48.mjs?' + Date.now())).default;
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

test('setup: main account signs in; it is not a trial and is the feedback admin', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  const me = await call('me', null, 'GET', tok); assert.equal(me.json.trial, null, 'main company has no trial chip'); assert.equal(me.json.fb_admin, true);
});

test('sign-up: no payment fields, creates a new empty company with a 30-day trial', { skip: !PW }, async () => {
  assert.equal((await call('signup', { name: 'T', company: 'X', email: 'bad', password: 'short' })).status, 400);
  const r = await call('signup', { name: 'Tess Trial', company: 'Trial Homes LLC', email: 'tess48@example.com', password: 'TrialHomes-48', phone: '' });
  assert.equal(r.status, 200, r.text); ttok = r.json.token; co = r.json.company_id; assert.ok(co > 1);
  const o = sq.prepare('SELECT * FROM orgs WHERE id=?').get(co);
  assert.equal(o.plan, 'trial'); assert.equal(o.billing_required, 0); assert.ok(o.trial_started && o.trial_ends);
  assert.equal(Math.round((Date.parse(o.trial_ends) - Date.parse(o.trial_started)) / 86400000), 30);
  const me = await call('me', null, 'GET', ttok); assert.equal(me.json.company, 'Trial Homes LLC'); assert.equal(me.json.onboarded, false);
  assert.equal(me.json.trial.days_left, 30); assert.equal(me.json.trial.ended, false); assert.equal(me.json.trial.locked, false); assert.equal(me.json.fb_admin, false);
  assert.equal((await call('signup', { name: 'Tess', company: 'Again', email: 'tess48@example.com', password: 'Different-48' })).status, 400, 'email already used');
  // d53: the same email + the same password right after an unfinished sign-up signs back in (a "Try again" whose first answer was lost)
  const again = await call('signup', { name: 'Tess', company: 'Again', email: 'tess48@example.com', password: 'TrialHomes-48' }); assert.equal(again.status, 200); assert.equal(again.json.company_id, co); assert.equal(again.json.resumed, true);
});

test('isolation: the new company sees none of the main company data', { skip: !PW }, async () => {
  for (const p of LISTS) { const a = await call(p, null, 'GET', ttok); assert.equal(a.status, 200, p); assert.equal(n(a.json), 0, p + ' must be empty for a new company'); }
  assert.ok(n((await call('m/properties', null, 'GET', tok)).json) > 0, 'main company still has its houses');
  const tb = (await call('m/reports/trial-balance', null, 'GET', ttok)).json; assert.equal(tb.totals.debit, 0);
});

test('first house, tenant and bill work on a fresh company', { skip: !PW }, async () => {
  const ob = await call('m/onboard', { zelle_to: 'tess48@example.com', entities: [{ name: 'Tess Trial', type: 'individual' }], properties: [{ address: '12 Oak St', city: 'Newark', state: 'NJ', units: 1, entity: 0, tenants: [{ first: 'Sam', last: 'Reed', rent: '1500', unit: 1 }] }], banks: [{ name: 'Operating checking' }], late: { pct: 5, grace: 5 } }, 'POST', ttok);
  assert.equal(ob.status, 200, ob.text);
  assert.equal(n((await call('m/properties', null, 'GET', ttok)).json), 1); assert.equal(n((await call('m/tenants', null, 'GET', ttok)).json), 1);
  const pid = (await call('m/properties', null, 'GET', ttok)).json[0].id;
  const acct = sq.prepare(`SELECT id FROM c${co}_gl_accounts WHERE type='expense' ORDER BY code LIMIT 1`).get().id;
  const b = await call('m/bills', { vendor_name: 'Ace Plumbing', account_id: acct, property_id: pid, amount: '250', due: '2026-12-20', frequency: 'once' }, 'POST', ttok); assert.equal(b.status, 200, b.text);
  assert.equal((await call('m/bills', null, 'GET', ttok)).json.bills.length, 1);
  assert.equal((await call('me', null, 'GET', ttok)).json.onboarded, true);
});

test('trial end: chip says ended, nobody is locked out', { skip: !PW }, async () => {
  sq.prepare('UPDATE orgs SET trial_ends=? WHERE id=?').run(new Date(Date.now() - 86400000).toISOString(), co);
  const me = await call('me', null, 'GET', ttok); assert.equal(me.json.trial.ended, true); assert.equal(me.json.trial.days_left, 0); assert.equal(me.json.trial.locked, false);
  assert.equal((await call('m/properties', null, 'GET', ttok)).status, 200, 'still works after the trial');
});

test('feedback: anyone signed in can send; only the main account owner can read it', { skip: !PW }, async () => {
  assert.equal((await call('fb48', { kind: 'problem', text: '' }, 'POST', ttok)).status, 400);
  const f = await call('fb48', { kind: 'idea', text: 'Please add a cash summary on Home', page: 'Home · #/', shot: SHOT, device: '390x844' }, 'POST', ttok); assert.equal(f.status, 200, f.text);
  assert.equal((await call('fb48/list', null, 'GET', ttok)).status, 403, 'a trial company cannot read feedback');
  assert.equal((await call(`fb48/shot/${f.json.id}`, null, 'GET', ttok)).status, 403);
  const L = await call('fb48/list', null, 'GET', tok); assert.equal(L.status, 200);
  const it = L.json.items.find(i => i.id === f.json.id); assert.ok(it); assert.equal(it.company, 'Trial Homes LLC'); assert.equal(it.user_email, 'tess48@example.com'); assert.equal(it.page, 'Home · #/'); assert.equal(it.kind, 'idea'); assert.equal(it.has_shot, true);
  const s = await raw(`fb48/shot/${f.json.id}`, null, 'GET', tok); assert.equal(s.status, 200); assert.equal(s.headers.get('content-type'), 'image/png');
  const c = L.json.companies.find(x => x.id === co); assert.equal(c.name, 'Trial Homes LLC'); assert.equal(c.billing_required, false); assert.equal(c.users, 1);
  assert.equal((await call(`fb48/item/${f.json.id}/done`, { done: true }, 'POST', tok)).status, 200);
  assert.equal((await call('fb48/list', null, 'GET', tok)).json.items.find(i => i.id === f.json.id).done, true);
  assert.equal(sq.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE 'c%_fb48'").get().n, 0, 'feedback is one shared table, never per company');
});

test('billing required: a per-company switch, off by default, only the main owner can change it', { skip: !PW }, async () => {
  assert.equal((await call(`fb48/org/${co}`, { billing_required: true }, 'POST', ttok)).status, 403);
  assert.equal((await call(`fb48/org/${co}`, { billing_required: true }, 'POST', tok)).status, 200);
  assert.equal((await call('me', null, 'GET', ttok)).json.trial.billing_required, true);
  assert.equal((await call('m/properties', null, 'GET', ttok)).status, 200, 'no lock-out even with billing on (no payment wired)');
  await call(`fb48/org/${co}`, { billing_required: false }, 'POST', tok);
  assert.equal((await call(`fb48/org/1`, { billing_required: true }, 'POST', tok)).status, 404, 'the main company is not in the trial list');
});

test('delete a trial company: needs its exact name, removes its tables, logins and feedback; main company untouched', { skip: !PW }, async () => {
  const before = n((await call('m/properties', null, 'GET', tok)).json);
  assert.equal((await call(`fb48/org/${co}/delete`, { confirm: 'wrong' }, 'POST', tok)).status, 400);
  assert.equal((await call(`fb48/org/${co}/delete`, { confirm: 'Trial Homes LLC' }, 'POST', ttok)).status, 403);
  const d = await call(`fb48/org/${co}/delete`, { confirm: 'trial homes llc' }, 'POST', tok); assert.equal(d.status, 200, d.text); assert.ok(d.json.deleted.tables > 20);
  assert.equal(sq.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name LIKE 'c${co}\\_%' ESCAPE '\\'`).get().n, 0);
  assert.equal(sq.prepare('SELECT COUNT(*) n FROM users WHERE company_id=?').get(co).n, 0);
  assert.equal(sq.prepare('SELECT COUNT(*) n FROM fb48 WHERE company_id=?').get(co).n, 0);
  assert.equal(Object.keys(files).filter(k => k.startsWith('fb48/')).length, 0, 'screenshot removed');
  assert.equal((await call('me', null, 'GET', ttok)).status, 401, 'their session is gone');
  assert.equal(n((await call('m/properties', null, 'GET', tok)).json), before, 'main company unchanged');
  assert.equal((await call('fb48/org/1/delete', { confirm: 'x' }, 'POST', tok)).status, 404, 'company #1 can never be deleted');
  assert.equal((await call(`fb48/org/${co}`, { billing_required: true }, 'POST', tok)).status, 404, 'a deleted company is gone from the trial list');
  assert.equal((await call(`fb48/org/${co}/delete`, { confirm: '(deleted)' }, 'POST', tok)).status, 200, 'cleanup can be re-run on a deleted company');
  const r = await call('signup', { name: 'Next', company: 'Next Co', email: 'next48@example.com', password: 'NextCo-4848' }); assert.equal(r.status, 200); assert.ok(r.json.company_id > co, 'a deleted company number is never reused');
});

test('/signup is a shareable link: DoorHold trial title, opens the sign-up screen', async () => {
  const r = await worker.fetch(new Request('http://x/signup'), env, { waitUntil() {} }); const h = await r.text();
  assert.equal(r.status, 200); assert.match(h, /<title>Start your free 30-day trial · DoorHold<\/title>/); assert.ok(!h.includes('ACME')); assert.ok(h.includes("'/#/signup'"));
});

test('client: sign-up form has no payment step; chip + feedback button + Feedback page exist; no emoji', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const i = js.indexOf('function renderSignup()'); const su = js.slice(i, js.indexOf('const OBT = [', i));
  for (const f of ['name="name"', 'name="company"', 'name="email"', 'name="password"', 'name="phone"']) assert.ok(su.includes(f), f);
  assert.ok(!/card number|credit card number|\$\d/i.test(su), 'no payment fields or prices'); assert.ok(su.includes('no card needed'));
  const d = js.slice(js.indexOf('// ---------- d48: free-trial chip'));
  assert.ok(d.includes('Free trial ·') && d.includes('Trial ended') && d.includes('free for now'));
  assert.ok(d.includes('data-fb48') && d.includes("api('fb48'") && d.includes('MV.feedback'));
  assert.ok(!/\p{Extended_Pictographic}/u.test(su + d), 'no emoji');
  assert.ok(!js.includes('<b>$59</b>'), 'old $59 price removed');
});
