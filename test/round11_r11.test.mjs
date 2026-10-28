import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8'), app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(SITE, 'app.css'), 'utf8');
const fn = (s, name) => { const a = s.indexOf('async function ' + name + '('); return s.slice(a, s.indexOf('\n}\n', a) + 2); };
const need = (c, m, code) => { if (!c) { const e = new Error(m); e.status = code || 400; throw e; } };
const mk = () => new Function('need', fn(wk, 'set11') + '; return set11;')(need);
const fakeD = (bank, agg, batch) => ({ one: async (sql) => /FROM bank_accounts/.test(sql) ? bank : /GROUP BY batch/.test(sql) ? batch : agg });
const U = id => new URL('https://x/api/m/x53/set11?bank=' + id);

test('r11 set11: not connected bank reports lines and last import, no secrets', async () => {
  const set11 = mk();
  const r = await set11(fakeD({ id: 2, name: 'Chase', kind: 'bank', feed: null, feed_meta: null }, { n: 1328, at: '2026-10-20 14:00:00', last_date: '2026-10-16' }, { n: 41, at: '2026-10-20 14:00:00' }), U(2));
  assert.equal(r.feed, null); assert.equal(r.feed_updated, null); assert.equal(r.lines, 1328); assert.equal(r.last_import, '2026-10-20 14:00:00'); assert.deepEqual(r.last_batch, { n: 41, at: '2026-10-20 14:00:00' });
});
test('r11 set11: connected feed exposes only status + last sync, never tokens', async () => {
  const set11 = mk();
  const r = await set11(fakeD({ id: 3, kind: 'bank', feed: 'plaid', feed_meta: JSON.stringify({ status: 'ok', last_sync: '2026-10-27', access_token: 'SECRET' }) }, { n: 0 }, null), U(3));
  assert.equal(r.feed, 'plaid'); assert.equal(r.feed_status, 'ok'); assert.equal(r.feed_updated, '2026-10-27'); assert.equal(r.lines, 0); assert.equal(r.last_batch, null);
  assert.ok(!JSON.stringify(r).includes('SECRET'));
  const m = await set11(fakeD({ id: 4, kind: 'bank', feed: 'manual', feed_meta: '{bad' }, { n: 2 }, null), U(4)); assert.equal(m.feed, null);
});
test('r11 set11: unknown bank 404, and route is GET-only read', async () => {
  const set11 = mk(); await assert.rejects(set11(fakeD(null, {}, null), U(9)), e => e.status === 404);
  const blk = wk.slice(wk.indexOf('async function set11(')); assert.ok(!/\b(INSERT|UPDATE|DELETE)\b/.test(blk.slice(0, blk.indexOf('{ const _x53s11'))));
  assert.match(wk, /parts\[1\] === 'set11' && req\.method === 'GET'/);
});
test('r11 client: Settings button beside Reconcile statement opens the 3-section panel', () => {
  const blk = app.slice(app.indexOf('// ===== r11'));
  assert.match(blk, /class="btn sm set11b"/); assert.match(blk, /rb\.insertAdjacentHTML\('afterend'/);
  for (const s of ['Bank feed', 'Bank rules', 'Reconcile settings', 'Not connected', 'Connect bank', 'Coming soon: automatic bank feed.', 'For now, upload a statement file.', 'Upload statement', 'Update feed now', 'Last updated', 'Imported lines', 'New rule', 'Auto-accept exact matches', 'Off · you confirm with Accept all exact', 'Past reconciliations', 'within 3 days', 'Within 10 days'])
    assert.ok(blk.includes(s), s);
  assert.match(blk, /id="u11" disabled/); assert.match(blk, /importSheet\(bid\)/); assert.match(blk, /edit71\(r, X, ch, L/); assert.match(blk, /bankSheet47\(bid/); assert.match(blk, /m\/x53\/rec9\/undo/); assert.match(blk, /m\/x71\/rules\/\$\{r\.id\}\/delete/);
  assert.match(blk, /z\.latest \?/);
});
test('r11 css: side panel desktop, bottom sheet phone, slim 30px teal button, no shadows', () => {
  const c = css.slice(css.indexOf('/* r11:'));
  assert.match(c, /\.set11b\{[^}]*height:30px/); assert.match(c, /#0E7C72/); assert.match(c, /\.s11p\{[^}]*width:420px/);
  assert.match(c, /@media \(max-width:600px\)\{[\s\S]*\.s11p\{[^}]*border-radius:12px 12px 0 0/); assert.ok(!/box-shadow/.test(c));
});
