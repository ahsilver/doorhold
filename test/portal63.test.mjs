import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker63.mjs');
const worker = (await import('/tmp/pm-test-worker63.mjs?' + Date.now())).default;
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

let tok = '', otok = '', otok2 = '', oid = 0, oid2 = 0, pid = 0, pid2 = 0, co = 0, depBank = 0, opBank = 0, lid = 0, lid2 = 0, reqId = 0, docId = 0, docId2 = 0, entId = 0;
const q = s => sq.prepare(s.replace(/\{p\}/g, `c${co}_`));
const upload = async (name, type, text, t) => { const fd = new FormData(); fd.append('file', new File([text], name, { type })); fd.append('kind', 'document'); const r = await worker.fetch(new Request('http://x/api/files', { method: 'POST', headers: { 'x-pm-app': '1', authorization: 'Bearer ' + t }, body: fd }), env, { waitUntil: () => {} }); const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j)); return j.id; };
const getFile = async (id, t) => (await worker.fetch(new Request('http://x/api/files/' + id, { headers: { 'x-pm-app': '1', authorization: 'Bearer ' + t } }), env, { waitUntil: () => {} })).status;
const tb = async () => { const r = await call('m/reports/trial-balance', null, 'GET', tok); assert.equal(r.status, 200, r.text); return r.json.totals; };
const acctBal = (code) => q("SELECT COALESCE(SUM(jl.debit-jl.credit),0) v FROM {p}jlines jl JOIN {p}journal j ON j.id=jl.journal_id JOIN {p}gl_accounts a ON a.id=jl.account_id WHERE j.void=0 AND a.code=? AND jl.basis IN ('b','c')").get(code).v;
const nextM = (() => { const [y, m] = M.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; })();
const mEnd = m => { const [y, mm] = m.split('-').map(Number); return new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10); };
test('setup: managed property with an LLC owner, tenant with a $1,500 deposit, owner login', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'P63 Tester', company: 'P63 Mgmt', email: 'p63@example.com', password: 'P63-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token; co = (await call('me', null, 'GET', tok)).json.company_id;
  await call('m/onboard', {}, 'POST', tok);
  const b1 = await call('m/bank-accounts', { institution: 'Test Bank', name: 'Operating', last4: '5555' }, 'POST', tok); opBank = b1.json.id;
  const h = await call('m/mgmt/house', { address: '12 Custody Ave', units: 2, who: 'me' }, 'POST', tok); assert.equal(h.status, 200, h.text); pid = h.json.id;
  const m = await call('m/x53/own/' + pid, { mode: 'managed', owner_name: 'Birch Lane LLC' }, 'POST', tok); assert.equal(m.status, 200, m.text); oid = m.json.owner.id;
  const h2 = await call('m/mgmt/house', { address: '40 Other St', units: 1, who: 'me' }, 'POST', tok); pid2 = h2.json.id;
  const m2 = await call('m/x53/own/' + pid2, { mode: 'managed', owner_name: 'Someone Else LLC' }, 'POST', tok); oid2 = m2.json.owner.id;
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '10', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok);
  const banks = (await call('m/bank-accounts', null, 'GET', tok)).json; const list = Array.isArray(banks) ? banks : (banks.accounts || banks.items || []);
  const db = q("SELECT b.id FROM {p}bank_accounts b JOIN {p}gl_accounts a ON a.id=b.account_id WHERE a.code='1020'").get(); depBank = db ? db.id : 0;
  const pr = await call('m/properties/' + pid, null, 'GET', tok); const uid = pr.json.units[0].unit_id;
  const tn = await call('m/tenants', { first: 'Dana', last: 'Deposit', email: '', phone: '', unit_id: uid, rent: '1800.00', start: prevM + '-01', deposit: '1500.00', deposit_received: true, deposit_date: prevM + '-01' }, 'POST', tok); assert.equal(tn.status, 200, tn.text); lid = tn.json.lease_id;
  const ac = await call('m/x62/access', { owner_id: oid, email: 'birch63@example.com', name: 'Bea Birch' }, 'POST', tok); assert.equal(ac.status, 200, ac.text);
  const lo = await call('login', { email: 'birch63@example.com', password: ac.json.temp_password }); assert.equal(lo.status, 200, lo.text); otok = lo.json.token;
  const ac2 = await call('m/x62/access', { owner_id: oid2, email: 'else63@example.com', name: 'Other Owner' }, 'POST', tok); const lo2 = await call('login', { email: 'else63@example.com', password: ac2.json.temp_password }); otok2 = lo2.json.token;
  const t = await tb(); assert.equal(t.debit, t.credit);
});
test('owner requests: owner sends a question with a PDF, manager sees it as an owner request and replies, owner sees the reply and status', { skip: !PW }, async () => {
  const c = await call('o/x63/cfg', null, 'GET', otok); assert.equal(c.status, 200, c.text); assert.equal(c.json.requests, true);
  const fid = await upload('roof-quote.pdf', 'application/pdf', '%PDF-1.4 test', otok);
  const r = await call('o/x63/requests', { type: 'question', title: 'Roof quote', text: 'Can you check this quote?', property_id: pid, file_ids: [fid] }, 'POST', otok); assert.equal(r.status, 200, r.text); reqId = r.json.id;
  const bad = await call('o/x63/requests', { type: 'request', title: 'Not mine', property_id: pid2 }, 'POST', otok); assert.equal(bad.status, 400, bad.text);
  const l = await call('m/x40/reqs', null, 'GET', tok); const it = l.json.items.find(w => w.id === reqId); assert.ok(it, 'manager list has it'); assert.equal(it.first, 'Owner:'); assert.equal(it.last, 'Birch Lane LLC'); assert.equal(it.owner_request, true);
  const info = await call('m/x63/reqinfo/' + reqId, null, 'GET', tok); assert.equal(info.json.owner_request, true);
  const rep = await call('m/x29/chat/' + reqId, { text: 'Looks fair, approving it.' }, 'POST', tok); assert.equal(rep.status, 200, rep.text);
  const st = await call('m/x40/req/' + reqId + '/status', { status: 'completed', reason: 'done' }, 'POST', tok);
  const dt = await call('o/x63/requests/' + reqId, null, 'GET', otok); assert.equal(dt.status, 200, dt.text);
  assert.ok(dt.json.events.some(e => e.who === 'Management' && /approving/.test(e.body)), JSON.stringify(dt.json.events));
  assert.ok(dt.json.files.some(f => f.id === fid));
  assert.equal(await getFile(fid, otok), 200); assert.notEqual(await getFile(fid, otok2), 200);
  const msg = await call('o/x63/requests/' + reqId, { text: 'Thanks!' }, 'POST', otok); assert.equal(msg.status, 200, msg.text); assert.ok(msg.json.events.some(e => e.mine && e.body === 'Thanks!'));
  const other = await call('o/x63/requests/' + reqId, null, 'GET', otok2); assert.equal(other.status, 404);
  const ls = await call('o/x63/requests', null, 'GET', otok); assert.equal(ls.json.items.length, 1); assert.equal(ls.json.items[0].type, 'question');
  await call('m/x63/cfg', { requests: false }, 'POST', tok); assert.equal((await call('o/x63/requests', null, 'GET', otok)).status, 403); await call('m/x63/cfg', { requests: true }, 'POST', tok);
  const tenantSide = q("SELECT requester_type, owner_id, tenant_id FROM {p}work_orders WHERE id=?").get(reqId); assert.equal(tenantSide.requester_type, 'owner'); assert.equal(tenantSide.owner_id, oid); assert.equal(tenantSide.tenant_id, null);
});
test('documents: shared with the owner or the entity; dated ones follow the published rule; other owners cannot open them', { skip: !PW }, async () => {
  const e = await call('m/entities', { name: 'Birch Lane LLC', type: 'llc_single', state: 'NJ' }, 'POST', tok);
  entId = e.json && (e.json.id || (e.json.entity && e.json.entity.id)); if (!entId) entId = q("SELECT id FROM {p}entities ORDER BY id DESC LIMIT 1").get()?.id;
  if (entId) q("UPDATE {p}properties SET entity_id=? WHERE id=?").run(entId, pid);
  docId = await upload('insurance-2026.pdf', 'application/pdf', '%PDF-1.4 ins', tok); docId2 = await upload('inspection.pdf', 'application/pdf', '%PDF-1.4 insp', tok);
  const s1 = await call('m/x63/docs/share', { file_id: docId, owner_id: oid, category: 'insurance', title: 'Insurance policy 2026', doc_date: '' }, 'POST', tok); assert.equal(s1.status, 200, s1.text);
  const s2 = await call('m/x63/docs/share', { file_id: docId2, entity_id: entId, owner_id: null, category: 'inspection', title: 'Inspection report', doc_date: prevM + '-15' }, 'POST', tok); assert.equal(s2.status, 200, s2.text);
  let d1 = await call('o/x63/docs', null, 'GET', otok); assert.equal(d1.status, 200, d1.text);
  assert.ok(d1.json.docs.some(x => x.id === docId && x.category_label === 'Insurance'), 'undated doc visible');
  assert.ok(!d1.json.docs.some(x => x.id === docId2), 'dated doc hidden until that month is published'); assert.equal(d1.json.hidden_later, 1);
  assert.equal(await getFile(docId2, otok), 404);
  const mk = await call(`m/x55/stmt/${oid}/${prevM}/make`, {}, 'POST', tok); assert.equal(mk.status, 200, mk.text);
  const sent = await call(`m/x55/stmt/${oid}/${prevM}/sent`, { date: T, how: 'portal' }, 'POST', tok); assert.equal(sent.status, 200, sent.text);
  d1 = await call('o/x63/docs', null, 'GET', otok); assert.ok(d1.json.docs.some(x => x.id === docId2 && x.entity === 'Birch Lane LLC'), JSON.stringify(d1.json));
  assert.equal(await getFile(docId2, otok), 200); assert.notEqual(await getFile(docId, otok2), 200);
  const d2 = await call('o/x63/docs', null, 'GET', otok2); assert.equal(d2.json.docs.length, 0);
  const md = await call('m/x63/docs', null, 'GET', tok); assert.equal(md.json.docs.length, 2);
  await call('m/x63/docs/unshare', { file_id: docId }, 'POST', tok); d1 = await call('o/x63/docs', null, 'GET', otok); assert.ok(!d1.json.docs.some(x => x.id === docId)); assert.notEqual(await getFile(docId, otok), 200);
});
test('deposit custody: transfer to owner books Dr 1025 / Cr deposit bank, liability unchanged, report + owner portal, return and undo', { skip: !PW }, async () => {
  const t0 = await tb(); const liab0 = acctBal('2100');
  let st = await call('m/x63/dep/' + lid, null, 'GET', tok); assert.equal(st.status, 200, st.text); assert.equal(st.json.held, 150000); assert.equal(st.json.holder, 'company'); assert.equal(st.json.company_held, 150000);
  const pv = await call('m/x63/dep/' + lid + '/transfer', { date: T, method: 'ACH', bank_account_id: st.json.default_bank }, 'POST', tok); assert.equal(pv.status, 200, pv.text); assert.equal(pv.json.preview, true); assert.equal(pv.json.amount, 150000);
  const tr = await call('m/x63/dep/' + lid + '/transfer', { date: T, method: 'ACH', bank_account_id: st.json.default_bank, confirm: true }, 'POST', tok); assert.equal(tr.status, 200, tr.text);
  assert.equal(tr.json.state.holder, 'owner'); assert.equal(tr.json.state.owner_held, 150000); assert.equal(tr.json.state.company_held, 0); assert.equal(tr.json.state.holder_name, 'Birch Lane LLC');
  assert.equal(acctBal('2100'), liab0, 'deposit liability unchanged'); assert.equal(acctBal('1025'), 150000);
  const t1 = await tb(); assert.equal(t1.debit, t1.credit);
  const rp = await call('m/x63/deposits?holder=owner', null, 'GET', tok); assert.equal(rp.status, 200, rp.text); assert.equal(rp.json.rows.length, 1); assert.equal(rp.json.rows[0].owner_held, 150000); assert.equal(rp.json.totals.owner_held, 150000); assert.equal(rp.json.check.difference, 0);
  // owner portal: the transfer is dated this month; only the previous month is published -> hidden until this month is sent
  let od = await call('o/x63/deposits', null, 'GET', otok); assert.equal(od.status, 200, od.text); assert.equal(od.json.deposits.length, 0);
  await call('m/x62/cfg', { publish_mode: 'realtime' }, 'POST', tok); od = await call('o/x63/deposits', null, 'GET', otok); assert.equal(od.json.deposits.length, 1); assert.equal(od.json.deposits[0].amount, 150000); assert.equal(od.json.deposits[0].tenant, 'Dana D.'); await call('m/x62/cfg', { publish_mode: 'each_sent_month' }, 'POST', tok);
  assert.equal((await call('o/x63/deposits', null, 'GET', otok2)).json.deposits.length, 0);
  const rt = await call('m/x63/dep/' + lid + '/return', { date: T, amount: '500', bank_account_id: st.json.default_bank, confirm: true }, 'POST', tok); assert.equal(rt.status, 200, rt.text); assert.equal(rt.json.state.owner_held, 100000); assert.equal(rt.json.state.holder, 'owner');
  st = await call('m/x63/dep/' + lid, null, 'GET', tok); const last = st.json.history.find(h => !h.void);
  const un = await call('m/x63/dep/' + lid + '/undo', { row_id: last.id, confirm: true }, 'POST', tok); assert.equal(un.status, 200, un.text); assert.equal(un.json.state.owner_held, 150000);
  const orf = await call('m/x63/dep/' + lid + '/owner_refund', { date: T, amount: '1500', confirm: true }, 'POST', tok); assert.equal(orf.status, 200, orf.text); assert.equal(orf.json.state.held, 0); assert.equal(orf.json.state.holder, 'company');
  assert.equal(acctBal('1025'), 0); assert.equal(acctBal('2100'), liab0 + 150000);
  const t2 = await tb(); assert.equal(t2.debit, t2.credit);
  const hb = await call('m/x63/dep/' + lid + '/holder', { holder: 'owner', date: T, confirm: true }, 'POST', tok); assert.equal(hb.status, 200, hb.text); assert.equal(hb.json.state.holder, 'owner');
  const t3 = await tb(); assert.equal(t3.debit, t2.debit, 'recording the holder books nothing');
});
test("last month's rent: collected up front to the liability, applied to the final month's rent, refund path", { skip: !PW }, async () => {
  const pr = await call('m/properties/' + pid, null, 'GET', tok); const uid = pr.json.units[1].unit_id;
  const tn = await call('m/tenants', { first: 'Lou', last: 'Last', email: '', phone: '', unit_id: uid, rent: '2000.00', start: prevM + '-01', end: mEnd(M), deposit: '0', lmr: true, lmr_amount: '2000.00' }, 'POST', tok); assert.equal(tn.status, 200, tn.text); lid2 = tn.json.lease_id;
  let st = await call('m/x63/lmr/' + lid2, null, 'GET', tok); assert.equal(st.status, 200, st.text); assert.equal(st.json.has, true); assert.equal(st.json.record.amount, 200000); assert.equal(st.json.held, 0); assert.equal(st.json.unpaid, 200000); assert.equal(st.json.account, "Prepaid last month's rent");
  assert.ok(q("SELECT id FROM {p}gl_accounts WHERE code='2210' AND type='liability'").get(), '2210 created as a liability');
  // the tenant pays everything except this (final) month's rent: earlier rent + last month's rent
  const before = q("SELECT COALESCE(SUM(amount),0) v FROM {p}journal WHERE void=0 AND lease_id=? AND kind='charge' AND COALESCE(ref,'')<>?").get(lid2, 'RENT-' + M).v;
  const pay = await call('m/ledger', { kind: 'payment', lease_id: lid2, amount: (before / 100).toFixed(2), date: prevM + '-02', method: 'Check', deposit_to: 'undeposited' }, 'POST', tok); assert.equal(pay.status, 200, pay.text);
  st = await call('m/x63/lmr/' + lid2, null, 'GET', tok); assert.equal(st.json.held, 200000, JSON.stringify(st.json)); assert.equal(acctBal('2210'), -200000, 'liability holds it');
  const inc1 = acctBal('4000'); const t0 = await tb();
  // final month = this month: the rent for this month is charged -> automatic apply on the next run
  const ar = await call('auto/run', {}, 'POST', tok); const ar2 = await call('m/auto/run', {}, 'POST', tok);
  st = await call('m/x63/lmr/' + lid2, null, 'GET', tok);
  if (st.json.held > 0) { const ap = await call('m/x63/lmr/' + lid2 + '/apply', { confirm: true }, 'POST', tok); assert.equal(ap.status, 200, ap.text); st = await call('m/x63/lmr/' + lid2, null, 'GET', tok); }
  assert.equal(st.json.held, 0); assert.equal(st.json.record.status, 'applied'); assert.equal(st.json.record.applied_amount, 200000);
  assert.equal(acctBal('2210'), 0, 'liability back to 0'); assert.equal(acctBal('4000') - inc1, -200000, 'rent income +2000 on cash basis');
  const t1 = await tb(); assert.equal(t1.debit, t1.credit);
  const auto = q("SELECT r.status FROM {p}lmr63 r WHERE r.lease_id=?").get(lid2); assert.equal(auto.status, 'applied');
  const un = await call('m/x63/lmr/' + lid2 + '/undo', { step: 'apply', confirm: true }, 'POST', tok); assert.equal(un.status, 200, un.text); assert.equal(un.json.state.held, 200000);
  const ba = await call('m/x63/lmr/' + lid2 + '/refund', { bank_account_id: opBank, method: 'Check', check_no: '1001', date: T, confirm: true }, 'POST', tok); assert.equal(ba.status, 200, ba.text); assert.equal(ba.json.state.held, 0); assert.equal(ba.json.state.record.status, 'refunded'); assert.equal(acctBal('2210'), 0);
  const t2 = await tb(); assert.equal(t2.debit, t2.credit);
  const rp = await call('m/x63/deposits', null, 'GET', tok); assert.equal(rp.status, 200, rp.text);
  // a lease without the option books nothing extra
  const cnt = q("SELECT COUNT(*) n FROM {p}journal WHERE ref LIKE 'LMR%' AND lease_id=?").get(lid).n; assert.equal(cnt, 0);
});
test('late fees: company default stays "owner" (today\'s behaviour), per-owner override to management changes the fee lines only', { skip: !PW }, async () => {
  const mf = await call('m/x53/mgfee', null, 'GET', tok); assert.equal(mf.status, 200, mf.text);
  const def = mf.json.def || mf.json; assert.equal(+(def.late_share_pct || 0), 0);
  // a $75 late fee charged and paid this month on Dana's lease
  const lf = await call('m/ledger', { kind: 'latefee', lease_id: lid, amount: '75.00', date: T, memo: 'Late fee' }, 'POST', tok); assert.equal(lf.status, 200, lf.text);
  const owe = q("SELECT COALESCE(SUM(CASE WHEN kind IN ('charge','latefee','refund') THEN amount ELSE -amount END),0) v FROM {p}journal WHERE void=0 AND lease_id=? AND kind IN ('charge','latefee','credit','payment','refund')").get(lid).v;
  const py = await call('m/ledger', { kind: 'payment', lease_id: lid, amount: (owe / 100).toFixed(2), date: T, method: 'Check', deposit_to: 'undeposited' }, 'POST', tok); assert.equal(py.status, 200, py.text);
  const lfRow = q("SELECT amount, account_id FROM {p}journal WHERE kind='latefee' AND lease_id=?").get(lid); assert.equal(lfRow.amount, 7500);
  await call(`m/x55/stmt/${oid}/${M}/make`, {}, 'POST', tok); const a = (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json;
  const fa = JSON.stringify(a.totals || (a.snap || {}).totals || {});
  // management keeps late fees for this owner
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '10', leasing_type: 'none', late_mode: 'keep' }, 'POST', tok);
  await call(`m/x55/stmt/${oid}/${M}/make`, {}, 'POST', tok); const b = (await call(`m/x55/stmt/${oid}/${M}`, null, 'GET', tok)).json;
  const ta = a.totals || (a.snap || {}).totals || {}, tb2 = b.totals || (b.snap || {}).totals || {};
  console.log('LF', JSON.stringify({ owner: ta, keep: tb2 }));
  assert.equal(ta.late_in, 7500, 'owner: the $75 is cash in'); assert.equal(ta.late_kept || 0, 0); assert.equal(tb2.late_kept, 7500, 'management keeps the $75'); assert.equal(tb2.net, ta.net - 7500, 'owner net is $75 lower');
  assert.equal(lfRow.amount, q("SELECT amount FROM {p}journal WHERE kind='latefee' AND lease_id=?").get(lid).amount, 'late fee row unchanged');
  await call('m/x53/mgfee', { fee_type: 'pct', fee_pct: '10', leasing_type: 'none', late_mode: 'owner' }, 'POST', tok);
});
