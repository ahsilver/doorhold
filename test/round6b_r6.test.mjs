import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker-r6.mjs');
const worker = (await import('/tmp/pm-test-worker-r6.mjs?' + Date.now())).default;
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
// round 6 item 2 (owner, Oct 27 4:55 PM): nothing posts from a bank line unless the row says exactly where it goes
test('r6 posting rule: server refuses Undeposited Funds, a missing property, rent without a tenant, and no choice; complete rows post', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; const T = (await call('health')).json.today;
  await call('m/bank/1/import', { text: csvOf([[T, 'ZZ6 ZELLE FROM GINA TORRES', 440000], [T, 'ZZ6 HOME DEPOT 4411', -12345], [T, 'ZZ6 MOBILE DEPOSIT RENT', 50000], [T, 'ZZ6 MYSTERY', -777]]), filename: 'r6.csv' }, 'POST', tok);
  const ch = (await call('m/chart', null, 'GET', tok)).json; const accs = ch.accounts;
  const und = accs.find(a => /undeposited/i.test(a.name)); const rep = accs.find(a => a.type === 'expense' && /repair/i.test(a.name)) || accs.find(a => a.type === 'expense'); const rent = accs.find(a => a.type === 'income' && /rent/i.test(a.name));
  assert.ok(und && rep && rent, 'chart has the accounts');
  const props = (await call('m/properties', null, 'GET', tok)).json; const pid = props[0].id; const lz = (await call('m/x53/leases', null, 'GET', tok)).json.leases; const lid = lz[0].lease_id;
  const ln = sq.prepare(`SELECT id, description FROM bank_txns WHERE description LIKE 'ZZ6 %' AND status='unmatched'`).all(); const id = d => ln.find(z => z.description.startsWith(d)).id;
  const ap = async (txn, ov) => (await call('m/catchup/approve', { ids: [txn], overrides: ov ? { [txn]: ov } : undefined }, 'POST', tok)).json;
  const n0 = jcount();
  let x = await ap(id('ZZ6 ZELLE'), { type: 'expense', account_id: und.id, property_id: pid }); assert.equal(x.ok, 0); assert.match(x.results[0].error, /can’t take a bank line/);
  x = await ap(id('ZZ6 ZELLE'), { type: 'income', account_id: rent.id, property_id: pid }); assert.equal(x.ok, 0); assert.match(x.results[0].error, /need the tenant/);
  x = await ap(id('ZZ6 HOME'), { type: 'expense', account_id: rep.id }); assert.equal(x.ok, 0); assert.match(x.results[0].error, /Choose the property/);
  x = await ap(id('ZZ6 MYSTERY'), { type: 'unknown' }); assert.equal(x.ok, 0); assert.match(x.results[0].error, /Choose what this is/);
  x = await ap(id('ZZ6 MYSTERY'), null); assert.equal(x.ok, 0, 'a line with no complete suggestion never posts by itself');
  assert.equal(jcount(), n0, 'nothing was booked by the refused rows');
  x = await ap(id('ZZ6 HOME'), { type: 'expense', account_id: rep.id, property_id: 'co' }); assert.equal(x.ok, 1, JSON.stringify(x));
  const j = sq.prepare('SELECT property_id FROM journal WHERE id=?').get(x.results[0].journal_id); assert.equal(j.property_id, null, 'Whole company: no property on the entry');
  x = await ap(id('ZZ6 MOBILE'), { type: 'income', account_id: rent.id, property_id: pid, lease_id: lid }); assert.equal(x.ok, 1, JSON.stringify(x));
  x = await ap(id('ZZ6 ZELLE'), { type: 'payment', lease_id: lid }); assert.equal(x.ok, 1, JSON.stringify(x));
  // r6 item 4: every bank line opens a detail panel: the line and what it is linked to in the books
  const dm = (await call('m/x6/txn/' + id('ZZ6 HOME'), null, 'GET', tok)).json; assert.equal(dm.txn.status, 'matched'); assert.ok(dm.entry && dm.entry.id && dm.entry.lines.length >= 2, JSON.stringify(dm).slice(0, 300));
  const dz = (await call('m/x6/txn/' + id('ZZ6 ZELLE'), null, 'GET', tok)).json; assert.ok(dz.entry.tenant_id, 'rent payment carries the tenant for "Open tenant ledger"');
  const du = (await call('m/x6/txn/' + id('ZZ6 MYSTERY'), null, 'GET', tok)).json; assert.equal(du.txn.status, 'unmatched'); assert.equal(du.entry, null);
  assert.equal((await call('m/x6/txn/999999', null, 'GET', tok)).status, 404);
  // Ignore is undoable
  await call(`m/bank/txn/${id('ZZ6 MYSTERY')}/ignore`, {}, 'POST', tok); assert.ok((await call('m/x60/ignored/1', null, 'GET', tok)).json.ignored.some(t => t.description === 'ZZ6 MYSTERY'));
  await call(`m/bank/txn/${id('ZZ6 MYSTERY')}/unmatch`, {}, 'POST', tok); assert.equal(sq.prepare('SELECT status FROM bank_txns WHERE id=?').get(id('ZZ6 MYSTERY')).status, 'unmatched');
});
test('r6 posting rule: the app runs the same rule (identical function) and never pre-ticks an incomplete row', () => {
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
  const src = s => { const a = s.indexOf('function postRule6('); return s.slice(a, s.indexOf('\n}\n', a) + 2); };
  assert.equal(src(app), src(wk), 'one rule, same text in app and server');
  const rule = new Function(src(wk) + '; return postRule6;')(); const A = { 1: { name: 'Undeposited Funds', type: 'asset' }, 2: { name: 'Rent Income', type: 'income' }, 3: { name: 'Repairs', type: 'expense' } }; const acc = id => A[id] || null;
  assert.match(rule({ type: 'expense', account_id: 1, property_id: 9, label: 'Undeposited Funds · 212 Forest — booked like this before (37×)' }, acc), /can’t take a bank line/);
  assert.equal(rule({ type: 'expense', account_id: 3, property_id: 9 }, acc), ''); assert.match(rule({ type: 'expense', account_id: 3 }, acc), /property/);
  assert.equal(rule({ type: 'expense', account_id: 3, company_wide: 1 }, acc), ''); assert.match(rule({ type: 'expense', account_id: 2, property_id: 9 }, acc), /tenant/);
  assert.equal(rule({ type: 'match', journal_id: 5 }, acc), ''); assert.match(rule({}, acc), /Choose what this is/); assert.equal(rule({ type: 'payment', lease_id: 4 }, acc), '');
  assert.match(app, /function safeTick81\(t, L\) \{ const s = t\.s \|\| \{\}; if \(CU80\.ov\[t\.id\] \|\| !ready80\(t\)\) return ready80\(t\);/);
  assert.match(app, /function ready80\(t\) \{ const e = eff80\(t\); if \(postRule6\(e, acc6\)\) return false;/);
  assert.match(wk, /\{ const why6 = postRule6\(s, id => ACBYID\[id\]\); if \(why6\) throw new HttpError\(why6\); \}/);
});
test('r6 items 3-5: every unmatched row has the same primary action (Record new deposit / expense), Match, Ignore, Details; Split only inside the deposit form', () => {
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  const a = app.slice(app.indexOf('function acts6('), app.indexOf('function det6Wire('));
  for (const s of ["out ? 'Record new expense' : 'Record new deposit'", 'data-mm81', 'data-ig6>Ignore', 'data-det6>Details']) assert.ok(a.includes(s), s);
  assert.match(app, /<div class="ac81 ac6">\$\{acts6\(t, e, mode, out\)\}<\/div>\$\{panel\}/);
  assert.match(app, /\$\$\('\.cu-split', row\)\.forEach\(a => a\.remove\(\)\); \/\/ r6/, 'no row shows Split as its action');
  assert.match(app, /<a class="lnk6" data-g4s href="\$\{sp\}">Split into rent \/ deposit \/ fee<\/a>/, 'Split is a small link inside Record new deposit');
  assert.match(app, /const G4K = \[\['rent', 'Rent'\], \['deposit', 'Security deposit \/ down payment'\], \['undep', 'Already received \(undeposited payments\)'\], \['loan', 'Loan received'\], \['owner', 'Owner contribution'\], \['sale', 'Sale \/ closing proceeds'\], \['refund', 'Refund'\], \['transfer', 'Transfer from my other account'\], \['other', 'Other deposit'\]\]/); // r7: more deposit kinds (owner 5:44 PM)
  assert.match(app, /async function openDet6\(id\) \{/); assert.match(app, /api\('m\/x6\/txn\/' \+ id\)/); assert.match(app, /data-um6>Unmatch/); assert.match(app, /Open tenant ledger/);
  assert.match(app, /<button type="button" class="rc5sb ig6b" data-ig6l>Ignored/); assert.match(app, /rd\.textContent = n \? `\$\{n\} ready to post`/);
  const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8'); assert.match(css, /@media \(max-width:759px\)\{\.dp6\{left:0;right:0;bottom:0/, 'bottom sheet on phone'); assert.match(css, /@media \(min-width:760px\)\{\.dp6\{top:0;right:0;bottom:0;width:420px/, 'side panel on desktop');
});
test('r6: opening a sheet removes one that is still fading out (desktop "Rent received" right after closing "Expense" threw)', () => {
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); assert.match(app, /function sheet\(html, \{ onSubmit, onOpen \} = \{\}\) \{\n  closeSheet\(\); \$\$\('\.sheet,\.sheet-bg'\)\.forEach\(el => el\.remove\(\)\);/);
});
