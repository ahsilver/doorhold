import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker64.mjs');
const worker = (await import('/tmp/pm-test-worker64.mjs?' + Date.now())).default;
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
const prevM = (() => { const [y, m] = M.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();


let tok = '';
test('d64 entity types: new types save and show their label; old types unchanged; bad type refused', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'E64 Tester', company: 'E64 Mgmt', email: 'e64@example.com', password: 'E64-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const x0 = await call('m/entities', null, 'GET', tok); assert.equal(x0.status, 200, x0.text);
  const keys = x0.json.types.map(t => t.k);
  for (const k of ['individual', 'sole_prop', 'llc_single', 'llc_multi', 'c_corp', 's_corp', 'partnership', 'lp', 'llp', 'trust', 'other']) assert.ok(keys.includes(k), 'type ' + k);
  const want = { lp: 'LP (limited partnership)', llp: 'LLP (limited liability partnership)', sole_prop: 'Sole proprietor', other: 'Other', c_corp: 'Corporation (C-corp)', llc_single: 'LLC - single member' };
  const names = { lp: 'Oak Fund LP', llp: 'Cedar Advisors LLP', sole_prop: 'Pat Doe', other: 'Elm Co-op', c_corp: 'Birch Holdings Inc', llc_single: '24 Sample Street LLC' };
  for (const [k, nm] of Object.entries(names)) { const r = await call('m/entities', { name: nm, type: k, state: 'NJ' }, 'POST', tok); assert.equal(r.status, 200, k + ' ' + r.text); }
  const x = (await call('m/entities', null, 'GET', tok)).json;
  for (const [k, nm] of Object.entries(names)) { const e = x.entities.find(e => e.name === nm); assert.ok(e, nm); assert.equal(e.type, k); assert.equal(e.type_label, want[k]); }
  assert.ok(x.entities.some(e => e.name === '24 Sample Street LLC'), 'a name containing LLC is stored as typed');
  const bad = await call('m/entities', { name: 'Nope', type: 'banana' }, 'POST', tok); assert.equal(bad.status, 400, bad.text);
  const mf = await call('m/mgmt/form', null, 'GET', tok); if (mf.status === 200 && mf.json.llcs) assert.ok(mf.json.llcs.some(e => e.name === 'Oak Fund LP'), 'an LP is offered in "Which entity"');
});
test('d64 companies: entity type (companies.kind) defaults to LLC, saves, edits; names unchanged', { skip: !PW }, async () => {
  const a = await call('m/companies', { name: 'Maple Holdings LLC' }, 'POST', tok); assert.equal(a.status, 200, a.text);
  const b = await call('m/companies', { name: 'Spruce Corp', kind: 'Corporation' }, 'POST', tok); assert.equal(b.status, 200, b.text);
  const c = await call('m/companies', { name: 'Bad Kind', kind: 'Banana' }, 'POST', tok); assert.equal(c.status, 400, c.text);
  let cs = (await call('m/companies', null, 'GET', tok)).json;
  assert.equal(cs.find(x => x.id === a.json.id).kind, 'LLC'); assert.equal(cs.find(x => x.id === b.json.id).kind, 'Corporation'); assert.ok(!cs.some(x => x.name === 'Bad Kind'));
  const e = await call('m/companies/' + a.json.id, { kind: 's-corp' }, 'POST', tok); assert.equal(e.status, 200, e.text); assert.equal(e.json.company.kind, 'S-Corp'); assert.equal(e.json.company.name, 'Maple Holdings LLC');
  const e2 = await call('m/companies/' + b.json.id, { name: 'Spruce Trust', kind: 'Trust' }, 'POST', tok); assert.equal(e2.json.company.name, 'Spruce Trust'); assert.equal(e2.json.company.kind, 'Trust');
  const d = await call('m/companies/' + a.json.id, null, 'GET', tok); assert.equal(d.status, 200, d.text); assert.equal(d.json.company.kind, 'S-Corp');
  const nf = await call('m/companies/99999', { kind: 'LLC' }, 'POST', tok); assert.equal(nf.status, 404, nf.text);
  const tb = await call('m/reports/trial-balance', null, 'GET', tok); assert.equal(tb.status, 200); assert.equal(tb.json.totals.debit, tb.json.totals.credit);
});
test('d64 wording: no generic "LLC" labels left in the UI strings', async () => {
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'), wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
  for (const s of ['Companies / LLCs', 'Company / LLC', 'Owners & LLCs', 'owners & LLCs', '+ New LLC', "'Which LLC'", "'LLC name'", '(LLC level)', 'Per LLC / owner', 'Which LLC made what', 'Add another LLC']) { assert.ok(!app.includes(s), 'app: ' + s); assert.ok(!wk.includes(s), 'worker: ' + s); }
  assert.ok(app.includes('Companies / entities') && app.includes("field('Entity type'"));
});
