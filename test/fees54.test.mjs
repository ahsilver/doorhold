// node --test test/fees54.test.mjs — d54: per-owner fee terms (minimum, leasing fee, late fees; blank = company default), the order house > owner > company,
// "Late fees collected from tenants" give / keep / split, late fees on the owner statement (collected credited, kept deducted, option to leave them off),
// and "% of rent collected" no longer counting late fees.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker54.mjs');
const worker = (await import('/tmp/pm-test-worker54.mjs?' + Date.now())).default;
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
let tok = '', oid = 0, pid = 0;
const fees = async () => (await call('m/mgmt/pay?month=' + M, null, 'GET', tok)).json.rows.find(r => r.owner_id === oid).fee_lines;
const line = (L, k) => L.find(l => l.kind === k);
const stmt = async q => (await call(`m/reports/owner-statement?owner_id=${oid}&month=${M}${q || ''}`, null, 'GET', tok)).json;
const row = (r, rx) => r.rows.find(x => rx.test(x.description || ''));
const sumRows = r => r.rows.filter(x => !x._section && !x._total).reduce((s, x) => s + (x.amount || 0), 0) + r.rows[0].amount;
const custSave = (extra) => call('m/x47/customer/' + oid, { kind: 'person', first: 'Owen', last: 'Owner', terms54: 1, fee_mode: 'default', fee_min: '', leasing_mode: 'default', late_mode: 'default', ...extra }, 'POST', tok);
test('setup: a managed house, a tenant who paid rent and a late fee', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'Fee Tester', company: 'F54 Mgmt', email: 'f54@example.com', password: 'F54-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const bk = await call('m/bank-accounts', { institution: 'Test Bank', name: 'Trust', last4: '5454' }, 'POST', tok); assert.equal(bk.status, 200, bk.text);
  const h = await call('m/mgmt/house', { address: '5 Fee St', units: 1, who: 'me' }, 'POST', tok); assert.equal(h.status, 200, h.text); pid = h.json.id || 1;
  const m = await call('m/x53/own/' + pid, { mode: 'managed', owner_name: 'Owen Owner' }, 'POST', tok); assert.equal(m.status, 200, m.text); oid = m.json.owner.id;
  const d = await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', leasing_type: 'none', late_mode: 'keep' }, 'POST', tok); assert.equal(d.status, 200, d.text); assert.equal(d.json.def.late_share_pct, 100, 'Management keeps them = 100%');
  const pr = (await call('m/properties/' + pid, null, 'GET', tok)).json; const uid = pr.units[0].unit_id;
  const tn = await call('m/tenants', { first: 'Lia', last: 'Late', email: 'lia54@example.com', phone: '', unit_id: uid, rent: '1500.00', start: M + '-01', deposit: '0' }, 'POST', tok); assert.equal(tn.status, 200, tn.text);
  assert.equal((await call('m/ledger', { kind: 'latefee', lease_id: tn.json.lease_id, amount: '50.00', date: T }, 'POST', tok)).status, 200);
  const co = (await call('me', null, 'GET', tok)).json.company_id; const q = s => sq.prepare(s.replace(/\{p\}/g, `c${co}_`));
  const rentC = q(`SELECT id FROM {p}journal WHERE kind='charge' AND lease_id=? ORDER BY id LIMIT 1`).get(tn.json.lease_id).id, lateC = q(`SELECT id FROM {p}journal WHERE kind='latefee' AND lease_id=?`).get(tn.json.lease_id).id;
  const acc = c => q(`SELECT id FROM {p}gl_accounts WHERE code=?`).get(c).id;
  const ap = [{ charge_id: rentC, account_id: acc('4000'), amount: '1500.00' }, { charge_id: lateC, account_id: acc('4100'), amount: '50.00' }];
  const p = await call('m/ledger', { kind: 'payment', lease_id: tn.json.lease_id, amount: '1550.00', date: T, method: 'Cash', deposit_to: 'undeposited', apply45: ap }, 'POST', tok); assert.equal(p.status, 200, p.text);
});
test('"% of rent collected" leaves late fees out; "Management keeps them" takes the whole late fee', { skip: !PW }, async () => {
  const L = await fees(); const mg = line(L, 'mgmt');
  assert.equal(mg.amount, 12000, '8% of 1,500 rent, not of 1,550: ' + mg.basis); assert.match(mg.basis, /not counting 50\.00 late fees/);
  assert.equal(line(L, 'latefee').amount, 5000, 'management keeps the 50.00 late fee');
});
test('company late-fee choice: give to the owner / split; a split needs its %', { skip: !PW }, async () => {
  assert.equal((await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', leasing_type: 'none', late_mode: 'split', late_split_pct: '' }, 'POST', tok)).status, 400);
  assert.equal((await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', leasing_type: 'none', late_mode: 'split', late_split_pct: '30' }, 'POST', tok)).json.def.late_share_pct, 30);
  assert.equal(line(await fees(), 'latefee').amount, 1500, '30% of 50.00');
  assert.equal((await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok)).json.def.late_share_pct, 0);
  assert.ok(!line(await fees(), 'latefee'), 'give to the owner: no late-fee line');
});
test('owner terms: own % and own late-fee choice win over the company; blank fields use the company default', { skip: !PW }, async () => {
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', fee_min: '200', leasing_type: 'none', late_mode: 'keep' }, 'POST', tok);
  let L = await fees(); assert.equal(line(L, 'mgmt').amount, 20000, 'company minimum 200 applies to an owner with no terms'); assert.equal(line(L, 'latefee').amount, 5000);
  const r = await custSave({ fee_mode: 'pct', fee_pct: '6', late_mode: 'split', late_split_pct: '40' }); assert.equal(r.status, 200, r.text);
  const c = (await call('m/x47/customer/' + oid, null, 'GET', tok)).json; assert.equal(c.terms54.fee_pct, 6); assert.equal(c.terms54.fee_min, null, 'minimum left blank');
  assert.equal(c.terms54.src.fee, 'owner'); assert.equal(c.terms54.src.min, 'company'); assert.equal(c.terms54.src.late, 'owner'); assert.equal(c.terms54.eff.fee_min, 20000); assert.equal(c.terms54.def.late_share_pct, 100);
  L = await fees(); assert.equal(line(L, 'mgmt').amount, 20000, '6% of 1,500 = 90, raised to the company minimum 200'); assert.equal(line(L, 'latefee').amount, 2000, "owner's split: 40% of 50.00");
  assert.equal((await custSave({ fee_mode: 'pct', fee_pct: '6', fee_min: '0', late_mode: 'owner' })).status, 200);
  L = await fees(); assert.equal(line(L, 'mgmt').amount, 9000, 'own minimum 0 = no minimum: 6% of 1,500'); assert.ok(!line(L, 'latefee'), 'owner gets the late fees');
  assert.equal((await custSave({ fee_mode: 'pct', fee_pct: '6', leasing_mode: 'pct', leasing_pct: '' })).status, 400, 'a leasing % is needed');
  assert.equal((await custSave({ late_mode: 'split', late_split_pct: '100' })).status, 400, 'split must be 1 to 99');
});
test('order: the house fee wins over the owner terms; "Use the default fee" goes back to the owner terms', { skip: !PW }, async () => {
  assert.equal((await call('m/x53/mgfee/prop/' + pid, { fee_type: 'flat', fee_flat: '99', leasing_type: 'none', late_mode: 'keep' }, 'POST', tok)).status, 200);
  let L = await fees(); assert.equal(line(L, 'mgmt').amount, 9900, 'house flat fee wins'); assert.equal(line(L, 'latefee').amount, 5000, "house's late-fee choice wins");
  await call('m/x53/mgfee/prop/' + pid, { use_default: true }, 'POST', tok);
  L = await fees(); assert.equal(line(L, 'mgmt').amount, 9000, "back to the owner's 6%"); assert.ok(!line(L, 'latefee'));
  assert.equal((await custSave({})).status, 200, 'all on company default');
  L = await fees(); assert.equal(line(L, 'mgmt').amount, 20000, 'company 8% (120) raised to its 200 minimum'); assert.equal(line(L, 'latefee').amount, 5000, 'company: management keeps');
});
test('owner statement: late fees collected credited, kept by management deducted (pending, then posted); option to leave them off', { skip: !PW }, async () => {
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', leasing_type: 'none', late_mode: 'split', late_split_pct: '30' }, 'POST', tok);
  let r = await stmt(); assert.equal(row(r, /^Late fees collected from tenants/).amount, 5000); assert.equal(row(r, /^Late fees kept by management \(not posted yet\)/).amount, -1500);
  assert.ok(row(r, /Rent & charges received/).amount === 150000, 'rent line without the late fee');
  assert.equal(sumRows(r), r.totals.amount, 'rows add up to the closing balance'); const books = r.summary.closing + 1500;
  { const pf = await call('m/mgmt/fees', { owner_id: oid, month: M }, 'POST', tok); assert.equal(pf.status, 200, pf.text); }
  r = await stmt(); assert.equal(row(r, /^Late fees kept by management$/).amount, -1500, 'posted share'); assert.ok(!row(r, /not posted yet/)); assert.equal(sumRows(r), r.totals.amount);
  assert.ok(!r.rows.some(x => /Late-fee share/.test(x.description || '')), 'the posted share is not also listed as a management fee');
  const mf = r.rows.find(x => /^Management fees/.test(x.description || '')); assert.ok(mf, 'the management fee is still its own line');
  const off = await stmt('&late=0'); assert.ok(!row(off, /Late fees/)); assert.match(off.subtitle, /late fees left off/); assert.equal(sumRows(off), off.totals.amount); assert.equal(off.totals.amount, r.totals.amount - (5000 - 1500));
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok);
  const st = (await call(`m/statement?owner_id=${oid}&month=${M}`, null, 'GET', tok)); assert.equal(st.status, 200, st.text); const p = st.json.properties[0]; assert.ok(p.lines.some(l => l.kind === 'latefee_in' && l.amount === 5000), 'Owner statements page: late fees collected line'); assert.ok(p.lines.some(l => l.kind === 'latefee_kept' && l.amount === -1500), 'Owner statements page: kept line'); assert.equal(st.json.totals.late_in, 5000);
  void books;
});
test('terms saved before d54 keep their own fee; their built-in minimum 0 / leasing 50% read as blank (company default)', { skip: !PW }, async () => {
  sq.prepare(`UPDATE c${(await call('me', null, 'GET', tok)).json.company_id}_owners SET agreement=? WHERE id=?`).run(JSON.stringify({ fee_type: 'pct', fee_pct: 7, fee_flat: 0, fee_min: 0, leasing_type: 'pct', leasing_pct: 50, leasing_flat: 0, markup_pct: 0, reserve: 0, payout_method: 'ACH' }), oid);
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '8', fee_min: '150', leasing_type: 'none', late_mode: 'keep' }, 'POST', tok);
  const L = await fees(); assert.equal(line(L, 'mgmt').amount, 15000, 'own 7% (105) raised to the company 150 minimum'); assert.ok(!line(L, 'leasing'), 'company: no leasing fee'); assert.equal(line(L, 'latefee').amount, 5000);
  const c = (await call('m/x47/customer/' + oid, null, 'GET', tok)).json; assert.equal(c.terms54.src.fee, 'owner'); assert.equal(c.terms54.src.min, 'company'); assert.equal(c.fee_text, '7% of rent');
});
