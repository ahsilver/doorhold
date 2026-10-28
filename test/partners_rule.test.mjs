
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


test('rule B: a house without partners never asks which partner', { skip: !PW }, async () => {
  const lg = await call('login', { email: 'manager@example.com', password: PW }); token = lg.json.token;
  const ps = await call('m/properties'); const solo = ps.json.find(p => !p.partners_on); assert.ok(solo, 'demo has a house without partners'); const pid = solo.id;
  const pp = await call('m/x26/people?property_id=' + pid);
  assert.equal(pp.json.has_partners, false); assert.equal(pp.json.partners.length, 0);
  assert.ok(pp.json.self && pp.json.self.id, 'a no-partner house has one "personally": its owner');
  // the client: every "who paid / which partner" picker has a no-partner branch that shows no question
  const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  for (const sig of ["if (!ppl.has_partners && ppl.self) { s2.innerHTML", "if (pp.self && !pp.has_partners && pid) { $('#oc26who'", "if (pp.self && !pp.has_partners && pid) { $('#pbwho26'", ": ppl.self ? [ppl.self] :", 'async function clPart28()', '.nopart28 .ah-tog:has(#ahp)', 'function wzPart28(f)'])
    assert.ok(app.includes(sig) || fs.readFileSync(path.join(SITE, 'app.css'), 'utf8').includes(sig), 'missing no-partner branch: ' + sig);
  // the closing upload's "Has partners?" switch is gated per house
  assert.match(app, /const show = pid \? !!\(props\.find\(p => p\.id === pid\) \|\| \{\}\)\.partners_on : any;/);
});
