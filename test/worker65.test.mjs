import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker65.mjs');
const worker = (await import('/tmp/pm-test-worker65.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
const F = { failOn: null, hangBatch: false, hangQuery: null };
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { if (F.hangQuery && F.hangQuery.test(this.sql)) { F.hangQuery = null; return new Promise(() => {}); } return { results: this._s().all(...this.args) }; }
  async first() { if (F.hangQuery && F.hangQuery.test(this.sql)) { F.hangQuery = null; return new Promise(() => {}); } return this._s().get(...this.args) ?? null; }
  async run() { if (F.failOn && F.failOn.test(this.sql)) { F.failOn = null; throw new Error('D1_ERROR: injected failure'); } const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { if (F.hangBatch) { F.hangBatch = false; return new Promise(() => {}); } sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) } };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
const T = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); const M = T.slice(0, 7);
const prevM = (() => { const [y, m] = M.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();



const form = async (p, fields, tok) => { const fd = new FormData(); for (const [k, v] of fields) fd.append(k, v); const r = await worker.fetch(new Request('http://x/api/' + p, { method: 'POST', headers: { 'x-pm-app': '1', authorization: 'Bearer ' + tok }, body: fd }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t }; };
const jpg = () => new File([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 255, 217])], 'done.jpg', { type: 'image/jpeg' });
const login = async (email, password) => { const r = await call('login', { email, password }); assert.equal(r.status, 200, r.text); return r.json.token; };
let tok = '', dTok = '', jTok = '', D = {}, J = {};
const tb = async () => (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals;
test('d65 workers: add with login, category auto-assign, a worker sees only his own jobs', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'W65 Tester', company: 'W65 Demo Mgmt', email: 'w65@example.com', password: 'W65-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const ba = await call('m/bank-accounts', { name: 'Operating', institution: 'Demo Bank', last4: '6501' }, 'POST', tok); assert.equal(ba.status, 200, ba.text);
  const p = await call('m/properties/external', { name: '12 Oak Street', address: '12 Oak Street', city: 'Trenton', state: 'NJ', zip: '08611' }, 'POST', tok); assert.equal(p.status, 200, p.text);
  const d = await call('m/x65/workers', { name: 'David Plumber', email: 'david.w65t@example.com', phone: '609-555-0101', kind: 'contractor', cats: ['plumbing'], login: true }, 'POST', tok); assert.equal(d.status, 200, d.text); assert.ok(d.json.temp_password); D = d.json;
  const j = await call('m/x65/workers', { name: 'Jim Roofer', email: 'jim.w65t@example.com', kind: 'contractor', cats: ['roof', 'walls'], login: true }, 'POST', tok); assert.equal(j.status, 200, j.text); J = j.json;
  const v = (await call('m/vendors', null, 'GET', tok)).json; const vl = Array.isArray(v) ? v : (v.vendors || v.list || []); assert.ok(vl.some(x => x.name === 'David Plumber'), 'a worker is an ordinary vendor (bills, 1099)');
  const c = await call('m/x65/cfg', { mode: 'category', cats: { plumbing: D.vendor_id, roof: J.vendor_id, walls: J.vendor_id } }, 'POST', tok); assert.equal(c.status, 200, c.text);
  const w1 = await call('m/workorders', { title: 'Kitchen sink leaking', category: 'Plumbing', property_id: p.json.id }, 'POST', tok); assert.equal(w1.status, 200, w1.text);
  const w2 = await call('m/workorders', { title: 'Water stain on ceiling', category: 'Roof / Leak from ceiling', property_id: p.json.id }, 'POST', tok);
  const w3 = await call('m/workorders', { title: 'Repaint hallway', category: 'Walls / Paint', property_id: p.json.id }, 'POST', tok);
  const w4 = await call('m/workorders', { title: 'Garage door stuck', category: 'Doors', property_id: p.json.id }, 'POST', tok);
  const vid = async id => (await call('m/x65/job/' + id, null, 'GET', tok)).json.worker;
  assert.equal((await vid(w1.json.id)).vendor_id, D.vendor_id); assert.equal((await vid(w2.json.id)).vendor_id, J.vendor_id); assert.equal((await vid(w3.json.id)).vendor_id, J.vendor_id); assert.equal(await vid(w4.json.id), null, 'no rule for doors, no general: stays unassigned');
  dTok = await login('david.w65t@example.com', D.temp_password); jTok = await login('jim.w65t@example.com', J.temp_password);
  const me = await call('me', null, 'GET', dTok); assert.equal(me.json.user.role, 'worker');
  const dj = (await call('w/jobs', null, 'GET', dTok)).json; assert.deepEqual(dj.jobs.map(x => x.title), ['Kitchen sink leaking']); assert.equal(dj.open.length, 0, 'open requests hidden unless the company allows it');
  assert.equal((await call('w/jobs/' + w2.json.id, null, 'GET', dTok)).status, 403, 'another worker\'s job');
  assert.equal((await call('m/x65/cfg', null, 'GET', dTok)).status, 403, 'a worker is not a manager');
  assert.equal((await call('m/properties', null, 'GET', dTok)).status, 403);
  assert.equal((await call('w/jobs', null, 'GET', tok)).status, 403, 'a manager is not a worker');
  D.wo = w1.json.id; J.wo = w2.json.id; D.prop = p.json.id; D.w4 = w4.json.id;
});
test('d65 price first: quote, approve, done photo, bill at the approved price in Bills/AP, pay, worker sees the payment', { skip: !PW }, async () => {
  const tb0 = await tb();
  assert.equal((await call('w/jobs/' + D.wo + '/quote', { amount: '0' }, 'POST', dTok)).status, 400);
  const q = await call('w/jobs/' + D.wo + '/quote', { amount: '245.50', note: 'New trap and supply lines' }, 'POST', dTok); assert.equal(q.status, 200, q.text); assert.equal(q.json.stage, 'quote_sent');
  let m = (await call('m/x65/job/' + D.wo, null, 'GET', tok)).json; assert.equal(m.stage, 'quote_sent'); assert.equal(m.parts.length, 0, 'nothing to mark done before the price is approved');
  const ap = await call('m/x65/quote/' + m.quotes[m.quotes.length - 1].id + '/approve', {}, 'POST', tok); assert.equal(ap.status, 200, ap.text);
  m = (await call('m/x65/job/' + D.wo, null, 'GET', tok)).json; assert.equal(m.parts.length, 1); assert.equal(m.parts[0].amount, 24550); assert.equal(m.total, 24550);
  const pid = m.parts[0].id;
  assert.equal((await call('m/x65/part/' + pid + '/bill', {}, 'POST', tok)).status, 400, 'no bill before the done photos');
  assert.equal((await form('w/parts/' + pid + '/done', [['note', 'All fixed']], dTok)).status, 400, 'a photo is required');
  assert.equal((await form('w/parts/' + pid + '/done', [['photo', jpg()]], jTok)).status, 403, 'another worker cannot mark it done');
  const dn = await form('w/parts/' + pid + '/done', [['photo', jpg()], ['photo', jpg()], ['note', 'All fixed']], dTok); assert.equal(dn.status, 200, dn.text); assert.equal(dn.json.parts[0].status, 'done'); assert.equal(dn.json.parts[0].photo_ids.length, 2);
  const ph = await worker.fetch(new Request('http://x/api/files/' + dn.json.parts[0].photo_ids[0], { headers: { 'x-pm-app': '1', authorization: 'Bearer ' + dTok } }), env, { waitUntil: () => {} }); assert.equal(ph.status, 200, 'the worker can open his own photo');
  const ph2 = await worker.fetch(new Request('http://x/api/files/' + dn.json.parts[0].photo_ids[0], { headers: { 'x-pm-app': '1', authorization: 'Bearer ' + jTok } }), env, { waitUntil: () => {} }); assert.equal(ph2.status, 403, 'not another worker');
  const bl = await call('m/x65/part/' + pid + '/bill', {}, 'POST', tok); assert.equal(bl.status, 200, bl.text); assert.ok(bl.json.bill_id);
  const bills = (await call('m/bills', null, 'GET', tok)).json; const bArr = Array.isArray(bills) ? bills : (bills.bills || bills.open || []);
  const b = bArr.find(x => x.id === bl.json.bill_id); assert.ok(b, 'the bill is in Bills'); assert.equal(b.amount, 24550); assert.equal(b.vendor_id, D.vendor_id);
  const t1 = await tb(); assert.equal(t1.debit, t1.credit, 'books balance after the bill'); 
  let wj = (await call('w/jobs', null, 'GET', dTok)).json; assert.equal(wj.earnings.owed, 24550); assert.equal(wj.bills.length, 1);
  const banks = (await call('m/chart', null, 'GET', tok)).json.banks; assert.ok(banks.length, 'a bank account to pay from');
  const pay = await call('m/bills/' + bl.json.bill_id + '/pay', { bank_account_id: banks[0].id, method: 'Check', ref: '501' }, 'POST', tok); assert.equal(pay.status, 200, pay.text);
  wj = (await call('w/jobs', null, 'GET', dTok)).json; assert.equal(wj.earnings.owed, 0); assert.equal(wj.earnings.paid_total, 24550);
  assert.equal(wj.payments.length, 1); assert.equal(wj.payments[0].amount, 24550); assert.equal(wj.payments[0].job, 'Kitchen sink leaking'); assert.equal(wj.payments[0].ref, '501');
  assert.equal(wj.jobs[0].stage, 'paid');
  const t2 = await tb(); assert.equal(t2.debit, t2.credit);
  const req = (await call('m/workorders/' + D.wo, null, 'GET', tok)).json; assert.equal(req.status, 'completed', 'the request is marked fixed when every part is billed');
});
test('d65 big project: agreed parts, each part billed and paid on its own, total / paid / remaining', { skip: !PW }, async () => {
  const w = await call('m/workorders', { title: 'Rebuild whole house', category: 'General', property_id: D.prop }, 'POST', tok); const id = w.json.id;
  assert.equal((await call('m/x65/job/' + id + '/price', { amount: '30000' }, 'POST', tok)).status, 400, 'assign a worker first');
  assert.equal((await call('m/x65/job/' + id + '/assign', { vendor_id: J.vendor_id }, 'POST', tok)).status, 200);
  const bad = await call('w/jobs/' + id + '/quote', { amount: '30000', parts: [{ title: 'Flooring', amount: '5000' }, { title: 'Kitchen', amount: '9000' }] }, 'POST', jTok); assert.equal(bad.status, 400, 'parts must add up to the total');
  const ask = await call('m/x65/job/' + id + '/ask', { note: 'Split it by room please' }, 'POST', tok); assert.equal(ask.status, 200);
  assert.equal((await call('w/jobs/' + id, null, 'GET', jTok)).json.stage, 'price_requested');
  const parts = [{ title: 'Demolition', amount: '4000' }, { title: 'Flooring', amount: '5000' }, { title: 'Kitchen', amount: '9000' }, { title: 'Bathrooms', amount: '7000' }, { title: 'Paint', amount: '5000' }];
  const q = await call('w/jobs/' + id + '/quote', { amount: '30,000', parts }, 'POST', jTok); assert.equal(q.status, 200, q.text);
  const dec = await call('m/x65/quote/' + q.json.quotes.pop().id + '/decline', { reason: 'Too high for paint' }, 'POST', tok); assert.equal(dec.status, 200);
  let wv = (await call('w/jobs/' + id, null, 'GET', jTok)).json; assert.equal(wv.stage, 'quote_declined'); assert.equal(wv.quotes.pop().reason, 'Too high for paint');
  parts[4].amount = '4000'; const q2 = await call('w/jobs/' + id + '/quote', { amount: '29000', parts }, 'POST', jTok); assert.equal(q2.status, 200, q2.text);
  assert.equal((await call('m/x65/quote/' + q2.json.quotes.pop().id + '/approve', {}, 'POST', tok)).status, 200);
  let m = (await call('m/x65/job/' + id, null, 'GET', tok)).json; assert.equal(m.parts.length, 5); assert.equal(m.total, 2900000); assert.equal(m.remaining, 2900000);
  const P = Object.fromEntries(m.parts.map(p => [p.title, p.id]));
  const banks = (await call('m/chart', null, 'GET', tok)).json.banks;
  assert.equal((await form('w/parts/' + P.Flooring + '/done', [['photo', jpg()]], jTok)).status, 200);
  const back = await call('m/x65/part/' + P.Flooring + '/reject', { reason: 'Finish the stairs too' }, 'POST', tok); assert.equal(back.status, 200);
  wv = (await call('w/jobs/' + id, null, 'GET', jTok)).json; const fl = wv.parts.find(p => p.id === P.Flooring); assert.equal(fl.status, 'open'); assert.equal(fl.reject_note, 'Finish the stairs too');
  assert.equal((await form('w/parts/' + P.Flooring + '/done', [['photo', jpg()]], jTok)).status, 200);
  const b1 = await call('m/x65/part/' + P.Flooring + '/bill', {}, 'POST', tok); assert.equal(b1.status, 200, b1.text);
  const p1 = await call('m/x65/part/' + P.Flooring + '/pay', { bank_account_id: banks[0].id, method: 'ACH', amount: '2000' }, 'POST', tok); assert.equal(p1.status, 200, p1.text);
  assert.equal((await form('w/parts/' + P.Demolition + '/done', [['photo', jpg()]], jTok)).status, 200);
  const b2 = await call('m/x65/part/' + P.Demolition + '/bill', { pay: { bank_account_id: banks[0].id, method: 'Check', ref: '777' } }, 'POST', tok); assert.equal(b2.status, 200, b2.text);
  m = (await call('m/x65/job/' + id, null, 'GET', tok)).json;
  assert.equal(m.paid, 600000); assert.equal(m.billed, 900000); assert.equal(m.remaining, 2300000); assert.equal(m.stage, 'billed');
  assert.equal(m.parts.find(p => p.id === P.Demolition).status, 'paid'); assert.equal(m.parts.find(p => p.id === P.Flooring).status, 'billed');
  const jw = (await call('w/jobs', null, 'GET', jTok)).json; const pays = jw.payments.filter(y => y.wo_id === id);
  assert.deepEqual(pays.map(y => [y.part, y.amount]).sort(), [['Demolition', 400000], ['Flooring', 200000]]); assert.equal(jw.earnings.owed, 300000);
  // parts: priced parts with work sent are locked; open ones can change; the total follows
  const lock = await call('m/x65/job/' + id + '/parts', { parts: m.parts.map(p => ({ id: p.id, title: p.title, amount: p.title === 'Flooring' ? 600000 : p.amount })) }, 'POST', tok); assert.equal(lock.status, 400, 'flooring is billed, its price cannot change');
  const ed = await call('m/x65/job/' + id + '/parts', { parts: [...m.parts.filter(p => p.title !== 'Paint').map(p => ({ id: p.id, title: p.title, amount: p.amount })), { title: 'Roof', amount: '8000' }] }, 'POST', tok); assert.equal(ed.status, 200, ed.text);
  m = (await call('m/x65/job/' + id, null, 'GET', tok)).json; assert.equal(m.total, 3300000); assert.ok(!m.parts.some(p => p.title === 'Paint')); assert.ok(m.parts.some(p => p.title === 'Roof'));
  const t = await tb(); assert.equal(t.debit, t.credit, 'books balance');
});
test('d65 assignment: everything to one person; open requests a worker can take; turned-off worker cannot sign in; per company', { skip: !PW }, async () => {
  assert.equal((await call('m/x65/cfg', { mode: 'one', one_vendor_id: null }, 'POST', tok)).status, 400, 'pick the person');
  assert.equal((await call('m/x65/cfg', { mode: 'one', one_vendor_id: D.vendor_id }, 'POST', tok)).status, 200);
  const w = await call('m/workers'.replace('m/workers', 'm/workorders'), { title: 'Smoke detector chirping', category: 'Smoke / CO detector', property_id: D.prop }, 'POST', tok);
  assert.equal((await call('m/x65/job/' + w.json.id, null, 'GET', tok)).json.worker.vendor_id, D.vendor_id);
  await call('m/x65/cfg', { mode: 'manual', see_open: true }, 'POST', tok);
  const w2 = await call('m/workorders', { title: 'Broken window latch', category: 'Windows', property_id: D.prop }, 'POST', tok);
  assert.equal((await call('m/x65/job/' + w2.json.id, null, 'GET', tok)).json.worker, null, 'manual: nobody');
  const o = (await call('w/jobs', null, 'GET', jTok)).json; assert.ok(o.open.some(x => x.id === w2.json.id), 'open request is visible');
  assert.equal((await call('w/jobs/' + w2.json.id, null, 'GET', jTok)).json.mine, false);
  const tk = await call('w/jobs/' + w2.json.id + '/take', {}, 'POST', jTok); assert.equal(tk.status, 200, tk.text);
  assert.equal((await call('w/jobs/' + w2.json.id + '/take', {}, 'POST', dTok)).status, 403, 'already taken');
  assert.equal((await call('m/x65/job/' + w2.json.id, null, 'GET', tok)).json.worker.vendor_id, J.vendor_id);
  const k = (await call('m/x65/cfg', null, 'GET', tok)).json.workers.find(x => x.vendor_id === J.vendor_id);
  assert.equal((await call('m/x65/workers/' + k.id + '/off', {}, 'POST', tok)).status, 200);
  assert.equal((await call('w/jobs', null, 'GET', jTok)).status, 401, 'signed out when turned off');
  const s2 = await call('signup', { name: 'Other Co', company: 'Other Co Mgmt', email: 'w65other@example.com', password: 'W65-other-pass!' }); const t2 = s2.json.token; await call('m/onboard', {}, 'POST', t2);
  const c2 = (await call('m/x65/cfg', null, 'GET', t2)).json; assert.equal(c2.workers.length, 0, 'another company sees none of these workers'); assert.equal(c2.cfg.mode, 'manual');
});

test('d65 bills after done: approve by default; automatic for all / trusted / under a limit; void puts it back; bill by hand shows in his portal', { skip: !PW }, async () => {
  const k = (await call('m/x65/cfg', null, 'GET', tok)).json.workers.find(x => x.vendor_id === J.vendor_id); await call('m/x65/workers/' + k.id + '/on', {}, 'POST', tok); jTok = await login('jim.w65t@example.com', J.temp_password);
  const banks = (await call('m/chart', null, 'GET', tok)).json.banks;
  const job = async (title, who, amount) => { const w = await call('m/workorders', { title, category: 'General', property_id: D.prop }, 'POST', tok); await call('m/x65/job/' + w.json.id + '/assign', { vendor_id: who }, 'POST', tok); const r = await call('m/x65/job/' + w.json.id + '/price', { amount }, 'POST', tok); assert.equal(r.status, 200, r.text); return (await call('m/x65/job/' + w.json.id, null, 'GET', tok)).json; };
  const done = async (j, t) => { const r = await form('w/parts/' + j.parts[0].id + '/done', [['photo', jpg()]], t); assert.equal(r.status, 200, r.text); return (await call('m/x65/job/' + j.id, null, 'GET', tok)).json.parts[0]; };
  // default: off -> waits for approval
  assert.equal((await call('m/x65/cfg', null, 'GET', tok)).json.cfg.auto_bill, 'off');
  let p = await done(await job('Fix railing', D.vendor_id, '150'), dTok); assert.equal(p.status, 'done'); assert.equal(p.bill_id, null, 'no bill until the manager approves');
  // all
  assert.equal((await call('m/x65/cfg', { auto_bill: 'all' }, 'POST', tok)).status, 200);
  const ja = await job('Replace outlet cover', D.vendor_id, '40'); p = await done(ja, dTok); assert.equal(p.status, 'billed'); assert.ok(p.bill_id); assert.equal(p.auto, true);
  // void the automatic bill in Bills: the part waits for approval again, then the manager can approve or send back
  assert.equal((await call('m/bills/' + p.bill_id + '/void', {}, 'POST', tok)).status, 200);
  p = (await call('m/x65/job/' + ja.id, null, 'GET', tok)).json.parts[0]; assert.equal(p.status, 'done'); assert.equal(p.bill_id, null); assert.equal(p.bill_voided, true);
  const rb = await call('m/x65/part/' + p.id + '/bill', {}, 'POST', tok); assert.equal(rb.status, 200, rb.text); assert.ok(rb.json.bill_id);
  // trusted
  assert.equal((await call('m/x65/cfg', { auto_bill: 'trusted', trusted: [] }, 'POST', tok)).status, 400, 'pick a trusted worker');
  assert.equal((await call('m/x65/cfg', { auto_bill: 'trusted', trusted: [D.vendor_id] }, 'POST', tok)).status, 200);
  assert.equal((await done(await job('Unclog tub', D.vendor_id, '90'), dTok)).status, 'billed', 'trusted worker');
  assert.equal((await done(await job('Patch roof flashing', J.vendor_id, '300'), jTok)).status, 'done', 'not trusted: waits');
  // under a limit
  assert.equal((await call('m/x65/cfg', { auto_bill: 'under', under: '' }, 'POST', tok)).status, 400);
  assert.equal((await call('m/x65/cfg', { auto_bill: 'under', under: '250' }, 'POST', tok)).status, 200);
  assert.equal((await done(await job('Small paint touch-up', J.vendor_id, '120'), jTok)).status, 'billed', 'under the limit');
  assert.equal((await done(await job('Gutter replacement', J.vendor_id, '900'), jTok)).status, 'done', 'over the limit waits');
  // a bill by hand (Bills > New bill) for a worker shows in his portal, and its payment too
  const before = (await call('w/jobs', null, 'GET', jTok)).json;
  const hb = await call('m/bills', { vendor_id: J.vendor_id, amount: '75', memo: 'Emergency call-out Saturday', account_id: (await call('m/x65/cfg', null, 'GET', tok)).json.cfg.account_id }, 'POST', tok); assert.equal(hb.status, 200, hb.text);
  let wj = (await call('w/jobs', null, 'GET', jTok)).json; assert.equal(wj.earnings.owed - before.earnings.owed, 7500); assert.ok(wj.bills.some(b => b.part === 'Emergency call-out Saturday' && !b.wo_id));
  assert.equal((await call('m/bills/' + hb.json.bill_id + '/pay', { bank_account_id: banks[0].id, method: 'Zelle' }, 'POST', tok)).status, 200);
  wj = (await call('w/jobs', null, 'GET', jTok)).json; assert.ok(wj.payments.some(y => y.part === 'Emergency call-out Saturday' && y.amount === 7500 && y.method === 'Zelle'));
  const t = await tb(); assert.equal(t.debit, t.credit, 'books balance');
  await call('m/x65/cfg', { auto_bill: 'off' }, 'POST', tok);
});
