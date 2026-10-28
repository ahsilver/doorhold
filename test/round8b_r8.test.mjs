import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker-r8.mjs');
const worker = (await import('/tmp/pm-test-worker-r8.mjs?' + Date.now())).default;
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
const fmt = d => `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`;
const csvOf = rows => 'Date,Description,Amount\n' + rows.map(([d, s, a]) => `${fmt(d)},${s},${(a / 100).toFixed(2)}`).join('\n') + '\n';
// r8 (owner, Oct 27 5:49–6:11 PM): Confident = found in the books; nothing found = Not in books; several entries can be matched to one bank line
test('r8 server: buckets by entries found in the books, Post refuses not-in-books lines, match8 links two deposits to one bank line and Unmatch undoes it', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; T = (await call('health')).json.today;
  await call('m/bank/1/import', { text: csvOf([[T, 'ZZ8 OHIO MUTUAL INS', -4217], [T, 'ZZ8 SMITHCO PAYMENT', -12345], [T, 'ZZ8 MOBILE DEPOSIT', 70000]]), filename: 'r8.csv' }, 'POST', tok);
  const ins = (amt, payee, jtype) => Number(sq.prepare(`INSERT INTO journal(date, kind, jtype, payee, memo, bank_account_id, bank_amount, amount, void, reconciled) VALUES(?,?,?,?,?,?,?,?,0,0)`).run(T, amt < 0 ? 'expense' : 'gl', jtype, payee, 'ZZ8', 1, amt, Math.abs(amt)).lastInsertRowid);
  const e1 = ins(-12345, 'Smithco', 'Check'); { const gl = sq.prepare('SELECT account_id FROM bank_accounts WHERE id=1').get().account_id; sq.prepare(`INSERT INTO jlines(journal_id, account_id, debit, credit, date, basis) VALUES(?,?,0,12345,?,'b')`).run(e1, gl, T); } const d1 = ins(30000, 'Deposit A', 'Deposit'), d2 = ins(40000, 'Deposit B', 'Deposit');
  const ln = sq.prepare(`SELECT id, description FROM bank_txns WHERE description LIKE 'ZZ8 %'`).all(); const id = s => ln.find(z => z.description.startsWith(s)).id;
  const cu = (await call('m/catchup?bank_id=1&confidence=all', null, 'GET', tok)).json; const row = s => cu.list.find(z => z.id === id(s));
  assert.ok(cu.counts.all >= 3 && 'none' in cu.counts, JSON.stringify(cu.counts));
  assert.equal(row('ZZ8 SMITHCO').conf8, 'high'); assert.equal(row('ZZ8 SMITHCO').s.journal_id, e1); assert.match(row('ZZ8 SMITHCO').s.m81, /Check · .* · \$123\.45/);
  assert.equal(row('ZZ8 OHIO').conf8, 'none'); assert.equal(row('ZZ8 OHIO').s.type, 'unknown'); assert.equal(row('ZZ8 OHIO').c8.length, 0);
  assert.equal(row('ZZ8 MOBILE').conf8, 'none', 'two deposits that only add up together are not a found match');
  const none = (await call('m/catchup?bank_id=1&confidence=none', null, 'GET', tok)).json; assert.ok(none.list.every(z => z.conf8 === 'none'));
  const n0 = jcount();
  let ap = (await call('m/catchup/approve', { ids: [id('ZZ8 OHIO')] }, 'POST', tok)).json; assert.equal(ap.ok, 0); assert.match(ap.results[0].error, /Not in your books yet/); assert.equal(jcount(), n0);
  // match8: wrong total refused, then the two deposits together
  let m = await call('m/x53/match8', { txn_id: id('ZZ8 MOBILE'), entry_ids: [d1] }, 'POST', tok); assert.equal(m.status, 400); assert.match(m.json.error, /add up to/);
  m = await call('m/x53/match8', { txn_id: id('ZZ8 MOBILE'), entry_ids: [d1, d2] }, 'POST', tok); assert.equal(m.status, 200, m.text);
  const bt = sq.prepare('SELECT status, journal_id, how FROM bank_txns WHERE id=?').get(id('ZZ8 MOBILE')); assert.equal(bt.status, 'matched'); assert.equal(bt.journal_id, d1); assert.equal(bt.how, 'split:' + d2);
  assert.equal(jcount(), n0, 'matching adds nothing to the books');
  // an entry already linked can't be used again
  m = await call('m/x53/match8', { txn_id: id('ZZ8 SMITHCO'), entry_ids: [d2] }, 'POST', tok); assert.equal(m.status, 400);
  // Post on the confident row links exactly the entry shown
  ap = (await call('m/catchup/approve', { ids: [id('ZZ8 SMITHCO')] }, 'POST', tok)).json; assert.equal(ap.ok, 1, JSON.stringify(ap));
  // Unmatch the two-deposit line: both entries are open again
  const u = await call('m/x24/unmatch/1', { txn_id: id('ZZ8 MOBILE') }, 'POST', tok); assert.equal(u.status, 200, u.text);
  assert.equal(sq.prepare('SELECT reconciled FROM journal WHERE id=?').get(d2).reconciled, 0); assert.equal(sq.prepare('SELECT status FROM bank_txns WHERE id=?').get(id('ZZ8 MOBILE')).status, 'unmatched');
});
