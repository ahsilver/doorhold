import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker71.mjs');
const worker = (await import('/tmp/pm-test-worker71.mjs?' + Date.now())).default;
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

const fmt = d => `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`;
const csvOf = rows => 'Date,Description,Amount\n' + rows.map(([d, s, a]) => `${fmt(d)},${s},${(a / 100).toFixed(2)}`).join('\n') + '\n';
const openE = async bid => (await call('m/x24/match/' + bid, null, 'GET', tok)).json.books.filter(e => !e.txns.length && !e.cleared);
const bankL = async (bid, desc) => (await call('m/x24/match/' + bid, null, 'GET', tok)).json.bank.find(t => t.description === desc);

test('setup: sign in', { skip: !PW }, async () => { const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; T = (await call('health')).json.today; assert.match(T, /^\d{4}-\d\d-\d\d$/); });

test('register: every row carries C / R / blank; counts, filters and cleared balance agree', { skip: !PW }, async () => {
  const x = (await call('m/x24/register/1?limit=20000', null, 'GET', tok)).json;
  assert.ok(x.rows.length > 20); assert.ok(x.rows.every(r => ['', 'C', 'R'].includes(r.st)));
  assert.ok(x.rows.every(r => (r.st !== '') === r.cleared), 'C/R exactly where the row was already cleared');
  assert.deepEqual(x.counts, { all: x.rows.length, unc: x.rows.filter(r => !r.st).length, clr: x.rows.filter(r => r.st === 'C').length, rec: x.rows.filter(r => r.st === 'R').length });
  assert.equal(x.cleared_balance + x.uncleared_total, x.balance); assert.equal(x.uncleared_n, x.counts.unc); assert.equal(x.reconciled_through, null);
  for (const [s, f] of [['unc', r => !r.st], ['clr', r => r.st === 'C'], ['rec', r => r.st === 'R'], ['open', r => !r.st]]) { const y = (await call('m/x24/register/1?limit=20000&status=' + s, null, 'GET', tok)).json; assert.deepEqual(y.rows.map(r => r.id), x.rows.filter(f).map(r => r.id), s); assert.equal(y.total, y.rows.length); }
  const y = (await call('m/x24/register/1?limit=5', null, 'GET', tok)).json; assert.equal(y.rows.length, 5); assert.equal(y.total, x.rows.length);
});

test('reconcile: finishing turns its cleared entries into R; undo puts them back to C; nothing else changes', { skip: !PW }, async () => {
  const t0 = await tb(), n0 = jcount();
  const x = (await call('m/x24/register/1?limit=20000', null, 'GET', tok)).json; const cl = x.rows.filter(r => r.cleared);
  const dt = cl.map(r => r.date).sort()[Math.floor(cl.length / 2)];
  const end = cl.filter(r => r.date <= dt).reduce((s, r) => s + r.amount, 0);
  const m0 = JSON.stringify((await call('m/x24/match/1', null, 'GET', tok)).json.bank);
  const r = await call('m/x24/rec/1', { date: dt, ending: (end / 100).toFixed(2) }, 'POST', tok); assert.equal(r.status, 200, r.text);
  const y = (await call('m/x24/register/1?limit=20000', null, 'GET', tok)).json; assert.equal(y.reconciled_through, dt);
  for (const z of y.rows) assert.equal(z.st, !z.cleared ? '' : z.date <= dt ? 'R' : 'C', z.id + ' ' + z.date);
  const st = (await call('m/x71/st/1', null, 'GET', tok)).json; assert.equal(Object.values(st.map).filter(v => v === 'R').length, y.counts.rec);
  assert.equal(JSON.stringify((await call('m/x24/match/1', null, 'GET', tok)).json.bank), m0);
  assert.equal((await call('m/x24/rec/1/undo', {}, 'POST', tok)).status, 200);
  const z2 = (await call('m/x24/register/1?limit=20000', null, 'GET', tok)).json; assert.equal(z2.counts.rec, 0); assert.equal(z2.reconciled_through, null);
  assert.deepEqual(await tb(), t0); assert.equal(jcount(), n0);
});

