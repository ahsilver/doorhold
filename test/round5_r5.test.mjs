import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
// round 5: owner, Oct 27 4:50 PM — inside one bank every undeposited number is that bank's; no-bank payments are a separate small line
const fnSrc = name => { const a = app.indexOf('function ' + name + '('); const b = app.indexOf('}\n', a); return app.slice(a, b + 1); };
test('r5: und80 counts only THIS bank; no-bank payments listed after, counted apart', () => {
  const S = { all80: false }; const und80 = new Function('S', (s => s.slice(0, s.indexOf(' } //') + 2))(app.slice(app.indexOf('function und80('))) + '; return und80;')(S);
  const d = { items: [{ id: 1, amount: 100, bank80: 'none' }, { id: 2, amount: 500, bank80: 'this' }, { id: 3, amount: 900, bank80: 'other' }, { id: 4, amount: 50, bank80: 'none' }], suggest: [2, 3] };
  const u = und80(d);
  assert.equal(u.undeposited_total, 500); assert.equal(u.n80, 1); assert.equal(u.none80, 2); assert.equal(u.noneT80, 150);
  assert.deepEqual(u.items.map(i => i.id), [2, 1, 4], 'this bank first, then no-bank, never other banks'); assert.deepEqual(u.suggest, [2]);
});
test('r5: deposit page header says this bank (or "all banks") and shows the No bank set line', () => {
  assert.match(app, /\$\{inB && bk5 \? 'for ' \+ esc\(bname\(bk5\)\) : '· all banks'\}/);
  assert.doesNotMatch(app, /`\$\{v\.length\} of \$\{items\.length\}`/, 'no more "6 of 60"');
  assert.match(app, /function nb5Html\(n, total\) \{ return n \? `<a href="#" class="nb5" data-nb5="1"[^`]*>No bank set: \$\{money\(total\)\} \(\$\{n\}\) · assign<\/a>`/);
  const nb5Html = new Function('money', fnSrc('nb5Html') + '; return nb5Html;')(c => '$' + (c / 100).toFixed(2));
  assert.match(nb5Html(29, 3195200), /No bank set: \$31952\.00 \(29\) · assign/); assert.equal(nb5Html(0, 0), '');
});
test('r5: Banking (company level) is labelled all banks; bank register shows the no-bank line; to-do chip says this bank', () => {
  assert.match(app, /Undeposited funds · all banks: \$\{money\(u\.total\)\}/);
  assert.match(app, /\(\$\{u\.n\}\) · Deposit these<\/a>` : `[^`]*`\}\$\{nb5Html\(u\.n_none, u\.total_none\)\}/);
  assert.match(app, /Undeposited \(this bank\) <b>/);
});
test('r5: server bank summary lists the no-bank properties for "assign"', () => {
  assert.match(wk, /none_props: Object\.values\(np5\)\.sort\(\(a, b\) => b\.total - a\.total\)/);
  assert.match(app, /api\('m\/x37\/housebank\/' \+ p\.id, \{ body: \{ bank_account_id: \+v \} \}\)/);
});

test('r5: both old routes open the one Reconcile page (#/match/<bank> and bare #/catchup)', () => {
  assert.match(app, /if \(bid && !\/classic=1\/\.test\(a\)\) \{ location\.replace\('#\/catchup\/' \+ bid\); return; \}/);
  assert.match(app, /if \(!\+arg\) \{ location\.replace\(S\.cuBank \? '#\/catchup\/' \+ S\.cuBank : '#\/match'\); return; \}/);
  assert.doesNotMatch(app, /\['catchup', 'Bank lines to add'\], \['bankrules'/, 'the menu no longer lists a second reconcile place');
});
test('r5: same page holds the bank side, the books side and the filter sidebar with counts', () => {
  const src = app.slice(app.indexOf('async function rc5(root, bid)'), app.indexOf('{ const _cu5 = MV.catchup;'));
  assert.match(src, /side\.append\(seg\)/, 'Confident / Probably / Not sure / Needs you / Matched move into the sidebar');
  assert.match(src, /FROM YOUR BANK/); assert.match(src, /IN YOUR BOOKS/); assert.match(src, /\+ New purchase \/ expense/);
  assert.match(src, /expense24\(\{ bank_account_id: bid/); assert.match(app, /bank: pre\.bank_account_id \|\| df\.bank_account_id \|\| ''/);
  assert.match(app, /x = await api\('m\/x24\/match\/' \+ bid\)/); assert.match(app, /api\('m\/x24\/match\/' \+ bid, \{ body: \{ txn_ids: \[\+f\.txn\], entry_ids: \[e\.id\] \} \}\)/);
});
test('r5: books side lists only entries not matched to a bank line; same-amount bank lines come first in the picker', () => {
  const src = app.slice(app.indexOf('function rc5MatchBook('), app.indexOf('async function rc5(root, bid)'));
  const sdate = d => d, esc = s => String(s), money = c => String(c); let shown = '';
  const md34 = (t, sub, body) => { shown = body; }; const toast = () => {};
  const f = new Function('sdate', 'esc', 'money', 'md34', 'toast', 'api', 'bust', 'refresh', src + '; return rc5MatchBook;')(sdate, esc, money, md34, toast, null, null, null);
  f(1, { id: 9, date: '2026-10-25', amount: -8410, payee: 'Home Depot' }, [{ id: 1, date: '2026-10-25', amount: -9000, description: 'A' }, { id: 2, date: '2026-10-20', amount: -8410, description: 'B' }, { id: 3, date: '2026-10-25', amount: 8410, description: 'C' }]);
  assert.ok(shown.indexOf('value="2"') < shown.indexOf('value="1"'), 'same amount first'); assert.ok(!shown.includes('value="3"'), 'money in is not offered for money out');
  assert.match(app, /\(x\.books \|\| \[\]\)\.filter\(e => !\(e\.txns \|\| \[\]\)\.length && !e\.cleared\)/);
});
test('r5: phone shows a chip row and Bank / Your books tabs on the same page', () => {
  const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
  assert.match(css, /\.rc5cols\[data-show=bank\] \.rc5books,\.rc5cols\[data-show=books\] \.rc5bank\{display:none\}/); assert.match(css, /\.rc5side\{position:static;flex-direction:row;overflow-x:auto/);
});
