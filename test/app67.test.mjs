// d67 mobile app: push (RFC 8291 payload decrypted here, VAPID JWT checked), passkeys (simulated authenticator), session refresh, worker chat, approvals
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker67.mjs');
const worker = (await import('/tmp/pm-test-worker67.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) } };
globalThis.PM_PUSH_SYNC = 1; // send pushes before the response so the test can see them
const sent = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { const s = String(u); if (s.startsWith('https://push.test/')) { sent.push({ url: s, headers: o.headers, body: new Uint8Array(o.body) }); return new Response('', { status: s.includes('gone') ? 410 : 201 }); } return realFetch(u, o); };
const call = async (p, body, tok, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j }; };
const L = fs.readFileSync('demo-logins.local.txt', 'utf8'); const pw = e => (L.match(new RegExp(e.replace('.', '\\.') + '\\s+password:\\s*(\\S+)')) || [])[1];
const login = async (e, p) => (await call('login', { email: e, password: p || pw(e) })).json.token;
const b64u = b => Buffer.from(b).toString('base64url'); const unb = s => Buffer.from(s, 'base64url');
const hk = (salt, ikm, info, n) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, n));
// a fake phone: ECDH key + auth secret, decrypts what the server sends (RFC 8291)
function phone(name) { const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys(); const auth = crypto.randomBytes(16);
  return { sub: { endpoint: 'https://push.test/' + name, keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth) } },
    open(body) { const salt = body.slice(0, 16); const idlen = body[20]; const asPub = body.slice(21, 21 + idlen); const ct = body.slice(21 + idlen);
      const secret = ecdh.computeSecret(asPub); const ikm = hk(auth, secret, Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), asPub]), 32);
      const cek = hk(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), nonce = hk(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
      const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.slice(ct.length - 16)); const pt = Buffer.concat([d.update(ct.slice(0, ct.length - 16)), d.final()]);
      assert.equal(pt[pt.length - 1], 2, 'last-record delimiter'); return JSON.parse(pt.slice(0, -1).toString()); } }; }
function vapidOk(h) { const m = /^vapid t=([^,]+), k=(.+)$/.exec(h.authorization); assert.ok(m, 'vapid header'); const [hh, cc, ss] = m[1].split('.');
  const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(unb(m[2]).slice(1, 33)), y: b64u(unb(m[2]).slice(33, 65)) }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(hh + '.' + cc), { key: pub, dsaEncoding: 'ieee-p1363' }, unb(ss)), 'VAPID signature'); const cl = JSON.parse(unb(cc)); assert.equal(cl.aud, 'https://push.test'); assert.ok(cl.exp > Date.now() / 1000); return cl; }

