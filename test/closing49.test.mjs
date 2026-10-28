// node --test test/closing49.test.mjs — d49: closing import lines get a cost TYPE (never the bank), tax lines -> Property tax,
// the standard chart for new companies (and backfill by adding only), "needs an account" for bank entries, picker search, comma money typing.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker49.mjs');
const worker = (await import('/tmp/pm-test-worker49.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; }, async delete(k) { delete files[k]; }, async list({ prefix }) { return { objects: Object.keys(files).filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; } },
  ASSETS: { fetch: async () => new Response('<!doctype html><html><head><title>x</title></head><body></body></html>', { headers: { 'content-type': 'text/html' } }) }, PM_TODAY: '2026-10-21' };
const mk = w => async (p, body, method, tok) => { const r = await w.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t }; };
const call = mk(worker);
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
// the statement lines Alex's trial import showed (plus insurance, interest and a loan fee)
const ITEMS = [
  { label: 'Technology / E-Document Fee', amount: 10000 }, { label: 'Title - Commitment Fee', amount: 10000 }, { label: 'Title - Settlement Fee', amount: 59000 },
  { label: 'Recording Fees', amount: 4700 }, { label: "County Auditor's Transfer Fee", amount: 50 }, { label: 'County Transfer Tax (Deed)', amount: 25600 },
  { label: 'Assignment Fee', amount: 250000 }, { label: 'County Taxes 06/20/2026 to 10/16/2026', amount: 3663, credit: true, category: 'tax_proration' },
  { label: 'City Taxes 07/01/2026 to 10/16/2026', amount: 12000 }, { label: 'Homeowners Insurance Premium', amount: 81200, category: 'prepaid' },
  { label: 'Prepaid Interest 10/16 to 11/01', amount: 4300 }, { label: 'Loan Origination Fee', amount: 100000, category: 'loan_cost' }];
let ttok = '', tco = 0, mtok = '';
const isBankName = n => /\b(bank|checking|savings)\b/i.test(n);

test('a new company gets a full standard chart: expense accounts, Closing Costs, Property Taxes, Insurance, Mortgage Interest', async () => {
  const r = await call('signup', { name: 'Cleo Closing', company: 'Closing Test 49 LLC', email: 'cleo49@example.com', password: 'ClosingTest-4949', phone: '' });
  assert.equal(r.status, 200, r.text); ttok = r.json.token; tco = r.json.company_id;
  const ch = (await call('m/chart', null, 'GET', ttok)).json; const names = ch.accounts.map(a => a.name);
  const exp = ch.accounts.filter(a => a.type === 'expense'); assert.ok(exp.length >= 20, 'expense accounts: ' + exp.length);
  for (const n of ['Repairs & Maintenance', 'Utilities - Electric', 'Insurance', 'Property Taxes', 'Mortgage Interest', 'Closing Costs', 'Management Fees', 'Legal & Professional Fees', 'Property Cost', 'Loan Costs', 'Mortgage Payable', 'Owner Contribution', 'Rent Income'])
    assert.ok(names.includes(n), 'chart has ' + n);
  assert.equal(ch.show_numbers, false, 'account numbers are off by default for a new company');
});

