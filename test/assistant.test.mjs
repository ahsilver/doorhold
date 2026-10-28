
// node --test test/assistant.test.mjs — runs the real Worker against an in-memory SQLite D1 shim
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker.mjs');
const worker = (await import('/tmp/pm-test-worker.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { for (const s of st) await s.run(); sq.exec('COMMIT'); } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') } };
let token = '';
const call = async (p, body, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined }), env, {}); return { status: r.status, json: await r.json() }; };
const PW = (fs.readFileSync('demo-logins.local.txt', 'utf8').match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];

test('site files are present and reference each other', () => {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  assert.match(html, /<meta name="viewport" content="width=device-width/); assert.match(html, /<title>[^<]+<\/title>/);
  for (const m of html.matchAll(/(?:href|src)="(\/[^"?]+)/g)) assert.ok(fs.existsSync(path.join(SITE, m[1])), 'missing ' + m[1]);
  for (const f of ['closing-extract.js', 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs']) assert.ok(fs.existsSync(path.join(SITE, f)), f);
  assert.doesNotMatch(fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'), /lorem ipsum|\bTODO\b/);
});
test('manager signs in', { skip: !PW }, async () => { const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); token = r.json.token; });
test('the exact owner sentence resolves to a confirm card', { skip: !PW }, async () => {
  const r = await call('m/assist/parse', { text: "198 Meadow just paid $500 and it's in Chase 2306 account" });
  assert.equal(r.json.status, 'confirm'); assert.equal(r.json.intent, 'payment');
  assert.match(r.json.summary, /\$500\.00 payment from Rachel Stern at 198 Meadow/); assert.match(r.json.summary, /••2306/);
  const c = await call('m/assist/confirm', { draft: r.json.draft }); assert.equal(c.json.status, 'done'); assert.equal(c.json.result.journal.length, 1);
  // bank statement import auto-matches the recorded deposit
  const csv = 'Posting Date,Description,Amount\r\n' + new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }) + ',ACH CREDIT RACHEL STERN,500.00\r\n';
  const banks = (await call('m/chart')).json.banks; const chase = banks.find(b => b.last4 === '2306');
  const imp = await call(`m/bank/${chase.id}/import`, { text: csv, filename: 'chase.csv' }); assert.equal(imp.json.matched, 1);
  const u = await call(`m/assist/log/${c.json.log_id}/undo`, {}); assert.equal(u.status, 200);
});
test('other phrasings', { skip: !PW }, async () => {
  const q = async t => (await call('m/assist/parse', { text: t })).json;
  assert.equal((await q('charge unit 3B a $75 late fee')).status, 'question');
  const ex = await q('paid ABC Plumbing $1,200 for 12 Main St from Chase 2306'); assert.equal(ex.status, 'question'); assert.match(ex.question, /12 Main St/);
  const rc = await q("Maya Cohen's rent went up to $2,400 starting Jan 1"); assert.equal(rc.intent, 'rent_change');
  const wo = await q('open a work request: leak under sink at 1120 Myrtle 4A'); assert.equal(wo.intent, 'work_order'); assert.match(wo.summary, /Leak under sink/);
  const wb = await q('water bill for 198 Meadow $86.40 due Nov 10'); assert.equal(wb.intent, 'utility_bill');
  assert.equal((await q('match the bank')).status, 'nav');
});
test('chart of accounts is Buildium-style and editable', { skip: !PW }, async () => {
  const ch = (await call('m/chart')).json.accounts; for (const n of ['Accounts Payable', 'Undeposited Funds', 'Application Fee Income', 'Utilities - Gas', 'Mortgage Interest']) assert.ok(ch.some(a => a.name === n), n);
  const add = await call('m/chart', { code: '6115', name: 'Turnover Painting', type: 'expense' }); assert.equal(add.status, 200);
});
test('closing statement sample parses', () => {
  const cp = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'); assert.match(cp, /function parseClosingText/);
});
