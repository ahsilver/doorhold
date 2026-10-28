// node --test test/access60.test.mjs — d60: access switches (price / purchases / expenses / reconcile), company-made roles, bank-line Ignore list
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker60.mjs');
const worker = (await import('/tmp/pm-test-worker60.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<!doctype html><html><head><title>x</title></head><body></body></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-10-22' };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t }; };
const G = (p, tok) => call(p, null, 'GET', tok);
let ot = '', bank = null, ch = null; const tok = {};
const NEEDLES = ['18734500', '187345', '187,345', '19185309', '432109'];
const leaks = t => NEEDLES.filter(n => t.includes(n));
async function user(tag, role, perms, sw) {
  const r = await call('m/x32/users', { name: 'T ' + tag, email: `t60.${tag}@example.com`, phone: '', role, perms: perms || null, houses: [], ...(sw ? { sw } : {}) }, 'POST', ot); assert.equal(r.status, 200, r.text);
  const l = await call('login', { email: `t60.${tag}@example.com`, password: r.json.temp_password }); const pw = 'Test60-' + tag + '-pw!';
  assert.equal((await call('m/password', { current: r.json.temp_password, next: pw }, 'POST', l.json.token)).status, 200);
  tok[tag] = (await call('login', { email: `t60.${tag}@example.com`, password: pw })).json.token;
}
test('setup: company, purchase closing 187,345 + costs, users per role and switch', async () => {
  const s = await call('signup', { name: 'Owen Sixty', company: 'Access 60 LLC', email: 'owen60@example.com', password: 'Access60-owner', phone: '' }); assert.equal(s.status, 200, s.text); ot = s.json.token;
  await call('m/onboard', { entities: [], banks: [{ name: 'Operating', institution: 'Chase', last4: '4411' }], properties: [] }, 'POST', ot);
  ch = (await G('m/chart', ot)).json; bank = ch.banks[0];
  const items = [{ label: 'Title - Settlement Fee', amount: '4321.09' }]; const ty = (await call('m/closing/types', { kind: 'purchase', items }, 'POST', ot)).json;
  const r = await call('m/closing/post', { kind: 'purchase', street: '77 Sample Lane', city: 'Toledo', state: 'OH', zip: '43607', units: 'House', closing_date: '2026-10-16', purchase_price: '187345', bank_account_id: bank.id, dep_how: 'none', items: items.map((it, i) => ({ ...it, account_id: ty.rows[i].account_id })) }, 'POST', ot);
  assert.equal(r.status, 200, r.text);
  const roles = (await G('m/x60/roles', ot)).json.roles; assert.ok(roles.find(x => x.key === 'bankrec' && x.sw.rec === 1 && x.perms.reports === 0 && x.perms.fin === 0));
  assert.equal(roles.find(x => x.key === 'maint').sw.price, 0, 'maintenance never sees purchase price');
  const nr = await call('m/x60/roles', { label: 'Requests + purchases', perms: { fin: 0, bank: 0, tenants: 1, maint: 2, reports: 0, settings: 0 }, sw: { price: 0, purch: 1, exp: 0, rec: 0 } }, 'POST', ot); assert.equal(nr.status, 200, nr.text);
  assert.equal((await call('m/x60/roles', { label: 'requests + PURCHASES' }, 'POST', ot)).status, 400, 'duplicate names refused');
  await user('maint', 'maint'); await user('bankrec', 'bankrec'); await user('reqpur', nr.json.key);
  await user('exp', 'view', { fin: 0, bank: 0, tenants: 1, maint: 1, reports: 0, settings: 0 }, { price: 0, purch: 0, exp: 1, rec: 0 });
  await user('books', 'books', { fin: 2, bank: 2, tenants: 2, maint: 2, reports: 2, settings: 0 }, { price: 0, purch: 1, exp: 1, rec: 1 });
  const us = (await G('m/x32/users', ot)).json.users; assert.equal(us.find(u => u.email === 't60.exp@example.com').sw.exp, 1); assert.equal(us.find(u => u.email === 't60.books@example.com').sw.price, 0);
});
test('purchase price never reaches someone without the switch (property, search, ledger, reports, report builder)', async () => {
  const eps = ['m/properties', 'm/properties/1', 'm/scorecard/1', 'm/capital', 'm/search?q=Sample', 'm/txns?limit=50', 'm/x35/txns?limit=50', 'm/accounts', 'm/coa', 'm/x26/house/1', 'm/property-activity/1', 'm/reports/pnl', 'm/reports/income-expense'];
  for (const t of ['maint', 'reqpur', 'exp', 'books']) for (const p of eps) { const r = await G(p, tok[t]); if (r.status === 200) assert.deepEqual(leaks(r.text), [], `${t} ${p}`); }
  for (const p of ['m/reports/cost-basis', 'm/reports/balance-sheet', 'm/reports/trial-balance', 'm/reports/cash-flow', 'm/x26/deal/1', 'm/entry/1/full']) assert.equal((await G(p, tok.books)).status, 403, p);
  const rb = await call('m/rb/run', { group: 'account', from: '2000-01-01' }, 'POST', tok.books); assert.equal(rb.status, 200); assert.deepEqual(leaks(rb.text), []);
  const own = await call('m/rb/run', { group: 'account', from: '2000-01-01' }, 'POST', ot); assert.ok(leaks(own.text).length, 'the owner still sees it');
  assert.ok(leaks((await G('m/properties/1', ot)).text).length);
});
test('record purchases without Financials; expenses only with My entries; no purchase-cost accounts without the purchases switch', async () => {
  const items = [{ label: 'Recording Fees', amount: '187.00' }]; const ty = (await call('m/closing/types', { kind: 'purchase', items }, 'POST', tok.reqpur)).json;
  const r = await call('m/closing/post', { kind: 'purchase', street: '12 Second Street', city: 'Toledo', state: 'OH', zip: '43607', units: 'House', closing_date: '2026-10-20', purchase_price: '99001', bank_account_id: bank.id, dep_how: 'none', items: items.map((it, i) => ({ ...it, account_id: ty.rows[i].account_id })) }, 'POST', tok.reqpur);
  assert.equal(r.status, 200, r.text); assert.equal((await G('m/txns', tok.reqpur)).status, 403);
  const rep = ch.accounts.find(a => a.name.startsWith('Repairs')); const pc = ch.accounts.find(a => a.name === 'Property Cost');
  assert.equal((await call('m/x24/expense', { amount: '12.34', account_id: rep.id, property_id: 1, paid_by: 'ach', bank_account_id: bank.id, memo: 'caulk' }, 'POST', tok.exp)).status, 200);
  assert.equal((await call('m/x24/expense', { amount: '1', account_id: pc.id, property_id: 1, paid_by: 'ach', bank_account_id: bank.id }, 'POST', tok.exp)).status, 403);
  assert.equal((await call('m/x24/expense', { amount: '9', account_id: rep.id, property_id: 1, paid_by: 'ach', bank_account_id: bank.id, memo: 'owner one' }, 'POST', ot)).status, 200);
  const mine = (await G('m/x60/mine', tok.exp)).json.entries; assert.deepEqual(mine.map(e => e.memo), ['caulk']);
  assert.equal((await G('m/txns', tok.exp)).status, 403); assert.equal((await call('m/x24/expense', { amount: '5', account_id: rep.id }, 'POST', tok.maint)).status, 403);
  assert.ok(!(await G('m/chart', tok.exp)).json.accounts.some(a => a.id === pc.id));
});
test('bank reconciler: match, ignore, restore, reconcile; no reports, no ledger; ignored lines come back at the bottom', async () => {
  const csv = 'Date,Description,Amount\n10/16/2026,WIRE OUT TITLE CO,-191853.09\n10/19/2026,MONTHLY SERVICE FEE,-15.00\n10/21/2026,POS COFFEE SHOP,-6.75\n';
  assert.equal((await call(`m/bank/${bank.id}/import`, { text: csv, filename: 's.csv' }, 'POST', ot)).status, 200);
  let md = (await G(`m/x24/match/${bank.id}`, tok.bankrec)).json; const cof = md.bank.find(t => /COFFEE/.test(t.description));
  assert.equal((await call(`m/bank/txn/${cof.id}/ignore`, {}, 'POST', tok.bankrec)).status, 200);
  md = (await G(`m/x24/match/${bank.id}`, tok.bankrec)).json; assert.ok(!md.bank.some(t => t.id === cof.id)); assert.deepEqual(md.ignored.map(t => t.id), [cof.id]);
  const cu = (await G('m/catchup?confidence=none', tok.bankrec)).json; assert.equal(cu.ignored, 1);
  assert.equal((await call(`m/bank/txn/${cof.id}/unmatch`, {}, 'POST', tok.bankrec)).status, 200);
  md = (await G(`m/x24/match/${bank.id}`, tok.bankrec)).json; assert.equal(md.ignored.length, 0);
  for (const p of ['m/reports/pnl', 'm/txns', 'm/rb/meta']) assert.equal((await G(p, tok.bankrec)).status, 403, p);
  assert.equal((await call(`m/bank/txn/${cof.id}/ignore`, {}, 'POST', tok.maint)).status, 403);
  // a property manager (Banking view) still can't match: unchanged
  await user('pm', 'pm'); assert.equal((await call(`m/bank/txn/${cof.id}/ignore`, {}, 'POST', tok.pm)).status, 403);
});
test('custom role: rename, used role cannot be deleted, unused one can', async () => {
  const roles = (await G('m/x60/roles', ot)).json.roles; const rp = roles.find(r => r.label === 'Requests + purchases');
  assert.equal((await call('m/x60/roles/' + rp.key, { label: 'Requests and purchases' }, 'POST', ot)).status, 200);
  assert.equal((await call('m/x60/roles/' + rp.key + '/delete', {}, 'POST', ot)).status, 400, 'in use');
  const n = await call('m/x60/roles', { label: 'Spare', perms: { fin: 1 } }, 'POST', ot); assert.equal((await call('m/x60/roles/' + n.json.key + '/delete', {}, 'POST', ot)).status, 200);
  assert.equal((await call('m/x60/roles/maint', { label: 'x' }, 'POST', ot)).status, 400, 'ready-made roles stay');
  assert.equal((await G('m/x60/roles', tok.books)).status, 403, 'only admins');
});