test('closing lines default to cost types, never to a bank; tax lines default to Property tax', async () => {
  await call('m/onboard', { entities: [{ name: 'Closing Test 49 LLC', type: 'llc_single', state: 'OH', members: [] }], banks: [{ name: 'Operating', institution: 'Chase', last4: '4411' }], properties: [] }, 'POST', ttok);
  const ch = (await call('m/chart', null, 'GET', ttok)).json; const byId = Object.fromEntries(ch.accounts.map(a => [a.id, a])); const bankGl = new Set(ch.banks.map(b => b.account_id));
  const r = (await call('m/closing/types', { kind: 'purchase', items: ITEMS }, 'POST', ttok)).json;
  r.rows.forEach((row, i) => { assert.ok(row.account_id, 'a default for ' + ITEMS[i].label); assert.ok(!bankGl.has(row.account_id) && !isBankName(byId[row.account_id].name), `${ITEMS[i].label} defaults to ${byId[row.account_id].name}, a bank`); });
  const t = (lab) => r.rows[ITEMS.findIndex(i => i.label === lab)];
  assert.equal(t('County Taxes 06/20/2026 to 10/16/2026').type, 'property_tax'); assert.equal(byId[t('County Taxes 06/20/2026 to 10/16/2026').account_id].name, 'Property Taxes');
  assert.equal(t('City Taxes 07/01/2026 to 10/16/2026').type, 'property_tax');
  assert.equal(t('County Transfer Tax (Deed)').type, 'transfer_tax'); assert.equal(byId[t('County Transfer Tax (Deed)').account_id].name, 'Closing Costs', 'transfer tax is capitalized');
  for (const l of ['Technology / E-Document Fee', 'Recording Fees', 'Assignment Fee', "County Auditor's Transfer Fee"]) assert.equal(byId[t(l).account_id].name, 'Closing Costs', l);
  assert.equal(t('Title - Settlement Fee').type, 'title');
  assert.equal(byId[t('Homeowners Insurance Premium').account_id].name, 'Insurance');
  assert.equal(byId[t('Prepaid Interest 10/16 to 11/01').account_id].name, 'Mortgage Interest');
  assert.equal(byId[t('Loan Origination Fee').account_id].name, 'Loan Costs');
  assert.ok(!r.types.closing.account || !isBankName(r.types.closing.account));
  const ids = (await call('m/closing/accounts', { kind: 'purchase', items: ITEMS }, 'POST', ttok)).json; assert.deepEqual(ids, r.rows.map(x => x.account_id), 'the older defaults route says the same');
});

test('posting a closing: a cost line on a bank account is refused; the posted entry has costs on cost accounts only', async () => {
  const ch = (await call('m/chart', null, 'GET', ttok)).json; const bank = ch.banks[0]; const types = (await call('m/closing/types', { kind: 'purchase', items: ITEMS.slice(0, 8) }, 'POST', ttok)).json;
  const base = { kind: 'purchase', street: '1418 Maple Hollow Drive', city: 'Toledo', state: 'OH', zip: '43607', units: 'House', closing_date: '2026-10-16', purchase_price: '64000', bank_account_id: bank.id, dep_how: 'none' };
  const bad = await call('m/closing/post', { ...base, items: ITEMS.slice(0, 8).map((it, i) => ({ label: it.label, amount: String(it.amount / 100), credit: !!it.credit, account_id: i === 0 ? bank.account_id : types.rows[i].account_id })) }, 'POST', ttok);
  assert.equal(bad.status, 400, bad.text); assert.match(bad.json.error, /bank/i);
  const op = ch.accounts.find(a => a.name === 'Operating Bank');
  const bad2 = await call('m/closing/post', { ...base, items: ITEMS.slice(0, 8).map((it, i) => ({ label: it.label, amount: String(it.amount / 100), credit: !!it.credit, account_id: i === 1 ? op.id : types.rows[i].account_id })) }, 'POST', ttok);
  assert.equal(bad2.status, 400, 'the unlinked "Operating Bank" account is refused too');
  const ok = await call('m/closing/post', { ...base, items: ITEMS.slice(0, 8).map((it, i) => ({ label: it.label, amount: (it.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }), credit: !!it.credit, account_id: types.rows[i].account_id })) }, 'POST', ttok);
  assert.equal(ok.status, 200, ok.text);
  const jid = ok.json.journal_id; const j = (await call('m/entry/' + jid, null, 'GET', ttok)).json;
  const bankLines = j.lines.filter(l => l.account_id === bank.account_id); assert.equal(bankLines.length, 1, 'one bank line: the cash at closing');
  assert.ok(!j.lines.some(l => l.account === 'Operating Bank'), 'nothing on Operating Bank');
  const dr = j.lines.reduce((s, l) => s + l.debit, 0), cr = j.lines.reduce((s, l) => s + l.credit, 0); assert.equal(dr, cr, 'balanced');
  assert.equal(bankLines[0].credit, 6400000 + ITEMS.slice(0, 8).reduce((s, it) => s + (it.credit ? -it.amount : it.amount), 0), 'cash = price + costs − credits (commas accepted)');
  const tax = j.lines.find(l => l.account === 'Property Taxes'); assert.ok(tax && tax.credit === 3663, 'tax proration credit on Property Taxes');
});