test('rules: save checks the fields, keeps priority order, on/off and delete', { skip: !PW }, async () => {
  assert.equal((await call('m/x71/rules/save', { action: 'match' }, 'POST', tok)).status, 400);
  assert.equal((await call('m/x71/rules/save', { text: 'X CO', action: 'new' }, 'POST', tok)).status, 400, 'a new-entry rule needs a category');
  assert.equal((await call('m/x71/rules/save', { text: '', amt_op: 'eq', amt1: '' }, 'POST', tok)).status, 400);
  const a = (await call('m/x71/rules/save', { name: 'A', text: 'ZZ ALPHA' }, 'POST', tok)).json.id, b = (await call('m/x71/rules/save', { name: 'B', amt_op: 'between', amt1: '10', amt2: '20' }, 'POST', tok)).json.id;
  let L = (await call('m/x71/rules', null, 'GET', tok)).json.rules; assert.deepEqual(L.map(r => r.name), ['A', 'B']); assert.equal(L[0].auto, 0); assert.equal(L[0].days, 5);
  await call('m/x71/rules/order', { ids: [b, a] }, 'POST', tok); await call(`m/x71/rules/${a}/active`, { on: false }, 'POST', tok);
  L = (await call('m/x71/rules', null, 'GET', tok)).json.rules; assert.deepEqual(L.map(r => [r.name, r.active]), [['B', 1], ['A', 0]]);
  await call(`m/x71/rules/${a}/delete`, {}, 'POST', tok); await call(`m/x71/rules/${b}/delete`, {}, 'POST', tok);
  assert.equal((await call('m/x71/rules', null, 'GET', tok)).json.rules.length, 0);
});

test('import: built-in auto-match only when certain (exact amount within 3 days, or the check number); the rest stays a suggestion', { skip: !PW }, async () => {
  const t0 = await tb(), n0 = jcount();
  const es = await openE(1); const am = {}; for (const e of es) am[e.amount] = (am[e.amount] || 0) + 1;
  const uniq = es.filter(e => am[e.amount] === 1); assert.ok(uniq.length >= 2, 'two open entries with unique amounts: ' + es.length);
  const [e1, e2] = uniq;
  const r = await call('m/bank/1/import', { text: csvOf([[addD(e1.date, 2), 'ZZ NEAR PAYMENT', e1.amount], [addD(e2.date, 6), 'ZZ FAR PAYMENT', e2.amount]]), filename: 't71a.csv' }, 'POST', tok); assert.equal(r.status, 200, r.text);
  const l1 = await bankL(1, 'ZZ NEAR PAYMENT'), l2 = await bankL(1, 'ZZ FAR PAYMENT');
  assert.equal(l1.matched, true); assert.deepEqual(l1.entries, [e1.id]); assert.equal(l2.matched, false, '6 days apart: suggested, not matched');
  const sg = (await call('m/x24/suggest/1', null, 'GET', tok)).json; assert.ok(sg.matches.some(m => m.txn_id === l2.id && m.entries[0].id === e2.id));
  assert.deepEqual(await tb(), t0); assert.equal(jcount(), n0);
});

