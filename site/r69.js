(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = c => '$' + ((c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = c => '$' + Math.round((c || 0) / 100).toLocaleString('en-US');
const fdate = s => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
const root = $('#r69'); const P = location.pathname.split('/').filter(Boolean); const kind = P[0]; const qs = new URLSearchParams(location.search);
const m = /^(\d+)-([0-9a-f]+)$/.exec(qs.get(kind === 'pay' ? 't' : 'k') || ''); const co = m ? m[1] : ''; const key = m ? m[2] : ''; const sub = /^\d+$/.test(qs.get('l') || '') ? qs.get('l') : '';
const K = `${co}-${key}`; const U = (k, l, extra = '') => `/${k}/?k=${K}${l ? '&l=' + l : ''}${extra}`;
const setQ = (k, v) => { const q = new URLSearchParams(location.search); if (v == null) q.delete(k); else q.set(k, v); history.replaceState(null, '', location.pathname + '?' + q); };
async function api(path, opts = {}) {
  const o = { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: { 'x-co': co, 'x-k': key } };
  if (opts.body instanceof FormData) o.body = opts.body; else if (opts.body) { o.body = JSON.stringify(opts.body); o.headers['content-type'] = 'application/json'; }
  let r; try { r = await fetch('/api/pub/x69/' + path, o); } catch (e) { throw new Error('Network problem. Check your connection and try again.'); }
  const j = await r.json().catch(() => ({ error: 'Something went wrong. Please try again.' })); if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j;
}
const top = (co, right = '') => `<header class="r-top"><div><div class="r-co">${esc(co.company || 'Rentals')}</div>${co.sub ? `<div class="r-sub">${esc(co.sub)}</div>` : ''}</div>${right}</header>`;
const foot = () => `<p class="r-foot">Secure page by DoorHold</p>`;
const field = (label, input, hint = '') => `<label class="f"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const inp = (name, v = '', attrs = '') => `<input name="${name}" value="${esc(v)}" ${attrs}>`;
const fail = (el, msg) => { $$('.r-err', el).forEach(e => e.remove()); el.insertAdjacentHTML('afterbegin', `<div class="r-err" role="alert">${esc(msg)}</div>`); el.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
const busy = (b, on, txt) => { if (!b) return; if (on) { b._t = b.innerHTML; b.disabled = true; b.textContent = txt || 'Working…'; } else { b.disabled = false; if (b._t) b.innerHTML = b._t; } };
const testNote = (what) => `<div class="r-note test"><b>Test mode.</b> No real money moves. ${what || 'Use the test card 4242 4242 4242 4242, any future date, any 3 digits.'}</div>`;
const cardFields = () => `<div class="f">${field('Card number', inp('cnum', '', 'inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" required'))}</div>
  <div class="f3">${field('Expiry', inp('cexp', '', 'inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" required'))}${field('Security code', inp('ccvc', '', 'inputmode="numeric" autocomplete="cc-csc" placeholder="123" required'))}${field('ZIP', inp('czip', '', 'inputmode="numeric" autocomplete="postal-code" placeholder="10001"'))}</div>`;
const bankFields = () => `<div class="f2">${field('Routing number', inp('brt', '', 'inputmode="numeric" placeholder="110000000" required'))}${field('Account number', inp('bac', '', 'inputmode="numeric" placeholder="000123456789" required'))}</div>
  ${field('Name on the account', inp('bname', '', 'autocomplete="name" required'))}`;

// ===== listings =====
async function rentals() {
  const [c, l] = await Promise.all([api('co'), api('listings')]); document.title = `Homes for rent · ${c.company}`;
  const cards = l.listings.map(h => `<article class="r-home"><a class="r-ph" href="${U('rentals', h.id)}" tabindex="-1" aria-hidden="true">${h.photos[0] ? `<img src="${esc(h.photos[0])}" alt="" loading="lazy">` : 'No photo yet'}</a>
    <div class="r-hb"><div class="r-price">${money0(h.rent)}<span class="r-mut r-sm"> / month</span></div><h2 style="margin:0"><a href="${U('rentals', h.id)}" style="color:inherit;text-decoration:none">${esc(h.title)}</a></h2>
    <div class="r-facts">${[h.beds != null ? (h.beds == 0 ? 'Studio' : h.beds + ' bed') : '', h.baths ? h.baths + ' bath' : '', h.sqft ? h.sqft.toLocaleString() + ' sq ft' : ''].filter(Boolean).join(' · ')}</div>
    <div class="r-mut">${esc([h.address, h.city].filter(Boolean).join(', '))}</div><div class="r-mut r-sm">${h.available ? 'Available ' + fdate(h.available) : 'Available now'}</div>
    <div class="r-acts"><a class="btn sec" href="${U('rentals', h.id)}">Details</a>${c.app_on ? `<a class="btn" href="${U('apply', h.id)}">Apply</a>` : ''}</div></div></article>`).join('');
  root.innerHTML = `${top({ company: c.company, sub: 'Homes for rent' })}<h1>Homes for rent</h1><p class="r-mut" style="margin:0 0 14px">${l.listings.length} ${l.listings.length === 1 ? 'home' : 'homes'} available${c.contact.phone ? ` · Questions? Call ${esc(c.contact.phone)}` : ''}</p>
    ${cards ? `<div class="r-grid">${cards}</div>` : `<div class="r-card">Nothing is available right now. Please check back soon.</div>`}${foot()}`;
}
async function rental(id) {
  const [c, h] = await Promise.all([api('co'), api('listing/' + id)]); document.title = `${h.title} · ${c.company}`;
  const facts = [['Deposit', h.deposit != null ? money(h.deposit) : ''], ['Bedrooms', h.beds != null ? (h.beds == 0 ? 'Studio' : h.beds) : ''], ['Bathrooms', h.baths || ''], ['Size', h.sqft ? h.sqft.toLocaleString() + ' sq ft' : ''], ['Available', h.available ? fdate(h.available) : 'Now'], ['Lease', h.lease_term || ''], ['Pets', h.pets || ''], ['Utilities', h.utilities || '']].filter(f => f[1] !== '');
  root.innerHTML = `${top({ company: c.company, sub: 'Homes for rent' }, `<a class="btn sec" href="${U('rentals')}">All homes</a>`)}
    ${h.photos.length ? `<div class="r-gal" tabindex="0" aria-label="Photos">${h.photos.map((p, i) => `<img src="${esc(p)}" alt="Photo ${i + 1} of ${esc(h.title)}" loading="${i ? 'lazy' : 'eager'}">`).join('')}</div>` : ''}
    <div class="r-two"><div><h1>${esc(h.title)}</h1><p class="r-mut" style="margin:0 0 12px">${esc([h.address, h.unit && /\d/.test(h.unit) ? 'Unit ' + h.unit : '', h.city, h.state].filter(Boolean).join(', '))}</p>
      ${h.descr ? `<div class="r-card"><h2>About this home</h2><div style="white-space:pre-line">${esc(h.descr)}</div></div>` : ''}</div>
      <aside><div class="r-card"><div class="r-big">${money0(h.rent)}<span class="r-mut" style="font-size:13.5px;font-weight:500"> / month</span></div><div style="margin:10px 0 12px">${facts.map(f => `<div class="r-row"><span class="r-mut">${f[0]}</span><b>${esc(f[1])}</b></div>`).join('')}</div>
        ${c.app_on ? `<a class="btn block lg" href="${U('apply', h.id)}">Apply online</a><p class="r-mut r-sm" style="margin:8px 0 0">Application fee ${money(c.fee)}${c.screening ? ', includes a credit, criminal and eviction check' : ''}.</p>` : ''}</div>
        ${c.contact.phone || c.contact.email ? `<div class="r-card"><h2>Questions</h2>${c.contact.name ? `<div>${esc(c.contact.name)}</div>` : ''}${c.contact.phone ? `<div><a href="tel:${esc(c.contact.phone)}">${esc(c.contact.phone)}</a></div>` : ''}${c.contact.email ? `<div><a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a></div>` : ''}</div>` : ''}</aside></div>${foot()}`;
}

// ===== application =====
const AK = `r69a_${co}`; let C = null, A = null, TOK = null, L = null;
const STEPS = ['Start', 'About you', 'Work & income', 'Documents', 'Review & pay'];
const stepsBar = n => `<div class="r-steps" aria-hidden="true">${STEPS.map((s, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div><p class="r-mut r-sm" style="margin:-6px 0 10px">Step ${n} of ${STEPS.length}: ${STEPS[n - 1]}</p>`;
async function apply() {
  C = await api('co'); document.title = `Apply · ${C.company}`;
  if (!C.app_on) { root.innerHTML = `${top(C)}<div class="r-narrow"><div class="r-card"><h1>Applications are closed</h1><p class="r-mut">${esc(C.company)} is not taking online applications right now.</p></div></div>`; return; }
  if (sub && /^\d+$/.test(sub)) L = await api('listing/' + sub).catch(() => null);
  TOK = qs.get('a') || localStorage.getItem(AK + (sub ? '_' + sub : '')) || null;
  if (qs.get('done') && TOK) { try { A = await api(`app/${TOK}/done`, { body: { session: qs.get('done') } }); } catch (e) { } setQ('done', null); setQ('a', TOK); }
  if (TOK) { try { A = await api('app/' + TOK); } catch (e) { TOK = null; localStorage.removeItem(AK + (sub ? '_' + sub : '')); } }
  if (TOK && !qs.get('a')) setQ('a', TOK);
  draw();
}
function shellA(n, inner) { root.innerHTML = `${top(C, C.test ? '<span class="r-badge test">Test mode</span>' : '')}<div class="r-narrow">${L ? `<p class="r-mut" style="margin:0 0 6px">Applying for <b style="color:#111827">${esc(L.title)}</b> · ${money0(L.rent)}/month</p>` : ''}${n ? stepsBar(n) : ''}${inner}</div>${foot()}`; }
function draw() {
  if (!A) return stepStart();
  if (A.status !== 'draft') return stepDone();
  const n = A._at || Math.min(5, Math.max(2, (A.step || 1) + 1));
  ({ 2: stepYou, 3: stepWork, 4: stepDocs, 5: stepReview })[n]();
}
function go(n) { A._at = n; draw(); window.scrollTo(0, 0); }
function stepStart() {
  const units = C.units || [];
  shellA(1, `<div class="r-card"><h1>Rental application</h1><p class="r-mut" style="margin:0 0 14px">About 10 minutes. You can stop and come back on this phone; your answers are saved as you go.</p>
    <form id="fs">${L ? '' : field('Which home are you applying for?', `<select name="unit_id" required><option value="">Choose a home</option>${units.map(u => `<option value="${u.id}">${esc(u.property)} · ${esc(u.unit)}</option>`).join('')}</select>`)}
    <div class="f2">${field('First name', inp('first', '', 'autocomplete="given-name" required'))}${field('Last name', inp('last', '', 'autocomplete="family-name" required'))}</div>
    ${field('Email', inp('email', '', 'type="email" autocomplete="email" required'))}${field('Mobile phone', inp('phone', '', 'type="tel" autocomplete="tel" required'))}
    <div class="r-note r-sm">Application fee: <b>${money(C.fee)}</b>${C.screening ? `. It includes a credit, criminal and eviction check${C.screening.sample ? ' (sample report in this test setup)' : ''}.` : '.'} You pay at the last step.</div>
    <button class="btn block lg" type="submit">Start application</button></form></div>`);
  $('#fs').onsubmit = async e => { e.preventDefault(); const f = e.target, b = $('button', f); const x = Object.fromEntries(new FormData(f)); if (L) x.listing_id = L.id; busy(b, true, 'Starting…');
    try { const r = await api('app/start', { body: x }); TOK = r.tok; localStorage.setItem(AK + (sub ? '_' + sub : ''), TOK); setQ('a', TOK); A = await api('app/' + TOK); go(2); } catch (er) { busy(b, false); fail(f, er.message); } };
}
async function save(f, step, next) { const b = $('button[type=submit]', f); const x = Object.fromEntries(new FormData(f)); busy(b, true, 'Saving…');
  try { await api(`app/${TOK}/save`, { body: { ...x, step } }); A = await api('app/' + TOK); go(next); } catch (er) { busy(b, false); fail(f, er.message); } }
const v = k => (A.data || {})[k] || '';
const nav = (back) => `<div style="display:flex;gap:8px;margin-top:4px">${back ? `<button type="button" class="btn sec" data-back="${back}" style="flex:1">Back</button>` : ''}<button type="submit" class="btn lg" style="flex:2">Save and continue</button></div>`;
function bindBack() { $$('[data-back]').forEach(b => b.onclick = () => go(+b.dataset.back)); }
function stepYou() {
  shellA(2, `<form id="f2" class="r-card"><h2>About you</h2>
    <div class="f2">${field('Date of birth', inp('dob', v('dob'), 'type="date" required'))}${field('Move-in date', inp('move_in', v('move_in'), 'type="date" required'))}</div>
    ${field('Who will live with you?', inp('occupants', v('occupants'), 'placeholder="Names and ages, or none"'), 'Everyone 18 and over may need to apply too.')}
    <h2 style="margin-top:6px">Where you live now</h2>${field('Current address', inp('addr', v('addr'), 'autocomplete="street-address" required'))}
    <div class="f2">${field('Lived there since', inp('addr_since', v('addr_since'), 'type="month"'))}${field('Rent you pay now', inp('addr_rent', v('addr_rent'), 'inputmode="decimal" placeholder="$"'))}</div>
    <div class="f2">${field('Landlord name', inp('landlord', v('landlord')))}${field('Landlord phone', inp('landlord_phone', v('landlord_phone'), 'type="tel"'))}</div>
    ${field('Why are you moving?', inp('reason', v('reason')))}${nav(0)}</form>`);
  $('#f2').onsubmit = e => { e.preventDefault(); save(e.target, 2, 3); };
}
function stepWork() {
  const yn = (name, q) => `<fieldset class="f" style="border:0;padding:0;margin:0 0 12px"><legend style="font-weight:550;margin-bottom:4px">${q}</legend><div class="r-seg" style="margin:0">${['No', 'Yes'].map(o => `<label class="${v(name) === o ? 'on' : ''}"><input type="radio" name="${name}" value="${o}" ${v(name) === o ? 'checked' : ''} required>${o}</label>`).join('')}</div></fieldset>`;
  shellA(3, `<form id="f3" class="r-card"><h2>Work and income</h2>
    <div class="f2">${field('Employer', inp('employer', v('employer'), 'required'))}${field('Job title', inp('job', v('job')))}</div>
    <div class="f2">${field('Working there since', inp('job_since', v('job_since'), 'type="month"'))}${field('Monthly income before tax', inp('income', v('income'), 'inputmode="decimal" placeholder="$" required'))}</div>
    ${field('Other income (optional)', inp('other_income', v('other_income'), 'placeholder="Type and amount per month"'))}
    <h2 style="margin-top:6px">A few questions</h2><div class="f2">${field('Pets', inp('pets', v('pets'), 'placeholder="None, or type and weight"'))}${field('Vehicles', inp('vehicles', v('vehicles'), 'placeholder="None, or make and plate"'))}</div>
    ${yn('evicted', 'Have you ever been evicted or asked to move out?')}${yn('felony', 'Have you been convicted of a felony?')}
    <div class="f2">${field('Emergency contact', inp('emerg_name', v('emerg_name'), 'autocomplete="off" required'))}${field('Their phone', inp('emerg_phone', v('emerg_phone'), 'type="tel" required'))}</div>
    ${nav(2)}</form>`);
  $$('.r-seg input').forEach(i => i.onchange = () => $$(`input[name=${i.name}]`).forEach(o => o.closest('label').classList.toggle('on', o.checked)));
  bindBack(); $('#f3').onsubmit = e => { e.preventDefault(); save(e.target, 3, 4); };
}
const DOCN = { id: 'Photo ID', income: 'Proof of income', bank: 'Bank statement', other: 'Other document' };
function stepDocs() {
  const need = C.docs || []; const kinds = [...new Set([...need, 'bank', 'other'])];
  const have = k => A.docs.filter(d => d.kind === k);
  shellA(4, `<div class="r-card" id="f4"><h2>Documents</h2><p class="r-mut" style="margin:0 0 12px">Take a photo or pick a file (photo or PDF, up to 15 MB). ${need.length ? 'Required: ' + need.map(k => DOCN[k]).join(' and ') + '.' : ''}</p>
    ${kinds.map(k => `<h3>${DOCN[k]}${need.includes(k) ? '' : ' <span class="r-mut" style="font-weight:400">(optional)</span>'}</h3>
      ${have(k).length ? `<ul class="r-docs">${have(k).map(d => `<li><span>${esc(d.name)}</span><button type="button" class="btn sec" data-rm="${d.id}" aria-label="Remove ${esc(d.name)}">Remove</button></li>`).join('')}</ul>` : ''}
      <div class="r-up"><label class="btn sec">${have(k).length ? 'Add another' : 'Add ' + DOCN[k].toLowerCase()}<input type="file" accept="image/*,application/pdf" data-kind="${k}" aria-label="Add ${DOCN[k].toLowerCase()}"></label></div>`).join('')}
    <form id="f4f">${nav(3)}</form></div>`);
  $$('input[type=file]').forEach(i => i.onchange = async () => { const f = i.files[0]; if (!f) return; const lab = i.closest('label'); lab.firstChild.textContent = 'Uploading…';
    const fd = new FormData(); fd.append('kind', i.dataset.kind); fd.append('file', await shrink(f), f.name);
    try { const r = await api(`app/${TOK}/file`, { body: fd }); A.docs = r.docs; A._at = 4; draw(); } catch (er) { fail($('#f4'), er.message); lab.firstChild.textContent = 'Try again'; } });
  $$('[data-rm]').forEach(b => b.onclick = async () => { const r = await api(`app/${TOK}/unfile`, { body: { id: +b.dataset.rm } }); A.docs = r.docs; A._at = 4; draw(); });
  bindBack(); $('#f4f').onsubmit = async e => { e.preventDefault(); const miss = need.filter(k => !have(k).length); if (miss.length) return fail($('#f4'), 'Please add your ' + miss.map(k => DOCN[k].toLowerCase()).join(' and '));
    await save(e.target, 4, 5); };
}
async function shrink(f) { if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.5e6) return f; try { const bm = await createImageBitmap(f); const s = Math.min(1, 1800 / Math.max(bm.width, bm.height)); const c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(b => r(b || f), 'image/jpeg', .85)); } catch (e) { return f; } }
function stepReview() {
  const d = A.data || {}; const sc = C.screening; const fee = A.fee || 0;
  const ph = String(A.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); const rows = [['Name', `${A.first} ${A.last}`], ['Email', A.email], ['Phone', ph.length === 10 ? `(${ph.slice(0, 3)}) ${ph.slice(3, 6)}-${ph.slice(6)}` : A.phone], ['Move-in', fdate(d.move_in)], ['Current address', d.addr], ['Employer', d.employer], ['Monthly income', d.income ? money(Math.round(parseFloat(String(d.income).replace(/[$,]/g, '')) * 100) || 0) : ''], ['Documents', A.docs.length + ' added']];
  shellA(5, `<form id="f5"><div class="r-card"><h2>Review</h2>${rows.map(r => `<div class="r-row"><span class="r-mut">${r[0]}</span><b style="text-align:right">${esc(r[1] || '-')}</b></div>`).join('')}<button type="button" class="btn sec" data-back="2" style="margin-top:10px">Change answers</button></div>
    ${sc ? `<div class="r-card"><h2>Screening</h2><p style="margin:0 0 8px">${esc(C.company)} will run a <b>credit, criminal and eviction check</b> through ${esc(sc.label)}.${sc.sample ? ' In this test setup the report is a sample, not a real check.' : ' You will confirm your identity with them after you submit.'}</p>
      <p class="r-mut r-sm" style="margin:0">A credit check for a rental application is a soft inquiry and does not lower your credit score. You can ask for a free copy of any report used to decide on your application.</p></div>` : ''}
    <div class="r-card"><h2>Sign</h2>${C.terms ? `<div class="r-note r-sm" style="white-space:pre-line;max-height:160px;overflow:auto">${esc(C.terms)}</div>` : ''}
      <label class="r-chk"><input type="checkbox" name="consent" required><span>I confirm my answers are true, and I authorize ${esc(C.company)}${sc ? ` and ${esc(sc.label)}` : ''} to check my credit, criminal and eviction history and contact the references I gave, for this rental application.</span></label>
      ${field('Type your full name to sign', inp('sign', '', 'autocomplete="name" required'))}</div>
    ${fee ? `<div class="r-card"><h2>Application fee</h2><div class="r-row"><span>Application fee</span><b>${money(fee)}</b></div>${C.pay_mode === 'stripe' ? '<p class="r-mut r-sm">You will pay on a secure card page, then come back here.</p>' : testNote() + cardFields()}</div>` : ''}
    <button type="submit" class="btn block lg">${fee ? `Pay ${money(fee)} and submit` : 'Submit application'}</button></form>`);
  bindBack();
  $('#f5').onsubmit = async e => { e.preventDefault(); const f = e.target, b = $('button[type=submit]', f); const x = Object.fromEntries(new FormData(f)); busy(b, true, 'Submitting…');
    try { const r = await api(`app/${TOK}/submit`, { body: { consent: !!x.consent, sign: x.sign, card: { number: x.cnum, exp: x.cexp, cvc: x.ccvc, zip: x.czip } } }); if (r.redirect) { location.href = r.redirect; return; } A = r; A._at = 0; draw(); window.scrollTo(0, 0); } catch (er) { busy(b, false); fail(f, er.message); } };
}
function stepDone() {
  const s = A.screening; const waiting = s && s.status === 'waiting_applicant'; const done = s && s.status === 'complete';
  const st = { submitted: 'Submitted', screening: 'Screening', review: 'With the office', approved: 'Approved', declined: 'Not approved', withdrawn: 'Withdrawn' }[A.status] || A.status;
  shellA(0, `<div class="r-card"><div class="r-ok" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
    <h1>${A.status === 'approved' ? 'You are approved' : 'Application sent'}</h1><p class="r-mut" style="margin:0 0 10px">Thanks, ${esc(A.first)}. ${esc(C.company)} has your application${A.fee_status === 'paid' ? ` and your ${money(A.fee)} fee` : ''}. Keep this page to check your status.</p>
    <div class="r-row"><span class="r-mut">Status</span><b>${esc(st)}</b></div>${A.fee_status === 'paid' ? `<div class="r-row"><span class="r-mut">Fee receipt</span><b>${esc(A.fee_ref || '')}</b></div>` : ''}
    ${s ? `<div class="r-row"><span class="r-mut">Screening</span><b>${done ? 'Complete' : waiting ? 'Waiting for you' : s.status === 'not_connected' ? 'The office will start it' : 'In progress'}</b></div>` : ''}</div>
    ${waiting ? `<div class="r-card" id="vf"><h2>Confirm your identity</h2>${s.provider === 'sandbox' ? `<div class="r-note test"><b>Sandbox.</b> A real screening company would ask a few questions about your credit history here. This test setup makes a sample report instead.</div>
      <label class="r-chk"><input type="checkbox" id="vc"><span>I am ${esc(A.first)} ${esc(A.last)} and I want my screening report sent to ${esc(C.company)}.</span></label><button class="btn block lg" id="vb">Confirm and run the check</button>` : '<p>Check your email for a message from the screening company and finish the steps there.</p>'}</div>` : ''}
    ${done ? `<div class="r-card"><h2>What happens next</h2><p style="margin:0">Your screening is done and sent to ${esc(C.company)}. They will contact you at ${esc(A.email)}.</p></div>` : ''}`);
  const vb = $('#vb'); if (vb) vb.onclick = async () => { if (!$('#vc').checked) return fail($('#vf'), 'Check the box to confirm'); busy(vb, true, 'Running the check…'); try { A = await api(`app/${TOK}/verify`, { body: { confirm: true } }); draw(); } catch (er) { busy(vb, false); fail($('#vf'), er.message); } };
}

// ===== pay rent =====
async function pay() {
  const tok = key;
  const base = `pay/${tok}`; let X;
  if (qs.get('done')) { try { const r = await api(base + '/done', { body: { session: qs.get('done') } }); setQ('done', null); X = await api(base); return payDone(X, { amount: r.amount, status: r.status }); } catch (e) { setQ('done', null); } }
  X = await api(base); document.title = `Pay rent · ${X.company}`; payForm(X, base);
}
function payForm(X, base) {
  const due = Math.max(0, X.balance || 0);
  root.innerHTML = `${top({ company: X.company, sub: 'Pay rent' }, X.test ? '<span class="r-badge test">Test mode</span>' : '<span class="r-badge ok">Secure</span>')}<div class="r-narrow">
    <div class="r-card"><p class="r-mut" style="margin:0">Hi ${esc(X.first)} · ${esc(X.property)}${X.unit ? ', ' + esc(X.unit) : ''}</p><div class="r-big" style="margin:6px 0 2px">${money(due)}</div><p class="r-mut" style="margin:0">${due > 0 ? 'Balance due now' : 'Nothing due right now'} · Rent ${money(X.rent)} a month</p></div>
    ${X.autopay ? `<div class="r-card" id="apc"><h2>Autopay is on</h2><p style="margin:0 0 10px">We charge your ${X.autopay.method === 'ach' ? 'bank account' : 'card'}${X.autopay.last4 ? ' ending ' + esc(X.autopay.last4) : ''} for the balance due on the ${ord(X.autopay.day)} of each month.</p><button class="btn sec" id="apstop">Turn off autopay</button></div>` : ''}
    <form id="pf" class="r-card"><h2>Make a payment</h2>${X.test ? testNote('Card 4242 4242 4242 4242, or bank routing 110000000 and account 000123456789.') : ''}
      ${field('Amount', inp('amount', due > 0 ? (due / 100).toFixed(2) : '', `inputmode="decimal" required ${X.partial ? '' : 'readonly'}`), X.partial ? 'You can pay part of the balance.' : '')}
      <fieldset style="border:0;padding:0;margin:0"><legend class="vh">How do you want to pay?</legend><div class="r-seg">${X.card ? `<label class="on"><input type="radio" name="method" value="card" checked>Card</label>` : ''}${X.ach ? `<label class="${X.card ? '' : 'on'}"><input type="radio" name="method" value="ach" ${X.card ? '' : 'checked'}>Bank account</label>` : ''}</div></fieldset>
      <div id="pm"></div><div id="fee" class="r-note r-sm"></div>
      ${X.autopay_ok && !X.autopay ? `<label class="r-chk"><input type="checkbox" name="autopay"><span><b>Turn on autopay</b><br><span class="r-mut">Pay the balance automatically each month on the <select name="day" aria-label="Day of the month" style="width:auto;height:28px;display:inline-block">${[1, 2, 3, 4, 5].map(d => `<option value="${d}">${ord(d)}</option>`).join('')}</select>. Turn it off any time on this page.</span></span></label>` : ''}
      <button type="submit" class="btn block lg" id="pb">Pay</button></form>
    ${X.history.length ? `<div class="r-card"><h2>Recent online payments</h2>${X.history.map(h => `<div class="r-row"><span>${fdate(h.created)} · ${h.method === 'ach' ? 'Bank' : 'Card'}</span><b>${money(h.amount)}</b></div>`).join('')}</div>` : ''}</div>${foot()}`;
  const f = $('#pf');
  const calc = () => { const mth = (f.querySelector('[name=method]:checked') || {}).value || 'card'; const amt = Math.round(parseFloat(String(f.amount.value).replace(/[$,]/g, '')) * 100) || 0;
    const fe = X.fees; let fee = 0, by = 'company'; if (mth === 'ach') { fee = Math.min(Math.round(amt * fe.ach_pct / 100), fe.ach_cap || 1e12); by = fe.ach_by; } else { fee = Math.round(amt * fe.card_pct / 100) + (fe.card_fixed || 0); by = fe.card_by; }
    const tf = by === 'tenant' ? fee : 0; $('#fee').innerHTML = amt ? `<div class="r-row"><span>Payment</span><b>${money(amt)}</b></div><div class="r-row"><span>${mth === 'ach' ? 'Bank payment fee' : 'Card processing fee'}</span><b>${tf ? money(tf) : 'Free'}</b></div><div class="r-row"><span>Total</span><b>${money(amt + tf)}</b></div>${mth === 'ach' ? '<div class="r-mut" style="margin-top:4px">Bank payments usually take 3 to 5 business days to clear.</div>' : ''}` : 'Enter an amount';
    $('#pb').textContent = amt ? `Pay ${money(amt + tf)}` : 'Pay'; };
  const pm = () => { const mth = (f.querySelector('[name=method]:checked') || {}).value || 'card'; $$('.r-seg label', f).forEach(l => l.classList.toggle('on', $('input', l).checked)); $('#pm').innerHTML = X.mode === 'stripe' ? '<p class="r-mut r-sm">You will enter your details on a secure Stripe page.</p>' : mth === 'ach' ? bankFields() : cardFields(); calc(); };
  $$('[name=method]', f).forEach(r => r.onchange = pm); f.amount.oninput = calc; pm();
  const st = $('#apstop'); if (st) st.onclick = async () => { busy(st, true, 'Turning off…'); try { await api(base + '/autopay', { body: { op: 'stop' } }); payForm(await api(base), base); } catch (er) { busy(st, false); fail($('#apc'), er.message); } };
  f.onsubmit = async e => { e.preventDefault(); const x = Object.fromEntries(new FormData(f)); const b = $('#pb'); busy(b, true, 'Paying…');
    try { const r = await api(base + '/pay', { body: { amount: x.amount, method: x.method, autopay: !!x.autopay, day: x.day, card: { number: x.cnum, exp: x.cexp, cvc: x.ccvc, zip: x.czip }, bank: { routing: x.brt, account: x.bac, name: x.bname } } });
      if (r.redirect) { location.href = r.redirect; return; } payDone(await api(base), { amount: r.total, ref: r.ref, status: 'paid', autopay: r.autopay }); } catch (er) { busy(b, false); fail(f, er.message); } };
}
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
function payDone(X, r) {
  root.innerHTML = `${top({ company: X.company, sub: 'Pay rent' }, X.test ? '<span class="r-badge test">Test mode</span>' : '')}<div class="r-narrow"><div class="r-card">
    <div class="r-ok" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
    <h1>${r.status === 'paid' ? 'Payment received' : 'Payment is processing'}</h1><p class="r-mut" style="margin:0 0 10px">${r.status === 'paid' ? `Thank you, ${esc(X.first)}. ${esc(X.company)} has your payment.` : 'Your bank payment is on its way. It usually clears in 3 to 5 business days.'}</p>
    <div class="r-row"><span class="r-mut">Paid</span><b>${money(r.amount)}</b></div>${r.ref ? `<div class="r-row"><span class="r-mut">Confirmation</span><b>${esc(r.ref)}</b></div>` : ''}<div class="r-row"><span class="r-mut">Balance now</span><b>${money(Math.max(0, X.balance))}</b></div>
    ${r.autopay ? `<div class="r-row"><span class="r-mut">Autopay</span><b>On, the ${ord(r.autopay.day)} of each month</b></div>` : ''}
    <a class="btn sec block" style="margin-top:12px" href="/pay/?t=${K}">Back</a></div></div>${foot()}`;
}

const run = co ? { rentals: () => sub ? rental(sub) : rentals(), apply, pay }[kind] : null;
(run ? run() : Promise.reject(new Error('Page not found'))).catch(e => { root.innerHTML = `<div class="r-narrow" style="padding-top:40px"><div class="r-card"><h1>Sorry</h1><p class="r-mut" style="margin:0">${esc(e.message)}</p></div></div>`; });
})();
