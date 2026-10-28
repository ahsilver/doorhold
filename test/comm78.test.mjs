
// d78: Communication — bulk send targeting + merge fields, STOP opt-out, inbound text matched to the tenant (signed Twilio webhook), inbound email
// matched by reply token and by sender, the simulator never calls a provider (and live mode does, through the adapter), code-by-text two-step sign-in.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker78.mjs');
const worker = (await import('/tmp/pm-test-worker78.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-12-02' };
const ORIGIN = 'https://pm.example.test';
const call = async (p, body, tok, method) => { const r = await worker.fetch(new Request(ORIGIN + '/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t }; };
const raw = async (p, init) => { const r = await worker.fetch(new Request(ORIGIN + p, init), env, { waitUntil: () => {} }); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') }; };
const L = fs.readFileSync('demo-logins.local.txt', 'utf8'); const pw = e => (L.match(new RegExp(e.replace('.', '\\.') + '\\s+password:\\s*(\\S+)')) || [])[1];
const login = async (e, p) => (await call('login', { email: e, password: p || pw(e) })).json;
const q = (sql, ...a) => sq.prepare(sql).all(...a); const q1 = (sql, ...a) => sq.prepare(sql).get(...a);
// every outside call is recorded; nothing leaves this process
const calls = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { const s = String(u); if (/twilio\.com|resend\.com|postmarkapp\.com|sendgrid\.com/.test(s)) { calls.push({ url: s, body: o && o.body }); return new Response(JSON.stringify(/twilio/.test(s) ? { sid: 'SM' + calls.length, status: 'queued' } : { id: 'em_' + calls.length }), { status: 200, headers: { 'content-type': 'application/json' } }); } return realFetch(u, o); };
const twSig = (token, url, params) => crypto.createHmac('sha1', token).update(url + Object.keys(params).sort().map(k => k + params[k]).join('')).digest('base64');
let M, T1, T2, KEY;
test('setup: tenants with phones and emails; Communication starts in simulator mode', async () => {
  M = (await login('manager@example.com')).token; assert.ok(M);
  const ts = q('SELECT id FROM tenants ORDER BY id'); assert.ok(ts.length >= 2, 'demo has tenants');
  T1 = ts[0].id; T2 = ts[1].id;
  sq.prepare('UPDATE tenants SET phone=?, email=? WHERE id=?').run('(201) 555-0101', 'ana@example.com', T1);
  sq.prepare('UPDATE tenants SET phone=?, email=? WHERE id=?').run('201-555-0102', 'ben@example.com', T2);
  for (const t of ts.slice(2)) sq.prepare('UPDATE tenants SET phone=NULL, email=? WHERE id=?').run('t' + t.id + '@example.com', t.id);
  const c = (await call('m/x78/cfg', null, M)).json; assert.equal(c.modes.sms, 'simulator'); assert.equal(c.modes.email, 'simulator');
  assert.ok(/\/api\/pub\/x78\/sms\?k=[a-f0-9]{32}$/.test(c.urls.sms_in), c.urls.sms_in); KEY = c.urls.sms_in.split('k=')[1];
  assert.equal((await call('m/x78/cfg', { quiet_on: false }, M)).status, 200);
});
test('bulk send: audience targeting, merge fields per recipient, skipped people counted, simulator records "simulated"', async () => {
  const all = (await call('m/x78/preview', { aud: { type: 'all' }, channel: 'both', subject: 'Hi {first_name}', body: 'Unit {unit} owes {balance}. Rent {rent}, lease ends {lease_end}.' }, M)).json;
  const active = q(`SELECT DISTINCT tenant_id FROM leases WHERE status='active' AND tenant_id IS NOT NULL`).length; assert.equal(all.counts.people, active);
  assert.ok(all.counts.no_phone >= 1, 'tenants without a phone are counted'); assert.equal(all.counts.sms, all.recipients.filter(r => r.to.sms).length);
  const t1 = q1('SELECT * FROM tenants WHERE id=?', T1); const l1 = q1(`SELECT l.*, u.name unit FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.tenant_id=? AND l.status='active'`, T1);
  const i = all.recipients.findIndex(r => r.key === 't' + T1); assert.ok(i >= 0);
  const pv = (await call('m/x78/preview', { aud: { type: 'all' }, channel: 'both', subject: 'Hi {first_name}', body: 'Unit {unit} owes {balance}. Rent {rent}, lease ends {lease_end}.', i }, M)).json;
  assert.equal(pv.sample.subject, 'Hi ' + t1.first); assert.ok(pv.sample.body.includes('Unit ' + l1.unit), pv.sample.body); assert.ok(/owes \$[\d,]+\.\d\d/.test(pv.sample.body)); assert.ok(pv.sample.body.includes('$' + (l1.rent / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })));
  assert.ok(/Reply STOP to opt out\.$/.test(pv.sample.sms), 'bulk texts carry the opt-out line');
  // one property only
  const prop = q1('SELECT u.property_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.tenant_id=?', T1).property_id;
  const pp = (await call('m/x78/preview', { aud: { type: 'property', property_id: prop }, channel: 'email', subject: 's', body: 'b' }, M)).json;
  const inProp = q(`SELECT DISTINCT l.tenant_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.status='active' AND u.property_id=?`, prop).length; assert.equal(pp.counts.people, inProp);
  // leases ending soon
  sq.prepare(`UPDATE leases SET end='2027-01-15' WHERE tenant_id=? AND status='active'`).run(T2);
  const ex = (await call('m/x78/preview', { aud: { type: 'lease', lease_status: 'expiring', days: 60 }, channel: 'email', subject: 's', body: 'b' }, M)).json;
  assert.ok(ex.recipients.some(r => r.key === 't' + T2)); assert.ok(ex.recipients.every(r => r.key !== 't' + T1) || q1(`SELECT end FROM leases WHERE tenant_id=? AND status='active'`, T1).end <= '2027-01-31');
  // send for real (simulator)
  const n0 = calls.length;
  const s = (await call('m/x78/send', { aud: { type: 'all' }, channel: 'both', subject: 'Hi {first_name}', body: 'Hello {full_name}, unit {unit}.', essential: true }, M)).json; assert.equal(s.ok, true, JSON.stringify(s));
  assert.equal(s.statuses.simulated, s.messages); assert.equal(calls.length, n0, 'no provider was called');
  const m1 = q1(`SELECT * FROM cm78 WHERE batch_id=? AND tenant_id=? AND channel='email'`, s.batch_id, T1); assert.equal(m1.subject, 'Hi ' + t1.first); assert.equal(m1.status, 'simulated');
  assert.ok(q1(`SELECT COUNT(*) n FROM act32 WHERE area='Communication' AND detail LIKE ?`, `tenant ${T1} %`).n >= 2, 'each message is in the activity log with the tenant');
});
test('inbound text: signed Twilio webhook lands on the tenant (by phone), unread in the Inbox; bad signature refused; STOP opts out, START opts back in', async () => {
  const tok = 'ab'.repeat(16); assert.equal((await call('m/x78/cfg', { twilio_sid: 'AC' + 'c'.repeat(32), twilio_token: tok, twilio_from: '+12015550199' }, M)).status, 200);
  const c = (await call('m/x78/cfg', null, M)).json; assert.equal(c.modes.sms, 'simulator', 'keys alone never turn real texting on');
  const url = ORIGIN + '/api/pub/x78/sms?k=' + KEY; const params = { From: '+12015550101', To: '+12015550199', Body: 'Is the water back on?', MessageSid: 'SMin1' };
  const bad = await raw('/api/pub/x78/sms?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': 'nope' }, body: new URLSearchParams(params).toString() }); assert.equal(bad.status, 403);
  const nok = await raw('/api/pub/x78/sms?k=wrong', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() }); assert.equal(nok.status, 403);
  const ok = await raw('/api/pub/x78/sms?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': twSig(tok, url, params) }, body: new URLSearchParams(params).toString() });
  assert.equal(ok.status, 200, ok.text); assert.ok(/<Response>/.test(ok.text));
  const m = q1(`SELECT * FROM cm78 WHERE ext='SMin1'`); assert.equal(m.tenant_id, T1); assert.equal(m.kind, 'tenant'); assert.equal(m.dir, 'in'); assert.equal(m.read_at, null);
  const again = await raw('/api/pub/x78/sms?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': twSig(tok, url, params) }, body: new URLSearchParams(params).toString() }); assert.equal(again.status, 200);
  assert.equal(q1(`SELECT COUNT(*) n FROM cm78 WHERE ext='SMin1'`).n, 1, 'Twilio retries are not doubled');
  const ib = (await call('m/x78/inbox?f=unread', null, M)).json; const cv = ib.conversations.find(x => x.key === 't' + T1); assert.ok(cv && cv.unread >= 1, JSON.stringify(ib.counts));
  const th = (await call('m/x78/thread/t' + T1, null, M)).json; assert.ok(th.messages.some(x => x.body === 'Is the water back on?' && x.dir === 'in')); assert.equal(q1(`SELECT read_at FROM cm78 WHERE ext='SMin1'`).read_at != null, true, 'opening the thread marks it read');
  // unknown sender
  const p2 = { From: '+19735550000', To: '+12015550199', Body: 'Hi, is the apartment still available?', MessageSid: 'SMin2' };
  await raw('/api/pub/x78/sms?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': twSig(tok, url, p2) }, body: new URLSearchParams(p2).toString() });
  const ib2 = (await call('m/x78/inbox?f=unknown', null, M)).json; assert.ok(ib2.conversations.some(x => x.key === 'u:+19735550000'));
  // STOP
  const p3 = { From: '+12015550102', To: '+12015550199', Body: 'Stop', MessageSid: 'SMin3' };
  const st = await raw('/api/pub/x78/sms?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': twSig(tok, url, p3) }, body: new URLSearchParams(p3).toString() }); assert.equal(st.status, 200);
  assert.equal(q1(`SELECT * FROM oo78 WHERE channel='sms' AND addr='+12015550102'`).tenant_id, T2);
  const tp = (await call('m/x78/tenant/' + T2, null, M)).json; assert.ok(tp.contact.sms_opt_out, 'opt-out shows for the tenant'); assert.equal(tp.contact.sms_opt_out.word, 'STOP');
  const pv = (await call('m/x78/preview', { aud: { type: 'all' }, channel: 'sms', body: 'x' }, M)).json; assert.equal(pv.recipients.find(r => r.key === 't' + T2).skip.sms, 'opted_out'); assert.ok(pv.counts.opted_out >= 1);
  const r1 = await call('m/x78/thread/t' + T2, { channel: 'sms', body: 'Hi' }, M); assert.equal(r1.status, 400); assert.ok(/STOP/.test(r1.json.error));
  const h = { From: '+12015550102', To: '+12015550199', Body: 'HELP', MessageSid: 'SMin4' };
  const hr = await raw('/api/pub/x78/sms?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': twSig(tok, url, h) }, body: new URLSearchParams(h).toString() }); assert.ok(/<Message>.*STOP/.test(hr.text), hr.text);
  const sim = (await call('m/x78/sim/inbound', { key: 't' + T2, channel: 'sms', body: 'START' }, M)).json; assert.equal(sim.sys, 'opt_in'); assert.equal(q1(`SELECT COUNT(*) n FROM oo78 WHERE addr='+12015550102'`).n, 0);
});
test('inbound email: reply+token address matches the tenant even from another address; sender email matches; attachments kept; unknown goes to Inbox', async () => {
  assert.equal((await call('m/x78/cfg', { domain: 'acme-rentals.com', from_addr: 'office@acme-rentals.com', from_name: 'Acme Rentals', email_provider: 'postmark' }, M)).status, 200);
  const th = (await call('m/x78/thread/t' + T2, null, M)).json; assert.ok(new RegExp('^reply\\+t' + T2 + '-[a-f0-9]{10}@reply\\.acme-rentals\\.com$').test(th.reply_to), th.reply_to);
  const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
  const r = await raw('/api/pub/x78/email?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ FromFull: { Email: 'someone.else@gmail.com', Name: 'Ben' }, From: 'someone.else@gmail.com', ToFull: [{ Email: th.reply_to }], Subject: 'Re: lease', TextBody: 'Yes I want to renew.\n\nOn Mon, Dec 1, 2026 Acme wrote:\n> old text', MessageID: 'pm-1', Attachments: [{ Name: 'signed.pdf', ContentType: 'application/pdf', Content: pdf }] }) });
  assert.equal(r.status, 200, r.text); const m = q1(`SELECT * FROM cm78 WHERE ext='pm-1'`); assert.equal(m.tenant_id, T2); assert.equal(m.body, 'Yes I want to renew.', 'quoted text is cut'); assert.equal(JSON.parse(m.att)[0].name, 'signed.pdf');
  const f = await raw(`/api/m/x78/att/${m.id}/0`, { headers: { authorization: 'Bearer ' + M, 'x-pm-app': '1' } }); assert.equal(f.status, 200); assert.equal(f.type, 'application/pdf');
  const forged = await raw('/api/pub/x78/email?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ from: 'x@evil.test', to: ['reply+t' + T1 + '-0000000000@reply.acme-rentals.com'], subject: 'hi', text: 'forged token', id: 'g-1' }) });
  assert.equal(forged.status, 200); assert.equal(q1(`SELECT kind FROM cm78 WHERE ext='g-1'`).kind, 'unknown', 'a token with a wrong signature does not match');
  const byFrom = await raw('/api/pub/x78/email?k=' + KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ from: 'Ana <ANA@example.com>', to: ['office@acme-rentals.com'], subject: 'Parking', text: 'Can I get a second spot?', id: 'g-2' }) });
  assert.equal(byFrom.status, 200); assert.equal(q1(`SELECT tenant_id FROM cm78 WHERE ext='g-2'`).tenant_id, T1);
  assert.equal((await raw('/api/pub/x78/email?k=nope', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403);
  // link the unknown sender to a tenant
  const lk = (await call('m/x78/link', { key: 'u:x@evil.test', tenant_id: T1 }, M)).json; assert.equal(lk.moved, 1);
});
test('simulator never sends; live mode needs keys + 10DLC / verified domain + the switch, then goes through the adapter; quiet hours hold texts', async () => {
  const n0 = calls.length;
  await call('m/x78/thread/t' + T1, { channel: 'sms', body: 'Water is back on {first_name}' }, M); await call('m/x78/thread/t' + T1, { channel: 'email', subject: 'Water', body: 'Back on' }, M);
  await call('m/x78/sim/inbound', { key: 't' + T1, channel: 'email', body: 'Thanks' }, M);
  assert.equal(calls.length, n0, 'nothing reached Twilio or an email provider');
  assert.ok(q(`SELECT status FROM cm78 WHERE dir='out'`).every(r => ['simulated', 'scheduled', 'canceled', 'failed'].includes(r.status)));
  assert.equal((await call('m/x78/cfg', { sms_live: true }, M)).status, 400, 'no 10DLC confirmation');
  assert.equal((await call('m/x78/cfg', { email_live: true }, M)).status, 400, 'no API key');
  assert.equal((await call('m/x78/cfg', { ten_dlc: true, sms_live: true }, M)).status, 200);
  const r = (await call('m/x78/thread/t' + T1, { channel: 'sms', body: 'Live test' }, M)).json; assert.equal(r.messages[0].status, 'queued'); assert.equal(calls.length, n0 + 1); assert.ok(/twilio\.com\/2010-04-01\/Accounts\/AC/.test(calls.at(-1).url));
  assert.ok(/StatusCallback=/.test(calls.at(-1).body));
  assert.equal((await call('m/x78/cfg', { email_key: 'pm-key-1234', domain_ok: true, email_live: true }, M)).status, 200);
  const e = (await call('m/x78/thread/t' + T1, { channel: 'email', subject: 'Live', body: 'Hello' }, M)).json; assert.equal(e.messages[0].status, 'sent'); assert.ok(/postmarkapp/.test(calls.at(-1).url)); assert.ok(/reply\+t\d+-/.test(calls.at(-1).body));
  // quiet hours: a text goes on hold until the quiet hours end
  assert.equal((await call('m/x78/cfg', { quiet_on: true, quiet_from: '00:00', quiet_to: '23:59', sms_live: false, email_live: false }, M)).status, 200);
  const qh = (await call('m/x78/thread/t' + T1, { channel: 'sms', body: 'Late night' }, M)).json; assert.equal(qh.messages[0].status, 'scheduled'); assert.equal(qh.messages[0].hold, 'quiet');
  assert.equal((await call('m/x78/cfg', { quiet_on: false }, M)).status, 200);
});
test('two-step by text: verify the phone, sign-in asks for the texted code (simulated code shown), wrong code refused, right code signs in', async () => {
  const st = (await call('m/x78/mfa', { action: 'start', phone: '(201) 555-0177' }, M)).json; assert.equal(st.sent, false); assert.ok(/^\d{6}$/.test(st.sim_code));
  assert.equal((await call('m/x78/mfa', { action: 'verify', code: '000000' === st.sim_code ? '111111' : '000000' }, M)).status, 400);
  const v = (await call('m/x78/mfa', { action: 'verify', code: st.sim_code }, M)).json; assert.equal(v.on, true); assert.equal(v.phone, '(•••) •••-0177');
  const l = await login('manager@example.com'); assert.equal(l.mfa_required, true); assert.deepEqual(l.methods, ['sms']); assert.ok(l.token == null); assert.ok(/^\d{6}$/.test(l.sim_code));
  const bad = await call('login/2fa', { challenge: l.challenge, code: l.sim_code === '123456' ? '654321' : '123456' }); assert.equal(bad.status, 401);
  const ok = await call('login/2fa', { challenge: l.challenge, code: l.sim_code }); assert.equal(ok.status, 200); assert.ok(ok.json.token);
  assert.equal((await call('m/x78/unread', null, ok.json.token)).status, 200);
  const re = await call('login/2fa/sms', { challenge: (await login('manager@example.com')).challenge }); assert.equal(re.status, 429, 'resend is limited to one every 30 seconds');
  assert.equal((await call('m/x78/mfa', { action: 'off', password: pw('manager@example.com') }, ok.json.token)).json.on, false);
  assert.ok((await login('manager@example.com')).token, 'without it, password only again');
});
test('client: Communication menu, routes, tenant Messages tab, style rules', () => {
  const a = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const i = a.indexOf('// ===== d78'); assert.ok(i > 0); const blk = a.slice(i);
  for (const s of ["l: 'Communication'", "['comm', 'Inbox']", "['comm/send', 'Send message']", "['announcements', 'Announcements']", "['calls', 'Calls & caller ID']", "['comm/templates', 'Templates']", "['comm/settings', 'Settings']", 'MV.comm =', 'tab=msg', 'Simulate a reply']) assert.ok(blk.includes(s), s);
  const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8'); const c0 = css.slice(css.indexOf('/* ===== d78')); const c = c0.includes('/* ===== d79') ? c0.slice(0, c0.indexOf('/* ===== d79')) : c0; assert.ok(c.length > 100); assert.ok(!/box-shadow:\s*(?!none)/.test(c), 'no shadows');
});
