// node --test test/vendor1099_46.test.mjs — d46: vendor tax type (person / company), default 1099 by type, threshold per year,
// card payments left out, tax ID masked (never in lists / detail JSON), 1099 PDF + CSV, payer per company (no tax data across companies).
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
fs.copyFileSync(path.join(SITE, '_worker.js'), '/tmp/pm-test-worker46.mjs');
const worker = (await import('/tmp/pm-test-worker46.mjs?' + Date.now())).default;
const sq = new DatabaseSync(':memory:');
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { this.args = a; return this; } _s() { return sq.prepare(this.sql); }
  async all() { return { results: this._s().all(...this.args) }; } async first() { return this._s().get(...this.args) ?? null; }
  async run() { const r = this._s().run(...this.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }
const files = {};
const env = { DB: { prepare: s => new Stmt(s), async batch(st) { sq.exec('BEGIN'); try { const out = []; for (const s of st) out.push(/^\s*(SELECT|PRAGMA|WITH)/i.test(s.sql) ? await s.all() : await s.run()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } } },
  FILES: { async put(k, v) { files[k] = v; }, async get(k) { return files[k] ? { body: files[k] } : null; } }, ASSETS: { fetch: async () => new Response('') }, PM_TODAY: '2026-12-02' };
const raw = async (p, body, method, tok) => worker.fetch(new Request('http://x/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-pm-app': '1', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} });
const call = async (p, body, method, tok) => { const r = await raw(p, body, method, tok); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { status: r.status, json: j, text: t }; };
const LOG = fs.existsSync('demo-logins.local.txt') ? fs.readFileSync('demo-logins.local.txt', 'utf8') : '';
const PW = (LOG.match(/manager@example\.com\s+password:\s*(\S+)/) || [])[1];
let tok = '', V = {};
const acct = code => sq.prepare('SELECT id FROM gl_accounts WHERE code=?').get(code).id;
const addV = async (name, vt) => { const r = await call('m/vendors', { name, vtax46: { ...vt, match: name } }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.id; };
const tax = async id => (await call('m/x46/vendor/' + id, null, 'GET', tok)).json;

test('setup: sign in', { skip: !PW }, async () => { const r = await call('login', { email: 'manager@example.com', password: PW }); assert.equal(r.status, 200); tok = r.json.token; });

test('default "Gets a 1099" by tax type (person, LLCs, partnership on; S/C-corp off; attorney always on; override kept)', { skip: !PW }, async () => {
  V.p = await addV('Luis Lima', { kind: 'person', first: 'Luis', last: 'Lima', tin: '123-45-6789', addr1: '5 Oak St', city: 'Trenton', state: 'nj', zip: '08608' });
  V.llc = await addV('Oak Builders LLC', { kind: 'company', cls: 'llc_single' });
  V.part = await addV('Two Guys Partnership', { kind: 'company', cls: 'partnership' });
  V.s = await addV('Big Plumbing Inc', { kind: 'company', cls: 's_corp' });
  V.c = await addV('Law Firm PC', { kind: 'company', cls: 'c_corp', attorney: true });
  V.c2 = await addV('Mega Corp', { kind: 'company', cls: 'c_corp' });
  const got = {}; for (const [k, id] of Object.entries(V)) got[k] = (await tax(id)).v1099;
  assert.deepEqual(got, { p: true, llc: true, part: true, s: false, c: true, c2: false });
  assert.equal((await tax(V.p)).label, 'Person · 1099'); assert.equal((await tax(V.s)).label, 'Company · S-corp · no 1099');
  // user override: S-corp ticked on is kept; attorney cannot be turned off
  let r = await call('m/x46/vendor/' + V.s, { kind: 'company', name: 'Big Plumbing Inc', cls: 's_corp', v1099: true }, 'POST', tok); assert.equal(r.json.tax.v1099, true);
  r = await call('m/x46/vendor/' + V.c, { kind: 'company', name: 'Law Firm PC', cls: 'c_corp', attorney: true, v1099: false }, 'POST', tok); assert.equal(r.json.tax.v1099, true);
  r = await call('m/x46/vendor/' + V.s, { kind: 'company', name: 'Big Plumbing Inc', cls: 's_corp', v1099: false }, 'POST', tok); assert.equal(r.json.tax.v1099, false);
  // a vendor added without the question stays "Not set" (never guessed)
  r = await call('m/vendors', { name: 'Imported Guy' }, 'POST', tok); V.u = r.json.id;
  const list = (await call('m/vendors', null, 'GET', tok)).json; assert.equal(list.find(v => v.id === V.u).tax_label46, 'Not set'); assert.equal(list.find(v => v.id === V.p).tax_label46, 'Person · 1099');
  r = await call('m/x46/vendor/' + V.u, { first: 'x' }, 'POST', tok); assert.equal(r.status, 400); assert.match(r.json.error, /Person or Company/);
});

test('tax ID is stored encrypted and only ever shown masked (detail, list, vendor page)', { skip: !PW }, async () => {
  const t = await tax(V.p); assert.equal(t.tin_masked, '•••-••-6789'); assert.equal(t.has_tin, true); assert.equal(t.state, 'NJ');
  for (const p of ['m/x46/vendor/' + V.p, 'm/vendors', 'm/vendor-detail/' + V.p, 'm/x46/center?year=2026']) { const r = await call(p, null, 'GET', tok); assert.equal(r.status, 200, p); assert.ok(!/123-?45-?6789/.test(r.text), 'TIN leaked in ' + p); }
  const row = sq.prepare('SELECT tin_enc, tin_last4 FROM vtax46 WHERE vendor_id=?').get(V.p); assert.ok(row.tin_enc && !row.tin_enc.includes('123456789')); assert.equal(row.tin_last4, '6789');
  const bad = await call('m/x46/vendor/' + V.llc, { kind: 'company', name: 'Oak Builders LLC', cls: 'llc_single', tin: '12-34' }, 'POST', tok); assert.equal(bad.status, 400);
  const ok = await call('m/x46/vendor/' + V.llc, { kind: 'company', name: 'Oak Builders LLC', cls: 'llc_single', tin: '12-3456789' }, 'POST', tok); assert.equal(ok.json.tax.tin_masked, '••-•••6789');
  const keep = await call('m/x46/vendor/' + V.llc, { kind: 'company', name: 'Oak Builders LLC', cls: 'llc_single', tin: '' }, 'POST', tok); assert.equal(keep.json.tax.has_tin, true);
});

test('threshold per tax year: $600 for 2025, $2,000 for 2026; a custom year setting sticks and resets', { skip: !PW }, async () => {
  assert.equal((await call('m/x46/center?year=2025', null, 'GET', tok)).json.threshold, 60000);
  assert.equal((await call('m/x46/center?year=2026', null, 'GET', tok)).json.threshold, 200000);
  let r = await call('m/x46/threshold', { year: 2026, amount: '2,100' }, 'POST', tok); assert.equal(r.json.threshold, 210000);
  assert.equal((await call('m/x46/center?year=2026', null, 'GET', tok)).json.threshold_custom, true);
  r = await call('m/x46/threshold', { year: 2026, amount: null }, 'POST', tok); assert.equal(r.json.threshold, 200000);
});

test('card / PayPal-type payments are left out; bank + check count; status by threshold and missing info', { skip: !PW }, async () => {
  let r = await call('m/cards', { institution: 'Amex', last4: '1234' }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json));
  const card = sq.prepare(`SELECT id FROM bank_accounts WHERE kind='card' ORDER BY id DESC`).get().id;
  const bank = sq.prepare(`SELECT id FROM bank_accounts WHERE kind='bank' ORDER BY id`).get().id;
  const exp = async (vid, amount, paid_by, extra) => { const r = await call('m/x24/expense', { paid_by, vendor_id: vid, account_id: acct('6100') || acct('6000'), amount, date: '2026-06-15', memo: 'Repair', ...extra }, 'POST', tok); assert.equal(r.status, 200, JSON.stringify(r.json)); };
  await exp(V.p, '2500.00', 'ach', { bank_account_id: bank, bank }); await exp(V.p, '900.00', 'card', { card_id: card, card });
  await exp(V.llc, '1500.00', 'check', { bank_account_id: bank, bank });
  await exp(V.part, '3000.00', 'ach', { bank_account_id: bank, bank });
  await exp(V.u, '5000.00', 'ach', { bank_account_id: bank, bank });
  const c = (await call('m/x46/center?year=2026', null, 'GET', tok)).json;
  const p = c.rows.find(x => x.vendor_id === V.p); assert.equal(p.amount, 250000); assert.equal(p.card, 90000); assert.equal(p.status, 'ready'); assert.equal(p.form, 'NEC');
  assert.equal(c.rows.find(x => x.vendor_id === V.llc).status, 'below');
  assert.equal(c.rows.find(x => x.vendor_id === V.part).status, 'tin');
  assert.ok(!c.rows.some(x => x.vendor_id === V.u)); assert.ok(c.others.some(o => o.vendor_id === V.u && o.label === 'Not set' && o.over));
  assert.equal(c.totals.nec, 250000 + 300000);
  // 2025 had nothing
  assert.equal((await call('m/x46/center?year=2025', null, 'GET', tok)).json.rows.filter(x => x.amount > 0).length, 0);
  // rent flag moves the vendor to 1099-MISC box 1
  r = await call('m/x46/vendor/' + V.part, { kind: 'company', name: 'Two Guys Partnership', cls: 'partnership', rent: true }, 'POST', tok); assert.equal(r.status, 200);
  const c2 = (await call('m/x46/center?year=2026', null, 'GET', tok)).json; assert.equal(c2.rows.find(x => x.vendor_id === V.part).form, 'MISC'); assert.equal(c2.totals.misc, 300000);
});

test('1099 PDF (Copy B / 1 / 2, "not Copy A") and CSV generate; recipient TIN truncated on Copy B', { skip: !PW }, async () => {
  let r = await call('m/x46/payer', { name: 'Demo Rentals LLC', ein: '98-7654321', address: '100 Front St, Trenton, NJ 08608', phone: '(609) 555-0100' }, 'POST', tok); assert.equal(r.status, 200); assert.equal(r.json.payer.tin_masked, '••-•••4321'); assert.ok(!/987654321|98-7654321/.test(r.text));
  let res = await raw('m/x46/pdf?year=2026', null, 'GET', tok); assert.equal(res.status, 200); assert.equal(res.headers.get('content-type'), 'application/pdf');
  const pdf = Buffer.from(await res.arrayBuffer()).toString('latin1'); assert.ok(pdf.startsWith('%PDF-1.4')); assert.ok(pdf.trimEnd().endsWith('%%EOF'));
  for (const s of ['Copy B', 'Copy 1', 'Copy 2', 'not Copy A', 'Form 1099-NEC', 'Form 1099-MISC', '1a Nonemployee compensation', '1 Rents', '2,500.00', 'Luis Lima', '***-**-6789', '123-45-6789', '98-7654321', 'summary for tax year 2026']) assert.ok(pdf.includes(s), 'PDF missing ' + s);
  const pages = (pdf.match(/\/Type \/Page\b/g) || []).length; assert.equal(pages, 1 + 2 * 2, 'summary + 2 pages for each of 2 forms');
  res = await raw('m/x46/pdf?year=2026&vendor=' + V.p, null, 'GET', tok); assert.equal(res.status, 200); const one = Buffer.from(await res.arrayBuffer()).toString('latin1'); assert.equal((one.match(/\/Type \/Page\b/g) || []).length, 2);
  res = await raw('m/x46/pdf?year=2025', null, 'GET', tok); assert.equal(res.status, 404);
  res = await raw('m/x46/csv?year=2026', null, 'GET', tok); const csv = await res.text(); assert.match(res.headers.get('content-type'), /text\/csv/);
  const lines = csv.trim().split(/\r?\n/); assert.match(lines[0], /^tax_year,form,box,amount/); const lp = lines.find(l => l.includes('Luis Lima')); assert.ok(lp.includes('123-45-6789') && lp.includes('2500.00') && lp.includes('1099-NEC') && lp.includes('Ready'));
});

test('payer and vendor tax data are per company (a second company sees none of it)', { skip: !PW }, async () => {
  let r = await call('signup', { company: 'Second Co Rentals', name: 'Sam Second', email: 'second46@example.com', password: 'Second-Co-4646' }); assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call('login', { email: 'second46@example.com', password: 'Second-Co-4646' }); assert.equal(r.status, 200, JSON.stringify(r.json)); const t2 = r.json.token;
  const c = await call('m/x46/center?year=2026', null, 'GET', t2); assert.equal(c.status, 200, c.text);
  assert.equal(c.json.payer.name, 'Second Co Rentals'); assert.equal(c.json.payer.has_tin, false); assert.equal(c.json.rows.length, 0);
  assert.ok(!/6789|4321|Luis Lima|Demo Rentals/.test(c.text));
  const v = await call('m/x46/vendor/' + V.p, null, 'GET', t2); assert.ok(v.status === 404 || (v.json && v.json.name !== 'Luis Lima'), v.text);
  const res = await raw('m/x46/csv?year=2026', null, 'GET', t2); assert.ok(!/123-45-6789|98-7654321/.test(await res.text()));
  const mine = (await call('m/x46/center?year=2026', null, 'GET', tok)).json; assert.equal(mine.payer.name, 'Demo Rentals LLC');
});
