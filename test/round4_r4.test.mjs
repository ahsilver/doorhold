import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
// round 4: owner, Oct 27 4:13 PM — on a property (233 Orchard Ave) Expense / repair / Add tenant "none of the buttons worked"
const fnSrc = name => { const a = app.indexOf('function ' + name + '('); const b = app.indexOf('\n}\n', a); return app.slice(a, b + 2); };
function fakeDom() {
  const made = [];
  const el = tag => { const e = { tag, className: '', attrs: {}, kids: [], innerHTML: '', setAttribute(k, v) { this.attrs[k] = v; }, prepend(x) { this.kids.unshift(x); }, append(...x) { this.kids.push(...x); }, classList: { add() {}, remove() {} } }; made.push(e); return e; };
  const body = { kids: [], append(...x) { this.kids.push(...x); } };
  return { made, document: { createElement: el, body } };
}
test('r4: every sheet has a visible close button that closes it (phones had no way out)', () => {
  const { made, document } = fakeDom(); let closed = 0;
  const sheet = new Function('document', '$', '$$', 'closeSheet', 'requestAnimationFrame', fnSrc('sheet') + '; return sheet;')(document, () => null, () => [], () => { closed++; }, f => f());
  const sh = sheet('<h2>Expense / pay someone</h2><form></form>');
  const x = sh.kids.find(k => k.className === 'shx4'); assert.ok(x, 'close button present'); assert.equal(x.attrs['aria-label'], 'Close');
  const before = closed; x.onclick({ preventDefault() {} }); assert.equal(closed, before + 1, 'tapping × closes the sheet');
  const chat = sheet('<div class="chat">hi</div>'); assert.ok(!chat.kids.some(k => k.className === 'shx4'), 'chat sheets keep their own close');
});
test('r4: Escape closes an open sheet', () => { assert.match(app, /e\.key === 'Escape' && !e\.defaultPrevented && document\.querySelector\('\.sheet\.in'\)[^\n]*closeSheet\(\)/); });
test('r4: phone sheets fit the visible screen and the × is styled', () => {
  assert.match(css, /\.sheet\{max-height:92vh;max-height:88dvh\}/); assert.match(css, /\.shx4\{position:absolute/); assert.match(css, /\.sheet\.fp25 \.shx4\{display:none\}/);
});
test('r4: Add tenant opens at once and loads properties in parallel, not one by one', async () => {
  const src = fnSrc('newTenantSheet'); const head = src.slice(0, src.indexOf('const units = []'));
  assert.ok(head.indexOf('sheet(') < head.indexOf('await'), 'a sheet is shown before anything is awaited');
  assert.doesNotMatch(src, /for \(const p of props\) \{ const pd = S\.cache\['p' \+ p\.id\] \|\| \(S\.cache\['p' \+ p\.id\] = await api/);
  const S = { cache: { p2: { units: [] } } }; let live = 0, peak = 0, calls = [];
  const api = async u => { calls.push(u); live++; peak = Math.max(peak, live); await new Promise(r => setTimeout(r, 5)); live--; return { units: [] }; };
  const loadProps4 = new Function('S', 'api', 'return async ' + fnSrc('loadProps4'))(S, api);
  await loadProps4(Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })));
  assert.equal(calls.length, 19, 'cached property skipped'); assert.ok(peak > 1 && peak <= 6, 'parallel, at most 6 at a time: ' + peak);
  assert.ok(Object.keys(S.cache).length === 20);
});
test('r4: "New request" on a property opens the repair form for that property', () => {
  assert.match(app, /if \(nb\) nb\.onclick = e => \{ e\.preventDefault\(\); newRequestSheet\(\{ property_id: pid \}\); \}/);
});

// round 4 add-on (owner 4:09 PM): money in → Record new guides in small steps
const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
const L4 = { accAll: [{ id: 40, code: '4000', name: 'Rent Income', type: 'income' }, { id: 21, code: '2100', name: 'Security Deposits Held', type: 'liability' }], leases: [{ lease_id: 7, name: 'Ava Lin', property: '14 Maple', property_id: 3 }] };
const G = new Function(fnSrc('gw4acc') + '\n' + fnSrc('gw4apply') + '; return gw4apply;')();
test('r4: step answers turn into what Post sends', () => {
  assert.equal(G({}, { g4k: 'rent' }, L4).type, 'unknown', 'kind alone is not postable');
  assert.equal(G({ g4k: 'rent' }, { g4b: 'find' }, L4).type, 'unknown', 'find = match panel, nothing new');
  const r = G({ g4k: 'rent', g4b: 'add' }, { lease_id: 7 }, L4); assert.equal(r.type, 'payment'); assert.equal(r.lease_id, 7); assert.equal(r.g4d, 'ledger');
  const dp = G({ g4k: 'deposit', g4b: 'add', lease_id: 7 }, {}, L4); assert.equal(dp.type, 'deposit_in');
  const bk = G({ g4k: 'deposit', g4b: 'add', lease_id: 7 }, { g4d: 'bank' }, L4); assert.equal(bk.type, 'income'); assert.equal(bk.account_id, 21); assert.equal(bk.property_id, 3); assert.match(bk.memo, /Deposit · Ava Lin/);
  const rb = G({ g4k: 'rent', g4b: 'add', lease_id: 7 }, { g4d: 'bank' }, L4); assert.equal(rb.account_id, 40, 'bank-only rent defaults to rent income');
  assert.equal(G({}, { g4k: 'transfer', g4b: 'add', other_bank_id: 2 }, L4).type, 'transfer_to');
  assert.equal(G({}, { g4k: 'income', g4b: 'add' }, L4).type, 'income');
});
test('r4: money-in rows use the steps; deposits need a tenant; server books deposit_in on the tenant ledger', () => {
  assert.match(app, /if \(mode === 'new' && !out\) panel = gw4\(t, ov, L, opt\);/);
  for (const w of ['What is it?', 'Is it already in your books?', 'Split it? (optional)', 'Where should it go?', 'Bank register only', // r7: owner's words "Books + tenant ledger / Bank register only"
 'Security deposit / down payment', 'Find it in my books', 'Add it now']) assert.ok(app.includes(w), w);
  assert.match(app, /if \(ty === 'payment' \|\| ty === 'deposit_in'\) return e\.lease_id \? '' : 'Choose the tenant';/);
  assert.match(wk, /case 'deposit_in': \{[^]*?kind: 'deposit_in'[^]*?await link\(jid\)/);
});
