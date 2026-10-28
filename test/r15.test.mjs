// R15: full backups (every company table + files), retention, restore preview + replace (undoable), off-site copy (S3 signature v4, mocked),
// forgot password, per-account lockout, sign-in log, new-device alert, security headers, before/after edit log, notifications.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker15.mjs'); globalThis.PM_LEARN15_MS = 0;
const worker = (await import('/tmp/pm-test-worker15.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = typeof v === 'string' ? v : v instanceof ArrayBuffer ? new Uint8Array(v) : v; }, async get(k) { return files[k] !== undefined ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-10-28' };
const jobs = []; const ctx = { waitUntil: p => jobs.push(p) }; const settle = async () => { while (jobs.length) await jobs.shift(); };
const req = (p, { body, tok, method, hdrs = {} } = {}) => new Request('https://dh.test/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}), ...hdrs }, body: body ? JSON.stringify(body) : undefined });
const call = async (p, body, tok, method, hdrs) => { const r = await worker.fetch(req(p, { body, tok, method, hdrs }), env, ctx); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t, headers: r.headers }; };
const q = (sql, ...a) => sq.prepare(sql).all(...a); const q1 = (sql, ...a) => sq.prepare(sql).get(...a);
let S = {};
const realFetch = globalThis.fetch; const s3 = [];
globalThis.fetch = async (u, o = {}) => { const s = String(u); if (s.startsWith('https://acct123.r2.example.com/')) { s3.push({ url: s, method: o.method, auth: o.headers && o.headers.authorization, len: o.body ? o.body.length : 0 }); return new Response('', { status: S.s3fail ? 403 : 200 }); } return realFetch(u, o); };

test('setup: a company (signup) with some books', async () => {
  const r = await call('signup', { name: 'Rhea Restore', company: 'Restore Test LLC', email: 'rhea15@example.com', password: 'Restore-Pass-15' }); assert.equal(r.status, 200, r.text);
  S.tok = r.json.token; S.co = r.json.company_id; assert.ok(S.co > 1); const c = 'c' + S.co + '_';
  const b = await call('m/bank-accounts', { name: 'Operating', institution: 'Chase', last4: '1234' }, S.tok); assert.equal(b.status, 200, b.text); S.bank = b.json.id;
  for (const n of ['1 Test St', '2 Test St', '3 Test St']) sq.prepare(`INSERT INTO ${c}properties(name) VALUES(?)`).run(n);
  const acct = q1(`SELECT account_id a FROM ${c}bank_accounts WHERE id=?`, S.bank).a; S.acct = acct;
  for (const [amt, i] of [[150000, 1], [-25000, 2]]) { const j = sq.prepare(`INSERT INTO ${c}journal(date, kind, memo, amount, void) VALUES('2026-10-01','deposit_in','t${i}',?,0)`).run(Math.abs(amt)).lastInsertRowid;
    sq.prepare(`INSERT INTO ${c}jlines(journal_id, account_id, debit, credit, basis) VALUES(?,?,?,?, 'b')`).run(j, acct, amt > 0 ? amt : 0, amt < 0 ? -amt : 0); }
  sq.exec(`CREATE TABLE ${c}zz_new15(id INTEGER PRIMARY KEY, v TEXT)`); sq.prepare(`INSERT INTO ${c}zz_new15(v) VALUES('fresh table')`).run();
  sq.prepare(`INSERT INTO ${c}files(key, name, ctype, size) VALUES('u/test15.pdf','lease.pdf','application/pdf',3)`).run(); files['u/test15.pdf'] = new Uint8Array([1, 2, 3]);
});

test('backup: every company table (found from the database), uploaded files copied, list shows rows/tables/files', async () => {
  const r = await call('m/r15/backups', {}, S.tok); assert.equal(r.status, 200, r.text);
  const it = r.json.item; assert.ok(it.tables >= 40, 'tables ' + it.tables); assert.equal(it.files, 1);
  const data = JSON.parse(files[it.key]); assert.equal(data.format, 15);
  for (const t of ['zz_new15', 'properties', 'bank_accounts', 'journal', 'jlines', 'settings']) assert.ok(data.tables[t], 'missing ' + t);
  assert.ok(!data.tables.sessions && !data.tables.staff32 && !data.tables.mfa32 && !data.tables.login_fails, 'no global login tables');
  assert.ok(data.schema.zz_new15.includes('__T15__'));
  assert.ok(files[`backups/c${S.co}/files/u/test15.pdf`], 'file copy kept');
  const l = await call('m/r15/backups', null, S.tok); assert.equal(l.json.list[0].files, 1); assert.equal(l.json.offsite.status, 'Off-site copy: not set up'); assert.equal(l.json.can_restore, true);
  const dl = await call('m/r15/backups/dl?k=' + encodeURIComponent(it.key), null, S.tok); assert.equal(dl.status, 200); assert.ok(dl.text.includes('zz_new15'));
  const bad = await call('m/r15/backups/dl?k=' + encodeURIComponent('backups/c1/x.json'), null, S.tok); assert.equal(bad.status, 400);
  S.key = it.key;
});

test('retention: daily for 30 days, one per week for 52 weeks, manual and before-restore kept apart', async () => {
  const src = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'); const a = src.indexOf('function prune15('); const b = src.indexOf('\nasync function bkList15', a);
  const prune15 = new Function('BK_KEEP15', src.slice(a, b) + '; return prune15;')({ days: 30, weeks: 52, manual: 20, pre: 10 });
  const now = Date.parse('2026-10-28T12:00:00Z'); const list = [];
  for (let i = 0; i < 400; i++) list.push({ key: 'a' + i, at: new Date(now - i * 86400000).toISOString(), kind: 'auto' });
  for (let i = 0; i < 30; i++) list.push({ key: 'm' + i, at: new Date(now - i * 3600000).toISOString(), kind: 'manual' });
  const r = prune15(list, now); const autos = r.keep.filter(x => x.kind === 'auto');
  assert.equal(autos.filter(x => now - Date.parse(x.at) <= 30 * 86400000).length, 31);
  const older = autos.filter(x => now - Date.parse(x.at) > 30 * 86400000); assert.ok(older.length >= 46 && older.length <= 49, 'weekly ' + older.length);
  assert.ok(!autos.some(x => now - Date.parse(x.at) > 52 * 7 * 86400000));
  assert.equal(r.keep.filter(x => x.kind === 'manual').length, 20, 'manual list capped on its own'); assert.equal(autos.length + 20, r.keep.length);
});

test('restore: preview copy with counts vs live, owner types REPLACE, before-restore backup saved, counts and bank balance back', async () => {
  const c = 'c' + S.co + '_';
  const live0 = { props: q1(`SELECT COUNT(*) n FROM ${c}properties`).n, j: q1(`SELECT COUNT(*) n FROM ${c}journal`).n };
  // change things after the backup
  sq.prepare(`DELETE FROM ${c}properties WHERE name='2 Test St'`).run(); sq.prepare(`DELETE FROM ${c}zz_new15`).run();
  const j = sq.prepare(`INSERT INTO ${c}journal(date, kind, memo, amount, void) VALUES('2026-10-02','expense','junk',99900,0)`).run().lastInsertRowid;
  sq.prepare(`INSERT INTO ${c}jlines(journal_id, account_id, debit, credit, basis) VALUES(?,?,0,99900,'b')`).run(j, S.acct);
  delete files['u/test15.pdf'];
  const p = await call('m/r15/restore/preview', { key: S.key }, S.tok); assert.equal(p.status, 200, p.text);
  assert.equal(p.json.preview.properties, live0.props); assert.equal(p.json.live.properties, live0.props - 1);
  assert.equal(p.json.preview.banks[0].balance, 125000); assert.equal(p.json.live.banks[0].balance, 125000 - 99900);
  assert.ok(q(`SELECT name FROM sqlite_master WHERE name LIKE 'z15c${S.co}_%'`).length > 20, 'preview copy tables exist');
  assert.equal((await call('m/r15/restore/apply', { key: S.key, confirm: 'yes' }, S.tok)).status, 400, 'typed confirmation needed');
  const a = await call('m/r15/restore/apply', { key: S.key, confirm: 'REPLACE' }, S.tok); assert.equal(a.status, 200, a.text);
  assert.equal(a.json.after.properties, live0.props); assert.equal(a.json.after.transactions, live0.j); assert.equal(a.json.after.banks[0].balance, 125000);
  assert.equal(q1(`SELECT v FROM ${c}zz_new15`).v, 'fresh table'); assert.equal(a.json.files_put_back, 1); assert.ok(files['u/test15.pdf']);
  assert.equal(q(`SELECT name FROM sqlite_master WHERE name LIKE 'z15c${S.co}_%'`).length, 0, 'preview copy removed');
  const l = await call('m/r15/backups', null, S.tok); assert.ok(l.json.list.some(x => x.kind === 'pre-restore'), 'undo backup listed'); assert.ok(l.json.list.length >= 2, 'backup list kept through restore');
  assert.ok(q(`SELECT * FROM ${c}inb15 WHERE ev='restore_done'`).length >= 1, 'restore notification in-app');
  assert.equal((await call('m/r15/restore/apply', { key: S.key, confirm: 'REPLACE' }, S.tok)).status, 409, 'no preview -> no replace');
});

test('off-site copy: S3 signature v4 matches the AWS example; setup never shows the secret back; mocked bucket gets the daily copy', async () => {
  const src = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'); const a = src.indexOf('const sha15 = '); const b = src.indexOf('\nasync function s3req15', a);
  const f = new Function('hex', 'enc', src.slice(a, b) + '; return sigv4_15;')(buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join(''), s => new TextEncoder().encode(s));
  const sg = await f({ method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', headers: { range: 'bytes=0-9', 'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'x-amz-date': '20130524T000000Z' }, payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', region: 'us-east-1', akid: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', amzDate: '20130524T000000Z' });
  assert.equal(sg.sig, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
  assert.equal((await call('m/r15/offsite', { endpoint: 'http://x.com', bucket: 'b1' }, S.tok)).status, 400, 'https only');
  const secret = 'SECRETsecretSECRETsecret1234'; const s = await call('m/r15/offsite', { endpoint: 'https://acct123.r2.example.com', bucket: 'dh-backups', akid: 'AKIDTEST12345678', secret, on: true }, S.tok); assert.equal(s.status, 200, s.text);
  assert.ok(!s.text.includes(secret) && !s.text.includes('AKIDTEST12345678')); assert.equal(s.json.offsite.akid_hint, '••••5678'); assert.equal(s.json.offsite.on, true);
  assert.ok(!JSON.stringify(q(`SELECT v FROM c${S.co}_settings`)).includes(secret), 'secret stored encrypted');
  const t = await call('m/r15/offsite/test', {}, S.tok); assert.equal(t.json.ok, true, t.text); assert.ok(s3.some(x => x.method === 'PUT' && /AWS4-HMAC-SHA256 Credential=AKIDTEST12345678\/\d{8}\/auto\/s3\/aws4_request/.test(x.auth)));
  s3.length = 0; const r = await call('m/r15/offsite/run', {}, S.tok); assert.equal(r.json.ok, true, r.text);
  assert.ok(s3.some(x => x.url.includes('/dh-backups/doorhold-backups/c' + S.co + '/') && x.url.endsWith('.json'))); assert.ok(s3.some(x => x.url.includes('/files/u/test15.pdf')));
  const bk = JSON.parse(files[(await call('m/r15/backups', null, S.tok)).json.list[0].key]); assert.ok(!JSON.stringify(bk.tables.settings).includes('r15_offsite'), 'off-site setup is not inside backups');
  S.s3fail = true; const f2 = await call('m/r15/offsite/run', {}, S.tok); assert.equal(f2.json.ok, false); assert.match(f2.json.offsite.status, /failed/); S.s3fail = false;
  await call('m/r15/offsite', { on: false }, S.tok);
});

test('notifications: defaults (security on), save per event, bank account added -> in-app + email (practice mode)', async () => {
  const g = await call('m/r15/notify', null, S.tok); assert.equal(g.status, 200, g.text);
  assert.equal(g.json.list.length, 18); for (const k of ['bank_change', 'user_change', 'password_change', 'mfa_off', 'signin_new', 'backup_failed', 'restore_done']) { assert.equal(g.json.cfg.ev[k].on, true, k); assert.equal(g.json.cfg.ev[k].email, true, k); }
  const sv = await call('m/r15/notify', { ev: { big_txn: { on: true, email: true, inapp: true, n: 1000, to: 'me' }, bill_new: { on: false } } }, S.tok); assert.equal(sv.status, 200); assert.equal(sv.json.cfg.ev.big_txn.n, 1000); assert.equal(sv.json.cfg.ev.big_txn.to, 'me');
  const n0 = q(`SELECT * FROM c${S.co}_cm78`).length;
  const b = await call('m/bank-accounts', { name: 'Reserve', institution: 'TD', last4: '7777' }, S.tok); assert.equal(b.status, 200, b.text);
  const inb = await call('m/r15/inbox', null, S.tok); assert.ok(inb.json.rows.some(r => r.ev === 'bank_change' && /7777/.test(r.body)), JSON.stringify(inb.json.rows.slice(0, 2)));
  const em = q(`SELECT * FROM c${S.co}_cm78 WHERE sys='nt15'`); assert.ok(em.length > 0 && em.some(m => /Bank account added/.test(m.subject) && m.status === 'simulated'));
  assert.ok(inb.json.unread >= 1); await call('m/r15/inbox', { all: true }, S.tok); assert.equal((await call('m/r15/inbox', null, S.tok)).json.unread, 0);
  assert.ok(n0 >= 0);
});

test('forgot password: same answer for unknown email, one-time 30-minute link in the practice email log, rate-limited, signs out everywhere', async () => {
  const u1 = await call('login/forgot', { email: 'nobody15@example.com' }); const u2 = await call('login/forgot', { email: 'rhea15@example.com' }); await settle();
  assert.equal(u1.status, 200); assert.deepEqual(u1.json, u2.json);
  const m = q(`SELECT * FROM c${S.co}_cm78 WHERE subject LIKE '%reset your password%'`); assert.equal(m.length, 1); assert.equal(m[0].status, 'simulated');
  const tok = (/#\/reset\?t=([a-f0-9]{64})/.exec(m[0].body) || [])[1]; assert.ok(tok, 'link in the simulator log');
  const row = q1('SELECT * FROM pw15 WHERE used=0'); assert.ok(row.exp - Date.now() <= 30 * 60000 + 1000 && row.exp - Date.now() > 29 * 60000);
  assert.ok(!JSON.stringify(q('SELECT * FROM pw15')).includes(tok), 'only a hash is stored');
  assert.equal((await call('login/reset', { t: tok, password: 'short' })).status, 400);
  const ok = await call('login/reset', { t: tok, password: 'New-Pass-15-ok' }); assert.equal(ok.status, 200, ok.text);
  assert.equal((await call('login/reset', { t: tok, password: 'Again-Pass-15' })).status, 400, 'single use');
  assert.equal((await call('me', null, S.tok)).status, 401, 'old session signed out');
  const li = await call('login', { email: 'rhea15@example.com', password: 'New-Pass-15-ok' }); assert.equal(li.status, 200); S.tok = li.json.token; await settle();
  sq.prepare('UPDATE pw15 SET used=0, exp=? ').run(Date.now() - 1000); assert.equal((await call('login/reset', { t: tok, password: 'Expired-15-x' })).status, 400, 'expired');
  for (let i = 0; i < 3; i++) await call('login/forgot', { email: 'rhea15@example.com' }); await settle();
  assert.equal(q(`SELECT * FROM c${S.co}_cm78 WHERE subject LIKE '%reset your password%'`).length, 3, 'max 3 links per hour per email');
  let last; for (let i = 0; i < 6; i++) last = await call('login/forgot', { email: 'x' + i + '@example.com' }); assert.equal(last.status, 429, 'per-network limit');
  assert.ok(q(`SELECT * FROM c${S.co}_act32 WHERE area='Sign-in' AND action LIKE 'Password reset%'`).length >= 1);
});

test('sign-in: log with network + device, new-device alert (email + in-app), 20 wrong passwords lock the account across networks', async () => {
  const cnt = () => q('SELECT * FROM ntq15 WHERE ev=?', 'signin_new').length + q(`SELECT * FROM c${S.co}_inb15 WHERE ev='signin_new'`).length;
  globalThis.PM_LEARN15_MS = 3600000; const c0 = cnt(); await call('login', { email: 'rhea15@example.com', password: 'New-Pass-15-ok' }, null, 'POST', { 'cf-connecting-ip': '5.5.5.5' }); await settle(); assert.equal(cnt(), c0, 'no alert during the learning period'); globalThis.PM_LEARN15_MS = 0;
  const h1 = { 'cf-connecting-ip': '73.10.20.30', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36' };
  const a = await call('login', { email: 'rhea15@example.com', password: 'New-Pass-15-ok' }, null, 'POST', h1); assert.equal(a.status, 200); await settle();
  const before = q(`SELECT * FROM c${S.co}_inb15 WHERE ev='signin_new'`).length;
  const h2 = { 'cf-connecting-ip': '91.200.1.2', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1' };
  const b = await call('login', { email: 'rhea15@example.com', password: 'New-Pass-15-ok' }, null, 'POST', h2); assert.equal(b.status, 200); assert.match(b.headers.get('set-cookie') || '', /pm_dv15=/); await settle();
  const al = q(`SELECT * FROM c${S.co}_inb15 WHERE ev='signin_new'`); assert.equal(al.length, before + 1, 'one new-device alert'); assert.match(al[al.length - 1].body, /91\.200\.1\.2/);
  assert.ok(q(`SELECT * FROM c${S.co}_cm78 WHERE subject LIKE '%New sign-in%'`).length >= 1, 'alert email');
  const log = q(`SELECT * FROM c${S.co}_act32 WHERE area='Sign-in' AND action='Signed in'`); assert.ok(log.some(r => /91\.200\.1\.2/.test(r.detail) && /Safari on iPhone/.test(r.detail)));
  for (let i = 0; i < 20; i++) { const r = await call('login', { email: 'rhea15@example.com', password: 'wrong-' + i }, null, 'POST', { 'cf-connecting-ip': '10.0.' + (i % 7) + '.' + i }); assert.ok([401, 429].includes(r.status)); }
  const locked = await call('login', { email: 'rhea15@example.com', password: 'New-Pass-15-ok' }, null, 'POST', { 'cf-connecting-ip': '8.8.8.8' }); assert.equal(locked.status, 429, 'locked even with the right password from a new network');
  assert.ok(q(`SELECT * FROM c${S.co}_act32 WHERE action LIKE 'Sign-in failed: wrong password'`).length >= 5);
  sq.prepare(`DELETE FROM auth15 WHERE k LIKE 'acct|%'`).run(); sq.prepare(`DELETE FROM login_fails`).run();
});

test('security headers on pages, API answers and files; edits keep before/after values in the activity log', async () => {
  const pg = await worker.fetch(new Request('https://dh.test/'), env, ctx);
  assert.equal(pg.headers.get('x-frame-options'), 'DENY'); assert.match(pg.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.match(pg.headers.get('content-security-policy'), /object-src 'none'/);
  assert.match(pg.headers.get('strict-transport-security'), /max-age=31536000/); assert.equal(pg.headers.get('x-content-type-options'), 'nosniff'); assert.equal(pg.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  const api = await call('health'); assert.equal(api.headers.get('x-frame-options'), 'DENY'); assert.ok(api.headers.get('content-security-policy'));
  const li = await call('login', { email: 'rhea15@example.com', password: 'New-Pass-15-ok' }); S.tok = li.json.token;
  const v = sq.prepare(`INSERT INTO c${S.co}_vendors(name, v1099) VALUES('Ace Plumbing', 0)`).run().lastInsertRowid;
  const r = await call(`m/vendors/${v}/1099`, { on: true }, S.tok); assert.equal(r.status, 200, r.text);
  const act = q(`SELECT * FROM c${S.co}_act32 WHERE area='Edits'`); assert.ok(act.some(x => /Ace Plumbing/.test(x.action) && /v1099: 0 → 1/.test(x.detail)), JSON.stringify(act.slice(-2)));
  assert.ok(q(`SELECT * FROM c${S.co}_chg15 WHERE tbl='vendors'`).length >= 1);
});

test('R15 screens in the app: Backups + Notifications settings, restore preview, bell, forgot password + reset page; slim look rules', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
  const a = js.indexOf('// ===================== R15:'); assert.ok(a > 0 && a < js.lastIndexOf('\nrender();\n})();'), 'inside the main app');
  const b = js.slice(a, js.lastIndexOf('\nrender();\n})();'));
  for (const s of ['SEC32.backups', 'SEC32.notifications', "'m/r15/restore/preview'", "'m/r15/restore/apply'", 'REPLACE', "'m/r15/offsite/test'", "'m/r15/inbox'", '/api/login/forgot', '/api/login/reset', '#\\/reset\\?t=', 'Forgot password?', "['backups', 'Backups'", "'notifications', 'Notifications'"]) assert.ok(b.includes(s), s);
  assert.ok(!/const _\w+ = shell;/.test(b), 'd76 stays the last shell wrapper');
  const c = css.slice(css.indexOf('/* R15:')); assert.ok(c.length > 1000); assert.ok(!/box-shadow/.test(c)); assert.match(c, /border-radius:6px/); assert.match(c, /#E5E7EB/);
  assert.match(c, /@media \(max-width:700px\)\{[^@]*\.rprow15 input\{[^}]*font-size:16px/);
});

test('static pages carry the same Content-Security-Policy as a meta tag (static files are served without the worker)', () => {
  const w = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'); const m = /const CSP15 = \[([\s\S]*?)\]\.join/.exec(w); const csp = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]).filter(x => !x.startsWith('frame-ancestors')).join('; ');
  for (const f of ['index.html', 'app/index.html', 'apply/index.html', 'pay/index.html', 'rentals/index.html', 'owner.html', 'fix.html']) { const t = fs.readFileSync(path.join(SITE, f), 'utf8'); const i = t.indexOf('http-equiv="Content-Security-Policy"'); assert.ok(i > 0 && i < t.indexOf('<script'), f); assert.ok(t.includes(`content="${csp}"`), f + ' same policy'); }
  const h = fs.readFileSync(path.join(SITE, '_headers'), 'utf8'); assert.match(h, /X-Frame-Options: DENY/); assert.match(h, /frame-ancestors 'none'/);
});