test('rules: a match rule names itself on the suggestion, previews, applies; a new-entry rule adds one entry and matches it', { skip: !PW }, async () => {
  const t0 = await tb(), n0 = jcount();
  const l2 = await bankL(1, 'ZZ FAR PAYMENT'); assert.ok(l2 && !l2.matched);
  const id = (await call('m/x71/rules/save', { name: 'Far payee', text: 'zz far', action: 'match', days: 7 }, 'POST', tok)).json.id;
  const sg = (await call('m/x24/suggest/1', null, 'GET', tok)).json; const m = sg.matches.find(z => z.txn_id === l2.id); assert.equal(m.rule, 'Far payee');
  const pv = (await call('m/x71/rules/preview', { id }, 'POST', tok)).json; assert.equal(pv.counts.match, 1); assert.equal(pv.items[0].txn_id, l2.id);
  const pv0 = (await call('m/x71/rules/preview', { rule: { text: 'zz far', days: 3 } }, 'POST', tok)).json; assert.equal(pv0.counts.none, 1, 'a 3-day window finds nothing');
  const ap = (await call('m/x71/rules/apply', { id }, 'POST', tok)).json; assert.equal(ap.matched, 1);
  assert.equal((await bankL(1, 'ZZ FAR PAYMENT')).matched, true); assert.deepEqual(await tb(), t0); assert.equal(jcount(), n0);
  assert.equal((await call('m/x71/rules', null, 'GET', tok)).json.rules[0].hits, 1);
  // new-entry rule
  const ch = (await call('m/chart', null, 'GET', tok)).json; const fee = ch.accounts.find(a => a.code === '6800');
  await call('m/bank/1/import', { text: csvOf([[T, 'ZZ WIDGET SHOP 77', -4321]]), filename: 't71b.csv' }, 'POST', tok);
  const nid = (await call('m/x71/rules/save', { name: 'Widgets', text: 'WIDGET SHOP', action: 'new', account_id: fee.id, memo: 'Widgets' }, 'POST', tok)).json.id;
  const sg2 = (await call('m/x24/suggest/1', null, 'GET', tok)).json; const ln = await bankL(1, 'ZZ WIDGET SHOP 77'); assert.ok(sg2.rule_new.some(z => z.txn_id === ln.id && z.rule === 'Widgets'));
  const ap2 = (await call('m/x71/rules/apply', { id: nid, txn_ids: [ln.id] }, 'POST', tok)).json; assert.equal(ap2.added, 1);
  const l3 = await bankL(1, 'ZZ WIDGET SHOP 77'); assert.equal(l3.matched, true); assert.equal(jcount(), n0 + 1);
  const t1 = await tb(); assert.equal(t1[0], t1[1]);
  const rg = (await call('m/x24/register/1?q=Widgets', null, 'GET', tok)).json; assert.equal(rg.rows[0].st, 'C'); assert.equal(rg.rows[0].amount, -4321);
  for (const r of (await call('m/x71/rules', null, 'GET', tok)).json.rules) await call(`m/x71/rules/${r.id}/delete`, {}, 'POST', tok);
});

test('auto rules on import: auto-match when exactly one entry fits; never add a second entry when one with that amount is already in the books', { skip: !PW }, async () => {
  const n0 = jcount(); const am = {}; const op = await openE(1); for (const e of op) am[e.amount] = (am[e.amount] || 0) + 1;
  const e = op.find(z => am[z.amount] === 1); assert.ok(e, 'an open entry with a unique amount');
  await call('m/x71/rules/save', { name: 'Auto Q', text: 'ZZ AUTOQ', action: 'match', days: 10, auto: true }, 'POST', tok);
  const ch = (await call('m/chart', null, 'GET', tok)).json; const fee = ch.accounts.find(a => a.code === '6800');
  await call('m/x71/rules/save', { name: 'Auto new', text: 'ZZ AUTONEW', action: 'new', account_id: fee.id, auto: true }, 'POST', tok);
  const r = (await call('m/bank/1/import', { text: csvOf([[addD(e.date, 8), 'ZZ AUTOQ 1', e.amount], [T, 'ZZ AUTONEW FEE', -1111], [addD(e.date, 9), 'ZZ AUTONEW DUP', e.amount]]), filename: 't71c.csv' }, 'POST', tok)).json;
  const q = await bankL(1, 'ZZ AUTOQ 1'), f = await bankL(1, 'ZZ AUTONEW FEE'), dp = await bankL(1, 'ZZ AUTONEW DUP');
  assert.equal(q.matched, true); assert.deepEqual(q.entries, [e.id]); assert.equal(f.matched, true); assert.equal(dp.matched, false, 'same amount as an entry in the books: left for the owner');
  assert.equal(jcount(), n0 + 1); const t1 = await tb(); assert.equal(t1[0], t1[1]);
  for (const x of (await call('m/x71/rules', null, 'GET', tok)).json.rules) await call(`m/x71/rules/${x.id}/delete`, {}, 'POST', tok);
});

