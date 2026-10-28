// d80: two-step sign-in for tenant + owner portals (app, backup, email fallback, remember device, Off/Optional/Required), no card fee on debit/prepaid +
// fee notice, Stripe PaymentMethod-first card flow, gross-up fee option, late ACH bounce sent as a dispute -> bank return + NSF, shared email sender.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker80.mjs');
const worker = (await import('/tmp/pm-test-worker80.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-12-02' };
const call = async (p, body, tok, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j }; };
const L = fs.readFileSync('demo-logins.local.txt', 'utf8'); const pw = e => (L.match(new RegExp(e.replace('.', '\\.') + '\\s+password:\\s*(\\S+)')) || [])[1];
const login = async (e, p) => (await call('login', { email: e, password: p || pw(e) })).json.token;
const pub = async (p, body, hdrs = {}, method) => { const r = await worker.fetch(new Request('http://x/api/pub/x69/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...hdrs }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t, headers: r.headers }; };
const page = async (p) => { const r = await worker.fetch(new Request('http://x' + p), env, { waitUntil: () => {} }); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') }; };
const tb = async (M) => { const t = (await call('m/reports/trial-balance', null, M)).json.totals; return [t.debit, t.credit]; };

const q = (sql, ...a) => sq.prepare(sql).all(...a); const q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const realFetch = globalThis.fetch; const sent = [];
globalThis.fetch = async (u, o = {}) => { const s = String(u); const bodyP = o.body ? Object.fromEntries(new URLSearchParams(String(o.body))) : {};
  const js = (x) => new Response(JSON.stringify(x), { headers: { 'content-type': 'application/json' } });
  if (s.startsWith('https://api.stripe.com/v1/account')) return js({ id: 'acct_test80', business_profile: { name: 'Test Co' } });
  if (s.startsWith('https://api.stripe.com/v1/payment_methods/')) { const id = s.split('/').pop(); return js({ id, card: { funding: id.includes('debit') ? 'debit' : id.includes('prepaid') ? 'prepaid' : 'credit', brand: 'visa', last4: '4242' } }); }
  if (s === 'https://api.stripe.com/v1/payment_intents') { sent.push({ to: 'stripe_pi', body: bodyP }); return js({ id: 'pi_test80_' + sent.length, status: 'succeeded', amount: +bodyP.amount, metadata: {} }); }
  if (s.startsWith('https://api.resend.com/')) { sent.push({ to: 'resend', body: JSON.parse(o.body) }); return js({ id: 're_test80' }); }
  return realFetch(u, o); };
const b32d = s => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = []; for (const c of s.replace(/\s/g, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const totp = (sec, dt = 0) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + dt)); const h = crypto.createHmac('sha1', b32d(sec)).update(c).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0'); };
const raw = async (p, body, headers = {}) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...headers }, body: JSON.stringify(body) }), env, { waitUntil: () => {} }); return { status: r.status, json: await r.json(), cookies: r.headers.getSetCookie ? r.headers.getSetCookie() : [] }; };
let M, TT, OO, SEC;
test('two-step for tenants: optional by default, app + backup codes + email code + remember device; Off skips it', async () => {
  M = await login('manager@example.com');
  const c0 = (await call('m/x80/cfg', null, M)).json; assert.deepEqual([c0.policy.tenant, c0.policy.owner, c0.policy.email], ['optional', 'optional', 1]); assert.equal(c0.emailing, 'practice');
  TT = await login('tenant@example.com'); assert.ok(TT, 'no app yet -> plain sign-in');
  const me = (await call('t/x80/me', null, TT)).json; assert.equal(me.mode, 'optional'); assert.equal(me.on, false);
  const st = (await call('t/x80/start', {}, TT)).json; assert.ok(st.uri.startsWith('otpauth://totp/')); SEC = st.secret;
  assert.equal((await call('t/x80/confirm', { code: '000000' }, TT)).status, 400);
  const cf = (await call('t/x80/confirm', { code: totp(SEC) }, TT)).json; assert.equal(cf.codes.length, 10);
  const l1 = await raw('login', { email: 'tenant@example.com', password: pw('tenant@example.com') }); assert.equal(l1.json.mfa_required, true); assert.equal(l1.json.token, undefined);
  assert.deepEqual(l1.json.methods, ['app', 'backup', 'email']); assert.equal(l1.json.sim_code, undefined, 'app users get no email until they ask');
  assert.equal((await raw('login/2fa', { challenge: l1.json.challenge, code: '123456' })).status, 401);
  const ok1 = await raw('login/2fa', { challenge: l1.json.challenge, code: totp(SEC, 1), remember: true }); assert.equal(ok1.status, 200, JSON.stringify(ok1.json)); assert.ok(ok1.json.token);
  const dv = ok1.cookies.find(c => c.startsWith('pm_dv=')); assert.ok(dv, 'remember-device cookie');
  assert.equal(q1('SELECT COUNT(*) n FROM staff32 WHERE user_id=(SELECT id FROM users WHERE email=?)', 'tenant@example.com').n, 0, 'tenant never becomes staff');
  const l2 = await raw('login', { email: 'tenant@example.com', password: pw('tenant@example.com') }, { cookie: dv.split(';')[0] }); assert.ok(l2.json.token, 'remembered device skips the code');
  const l3 = await raw('login', { email: 'tenant@example.com', password: pw('tenant@example.com') }); const em = await raw('login/2fa/email', { challenge: l3.json.challenge });
  assert.equal(em.json.emailing, 'practice'); assert.match(em.json.sim_code, /^\d{6}$/); assert.equal((await raw('login/2fa/email', { challenge: l3.json.challenge })).status, 429, '30 s spacing');
  assert.equal((await raw('login/2fa', { challenge: l3.json.challenge, code: em.json.sim_code })).status, 200);
  const l4 = await raw('login', { email: 'tenant@example.com', password: pw('tenant@example.com') }); const bk = await raw('login/2fa', { challenge: l4.json.challenge, code: cf.codes[0] }); assert.equal(bk.status, 200); assert.equal(bk.json.used_backup, true); assert.equal(bk.json.backup_left, 9);
  assert.equal((await call('m/x80/cfg', { tenant: 'off' }, M)).status, 200);
  const l5 = await raw('login', { email: 'tenant@example.com', password: pw('tenant@example.com') }); assert.ok(l5.json.token, 'Off: no code step');
  assert.equal((await call('t/x80/start', {}, TT)).status, 403);
  assert.equal((await call('m/x80/cfg', { tenant: 'optional' }, M)).status, 200);
  assert.equal((await call('m/x80/cfg', { tenant: 'sometimes' }, M)).status, 400);
});
test('two-step for owners: Required -> email code at once (practice code on screen), then app setup; cannot turn off while required', async () => {
  assert.equal((await call('m/x80/cfg', { owner: 'required' }, M)).status, 200);
  const l1 = await raw('login', { email: 'owner@example.com', password: pw('owner@example.com') }); assert.equal(l1.json.mfa_required, true); assert.deepEqual(l1.json.methods, ['email']); assert.match(l1.json.sim_code, /^\d{6}$/);
  assert.equal((await raw('login/2fa', { challenge: l1.json.challenge, code: '000001' })).status, 401);
  const ok = await raw('login/2fa', { challenge: l1.json.challenge, code: l1.json.sim_code }); assert.equal(ok.status, 200); OO = ok.json.token;
  const me = (await call('o/x80/me', null, OO)).json; assert.equal(me.setup_needed, true); assert.equal(me.mode, 'required');
  const st = (await call('o/x80/start', {}, OO)).json; const cf = (await call('o/x80/confirm', { code: totp(st.secret) }, OO)).json; assert.equal(cf.codes.length, 10);
  assert.equal((await call('o/x80/me', null, OO)).json.setup_needed, false);
  const off = await call('o/x80/off', { password: pw('owner@example.com') }, OO); assert.equal(off.status, 400); assert.match(off.json.error, /requires/);
  assert.equal((await call('m/x80/cfg', { owner: 'optional' }, M)).status, 200);
  assert.equal((await call('o/x80/off', { password: pw('owner@example.com') }, OO)).status, 200);
  assert.ok(await login('owner@example.com'), 'optional + app off -> plain sign-in again');
  assert.ok([403, 404].includes((await call('m/x80/cfg', { owner: 'required' }, TT)).status), 'tenant cannot change the policy');
});
test('card fee: no surcharge on debit / prepaid, credit capped at min(3%, configured %), notice before paying and on the receipt', async () => {
  assert.equal((await call('m/x69/cfg', { pay: { mode: 'test' } }, M)).status, 200);
  const g = (await call('t/x77/pay', null, TT)).json; assert.equal(g.fee_notice.surcharge, true); assert.match(g.fee_notice.text, /credit card surcharge/); assert.match(g.fee_notice.text, /Debit cards and prepaid cards have no surcharge/); assert.equal(g.fee_rules.debit_free, true);
  const deb = (await call('t/x77/cardfee', { amount: '1500', card_number: '4000056655665556' }, TT)).json; assert.equal(deb.funding, 'debit'); assert.equal(deb.fee, 0); assert.equal(deb.total, 150000);
  const pre = (await call('t/x77/cardfee', { amount: '1500', card_number: '5105105105105100' }, TT)).json; assert.equal(pre.funding, 'prepaid'); assert.equal(pre.fee, 0);
  const cr = (await call('t/x77/cardfee', { amount: '1500', card_number: '4242424242424242' }, TT)).json; assert.equal(cr.funding, 'credit'); assert.equal(cr.fee, 4350, '2.9% of $1,500 (cap = configured 2.9%, under 3%)'); assert.match(cr.notice, /surcharge of \$43\.50/);
  const p1 = (await call('t/x77/pay', { method: 'card', amount: '100', card: { number: '4000056655665556', exp: '12/30', cvc: '123' } }, TT)).json; assert.equal(p1.fee, 0); assert.equal(p1.funding, 'debit'); assert.equal(p1.total, 10000);
  const o1 = q1('SELECT fee, fee_by, charged FROM op77 WHERE ext=?', p1.ref); assert.equal(o1.fee_by, 'company'); assert.equal(o1.charged, 10000);
  const p2 = (await call('t/x77/pay', { method: 'card', amount: '100', card: { number: '4242424242424242', exp: '12/30', cvc: '123' } }, TT)).json; assert.equal(p2.fee, 290); assert.equal(p2.surcharge, true); assert.equal(p2.total, 10290);
  const [dr, crd] = await (async () => { const t = (await call('m/reports/trial-balance', null, M)).json.totals; return [t.debit, t.credit]; })(); assert.equal(dr, crd, 'books balance');
  assert.equal((await call('m/x69/cfg', { pay: { card_pct: 3.5 } }, M)).status, 200);
  assert.equal((await call('t/x77/cardfee', { amount: '1000', card_number: '4242424242424242' }, TT)).json.fee, 3000, 'never above 3%');
  assert.equal((await call('m/x69/cfg', { pay: { card_pct: 2.9 } }, M)).status, 200);
});
test('gross-up option: tenant fee covers the processor fee exactly (company nets the full rent), still capped at 3%', async () => {
  const a = (await call('m/x80/payfee', { mode: 'cover', example_amount: 300000 }, M)).json; assert.equal(a.mode, 'cover'); assert.equal(a.example.cover, 8991); assert.equal(a.example.net_cover, 300000);
  assert.equal((await call('t/x77/cardfee', { amount: '3000', card_number: '4242424242424242' }, TT)).json.fee, 8991);
  assert.equal((await call('t/x77/cardfee', { amount: '1500', card_number: '4242424242424242' }, TT)).json.fee, 4500, '$1,500: gross-up 3.01% -> capped at 3%');
  assert.equal((await call('t/x77/cardfee', { amount: '3000', card_number: '4000056655665556' }, TT)).json.fee, 0, 'debit still free');
  assert.equal((await call('m/x80/payfee', { mode: 'pct' }, M)).json.mode, 'pct');
  assert.ok([403, 404].includes((await call('m/x80/payfee', { mode: 'cover' }, TT)).status));
});
test('Stripe mode card: PaymentMethod first, fee from card.funding, one PaymentIntent (debit = rent only, credit = rent + surcharge), receipt posted once', async () => {
  const sec = 'whsec_test80abcdef'; const k = await call('m/x69/cfg', { stripe: { sk: 'sk_test_' + 'a'.repeat(24), pk: 'pk_test_' + 'b'.repeat(24), whsec: sec } }, M); assert.equal(k.status, 200, JSON.stringify(k.json)); const k2 = await call('m/x69/cfg', { pay: { mode: 'stripe' } }, M); assert.equal(k2.status, 200, JSON.stringify(k2.json));
  const g = (await call('t/x77/pay', null, TT)).json; assert.ok(g.fee_rules.pk.startsWith('pk_test_'));
  assert.equal((await call('t/x77/pay', { method: 'card', amount: '200' }, TT)).status, 400, 'card first');
  const f = (await call('t/x77/cardfee', { amount: '200', payment_method: 'pm_card_debit' }, TT)).json; assert.equal(f.funding, 'debit'); assert.equal(f.fee, 0);
  const a = (await call('t/x77/pay', { method: 'card', amount: '200', payment_method: 'pm_card_debit', expect_fee: '0' }, TT)).json; assert.equal(a.ok, true); assert.equal(sent.at(-1).body.amount, '20000'); assert.equal(sent.at(-1).body['metadata[funding]'], 'debit');
  const b = (await call('t/x77/pay', { method: 'card', amount: '200', payment_method: 'pm_card_credit', expect_fee: '5.80' }, TT)).json; assert.equal(b.fee, 580); assert.equal(sent.at(-1).body.amount, '20580'); assert.equal(sent.at(-1).body['metadata[surcharge]'], '580');
  assert.equal((await call('t/x77/pay', { method: 'card', amount: '200', payment_method: 'pm_card_credit', expect_fee: '0' }, TT)).status, 409, 'fee changed -> ask again');
  assert.equal(q1('SELECT COUNT(*) n FROM op77 WHERE ext=?', a.ref).n, 1);
  assert.equal((await call('m/x69/cfg', { pay: { mode: 'test' } }, M)).status, 200);
});
test('late ACH bounce sent as charge.dispute.created (insufficient_funds) = bank return: unpaid again + NSF fee; a card dispute stays a dispute', async () => {
  const sec = 'whsec_test80abcdef';
  const a = (await call('t/x77/pay', { method: 'ach', amount: '150', bank: { routing: '110000000', account: '000123456789' } }, TT)).json;
  await call('m/x77/sim/run', {}, M); q('UPDATE op77 SET status=? WHERE ext=?', 'succeeded', a.ref);
  const before = (await call('t/x77/pay', null, TT)).json.balance;
  const sign = (body) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${crypto.createHmac('sha256', sec).update(t + '.' + body).digest('hex')}`; };
  const send = (body) => worker.fetch(new Request('http://x/api/pub/x69/stripe/hook?co=1', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sign(body) }, body }), env, { waitUntil: () => {} });
  const ev = JSON.stringify({ id: 'evt_test_80late', type: 'charge.dispute.created', created: 1765000000, data: { object: { id: 'dp_1', payment_intent: a.ref, reason: 'insufficient_funds', payment_method_details: { type: 'us_bank_account' } } } });
  const r = await send(ev); assert.equal(r.status, 200, await r.clone().text());
  const o = q1('SELECT * FROM op77 WHERE ext=?', a.ref); assert.equal(o.status, 'returned'); assert.equal(o.ret_code, 'R01'); assert.equal(o.ret_kind, 'failed'); assert.ok(o.nsf_jid, 'NSF fee charged');
  assert.equal((await call('t/x77/pay', null, TT)).json.balance, before + 15000 + 3500, 'rent owed again + NSF fee');
  const c = (await call('t/x77/pay', { method: 'card', amount: '50', card: { number: '4242424242424242', exp: '12/30', cvc: '123' } }, TT)).json;
  const ev2 = JSON.stringify({ id: 'evt_test_80card', type: 'charge.dispute.created', created: 1765000001, data: { object: { id: 'dp_2', payment_intent: c.ref, reason: 'insufficient_funds', payment_method_details: { type: 'card' } } } });
  assert.equal((await send(ev2)).status, 200); const oc = q1('SELECT status, nsf_jid FROM op77 WHERE ext=?', c.ref); assert.equal(oc.status, 'disputed'); assert.equal(oc.nsf_jid, null);
  const t = (await call('m/reports/trial-balance', null, M)).json.totals; assert.equal(t.debit, t.credit);
});
test('shared email sender: practice until the platform key is set; then From = company name at the shared address, Reply-To = company email', async () => {
  const e0 = (await call('m/x80/email', null, M)).json; assert.equal(e0.shared_on, false); assert.equal(e0.via, 'none');
  assert.equal((await call('m/x80/email', { shared_on: true, shared_reply: 'not-an-email' }, M)).status, 400);
  const e1 = (await call('m/x80/email', { shared_on: true, shared_reply: 'office@sterling-example.com' }, M)).json; assert.equal(e1.via, 'shared'); assert.equal(e1.mode, 'practice'); assert.equal(e1.reply_to, 'office@sterling-example.com'); assert.match(e1.from, /<notices@send\.doorhold\.app>$/);
  env.SHARED_EMAIL_KEY = 're_platform_test';
  try {
    assert.equal((await call('m/x80/email', null, M)).json.mode, 'live');
    const n0 = sent.length; const r = (await call('m/x78/send', { aud: { type: 'all' }, channel: 'email', subject: 'Hello', body: 'Test {first_name}', essential: true }, M));
    const mails = sent.slice(n0).filter(x => x.to === 'resend'); assert.ok(mails.length >= 1, JSON.stringify(r.json).slice(0, 300)); assert.match(mails[0].body.from, /<notices@send\.doorhold\.app>$/); assert.equal(mails[0].body.reply_to, 'office@sterling-example.com');
    assert.equal((await call('m/x80/cfg', { owner: 'required' }, M)).status, 200);
    const n1 = sent.length; const l = await raw('login', { email: 'owner@example.com', password: pw('owner@example.com') }); assert.equal(l.json.emailing, 'live'); assert.equal(l.json.sim_code, undefined, 'live: code only in the email');
    const m2 = sent.slice(n1).find(x => x.to === 'resend'); assert.ok(m2); assert.match(m2.body.subject, /sign-in code/); assert.equal(m2.body.to[0], 'owner@example.com');
  } finally { delete env.SHARED_EMAIL_KEY; await call('m/x80/cfg', { owner: 'optional' }, M); }
});
test('d80 client: login email method, portal two-step pages, settings cards, fee notice; style rules', async () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
  const b = js.slice(js.indexOf('// ===== d80')); assert.ok(b.length > 1000);
  for (const s of ["login/2fa/email", "/x80/me", "TV.t_security", "OV.o_security", "m/x80/cfg", "m/x80/payfee", "m/x80/email", "t/x77/cardfee"]) assert.ok(b.includes(s), s);
  const c = css.slice(css.indexOf('/* ===== d80')); assert.ok(c.length > 200); assert.ok(!/box-shadow/.test(c)); assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(b + c), 'no emoji');
  const app = fs.readFileSync(path.join(SITE, 'app', 'app.js'), 'utf8'); assert.ok(app.includes('login/2fa/email'));
});
