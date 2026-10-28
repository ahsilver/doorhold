import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
// round 2 of Bank lines to add (owner, Oct 27)
test('r2: catch-up rows say what Post does, with BANK / YOUR BOOKS sides', () => {
  // round 3 reworded the sides: FROM YOUR BANK / IN YOUR BOOKS / WILL BE ADDED TO YOUR BOOKS, and "Post links the bank line to this entry"
  assert.match(app, /Post links the bank line to this entry/); assert.match(app, /YOUR BOOKS/); assert.match(app, /class="bk80">FROM YOUR BANK/);
});
test('r2: plain words replace Sure / Likely / Guess', () => { assert.match(app, /const CONFL80 = \{ high: 'Confident', medium: 'Probably', low: 'Not sure'/); assert.doesNotMatch(app.slice(app.indexOf('round2 Bank lines to add')), /\bCONF\b[^L]/); });
test('r2: money in offers tenant payment and undeposited match; account/property/tenant pickers', () => {
  assert.match(app, /\['payment', 'Rent \/ tenant payment', 'in'\]/); assert.match(app, /Undeposited payments \(this bank\)/); assert.match(app, /data-a80/); assert.match(app, /data-p80/); assert.match(app, /data-t80/);
});
test('r2: Needs you rows cannot be ticked until chosen; Post disabled at 0; no Split on matched rows', () => {
  assert.match(app, /ck\.disabled = !ok/); assert.match(app, /p\.textContent = `Post \$\{n\}`; p\.disabled = !n;/); assert.match(app, /e\.type === 'match'\) \$\$\('\.cu-split', row\)\.forEach\(a => a\.remove\(\)\)/);
});
test('r2: server approves a batch with per-line overrides', () => { assert.match(wk, /x\.overrides\[id\]/); });
test('r2: find panel lists only this bank\u2019s undeposited items (others behind a link)', () => { assert.match(wk, /r\.bank80 = h && h\.id \?/); assert.match(app, /S\.all80 \|\| i\.bank80 !== 'other'/); });
test('r2: a new version reloads at most twice in two minutes on page change', () => { assert.match(app, /pm_reload_n/); });
