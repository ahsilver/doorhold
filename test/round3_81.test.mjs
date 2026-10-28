import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const app = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'); const wk = fs.readFileSync(path.join(SITE, '_worker.js'), 'utf8');
// round 3 of Bank lines to add (owner voice note, Oct 27 3:57 PM)
const normDesc = (() => { const a = wk.indexOf('const GENERIC81'), b = wk.indexOf('const SCAN_V81'); return new Function(wk.slice(a, b) + '; return normDesc;')(); })();
test('r3: Zelle payments to different people no longer share one "booked like this before" key', () => {
  assert.notEqual(normDesc('Zelle payment to Sara Lane broker JPM99cz77yd5'), normDesc('Zelle payment to Bob handyman for "fixing sewer pipe'));
  assert.equal(normDesc('Zelle payment to Sara Lane broker JPM99cz77yd5'), 'ZELLE PAYMENT TO SARA LANE');
  assert.equal(normDesc('HOME DEPOT #4521 NEWARK NJ'), 'HOME DEPOT NEWARK'); // ordinary merchants keep the 3-word key
});
test('r3: guesses from the old key are made again once', () => { assert.match(wk, /sv81\.v !== SCAN_V81/); assert.match(wk, /key81: normDesc\(desc\), n81: n/); });
test('r3: every row offers Not this / Match to something in my books / Record new with all 8 kinds', () => {
  for (const s of ['data-not81', 'Match to something in my books', 'Record new', "['payment', 'Rent / tenant payment', 'in']", "['charge', 'Tenant charge', 'both']", "['income', 'Other income', 'in']", "['expense', 'Expense', 'out']", "['bill_new', 'Bill (record the bill, this payment pays it)', 'out']", "['asset', 'Purchase / asset', 'both']", "['transfer_to', 'Transfer between my accounts', 'both']", "['owner', 'Owner draw / contribution', 'both']"]) assert.ok(app.includes(s), s);
});
test('r3: sides are labelled by source and the guess says where it came from', () => {
  assert.match(app, /FROM YOUR BANK/); assert.match(app, /'NOT IN YOUR BOOKS YET'/); // r6: designer wording for the new-entry side assert.match(app, /'IN YOUR BOOKS'/); assert.match(app, /Guess: bank text “\$\{esc\(s\.key81\)\}” was booked \$\{s\.n81\}× before to/);
});
test('r3: a chosen row stays chosen and Post sends the choice (guess fields cleared)', () => {
  assert.match(app, /localStorage\.setItem\(OVK81\(\), JSON\.stringify\(CU80\.ov\)\)/); assert.match(app, /fresh81 \? \{ property_id: null, vendor_id: null/); assert.match(app, /overrides: ovs/);
});
test('r3: no pre-tick for plain deposits or Undeposited Funds', () => { assert.match(app, /function safeTick81/); assert.match(app, /if \(s\.type === 'income'\) return false/); assert.match(app, /\/undeposited\/i\.test\(a\.name\)\) return false/); });
test('r3: server records the new kinds and finds entries to match', () => {
  for (const k of ["case 'charge':", "case 'bill_new':", "case 'asset':", "case 'owner':"]) assert.ok(wk.includes(k), k);
  assert.match(wk, /b === 'find' && c && M === 'GET'\) return J\(await catchupFind81/); assert.match(wk, /async function catchupFind81/);
});
test('r3: one loading state — no old copy painted first, Match rows hidden until drawn', () => {
  assert.match(app, /if \(!e\.stale && Date\.now\(\) - e\.t < 30000\) return v;/); assert.match(app, /root\.classList\.add\('cu81wait'\)/); assert.match(app, /\.cu81wait \.row\.cu/);
});
test('r3: inside one bank the undeposited total is that bank only', () => { assert.match(wk, /q\.summary && \+q\.bank/); assert.match(app, /undeposited\?summary=1&bank=' \+ bid/); assert.match(app, /Deposit these/); });
