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

let tok = '';
const tb = async () => (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals;
const reg = async b => (await call('m/x24/register/' + b, null, 'GET', tok)).json;
let BID = 0, BID2 = 0, P1 = 0, ACC = 0;
test('d73 record check: posts bank credit / expense debit, nothing to print, uncleared in the register, open in reconcile', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'R73 Tester', company: 'R73 Demo Mgmt', email: 'r73@example.com', password: 'R73-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const ba = await call('m/bank-accounts', { name: 'Operating', institution: 'Demo Bank', last4: '7301' }, 'POST', tok); assert.equal(ba.status, 200, ba.text);
  const ba2 = await call('m/bank-accounts', { name: 'Reserve', institution: 'Demo Bank', last4: '7302' }, 'POST', tok); assert.equal(ba2.status, 200, ba2.text);
  const cfg0 = (await call('m/x66/cfg', null, 'GET', tok)).json; BID = cfg0.banks[0].id; BID2 = cfg0.banks[1].id; assert.equal(cfg0.banks[0].next_no, 1001);
  const p1 = await call('m/properties/external', { name: '7 Birch Lane', address: '7 Birch Lane', city: 'Trenton', state: 'NJ', zip: '08611' }, 'POST', tok); P1 = p1.json.id;
  ACC = (cfg0.accounts.find(a => /repair/i.test(a.name)) || cfg0.accounts.find(a => a.type === 'expense')).id;
  const t0 = await tb(); const r0 = await reg(BID);
  const r = await call('m/x66/checks', { record: 1, method: 'Check', bank_account_id: BID, date: T, payee_kind: 'new', payee_name: 'Home Depot', memo: 'Paint', lines: [{ account_id: ACC, property_id: P1, amount: '84.10' }], amount: '84.10', to_print: true }, 'POST', tok);
  assert.equal(r.status, 200, r.text); assert.equal(r.json.check_no, '', 'no number was typed: none is used');
  const c = (await call('m/x66/checks/' + r.json.id, null, 'GET', tok)).json; assert.equal(c.status, 'written'); assert.equal(c.to_print, false); assert.equal(c.rec, true);
  const cfg1 = (await call('m/x66/cfg', null, 'GET', tok)).json; assert.equal(cfg1.banks[0].next_no, 1001, 'printing sequence untouched'); assert.equal(cfg1.to_print || 0, 0, 'nothing waits to print');
  const t1 = await tb(); assert.equal(t1.debit, t1.credit); assert.equal(t1.debit - t0.debit, 8410);
  const r1 = await reg(BID); const row = r1.rows.find(x => x.check_id === r.json.id); assert.ok(row, 'in the register'); assert.equal(row.amount, -8410); assert.ok(!row.cleared && !row.st, 'uncleared'); assert.equal(r1.balance, r0.balance - 8410);
  const m = (await call('m/x24/match/' + BID, null, 'GET', tok)).json; const bk = m.books.find(e => r.json.journal_ids.includes(e.id)); assert.ok(bk, 'listed in reconcile'); assert.ok(!bk.cleared, 'open to match');
  const e = (await call('m/entry/' + r.json.journal_ids[0], null, 'GET', tok)).json; assert.equal(e.method || 'Check', 'Check');
});
test('d73 record: check number kept and refused twice; a debit-card payment has no number and shows its method', { skip: !PW }, async () => {
  const a = await call('m/x66/checks', { record: 1, method: 'Check', check_no: '5005', bank_account_id: BID, date: T, payee_kind: 'new', payee_name: 'City Water', lines: [{ account_id: ACC, amount: '40.00' }], amount: '40.00' }, 'POST', tok);
  assert.equal(a.status, 200, a.text); assert.equal(a.json.check_no, '5005');
  const dup = await call('m/x66/checks', { record: 1, method: 'Check', check_no: '5005', bank_account_id: BID, date: T, payee_kind: 'new', payee_name: 'City Water', lines: [{ account_id: ACC, amount: '40.00' }], amount: '40.00' }, 'POST', tok);
  assert.equal(dup.status, 400, dup.text);
  const d = await call('m/x66/checks', { record: 1, method: 'Debit card', check_no: '777', bank_account_id: BID, date: T, payee_kind: 'new', payee_name: 'Lowes', lines: [{ account_id: ACC, amount: '12.34' }], amount: '12.34' }, 'POST', tok);
  assert.equal(d.status, 200, d.text); assert.equal(d.json.check_no, '');
  const row = (await reg(BID)).rows.find(x => x.check_id === d.json.id); assert.equal(row.type, 'Debit card');
  const list = (await call('m/x66/checks', null, 'GET', tok)).json; const li = list.checks.find(x => x.id === d.json.id); assert.equal(li.method, 'Debit card'); assert.equal(li.to_print, false);
  const t = await tb(); assert.equal(t.debit, t.credit);
});
test('d73 record transfer between two banks: two-sided, balances, trial balance even', { skip: !PW }, async () => {
  const t0 = await tb(); const a0 = (await reg(BID)).balance, b0 = (await reg(BID2)).balance;
  const x = await call('m/x39/transfer', { from_id: BID, to_id: BID2, amount: '250.00', date: T, memo: 'to reserve' }, 'POST', tok); assert.equal(x.status, 200, x.text);
  const a1 = (await reg(BID)).balance, b1 = (await reg(BID2)).balance; assert.equal(a1, a0 - 25000); assert.equal(b1, b0 + 25000);
  const t1 = await tb(); assert.equal(t1.debit, t1.credit); assert.equal(t1.debit - t1.credit, t0.debit - t0.credit);
});
test('d73 bank page: one row of Record check / Record deposit / Record transfer; Write check stays a small link', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const i = js.indexOf('// ===== d73 bank account'); assert.ok(i > 0); const seg = js.slice(i, i + 4000);
  for (const w of ['Record withdrawal', 'Record deposit', 'Record transfer', 'rec=1', 'Check station', '#/checkstation?bank=', "$('#rd37', root)?.remove()", "$('.ck66wb', root)?.remove()"]) assert.ok(seg.includes(w), w);
  assert.ok(js.includes("body.record = 1; body.method = f.elements.method.value;"));
  const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8'); assert.ok(/\.rb73\{[^}]*height:36px[^}]*border-radius:6px/.test(css));
});
