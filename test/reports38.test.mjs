// node --test test/reports38.test.mjs — reports (v38): every report total ties to the trial balance; builder second level + drill; deposit # (slip) saved
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker38.mjs');
const worker = (await import('/tmp/pm-test-worker38.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') } };
let token = '';
const call = async (p, body, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined }), env, {}); return { status: r.status, json: await r.json() }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
const T = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
let TB;
const run = (spec) => call('m/rb/run', { basis: 'cash', from: '1900-01-01', to: T, ...spec });
test('sign in + trial balance balanced', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); token = r.json.token;
  await call('m/x37/housebanks');
  TB = (await call('m/reports/trial-balance')).json; assert.equal(TB.totals.debit, TB.totals.credit);
});
const tbNet = t => TB.rows.filter(r => r.type === t).reduce((s, r) => s + (t === 'income' ? r.credit - r.debit : r.debit - r.credit), 0);
test('income statement (P&L) = trial balance income − expenses; by property adds up', { skip: !PW }, async () => {
  const pl = (await run({ group: 'property', filters: { account_types: ['income', 'expense'] } })).json;
  assert.equal(pl.total, tbNet('income') - tbNet('expense'));
  assert.equal(pl.rows.reduce((s, r) => s + r.amount, 0), pl.total);
  const bs = (await call('m/reports/balance-sheet')).json; const g = l => bs.rows.find(r => r.account === l)?.amount;
  assert.equal(g('TOTAL ASSETS'), g('TOTAL LIABILITIES & EQUITY'), 'balance sheet balances');
  const ni = g('Net income (all years, not yet closed to equity)'); if (ni != null) assert.equal(ni, pl.total, 'balance sheet net income = P&L');
});
test('builder: vendor › property subtotals, LLC › vendor, drill on a sub row', { skip: !PW }, async () => {
  const x = (await run({ group: 'vendor', then: 'property', filters: { account_types: ['expense'] } })).json;
  assert.equal(x.then, 'property'); assert.equal(x.total, tbNet('expense'));
  for (const r of x.rows) assert.equal(r.sub.reduce((s, z) => s + z.amount, 0), r.amount, 'subtotal ' + r.label);
  const e = (await run({ group: 'entity', then: 'vendor', filters: { account_types: ['expense'] } })).json; assert.equal(e.total, x.total);
  const r0 = x.rows.find(r => r.sub.length); if (r0) { const z = r0.sub[0]; const d = (await call('m/rb/drill', { spec: { group: 'vendor', then: 'property', basis: 'cash', from: '1900-01-01', to: T, filters: { account_types: ['expense'] } }, key: r0.key, sub: z.key })).json; assert.equal(d.total, z.amount); assert.equal(d.count, z.count); }
});
test('general ledger / bank activity: every account ends where the trial balance does', { skip: !PW }, async () => {
  const meta = (await call('m/rb/meta')).json; const AT = Object.fromEntries(meta.accounts.map(a => [String(a.id), a]));
  const gl = (await run({ nat: true, group: 'account', filters: { all_lines: true } })).json;
  const tbm = Object.fromEntries(TB.rows.map(r => [r.account, r.debit - r.credit]));
  let n = 0; for (const r of gl.rows) { const a = AT[r.key]; if (!a) continue; const dr = ['liability', 'equity', 'income'].includes(a.type) ? -r.amount : r.amount; const k = `${a.code} ${a.name}`; if (k in tbm) { assert.equal(dr, tbm[k], k); n++; } }
  assert.ok(n > 5, 'compared accounts');
  const hb = (await call('m/x37/housebanks')).json;
  for (const b of hb.banks) { const x = (await run({ nat: true, group: 'none', filters: { account_ids: [String(b.account_id)] } })).json; const d = (await call('m/rb/drill', { spec: { nat: true, cap: 10000, basis: 'cash', from: '1900-01-01', to: T, filters: { account_ids: [String(b.account_id)] } } })).json; assert.equal(d.rows.reduce((s, l) => s + l.dr, 0), x.total, 'bank ' + b.name); }
});
test('deposit # (slip) is saved, listed and shown; undeposited rows say which account', { skip: !PW }, async () => {
  const L = sq.prepare(`SELECT l.id FROM leases l WHERE l.status='active' ORDER BY l.id LIMIT 1`).get(); const bank = sq.prepare(`SELECT id FROM bank_accounts WHERE kind='bank' ORDER BY id LIMIT 1`).get();
  const p = await call('m/ledger', { kind: 'payment', lease_id: L.id, amount: '50.00', date: T, method: 'Cash', deposit_to: 'undeposited' }); assert.equal(p.status, 200);
  const u = (await call('m/x37/undeposited')).json; const it = u.items.find(i => i.id === p.json.id); assert.ok(it && it.account, 'undeposited row has its account');
  const d = await call('m/x37/deposit', { bank_account_id: bank.id, date: T, ref: 'SLIP-1042', journal_ids: [p.json.id] }); assert.equal(d.status, 200, JSON.stringify(d.json)); assert.equal(d.json.ref, 'SLIP-1042'); assert.ok(d.json.payments[0].account);
  const list = (await call('m/x37/deposits?limit=500')).json.items; assert.equal(list.find(z => z.id === d.json.id)?.ref, 'SLIP-1042');
  const tb2 = (await call('m/reports/trial-balance')).json.totals; assert.equal(tb2.debit, tb2.credit);
  assert.equal((await call(`m/x37/deposit/${d.json.id}/undo`, {})).status, 200);
});
