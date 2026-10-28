import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
const ix = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
// round 6 item 1: a stale build can never keep running
test('r6: index.html loads the bundle and css with a build-hash query', () => {
  assert.match(ix, /\/app\.min\.js\?v=[0-9a-f]{10}/); assert.match(ix, /\/app\.min\.css\?v=[0-9a-f]{10}/);
  const min = fs.readFileSync(path.join(SITE, 'app.min.js'), 'utf8'); assert.ok(!min.includes('__PM_BUILD__'), 'build id stamped into the bundle');
});
test('r6: the worker serves any HTML (app shell) with no-cache/no-store', async () => {
  const src = wk.slice(wk.indexOf('function assetCache6('), wk.indexOf('async function pmFetch23('));
  const assetCache6 = new Function('PM_BUILD', src + '; return assetCache6;')('abc1234567');
  const h = assetCache6(new Response('<html>', { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' } }), new URL('https://x.test/'));
  assert.match(h.headers.get('cache-control'), /no-store/); assert.match(h.headers.get('cache-control'), /no-cache/); assert.equal(h.headers.get('x-pm-build'), 'abc1234567');
  const sw = assetCache6(new Response('x', { headers: { 'content-type': 'text/javascript' } }), new URL('https://x.test/app/sw.js')); assert.match(sw.headers.get('cache-control'), /no-store/);
  const js = assetCache6(new Response('x', { headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=0, must-revalidate' } }), new URL('https://x.test/app.min.js?v=1234567890'));
  assert.doesNotMatch(js.headers.get('cache-control'), /immutable/);
  assert.match(wk, /return assetCache6\(await env0\.ASSETS\.fetch\(req\), url\)/);
});
test('r6: client checks the server build on load, page change, tab return; hard-reloads once per build with a guard', () => {
  assert.match(app, /pmKillSW6\(\); pmCheckBuild6\(true\);/);
  assert.match(app, /addEventListener\('hashchange', \(\) => \{ if \(pmReloadPending[^\n]*pmCheckBuild6\(\); \}\);/);
  assert.match(app, /visibilitychange', \(\) => \{ if \(document\.visibilityState === 'visible'\) pmCheckBuild6\(\); \}/);
  assert.match(app, /sessionStorage\.getItem\('pm_hard_for'\) === sb\) \{ pmStaleBar6\(sb\); return false; \}/);
  assert.match(app, /u\.searchParams\.set\('_b', sb\); location\.replace/);
});
test('r6: hard reload logic: once per server build, then the Reload bar (no loop)', () => {
  const src = app.slice(app.indexOf('function pmHardReload6('), app.indexOf('function pmNewBuild('));
  const ss = {}; const sessionStorage = { getItem: k => (k in ss ? ss[k] : null), setItem: (k, v) => { ss[k] = String(v); } };
  const lsKeys = { pm_swr_x: 1, other: 1 }; const localStorage = new Proxy(lsKeys, {}); localStorage.removeItem = k => { delete lsKeys[k]; };
  const replaced = []; const location = { href: 'https://x.test/#/catchup/2', replace: u => replaced.push(u) }; let bars = 0;
  const f = new Function('sessionStorage', 'localStorage', 'location', 'pmKillSW6', 'pmStaleBar6', 'URL', src + '; return pmHardReload6;')(sessionStorage, { removeItem: k => delete lsKeys[k], ...lsKeys }, location, () => { }, () => bars++, URL);
  assert.equal(f('b2'), true); assert.deepEqual(replaced, ['/?_b=b2#/catchup/2']);
  assert.equal(f('b2'), false, 'second time for the same build: no reload'); assert.equal(bars, 1); assert.equal(replaced.length, 1);
});
test('r6: the build id is shown small in every page footer; a root service worker removes itself', () => {
  assert.match(app, /<div class="pmver6">DoorHold · version \$\{esc\(PM_BUILD\)\}<\/div>/);
  const sw = fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8'); assert.match(sw, /registration\.unregister\(\)/);
});
