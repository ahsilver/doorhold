import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker62.mjs');
const worker = (await import('/tmp/pm-test-worker62.mjs?' + Date.now())).default;
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
let tok = '', otok = '', oid = 0, oid2 = 0, pid = 0, co = 0, bank2 = 0, firstFile = 0;
const q = s => sq.prepare(s.replace(/\{p\}/g, `c${co}_`));
const setCfg = (x) => call('m/x62/cfg', x, 'POST', tok);
test('setup: managed property, owner, last month rent + repair + payout, statement made but not sent', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'Portal Tester', company: 'P62 Mgmt', email: 'p62@example.com', password: 'P62-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token; co = (await call('me', null, 'GET', tok)).json.company_id;
  await call('m/onboard', {}, 'POST', tok);
  await call('m/bank-accounts', { institution: 'Test Bank', name: 'Trust', last4: '5555' }, 'POST', tok);
  const bk2 = await call('m/bank-accounts', { institution: 'Other Bank', name: 'Operating', last4: '7777' }, 'POST', tok); bank2 = bk2.json.id;
  const h = await call('m/mgmt/house', { address: '9 Ledger St', units: 1, who: 'me' }, 'POST', tok); assert.equal(h.status, 200, h.text); pid = h.json.id;
  const m = await call('m/x53/own/' + pid, { mode: 'managed', owner_name: 'Olive Owner' }, 'POST', tok); assert.equal(m.status, 200, m.text); oid = m.json.owner.id;
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '10', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok);
  const pr = await call('m/properties/' + pid, null, 'GET', tok); const uid = pr.json.units[0].unit_id;
  const tn = await call('m/tenants', { first: 'Rhea', last: 'Renter', email: 'rhea62@example.com', phone: '', unit_id: uid, rent: '2000.00', start: prevM + '-01', deposit: '0' }, 'POST', tok); assert.equal(tn.status, 200, tn.text);
  const pay = await call('m/ledger', { kind: 'payment', lease_id: tn.json.lease_id, amount: '2000.00', date: prevM + '-05', method: 'Check', deposit_to: 'undeposited' }, 'POST', tok); assert.equal(pay.status, 200, pay.text);
  const v = await call('m/vendors', { name: 'Ace Plumbing' }, 'POST', tok);
  const ex = await call('m/expenses', { amount: '300.00', account_code: '6000', property_id: pid, vendor_id: v.json.id, memo: 'Kitchen sink leak', date: prevM + '-10' }, 'POST', tok); assert.equal(ex.status, 200, ex.text);
  const mk = await call(`m/x55/stmt/${oid}/${prevM}/make`, {}, 'POST', tok); assert.equal(mk.status, 200, mk.text);
  firstFile = q("SELECT v.file_id FROM {p}stmt55v v JOIN {p}stmt55 s ON s.id=v.stmt_id WHERE s.owner_id=? ORDER BY v.version DESC LIMIT 1").get(oid).file_id; assert.ok(firstFile);
  // current month: a partial payment that is NOT on any sent statement
  const pay2 = await call('m/ledger', { kind: 'payment', lease_id: tn.json.lease_id, amount: '500.00', date: T, method: 'Check', deposit_to: 'undeposited' }, 'POST', tok); assert.equal(pay2.status, 200, pay2.text);
});
test('portal login: manager gives access; owner sees nothing before a statement is sent (old routes too)', { skip: !PW }, async () => {
  const a = await call('m/x62/access', { owner_id: oid, email: 'olive62@example.com', name: 'Olive Owner' }, 'POST', tok); assert.equal(a.status, 200, a.text); assert.ok(a.json.temp_password);
  const lg = await call('login', { email: 'olive62@example.com', password: a.json.temp_password }); assert.equal(lg.status, 200, lg.text); otok = lg.json.token;
  const me = await call('o/x62/me', null, 'GET', otok); assert.equal(me.status, 200, me.text); assert.equal(me.json.owners.length, 1); assert.equal(me.json.owners[0].published_through, null);
  const dash = await call('o/x62/dash', null, 'GET', otok); assert.equal(dash.json.empty, true); assert.equal(dash.json.current, null);
  assert.equal((await call('o/statement?month=' + prevM, null, 'GET', otok)).status, 404);
  assert.equal((await call('o/statement?month=' + M, null, 'GET', otok)).status, 404);
  const home = await call('o/home', null, 'GET', otok); assert.equal(home.status, 200, home.text); assert.deepEqual(home.json.mtd, { income: 0, expenses: 0 }); assert.deepEqual(home.json.statements, []);
  assert.equal((await call('files/' + firstFile, null, 'GET', otok)).status, 404, 'unsent statement PDF must not open');
  assert.equal((await call('o/x62/stmt/' + oid + '/' + prevM, null, 'GET', otok)).status, 404);
  assert.equal((await call('o/report/owner-statement?month=' + M, null, 'GET', otok)).status, 404);
});
test('sent month: dashboard boxes, cash ledger with the distribution as Cash out, search, PDF', { skip: !PW }, async () => {
  const po = await call('m/mgmt/payout', { owner_id: oid, month: prevM, amount: '1000.00', method: 'ACH', ref: 'ACH 62', date: prevM + '-28', bank_account_id: bank2 }, 'POST', tok); assert.equal(po.status, 200, po.text);
  const mk = await call(`m/x55/stmt/${oid}/${prevM}/make`, {}, 'POST', tok); assert.equal(mk.status, 200, mk.text);
  const sent = await call(`m/x55/stmt/${oid}/${prevM}/sent`, { date: T, how: 'portal' }, 'POST', tok); assert.equal(sent.status, 200, sent.text);
  const dash = await call('o/x62/dash', null, 'GET', otok); assert.equal(dash.status, 200, dash.text); const b = dash.json.boxes;
  assert.equal(dash.json.month, prevM); assert.equal(dash.json.published_through, prevM);
  assert.equal(b.rent, 200000); assert.equal(b.expenses, 30000); assert.equal(b.distribution, 100000); assert.equal(b.units, 1); assert.equal(b.occupied, 1);
  const st = await call(`o/x62/stmt/${oid}/${prevM}`, null, 'GET', otok); assert.equal(st.status, 200, st.text); const L = st.json.ledger;
  assert.equal(L.closing, st.json.totals.closing, 'ledger closes to the statement closing');
  const dl = L.lines.find(l => l.kind === 'distribution'); assert.ok(dl, 'distribution line'); assert.equal(dl.cout, 100000); assert.match(dl.text, /ACH/);
  assert.equal(L.opening + L.cash_in - L.cash_out, L.closing);
  assert.ok(L.lines.some(l => /Rhea R\./.test(l.text)) && !L.lines.some(l => /Renter/.test(l.text)), 'tenant names follow the setting (first name + initial)');
  const sumP = L.properties.reduce((s, p) => s + p.net, 0) + L.owner_level.net; assert.equal(L.opening + sumP, L.closing, 'opening + properties + owner account = entity closing');
  const sr = await call('o/x62/search?q=300', null, 'GET', otok); assert.equal(sr.status, 200); assert.ok(sr.json.rows.some(r => r.cout === 30000)); assert.ok(sr.json.rows.every(r => r.month === prevM));
  const sr2 = await call(`o/x62/search?from=${M}-01`, null, 'GET', otok); assert.equal(sr2.json.rows.length, 0, 'current month activity is not searchable');
  const pdf = await worker.fetch(new Request(`http://x/api/o/x62/pdf/${oid}/${prevM}`, { headers: { authorization: 'Bearer ' + otok, 'x-pm-app': '1' } }), env, { waitUntil: () => {} }); assert.equal(pdf.status, 200); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  const txt = Buffer.from(await pdf.arrayBuffer()).toString('latin1'); assert.ok(txt.includes('Cash out') && txt.includes('Owner account') && txt.includes('Distribution to owner'), 'PDF uses the ledger layout');
  const sentFile = q("SELECT v.file_id FROM {p}stmt55v v JOIN {p}stmt55 s ON s.id=v.stmt_id AND v.version=s.sent_version WHERE s.owner_id=?").get(oid).file_id;
  assert.equal((await call('files/' + sentFile, null, 'GET', otok)).status, 200); assert.equal((await call('files/' + firstFile, null, 'GET', otok)).status, 404);
  const home = await call('o/home', null, 'GET', otok); assert.deepEqual(home.json.statements.map(s => s.month), [prevM]);
  assert.equal((await call('o/statement?month=' + prevM, null, 'GET', otok)).status, 200);
});
test('mid-month setting: off / rent status only / full preliminary, and the per-owner override', { skip: !PW }, async () => {
  assert.equal((await call('o/x62/current', null, 'GET', otok)).status, 404);
  assert.equal((await setCfg({ current_month_view: 'rent_status' })).status, 200);
  let c = await call('o/x62/current', null, 'GET', otok); assert.equal(c.status, 200, c.text); assert.equal(c.json.preliminary, true); assert.equal(c.json.rent[0].status, 'partial'); assert.equal(c.json.rent[0].tenant, 'Rhea R.'); assert.equal(c.json.ledger, undefined);
  assert.equal((await setCfg({ current_month_view: 'full' })).status, 200);
  c = await call('o/x62/current', null, 'GET', otok); assert.ok(c.json.ledger); assert.equal(c.json.boxes.rent, 50000);
  const d2 = await call('o/x62/dash?month=' + M, null, 'GET', otok); assert.ok(d2.json.current && d2.json.current.preliminary);
  assert.equal((await call(`m/x62/cfg/${oid}`, { current_month_view: 'off' }, 'POST', tok)).status, 200);
  assert.equal((await call('o/x62/current', null, 'GET', otok)).status, 404, 'per-owner override wins');
  await call(`m/x62/cfg/${oid}`, { current_month_view: null }, 'POST', tok); await setCfg({ current_month_view: 'off' });
  assert.equal((await call('o/x62/current', null, 'GET', otok)).status, 404);
});
test('one login, two LLC owner records: switcher lists both, nothing else is reachable', { skip: !PW }, async () => {
  const h = await call('m/mgmt/house', { address: '7 Cedar Ave', units: 1, who: 'me' }, 'POST', tok); const pid2 = h.json.id;
  const m = await call('m/x53/own/' + pid2, { mode: 'managed', owner_name: 'Cedar Point Rentals LLC' }, 'POST', tok); oid2 = m.json.owner.id;
  const h3 = await call('m/mgmt/house', { address: '1 Other Rd', units: 1, who: 'me' }, 'POST', tok); const m3 = await call('m/x53/own/' + h3.json.id, { mode: 'managed', owner_name: 'Someone Else' }, 'POST', tok);
  const a = await call('m/x62/access', { owner_id: oid2, email: 'OLIVE62@example.com' }, 'POST', tok); assert.equal(a.status, 200, a.text); assert.equal(a.json.added_to, 'olive62@example.com');
  const me = await call('o/x62/me', null, 'GET', otok); assert.deepEqual(me.json.owners.map(o => o.owner_id).sort(), [oid, oid2].sort());
  assert.equal((await call('o/x62/dash?owner=' + oid2, null, 'GET', otok)).json.empty, true);
  assert.equal((await call('o/x62/dash?owner=' + m3.json.owner.id, null, 'GET', otok)).status, 403);
  const rm = await call('m/x62/access/remove', { owner_id: oid2, user_id: me.json.owners.length && q("SELECT id FROM users WHERE email='olive62@example.com'").get().id }, 'POST', tok); assert.equal(rm.status, 200, rm.text);
  assert.equal((await call('o/x62/dash?owner=' + oid2, null, 'GET', otok)).status, 403);
  const lst = await call('m/x62/access', null, 'GET', tok); assert.ok(lst.json.owners.find(o => o.id === oid).logins.length === 1);
});
test('defaults and validation', { skip: !PW }, async () => {
  const c = await call('m/x62/cfg', null, 'GET', tok); assert.equal(c.json.cfg.publish_mode, 'each_sent_month'); assert.equal(c.json.cfg.current_month_view, 'off');
  const bad = await setCfg({ current_month_view: 'everything', boxes: ['rent', 'nope'] }); assert.equal(bad.json.cfg.current_month_view, 'off'); assert.deepEqual(bad.json.cfg.boxes, ['rent']);
  assert.equal((await call('m/x62/cfg', null, 'GET', otok)).status, 403);
  const tb = (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals; assert.equal(tb.debit, tb.credit);
});
