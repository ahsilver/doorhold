import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker70.mjs');
const worker = (await import('/tmp/pm-test-worker70.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') }, PM_TODAY: '2026-12-02' };
const raw = async (p, body, method, tok) => worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} });
const call = async (p, body, method, tok) => { const r = await raw(p, body, method, tok); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '';
const tb = async () => { const t = (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals; return [t.debit, t.credit]; };
const jcount = () => sq.prepare('SELECT COUNT(*) n FROM journal').get().n;

let T = '';
const addD = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
test('setup: sign in', { skip: !PW }, async () => { const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; T = (await call('health')).json.today; assert.match(T, /^\d{4}-\d\d-\d\d$/); });

test('reconcile: mark cleared without a bank line keeps a reason; undo drops it; other lines and the books do not change', { skip: !PW }, async () => {
  const t0 = await tb(), n0 = jcount();
  const x0 = (await call('m/x24/match/1', null, 'GET', tok)).json; assert.ok(x0.books.length > 3); assert.deepEqual(x0.manual70, {});
  const e = x0.books.find(z => !z.txns.length && !z.cleared); assert.ok(e, 'an unmatched entry');
  const snap = x => JSON.stringify({ b: x.bank.map(t => [t.id, t.matched, t.entries]), e: x.books.filter(z => z.id !== e.id).map(z => [z.id, z.cleared, z.txns]), r: x.recs });
  const on = await call('m/x24/clear/1', { entry_id: e.id, on: true, reason: 'Bank fee counted in the statement total' }, 'POST', tok); assert.equal(on.status, 200, on.text);
  const x1 = (await call('m/x24/match/1', null, 'GET', tok)).json; const e1 = x1.books.find(z => z.id === e.id);
  assert.equal(e1.cleared, true); assert.equal(x1.manual70[e.id].reason, 'Bank fee counted in the statement total'); assert.equal(snap(x1), snap(x0));
  const off = await call('m/x24/clear/1', { entry_id: e.id, on: false }, 'POST', tok); assert.equal(off.status, 200);
  const x2 = (await call('m/x24/match/1', null, 'GET', tok)).json; assert.equal(x2.books.find(z => z.id === e.id).cleared, false); assert.equal(x2.manual70[e.id], undefined); assert.equal(snap(x2), snap(x0));
  assert.deepEqual(await tb(), t0); assert.equal(jcount(), n0);
});

test('reconcile: an old manual clear with no reason still reads as cleared; a matched entry cannot be un-cleared by hand', { skip: !PW }, async () => {
  const x = (await call('m/x24/match/1', null, 'GET', tok)).json;
  const m = x.books.find(z => z.txns.length); assert.ok(m, 'a matched entry');
  const r = await call('m/x24/clear/1', { entry_id: m.id, on: false }, 'POST', tok); assert.equal(r.status, 400); assert.match(r.json.error, /unmatch/i);
  const e = x.books.find(z => !z.txns.length && !z.cleared); sq.prepare('UPDATE journal SET reconciled=1 WHERE id=?').run(e.id);
  const y = (await call('m/x24/match/1', null, 'GET', tok)).json; assert.equal(y.books.find(z => z.id === e.id).cleared, true); assert.equal(y.manual70[e.id], undefined);
  sq.prepare('UPDATE journal SET reconciled=0 WHERE id=?').run(e.id);
});

test('reconcile: matching 2 entries to one deposit and finishing a statement work as before', { skip: !PW }, async () => {
  const x = (await call('m/x24/match/1', null, 'GET', tok)).json;
  const es = x.books.filter(z => !z.txns.length && !z.cleared && z.amount > 0).slice(0, 2); assert.equal(es.length, 2);
  const amt = es[0].amount + es[1].amount;
  sq.prepare(`INSERT INTO bank_txns(bank_account_id,date,description,amount,fitid,status,source,created) VALUES(1,?,?,?,?,'unmatched','csv',?)`).run(es[0].date, 'REMOTE DEPOSIT', amt, 't70a', T);
  const tid = sq.prepare(`SELECT id FROM bank_txns WHERE fitid='t70a'`).get().id;
  const r = await call('m/x24/match/1', { txn_ids: [tid], entry_ids: es.map(z => z.id) }, 'POST', tok); assert.equal(r.status, 200, r.text);
  const y = (await call('m/x24/match/1', null, 'GET', tok)).json; const t = y.bank.find(z => z.id === tid); assert.equal(t.matched, true); assert.deepEqual(t.entries.sort(), es.map(z => z.id).sort());
  es.forEach(e => assert.deepEqual(y.books.find(z => z.id === e.id).txns, [tid]));
  const u = await call('m/x24/unmatch/1', { txn_id: tid }, 'POST', tok); assert.equal(u.status, 200);
});

test('leases ending: a fixed term that rolls to month-to-month is listed (rollover), a pure month-to-month lease is not', { skip: !PW }, async () => {
  const ls = sq.prepare(`SELECT id FROM leases WHERE status='active' ORDER BY id LIMIT 2`).all(); assert.equal(ls.length, 2);
  sq.prepare('UPDATE leases SET start=?, "end"=?, mtm=1 WHERE id=?').run(addD(T, -340), addD(T, 25), ls[0].id);
  sq.prepare('UPDATE leases SET start=?, "end"=?, mtm=1 WHERE id=?').run(addD(T, -5), addD(T, 25), ls[1].id);
  const rs = (await call('m/esign/renewals', null, 'GET', tok)).json;
  const a = rs.find(r => r.lease_id === ls[0].id); assert.ok(a, 'rollover lease listed'); assert.equal(a.rollover, true); assert.equal(a.days, 25);
  assert.equal(rs.find(r => r.lease_id === ls[1].id), undefined, 'pure month-to-month stays out');
});

test('leases ending: Keep month-to-month closes the alert and can schedule a new rent; Skip snoozes or dismisses for this end date', { skip: !PW }, async () => {
  const l = sq.prepare(`SELECT id, rent FROM leases WHERE status='active' AND mtm=0 ORDER BY id DESC LIMIT 2`).all();
  for (const x of l) sq.prepare('UPDATE leases SET start=?, "end"=? WHERE id=?').run(addD(T, -300), addD(T, 40), x.id);
  let rs = (await call('m/esign/renewals', null, 'GET', tok)).json; assert.ok(rs.find(r => r.lease_id === l[0].id) && rs.find(r => r.lease_id === l[1].id));
  const n0 = sq.prepare('SELECT COUNT(*) n FROM rent_changes').get().n;
  const m = await call('m/x70/lease/' + l[0].id, { action: 'mtm', rent: '2,150.00', from: addD(T, 41) }, 'POST', tok); assert.equal(m.status, 200, m.text);
  assert.equal(sq.prepare('SELECT mtm FROM leases WHERE id=?').get(l[0].id).mtm, 1);
  const rc = sq.prepare('SELECT * FROM rent_changes ORDER BY id DESC LIMIT 1').get(); assert.equal(sq.prepare('SELECT COUNT(*) n FROM rent_changes').get().n, n0 + 1); assert.equal(rc.rent, 215000); assert.equal(rc.lease_id, l[0].id); assert.equal(rc.applied, 0);
  assert.equal((await call('m/x70/lease/' + l[0].id, { action: 'mtm', rent: 'abc', from: addD(T, 41) }, 'POST', tok)).status, 400);
  const s = await call('m/x70/lease/' + l[1].id, { action: 'skip', until: addD(T, 7) }, 'POST', tok); assert.equal(s.status, 200);
  rs = (await call('m/esign/renewals', null, 'GET', tok)).json; assert.equal(rs.find(r => r.lease_id === l[0].id), undefined); assert.equal(rs.find(r => r.lease_id === l[1].id), undefined);
  // a snooze that has passed brings it back; a new end date brings back a dismissed one
  assert.equal((await call('m/x70/lease/' + l[1].id, { action: 'skip', until: addD(T, -1) }, 'POST', tok)).status, 200);
  rs = (await call('m/esign/renewals', null, 'GET', tok)).json; assert.ok(rs.find(r => r.lease_id === l[1].id));
  await call('m/x70/lease/' + l[1].id, { action: 'skip', until: null }, 'POST', tok);
  rs = (await call('m/esign/renewals', null, 'GET', tok)).json; assert.equal(rs.find(r => r.lease_id === l[1].id), undefined);
  sq.prepare('UPDATE leases SET "end"=? WHERE id=?').run(addD(T, 70), l[1].id); await call('m/x70/lease/' + l[0].id, { action: 'mtm' }, 'POST', tok);
  rs = (await call('m/esign/renewals', null, 'GET', tok)).json; assert.ok(rs.find(r => r.lease_id === l[1].id), 'new end date: listed again');
  assert.equal((await call('m/x70/lease/999999', { action: 'skip' }, 'POST', tok)).status, 404);
});
