// node --test test/stmt55.test.mjs — d55: owner payouts month board (statuses), Mark as sent, Mark paid from a bank account, repair details on the statement,
// statement edits saved as versions with visible adjustment entries (books not changed silently), and the email Outbox (queued, nothing sent).
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker55.mjs');
const worker = (await import('/tmp/pm-test-worker55.mjs?' + Date.now())).default;
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
let tok = '', oid = 0, pid = 0, bank2 = 0, expJ = 0, co = 0;
const q = s => sq.prepare(s.replace(/\{p\}/g, `c${co}_`));
const cell = async (m) => (await call('m/x55/board', null, 'GET', tok)).json.rows.find(r => r.id === oid).cells[m || M];
const view = async () => (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json;
const tb = async () => { const r = (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals; return [r.debit, r.credit]; };
// a tiny valid JPEG (1x1)
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
test('setup: managed house, owner, rent paid, a repair bill with a work order, a photo and a markup', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'Stmt Tester', company: 'S55 Mgmt', email: 's55@example.com', password: 'S55-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const bk = await call('m/bank-accounts', { institution: 'Test Bank', name: 'Trust', last4: '5555' }, 'POST', tok); assert.equal(bk.status, 200, bk.text);
  const bk2 = await call('m/bank-accounts', { institution: 'Other Bank', name: 'Operating', last4: '7777' }, 'POST', tok); assert.equal(bk2.status, 200, bk2.text);
  const h = await call('m/mgmt/house', { address: '9 Board St', units: 1, who: 'me' }, 'POST', tok); assert.equal(h.status, 200, h.text); pid = h.json.id || 1;
  const m = await call('m/x53/own/' + pid, { mode: 'managed', owner_name: 'Olive Owner' }, 'POST', tok); assert.equal(m.status, 200, m.text); oid = m.json.owner.id;
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '10', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok);
  // d56: owners see one combined repair amount by default; these d55 checks run with "Show markup separately to owner" on (d56 covers the hidden default)
  assert.equal((await call('m/x56/cfg', { show_markup: true, show_receipts: true }, 'POST', tok)).status, 200);
  co = (await call('me', null, 'GET', tok)).json.company_id;
  bank2 = q(`SELECT id FROM {p}bank_accounts WHERE last4='7777'`).get().id;
  q(`UPDATE {p}owners SET email='olive@example.com' WHERE id=?`).run(oid);
  const pr = (await call('m/properties/' + pid, null, 'GET', tok)).json; const uid = pr.units[0].unit_id;
  const tn = await call('m/tenants', { first: 'Rhea', last: 'Renter', email: 'rhea55@example.com', phone: '', unit_id: uid, rent: '2000.00', start: M + '-01', deposit: '0' }, 'POST', tok); assert.equal(tn.status, 200, tn.text);
  const p = await call('m/ledger', { kind: 'payment', lease_id: tn.json.lease_id, amount: '2000.00', date: T, method: 'Check', deposit_to: 'undeposited' }, 'POST', tok); assert.equal(p.status, 200, p.text);
  const v = await call('m/vendors', { name: 'Ace Plumbing' }, 'POST', tok); const vid = v.json.id || q(`SELECT id FROM {p}vendors WHERE name='Ace Plumbing'`).get().id;
  const trust = q(`SELECT id FROM {p}bank_accounts WHERE last4='5555'`).get().id;
  const ex = await call('m/expenses', { amount: '300.00', account_code: '6000', property_id: pid, vendor_id: vid, bank_account_id: trust, memo: 'Kitchen sink leak', date: T }, 'POST', tok); assert.equal(ex.status, 200, ex.text); expJ = ex.json.id;
  const wo = q(`INSERT INTO {p}work_orders(property_id,title,description,status,created) VALUES(?,?,?,?,?)`).run(pid, 'Sink leaking', 'Water under the kitchen sink', 'closed', T); const woId = Number(wo.lastInsertRowid);
  q(`INSERT INTO {p}wo_events(wo_id,author,kind,body,created) VALUES(?,?,?,?,?)`).run(woId, 'Manager', 'note', 'Replaced the trap and supply line', T);
  q(`CREATE TABLE IF NOT EXISTS {p}wo_link31(id INTEGER PRIMARY KEY, wo_id INTEGER, bill_id INTEGER, journal_id INTEGER, created TEXT, by_name TEXT)`).run();
  q(`INSERT INTO {p}wo_link31(wo_id,journal_id,created) VALUES(?,?,?)`).run(woId, expJ, T);
  files['u/test-photo'] = new Uint8Array(JPG);
  q(`INSERT INTO {p}files(key,name,ctype,size,wo_id,kind,created) VALUES(?,?,?,?,?,?,?)`).run('u/test-photo', 'sink.jpg', 'image/jpeg', JPG.length, woId, 'photo', T);
  q(`CREATE TABLE IF NOT EXISTS {p}billpay34(id INTEGER PRIMARY KEY, bill_key TEXT, journal_id INTEGER, amount INTEGER, raised INTEGER DEFAULT 0, how TEXT, by_name TEXT, created TEXT)`).run();
  q(`INSERT INTO {p}billpay34(bill_key,journal_id,amount,created) VALUES(?,?,?,?)`).run('j' + expJ, expJ, 30000, T);
  q(`CREATE TABLE IF NOT EXISTS {p}bmk45(bill_key TEXT PRIMARY KEY, kind TEXT, value REAL, amount INTEGER, base INTEGER, property_id INTEGER, bill_date TEXT, vendor TEXT, note TEXT, by_name TEXT, updated TEXT)`).run();
  q(`INSERT INTO {p}bmk45(bill_key,kind,value,amount,base,property_id,bill_date,vendor,updated) VALUES(?,?,?,?,?,?,?,?,?)`).run('j' + expJ, 'pct', 10, 3000, 30000, pid, T, 'Ace Plumbing', T);
});
test('board: rows = owners, last 12 months current first; a month with activity and nothing made is "Not started"', { skip: !PW }, async () => {
  const b = (await call('m/x55/board', null, 'GET', tok)).json; assert.equal(b.months.length, 12); assert.equal(b.months[0].key, M); assert.ok(b.months[0].current);
  const r = b.rows.find(x => x.id === oid); assert.ok(r, 'owner row'); assert.deepEqual(r.houses, ['9 Board St']);
  assert.equal(r.cells[M].status, 'none'); assert.equal(r.cells[M].activity, true); assert.equal(r.cells[prevM].activity, false, 'no activity last month');
});
test('make statement: version 1, fees posted, repair details (vendor, work order notes, photo, markup) on it', { skip: !PW }, async () => {
  const mk = await call(`m/x55/stmt/${oid}/${M}/make`, {}, 'POST', tok); assert.equal(mk.status, 200, mk.text); assert.equal(mk.json.version, 1); assert.ok(mk.json.file_id);
  const v = mk.json.view; assert.equal(v.stmt.version, 1); assert.equal(v.versions.length, 1); assert.equal(v.versions[0].reason, 'made');
  const lines = v.snap.properties[0].lines; const ex = lines.find(l => l.jid === expJ); assert.ok(ex && ex.repair, 'repair details on the expense line');
  assert.equal(ex.repair.vendor, 'Ace Plumbing'); assert.equal(ex.repair.work_orders[0].title, 'Sink leaking'); assert.match(ex.repair.work_orders[0].notes[0].body, /Replaced the trap/);
  assert.equal(ex.repair.files.length, 1); assert.equal(ex.repair.files[0].name, 'sink.jpg'); assert.equal(ex.repair.markup.amount, 3000);
  assert.ok(lines.some(l => l.kind === 'mgmt_fee' && /Repair markup/.test(l.memo)), 'markup as before (a fee line)');
  assert.ok(lines.some(l => l.kind === 'mgmt_fee' && /Management fee/.test(l.memo)), 'management fee posted');
  assert.equal(v.snap.show_repairs, true, 'repair details on by default');
  assert.equal((await cell()).status, 'ready');
  const f = q(`SELECT * FROM {p}files WHERE id=?`).get(mk.json.file_id); assert.equal(f.category, 'owner_statement'); assert.equal(f.owner_share, 1);
  const pdf = Buffer.from(files[f.key]).toString('latin1'); assert.match(pdf, /Ace Plumbing/); assert.match(pdf, /Work order #/); assert.match(pdf, /DCTDecode/, 'photo thumbnail in the PDF');
});
test('mark as sent (date + how), shown on the board; undo works', { skip: !PW }, async () => {
  assert.equal((await call(`m/x55/stmt/${oid}/${M}/sent`, { date: '2999-01-01', how: 'printed' }, 'POST', tok)).status, 400, 'no future date');
  const r = await call(`m/x55/stmt/${oid}/${M}/sent`, { date: T, how: 'printed', note: 'mailed' }, 'POST', tok); assert.equal(r.status, 200, r.text); assert.equal(r.json.stmt.sent.how, 'printed'); assert.equal(r.json.stmt.sent.date, T);
  let c = await cell(); assert.equal(c.status, 'sent'); assert.equal(c.sent.how_label, 'Printed / mailed');
  await call(`m/x55/stmt/${oid}/${M}/sent`, { undo: true }, 'POST', tok); assert.equal((await cell()).status, 'ready');
  await call(`m/x55/stmt/${oid}/${M}/sent`, { date: T, how: 'email' }, 'POST', tok); assert.equal((await cell()).sent.how, 'email');
});
test('mark paid from a chosen bank account: board shows date, amount, bank name + last 4; statement saved as a new version', { skip: !PW }, async () => {
  const r = await call('m/mgmt/payout', { owner_id: oid, month: M, amount: '1000.00', method: 'ACH', ref: 'ACH 1', date: T, bank_account_id: bank2 }, 'POST', tok); assert.equal(r.status, 200, r.text);
  assert.equal(q(`SELECT bank_account_id FROM {p}owner_payouts WHERE id=?`).get(r.json.id).bank_account_id, bank2);
  const c = await cell(); assert.equal(c.status, 'paid'); assert.equal(c.paid[0].amount, 100000); assert.equal(c.paid[0].bank.last4, '7777'); assert.equal(c.paid[0].bank.name, 'Operating'); assert.equal(c.paid[0].date, T);
  const v = await view(); assert.equal(v.stmt.version, 2); assert.equal(v.versions[0].reason, 'paid'); assert.equal(v.snap.payouts[0].bank.last4, '7777'); assert.equal(v.stmt.changed_after_send, false, 'paying is not a change to the statement');
  const shared = q(`SELECT COUNT(*) n FROM {p}files WHERE category='owner_statement' AND owner_id=? AND owner_share=1`).get(oid).n; assert.equal(shared, 1, 'only the newest version is in the owner portal');
});
test('edit: unlock -> adjust / remove / add lines -> new version, adjustment entries posted, "changed after sending", books still balance', { skip: !PW }, async () => {
  const before = await view(); const close0 = before.live.totals.closing; const jn0 = q(`SELECT COUNT(*) n FROM {p}journal WHERE void=0`).get().n;
  const orig = q(`SELECT amount, void FROM {p}journal WHERE id=?`).get(expJ);
  assert.equal((await call(`m/x55/stmt/${oid}/${M}/edit`, { note: '', changes: [{ type: 'remove', jid: expJ }] }, 'POST', tok)).status, 400, 'a note is required');
  const rentJ = before.snap.properties[0].lines.find(l => l.kind === 'payment').jid;
  assert.equal((await call(`m/x55/stmt/${oid}/${M}/edit`, { note: 'x', changes: [{ type: 'remove', jid: rentJ }] }, 'POST', tok)).status, 400, 'rent payments cannot be changed');
  const e = await call(`m/x55/stmt/${oid}/${M}/edit`, { note: 'Owner agreed on a discount; broker full month', changes: [{ type: 'adjust', jid: expJ, new_amount: '250.00', note: 'plumber discount' }, { type: 'add', dir: 'charge', property_id: pid, amount: '1000.00', note: 'Leasing: broker half month, charged full month' }, { type: 'add', dir: 'credit', property_id: pid, amount: '20.00', note: 'Courtesy credit' }] }, 'POST', tok);
  assert.equal(e.status, 200, e.text); assert.equal(e.json.version, 3); assert.equal(e.json.adjustments, 3);
  const v = e.json.view; assert.equal(v.stmt.changed_after_send, true, 'sent before -> changed after sending'); assert.equal(v.versions[0].reason, 'edited'); assert.match(v.versions[0].note, /discount/); assert.equal(v.versions[0].by_name, 'Stmt Tester');
  assert.equal(v.live.totals.closing, close0 + 5000 - 100000 + 2000, 'closing moves by +50 -1000 +20');
  const adj = q(`SELECT * FROM {p}journal WHERE ref LIKE 'ADJ55-%' AND void=0 ORDER BY id`).all(); assert.equal(adj.length, 3, 'three visible adjustment entries');
  assert.equal(q(`SELECT COUNT(*) n FROM {p}journal WHERE void=0`).get().n, jn0 + 3);
  assert.deepEqual(q(`SELECT amount, void FROM {p}journal WHERE id=?`).get(expJ), orig, 'the original expense is untouched');
  assert.ok(adj.every(a => a.jtype === 'Statement adjustment'));
  const ex = v.snap.properties[0].lines.find(l => l.jid === expJ); assert.equal(ex.changes[0].op, 'credit'); assert.equal(ex.changes[0].amount, 5000);
  assert.equal(v.snap.totals.adj_charge, 100000); assert.equal(v.snap.totals.adj_credit, 7000);
  const [dr, cr] = await tb(); assert.equal(dr, cr, 'trial balance still balances');
  assert.ok((await cell()).changed, 'board flags the change');
  const e2 = await call(`m/x55/stmt/${oid}/${M}/edit`, { note: 'remove the discount line again', changes: [{ type: 'remove', jid: expJ }] }, 'POST', tok); assert.equal(e2.status, 200, e2.text);
  assert.equal(e2.json.view.live.totals.closing, close0 + 30000 - 100000 + 2000, 'removing credits the remaining 250, not the original 300 twice');
  assert.equal((await call(`m/x55/stmt/${oid}/${M}/edit`, { note: 'nothing', changes: [] }, 'POST', tok)).status, 400, 'nothing changed');
  // the report shows adjustments as such
  const rep = (await call(`m/reports/owner-statement?owner_id=${oid}&month=${M}`, null, 'GET', tok)).json; assert.ok(rep.rows.some(r => /Statement adjustment/.test(r.description || '')));
  // marking sent again clears the flag
  await call(`m/x55/stmt/${oid}/${M}/sent`, { date: T, how: 'email' }, 'POST', tok); assert.equal((await view()).stmt.changed_after_send, false);
});
test('repair details can be turned off (new version, no money change)', { skip: !PW }, async () => {
  const n0 = q(`SELECT COUNT(*) n FROM {p}journal`).get().n;
  const r = await call(`m/x55/stmt/${oid}/${M}/repairs`, { on: false }, 'POST', tok); assert.equal(r.status, 200, r.text); assert.equal(r.json.stmt.show_repairs, false); assert.equal(r.json.stmt.changed_after_send, false);
  assert.equal(q(`SELECT COUNT(*) n FROM {p}journal`).get().n, n0);
  await call(`m/x55/stmt/${oid}/${M}/repairs`, { on: true }, 'POST', tok);
});
test('send to owner: email module queues in the Outbox with the PDF; statement "queued"; nothing is sent', { skip: !PW }, async () => {
  const em = (await call('m/x55/email', null, 'GET', tok)).json; assert.equal(em.connected, false); assert.equal(em.status, 'not_connected');
  const r = await call(`m/x55/stmt/${oid}/${M}/send`, {}, 'POST', tok); assert.equal(r.status, 200, r.text); assert.equal(r.json.status, 'queued');
  const ob = (await call('m/x55/outbox', null, 'GET', tok)).json.items; assert.equal(ob.length, 1); assert.equal(ob[0].to, 'olive@example.com'); assert.equal(ob[0].status, 'queued'); assert.ok(ob[0].file_id); assert.match(ob[0].subject, /Owner statement/); assert.match(ob[0].body, /Closing balance/);
  const v = await view(); assert.ok(v.stmt.queued_at); assert.equal(v.outbox.length, 1);
  assert.equal(q(`SELECT COUNT(*) n FROM {p}outbox55 WHERE status='sent'`).get().n, 0, 'nothing sent');
  const s = await call('m/x55/email', { from_name: 'S55 Mgmt', reply_to: 'bad', domain: '' }, 'POST', tok); assert.equal(s.status, 400);
  const s2 = await call('m/x55/email', { from_name: 'S55 Mgmt', reply_to: 'office@s55.com', domain: 's55.com' }, 'POST', tok); assert.equal(s2.status, 200, s2.text); assert.equal(s2.json.connected, false, 'saving a domain does not turn sending on');
  const dsc = await call(`m/x55/outbox/${ob[0].id}/discard`, {}, 'POST', tok); assert.equal(dsc.status, 200); assert.equal((await view()).stmt.queued_at, null);
  // no owner email: asks for one
  q(`UPDATE {p}owners SET email=NULL WHERE id=?`).run(oid); assert.equal((await call(`m/x55/stmt/${oid}/${M}/send`, {}, 'POST', tok)).status, 400);
});
test('statement credits are not part of the % of rent fee base (no fee charged on a credit back to the owner)', { skip: !PW }, async () => {
  assert.ok(q(`SELECT COUNT(*) n FROM {p}journal WHERE kind='other_income' AND ref LIKE 'ADJ55-%' AND void=0`).get().n > 0, 'a credit adjustment exists');
  const v = await view(); assert.equal(v.pay.fees_pending, 0, 'no fee pending on the credit');
});
test('a repair bill paid through Bills (work order bill) is an expense on the managed owner statement and lowers what the owner is due', { skip: !PW }, async () => {
  const sv = async (m) => (await call(`m/x55/stmt/${oid}/${m}`, null, 'GET', tok)).json;
  const b0 = await sv(prevM), c0 = await sv(M);
  const trust = q(`SELECT id FROM {p}bank_accounts WHERE last4='5555'`).get().id;
  const w = await call('m/workorders', { property_id: pid, title: 'Gutter clog', description: 'Gutters overflowing at the back', priority: 'normal' }, 'POST', tok); assert.equal(w.status, 200, w.text);
  const bl = await call('m/x31/bill', { wo_id: w.json.id, amount: '120.00', vendor_name: 'Gutter Pros', bill_date: prevM + '-10', ref: 'G-1', memo: 'Clean gutters', pay: { bank_account_id: trust, date: prevM + '-12', method: 'Check' } }, 'POST', tok); assert.equal(bl.status, 200, bl.text);
  const b1 = await sv(prevM), c1 = await sv(M);
  assert.equal(b1.live.totals.expenses - b0.live.totals.expenses, 12000); assert.equal(b0.live.totals.closing - b1.live.totals.closing, 12000);
  const line = b1.live.properties.flatMap(p => p.lines).find(l => l.jid === bl.json.journal_id); assert.ok(line, 'bill payment line on the statement'); assert.equal(line.amount, -12000); assert.equal(line.repair && line.repair.vendor, 'Gutter Pros'); assert.equal(line.repair.work_orders[0].title, 'Gutter clog');
  assert.equal(c0.live.totals.opening - c1.live.totals.opening, 12000, 'carried into next month opening balance');
});
test('not paid yet / other owners: board counts; management mode off hides the endpoints', { skip: !PW }, async () => {
  const b = (await call('m/x55/board', null, 'GET', tok)).json; assert.equal(b.counts.paid, 1);
  const s = await call('signup', { name: 'Own Only', company: 'S55 Own', email: 's55own@example.com', password: 'S55-own-pass!' }); const t2 = s.json.token; await call('m/onboard', {}, 'POST', t2);
  assert.equal((await call('m/x55/board', null, 'GET', t2)).status, 403, 'no management features without managed houses');
});
