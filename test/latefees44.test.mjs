// node --test test/latefees44.test.mjs — d44: late fee settings. Fixed vs % math, grace day, second fee on day M, daily fee + cap,
// per-tenant "No late fees" / "Custom", per-house override, waive = credit (history kept, TB balanced), manual by default, no back-charging.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker44.mjs');
const worker = (await import('/tmp/pm-test-worker44.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') }, PM_TODAY: '2026-12-02' };
const call = async (p, body, method, tok) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, json: j }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '', L = null, L2 = null;
const due = async (asof, lid) => { const r = await call(`m/x44/due?asof=${asof}&skipped=1&lease=${lid}`, null, 'GET', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.items; };
const fee = (items, n) => items.find(i => i.fee === n);
const co = (x) => call('m/x44/company', { on: true, due_day: 1, grace: 4, t1: 'fixed', v1: 50, two: false, min: 1, basis: 'rent', ...x }, 'POST', tok);
const tb = async () => { const r = await call('m/reports/trial-balance', null, 'GET', tok); return r.json.totals; };
const lateRows = lid => sq.prepare(`SELECT * FROM journal WHERE lease_id=? AND (kind='latefee' OR ref LIKE 'LATE%') ORDER BY id`).all(lid);
test('setup: sign in, two active leases with an unpaid December charge', { skip: !PW }, async () => {
  let r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token;
  await call('m/x44/settings', null, 'GET', tok);
  const ls = sq.prepare(`SELECT l.id, l.rent, u.property_id FROM leases l JOIN units u ON u.id=l.unit_id WHERE l.status='active' AND l.rent>0 AND (l.start IS NULL OR l.start<='2026-12-01') AND (l.end IS NULL OR l.end>='2027-02-28') ORDER BY l.id`).all();
  L = ls[0]; L2 = ls.find(x => x.property_id !== L.property_id) || ls[1]; assert.ok(L && L2, 'two leases');
  for (const x of [L, L2]) { r = await call('m/ledger', { kind: 'charge', lease_id: x.id, amount: 5000, date: '2026-12-01', memo: 'Test unpaid charge', account_code: '4000' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); }
  r = await call('m/x44/settings', null, 'GET', tok); assert.equal(r.json.auto, false, 'automatic posting is OFF by default');
});
test('validation: percent over 100 and a second-fee day before the late day are refused', { skip: !PW }, async () => {
  let r = await co({ t1: 'pct', v1: 150 }); assert.equal(r.status, 400);
  r = await co({ two: true, day2: 4, t2: 'fixed', v2: 25 }); assert.equal(r.status, 400);
  r = await co({ v1: '' }); assert.equal(r.status, 400, 'an ON rule needs an amount');
});
test('grace day + fixed amount: nothing on the 5th, $50 on the 6th', { skip: !PW }, async () => {
  assert.equal((await co({})).status, 200);
  assert.equal(fee(await due('2026-12-05', L.id), 1), undefined, 'still inside the grace period on the 5th');
  const f = fee(await due('2026-12-06', L.id), 1); assert.ok(f, 'late fee due on the 6th'); assert.equal(f.amount, 5000); assert.equal(f.date, '2026-12-06'); assert.equal(f.ref, 'LATE-2026-12');
});
test('% of rent math, max cap, and the second fee on day M', { skip: !PW }, async () => {
  assert.equal((await co({ t1: 'pct', v1: 5, two: true, day2: 10, t2: 'pct', v2: 2.5 })).status, 200);
  let items = await due('2026-12-09', L.id); assert.equal(fee(items, 1).amount, Math.round(L.rent * 0.05)); assert.equal(fee(items, 2), undefined, 'no second fee before the 10th');
  items = await due('2026-12-10', L.id); assert.equal(fee(items, 2).amount, Math.round(L.rent * 0.025)); assert.equal(fee(items, 2).ref, 'LATE2-2026-12');
  assert.equal((await co({ t1: 'pct', v1: 30, max1: 100 })).status, 200);
  assert.equal(fee(await due('2026-12-06', L.id), 1).amount, Math.min(Math.round(L.rent * 0.3), 10000), 'capped at the max');
  assert.equal((await co({ t1: 'fixed', v1: 50, two: true, day2: 10, t2: 'fixed', v2: 25 })).status, 200);
  items = await due('2026-12-10', L.id); assert.equal(fee(items, 1).amount, 5000); assert.equal(fee(items, 2).amount, 2500);
  const s = await call('m/x44/settings', null, 'GET', tok); assert.match(s.json.company.text, /If rent isn't paid by the 5th: \$50\. If still unpaid on the 10th: another \$25\./);
});
test('minimum balance: a tiny balance is ignored', { skip: !PW }, async () => {
  assert.equal((await co({ min: 100000 })).status, 200);
  assert.equal((await due('2026-12-10', L.id)).length, 0);
  assert.equal((await co({ two: true, day2: 10, t2: 'fixed', v2: 25 })).status, 200);
});
test('per-tenant overrides: "No late fees" and "Custom"', { skip: !PW }, async () => {
  let r = await call('m/x44/lease/' + L.id, { mode: 'none' }, 'POST', tok); assert.equal(r.status, 200);
  assert.equal((await due('2026-12-10', L.id)).length, 0, 'no late fees for this tenant');
  r = await call('m/x44/lease/' + L.id, null, 'GET', tok); assert.equal(r.json.mode, 'none');
  r = await call('m/x44/lease/' + L.id, { mode: 'custom', rule: { due_day: 1, grace: 2, t1: 'fixed', v1: 99, two: false, min: 1 } }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  let items = await due('2026-12-04', L.id); assert.equal(fee(items, 1).amount, 9900, 'custom rule: $99 after the 3rd'); assert.equal(fee(items, 2), undefined);
  assert.equal((await due('2026-12-10', L2.id)).length, 2, 'the other tenant still follows the company rule');
  r = await call('m/x44/lease/' + L.id, { mode: 'house' }, 'POST', tok); assert.equal(r.status, 200);
  assert.equal(fee(await due('2026-12-06', L.id), 1).amount, 5000, 'back on the company rule');
});
test('per-house override: no late fees for the house, then a custom house rule', { skip: !PW }, async () => {
  let r = await call('m/x44/house/' + L2.property_id, { mode: 'none' }, 'POST', tok); assert.equal(r.status, 200);
  assert.equal((await due('2026-12-10', L2.id)).length, 0);
  r = await call('m/x44/house/' + L2.property_id, { mode: 'custom', rule: { due_day: 1, grace: 4, t1: 'pct', v1: 10, min: 1 } }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(fee(await due('2026-12-06', L2.id), 1).amount, Math.round(L2.rent * 0.1));
  r = await call('m/x44/house/' + L2.property_id, { mode: 'company' }, 'POST', tok); assert.equal(r.status, 200);
});
test('daily fee: $10 a day after the 15th, max $40 a month', { skip: !PW }, async () => {
  assert.equal((await co({ daily: true, daily_after: 15, daily_amt: 10, daily_cap: 40 })).status, 200);
  let d3 = fee(await due('2026-12-17', L.id), 3); assert.equal(d3.amount, 2000, '2 days (16th, 17th)'); assert.equal(d3.days, 2);
  d3 = fee(await due('2026-12-25', L.id), 3); assert.equal(d3.amount, 4000, 'capped at $40');
  assert.equal((await co({ two: true, day2: 10, t2: 'fixed', v2: 25 })).status, 200);
});
test('manual by default: the automatic run posts nothing; posting is by tap (amount can be changed)', { skip: !PW }, async () => {
  env.PM_TODAY = '2026-12-12';
  let r = await call('m/auto/run', {}, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(lateRows(L.id).length, 0, 'nothing posted by itself');
  r = await call('m/x44/post', { items: [{ lease_id: L.id, fee: 1, month: '2026-12', amount: '45.00' }] }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const rows = lateRows(L.id); assert.equal(rows.length, 1); assert.equal(rows[0].amount, 4500, 'the changed amount'); assert.equal(rows[0].ref, 'LATE-2026-12'); assert.equal(rows[0].date, '2026-12-06'); assert.equal(rows[0].account_id, sq.prepare(`SELECT id FROM gl_accounts WHERE code='4100'`).get().id, 'Late Fee Income');
  r = await call('m/x44/post', { items: [{ lease_id: L.id, fee: 1, month: '2026-12' }] }, 'POST', tok); assert.equal(r.status, 400, 'cannot charge the same fee twice');
  assert.equal(fee(await due('2026-12-12', L.id), 1), undefined);
  // waive a pending fee (nothing written to the books), then undo
  r = await call('m/x44/skip', { lease_id: L.id, month: '2026-12', fee: 2, reason: 'Agreed with tenant' }, 'POST', tok); assert.equal(r.status, 200);
  assert.equal(fee(await due('2026-12-12', L.id), 2).skipped.reason, 'Agreed with tenant');
  const x = await call('m/x44/due?asof=2026-12-12&lease=' + L.id, null, 'GET', tok); assert.equal(x.json.items.length, 0, 'waived fee is off the list');
  r = await call('m/x44/unskip', { lease_id: L.id, month: '2026-12', fee: 2 }, 'POST', tok); assert.equal(r.status, 200);
});
test('waive a charged fee: a credit with the reason, the fee stays in history, TB balanced', { skip: !PW }, async () => {
  const f = lateRows(L.id)[0]; const t0 = await tb(); assert.equal(t0.debit, t0.credit);
  const bal = () => sq.prepare(`SELECT SUM(CASE WHEN kind IN ('charge','latefee','refund') THEN amount ELSE -amount END) b FROM journal WHERE void=0 AND lease_id=?`).get(L.id).b;
  const b0 = bal();
  let r = await call('m/x44/waive/' + f.id, { reason: '' }, 'POST', tok); assert.equal(r.status, 400, 'a reason is required');
  r = await call('m/x44/waive/' + f.id, { reason: 'Bank delay' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const fee0 = sq.prepare('SELECT * FROM journal WHERE id=?').get(f.id); assert.equal(fee0.void, 0, 'the fee itself is not deleted or voided');
  const cr = sq.prepare(`SELECT * FROM journal WHERE ref=?`).get('WAIVE-' + f.id); assert.equal(cr.kind, 'credit'); assert.equal(cr.amount, f.amount); assert.match(cr.memo, /Bank delay/); assert.equal(cr.account_id, f.account_id);
  assert.equal(bal(), b0 - f.amount);
  const t1 = await tb(); assert.equal(t1.debit, t1.credit, 'trial balance still balanced');
  r = await call('m/x44/waive/' + f.id, { reason: 'again' }, 'POST', tok); assert.equal(r.status, 400, 'only once');
  r = await call('m/x44/lease/' + L.id, null, 'GET', tok); assert.ok(r.json.fees.find(z => z.id === f.id).waived, 'tenant page shows it waived');
});
test('automatic ON posts from that day forward only (never back-charges)', { skip: !PW }, async () => {
  env.PM_TODAY = '2026-12-12';
  let r = await call('m/x44/auto', { on: true }, 'POST', tok); assert.equal(r.status, 200);
  r = await call('m/auto/run', {}, 'POST', tok); assert.equal(r.status, 200);
  assert.equal(lateRows(L2.id).length, 0, 'December fees (6th, 10th) were due before automatic was turned on: not charged');
  env.PM_TODAY = '2027-01-12';
  r = await call('m/auto/run', {}, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const refs = lateRows(L2.id).map(x => x.ref).sort(); assert.deepEqual(refs, ['LATE-2027-01', 'LATE2-2027-01'], 'January first + second fee posted automatically, December never');
  r = await call('m/auto/run', {}, 'POST', tok); assert.equal(lateRows(L2.id).length, 2, 'running again posts nothing new');
  r = await call('m/x44/auto', { on: false }, 'POST', tok); assert.equal(r.status, 200);
  const t = await tb(); assert.equal(t.debit, t.credit);
});