test('lock: a matched entry cannot be edited or voided until it is unmatched; inside a finished reconciliation even unmatch is refused', { skip: !PW }, async () => {
  const m = (await call('m/x24/match/1', null, 'GET', tok)).json; const t = m.bank.find(z => z.matched && z.entries.length === 1); const jid = t.entries[0];
  const L = (await call('m/x71/lock/' + jid, null, 'GET', tok)).json.lock; assert.equal(L.kind, 'matched'); assert.equal(L.txns[0].id, t.id);
  for (const a of ['void', 'save', 'edit']) { const r = await call(`m/entry/${jid}/${a}`, { memo: 'changed' }, 'POST', tok); assert.equal(r.status, 409, a); assert.equal(r.json.error, 'This transaction is matched to a bank line. Unmatch it first to edit.'); }
  assert.equal((await call('m/x24/unmatch/1', { txn_id: t.id }, 'POST', tok)).status, 200);
  assert.equal((await call('m/x71/lock/' + jid, null, 'GET', tok)).json.lock, null);
  const v = await call(`m/entry/${jid}/void`, {}, 'POST', tok); assert.equal(v.status, 200, v.text);
  assert.equal((await call(`m/entry/${jid}/restore`, {}, 'POST', tok)).status, 200);
  assert.equal((await call('m/x24/match/1', { txn_ids: [t.id], entry_ids: [jid] }, 'POST', tok)).status, 200);
  // reconciled: unmatch refused until the reconciliation is undone
  const x = (await call('m/x24/register/1?limit=20000', null, 'GET', tok)).json; const cl = x.rows.filter(r => r.cleared); const dt = x.rows.find(r => r.id === jid).date;
  const end = cl.filter(r => r.date <= dt).reduce((s, r) => s + r.amount, 0);
  assert.equal((await call('m/x24/rec/1', { date: dt, ending: (end / 100).toFixed(2) }, 'POST', tok)).status, 200);
  const u = await call('m/x24/unmatch/1', { txn_id: t.id }, 'POST', tok); assert.equal(u.status, 409); assert.match(u.json.error, /finished reconciliation/);
  assert.equal((await call(`m/entry/${jid}/void`, {}, 'POST', tok)).status, 409);
  assert.equal((await call('m/x24/rec/1/undo', {}, 'POST', tok)).status, 200);
  assert.equal((await call('m/x71/lock/' + jid, null, 'GET', tok)).json.lock.kind, 'matched');
});

test('bank feed: Matched list = every matched bank line with its entry; a rule line shows as Sure with the rule and approving it applies the rule', { skip: !PW }, async () => {
  const ml = (await call('m/x71/matched?limit=1000', null, 'GET', tok)).json;
  const all = (await Promise.all([1, 2, 3].map(b => call('m/x24/match/' + b, null, 'GET', tok)))).flatMap(r => (r.json && r.json.bank) || []);
  assert.equal(ml.total, all.filter(t => t.matched).length); assert.ok(ml.items.every(i => i.entries.length >= 1 || i.how === 'opening'));
  const ch = (await call('m/chart', null, 'GET', tok)).json; const fee = ch.accounts.find(a => a.code === '6800');
  await call('m/bank/1/import', { text: csvOf([[T, 'ZZ FEEDRULE CHARGE', -2222], [T, 'ZZ EXACT', -3333]]), filename: 't71d.csv' }, 'POST', tok);
  const rid = (await call('m/x71/rules/save', { name: 'Feed rule', text: 'ZZ FEEDRULE', action: 'new', account_id: fee.id }, 'POST', tok)).json.id;
  await call('m/x71/rules/save', { name: 'Exact', text: 'ZZ EXAC', text_mode: 'equals', action: 'new', account_id: fee.id }, 'POST', tok);
  const cu = (await call('m/catchup?confidence=none', null, 'GET', tok)).json; const ln = cu.list.find(z => z.description === 'ZZ FEEDRULE CHARGE'); assert.ok(ln); assert.match(ln.s.label, /Feed rule/); assert.ok(ln.s.rule8 && ln.conf8 === 'none', 'r8: a rule that ADDS an entry is not a found match: Not in books, his own rule'); // r8
  assert.ok(!cu.list.some(z => z.description === 'ZZ EXACT' && /Exact/.test(z.s.label || '')), '"is exactly" does not fit a longer text');
  const n0 = jcount(); const ap = await call('m/catchup/approve', { ids: [ln.id] }, 'POST', tok); assert.equal(ap.status, 200, ap.text);
  assert.equal((await bankL(1, 'ZZ FEEDRULE CHARGE')).matched, true); assert.equal(jcount(), n0 + 1);
  const rg = (await call('m/x24/register/1?q=ZZ FEEDRULE', null, 'GET', tok)).json; assert.equal(rg.rows[0].category, 'Bank Fees');
  assert.equal((await call('m/x71/rules', null, 'GET', tok)).json.rules.find(r => r.id === rid).hits, 1);
  const t1 = await tb(); assert.equal(t1[0], t1[1]);
  for (const x of (await call('m/x71/rules', null, 'GET', tok)).json.rules) await call(`m/x71/rules/${x.id}/delete`, {}, 'POST', tok);
});
