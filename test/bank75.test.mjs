import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
test('d75 register row: 4 record buttons + Check station (same .rb73 size, per-account to-print badge), no small check links', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const d73 = js.slice(js.indexOf('// ===== d73 bank account'), js.indexOf('// ===== d74 bank account'));
  for (const w of ['id="rt73c"', 'id="rt73d"', 'id="rt73j"', 'id="rt73x"', 'class="rb73" id="rt73k" href="#/checkstation?bank=${bid}"', 'm/x66/checks?status=print&bank=${bid}', 'class="bd75"']) assert.ok(d73.includes(w), w);
  assert.ok(!d73.includes('class="rt73s"'));
});
test('d75 Check station page and Reconcile "To do" line', () => {
  const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const i = js.indexOf('// ===== d75 bank account'); assert.ok(i > 0); const seg = js.slice(i, i + 12000);
  for (const w of ['MV.checkstation = async', 'Write check', 'Print selected', 'Checks to print', 'Recent checks', 'print66(ids', "{ back }", 'checkstation: \'banks\'',
    'To do', 'Reconciled through', 'Statement through', 'to confirm', 'missing from books', 'Undeposited', 'Difference', 'All caught up', "tab74(r) !== 'rec'", "tb.insertAdjacentHTML('afterend'"]) assert.ok(seg.includes(w), w);
  const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8'); const c = css.slice(css.indexOf('/* ===== d75'), css.includes('/* ===== d76') ? css.indexOf('/* ===== d76') : undefined); // own blocks only (d76 top bar sets box-shadow:none overrides)
  assert.ok(/\.rt73b \.rb73\{flex:1 1 0;min-width:max-content\}/.test(c)); assert.ok(/nth-child\(odd\):last-child\{grid-column:1\/-1\}/.test(c)); assert.ok(!/box-shadow/.test(c)); assert.ok(/border-radius:6px/.test(c));
});
