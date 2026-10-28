import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker65.mjs');
const worker = (await import('/tmp/pm-test-worker65.mjs?' + Date.now())).default;
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
const tb = async () => (await call('m/reports/trial-balance', null, 'GET', tok)).json.totals;
let BID = 0, P1 = 0, P2 = 0, V = 0, BILL = 0, CHK = 0, ACC = 0;
test('d66 write a check: split lines + a bill, posts to the books, one register line, number goes up', { skip: !PW }, async () => {
  const s = await call('signup', { name: 'C66 Tester', company: 'C66 Demo Mgmt', email: 'c66@example.com', password: 'C66-mgmt-pass!' }); assert.equal(s.status, 200, s.text); tok = s.json.token;
  await call('m/onboard', {}, 'POST', tok);
  const ba = await call('m/bank-accounts', { name: 'Operating', institution: 'Demo Bank', last4: '6601' }, 'POST', tok); assert.equal(ba.status, 200, ba.text);
  const cfg0 = (await call('m/x66/cfg', null, 'GET', tok)).json; BID = cfg0.banks[0].id; assert.equal(cfg0.banks[0].next_no, 1001);
  const p1 = await call('m/properties/external', { name: '12 Oak Street', address: '12 Oak Street', city: 'Trenton', state: 'NJ', zip: '08611' }, 'POST', tok); P1 = p1.json.id;
  const p2 = await call('m/properties/external', { name: '40 Elm Road', address: '40 Elm Road', city: 'Trenton', state: 'NJ', zip: '08611' }, 'POST', tok); P2 = p2.json.id;
  const v = await call('m/vendors', { name: 'Ace Plumbing', ptype66: '1099' }, 'POST', tok); assert.equal(v.status, 200, v.text); V = v.json.id;
  const accts = (await call('m/x66/cfg', null, 'GET', tok)).json.accounts; ACC = (accts.find(a => /repair/i.test(a.name)) || accts.find(a => a.type === 'expense')).id;
  assert.ok(!accts.some(a => a.code === '2000'), 'A/P is not offered on a check line');
  const b = await call('m/bills', { vendor_id: V, property_id: P1, account_id: ACC, amount: '300.00', memo: 'Water heater', ref: 'INV-77' }, 'POST', tok); assert.equal(b.status, 200, b.text); BILL = b.json.bill_id;
  const t0 = await tb();
  const r = await call('m/x66/checks', { bank_account_id: BID, date: T, payee_kind: 'vendor', payee_id: V, address: '1 Main St\nTrenton, NJ 08611', memo: 'Oct work',
    lines: [{ account_id: ACC, property_id: P1, amount: '100.00', memo: 'Valve' }, { account_id: ACC, property_id: P2, amount: '50.25', memo: 'Trap' }], bills: [{ id: BILL, amount: '300.00' }], amount: '450.25' }, 'POST', tok);
  assert.equal(r.status, 200, r.text); CHK = r.json.id; assert.equal(r.json.check_no, '1001'); assert.equal(r.json.amount, 45025); assert.equal(r.json.journal_ids.length, 2);
  const t1 = await tb(); assert.equal(t1.debit, t1.credit, 'trial balance still balances');
  const reg = (await call('m/x24/register/' + BID, null, 'GET', tok)).json; const row = reg.rows.find(x => x.check_id === CHK); assert.ok(row, 'check is in the register'); assert.equal(row.amount, -45025); assert.equal(reg.rows.filter(x => x.check_id === CHK).length, 1, 'one line per check'); assert.equal(row.ref, '1001'); assert.equal(reg.balance, -45025);
  const bl = (await call('m/x66/bills?vendor_id=' + V, null, 'GET', tok)).json.bills; assert.ok(!bl.some(x => x.id === BILL), 'the bill is paid');
  const c = (await call('m/x66/checks/' + CHK, null, 'GET', tok)).json; assert.equal(c.words, 'Four hundred fifty and 25/100'); assert.equal(c.status, 'to_print'); assert.equal(c.lines.length, 2);
  assert.equal((await call('m/x66/cfg', null, 'GET', tok)).json.banks[0].next_no, 1002);
  const dup = await call('m/x66/checks', { bank_account_id: BID, check_no: '1001', payee_kind: 'new', payee_name: 'Someone', lines: [{ account_id: ACC, amount: '5' }] }, 'POST', tok); assert.equal(dup.status, 400); assert.match(dup.json.error, /already used/);
  const bad = await call('m/x66/checks', { bank_account_id: BID, payee_kind: 'new', payee_name: 'X', lines: [{ account_id: ACC, amount: '5' }], amount: '6.00' }, 'POST', tok); assert.equal(bad.status, 400); assert.match(bad.json.error, /add up/);
  const w = (await call('m/x66/words?amount=1234.56', null, 'GET', tok)).json.words; assert.equal(w, 'One thousand two hundred thirty-four and 56/100');
  assert.equal((await call('m/x66/words?amount=1000000', null, 'GET', tok)).json.words, 'One million and 00/100');
});
test('d66 void a check: entries void, bill reopens, number stays used, register shows a void line', { skip: !PW }, async () => {
  const before = await tb();
  const r = await call(`m/x66/checks/${CHK}/void`, { reason: 'Wrong amount' }, 'POST', tok); assert.equal(r.status, 200, r.text);
  const c = (await call('m/x66/checks/' + CHK, null, 'GET', tok)).json; assert.equal(c.status, 'void');
  const after = await tb(); assert.equal(after.debit, after.credit); assert.ok(after.debit < before.debit, 'the check is out of the books');
  const bl = (await call('m/x66/bills?vendor_id=' + V, null, 'GET', tok)).json.bills; const b = bl.find(x => x.id === BILL); assert.ok(b, 'bill is open again'); assert.equal(b.balance, 30000);
  const reg = (await call('m/x24/register/' + BID, null, 'GET', tok)).json; assert.equal(reg.balance, 0); const vr = reg.rows.find(x => x.check_id === CHK); assert.ok(vr && vr.void && vr.amount === 0 && vr.ref === '1001');
  const again = await call('m/x66/checks', { bank_account_id: BID, check_no: '1001', payee_kind: 'new', payee_name: 'Someone', lines: [{ account_id: ACC, amount: '5' }] }, 'POST', tok); assert.equal(again.status, 400, 'a voided number is still used');
  const twice = await call(`m/x66/checks/${CHK}/void`, {}, 'POST', tok); assert.equal(twice.status, 400);
});
test('d66 print: voucher + 3 per page PDFs, queue marked printed, reprint, alignment test, MICR only on blank stock', { skip: !PW }, async () => {
  const ids = [];
  for (const a of ['10.00', '20.00', '30.00']) { const r = await call('m/x66/checks', { bank_account_id: BID, payee_kind: 'new', payee_name: 'Pat Payee ' + a, lines: [{ account_id: ACC, property_id: P1, amount: a }] }, 'POST', tok); assert.equal(r.status, 200, r.text); ids.push(r.json.id); }
  const list = (await call('m/x66/checks?status=print', null, 'GET', tok)).json; assert.equal(list.checks.length, 3); assert.equal(list.counts.to_print, 3);
  const pdf = async (p, body) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-pm-app': '1', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const u = new Uint8Array(await r.arrayBuffer()); return { status: r.status, type: r.headers.get('content-type'), txt: new TextDecoder('latin1').decode(u) }; };
  const pages = s => (s.match(/\/Type \/Page /g) || []).length;
  const v = await pdf('m/x66/print', { ids, layout: 'voucher' }); assert.equal(v.status, 200); assert.equal(v.type, 'application/pdf'); assert.equal(pages(v.txt), 3); assert.match(v.txt, /Ten and 00\/100/); assert.match(v.txt, /Payee copy/); assert.ok(!/FontFile2/.test(v.txt), 'pre-printed stock: no MICR');
  const s3 = await pdf('m/x66/print', { ids, layout: 'standard' }); assert.equal(pages(s3.txt), 1, '3 checks on one sheet');
  const s3b = await pdf('m/x66/print', { ids, layout: 'standard', start_pos: 3 }); assert.equal(pages(s3b.txt), 2, 'starting at position 3 uses a second sheet');
  const m = await call('m/x66/printed', { ids }, 'POST', tok); assert.equal(m.json.printed, 3);
  assert.equal((await call('m/x66/checks?status=print', null, 'GET', tok)).json.checks.length, 0);
  const re = await pdf(`m/x66/checks/${ids[0]}/pdf?layout=voucher`); assert.equal(re.status, 200); assert.match(re.txt, /Pat Payee 10\.00/);
  const al = await pdf('m/x66/test-pdf?layout=standard'); assert.match(al.txt, /ALIGNMENT TEST/); assert.equal(pages(al.txt), 1);
  const off = await call('m/x66/cfg', { off: { voucher: { x: 0.05, y: -0.1 }, standard: { x: 0, y: 0 } } }, 'POST', tok); assert.equal(off.status, 200, off.text); assert.equal(off.json.cfg.off.voucher.y, -0.1);
  const big = await call('m/x66/cfg', { off: { voucher: { x: 3, y: 0 }, standard: { x: 0, y: 0 } } }, 'POST', tok); assert.equal(big.status, 400, 'an offset over 1 inch is refused');
  const br = await call('m/x66/bank/' + BID, { routing: '123456789', account_no: '000123456789', bank_name: 'Demo Bank', next_no: '' }, 'POST', tok); assert.equal(br.status, 400, 'bad routing number rejected');
  const ok = await call('m/x66/bank/' + BID, { routing: '021000021', account_no: '000123456789', bank_name: 'Demo Bank', bank_addr: '1 Bank Plaza\nNew York, NY 10001', fractional: '1-2/210' }, 'POST', tok); assert.equal(ok.status, 200, ok.text); assert.equal(ok.json.acct_masked, '••••6789'); assert.ok(!JSON.stringify(ok.json).includes('123456789'), 'account number never comes back');
  await call('m/x66/cfg', { stock: 'blank', off: { voucher: { x: 0, y: 0 }, standard: { x: 0, y: 0 } } }, 'POST', tok);
  const nof = await pdf(`m/x66/checks/${ids[0]}/pdf?layout=voucher`); assert.match(nof.txt, /PAY TO THE/); assert.ok(!/FontFile2/.test(nof.txt), 'blank stock without a MICR font: no MICR line');
  const fp = '/tmp/micr66/GnuMICR.ttf';
  if (fs.existsSync(fp)) { const up = await call('m/x66/micr-font', { name: 'Test MICR', b64: fs.readFileSync(fp).toString('base64') }, 'POST', tok); assert.equal(up.status, 200, up.text);
    const mi = await pdf(`m/x66/checks/${ids[0]}/pdf?layout=voucher`); assert.match(mi.txt, /FontFile2/); assert.match(mi.txt, /\/F3 12 Tf/); assert.match(mi.txt, /\(A\) Tj/);
    const junk = await call('m/x66/micr-font', { name: 'x', b64: Buffer.from('hello world, not a font').toString('base64') }, 'POST', tok); assert.equal(junk.status, 400); }
  await call('m/x66/cfg', { stock: 'preprinted' }, 'POST', tok);
});
test('d66 payee type W-2 / 1099, employees with masked SSN, a check to an employee', { skip: !PW }, async () => {
  const v = await call('m/vendors', { name: 'Maria Lopez', ptype66: 'w2' }, 'POST', tok); assert.equal(v.status, 200);
  const x = (await call('m/x46/vendor/' + v.json.id, null, 'GET', tok)).json; assert.equal(x.ptype66, 'w2'); assert.equal(!!x.v1099, false, 'an employee gets no 1099');
  assert.equal((await call('m/x46/vendor/' + V, null, 'GET', tok)).json.ptype66, '1099');
  const bad = await call('m/x66/employees', { first: 'Al', last: 'B', work_state: 'XX' }, 'POST', tok); assert.equal(bad.status, 400);
  const e = await call('m/x66/employees', { first: 'Sam', last: 'Rivera', addr1: '9 Pine St', city: 'Newark', state: 'NJ', zip: '07102', ssn: '123-45-6789', pay_type: 'hourly', rate: '22.50', pay_freq: 'weekly', work_state: 'NJ', res_state: 'NY', filing_status: 'married', multi_jobs: true, dependents: '2000', extra_wh: '15', state_allow: '2' }, 'POST', tok);
  assert.equal(e.status, 200, e.text); assert.equal(e.json.ssn_masked, '•••-••-6789'); assert.ok(!JSON.stringify(e.json).includes('123456789') && !JSON.stringify(e.json).includes('45-6789'), 'SSN never comes back'); assert.equal(e.json.rate, 2250); assert.equal(e.json.multi_jobs, 1);
  const list = (await call('m/x66/employees', null, 'GET', tok)).json.employees; assert.equal(list.length, 2); assert.ok(list.some(x => x.name === 'Maria Lopez'), 'the W-2 vendor got an employee record');
  const pay = (await call('m/x66/cfg', null, 'GET', tok)).json.payees; assert.ok(pay.some(p => p.kind === 'employee' && p.name === 'Sam Rivera' && /Newark, NJ 07102/.test(p.address)));
  const c = await call('m/x66/checks', { bank_account_id: BID, payee_kind: 'employee', payee_id: e.json.id, lines: [{ account_id: ACC, amount: '450.00' }], to_print: false }, 'POST', tok); assert.equal(c.status, 200, c.text);
  const d = (await call('m/x66/checks/' + c.json.id, null, 'GET', tok)).json; assert.equal(d.payee_name, 'Sam Rivera'); assert.equal(d.status, 'written');
  const t = await tb(); assert.equal(t.debit, t.credit);
});

