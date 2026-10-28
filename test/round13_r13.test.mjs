import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
const A = fs.readFileSync(new URL('../site/app.js', import.meta.url), 'utf8'); const W = fs.readFileSync(new URL('../site/_worker.js', import.meta.url), 'utf8'); const C = fs.readFileSync(new URL('../site/app.css', import.meta.url), 'utf8');
const grab = n => { const i = A.indexOf('function ' + n + '('); assert.ok(i >= 0, n); let dep = 0, j = A.indexOf('{', i); for (; j < A.length; j++) { if (A[j] === '{') dep++; else if (A[j] === '}' && !--dep) break; } return A.slice(i, j + 1); };
const ctx = new Function(grab('st13') + grab('uf13') + grab('acct13') + grab('flag13') + '; return { st13, uf13, acct13, flag13 };')();
test('r13 status letter: R reconciled, C cleared, U blank', () => {
  assert.equal(ctx.st13({ st: 'R', cleared: true }), 'R'); assert.equal(ctx.st13({ st: 'C' }), 'C'); assert.equal(ctx.st13({ st: '', cleared: false }), 'U'); assert.equal(ctx.st13({ cleared: true }), 'C'); });
test('r13 Undeposited Funds: linked deposit shows tenant payment, unlinked is flagged', () => {
  const ok = { category: 'Undeposited Funds', amount: 40000, dep13: { n: 1, amt: 40000, ok: true } }; const bad = { category: 'Undeposited Funds', amount: 40000, dep13: { n: 0, amt: 0, ok: false } };
  assert.equal(ctx.acct13(ok), 'Tenant payment'); assert.equal(ctx.flag13(ok), false); assert.equal(ctx.flag13(bad), true); assert.equal(ctx.flag13({ category: 'Repairs' }), false);
  assert.equal(ctx.acct13({ category: 'Undeposited Funds', dep13: { n: 3, amt: 1, ok: true } }), '3 tenant payments'); });
test('r13 account page has status column, filter chips and the check tag', () => {
  assert.match(A, /data-a12s="\$\{k\}"/); assert.match(A, /class="a12st" title="C = cleared, R = reconciled">C\/R</); assert.match(A, /Check: booked to Undeposited Funds/);
  assert.match(A, /F\.s === 'all' \|\| st13\(e\) === F\.s/); assert.match(C, /\.a12hd,\.a12w\{grid-template-columns:22px 62px/); assert.match(C, /grid-template-areas:"s p m" "s p b"/); });
test('r13 server marks Undeposited Funds deposits with their linked payments (read only)', () => {
  const i = W.indexOf('const _rg13 = register24'); assert.ok(i > W.indexOf('const _rg71 = register24'));
  const b = W.slice(i, W.indexOf('}; }', i)); assert.match(b, /deposit_id IN/); assert.ok(!/UPDATE|INSERT|DELETE/.test(b)); });
