(function () {
'use strict';
var app = document.getElementById('app');
var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function money(c) { var n = (c || 0) / 100; var s = '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return n < 0 ? '<span class="neg">-' + s + '</span>' : s; }
function fd(d) { if (!d) return ''; var p = d.slice(0, 10).split('-'); return M[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
function iso(y, m, d) { return new Date(Date.UTC(y, m, d, 12)).toISOString().slice(0, 10); }
function todayS() { var d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function per(k) { var t = todayS(), y = +t.slice(0, 4), m = +t.slice(5, 7) - 1;
  return { tm: [iso(y, m, 1), t], lm: [iso(y, m - 1, 1), iso(y, m, 0)], ty: [iso(y, 0, 1), t], ly: [iso(y - 1, 0, 1), iso(y - 1, 11, 31)] }[k]; }
var h = location.hash.slice(1), printMode = h === 'print' || h === 'printall', co = '', tok = h;
var mm = /^c(\d+)-([a-f0-9]{32})$/.exec(h); if (mm) { co = mm[1]; tok = mm[2]; }
var cur = 'tm';
function phSrc(id) { return printMode ? '/api/files/' + id : '/api/pub/os/' + encodeURIComponent(tok) + '/ph/' + id + (co ? '?co=' + co : ''); }
function render(x) {
  var T = x.totals, partner = x.houses.some(function (h) { return h.partners.length; }), first = esc(String(x.owner.name).split(' ')[0]);
  var html = '<header><div><div class="co">' + esc(x.company) + '</div><h1>Owner statement · ' + esc(x.owner.name) + '</h1><div class="per">' + fd(x.from) + ' – ' + fd(x.to) + '</div></div>' +
    '<div class="noprint"><button class="btn" id="pr">Print or save PDF</button></div></header>';
  if (!printMode) html += '<div class="chips noprint" role="group" aria-label="Period">' + [['tm', 'This month'], ['lm', 'Last month'], ['ty', 'This year'], ['ly', 'Last year']].map(function (p) { return '<button type="button" class="chip" data-p="' + p[0] + '" aria-pressed="' + (cur === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>';
  html += '<section class="card sum" aria-label="Summary"><div class="big"><div class="l">' + (partner ? first + "'s share of net" : 'Net') + '</div><div class="v">' + money(partner ? T.share : T.net) + '</div><div class="mut">' + x.houses.length + (x.houses.length === 1 ? ' property' : ' properties') + '</div></div>' +
    '<dl><div><dt>Rent collected</dt><dd>' + money(T.rent) + '</dd></div><div><dt>Expenses</dt><dd>' + money(T.expenses) + '</dd></div><div><dt>Mortgage</dt><dd>' + money(T.mortgage) + '</dd></div><div><dt>Net (all properties)</dt><dd>' + money(T.net) + '</dd></div></dl></section>';
  var idle = x.houses.filter(function (h) { return !(h.rent || h.expenses || h.mortgage || h.moves.length); });
  x.houses.filter(function (h) { return idle.indexOf(h) < 0; }).forEach(function (hs) {
    var rows = '<tr><td>Rent & income collected</td><td class="n">' + money(hs.rent) + '</td></tr>';
    hs.cats.forEach(function (c) { rows += '<tr class="sub"><td>' + esc(c.name) + '</td><td class="n">-' + money(c.amount) + '</td></tr>'; });
    rows += '<tr><td>Mortgage payments</td><td class="n">' + (hs.mortgage ? '-' : '') + money(hs.mortgage) + '</td></tr><tr class="t"><td>Net</td><td class="n">' + money(hs.net) + '</td></tr>';
    if (hs.partners.length) rows += '<tr class="t"><td>' + first + "'s share (" + hs.pct + '%)</td><td class="n">' + money(hs.share) + '</td></tr>';
    hs.moves.forEach(function (m) { rows += '<tr class="sub"><td>' + esc(m.what) + ' · ' + fd(m.date) + '</td><td class="n">' + (m.inn ? '' : '-') + money(m.amount) + '</td></tr>'; });
    if (hs.repairs && hs.repairs.length) { rows += '<tr class="rh"><td colspan="2">Repairs in these dates (already in expenses above)</td></tr>';
      hs.repairs.forEach(function (r) { rows += '<tr class="sub"><td><b>Request #' + r.req + '</b> · ' + esc(r.title) + ' · ' + fd(r.date) + (r.vendor ? ' · ' + esc(r.vendor) : '') + (r.photos && r.photos.length ? '<div class="phs">' + r.photos.map(function (p) { return '<figure><img src="' + phSrc(p.id) + '" alt="' + esc(p.label || 'Photo') + '" loading="lazy">' + (p.label ? '<figcaption>' + esc(p.label) + '</figcaption>' : '') + '</figure>'; }).join('') + '</div>' : '') + '</td><td class="n">-' + money(r.amount) + '</td></tr>'; }); }
    html += '<section class="card" aria-label="' + esc(hs.name) + '"><div class="hh"><h2>' + esc(hs.name) + '</h2>' + (hs.partners.length ? '<span class="pill">' + hs.partners.map(function (p) { return esc(p.name.split(' ')[0]) + ' ' + p.pct + '%'; }).join(' · ') + '</span>' : '') + '</div><table><caption style="position:absolute;left:-9999px">' + esc(hs.name) + '</caption><tbody>' + rows + '</tbody></table></section>';
  });
  if (idle.length) html += '<p class="mut">No money in or out in these dates: ' + idle.map(function (h) { return esc(h.name); }).join(', ') + '.</p>';
  if (T.put_in || T.paid_out) html += '<section class="card"><div class="hh"><h2>Money between ' + first + ' and the properties</h2></div><table><tbody><tr><td>Put in</td><td class="n">' + money(T.put_in) + '</td></tr><tr><td>Paid out to ' + first + '</td><td class="n">' + money(T.paid_out) + '</td></tr></tbody></table></section>';
  html += '<p class="mut">Cash basis: money that actually came in or went out in these dates. Mortgage is the full payment (principal, interest and escrow).' + (T.rehab ? ' Rehab spending (' + money(T.rehab) + ') is added to the property cost, not counted in net.' : '') + ' Read-only statement made ' + fd(x.made) + '.</p>';
  app.innerHTML = html;
  document.title = 'Owner statement · ' + x.owner.name;
  document.getElementById('pr').onclick = function () { window.print(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-p]'), function (b) { b.onclick = function () { cur = b.getAttribute('data-p'); load(); }; });
}
function fail(msg) { app.innerHTML = '<div class="card err"><h1 style="font-size:20px">Statement not available</h1><p class="mut" style="font-size:15px">' + esc(msg) + '</p></div>'; }
function load() {
  var p = per(cur);
  fetch('/api/pub/os/' + encodeURIComponent(tok) + '?from=' + p[0] + '&to=' + p[1] + (co ? '&co=' + co : ''), { credentials: 'omit' })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'This link is not active.'); return j; }); })
    .then(render).catch(function (e) { fail(e.message || 'Please check your connection and try again.'); });
}
if (h === 'printall') { var all = null; try { all = JSON.parse(localStorage.getItem('os31all') || 'null'); } catch (e) { }
  if (all && all.length) { var parts = []; all.forEach(function (x) { render(x); parts.push('<div class="pb">' + app.innerHTML + '</div>'); }); app.innerHTML = parts.join(''); document.title = 'Owner statements'; Array.prototype.forEach.call(document.querySelectorAll('#pr'), function (b, i) { if (i) b.parentNode.removeChild(b); else b.onclick = function () { window.print(); }; }); setTimeout(function () { window.print(); }, 700); } else fail('Open this from Owner statements in the app.'); }
else if (printMode) { var d = null; try { d = JSON.parse(localStorage.getItem('os30p') || 'null'); } catch (e) { }
  if (d) { render(d); setTimeout(function () { window.print(); }, 400); } else fail('Open this from Owner statements in the app.'); }
else if (/^[a-f0-9]{32}$/.test(tok)) load(); else fail('This link is not active. Please ask for a new one.');
})();