let M, T, O, Wk, wv, wpw;
test('app67/me tells the app which home to open, per role', async () => {
  M = await login('manager@example.com'); T = await login('tenant@example.com'); O = await login('owner@example.com');
  assert.equal((await call('app67/me', null, M)).json.user.role, 'manager'); assert.equal((await call('app67/me', null, T)).json.user.role, 'tenant'); assert.equal((await call('app67/me', null, O)).json.user.role, 'owner');
  const me = (await call('app67/me', null, M)).json; assert.equal(me.push.on, true); assert.equal(unb(me.push.key).length, 65);
  assert.equal((await call('app67/me')).status, 401);
  const w = await call('m/x65/workers', { name: 'Test Worker 67', kind: 'contractor', cats: ['plumbing'], email: 'zz.w67@example.com', login: 1 }, M); wv = w.json.vendor_id; wpw = w.json.temp_password;
  Wk = await login('zz.w67@example.com', wpw); const wm = (await call('app67/me', null, Wk)).json; assert.equal(wm.user.role, 'worker'); assert.equal(wm.vendor_id, wv);
});
test('push: tenant message reaches the manager phone, encrypted (RFC 8291) and signed (VAPID)', async () => {
  const mp = phone('mgr'), tp = phone('ten');
  assert.equal((await call('app67/push/sub', { sub: mp.sub }, M)).status, 200); assert.equal((await call('app67/push/sub', { sub: tp.sub }, T)).status, 200);
  sent.length = 0; assert.equal((await call('t/msg', { body: 'The hallway light is out again' }, T)).status, 200);
  const toM = sent.filter(s => s.url.endsWith('/mgr')); assert.equal(toM.length, 1); assert.equal(sent.filter(s => s.url.endsWith('/ten')).length, 0);
  assert.equal(toM[0].headers['content-encoding'], 'aes128gcm'); vapidOk(toM[0].headers);
  const msg = mp.open(toM[0].body); assert.match(msg.title, /Message from Maya/); assert.match(msg.body, /hallway light/); assert.match(msg.url, /^\/app\/#\/m\/thread\//);
  sent.length = 0; const tid = (await call('app67/me', null, T)).json; assert.equal((await call('m/portal/reply/1', { body: 'An electrician comes tomorrow' }, M)).status, 200);
  const toT = sent.filter(s => s.url.endsWith('/ten')); assert.equal(toT.length, 1); assert.match(tp.open(toT[0].body).body, /electrician/);
  sent.length = 0; assert.equal((await call('app67/push/test', {}, T)).json.sent, 1);
});
test('push: company switch and per-event switch stop it; only the company owner can change them; dead devices are removed', async () => {
  assert.equal((await call('app67/push/cfg', { push: false }, T)).status, 403);
  assert.equal((await call('app67/push/cfg', { push: false }, M)).json.push, false);
  sent.length = 0; await call('t/msg', { body: 'hello?' }, T); assert.equal(sent.length, 0);
  await call('app67/push/cfg', { push: true, ev: { msg: false } }, M); sent.length = 0; await call('t/msg', { body: 'hello again' }, T); assert.equal(sent.length, 0);
  await call('app67/push/cfg', { ev: { msg: true } }, M); const c = (await call('app67/push/cfg', null, M)).json; assert.equal(c.push, true); assert.equal(c.ev.msg, true);
  const gp = phone('gone'); await call('app67/push/sub', { sub: gp.sub }, M); sent.length = 0; await call('t/msg', { body: 'x' }, T); assert.equal(sent.filter(s => s.url.includes('gone')).length, 1);
  sent.length = 0; await call('t/msg', { body: 'y' }, T); assert.equal(sent.filter(s => s.url.includes('gone')).length, 0, 'a 410 device is deleted');
});
test('new request -> manager push; assigned job -> worker push; worker chat stays between worker and office', async () => {
  const wp = phone('wrk'); await call('app67/push/sub', { sub: wp.sub }, Wk);
  sent.length = 0; const r = await call('t/workorders', { title: 'Dishwasher leaking', description: 'Water under it', priority: 'high' }, T); assert.equal(r.status, 200); const id = r.json.id;
  const mm = sent.filter(s => s.url.endsWith('/mgr')); assert.equal(mm.length, 1);
  sent.length = 0; assert.equal((await call(`m/x65/job/${id}/assign`, { vendor_id: wv }, M)).status, 200);
  const ww = sent.filter(s => s.url.endsWith('/wrk')); assert.equal(ww.length, 1); assert.match(wp.open(ww[0].body).title, /New job: Dishwasher/);
  assert.equal((await call(`app67/chat/${id}`, { text: 'Can I come at 9?' }, Wk)).status, 200);
  const mc = await call(`app67/chat/${id}`, { text: 'Yes, tenant knows' }, M); assert.deepEqual(mc.json.msgs.map(m => m.side), ['w', 'm']);
  assert.equal((await call(`app67/chat/${id}`, null, T)).status, 403);
  const tv = await call(`t/workorders/${id}`, null, T); assert.ok(!JSON.stringify(tv.json).includes('Can I come at 9'), 'tenant never sees the worker chat');
  const th = (await call('app67/chats', null, Wk)).json.threads; assert.equal(th[0].wo_id, id);
  const other = (await call('m/workorders', { title: 'Not his', description: 'x' }, M)); if (other.json && other.json.id) assert.equal((await call(`app67/chat/${other.json.id}`, null, Wk)).status, 403);
  const q = await call(`w/jobs/${id}/quote`, { amount: '180.00', note: 'Replace hose' }, Wk); assert.equal(q.status, 200);
  const ap = (await call('app67/m/approvals', null, M)).json; assert.equal(ap.quotes.length, 1); assert.equal(ap.quotes[0].amount, 18000);
  assert.equal((await call('app67/m/approvals', null, T)).status, 403);
});
test('photos and invoice PDFs from the phone camera or files ride the worker chat; other file types are refused', async () => {
  const r = await call('t/workorders', { title: 'Window stuck', description: 'Will not open' }, T); const id = r.json.id;
  assert.equal((await call(`m/x65/job/${id}/assign`, { vendor_id: wv }, M)).status, 200);
  const up = async (fs, text, tok) => { const fd = new FormData(); if (text) fd.append('text', text); for (const [n, t, b] of fs) fd.append('file', new File([b], n, { type: t }));
    const res = await worker.fetch(new Request(`http://x/api/app67/chat/${id}`, { method: 'POST', headers: { 'x-pm-app': '1', authorization: 'Bearer ' + tok }, body: fd }), env, { waitUntil: () => {} }); return { status: res.status, json: JSON.parse(await res.text()) }; };
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
  const a = await up([['done.png', 'image/png', png], ['invoice.pdf', 'application/pdf', new TextEncoder().encode('%PDF-1.4 test')]], 'Invoice attached', Wk); assert.equal(a.status, 200);
  const g = (await call(`app67/chat/${id}`, null, M)).json; const last = g.msgs[g.msgs.length - 1];
  assert.equal(last.body, 'Invoice attached'); assert.deepEqual(last.files.map(f => f.ctype), ['image/png', 'application/pdf']);
  const fr = await worker.fetch(new Request(`http://x/api/files/${last.files[1].id}`, { headers: { 'x-pm-app': '1', authorization: 'Bearer ' + Wk } }), env, { waitUntil: () => {} }); assert.equal(fr.status, 200, 'the worker can open the invoice on their own job');
  const bad = await up([['notes.txt', 'text/plain', new TextEncoder().encode('hi')]], '', Wk); assert.equal(bad.status, 400);
  const only = await up([['p.png', 'image/png', png]], '', M); assert.equal(only.status, 200);
  const g2 = (await call(`app67/chat/${id}`, null, Wk)).json; assert.equal(g2.msgs[g2.msgs.length - 1].body, 'Sent a file');
});
test('passkey: register, sign in with a signature, refuse a wrong one and a reused challenge', async () => {
  const rb = (await call('app67/pk/regbegin', {}, T)).json; assert.equal(rb.rp.id, 'x');
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }); const spki = kp.publicKey.export({ type: 'spki', format: 'der' }); const credId = b64u(crypto.randomBytes(16));
  const cdj = (type, ch) => b64u(Buffer.from(JSON.stringify({ type, challenge: ch, origin: 'http://x' })));
  const reg = await call('app67/pk/register', { id: credId, publicKey: b64u(spki), alg: -7, clientDataJSON: cdj('webauthn.create', rb.challenge), name: 'Test phone' }, T); assert.equal(reg.status, 200); assert.equal(reg.json.passkeys.length, 1);
  const assertion = async (n, key) => { const ch = (await call('app67/pk/begin', {})).json.challenge; const ad = Buffer.concat([crypto.createHash('sha256').update('x').digest(), Buffer.from([0x05, 0, 0, 0, n])]); const c = cdj('webauthn.get', ch);
    const sig = crypto.sign('sha256', Buffer.concat([ad, crypto.createHash('sha256').update(unb(c)).digest()]), key || kp.privateKey); return { id: credId, authenticatorData: b64u(ad), clientDataJSON: c, signature: b64u(sig), _ch: ch }; };
  const a1 = await assertion(1); const ok = await call('app67/pk/login', a1); assert.equal(ok.status, 200); assert.equal(ok.json.user.role, 'tenant');
  assert.equal((await call('app67/me', null, ok.json.token)).json.user.email, 'tenant@example.com');
  assert.equal((await call('app67/pk/login', a1)).status >= 400, true, 'same challenge twice');
  const bad = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }); assert.equal((await call('app67/pk/login', await assertion(2, bad.privateKey))).status, 401);
  assert.equal((await call('app67/pk/login', await assertion(1))).status, 401, 'counter must go up');
  assert.equal((await call('app67/pk/login', await assertion(3))).status, 200);
});
test('stay signed in: refresh gives a fresh session; sign out ends it', async () => {
  const r = await call('app67/refresh', {}, O); assert.equal(r.status, 200); assert.notEqual(r.json.token, O);
  assert.equal((await call('app67/me', null, r.json.token)).json.user.role, 'owner');
  assert.equal((await call('app67/signout', {}, r.json.token)).status, 200); assert.equal((await call('app67/me', null, r.json.token)).status, 401);
  assert.equal((await call('app67/me', null, O)).status, 200, 'the other session still works');
});
