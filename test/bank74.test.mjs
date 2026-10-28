import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker74.mjs');
const worker = (await import('/tmp/pm-test-worker74.mjs?' + Date.now())).default;
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



const form = async (p, fields, tok) => { const fd = new FormData(); for (const [k, v] of fields) fd.append(k, v); const r = await worker.fetch(new Request('http://x/api/' + p, { method: 'POST', headers: { 'x-pm-app': '1', authorization: 'Bearer ' + tok }, body: fd }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t }; };
const jpg = () => new File([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 255, 217])], 'done.jpg', { type: 'image/jpeg' });
const login = async (email, password) => { const r = await call('login', { email, password }); assert.equal(r.status, 200, r.text); return r.json.token; };

let tok = '';
test('d74 rec74: last finished reconciliation for one bank (date, ending), read only; undo clears it', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'B74 Tester', company: 'B74 Demo Mgmt', email: 'b74@example.com', password: 'B74-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const ba = await call('m/bank-accounts', { name: 'Operating', institution: 'Demo Bank', last4: '7401' }, 'POST', tok); assert.equal(ba.status, 200, ba.text);
  const bid = (await call('m/x66/cfg', null, 'GET', tok)).json.banks[0].id;
  let z = await call('m/x71/rec74/' + bid, null, 'GET', tok); assert.equal(z.status, 200, z.text); assert.equal(z.json.n, 0); assert.equal(z.json.last, null);
  const r = await call('m/x24/rec/' + bid, { date: T, starting: '0.00', ending: '0.00' }, 'POST', tok); assert.equal(r.status, 200, r.text);
  z = await call('m/x71/rec74/' + bid, null, 'GET', tok); assert.equal(z.json.n, 1); assert.equal(z.json.last.date, T); assert.equal(z.json.last.ending, 0);
  const g = (await call('m/x24/register/' + bid, null, 'GET', tok)).json; assert.equal(g.reconciled_through, T);
  assert.equal((await call('m/x24/rec/' + bid + '/undo', {}, 'POST', tok)).status, 200);
  z = await call('m/x71/rec74/' + bid, null, 'GET', tok); assert.equal(z.json.n, 0);
});
test('d74 bank page: Register / Reconcile tabs in the URL; 4 record buttons; reconcile tab has no record buttons; journal entry prefilled', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const i = js.indexOf('// ===== d74 bank account'); assert.ok(i > 0); const seg = js.slice(i, i + 7000);
  for (const w of ['?tab=rec', 'Reconcile &amp; bank feed', 'aria-current="page"', "kill('.stl24, .ar72, .bs47s')", "kill('.rt73, .rgf24, .rgx38, .ch71, #rgl, .leg71')", 'm/x71/rec74/', 'Matched to the bank', "MV.je = async", "qs66().get('bank')"]) assert.ok(seg.includes(w), w);
  const d73 = js.slice(js.indexOf('// ===== d73 bank account'), i);
  for (const w of ['Record withdrawal', 'Record deposit', 'Record journal entry', 'Record transfer', '#/je?bank=', '>Withdrawal<', '>Journal<']) assert.ok(d73.includes(w), w);
  assert.ok(!d73.includes('>Record check<')); assert.ok(js.includes("const T73 = rec ? 'Record withdrawal' : 'Write a check';"));
  const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8'); const c = css.slice(css.indexOf('/* ===== d74'), css.includes('/* ===== d76') ? css.indexOf('/* ===== d76') : undefined); // own blocks only (d76 top bar sets box-shadow:none overrides)
  assert.ok(/\.rt73b\{grid-template-columns:repeat\(4,/.test(c)); assert.ok(/\.sg74 \.s\{display:none\}/.test(c)); assert.ok(!/box-shadow/.test(c));
});
