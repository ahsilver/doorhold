// node --test test/mk56.test.mjs (d56 bill markup rules) — d55: owner payouts month board (statuses), Mark as sent, Mark paid from a bank account, repair details on the statement,
// precedence (manual > owner vendor > owner type > company vendor > company type > old repair %), % vs flat, cap, vendor default type, flat once per bill, posted months frozen, statement totals with the markup folded (hidden) or shown.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker56.mjs');
const worker = (await import('/tmp/pm-test-worker56.mjs?' + Date.now())).default;
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
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
let tok = '', oid = 0, pid = 0, co = 0, trust = 0; const V = {}; const J = {};
const q = s => sq.prepare(s.replace(/\{p\}/g, `c${co}_`));
const fc = async () => (await call(`m/x56/owner/${oid}?month=${M}`, null, 'GET', tok)).json;
const mk = async () => (await fc()).preview;
const byV = (lines, v) => lines.filter(l => l.basis.includes(v));
const exp = async (vendor, amount, memo, code = '6000') => { const r = await call('m/expenses', { amount, account_code: code, property_id: pid, vendor_id: V[vendor], bank_account_id: trust, memo, date: T }, 'POST', tok); assert.equal(r.status, 200, r.text); return r.json.id; };
test('setup: managed house, owner, rent, vendors', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'Markup Tester', company: 'M56 Mgmt', email: 'm56@example.com', password: 'M56-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  assert.equal((await call('m/bank-accounts', { institution: 'Test Bank', name: 'Trust', last4: '5555' }, 'POST', tok)).status, 200);
  const h = await call('m/mgmt/house', { address: '7 Markup Ave', units: 1, who: 'me' }, 'POST', tok); assert.equal(h.status, 200, h.text); pid = h.json.id || 1;
  // before management: 403
  const off = await call('m/x56/cfg', null, 'GET', tok); assert.equal(off.status, 403);
  const m = await call('m/x53/own/' + pid, { mode: 'managed', owner_name: 'Mona Owner' }, 'POST', tok); assert.equal(m.status, 200, m.text); oid = m.json.owner.id;
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '10', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok);
  co = (await call('me', null, 'GET', tok)).json.company_id; trust = q(`SELECT id FROM {p}bank_accounts WHERE last4='5555'`).get().id;
  const pr = (await call('m/properties/' + pid, null, 'GET', tok)).json; const uid = pr.units[0].unit_id;
  const tn = await call('m/tenants', { first: 'Rita', last: 'Renter', email: 'rita56@example.com', phone: '', unit_id: uid, rent: '3000.00', start: M + '-01', deposit: '0' }, 'POST', tok); assert.equal(tn.status, 200, tn.text);
  assert.equal((await call('m/ledger', { kind: 'payment', lease_id: tn.json.lease_id, amount: '3000.00', date: T, method: 'Check', deposit_to: 'undeposited' }, 'POST', tok)).status, 200);
  for (const n of ['Joe Plumbing', 'Home Depot', 'Ace Supply', 'City Water', 'Bolt Electric', 'Big Contractor']) { const v = await call('m/vendors', { name: n }, 'POST', tok); V[n] = v.json.id || q(`SELECT id FROM {p}vendors WHERE name=?`).get(n).id; }
});
test('no rules anywhere: nothing changes (old repair markup % still works the same way)', { skip: !PW }, async () => {
  J.joe = await exp('Joe Plumbing', '400.00', 'Fix leak under sink');
  let x = await fc(); assert.equal(x.preview.length, 0); assert.equal(x.eff.active, false); assert.equal(x.eff.hidden, true, 'markup hidden from owners by default');
  const r = await call(`m/x56/owner/${oid}`, { markup_pct: '10' }, 'POST', tok); assert.equal(r.status, 200, r.text);
  x = await fc(); assert.equal(x.preview.length, 1); assert.equal(x.preview[0].amount, 4000); assert.match(x.preview[0].basis, /10% markup on 400\.00 of repairs/); assert.equal(x.preview[0].rule.tier, 'legacy');
  await call(`m/x56/owner/${oid}`, { markup_pct: '' }, 'POST', tok);
});
test('vendor default type + per-bill type, company type rules, % vs flat, cap', { skip: !PW }, async () => {
  assert.equal((await call('m/x56/vtype', { vendor_id: V['Joe Plumbing'], type: 'labor' }, 'POST', tok)).json.type, 'labor');
  await call('m/x56/vtype', { vendor_id: V['Home Depot'], type: 'materials' }, 'POST', tok);
  J.hd = await exp('Home Depot', '200.00', 'Paint and rollers');
  J.ace = await exp('Ace Supply', '300.00', 'Faucet parts');
  J.water = await exp('City Water', '100.00', 'Water bill', '6210');
  let b = (await call(`m/x56/bill?key=e${J.ace}`, null, 'GET', tok)).json; assert.equal(b.type, 'other'); assert.equal(b.type_src, 'default');
  b = (await call('m/x56/bill', { key: 'e' + J.ace, type: 'materials' }, 'POST', tok)).json; assert.equal(b.type, 'materials'); assert.equal(b.type_src, 'bill');
  b = (await call(`m/x56/bill?key=e${J.joe}`, null, 'GET', tok)).json; assert.equal(b.type, 'labor'); assert.equal(b.type_src, 'vendor');
  const c = await call('m/x56/cfg', { types: { labor: { mode: 'pct', value: '12' }, materials: { mode: 'amt', value: '7.50' }, other: { mode: 'none' } }, vendors: [{ vendor_id: V['Big Contractor'], mode: 'pct', value: '10', cap: '50' }] }, 'POST', tok); assert.equal(c.status, 200, c.text);
  const L = await mk();
  assert.equal(byV(L, 'Joe Plumbing')[0].amount, 4800); assert.match(byV(L, 'Joe Plumbing')[0].rule.label, /Company default: Labor/);
  assert.equal(byV(L, 'Home Depot')[0].amount, 750, 'flat $7.50 per bill'); assert.equal(byV(L, 'Ace Supply')[0].amount, 750);
  assert.equal(byV(L, 'City Water').length, 0, 'Other: no company rule, no old % -> no markup');
  b = (await call(`m/x56/bill?key=e${J.joe}`, null, 'GET', tok)).json; assert.equal(b.rule.tier, 'co_type'); assert.equal(b.rule.amount, 4800);
  // cap: a bill paid through Bills
  const acct = q(`SELECT id FROM {p}gl_accounts WHERE code='6000'`).get();
  const bl = await call('m/bills', { vendor_id: V['Big Contractor'], property_id: pid, account_code: '6000', amount: '1000.00', bill_date: T, memo: 'Roof patch', ref: 'BC-1' }, 'POST', tok); assert.equal(bl.status, 200, bl.text); J.bc = bl.json.bill_id;
  const pay = await call(`m/bills/${J.bc}/pay`, { bank_account_id: trust, date: T }, 'POST', tok); assert.equal(pay.status, 200, pay.text); J.bcPay = pay.json.id;
  const L2 = await mk(); const bc = byV(L2, 'Big Contractor')[0]; assert.equal(bc.amount, 5000, '10% of 1000 = 100, capped at 50'); assert.match(bc.basis, /capped at 50\.00/); assert.equal(bc.rule.tier, 'co_vendor');
  b = (await call(`m/x56/bill?key=b${J.bc}`, null, 'GET', tok)).json; assert.equal(b.rule.amount, 5000); assert.equal(b.rule.capped, true);
});
test('precedence: owner vendor > owner type > company vendor > company type; manual markup on the bill beats all', { skip: !PW }, async () => {
  // company vendor rule for Joe Plumbing 20% (beats company Labor 12%)
  let s = (await call('m/x56/cfg', null, 'GET', tok)).json.co;
  await call('m/x56/cfg', { ...s, vendors: [...s.vendors.map(v => ({ ...v, value: v.mode === 'amt' ? v.value / 100 : v.value, cap: v.cap ? v.cap / 100 : '' })), { vendor_id: V['Joe Plumbing'], mode: 'pct', value: '20' }], types: { labor: { mode: 'pct', value: '12' }, materials: { mode: 'amt', value: '7.50' }, other: { mode: 'none' } } }, 'POST', tok);
  let L = await mk(); assert.equal(byV(L, 'Joe Plumbing')[0].amount, 8000); assert.equal(byV(L, 'Joe Plumbing')[0].rule.tier, 'co_vendor');
  assert.equal(byV(L, 'Big Contractor')[0].amount, 5000, 'cap kept after re-save');
  // owner override: Labor 15%, Materials 10%, Home Depot 5%
  const r = await call(`m/x56/owner/${oid}`, { markup: { mode: 'custom', types: { labor: { mode: 'pct', value: '15' }, materials: { mode: 'pct', value: '10' }, other: { mode: 'default' } }, vendors: [{ vendor_id: V['Home Depot'], mode: 'pct', value: '5' }] } }, 'POST', tok); assert.equal(r.status, 200, r.text);
  L = r.json.preview;
  assert.equal(byV(L, 'Joe Plumbing')[0].amount, 6000, 'owner Labor 15% beats company vendor 20%'); assert.equal(byV(L, 'Joe Plumbing')[0].rule.tier, 'owner_type');
  assert.equal(byV(L, 'Home Depot')[0].amount, 1000, 'owner vendor 5% beats owner Materials 10%'); assert.equal(byV(L, 'Home Depot')[0].rule.tier, 'owner_vendor');
  assert.equal(byV(L, 'Ace Supply')[0].amount, 3000, 'owner Materials 10% (bill type set on the bill)');
  assert.equal(byV(L, 'Big Contractor')[0].amount, 5000, 'Other: owner says company default -> company vendor rule with cap');
  // manual markup on the Big Contractor bill
  const mm = await call('m/x45/markup', { key: 'b' + J.bc, kind: 'amt', value: '25.00' }, 'POST', tok); assert.equal(mm.status, 200, mm.text);
  L = await mk(); const bcl = L.filter(l => l.rule && l.rule.tier === 'manual'); assert.equal(bcl.length, 1); assert.equal(bcl[0].amount, 2500); assert.equal(byV(L, 'Big Contractor').filter(l => l.rule.tier !== 'manual').length, 0);
  const b = (await call(`m/x56/bill?key=b${J.bc}`, null, 'GET', tok)).json; assert.equal(b.rule.tier, 'manual');
  await call('m/x45/markup', { key: 'b' + J.bc, remove: true }, 'POST', tok);
  // owner back to company default -> company rules again
  const r2 = await call(`m/x56/owner/${oid}`, { markup: { mode: 'default' } }, 'POST', tok); assert.equal(byV(r2.json.preview, 'Joe Plumbing')[0].amount, 8000);
  await call(`m/x56/owner/${oid}`, { markup: { mode: 'custom', types: { labor: { mode: 'pct', value: '15' }, materials: { mode: 'pct', value: '10' }, other: { mode: 'default' } }, vendors: [{ vendor_id: V['Home Depot'], mode: 'amt', value: '12' }] } }, 'POST', tok);
  L = await mk(); assert.equal(byV(L, 'Home Depot')[0].amount, 1200, 'owner vendor flat $12');
});
test('flat markup charged once per bill (a second payment of the same bill next month carries none)', { skip: !PW }, async () => {
  await call(`m/x56/owner/${oid}`, { markup: { mode: 'custom', types: { labor: { mode: 'pct', value: '15' }, materials: { mode: 'pct', value: '10' }, other: { mode: 'default' } }, vendors: [{ vendor_id: V['Home Depot'], mode: 'amt', value: '12' }, { vendor_id: V['Bolt Electric'], mode: 'amt', value: '25' }] } }, 'POST', tok);
  const bl = await call('m/bills', { vendor_id: V['Bolt Electric'], property_id: pid, account_code: '6000', amount: '500.00', bill_date: T, memo: 'Rewire outlet', ref: 'BE-1' }, 'POST', tok); const id = bl.json.bill_id;
  const prevM = (() => { const [y, m] = M.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();
  const p1 = await call(`m/bills/${id}/pay`, { bank_account_id: trust, amount: '200.00', date: prevM + '-28' }, 'POST', tok); assert.equal(p1.status, 200, p1.text);
  const p2 = await call(`m/bills/${id}/pay`, { bank_account_id: trust, date: T }, 'POST', tok); assert.equal(p2.status, 200, p2.text);
  const prev = (await call(`m/x56/owner/${oid}?month=${prevM}`, null, 'GET', tok)).json.preview; assert.equal(byV(prev, 'Bolt Electric')[0].amount, 2500);
  assert.equal(byV(await mk(), 'Bolt Electric').length, 0);
});
let stHidden = null;
test('statement: markup posted, owner sees one amount per repair (cost + markup); totals unchanged; "show separately" brings the lines back', { skip: !PW }, async () => {
  const L = await mk(); const sum = L.reduce((s, l) => s + l.amount, 0); assert.ok(sum > 0);
  const pf = await call('m/mgmt/fees', { owner_id: oid, month: M }, 'POST', tok); assert.equal(pf.status, 200, pf.text);
  const mf = q(`SELECT SUM(amount) a FROM {p}mgmt_fees WHERE owner_id=? AND month=? AND kind='markup' AND void=0`).get(oid, M).a; assert.equal(mf, sum);
  const v = (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json; const sn = v.live; stHidden = sn;
  assert.equal(sn.mk56.hidden, true); assert.equal(sn.mk56.folded, sum);
  const lines = sn.properties.flatMap(p => p.lines);
  assert.ok(!lines.some(l => /markup/i.test(l.memo + ' ' + l.account)), 'no markup word on the owner statement');
  const joe = lines.find(l => l.jid === J.joe); assert.equal(joe.amount, -(40000 + 6000));
  const hd = lines.find(l => l.jid === J.hd); assert.equal(hd.amount, -(20000 + 1200));
  const bc = lines.find(l => l.jid === J.bcPay); assert.equal(bc.amount, -(100000 + 5000));
  const water = lines.find(l => l.jid === J.water); assert.equal(water.amount, -10000);
  // show separately: same closing / net, markup back in fees
  await call(`m/x56/owner/${oid}`, { markup: { ...(await fc()).own, show_markup: 'show' } }, 'POST', tok);
  const v2 = (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json.live;
  assert.equal(v2.totals.closing, sn.totals.closing); assert.equal(v2.totals.net, sn.totals.net);
  assert.equal(v2.totals.fees - sum, sn.totals.fees); assert.equal(v2.totals.expenses + sum, sn.totals.expenses);
  assert.ok(v2.properties.flatMap(p => p.lines).some(l => /Repair markup/.test(l.memo)));
  // report + owner portal fold the same way
  await call(`m/x56/owner/${oid}`, { markup: { ...(await fc()).own, show_markup: 'default' } }, 'POST', tok);
  const rep = (await call(`m/reports/owner-statement?owner_id=${oid}&month=${M}`, null, 'GET', tok)).json;
  assert.ok(!rep.rows.some(r => /Repair markup|markup on|% markup/i.test(r.description || '')), 'report has no markup rows'); assert.equal(rep.totals.amount, sn.totals.closing);
  const rep2 = (await call(`m/reports/owner-statement?owner_id=${oid}&month=${M}`, null, 'GET', tok)).json; assert.equal(rep2.mk56.folded, sum);
});
test('a month with markup already posted keeps its amounts when rules change', { skip: !PW }, async () => {
  const before = (await mk()).reduce((s, l) => s + l.amount, 0);
  await call(`m/x56/owner/${oid}`, { markup: { mode: 'custom', types: { labor: { mode: 'pct', value: '50' }, materials: { mode: 'pct', value: '50' }, other: { mode: 'default' } }, vendors: [] } }, 'POST', tok);
  const x = await fc(); assert.equal(x.mk.frozen, true); assert.equal(x.preview.reduce((s, l) => s + l.amount, 0), before);
  const v = (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json.live; assert.equal(v.totals.closing, stHidden.totals.closing);
});
test('trial balance still balanced; vendor receipts left off owner statements by default', { skip: !PW }, async () => {
  const r = (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals; assert.equal(r.debit, r.credit);
  const cfg = (await call('m/x56/cfg', null, 'GET', tok)).json.co; assert.equal(cfg.show_receipts, false); assert.equal(cfg.show_markup, false);
});

test('owner PDF/statement: receipts attached to the bill are left off by default, work-order photos stay; no markup words in the PDF', { skip: !PW }, async () => {
  files['u/rcpt'] = new Uint8Array(JPG); files['u/wo'] = new Uint8Array(JPG);
  q(`INSERT INTO {p}files(key,name,ctype,size,journal_id,kind,created) VALUES(?,?,?,?,?,?,?)`).run('u/rcpt', 'joe-invoice.jpg', 'image/jpeg', JPG.length, J.joe, 'document', T);
  const wo = Number(q(`INSERT INTO {p}work_orders(property_id,title,description,status,created) VALUES(?,?,?,?,?)`).run(pid, 'Leak', 'Leak under sink', 'closed', T).lastInsertRowid);
  q(`CREATE TABLE IF NOT EXISTS {p}wo_link31(id INTEGER PRIMARY KEY, wo_id INTEGER, bill_id INTEGER, journal_id INTEGER, created TEXT, by_name TEXT)`).run(); q(`INSERT INTO {p}wo_link31(wo_id,journal_id,created) VALUES(?,?,?)`).run(wo, J.joe, T);
  q(`INSERT INTO {p}files(key,name,ctype,size,wo_id,kind,created) VALUES(?,?,?,?,?,?,?)`).run('u/wo', 'after.jpg', 'image/jpeg', JPG.length, wo, 'photo', T);
  const mk = await call(`m/x55/stmt/${oid}/${M}/make`, {}, 'POST', tok); assert.equal(mk.status, 200, mk.text);
  const sn = mk.json.view.snap; const joe = sn.properties.flatMap(p => p.lines).find(l => l.jid === J.joe);
  assert.deepEqual(joe.repair.files.map(f => f.name), ['after.jpg']); assert.equal(sn.mk56.receipts_left_off, 1); assert.equal(joe.repair.markup, undefined);
  const pdf = Buffer.from(files[Object.keys(files).filter(k => k.includes('/d/')).pop()]).toString('latin1'); assert.ok(pdf.startsWith('%PDF')); assert.ok(!/markup/i.test(pdf.replace(/7 Markup Ave/g, '')), 'no markup words in the owner PDF');
  await call('m/x56/cfg', { ...(await call('m/x56/cfg', null, 'GET', tok)).json.co, types: {}, vendors: [], show_receipts: true }, 'POST', tok);
  const v = (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json.live; assert.equal(v.properties.flatMap(p => p.lines).find(l => l.jid === J.joe).repair.files.length, 2);
});