test('no bank transaction is left without a counter-account; a bad one is flagged and fixed in one click', async () => {
  assert.equal((await call('m/x49/needs', null, 'GET', ttok)).json.count, 0, 'the posted closing needs nothing');
  const ch = (await call('m/chart', null, 'GET', ttok)).json; const bank = ch.banks[0]; const op = ch.accounts.find(a => a.name === 'Operating Bank');
  const je = await call('m/x39/je', { date: '2026-10-17', memo: 'cost booked on Operating Bank', lines: [{ account_id: op.id, debit: 5000, credit: 0 }, { account_id: bank.account_id, debit: 0, credit: 5000 }] }, 'POST', ttok); assert.equal(je.status, 200, je.text);
  const nd = (await call('m/x49/needs', null, 'GET', ttok)).json; assert.equal(nd.count, 1); assert.equal(nd.items[0].other, 'Operating Bank');
  const reg = (await call('m/x24/register/' + bank.id, null, 'GET', ttok)).json; assert.ok(reg.rows.find(r => r.id === je.json.id).needs_account, 'register flags it');
  assert.ok(reg.rows.filter(r => r.id !== je.json.id).every(r => !r.needs_account), 'nothing else flagged');
  const rep = ch.accounts.find(a => a.name === 'Repairs & Maintenance');
  assert.equal((await call('m/x49/fix/' + je.json.id, { account_id: bank.account_id, bank_id: bank.id }, 'POST', ttok)).status, 400, 'cannot fix it to a bank');
  const fx = await call('m/x49/fix/' + je.json.id, { account_id: rep.id, bank_id: bank.id }, 'POST', ttok); assert.equal(fx.status, 200, fx.text);
  assert.equal((await call('m/x49/needs', null, 'GET', ttok)).json.count, 0);
  const j = (await call('m/entry/' + je.json.id, null, 'GET', ttok)).json; assert.deepEqual(j.lines.map(l => l.account).sort(), ['Chase Operating ••4411', 'Repairs & Maintenance'].sort());
});

test('main company: same defaults by its own chart names, numbers stay on, nothing flagged', { skip: !PW }, async () => {
  const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); mtok = r.json.token;
  const ch = (await call('m/chart', null, 'GET', mtok)).json; assert.equal(ch.show_numbers, true); const byId = Object.fromEntries(ch.accounts.map(a => [a.id, a])); const bankGl = new Set(ch.banks.map(b => b.account_id));
  const t = (await call('m/closing/types', { kind: 'purchase', items: ITEMS }, 'POST', mtok)).json;
  t.rows.forEach((row, i) => assert.ok(row.account_id && !bankGl.has(row.account_id), ITEMS[i].label));
  assert.match(byId[t.rows[7].account_id].name, /tax/i); assert.equal(byId[t.rows[7].account_id].type, 'expense');
  assert.equal((await call('m/x49/needs', null, 'GET', mtok)).json.count, 0);
  const n0 = ch.accounts.length; await call('m/chart', null, 'GET', mtok); assert.equal((await call('m/chart', null, 'GET', mtok)).json.accounts.length, n0, 'the main company chart is never backfilled');
});

