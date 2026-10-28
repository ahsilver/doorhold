// d79: one shared dropdown style + open list for every native <select> (styling only)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
const SITE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'site');
const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
const blk = js.slice(js.indexOf('// ===== d79 dropdowns'), js.indexOf('// ===== d80') > 0 ? js.indexOf('// ===== d80') : undefined);
test('d79 client: shared open list keeps the native select as the source of truth', () => {
  assert.ok(js.indexOf('// ===== d79 dropdowns') > 0);
  assert.ok(js.indexOf('// ===== d79 dropdowns') < js.lastIndexOf('\nrender();\n})();'), 'inside the app IIFE, before the final render()');
  for (const s of ["new Event('change', { bubbles: true })", "new Event('input', { bubbles: true })", 's.selectedIndex = idx', '!s.multiple', '!s.dataset.cb49', "role=\"listbox\"", "role=\"option\"", 'aria-selected', "role=\"group\"", 'aria-activedescendant', "'Escape'", "'ArrowDown'", "'Enter'", 'touchend', "'(max-width: 600px)'", 'dd79s', 'No matches']) assert.ok(blk.includes(s), s);
  assert.ok(!/\bfetch\(|api\(/.test(blk.slice(0, blk.indexOf('render();'))), 'no data calls');
});
test('d79 css: slim 32px closed control, readable font with tabular numbers, phone 40px + 44px sheet rows', () => {
  const seg = css.slice(css.indexOf('/* ===== d79')); assert.ok(seg.length > 1000);
  for (const s of ['height:32px!important', 'border-radius:6px!important', '--dd79-b:#E5E7EB', 'tabular-nums', 'font-size:13.5px!important', 'InterV', '.dd79 .dd79h{', 'text-transform:uppercase', 'scrollbar-width:thin', '.dd79 .dd79o.act{background:#F3F4F6}', '@media (max-width:600px)', 'height:40px!important', 'min-height:44px', 'env(safe-area-inset-bottom)', 'focus-visible']) assert.ok(seg.includes(s), s);
  assert.ok(!/\p{Extended_Pictographic}/u.test(seg + js.slice(js.indexOf('// ===== d79 dropdowns'), js.lastIndexOf('\nrender();\n})();'))), 'no emoji');
});
