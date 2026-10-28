// node --test test/bank47.test.mjs — d47a: bank Beginning balance + Start reconciling from; reconcile starts there;
// a posted beginning balance goes to Opening Balance Equity only when asked and only on a bank with no entries.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker47a.mjs');
const worker = (await import('/tmp/pm-test-worker47a.mjs?' + Date.now())).default;
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

test('setup: sign in', { skip: !PW }, async () => { const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; });

test('bank settings: existing account shows its beginning balance + start; "Not set" reads as null', { skip: !PW }, async () => {
  const L = (await call('m/x47/banks', null, 'GET', tok)).json; assert.ok(Array.isArray(L) && L.length >= 2);
  const a = L.find(b => b.id === 1); assert.equal(a.set, true); assert.equal(a.balance, 4825000); assert.match(a.start, /^\d{4}-\d\d-\d\d$/); assert.equal(a.can_post, false, 'has entries, so no posting');
  sq.prepare('UPDATE bank_accounts SET opening_balance=NULL, opening_date=NULL WHERE id=2').run();
  const b = (await call('m/x47/bank/2', null, 'GET', tok)).json; assert.equal(b.set, false); assert.equal(b.balance, null); assert.equal(b.start, null);
});

test('saving a beginning balance on an account with history posts nothing (TB unchanged) and refuses "post to the books"', { skip: !PW }, async () => {
  const t0 = await tb(), n0 = jcount();
  const bad = await call('m/x47/bank/2', { balance: '1000', start: '2026-09-01', post: true }, 'POST', tok);
  assert.equal(bad.status, 400); assert.match(bad.json.error, /count twice/);
  const ok = await call('m/x47/bank/2', { balance: '1,000.50', start: '2026-09-01' }, 'POST', tok); assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.balance, 100050); assert.equal(ok.json.start, '2026-09-01'); assert.equal(ok.json.posted, null);
  assert.equal(sq.prepare('SELECT opening_date d FROM bank_accounts WHERE id=2').get().d, '2026-08-31', 'stored as the statement day before the start');
  assert.deepEqual(await tb(), t0); assert.equal(jcount(), n0);
  assert.equal((await call('m/x47/bank/2', { balance: '', start: '2026-09-01' }, 'POST', tok)).status, 400);
  assert.equal((await call('m/x47/bank/2', { balance: '5', start: '' }, 'POST', tok)).status, 400);
});

test('reconcile starts at the start date: older bank lines / entries left out, starting balance = beginning balance', { skip: !PW }, async () => {
  const all = (await call('m/x47/bank/1', { clear: true }, 'POST', tok));
  // bank 1 has a posted demo opening entry (kind opening) so clear is refused
  assert.equal(all.status, 400);
  const before = (await call('m/x24/match/1', null, 'GET', tok)).json; const first = before.bank.map(t => t.date).sort()[0];
  const mid = before.bank.map(t => t.date).sort()[Math.floor(before.bank.length / 2)];
  const r = await call('m/x47/bank/1', { balance: '2500', start: mid }, 'POST', tok); assert.equal(r.status, 200, r.text);
  const after = (await call('m/x24/match/1', null, 'GET', tok)).json;
  assert.ok(after.start47 && after.start47.date === mid);
  assert.ok(after.bank.every(t => t.date >= mid) && after.books.every(e => e.date >= mid));
  assert.ok(after.start47.hidden_bank > 0 && first < mid);
  assert.equal(after.account.opening_balance, 250000);
  const sg = (await call('m/x24/suggest/1', null, 'GET', tok)).json; const ids = new Set(after.bank.map(t => t.id));
  assert.ok((sg.matches || []).every(m => ids.has(m.txn_id)), 'no suggestion for a line before the start');
});

test('new bank account: beginning balance + start; "post to the books" goes to Opening Balance Equity, TB stays balanced', { skip: !PW }, async () => {
  const n0 = jcount();
  const r = await call('m/bank-accounts', { institution: 'Valley Bank', last4: '7788', name: 'Reserve', opening_balance: '2,345.67', start47: '2026-10-01', post47: true }, 'POST', tok); assert.equal(r.status, 200, r.text);
  const b = (await call('m/x47/bank/' + r.json.id, null, 'GET', tok)).json;
  assert.equal(b.balance, 234567); assert.equal(b.start, '2026-10-01'); assert.ok(b.posted && b.posted.date === '2026-09-30');
  assert.equal(jcount(), n0 + 1);
  const ls = sq.prepare(`SELECT g.name, jl.debit, jl.credit FROM jlines jl JOIN gl_accounts g ON g.id=jl.account_id WHERE jl.journal_id=?`).all(b.posted.id);
  assert.ok(ls.some(l => /opening balance equity/i.test(l.name) && l.credit === 234567), JSON.stringify(ls));
  assert.ok(ls.some(l => /Valley Bank/.test(l.name) && l.debit === 234567));
  const memo = sq.prepare('SELECT memo FROM journal WHERE id=?').get(b.posted.id).memo; assert.match(memo, /Beginning balance .*Opening Balance Equity/);
  const [dr, cr] = await tb(); assert.equal(dr, cr);
  assert.equal((await call('m/x47/bank/' + r.json.id, { clear: true }, 'POST', tok)).status, 400, 'posted balance cannot be cleared silently');
  // not ticked: nothing posted
  const r2 = await call('m/bank-accounts', { institution: 'Valley Bank', last4: '9911', name: 'Ops', opening_balance: '500', start47: '2026-10-01', post47: false }, 'POST', tok); assert.equal(r2.status, 200);
  assert.equal(jcount(), n0 + 1); const b2 = (await call('m/x47/bank/' + r2.json.id, null, 'GET', tok)).json; assert.equal(b2.balance, 50000); assert.equal(b2.posted, null); assert.equal(b2.can_post, true);
  // no balance typed: "Not set"
  const r3 = await call('m/bank-accounts', { institution: 'Valley Bank', last4: '9922', name: 'Empty', opening_balance: '', start47: '2026-10-01' }, 'POST', tok); assert.equal(r3.status, 200);
  const b3 = (await call('m/x47/bank/' + r3.json.id, null, 'GET', tok)).json; assert.equal(b3.set, false); assert.equal(b3.start, null);
  // old add path (no start47) still works as before
  const r4 = await call('m/bank-accounts', { institution: 'Old Path', last4: '1212', name: 'X', opening_balance: '0', opening_date: '2026-10-01' }, 'POST', tok); assert.equal(r4.status, 200);
});
