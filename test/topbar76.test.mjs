import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const js = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
test('d76 global top bar: last shell wrapper splits global items from the page header', () => {
  const i = js.indexOf('// ===== d76 global top bar'); assert.ok(i > 0); const seg = js.slice(i, i + 8000);
  const w76 = js.indexOf('const _sh76 = shell'); assert.ok(w76 > i);
  const others = [...js.matchAll(/const (_[a-zA-Z0-9]+) = shell;/g)].map(m => m.index).filter(x => x !== w76);
  assert.ok(others.length >= 4 && others.every(x => x < w76), 'd76 wraps every earlier shell wrapper');
  for (const w of ["['tc48', 'fb48', 'top-new', 'gsbtn', 'avatar']", "className = 'top gb76'", "className = 'mn76'", "'data-act', 'drawer24'", "className = 'co76'", "className = 'ph76'", "className = 'pt76'", "className = 'pa76'", "classList.add('bk76')", "main.insertBefore(ph, main.firstChild)", ".fab24", "hd.replaceWith(nb)", "console.error('gb76'", "main > .ph76", "[data-fb48]"]) assert.ok(seg.includes(w), w);
  assert.ok(js.includes("$('.ph76 h1') || $('header.top h1')"), 'feedback page title reads the page header');
});
test('d76 css: own row with border, 32px controls, 6px radius, no shadows, phone compact bar', () => {
  const i = css.indexOf('/* ===== d76'); assert.ok(i > 0); const seg0 = css.slice(i); const seg = seg0.includes('/* ===== d79') ? seg0.slice(0, seg0.indexOf('/* ===== d79')) : seg0;
  for (const w of ['header.top.gb76{position:sticky', 'border-bottom:1px solid #E5E7EB', '.top.gb76 .gsbtn{', 'height:32px', 'border-radius:6px', '.ph76 h1{', '@media (max-width:899px)', '.gb76 .mn76{display:inline-flex}', '@media (max-width:600px){.top.gb76 .fb48{display:none}}', '#0E7C72']) assert.ok(seg.includes(w), w);
  assert.ok(!/box-shadow:(?!none)/.test(seg), 'no shadows');
  assert.ok(!/\p{Extended_Pictographic}/u.test(seg + js.slice(js.indexOf('// ===== d76 global top bar'), js.indexOf('// ===== d76 global top bar') + 8000)), 'no emoji');
});