test('an existing trial company missing standard accounts gets them back by ADDING only (renamed or extra accounts untouched)', async () => {
  const tbl = 'c' + tco + '_gl_accounts';
  const before = sq.prepare(`SELECT id, code, name FROM ${tbl}`).all();
  sq.prepare(`DELETE FROM ${tbl} WHERE name IN ('Insurance','Property Taxes','Closing Costs','Supplies')`).run();
  sq.prepare(`UPDATE ${tbl} SET name='Cleaning' WHERE name='Cleaning & Turnover'`).run();
  sq.prepare(`DELETE FROM c${tco}_settings WHERE k='chart49'`).run();
  const w2 = (await import('/tmp/pm-test-worker49.mjs?fresh=' + Date.now())).default; const call2 = mk(w2);
  const ch = (await call2('m/chart', null, 'GET', ttok)).json; const names = ch.accounts.map(a => a.name);
  for (const n of ['Insurance', 'Property Taxes', 'Closing Costs', 'Supplies']) assert.ok(names.includes(n), 'added back ' + n);
  assert.ok(names.includes('Cleaning') && !names.includes('Cleaning & Turnover'), 'a renamed account (same id) is left alone');
  const after = sq.prepare(`SELECT id, code, name FROM ${tbl}`).all(); for (const a of after) { const b = before.find(x => x.id === a.id); if (b && b.name !== 'Cleaning & Turnover') assert.equal(a.name, b.name); }
});

test('account picker search finds by name ("clo" -> Closing costs) and by number; money typing adds commas', () => {
  const src = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  const grab = name => { const i = src.indexOf(name); assert.ok(i >= 0, name); const e = src.indexOf('\n', i); return src.slice(i, e); };
  const i0 = src.indexOf('function money49Fmt'); const j0 = src.indexOf('\n}\n', i0);
  const fn = new Function(grab('const cb49Norm') + '\n' + grab('function cb49Match') + '\n' + src.slice(i0, j0 + 2) + '\nreturn { cb49Match, money49Fmt };')();
  const A = [['Closing Costs', '1505'], ['Cleaning & Turnover', '6100'], ['Loan Closing Cost', '8110'], ['Insurance', '6300'], ['Property Taxes', '6400']];
  const hits = q => A.filter(([n, c]) => fn.cb49Match(q, n, c) > 0).sort((a, b) => fn.cb49Match(q, b[0], b[1]) - fn.cb49Match(q, a[0], a[1])).map(a => a[0]);
  assert.equal(hits('clo')[0], 'Closing Costs'); assert.ok(hits('clo').includes('Loan Closing Cost')); assert.ok(!hits('clo').includes('Insurance'));
  assert.deepEqual(hits('6300'), ['Insurance']); assert.deepEqual(hits('prop tax'), ['Property Taxes']); assert.equal(hits('').length, A.length);
  assert.equal(fn.money49Fmt('20000', false), '20,000'); assert.equal(fn.money49Fmt('20000.5', false), '20,000.5'); assert.equal(fn.money49Fmt('20000', true), '20,000.00');
  assert.equal(fn.money49Fmt('1234567.891', false), '1,234,567.89'); assert.equal(fn.money49Fmt('$1,2345', true), '12,345.00'); assert.equal(fn.money49Fmt('', true), '');
});

test('a sub-account can only sit under an account of the same type', async () => {
  const ch = (await call('m/chart', null, 'GET', ttok)).json; const inc = ch.accounts.find(a => a.name === 'Rent Income'); const rep = ch.accounts.find(a => a.name === 'Repairs & Maintenance');
  const bad = await call('m/coa', { name: 'Plumbing', type: 'expense', parent_id: inc.id }, 'POST', ttok); assert.equal(bad.status, 400); assert.match(bad.json.error, /same type/);
  const ok = await call('m/coa', { name: 'Plumbing', type: 'expense', parent_id: rep.id }, 'POST', ttok); assert.equal(ok.status, 200, ok.text);
  const top = await call('m/coa', { name: 'Software', type: 'expense' }, 'POST', ttok); assert.equal(top.status, 200, 'no parent is fine (main account)');
});