test('d66 split lines on a new bill and a recorded expense: total on top, lines must add up, each line posts to its property', { skip: !PW }, async () => {
  const bad = await call('m/bills', { vendor_id: V, amount: '600', bill_date: T, due: T, frequency: 'once', lines: [{ account_id: ACC, property_id: P1, amount: '350' }, { account_id: ACC, property_id: P2, amount: '200' }] }, 'POST', tok);
  assert.equal(bad.status, 400); assert.match(bad.json.error, /Left to split: \$50\.00/);
  const b = await call('m/bills', { vendor_id: V, amount: '600', bill_date: T, due: T, frequency: 'once', memo: 'Plumber, two addresses', lines: [{ account_id: ACC, property_id: P1, amount: '350', memo: 'Main line' }, { account_id: ACC, property_id: P2, amount: '250' }] }, 'POST', tok);
  assert.equal(b.status, 200, b.text);
  const tn = n => { const r = sq.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x => x.name).filter(x => x === n || new RegExp('^c\\d+_' + n + '$').test(x)); return r.find(x => x !== n) || r[0]; };
  const row = sq.prepare(`SELECT * FROM ${tn('bills')} WHERE memo='Plumber, two addresses'`).get(); assert.equal(row.amount, 60000); assert.equal(row.property_id, null);
  const jl = sq.prepare(`SELECT account_id, property_id, debit, credit FROM ${tn('jlines')} WHERE journal_id=? ORDER BY id`).all(row.accrual_journal_id);
  assert.deepEqual(jl.filter(l => l.debit).map(l => [l.property_id, l.debit]), [[P1, 35000], [P2, 25000]]);
  assert.equal(jl.filter(l => l.credit).reduce((s, l) => s + l.credit, 0), 60000);
  // pay the split bill by check: the expense stays split per property on the cash books
  const c = await call('m/x66/checks', { bank_account_id: BID, payee_kind: 'vendor', payee_id: V, bills: [{ id: row.id, amount: '600' }], amount: '600', to_print: false }, 'POST', tok); assert.equal(c.status, 200, c.text);
  const over = await call('m/x24/expense', { paid_by: 'ach', bank_account_id: BID, vendor_id: V, amount: '90.50', date: T, account_id: ACC, lines: [{ account_id: ACC, property_id: P1, amount: '60.50' }, { account_id: ACC, property_id: P2, amount: '40' }] }, 'POST', tok);
  assert.equal(over.status, 400); assert.match(over.json.error, /\$10\.00 more than the total/);
  const e = await call('m/x24/expense', { paid_by: 'ach', bank_account_id: BID, vendor_id: V, amount: '90.50', date: T, account_id: ACC, memo: 'Parts', lines: [{ account_id: ACC, property_id: P1, amount: '60.50' }, { account_id: ACC, property_id: P2, amount: '30' }] }, 'POST', tok);
  assert.equal(e.status, 200, e.text);
  const el = sq.prepare(`SELECT property_id, debit, credit FROM ${tn('jlines')} WHERE journal_id=? ORDER BY id`).all(e.json.id);
  assert.deepEqual(el.filter(l => l.debit).map(l => [l.property_id, l.debit]), [[P1, 6050], [P2, 3000]]); assert.equal(el.filter(l => l.credit).reduce((s, l) => s + l.credit, 0), 9050);
  // a vendor set to Employee (W-2) gets an employee record linked to it (and is listed once as a payee)
  const w = await call('m/vendors', { name: 'Rosa Diaz', ptype66: 'w2' }, 'POST', tok); assert.equal(w.status, 200, w.text);
  const emps = (await call('m/x66/employees', null, 'GET', tok)).json.employees; assert.ok(emps.some(x => x.name === 'Rosa Diaz'));
  const pay = (await call('m/x66/cfg', null, 'GET', tok)).json.payees; assert.equal(pay.filter(p => p.name === 'Rosa Diaz').length, 1);
  const t = await tb(); assert.equal(t.debit, t.credit);
});
