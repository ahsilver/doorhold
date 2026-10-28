/*
 * bank-statement.js (d51) — reads bank lines out of what the browser got from a bank file.
 * Classic script (globals) + CommonJS export for the node tests. No network, no DOM.
 *   bs51Date(token, year, endMonth)        -> 'YYYY-MM-DD' | null
 *   bs51Money(token)                        -> { v: cents, sign: -1|1|0 } | null   (sign 0 = no sign written)
 *   bs51AutoMap(rows)                       -> { head: rowIndex|-1, map: {date, desc, amount, debit, credit, balance} }
 *   bs51Rows(rows, head, map, opts)         -> { rows:[{date, description, amount, balance}], skipped }
 *   bs51Statement(text, opts)               -> PDF statement text (layout lines from closing-extract.js) ->
 *        { rows:[{date, description, amount, balance}], beginning, ending, start, end, adds:{ok, diff}|null, layout }
 */
(function (root) {
  'use strict';
  var MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function monOf(x) { x = String(x || '').toLowerCase(); return MON[x.slice(0, 4)] || MON[x.slice(0, 3)] || 0; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ok(y, m, d) { if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100)) return null; var dt = new Date(Date.UTC(y, m - 1, d)); if (dt.getUTCMonth() !== m - 1) return null; return y + '-' + pad(m) + '-' + pad(d); }
  function yr(y) { y = +y; return y < 100 ? 2000 + y : y; }
  function guessY(m, year, endMonth) { if (!year) year = new Date().getFullYear(); return endMonth && m > endMonth ? year - 1 : year; }
  function bs51Date(s, year, endMonth) {
    s = String(s == null ? '' : s).trim().replace(/\s+/g, ' ').replace(/,$/, '');
    if (!s) return null;
    var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/))) return ok(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) return ok(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?: .*)?$/))) return ok(yr(m[3]), +m[1], +m[2]);
    if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/))) return ok(guessY(+m[1], year, endMonth), +m[1], +m[2]);
    if ((m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/))) { var mo = monOf(m[1]); if (mo) return ok(+m[3], mo, +m[2]); }
    if ((m = s.match(/^(\d{1,2})[ \-]([A-Za-z]{3,9})\.?[ \-,]+(\d{2}|\d{4})$/))) { var mo2 = monOf(m[2]); if (mo2) return ok(yr(m[3]), mo2, +m[1]); }
    if ((m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2})$/))) { var mo3 = monOf(m[1]); if (mo3) return ok(guessY(mo3, year, endMonth), mo3, +m[2]); }
    if ((m = s.match(/^(\d{1,2})[ \-]([A-Za-z]{3})$/))) { var mo4 = MON[m[2].toLowerCase()]; if (mo4) return ok(guessY(mo4, year, endMonth), mo4, +m[1]); }
    if ((m = s.match(/^(\d{5})(?:\.\d+)?$/)) && +m[1] > 32000 && +m[1] < 60000) { var dt = new Date(Date.UTC(1899, 11, 30) + (+m[1]) * 864e5); return ok(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); }
    if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return ok(+m[1], +m[2], +m[3]);
    return null;
  }
  function bs51Money(s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return null;
    var neg = 0, pos = 0;
    if (/\bDR\.?$/i.test(s)) { neg = 1; s = s.replace(/\s*DR\.?$/i, ''); } else if (/\bCR\.?$/i.test(s)) { pos = 1; s = s.replace(/\s*CR\.?$/i, ''); }
    if (/^\(.*\)$/.test(s)) { neg = 1; s = s.slice(1, -1); }
    s = s.replace(/^(USD|US\$)\s*/i, '').trim();
    if (/^-/.test(s) || /^\$\s*-/.test(s)) { neg = 1; s = s.replace(/^-?\s*\$?\s*-?/, ''); }
    else if (/-$/.test(s)) { neg = 1; s = s.slice(0, -1); }
    else if (/^\+/.test(s)) { pos = 1; s = s.slice(1); }
    s = s.replace(/^\$\s*/, '').replace(/,/g, '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s) && !/^\.\d{1,2}$/.test(s)) return null;
    var v = Math.round(parseFloat(s) * 100);
    return { v: neg ? -v : v, sign: neg ? -1 : pos ? 1 : 0 };
  }
  // ---------- spreadsheets (CSV / Excel): find the heading row and the columns ----------
  var H = {
    date: [/^(posting|posted|transaction|trans\.?|txn|value|effective) ?date$/i, /^date$/i, /date/i],
    desc: [/^(description|payee|merchant|transaction description|narrative)$/i, /^(details|name|memo)$/i, /descr|payee|merchant|detail|narrat|memo|^name|transaction$/i],
    amount: [/^(amount|transaction amount|amount \(\$\)|amount \(usd\)|net amount|value)$/i, /^amount/i],
    debit: [/^(debit|debits|withdrawal|withdrawals|money out|paid out|payments?|debit amount|charges?)$/i, /debit|withdraw|money out|paid out/i],
    credit: [/^(credit|credits|deposit|deposits|money in|paid in|credit amount)$/i, /credit|deposit|money in|paid in/i],
    balance: [/^(balance|running balance|ledger balance|available balance)$/i, /balance|\bbal\b/i]
  };
  function pick(head, k, used) { for (var r = 0; r < H[k].length; r++) for (var i = 0; i < head.length; i++) if (used.indexOf(i) < 0 && H[k][r].test(String(head[i] || '').trim())) return i; return -1; }
  function bs51AutoMap(rows) {
    var head = -1;
    for (var i = 0; i < Math.min(rows.length, 25); i++) { var r = rows[i].map(function (c) { return String(c || '').trim(); }); if (r.some(function (c) { return /date/i.test(c) && c.length < 30; }) && r.some(function (c) { return /amount|debit|credit|withdraw|deposit|money (in|out)/i.test(c) && c.length < 30; })) { head = i; break; } }
    var map = { date: -1, desc: -1, amount: -1, debit: -1, credit: -1, balance: -1 };
    if (head >= 0) {
      var h = rows[head], used = [];
      ['date', 'amount', 'debit', 'credit', 'balance', 'desc'].forEach(function (k) { var j = pick(h, k, used); if (j >= 0 && !(k === 'desc' && j === map.date)) { map[k] = j; used.push(j); } });
      if (map.amount >= 0 && (map.debit >= 0 || map.credit >= 0) && !/^amount/i.test(String(h[map.amount]))) map.amount = -1;
      if (map.amount >= 0) { map.debit = -1; map.credit = -1; }
    } else {
      // no heading row: the first column that holds dates, the last money columns
      var sample = rows.slice(0, 30); var n = Math.max.apply(null, sample.map(function (r) { return r.length; }).concat([0]));
      var isD = [], isM = [];
      for (var c = 0; c < n; c++) { var d = 0, m = 0, t = 0; sample.forEach(function (r) { var v = String(r[c] || '').trim(); if (!v) return; t++; if (bs51Date(v)) d++; else if (bs51Money(v)) m++; }); isD[c] = t && d / t > 0.6; isM[c] = t && m / t > 0.6; }
      map.date = isD.indexOf(true); var ms = []; for (var c2 = 0; c2 < n; c2++) if (isM[c2]) ms.push(c2);
      if (ms.length === 1) map.amount = ms[0]; else if (ms.length >= 2) { map.amount = ms[0]; map.balance = ms[ms.length - 1]; }
      for (var c3 = 0; c3 < n; c3++) if (c3 !== map.date && !isM[c3] && !isD[c3]) { map.desc = c3; break; }
    }
    return { head: head, map: map };
  }
  function bs51Rows(rows, head, map, opts) {
    opts = opts || {}; var out = [], skipped = 0, flip = opts.flip ? -1 : 1;
    for (var i = head + 1; i < rows.length; i++) {
      var r = rows[i] || []; var g = function (k) { return map[k] >= 0 ? String(r[map[k]] == null ? '' : r[map[k]]).trim() : ''; };
      var date = bs51Date(g('date')); if (!date) { if (r.some(function (c) { return String(c || '').trim(); })) skipped++; continue; }
      var amt = null;
      if (map.amount >= 0) { var a = bs51Money(g('amount')); amt = a ? a.v : null; }
      else { var dr = bs51Money(g('debit')), cr = bs51Money(g('credit')); if (dr || cr) amt = (cr ? Math.abs(cr.v) : 0) - (dr ? Math.abs(dr.v) : 0); }
      if (amt == null || !amt) { skipped++; continue; }
      var b = bs51Money(g('balance'));
      out.push({ date: date, description: g('desc').replace(/\s+/g, ' '), amount: amt * flip, balance: b ? b.v : null });
    }
    return { rows: out, skipped: skipped };
  }
  // ---------- PDF statements ----------
  var MONEY_RE = /\(?-?\$?\s?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\)?-?(?:\s?(?:CR|DR)\b)?/g;
  var DTOK = /^(\d{1,2}\/\d{1,2}(?:\/(?:\d{4}|\d{2}))?|\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2}(?:-(?:\d{4}|\d{2}))?|[A-Za-z]{3,4}\.? \d{1,2}(?:,? \d{4})?|\d{1,2} [A-Za-z]{3}(?: \d{4})?)(?=\s|$)/;
  var SKIP = /\b(beginning|opening|starting|previous|ending|closing|new|statement|average|daily|ledger|available|minimum|collected) (daily )?balance\b|balance (forward|brought forward|carried forward)|^total\b|\btotals?\b.*\b(deposits|withdrawals|checks|credits|debits|fees)\b|\bsubtotal\b|^page \d/i;
  var IN_H = /\b(deposits?|credits?|additions?|money in|incoming|interest (paid|earned))\b/i;
  var OUT_H = /\b(withdrawals?|debits?|subtractions?|checks?( paid)?|payments?|purchases?|fees?|charges?|money out|outgoing|card transactions?)\b/i;
  function tokensEnd(raw) {
    // money tokens at the end of the line, with their character columns
    var toks = [], m; MONEY_RE.lastIndex = 0;
    while ((m = MONEY_RE.exec(raw))) toks.push({ s: m[0], at: m.index, end: m.index + m[0].length });
    var tail = []; var stop = raw.replace(/\s+$/, '').length;
    for (var i = toks.length - 1; i >= 0; i--) { var t = toks[i]; var between = raw.slice(t.end, stop); if (/\S/.test(between)) break; tail.unshift(t); stop = t.at; }
    return { tail: tail, descEnd: stop };
  }
  function bs51Statement(text, opts) {
    opts = opts || {};
    var raws = String(text || '').replace(/\f/g, '\n').split('\n');
    var flat = raws.map(function (l) { return l.replace(/\s+/g, ' ').trim(); });
    var all = flat.join('\n');
    var DT = '(?:[A-Za-z]{3,9}\\.? \\d{1,2},? \\d{4}|\\d{1,2}/\\d{1,2}/\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2} [A-Za-z]{3,9} \\d{4})';
    var start = null, end = null, m;
    if ((m = all.match(new RegExp('(' + DT + ')\\s*(?:through|thru|to|until|-|–|—)\\s*(' + DT + ')', 'i')))) { start = bs51Date(m[1]); end = bs51Date(m[2]); }
    if (!end && (m = all.match(new RegExp('(?:statement (?:period|date)|closing date|period ending|ending|as of)[^\\n]{0,24}?(' + DT + ')', 'i')))) end = bs51Date(m[1]);
    if (!end) { var best = null, re = new RegExp(DT, 'g'), x; while ((x = re.exec(all))) { var d = bs51Date(x[0]); if (d && (!best || d > best)) best = d; } end = best; }
    var year = end ? +end.slice(0, 4) : null, endM = end ? +end.slice(5, 7) : null;
    var MON_S = '\\(?-?\\$?\\s?(?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2}\\)?-?(?:\\s?(?:CR|DR)\\b)?';
    function balOf(re) { for (var i = 0; i < flat.length; i++) { var q = flat[i].match(re); if (q) { var v = bs51Money(q[1]); if (v) return v.v; } } return null; }
    var beginning = balOf(new RegExp('(?:beginning|opening|starting|previous) balance\\b.{0,40}?(' + MON_S + ')(?!\\S)', 'i'));
    if (beginning == null) beginning = balOf(new RegExp('balance (?:forward|brought forward)\\b.{0,40}?(' + MON_S + ')(?!\\S)', 'i'));
    var ending = balOf(new RegExp('(?:ending|closing|new|statement) balance\\b.{0,40}?(' + MON_S + ')(?!\\S)', 'i'));
    if (!end) { var em = all.match(new RegExp('(?:ending|closing) balance (?:on|as of) (' + DT + ')', 'i')); if (em) end = bs51Date(em[1]); }
    // column headings: where Debit / Credit / Balance sit on the line (character columns from the layout text)
    var cols = null, sec = 0, cand = [], last = null, conts = 0;
    for (var li = 0; li < raws.length; li++) {
      var raw = raws[li].replace(/\s+$/, ''), t = flat[li];
      if (!t) { last = null; continue; }
      var tk = tokensEnd(raw);
      var lo = t.toLowerCase();
      if (!tk.tail.length) {
        if (/\bdate\b/i.test(t) && /(description|transaction|details|payee|amount|debit|credit|withdraw|deposit|balance)/i.test(t)) {
          var at = function (re) { var q = raw.search(re); return q < 0 ? -1 : q; };
          cols = { debit: at(/withdrawals?|debits?|money out|paid out|payments|subtractions/i), credit: at(/deposits?|credits?|money in|paid in|additions/i), balance: at(/balance/i), amount: at(/amount/i) };
          if (/withdraw|debit|subtraction|money out|paid out/i.test(t) && !/deposit|credit|addition|money in/i.test(t)) sec = -1; else if (/deposit|credit|addition|money in/i.test(t) && !/withdraw|debit|subtraction|money out|paid out/i.test(t)) sec = 1;
          last = null; continue;
        }
        if (t.length < 70 && !DTOK.test(t)) {
          if (IN_H.test(t) && !OUT_H.test(t)) { sec = 1; last = null; continue; }
          if (OUT_H.test(t) && !IN_H.test(t)) { sec = -1; last = null; continue; }
        }
        // a description that runs onto the next line
        if (last && conts < 2 && !DTOK.test(t) && !SKIP.test(t) && !/\b(page|continued|member fdic|account (number|summary)|customer service|www\.|\.com\b)/i.test(t) && t.length < 90) { last.description += ' ' + t; conts++; continue; }
        last = null; continue;
      }
      var dm = t.match(DTOK), chk = null;
      if (!dm) { chk = t.match(/^(\d{3,6})\s*[\^*]?\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?=\s)/); }
      if (!dm && !chk) { last = null; continue; }
      var dtok = dm ? dm[1] : chk[2];
      var date = bs51Date(dtok, year, endM); if (!date) { last = null; continue; }
      var lead = raw.search(/\S/), descStart = raw.indexOf(dtok, lead) + dtok.length;
      var desc = raw.slice(descStart, tk.descEnd).replace(/\s+/g, ' ').trim();
      var d2 = desc.match(DTOK); if (d2 && bs51Date(d2[1], year, endM)) desc = desc.slice(d2[0].length).trim(); // posting + transaction dates
      if (chk) desc = ('Check ' + chk[1] + ' ' + desc.replace(/^[\^*]\s*/, '')).trim();
      if (SKIP.test(desc) || !desc && !chk) { last = null; continue; }
      cand.push({ date: date, description: desc, toks: tk.tail, sec: chk ? -1 : sec, cols: cols, check: !!chk });
      last = cand[cand.length - 1]; conts = 0;
    }
    if (!cand.length) return { rows: [], beginning: beginning, ending: ending, start: start, end: end, adds: null, layout: 'none' };
    var two = cand.filter(function (c) { return c.toks.length >= 2; }).length;
    var balMode = two / cand.length >= 0.6 || (cols && cols.balance >= 0 && two / cand.length >= 0.3);
    var desc0 = cand.length > 1 && cand[0].date > cand[cand.length - 1].date;
    var seq = desc0 ? cand.slice().reverse() : cand;
    var prev = beginning, rows = [], used = { delta: 0, col: 0, sign: 0, sec: 0, word: 0 };
    seq.forEach(function (c) {
      var tk = c.toks, balT = null, amtT;
      if (balMode && tk.length >= 2) { balT = tk[tk.length - 1]; var rest = tk.slice(0, -1); amtT = rest.length > 1 ? (rest.filter(function (q) { var v = bs51Money(q.s); return v && v.v; })[0] || rest[rest.length - 1]) : rest[0]; }
      else amtT = tk[tk.length - 1];
      var mv = bs51Money(amtT.s); if (!mv || !mv.v) return;
      var bv = balT ? bs51Money(balT.s) : null; var bal = bv ? bv.v : null;
      var abs = Math.abs(mv.v), sign = 0;
      if (bal != null && prev != null && Math.abs(Math.abs(bal - prev) - abs) <= 1 && bal !== prev) { sign = bal > prev ? 1 : -1; if (opts.card) sign = -sign; used.delta++; }
      else if (mv.sign) { sign = mv.sign; used.sign++; }
      else if (c.cols && c.cols.debit >= 0 && c.cols.credit >= 0) { var mid = (amtT.at + amtT.end) / 2; sign = Math.abs(mid - (c.cols.debit + 4)) < Math.abs(mid - (c.cols.credit + 4)) ? -1 : 1; used.col++; }
      else if (c.sec) { sign = c.sec; used.sec++; }
      else { sign = /\b(deposit|credit|refund|interest|transfer from|payroll|direct dep|zelle from|reversal)\b/i.test(c.description) ? 1 : -1; used.word++; }
      rows.push({ date: c.date, description: c.description, amount: sign * abs, balance: bal });
      if (bal != null) prev = bal; else if (prev != null) prev = prev + sign * abs * (opts.card ? -1 : 1);
    });
    rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var adds = null;
    if (beginning != null && ending != null) { var sum = rows.reduce(function (s, r) { return s + r.amount; }, 0); var diff = ending - (beginning + (opts.card ? -sum : sum)); adds = { ok: Math.abs(diff) <= 1, diff: diff }; }
    if (!ending && balMode) { var lastB = rows.filter(function (r) { return r.balance != null; }).pop(); if (lastB) ending = lastB.balance; }
    return { rows: rows, beginning: beginning, ending: ending, start: start, end: end || (rows.length ? rows[rows.length - 1].date : null), adds: adds, layout: balMode ? 'running balance' : cols && cols.debit >= 0 && cols.credit >= 0 ? 'debit / credit columns' : used.sec ? 'sections' : 'signed amounts', how: used };
  }
  var api = { bs51Date: bs51Date, bs51Money: bs51Money, bs51AutoMap: bs51AutoMap, bs51Rows: bs51Rows, bs51Statement: bs51Statement };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  for (var k in api) root[k] = api[k];
})(typeof window !== 'undefined' ? window : globalThis);
