// d77: online rent payments end to end (simulator = Stripe test mode behaviour): receipt in transit, payout grouping, automatic ACH return reversal + NSF fee,
// idempotent webhook replay (signed Stripe event), ACH block after N returns, and the bank-file import dedupe the return debit is reconciled against.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker77.mjs');
const worker = (await import('/tmp/pm-test-worker77.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-12-02' };
const call = async (p, body, tok, method) => { const r = await worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j }; };
const L = fs.readFileSync('demo-logins.local.txt', 'utf8'); const pw = e => (L.match(new RegExp(e.replace('.', '\\.') + '\\s+password:\\s*(\\S+)')) || [])[1];
const login = async (e, p) => (await call('login', { email: e, password: p || pw(e) })).json.token;
const pub = async (p, body, hdrs = {}, method) => { const r = await worker.fetch(new Request('http://x/api/pub/x69/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...hdrs }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil: () => {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, json: j, text: t, headers: r.headers }; };
const page = async (p) => { const r = await worker.fetch(new Request('http://x' + p), env, { waitUntil: () => {} }); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') }; };
const tb = async (M) => { const t = (await call('m/reports/trial-balance', null, M)).json.totals; return [t.debit, t.credit]; };

const q = (sql, ...a) => sq.prepare(sql).all(...a); const q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const realFetch = globalThis.fetch; globalThis.fetch = async (u, o) => String(u).startsWith('https://api.stripe.com/v1/account') ? new Response(JSON.stringify({ id: 'acct_test77', business_profile: { name: 'Test Co' } }), { headers: { 'content-type': 'application/json' } }) : realFetch(u, o);
const ofx = (rows) => `OFXHEADER:100\nDATA:OFXSGML\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>${rows.map(([id, date, amt, name]) => `<STMTTRN><TRNTYPE>${amt > 0 ? 'CREDIT' : 'DEBIT'}<DTPOSTED>${date.replace(/-/g, '')}<TRNAMT>${(amt / 100).toFixed(2)}<FITID>${id}<NAME>${name}</STMTTRN>`).join('\n')}</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const transit = () => q1(`SELECT COALESCE(SUM(jl.debit-jl.credit),0) s FROM jlines jl JOIN journal j ON j.id=jl.journal_id WHERE j.void=0 AND jl.account_id=(SELECT CAST(v AS INTEGER) FROM settings WHERE k='x77gl') AND jl.basis IN ('a','b')`).s;
let M, TT, op1, op2, op3;
const bal = async () => (await call('t/x77/pay', null, TT)).json.balance;
test('bank file import: same OFX twice and same CSV rows twice add nothing the second time', async () => {
  M = await login('manager@example.com');
  const f = ofx([['FIT-A1', '2026-11-20', 12345, 'ACME DEPOSIT'], ['FIT-A2', '2026-11-21', -6789, 'HARDWARE STORE']]);
  const a = (await call('m/bank/1/import', { text: f, filename: 'nov.ofx' }, M)).json; assert.equal(a.added, 2);
  const b = (await call('m/bank/1/import', { text: f, filename: 'nov-again.qfx' }, M)).json; assert.equal(b.added, 0); assert.equal(b.duplicates, 2);
  const rows = [{ date: '2026-11-22', amount: 4321, description: 'CSV LINE ONE' }, { date: '2026-11-23', amount: -1200, description: 'CSV LINE TWO' }];
  const c = (await call('m/x51/bank/1/rows', { rows, format: 'CSV', filename: 'a.csv' }, M)).json; assert.equal(c.added, 2);
  const d = (await call('m/x51/bank/1/rows', { rows, format: 'CSV', filename: 'a.csv' }, M)).json; assert.equal(d.added, 0);
});
test('tenant pays rent online (simulator): receipt on the ledger at once, money in transit, books balance, fees shown', async () => {
  assert.equal((await call('m/x69/cfg', { pay: { mode: 'test' } }, M)).status, 200);
  TT = await login('tenant@example.com'); const info = (await call('t/x77/pay', null, TT)).json; assert.equal(info.on, true); assert.equal(info.test, true); assert.equal(info.fees.card_by, 'tenant'); assert.equal(info.fees.ach_by, 'company');
  const b0 = info.balance; const [d0, c0] = await tb(M); assert.equal(d0, c0);
  const r = (await call('t/x77/pay', { method: 'card', amount: '100.00', card: { number: '4242 4242 4242 4242', exp: '12/29', cvc: '123' } }, TT)).json; assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.status, 'succeeded');
  assert.equal(r.fee, 290, 'd80: card surcharge capped at min(3%, configured 2.9%)'); assert.equal(r.total, 10290); assert.equal(await bal(), b0 - 10000);
  op1 = q1('SELECT * FROM op77 WHERE ext=?', r.ref); assert.equal(op1.status, 'succeeded'); assert.equal(op1.charged, 10290); assert.equal(op1.payout_id, null);
  assert.equal(transit(), 10290, 'in transit, not in the bank yet');
  assert.equal(q1('SELECT bank_amount FROM journal WHERE id=?', op1.jid).bank_amount, null, 'the bank register has nothing until the payout');
  const a = (await call('t/x77/pay', { method: 'ach', amount: '250', bank: { routing: '110000000', account: '000123456789' } }, TT)).json; assert.equal(a.status, 'processing'); assert.equal(a.fee, 0, 'ACH fee absorbed by the company by default');
  op2 = q1('SELECT * FROM op77 WHERE ext=?', a.ref); assert.equal(op2.proc_fee, 200, 'Stripe ACH 0.8%');
  const [d1, c1] = await tb(M); assert.equal(d1, c1);
});
test('payout grouping: settled payments arrive as ONE bank deposit with its breakdown, and the bank line matches it', async () => {
  env.PM_TODAY = '2026-12-09'; const r = (await call('m/x77/sim/run', {}, M)).json; assert.ok(r.settled >= 1, JSON.stringify(r)); assert.equal(r.payouts, 1);
  const po = q1('SELECT * FROM po77 ORDER BY id DESC LIMIT 1'); assert.equal(po.n, 2); assert.equal(po.gross, 10290 + 25000); assert.equal(po.net, 10290 + 25000 - (Math.round(10290 * 0.029) + 30) - 200);
  const j = q1('SELECT * FROM journal WHERE id=?', po.jid); assert.equal(j.bank_amount, po.net); assert.equal(j.bank_account_id, op1.bank_id);
  const bd = (await call('m/x77/payout/' + po.id, null, M)).json; assert.equal(bd.items.length, 2);
  const imp = (await call(`m/bank/${op1.bank_id}/import`, { text: ofx([['FIT-PO1', '2026-12-09', po.net, 'STRIPE TRANSFER']]), filename: 'dec.ofx' }, M)).json; assert.equal(imp.added, 1); assert.equal(imp.matched, 1, JSON.stringify(imp));
  assert.equal(q1(`SELECT journal_id FROM bank_txns WHERE fitid='FIT-PO1'`).journal_id, po.jid, 'the lump is matched to the payout entry');
  assert.equal(transit(), 0); const [d, c] = await tb(M); assert.equal(d, c);
});
test('ACH return after payout: automatic reversal on the ledger, NSF fee, bank debit that reconciles, manager told, books balance', async () => {
  const b0 = await bal(); const tasks0 = q1(`SELECT COUNT(*) n FROM tasks`).n;
  const a = (await call('t/x77/pay', { method: 'ach', amount: '500', bank: { routing: '110000000', account: '000222222227' } }, TT)).json; assert.equal(a.status, 'processing');
  assert.equal(await bal(), b0 - 50000, 'the receipt posts right away');
  env.PM_TODAY = '2026-12-16'; const r = (await call('m/x77/sim/run', {}, M)).json; assert.equal(r.returned, 1, JSON.stringify(r));
  op3 = q1('SELECT * FROM op77 WHERE ext=?', a.ref); assert.equal(op3.status, 'returned'); assert.equal(op3.ret_code, 'R01'); assert.ok(op3.payout_id && op3.ret_payout_id);
  const rev = q1('SELECT * FROM journal WHERE id=?', op3.ret_jid); assert.match(rev.memo, /Returned payment - R01 Insufficient funds/); assert.equal(rev.kind, 'refund'); assert.equal(rev.amount, 50000);
  const nsf = q1('SELECT * FROM journal WHERE id=?', op3.nsf_jid); assert.equal(nsf.kind, 'charge'); assert.equal(nsf.amount, 3500);
  assert.equal(await bal(), b0 + 3500, 'payment reversed and NSF fee charged');
  const deb = q1('SELECT * FROM po77 WHERE id=?', op3.ret_payout_id); assert.equal(deb.net, -(50000 + 400)); const dj = q1('SELECT * FROM journal WHERE id=?', deb.jid); assert.equal(dj.bank_amount, -50400); assert.match(dj.memo, /Returned payment R01/);
  const imp = (await call(`m/bank/${op3.bank_id}/import`, { text: ofx([['FIT-RET1', '2026-12-16', -50400, 'STRIPE DEBIT ACH RETURN']]), filename: 'dec2.ofx' }, M)).json; assert.equal(imp.matched, 1, JSON.stringify(imp));
  assert.equal(q1(`SELECT journal_id FROM bank_txns WHERE fitid='FIT-RET1'`).journal_id, deb.jid, "the bank's debit is matched to the reversal");
  assert.equal(q1(`SELECT COUNT(*) n FROM tasks`).n, tasks0 + 1); assert.equal(q1(`SELECT COUNT(*) n FROM nt77 WHERE op_id=?`, op3.id).n, 3);
  const [d, c] = await tb(M); assert.equal(d, c); assert.equal(transit(), 0, 'nothing left in transit');
  // cash basis: the next payment is rent income again, not a prepayment
  const p = (await call('t/x77/pay', { method: 'card', amount: '35', card: { number: '4242424242424242', exp: '12/29', cvc: '123' } }, TT)).json; const pj = q1('SELECT jid FROM op77 WHERE ext=?', p.ref).jid;
  const pre = q1(`SELECT id FROM gl_accounts WHERE code='2200'`).id; assert.ok(!q('SELECT account_id FROM jlines WHERE journal_id=? AND basis=? AND credit>0', pj, 'c').some(l => l.account_id === pre), 'not booked as a prepayment');
});
test('idempotent webhook replay: a signed Stripe event applied once; replays and bad signatures change nothing; ACH blocked after 2 returns', async () => {
  const sec = 'whsec_test77abcdef'; const s = await call('m/x69/cfg', { stripe: { sk: 'sk_test_' + 'a'.repeat(24), pk: 'pk_test_' + 'b'.repeat(24), whsec: sec } }, M); assert.equal(s.status, 200, JSON.stringify(s.json));
  const a = (await call('t/x77/pay', { method: 'ach', amount: '120', bank: { routing: '110000000', account: '000123456789' } }, TT)).json; const b0 = await bal();
  const ev = JSON.stringify({ id: 'evt_test_77fail', type: 'charge.failed', created: 1765000000, data: { object: { id: 'ch_1', payment_intent: a.ref, failure_code: 'account_closed', failure_message: 'closed' } } });
  const sign = (body) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${crypto.createHmac('sha256', sec).update(t + '.' + body).digest('hex')}`; };
  const send = (body, sig) => worker.fetch(new Request('http://x/api/pub/x69/stripe/hook?co=1', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body }), env, { waitUntil: () => {} });
  assert.equal((await send(ev, 't=1,v1=bad')).status, 400, 'bad signature');
  const r1 = await send(ev, sign(ev)); assert.equal(r1.status, 200, await r1.clone().text()); const n1 = q1(`SELECT COUNT(*) n FROM journal WHERE ref LIKE ? AND void=0`, a.ref + '%').n;
  const r2 = await send(ev, sign(ev)); assert.equal(r2.status, 200); assert.equal((await r2.json()).duplicate, true);
  assert.equal(q1(`SELECT COUNT(*) n FROM journal WHERE ref LIKE ? AND void=0`, a.ref + '%').n, n1, 'replay posted nothing');
  const o = q1('SELECT * FROM op77 WHERE ext=?', a.ref); assert.equal(o.status, 'failed'); assert.equal(o.ret_code, 'R02');
  assert.equal(await bal(), b0 + 12000 + 3500, 'reversed once + one NSF fee');
  assert.equal(q1(`SELECT COUNT(*) n FROM journal WHERE ref=? AND void=0`, a.ref + '-RET').n, 1);
  const again = (await call('m/x77/sim/replay', { op_id: o.id }, M)).json; assert.ok(again.already || again.duplicate, JSON.stringify(again));
  const blk = await call('t/x77/pay', { method: 'ach', amount: '50', bank: { routing: '110000000', account: '000123456789' } }, TT); assert.equal(blk.status, 403, 'second return -> bank payments off');
  assert.equal((await call('t/x77/pay', null, TT)).json.ach_blocked, true);
  assert.equal((await call('m/x77/unblock/' + o.tenant_id, {}, M)).status, 200); assert.equal((await call('t/x77/pay', null, TT)).json.ach_blocked, false);
  const [d, c] = await tb(M); assert.equal(d, c);
});
test('settings: NSF fee, block after N, deposit bank are per company and validated', async () => {
  const r = await call('m/x77/cfg', { nsf_fee: '25', block_after: 3, nsf_on: false, deposit_bank: 1 }, M); assert.equal(r.status, 200); assert.equal(r.json.cfg.nsf_fee, 2500); assert.equal(r.json.cfg.nsf_on, false);
  assert.equal((await call('m/x77/cfg', { block_after: 0 }, M)).status, 400); assert.equal((await call('m/x77/cfg', { nsf_account: 1 }, M)).status, 400, 'NSF fee must go to an income account');
  const ov = (await call('m/x77/overview', null, M)).json; assert.equal(ov.mode, 'test'); assert.ok(ov.provider.hook.includes('/api/pub/x69/stripe/hook?co=1')); assert.ok(ov.payouts.length >= 2);
});

test('client: d77 block (payments, payouts, tenant Pay rent, register headers, Import bank file) and its CSS follow the product style', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
  const b = js.slice(js.indexOf('// ===== d77')); assert.ok(b.length > 1000);
  for (const s of ["api('t/x77/pay'", "m/x77/overview", "m/x77/sim/return", "Import bank file", "'Status'", "'Balance'", 'payout77Sheet', 'When a bank payment bounces']) assert.ok(b.includes(s), s);
  const c = css.slice(css.indexOf('/* ===== d77'), css.indexOf('/* ===== d78') > 0 ? css.indexOf('/* ===== d78') : undefined); // d78: own block only assert.ok(c.length > 500); assert.ok(!/box-shadow:(?!none)/.test(c), 'no shadows'); assert.ok(!/border-radius:(?!6px|0|4px)/.test(c.replace(/border-radius:6px/g, '')), 'radius 6px');
});
