/* DoorHold mobile app (installable PWA). Same API and logins as the website; no business logic lives here.
   Auth: Bearer token kept on this device (fetch credentials 'omit', so the website's cookie is never touched).
   Roles: tenant / worker (contractor) / manager / owner, chosen from the account. Several accounts can live on one phone (switch in More). */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = c => (c < 0 ? '-' : '') + '$' + (Math.abs(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = c => (c < 0 ? '-' : '') + '$' + Math.round(Math.abs(c || 0) / 100).toLocaleString('en-US');
const fdate = d => { if (!d) return ''; const t = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(t) ? String(d) : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: t.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
const ago = d => { const t = new Date(d).getTime(); if (!t) return ''; const s = (Date.now() - t) / 1000; if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; if (s < 7 * 86400) return Math.floor(s / 86400) + 'd'; return fdate(d); };
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const cap = s => String(s || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const LS = { get(k, d) { try { const v = localStorage.getItem('dh67_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('dh67_' + k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem('dh67_' + k); } catch (e) { } } };
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// ---------- icons (one line set, 24px, no emoji) ----------
const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M8 8h3M8 12h3M8 16h3"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5M5.5 5h13l2.5 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><circle cx="16.5" cy="14" r="1.3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 5-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  phone: '<path d="M5 3h3.5l1.5 5-2.2 1.3a11 11 0 0 0 6 6L15 13l5 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 15.5a3.5 3.5 0 0 0 5 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>', download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', addbox: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', alert: '<path d="M12 3 2 20h20zM12 10v4M12 17.2v.3"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="m11.5 11.5 8-8M16 7l2.5 2.5M14 9l2 2"/>', switch: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', drop: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>', flame: '<path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4s.5 2 2 2.5C10 8 12 3 12 3z"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3.5 21h17M14.5 12.5v.5"/>', bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 7v13M4 10l3 1.5M20 10l-3 1.5M4 18l3-1.5M20 18l-3-1.5M9 4l1.5 2.5M15 4l-1.5 2.5"/>',
  fridge: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M6 9.5h12M9 5.5v2M9 12.5v3"/>', dots: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'
};
const ic = (n, s = 24, cls = '') => `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
const BRAND = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#fff"/><path d="M14 30 32 14l18 16v22H14z" fill="#15803D"/><rect x="27" y="36" width="10" height="16" rx="1.5" fill="#fff"/><circle cx="35" cy="45" r="1.4" fill="#15803D"/></svg>`;

// ---------- haptics: Android vibrate; iOS 18 switch-tick trick; silent elsewhere ----------
let hapEl = null;
function haptic(kind) {
  try { if (navigator.vibrate) { navigator.vibrate(kind === 'warn' ? [12, 60, 12] : kind === 'ok' ? [8, 40, 16] : 8); return; } } catch (e) { }
  try { if (!isIOS) return; if (!hapEl) { hapEl = document.createElement('label'); hapEl.setAttribute('aria-hidden', 'true'); hapEl.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0;pointer-events:none'; hapEl.innerHTML = '<input type="checkbox" switch tabindex="-1">'; document.body.append(hapEl); } hapEl.click(); } catch (e) { }
}

// ---------- accounts on this device + API ----------
// accounts: [{ token, id, name, email, role, company }], active index in 'act'
const Acc = {
  all() { return LS.get('accounts', []); }, save(a) { LS.set('accounts', a); },
  cur() { const a = Acc.all(); const i = LS.get('act', 0); return a[i] || a[0] || null; },
  add(x) { const a = Acc.all().filter(z => z.email !== x.email); a.unshift(x); Acc.save(a); LS.set('act', 0); },
  use(email) { const a = Acc.all(); const i = a.findIndex(z => z.email === email); if (i >= 0) LS.set('act', i); },
  update(p) { const a = Acc.all(); const i = LS.get('act', 0); if (a[i]) { Object.assign(a[i], p); Acc.save(a); } },
  drop(email) { const a = Acc.all().filter(z => z.email !== email); Acc.save(a); LS.set('act', 0); }
};
class ApiErr extends Error { constructor(m, s) { super(m); this.status = s; } }
async function api(path, opt = {}) {
  const a = Acc.cur(); const h = { 'x-pm-app': '1' }; if (a && !opt.anon) h.authorization = 'Bearer ' + a.token;
  let body = opt.body; if (body && !(body instanceof FormData)) { h['content-type'] = 'application/json'; body = JSON.stringify(body); }
  let r; try { r = await fetch('/api/' + path, { method: opt.method || (body ? 'POST' : 'GET'), headers: h, body, credentials: 'omit', cache: 'no-store' }); }
  catch (e) { throw new ApiErr('offline', 0); }
  if (opt.raw) { if (!r.ok) throw new ApiErr('Could not open it', r.status); return r; }
  let j = null; try { j = await r.json(); } catch (e) { }
  if (r.status === 401 && a && !opt.anon) { signedOut(); throw new ApiErr('Please sign in again', 401); }
  if (!r.ok) throw new ApiErr((j && j.error) || 'Something went wrong', r.status);
  return j;
}
const blobCache = new Map();
async function fileUrl(id) { if (blobCache.has(id)) return blobCache.get(id); const r = await api('files/' + id, { raw: true }); const u = URL.createObjectURL(await r.blob()); blobCache.set(id, u); return u; }
function lazyImgs(root) { $$('img[data-fid]', root).forEach(async im => { try { im.src = await fileUrl(im.dataset.fid); im.closest('.ph')?.classList.add('ld'); } catch (e) { im.closest('.ph')?.classList.add('err'); } }); }
async function openFile(id, name) {
  const s = sheet(`<div class="sh-h"><h2>${esc(name || 'Document')}</h2></div><div class="viewer"><div class="sk sk-doc"></div></div>`, { full: true });
  try { const r = await api('files/' + id, { raw: true }); let b = await r.blob(); if (/\.pdf$/i.test(name || '') && !/pdf/.test(b.type)) b = new Blob([b], { type: 'application/pdf' }); const u = URL.createObjectURL(b); const v = $('.viewer', s.el);
    if (/^image\//.test(b.type)) v.innerHTML = `<img src="${u}" alt="${esc(name || '')}">`;
    else v.innerHTML = `<iframe src="${u}" title="${esc(name || 'Document')}"></iframe><a class="btn tint mt" href="${u}" download="${esc(name || 'document.pdf')}">${ic('download', 20)} Save a copy</a>`;
  } catch (e) { $('.viewer', s.el).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// ---------- toasts, sheets, confirm ----------
function toast(msg, kind) { const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.setAttribute('role', 'status'); t.innerHTML = (kind === 'err' ? ic('alert', 18) : ic('check', 18)) + `<span>${esc(msg)}</span>`; document.body.append(t); requestAnimationFrame(() => t.classList.add('in')); setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600); haptic(kind === 'err' ? 'warn' : 'ok'); }
let sheetStack = [];
function sheet(html, o = {}) {
  const wrap = document.createElement('div'); wrap.className = 'sheet-wrap'; wrap.innerHTML = `<div class="scrim"></div><div class="sheet ${o.full ? 'full' : ''}" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div><button class="sh-x" aria-label="Close">${ic('x', 20)}</button><div class="sh-body">${html}</div></div>`;
  document.body.append(wrap); const el = $('.sheet', wrap); const S = { el, wrap, close };
  function close() { if (!wrap.isConnected) return; wrap.classList.remove('in'); sheetStack = sheetStack.filter(x => x !== S); setTimeout(() => wrap.remove(), 320); if (o.onClose) o.onClose(); }
  $('.scrim', wrap).onclick = close; $('.sh-x', wrap).onclick = close;
  // drag down to dismiss
  let y0 = null, dy = 0; const g = $('.grab', wrap);
  const start = e => { if (el.scrollTop > 0 && e.target !== g) return; y0 = (e.touches ? e.touches[0] : e).clientY; dy = 0; el.style.transition = 'none'; };
  const move = e => { if (y0 == null) return; dy = Math.max(0, (e.touches ? e.touches[0] : e).clientY - y0); if (dy > 0) { el.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); } };
  const end = () => { if (y0 == null) return; el.style.transition = ''; el.style.transform = ''; if (dy > 110) close(); y0 = null; };
  el.addEventListener('touchstart', start, { passive: true }); el.addEventListener('touchmove', move, { passive: false }); el.addEventListener('touchend', end);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in'))); sheetStack.push(S); haptic();
  const f = $('form', el); if (f && o.onSubmit) f.onsubmit = async e => { e.preventDefault(); const b = $('button[type=submit]', f); if (b) { b.disabled = true; b.classList.add('busy'); } try { await o.onSubmit(Object.fromEntries(new FormData(f)), f, S); } catch (err) { showErr(f, err.message); } finally { if (b) { b.disabled = false; b.classList.remove('busy'); } } };
  return S;
}
function toastProg() { const t = document.createElement('div'); t.className = 'toast in prog-t'; t.innerHTML = `<span>Uploading</span><div class="prog"><i></i></div>`; document.body.append(t);
  return { set: p => { $('i', t).style.width = Math.round(p * 100) + '%'; $('span', t).textContent = 'Uploading ' + Math.round(p * 100) + '%'; }, done: m => { t.remove(); toast(m); }, fail: m => { t.remove(); toast(m, 'err'); } }; }
function showErr(root, msg) { let e = $('.ferr', root); if (!e) { e = document.createElement('div'); e.className = 'ferr'; e.setAttribute('role', 'alert'); root.prepend(e); } e.innerHTML = ic('alert', 18) + `<span>${esc(msg)}</span>`; haptic('warn'); }
function ask(title, text, okLabel = 'OK', danger) { return new Promise(res => { let done = false; const s = sheet(`<div class="ask"><h2>${esc(title)}</h2>${text ? `<p class="mut">${esc(text)}</p>` : ''}<button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button><button class="btn plain" data-no>Cancel</button></div>`, { onClose: () => { if (!done) res(false); } }); $('[data-ok]', s.el).onclick = () => { done = true; res(true); s.close(); }; $('[data-no]', s.el).onclick = () => s.close(); }); }
const field = (label, input, hint) => `<label class="fld"><span>${esc(label)}</span>${input}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;

// ---------- PIN lock (this device) + passkey ("Face ID") ----------
async function pinHash(pin, salt) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']); const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150000 }, k, 256); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const pinKey = () => 'pin_' + (Acc.cur() || {}).email;
const hasPin = () => !!LS.get(pinKey(), null);
const pkOK = () => !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
async function pkRegister() {
  const o = await api('app67/pk/regbegin', { body: {} });
  const cred = await navigator.credentials.create({ publicKey: { challenge: unb64u(o.challenge), rp: o.rp, user: { id: unb64u(o.user.id), name: o.user.name, displayName: o.user.displayName }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' }, attestation: 'none', timeout: 60000 } });
  const r = cred.response; const pub = r.getPublicKey ? r.getPublicKey() : null; if (!pub) throw new Error('This phone cannot make a passkey here. Use the app PIN instead.');
  const x = await api('app67/pk/register', { body: { id: cred.id, publicKey: b64u(pub), alg: r.getPublicKeyAlgorithm ? r.getPublicKeyAlgorithm() : -7, clientDataJSON: b64u(r.clientDataJSON), name: isIOS ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android phone' : 'This device' } });
  const a = Acc.cur(); const ids = LS.get('pkids', {}); (ids[a.email] = ids[a.email] || []).push(cred.id); LS.set('pkids', ids); Acc.update({ pk: true }); return x;
}
async function pkSignIn(email) { // returns { user, token }
  const o = await api('app67/pk/begin', { body: {}, anon: true }); const ids = email ? (LS.get('pkids', {})[email] || []) : [];
  const cred = await navigator.credentials.get({ publicKey: { challenge: unb64u(o.challenge), rpId: o.rpId, userVerification: 'required', timeout: 60000, allowCredentials: ids.map(id => ({ type: 'public-key', id: unb64u(id) })) } });
  const r = cred.response; return api('app67/pk/login', { anon: true, body: { id: cred.id, authenticatorData: b64u(r.authenticatorData), clientDataJSON: b64u(r.clientDataJSON), signature: b64u(r.signature) } });
}
let locked = false;
function lockScreen() {
  const a = Acc.cur(); if (!a) return; locked = true; const canPk = a.pk && pkOK(); const pin = LS.get(pinKey(), null);
  const el = document.createElement('div'); el.className = 'lock'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Unlock DoorHold');
  el.innerHTML = `<div class="lk-top"><div class="av big">${esc(initials(a.name))}</div><h1>Welcome back${a.name ? ', ' + esc(a.name.split(' ')[0]) : ''}</h1><p>${pin ? 'Enter your app PIN' : 'Unlock with Face ID'}</p>${pin ? '<div class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' : ''}<div class="lk-err" role="alert"></div></div>
    ${pin ? `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}" aria-label="${n}">${n}</button>`).join('')}<button class="key fn" data-pk ${canPk ? '' : 'style="visibility:hidden"'} aria-label="Use Face ID">${ic('face', 30)}</button><button class="key" data-k="0" aria-label="0">0</button><button class="key fn" data-del aria-label="Delete">${ic('back', 26)}</button></div>` : `<button class="btn big lk-pk" data-pk>${ic('face', 22)} Unlock with Face ID</button>`}
    <button class="lk-out" data-out>Sign out</button>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('in'));
  let code = ''; const dots = $$('.dots i', el); const err = $('.lk-err', el); let tries = LS.get('pintries', 0);
  const done = () => { locked = false; LS.set('pintries', 0); LS.set('last', Date.now()); el.classList.remove('in'); setTimeout(() => el.remove(), 300); haptic('ok'); };
  const press = async k => { if (code.length >= 4) return; code += k; haptic(); dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
    if (code.length === 4) { const h = await pinHash(code, pin.salt); if (h === pin.hash) return done(); tries++; LS.set('pintries', tries); code = ''; $('.dots', el).classList.add('shake'); setTimeout(() => { $('.dots', el).classList.remove('shake'); dots.forEach(d => d.classList.remove('on')); }, 450); haptic('warn');
      err.textContent = tries >= 5 ? 'Too many tries. Please sign in again.' : `Wrong PIN. ${5 - tries} tries left.`; if (tries >= 5) { LS.del(pinKey()); LS.set('pintries', 0); setTimeout(() => { el.remove(); locked = false; signOut(); }, 900); } } };
  $$('[data-k]', el).forEach(b => b.onclick = () => press(b.dataset.k));
  const del = $('[data-del]', el); if (del) del.onclick = () => { code = code.slice(0, -1); dots.forEach((d, i) => d.classList.toggle('on', i < code.length)); };
  $$('[data-pk]', el).forEach(b => b.onclick = async () => { try { const r = await pkSignIn(a.email); if (r.user.email !== a.email) throw new Error('That Face ID belongs to another account'); Acc.update({ token: r.token, at: Date.now() }); done(); } catch (e) { err.textContent = e.name === 'NotAllowedError' ? 'Face ID was cancelled' : e.message; } });
  $('[data-out]', el).onclick = () => { el.remove(); locked = false; signOut(); };
  document.addEventListener('keydown', function kd(e) { if (!el.isConnected) return document.removeEventListener('keydown', kd); if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace' && del) del.click(); });
  if (!pin && canPk) setTimeout(() => $('[data-pk]', el).click(), 350);
}
function needLock() { const a = Acc.cur(); if (!a || locked) return false; if (!(hasPin() || (a.pk && a.pklock))) return false; return Date.now() - LS.get('last', 0) > 5 * 60000; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') LS.set('last', Date.now()); else if (needLock()) lockScreen(); });

function pinSetup(onDone) {
  let first = null, code = '';
  const s = sheet(`<div class="pinset"><div class="pin-ic">${ic('lock', 30)}</div><h2>Choose a 4-digit PIN</h2><p class="mut">You will type it to open the app on this phone.</p><div class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="lk-err" role="alert"></div>
    <div class="keypad sm">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}">${n}</button>`).join('')}<span></span><button class="key" data-k="0">0</button><button class="key fn" data-del aria-label="Delete">${ic('back', 24)}</button></div></div>`);
  const dots = $$('.dots i', s.el), h2 = $('h2', s.el), err = $('.lk-err', s.el);
  const upd = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
  $$('[data-k]', s.el).forEach(b => b.onclick = async () => { if (code.length >= 4) return; code += b.dataset.k; haptic(); upd(); if (code.length < 4) return;
    if (!first) { first = code; code = ''; setTimeout(() => { upd(); h2.textContent = 'Type it again'; }, 180); return; }
    if (code !== first) { err.textContent = 'The PINs did not match. Start again.'; first = null; code = ''; h2.textContent = 'Choose a 4-digit PIN'; setTimeout(upd, 200); haptic('warn'); return; }
    const salt = b64u(crypto.getRandomValues(new Uint8Array(12))); LS.set(pinKey(), { salt, hash: await pinHash(code, salt) }); LS.set('last', Date.now()); s.close(); toast('PIN is on'); onDone && onDone(); });
  $('[data-del]', s.el).onclick = () => { code = code.slice(0, -1); upd(); };
}

// ---------- push notifications ----------
const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function pushState() { if (!pushOK()) return 'unsupported'; if (Notification.permission === 'denied') return 'denied'; try { const r = await navigator.serviceWorker.ready; const s = await r.pushManager.getSubscription(); return s ? 'on' : 'off'; } catch (e) { return 'off'; } }
async function pushOn() {
  if (!pushOK()) { installHelp(true); return false; }
  const p = await Notification.requestPermission(); if (p !== 'granted') { toast('Notifications are blocked in the phone settings', 'err'); return false; }
  const me = await api('app67/me'); const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription(); if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(me.push.key) });
  await api('app67/push/sub', { body: { sub: sub.toJSON() } }); toast('Notifications are on'); return true;
}
async function pushOff() { try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); if (s) { await api('app67/push/unsub', { body: { endpoint: s.endpoint } }).catch(() => {}); await s.unsubscribe(); } } catch (e) { } toast('Notifications are off'); }

// ---------- install ----------
let bip = null; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); bip = e; document.body.classList.add('can-install'); });
window.addEventListener('appinstalled', () => { bip = null; document.body.classList.remove('can-install'); toast('DoorHold is on your home screen'); });
function installHelp(forPush) {
  if (bip && !forPush) { bip.prompt(); bip.userChoice.finally(() => { bip = null; }); return; }
  const android = /android/i.test(navigator.userAgent);
  sheet(`<div class="inst"><div class="inst-app"><img src="/app/img/icon-96.png" alt="" width="64" height="64"><div><b>DoorHold</b><small>Opens full screen, keeps you signed in${forPush ? ', and can send notifications' : ''}</small></div></div>
    ${forPush ? '<p class="note">On iPhone, notifications work once DoorHold is on your Home Screen (iOS 16.4 or newer). Add it, open it from the icon, then turn notifications on in More.</p>' : ''}
    ${isIOS || !android ? `<h3>On iPhone (Safari)</h3><ol class="steps"><li><span class="n">1</span><span>Tap the <b>Share</b> button ${ic('share', 20, 'inl')} at the bottom of Safari</span></li><li><span class="n">2</span><span>Scroll and tap <b>Add to Home Screen</b> ${ic('addbox', 20, 'inl')}</span></li><li><span class="n">3</span><span>Tap <b>Add</b>. Open DoorHold from your Home Screen.</span></li></ol>` : ''}
    ${android || !isIOS ? `<h3>On Android (Chrome)</h3><ol class="steps"><li><span class="n">1</span><span>Tap the menu ${ic('more', 20, 'inl')} at the top right</span></li><li><span class="n">2</span><span>Tap <b>Install app</b> or <b>Add to Home screen</b></span></li><li><span class="n">3</span><span>Open DoorHold from your apps</span></li></ol>` : ''}
    ${bip ? `<button class="btn" data-inst>${ic('download', 20)} Install now</button>` : ''}</div>`);
  const b = $('[data-inst]'); if (b) b.onclick = () => { bip.prompt(); };
}

// ---------- router + screens ----------
const R = {}; // route name -> async (ctx) => screen
const TABS = {
  tenant: [['t/home', 'Home', 'home'], ['t/pay', 'Pay', 'card'], ['t/requests', 'Requests', 'wrench'], ['t/messages', 'Messages', 'chat'], ['more', 'More', 'more']],
  worker: [['w/jobs', 'Jobs', 'briefcase'], ['w/money', 'Money', 'wallet'], ['w/messages', 'Messages', 'chat'], ['more', 'More', 'more']],
  manager: [['m/home', 'Home', 'home'], ['m/properties', 'Properties', 'building'], ['m/work', 'Work', 'wrench'], ['m/inbox', 'Inbox', 'inbox'], ['more', 'More', 'more']],
  owner: [['o/home', 'Home', 'home'], ['o/statements', 'Statements', 'chart'], ['o/requests', 'Requests', 'wrench'], ['more', 'More', 'more']]
};
const ROLE_LABEL = { tenant: 'Tenant', worker: 'Contractor', manager: 'Manager', owner: 'Owner' };
let ME = null, curRoute = '', curDepth = 0, badge = {};
const route = () => (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
function go(r) { if (('#/' + r) === location.hash) render(true); else location.hash = '#/' + r; }
function home() { return (TABS[(Acc.cur() || {}).role] || TABS.tenant)[0][0]; }
function tabbar() {
  const role = (Acc.cur() || {}).role; const tabs = TABS[role] || []; let nav = $('#tabbar');
  if (!nav) { nav = document.createElement('nav'); nav.id = 'tabbar'; nav.setAttribute('aria-label', 'Main'); document.body.append(nav); }
  const r = route(); const tab = tabs.find(t => r === t[0] || r.startsWith(t[0].split('/')[0] + '/' + (t[0].split('/')[1] || '').replace(/s$/, ''))) || tabs.find(t => r.split('/')[0] === t[0].split('/')[0] && r.split('/')[1] === t[0].split('/')[1]);
  const act = TABOF[r.split('/').slice(0, 2).join('/')] || (tab && tab[0]) || (r === 'more' || r.startsWith('set/') ? 'more' : '');
  nav.innerHTML = tabs.map(t => `<a href="#/${t[0]}" class="${act === t[0] ? 'on' : ''}" ${act === t[0] ? 'aria-current="page"' : ''}><span class="ti">${ic(t[2], 25)}${badge[t[0]] ? `<b class="bdg">${badge[t[0]] > 9 ? '9+' : badge[t[0]]}</b>` : ''}</span><span>${t[1]}</span></a>`).join('');
  $$('a', nav).forEach(a => a.onclick = () => { haptic(); if (a.classList.contains('on')) { const sc = $('.scr.cur .scroll'); if (sc && sc.scrollTop > 0) { sc.scrollTo({ top: 0, behavior: 'smooth' }); return false; } } });
}
// detail routes -> which tab stays lit
const TABOF = { 't/request': 't/requests', 't/thread': 't/messages', 't/docs': 'more', 'w/job': 'w/jobs', 'w/chat': 'w/messages', 'm/property': 'm/properties', 'm/unit': 'm/properties', 'm/tenant': 'm/properties', 'm/tenants': 'more', 'm/job': 'm/work', 'm/thread': 'm/inbox', 'm/wchat': 'm/inbox', 'o/statement': 'o/statements', 'o/request': 'o/requests', 'set/notify': 'more', 'set/security': 'more', 'set/accounts': 'more', 'set/company': 'more' };
const SK = { list: n => `<div class="card list">${Array.from({ length: n || 5 }, () => '<div class="row"><div class="sk sk-av"></div><div class="m"><div class="sk sk-l"></div><div class="sk sk-s"></div></div></div>').join('')}</div>`, hero: '<div class="sk sk-hero"></div>', tiles: '<div class="tiles">' + '<div class="sk sk-tile"></div>'.repeat(4) + '</div>' };
async function render(refresh) {
  const a = Acc.cur(); if (!a) return loginScreen();
  let r = route(); if (!r) { location.replace('#/' + home()); return; }
  const [p0, p1, ...rest] = r.split('/'); let name = p0 === 'more' ? 'more' : p0 + '/' + (p1 || ''); if (!R[name]) { name = home(); location.replace('#/' + name); return; }
  const tabs = TABS[a.role] || []; const isTab = tabs.some(t => t[0] === r) || r === 'more';
  const depth = isTab ? 0 : 1 + (rest.length > 1 ? 1 : 0); const dir = refresh ? 'none' : depth > curDepth ? 'push' : depth < curDepth ? 'pop' : 'fade';
  curRoute = r; curDepth = depth; tabbar();
  const stage = $('#stage'); const old = $('.scr.cur', stage);
  const el = document.createElement('section'); el.className = 'scr'; el.dataset.r = r;
  let scr; const ctx = { args: rest, el, route: r, refresh: () => render(true) };
  // placeholder with skeleton while the data comes
  const spec = R[name].sk || { title: '', sk: SK.list(5) };
  el.innerHTML = frame({ title: typeof spec.title === 'function' ? spec.title(ctx) : spec.title, back: !isTab, body: spec.sk || SK.list(5), large: isTab });
  if (refresh && old) { old.replaceWith(el); el.classList.add('cur'); }
  else { stage.append(el); if (old) { old.classList.remove('cur'); old.classList.add('out-' + dir); setTimeout(() => old.remove(), 380); } el.classList.add('in-' + dir); requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('cur'); el.classList.remove('in-' + dir); })); }
  try { scr = await R[name](ctx); } catch (e) { scr = { title: spec.title || '', body: e.status === 0 ? offlineHtml() : `<div class="empty big">${ic('alert', 34)}<b>That did not load</b><span>${esc(e.message)}</span><button class="btn tint sm" data-retry>Try again</button></div>` }; }
  if (!el.isConnected || curRoute !== r) return;
  if (!scr) return;
  const sc = $('.scroll', el); const keep = refresh ? sc.scrollTop : 0;
  el.innerHTML = frame({ title: scr.title, back: isTab ? null : (scr.back || true), body: scr.body, large: isTab && scr.large !== false, action: scr.action, sub: scr.sub });
  $('.scroll', el).scrollTop = keep; wireScreen(el, ctx); lazyImgs(el); if (scr.after) try { scr.after(el, ctx); } catch (e) { console.error(e); }
}
function frame(o) {
  return `<header class="nav"><div class="nav-l">${o.back ? `<button class="nb back" data-back aria-label="Back">${ic('back', 26)}</button>` : ''}</div><div class="nav-t">${esc(o.title || '')}</div><div class="nav-r">${o.action || ''}</div></header>
    <div class="scroll"><div class="ptr" aria-hidden="true"><span class="spin"></span></div>${o.large ? `<div class="lt"><h1>${esc(o.title || '')}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div>` : `<div class="lt sm"><h1>${esc(o.title || '')}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div>`}<div class="body">${o.body || ''}</div><div class="tb-space"></div></div>`;
}
function wireScreen(el, ctx) {
  const sc = $('.scroll', el), nav = $('.nav', el);
  const onS = () => nav.classList.toggle('scrolled', sc.scrollTop > 34); sc.addEventListener('scroll', onS, { passive: true }); onS();
  const b = $('[data-back]', el); if (b) b.onclick = () => { haptic(); if (history.length > 1 && sessionStorage.getItem('dh67_nav')) history.back(); else go(TABOF[ctx.route.split('/').slice(0, 2).join('/')] || home()); };
  const rt = $('[data-retry]', el); if (rt) rt.onclick = () => render(true);
  // pull to refresh
  const ptr = $('.ptr', el); let y0 = null, d = 0;
  sc.addEventListener('touchstart', e => { y0 = sc.scrollTop <= 0 ? e.touches[0].clientY : null; d = 0; }, { passive: true });
  sc.addEventListener('touchmove', e => { if (y0 == null) return; d = Math.max(0, e.touches[0].clientY - y0); if (d > 0 && sc.scrollTop <= 0) { const k = Math.min(90, d * 0.5); ptr.style.height = k + 'px'; ptr.classList.toggle('arm', k > 60); } }, { passive: true });
  sc.addEventListener('touchend', () => { if (y0 == null) return; const arm = ptr.classList.contains('arm'); y0 = null; if (arm) { ptr.classList.add('go'); haptic(); setTimeout(() => render(true), 250); } else { ptr.style.height = '0px'; } ptr.classList.remove('arm'); });
  $$('[data-go]', el).forEach(x => x.onclick = e => { e.preventDefault(); haptic(); go(x.dataset.go); });
  $$('[data-file]', el).forEach(x => x.onclick = e => { e.preventDefault(); openFile(+x.dataset.file, x.dataset.name); });
}
window.addEventListener('hashchange', () => { sessionStorage.setItem('dh67_nav', '1'); if (sheetStack.length) sheetStack.slice().forEach(s => s.close()); render(); });
const offlineHtml = () => `<div class="empty big off">${ic('globe', 38)}<b>You are offline</b><span>Connect to Wi-Fi or mobile data. Your account is safe on this phone.</span><button class="btn tint sm" data-retry>${ic('refresh', 18)} Try again</button></div>`;
window.addEventListener('offline', () => document.body.classList.add('is-off')); window.addEventListener('online', () => { document.body.classList.remove('is-off'); if ($('.off')) render(true); });

// shared bits
const row = (o) => `<${o.go ? 'a href="#/' + esc(o.go) + '"' : o.tag || 'div'} class="row ${o.cls || ''}" ${o.attr || ''}>${o.av !== undefined ? `<div class="av ${o.avc || ''}">${o.av}</div>` : ''}<div class="m"><div class="t">${o.t}</div>${o.d ? `<div class="d">${o.d}</div>` : ''}</div>${o.r !== undefined ? `<div class="rv">${o.r}</div>` : ''}${o.go || o.chev ? ic('chev', 18, 'chv') : ''}</${o.go ? 'a' : o.tag || 'div'}>`;
const pill = (txt, k) => `<span class="pill ${k || ''}">${esc(txt)}</span>`;
const STATUS = { new: ['New', 'blue'], assigned: ['Assigned', 'amber'], in_progress: ['In progress', 'amber'], scheduled: ['Scheduled', 'amber'], waiting: ['Waiting', 'gray'], on_hold: ['On hold', 'gray'], completed: ['Done', 'green'], closed: ['Closed', 'gray'] };
const stPill = s => { const x = STATUS[s] || [cap(s), 'gray']; return pill(x[0], x[1]); };
const prioPill = p => p === 'emergency' ? pill('Emergency', 'red') : p === 'high' ? pill('Urgent', 'red') : '';
const empty = (icn, t, s) => `<div class="empty">${ic(icn, 30)}<b>${esc(t)}</b>${s ? `<span>${esc(s)}</span>` : ''}</div>`;
const sec = (t, right) => `<div class="sec"><h2>${esc(t)}</h2>${right || ''}</div>`;
const fileChips = fs => (fs && fs.length) ? `<div class="bfiles">${fs.map(f => /^image\//.test(f.ctype || 'image/') && !/pdf/i.test(f.ctype || '') ? `<button class="ph sm" data-file="${f.id}" data-name="${esc(f.name || 'Photo')}"><img data-fid="${f.id}" alt="${esc(f.name || 'Photo')}"></button>` : `<button class="fchip" data-file="${f.id}" data-name="${esc(f.name || 'File')}">${ic('file', 18)}<span>${esc(f.name || 'File')}</span></button>`).join('')}</div>` : '';
const chatHtml = (msgs, mine) => `<div class="chat">${msgs.length ? msgs.map(m => `<div class="bub ${mine(m) ? 'me' : 'them'}">${m.body && !(m.files && m.files.length && /^(Sent (a file|\d+ files)|📷 Photo)$/.test(m.body)) ? `<p>${esc(m.body).replace(/\n/g, '<br>')}</p>` : ''}${fileChips(m.files)}<small>${mine(m) ? '' : esc(m.author || '') + ' · '}${ago(m.created)}</small></div>`).join('') : '<div class="empty sm">No messages yet. Say hello.</div>'}</div>`;
const composer = (ph, attach) => `<form class="composer">${attach ? `<button type="button" class="att" data-att aria-label="Add photo or file">${ic('plus', 22)}</button>` : ''}<div class="cbox"><div class="cfiles" hidden></div><textarea name="text" rows="1" placeholder="${esc(ph || 'Message')}" aria-label="Message"></textarea><div class="prog" hidden><i></i></div></div><button class="send" type="submit" aria-label="Send">${ic('send', 20)}</button></form>`;
function wireComposer(el, send, accept) {
  const f = $('.composer', el); if (!f) return; const ta = $('textarea', f); const files = []; const box = $('.cfiles', f); const prog = $('.prog', f);
  const draw = () => { box.hidden = !files.length; box.innerHTML = files.map((x, i) => `<div class="thumb xs">${/^image\//.test(x.type) ? `<img src="${URL.createObjectURL(x)}" alt="">` : `${ic('file', 22)}`}<button type="button" data-rm="${i}" aria-label="Remove">${ic('x', 12)}</button></div>`).join(''); $$('[data-rm]', box).forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); draw(); }); };
  const att = $('[data-att]', f); if (att) att.onclick = () => chooseFiles(accept || 'image/*,application/pdf', fs => { files.push(...fs.slice(0, 8 - files.length)); draw(); });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
  f.onsubmit = async e => { e.preventDefault(); const t = ta.value.trim(); if (!t && !files.length) return; const b = $('.send', f); b.disabled = true;
    try { await send(t, files.slice(), p => { prog.hidden = false; $('i', prog).style.width = Math.round(p * 100) + '%'; }); ta.value = ''; files.length = 0; draw(); haptic('ok'); render(true); } catch (err) { toast(err.message, 'err'); } finally { b.disabled = false; prog.hidden = true; } };
  const ch = $('.chat', el); if (ch) setTimeout(() => { const sc = $('.scroll', el); sc.scrollTop = sc.scrollHeight; }, 30);
}
// camera or library/files: one small action sheet, used everywhere a photo or document can be added
function chooseFiles(accept, cb, opt = {}) {
  const imgOnly = /^image\/\*$/.test(accept);
  const s = sheet(`<div class="choose"><h2>${esc(opt.title || 'Add photos or files')}</h2>
    <label class="opt"><span class="oi">${ic('camera', 24)}</span><span class="m"><b>Take photo</b><small>Opens the camera</small></span><input type="file" accept="image/*" capture="environment" hidden data-cam></label>
    <label class="opt"><span class="oi">${ic(imgOnly ? 'addbox' : 'file', 24)}</span><span class="m"><b>${imgOnly ? 'Choose from photos' : 'Choose from photos or files'}</b><small>${imgOnly ? 'Pick several at once' : 'Photos or PDF files, several at once'}</small></span><input type="file" accept="${esc(accept)}" multiple hidden data-lib></label></div>`);
  $$('input', s.el).forEach(i => i.onchange = () => { const fs = [...i.files]; if (fs.length) { s.close(); haptic(); cb(fs); } });
}
async function xhrUpload(path, fd, onProg) {
  return new Promise((res, rej) => { const a = Acc.cur(); const x = new XMLHttpRequest(); x.open('POST', '/api/' + path); x.setRequestHeader('x-pm-app', '1'); if (a) x.setRequestHeader('authorization', 'Bearer ' + a.token); x.withCredentials = false;
    x.upload.onprogress = e => { if (e.lengthComputable && onProg) onProg(e.loaded / e.total); };
    x.onload = () => { let j = null; try { j = JSON.parse(x.responseText); } catch (e) { } if (x.status >= 200 && x.status < 300) res(j); else rej(new ApiErr((j && j.error) || 'Upload failed', x.status)); };
    x.onerror = () => rej(new ApiErr('No internet connection. Try again.', 0)); x.send(fd); });
}
async function uploadPhotos(files, onProg, extra) { const ids = []; let i = 0; for (const f of files) { const fd = new FormData(); fd.append('file', await shrink(f)); fd.append('kind', /pdf/i.test(f.type) ? 'document' : 'photo'); if (extra) for (const [k, v] of Object.entries(extra)) fd.append(k, v); const r = await xhrUpload('files', fd, p => onProg && onProg((i + p) / files.length)); ids.push(r.id); i++; } return ids; }
async function shrink(f, max = 1800) { // keeps uploads small on mobile data
  if (!/^image\/(jpeg|png|webp|heic|heif)/i.test(f.type)) return f;
  try { const bmp = await createImageBitmap(f); const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); if (k === 1 && f.size < 1.5e6) return f; const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); return new File([b], (f.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }); } catch (e) { return f; }
}
function photoPicker(el, name, accept) { // Take photo + Choose photos/files, thumbnails before upload; returns getter of File[]
  const box = $(`[data-photos="${name}"]`, el); const files = []; accept = accept || 'image/*';
  const draw = () => { box.innerHTML = files.map((f, i) => `<div class="thumb">${/^image\//.test(f.type) ? `<img src="${URL.createObjectURL(f)}" alt="Photo ${i + 1}">` : `<div class="fthumb">${ic('file', 26)}<small>${esc((f.name || 'File').slice(0, 14))}</small></div>`}<button type="button" data-rm="${i}" aria-label="Remove">${ic('x', 14)}</button></div>`).join('')
      + `<label class="thumb add">${ic('camera', 24)}<span>Take photo</span><input type="file" accept="image/*" capture="environment" hidden data-cam></label><label class="thumb add">${ic(accept === 'image/*' ? 'addbox' : 'file', 24)}<span>${accept === 'image/*' ? 'Photos' : 'Photos or files'}</span><input type="file" accept="${esc(accept)}" multiple hidden data-lib></label>`;
    $$('input', box).forEach(i => i.onchange = e => { files.push(...[...e.target.files].slice(0, 8 - files.length)); draw(); haptic(); });
    $$('[data-rm]', box).forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); draw(); }); };
  draw(); return () => files;
}
const progHtml = '<div class="prog big" hidden><i></i><span>Uploading</span></div>';
const progSet = (root, p, label) => { const pr = $('.prog.big', root); if (!pr) return; pr.hidden = false; $('i', pr).style.width = Math.round(p * 100) + '%'; $('span', pr).textContent = label || `Uploading ${Math.round(p * 100)}%`; };

// ---------- sign in ----------
function loginScreen(addMode) {
  $('#tabbar')?.remove(); const stage = $('#stage'); const accs = Acc.all();
  stage.innerHTML = `<section class="scr cur login">
    <div class="lg-hero"><div class="lg-mark">${BRAND}</div><h1>${addMode ? 'Add an account' : 'Welcome to DoorHold'}</h1><p>Rent, repairs and messages in one place.</p></div>
    <div class="lg-card">
      ${accs.length && !addMode ? `<div class="lg-accs"><h2>Continue as</h2>${accs.map(x => `<button class="acc" data-acc="${esc(x.email)}"><span class="av">${esc(initials(x.name))}</span><span class="m"><b>${esc(x.name || x.email)}</b><small>${esc(ROLE_LABEL[x.role] || '')}${x.company ? ' · ' + esc(x.company) : ''}</small></span>${ic('chev', 18, 'chv')}</button>`).join('')}<div class="or"><span>or sign in to another account</span></div></div>` : `<h2 class="lg-t">Sign in</h2>`}
      <form id="lf" autocomplete="on" novalidate>
        <label class="lin"><span>Email</span><input name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" required placeholder="you@example.com"></label>
        <label class="lin pw"><span>Password</span><input name="password" type="password" autocomplete="current-password" required placeholder="Your password"><button type="button" class="eye" aria-label="Show password">Show</button></label>
        <button class="btn big" type="submit">Sign in</button>
      </form>
      ${pkOK() ? `<button class="btn big tint" id="pkbtn">${ic('face', 22)} Sign in with Face ID</button>` : ''}
      <p class="lg-help">Tenants, contractors, owners and managers all sign in here with the login their property company gave them. Forgot it? Ask your property manager to send a new one.</p>
      ${addMode ? '<button class="btn plain" id="lgcancel">Cancel</button>' : ''}
      <div class="lg-foot">${standalone() ? '' : `<button class="lg-inst" id="lginst">${ic('download', 18)} Install the app on this phone</button>`}<a href="/" class="lg-web">Open the website</a></div>
    </div></section>`;
  const f = $('#lf'); const eye = $('.eye', f); eye.onclick = () => { const i = $('[name=password]', f); const s = i.type === 'password'; i.type = s ? 'text' : 'password'; eye.textContent = s ? 'Hide' : 'Show'; eye.setAttribute('aria-label', s ? 'Hide password' : 'Show password'); };
  f.onsubmit = async e => { e.preventDefault(); const x = Object.fromEntries(new FormData(f)); if (!x.email || !x.password) return showErr(f, 'Enter your email and password'); const b = $('[type=submit]', f); b.disabled = true; b.classList.add('busy');
    try { const r = await api('login', { body: { email: x.email.trim(), password: x.password }, anon: true }); if (r.mfa_required) return mfaScreen(r); await signedIn(r); } catch (err) { showErr(f, err.status === 0 ? 'No internet connection' : err.message); } finally { b.disabled = false; b.classList.remove('busy'); } };
  $$('[data-acc]').forEach(b => b.onclick = async () => { Acc.use(b.dataset.acc); haptic(); if (hasPin() || Acc.cur().pk) { LS.set('last', 0); await boot(); } else boot(); });
  const pk = $('#pkbtn'); if (pk) pk.onclick = async () => { try { const r = await pkSignIn(); await signedIn(r); } catch (e) { if (e.name !== 'NotAllowedError') showErr(f, e.message); } };
  const li = $('#lginst'); if (li) li.onclick = () => installHelp(); const lc = $('#lgcancel'); if (lc) lc.onclick = () => boot();
  hideSplash();
}
function mfaScreen(r) {
  const ms = r.methods || ['app']; const hasApp = ms.includes('app'); let info = r.sim_code ? { sim_code: r.sim_code } : null;
  const txt = () => hasApp ? 'Open your authenticator app and type the 6-digit code for DoorHold. A backup code works too.' : `We sent a 6-digit code to ${esc(r.email_to || 'your email')}.`;
  const pr = () => info && info.sim_code ? `<p class="mut" id="pr80">Practice mode: emails are not sent yet. Your code is <b>${esc(info.sim_code)}</b></p>` : '<p id="pr80" hidden></p>';
  const s = sheet(`<form class="mfa"><div class="pin-ic">${ic('key', 28)}</div><h2>Two-step code</h2><p class="mut" id="mt80">${txt()}</p>${pr()}<label class="lin"><span>Code</span><input name="code" inputmode="${hasApp ? 'text' : 'numeric'}" autocomplete="one-time-code" maxlength="11" required placeholder="123 456"></label>${r.remember_days ? `<label class="lin chk80"><input type="checkbox" name="remember" checked> Remember this phone for ${r.remember_days} days</label>` : ''}<button class="btn big" type="submit">Continue</button>${ms.includes('email') ? `<button class="btn ghost" type="button" id="em80">${hasApp ? 'Email me a code instead' : 'Send a new code'}</button>` : ''}</form>`, {
    onSubmit: async x => { const j = await api('login/2fa', { anon: true, body: { challenge: r.challenge, code: x.code, remember: !!x.remember } }); s.close(); await signedIn(j); } });
  const eb = $('#em80', s.el); if (eb) eb.onclick = async () => { eb.disabled = true; try { info = await api('login/2fa/email', { anon: true, body: { challenge: r.challenge } }); $('#mt80', s.el).textContent = `We sent a 6-digit code to ${info.email_to || 'your email'}.`; const p = $('#pr80', s.el); if (info.sim_code) { p.hidden = false; p.className = 'mut'; p.innerHTML = `Practice mode: emails are not sent yet. Your code is <b>${esc(info.sim_code)}</b>`; } } catch (e) { alert(e.message); } setTimeout(() => { eb.disabled = false; }, 30000); };
  setTimeout(() => $('[name=code]', s.el).focus(), 350);
}
async function signedIn(r) {
  const tmp = { token: r.token, id: r.user.id, name: r.user.name, email: r.user.email, role: r.user.role, at: Date.now() };
  Acc.add(tmp); const me = await api('app67/me'); Acc.update({ company: me.company, pk: (me.passkeys || []).length > 0 && (LS.get('pkids', {})[tmp.email] || []).length > 0 });
  LS.set('last', Date.now()); haptic('ok'); location.hash = '#/' + home(); await boot(true);
  if (!LS.get('onb_' + tmp.email, false)) setTimeout(onboard, 500);
}
function onboard() {
  const a = Acc.cur(); LS.set('onb_' + a.email, true);
  const s = sheet(`<div class="onb"><div class="pin-ic">${ic('face', 30)}</div><h2>Open DoorHold faster</h2><p class="mut">You stay signed in on this phone. Add a lock so only you can open it.</p>
    ${pkOK() ? `<button class="opt" data-o="pk"><span class="oi">${ic('face', 24)}</span><span class="m"><b>Use Face ID</b><small>Or your fingerprint, with a passkey on this phone</small></span>${ic('chev', 18, 'chv')}</button>` : ''}
    <button class="opt" data-o="pin"><span class="oi">${ic('lock', 24)}</span><span class="m"><b>Set a 4-digit PIN</b><small>Asked when you open the app</small></span>${ic('chev', 18, 'chv')}</button>
    <button class="opt" data-o="push"><span class="oi">${ic('bell', 24)}</span><span class="m"><b>Turn on notifications</b><small>New messages, requests and payments</small></span>${ic('chev', 18, 'chv')}</button>
    <button class="btn plain" data-o="skip">Not now</button></div>`);
  $$('[data-o]', s.el).forEach(b => b.onclick = async () => { const o = b.dataset.o; if (o === 'skip') return s.close();
    try { if (o === 'pk') { await pkRegister(); Acc.update({ pklock: true }); b.classList.add('done'); toast('Face ID is on'); } if (o === 'pin') pinSetup(() => b.classList.add('done')); if (o === 'push') { if (await pushOn()) b.classList.add('done'); } } catch (e) { if (e.name !== 'NotAllowedError') toast(e.message, 'err'); } });
}
function signedOut() { const a = Acc.cur(); if (a) { Acc.drop(a.email); } if (Acc.all().length) boot(); else loginScreen(); toast('Please sign in again', 'err'); }
async function signOut(all) {
  const a = Acc.cur(); if (!a) return loginScreen(); let ep = null; try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); ep = s && s.endpoint; } catch (e) { }
  try { await api('app67/signout', { body: { endpoint: ep } }); } catch (e) { }
  LS.del('pin_' + a.email); Acc.drop(a.email); blobCache.clear(); if (Acc.all().length && !all) { toast('Signed out of ' + (a.name || a.email)); boot(); } else { location.hash = ''; loginScreen(); }
}
function switcher() {
  const accs = Acc.all(), cur = Acc.cur();
  const s = sheet(`<div class="sw"><h2>Accounts on this phone</h2>${accs.map(x => `<button class="acc ${x.email === cur.email ? 'on' : ''}" data-acc="${esc(x.email)}"><span class="av">${esc(initials(x.name))}</span><span class="m"><b>${esc(x.name || x.email)}</b><small>${esc(ROLE_LABEL[x.role] || '')}${x.company ? ' · ' + esc(x.company) : ''}</small></span>${x.email === cur.email ? ic('check', 20, 'okc') : ''}</button>`).join('')}
    <button class="opt" data-add><span class="oi">${ic('plus', 22)}</span><span class="m"><b>Add another account</b><small>Another company or role, same phone</small></span></button></div>`);
  $$('[data-acc]', s.el).forEach(b => b.onclick = () => { s.close(); if (b.dataset.acc === cur.email) return; Acc.use(b.dataset.acc); blobCache.clear(); haptic('ok'); location.hash = '#/' + home(); LS.set('last', 0); boot(true); });
  $('[data-add]', s.el).onclick = () => { s.close(); loginScreen(true); };
}
// opening: logo splash, then a clean white screen, then Sign in (or straight to the role home when signed in)
let splashGone = false;
function hideSplash() { if (splashGone) return; splashGone = true; const s = document.getElementById('splash'); if (!s) { document.body.classList.add('ready'); return; }
  setTimeout(() => { s.classList.add('w'); setTimeout(() => { document.body.classList.add('ready'); s.classList.add('out'); setTimeout(() => s.remove(), 450); }, 520); }, Math.max(0, 1000 - performance.now())); }
async function boot(fresh) {
  const a = Acc.cur(); if (!a) return loginScreen();
  if (!$('#stage .scr:not(.login)')) $('#stage').innerHTML = '';
  if (Date.now() - (a.at || 0) > 7 * 86400000) { try { const r = await api('app67/refresh', { body: {} }); Acc.update({ token: r.token, at: Date.now() }); } catch (e) { } }
  api('app67/me').then(me => { ME = me; Acc.update({ company: me.company, name: me.user.name }); }).catch(() => {});
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/' + home());
  else { const r = route(); const p = r.split('/')[0]; const ok = { tenant: 't', worker: 'w', manager: 'm', owner: 'o' }[a.role]; if (p !== 'more' && p !== 'set' && p !== ok) location.replace('#/' + home()); }
  curDepth = 0; await render(true); hideSplash(); if (!fresh && needLock()) lockScreen(); badges();
}
async function badges() { const a = Acc.cur(); if (!a) return; try {
  if (a.role === 'manager') { const x = await api('app67/m/approvals'); badge['m/inbox'] = x.counts.total; }
  if (a.role === 'tenant') { const u = await api('t/x29/unread'); badge['t/requests'] = u.total; }
  if (a.role === 'worker') { const c = await api('app67/chats'); badge['w/messages'] = c.threads.reduce((s, t) => s + (t.unread || 0), 0); }
  tabbar(); } catch (e) { } }

// ================= TENANT =================
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const first = n => String(n || '').trim().split(/\s+/)[0];
const unitL = u => /\d/.test(String(u)) && String(u).length <= 6 ? 'Unit ' + u : String(u);
const roleChip = () => Acc.all().length > 1 ? `<button class="rolechip" data-switch aria-label="Switch account">${esc(ROLE_LABEL[(Acc.cur() || {}).role] || '')}${ic('switch', 14)}</button>` : '';
const wireSwitch = el => { const b = $('[data-switch]', el); if (b) b.onclick = switcher; };
R['t/home'] = async () => {
  const [h, p, u] = await Promise.all([api('t/home'), api('t/portal'), api('t/x29/unread').catch(() => ({ total: 0, by: {} }))]);
  const l = h.lease || {}; const due = Math.max(0, h.balance || 0); const up = (p.upcoming || [])[0];
  const open = (h.requests || []).filter(w => !['completed', 'closed'].includes(w.status));
  const ids = Object.keys(u.by || {});
  return { title: `${greet()}, ${first(h.tenant && h.tenant.first || (Acc.cur() || {}).name)}`, sub: esc([l.property, l.unit ? unitL(l.unit) : ''].filter(Boolean).join(' · ')), action: roleChip(), body: `
    <div class="hero">${due > 0 ? `<small>Balance due</small><div class="big">${money(due)}</div>` : `<small>Your balance</small><div class="big">${money(h.balance || 0)}</div><div class="hsub">${(h.balance || 0) < 0 ? 'You have a credit' : 'You are all paid up'}</div>`}
      ${up ? `<div class="hsub">${esc(up.memo)} ${money(up.amount)} · due ${fdate(up.date)}</div>` : ''}
      <button class="btn white" data-go="t/pay">${ic('card', 20)} ${due > 0 ? 'Pay rent' : 'Make a payment'}</button></div>
    ${u.total ? `<a class="notice" href="#/${ids.length === 1 ? 't/request/' + ids[0] : 't/requests'}"><span class="ndot"></span><span><b>New reply from the office</b><small>About your repair request</small></span>${ic('chev', 18, 'chv')}</a>` : ''}
    <div class="tiles">
      <button class="tile" data-go="t/requests?new=1"><span class="ti g">${ic('wrench', 24)}</span><b>Request a repair</b></button>
      <button class="tile" data-go="t/messages"><span class="ti b">${ic('chat', 24)}</span><b>Message the office</b></button>
      <button class="tile" data-go="t/docs"><span class="ti a">${ic('file', 24)}</span><b>Lease and documents</b></button>
      ${p.office_phone ? `<a class="tile" href="tel:${esc(p.office_phone)}"><span class="ti p">${ic('phone', 24)}</span><b>Call the office</b></a>` : `<button class="tile" data-go="t/pay"><span class="ti p">${ic('clock', 24)}</span><b>Payment history</b></button>`}
    </div>
    ${(h.announcements || []).slice(0, 2).map(a => `<div class="card ann"><div class="ann-h">${ic('bell', 18)}<b>${esc(a.title)}</b></div><p>${esc(a.body)}</p><small>${esc(a.author || 'Management')} · ${fdate(a.created)}</small></div>`).join('')}
    ${sec('Open requests', open.length ? '<a href="#/t/requests" class="seeall">See all</a>' : '')}
    ${open.length ? `<div class="card list">${open.slice(0, 3).map(w => row({ go: 't/request/' + w.id, av: ic('wrench', 20), avc: 'g', t: esc(w.title), d: `${fdate(w.created)}${w.vendor ? ' · ' + esc(w.vendor) : ''}`, r: stPill(w.status) })).join('')}</div>` : `<div class="card">${empty('check', 'Nothing open', 'Something broken? Tap Request a repair.')}</div>`}
    ${sec('Recent activity')}
    <div class="card list">${(h.ledger || []).slice(0, 5).map(e => row({ av: ic(e.kind === 'payment' ? 'check' : 'file', 20), avc: e.kind === 'payment' ? 'g' : 'gray', t: esc(e.memo || cap(e.kind)), d: fdate(e.date), r: `<b class="${e.amount < 0 ? 'pos' : ''}">${e.amount < 0 ? '+' + money(-e.amount) : money(e.amount)}</b>` })).join('') || empty('clock', 'No activity yet')}</div>`, after: wireSwitch };
};
R['t/home'].sk = { title: 'Home', sk: SK.hero + SK.tiles + SK.list(3) };
R['t/pay'] = async () => {
  const [h, p] = await Promise.all([api('t/home'), api('t/portal')]); const due = Math.max(0, h.balance || 0); const l = h.lease || {};
  const memo = `${l.property || ''}${l.unit ? ' #' + l.unit : ''} rent`.trim();
  const hist = (h.ledger || []).filter(e => e.kind === 'payment').slice(0, 6);
  const reps = p.reports || [];
  const online = p.online;
  return { title: 'Pay', body: `
    <div class="hero sm"><small>Amount due</small><div class="big">${money(due)}</div>${(p.upcoming || [])[0] ? `<div class="hsub">Next: ${esc(p.upcoming[0].memo)} ${money(p.upcoming[0].amount)} on ${fdate(p.upcoming[0].date)}</div>` : ''}</div>
    ${online ? `<form class="card form" id="payf">${field('Amount', `<div class="money-in"><span>$</span><input name="amount" inputmode="decimal" value="${(due / 100).toFixed(2)}" required></div>`)}
      <div class="seg" role="radiogroup" aria-label="Pay with"><button type="button" class="on" data-m="card">Card</button><button type="button" data-m="ach">Bank account</button></div>
      <button class="btn big" type="submit">${ic('lock', 20)} Pay now</button><p class="fine">Secure payment. You get a receipt in the app.</p></form>`
    : `<div class="card zel"><div class="zh"><span class="zl">Z</span><div><b>Pay with Zelle</b><small>From your bank app. Free and instant.</small></div></div>
      <ol class="steps"><li><span class="n">1</span><span>Open your bank app, then Zelle</span></li>
      <li><span class="n">2</span><span>Send to <button class="cp" data-cp="${esc(p.zelle_to)}">${esc(p.zelle_to)} <i>Copy</i></button></span></li>
      <li><span class="n">3</span><span>Amount <button class="cp" data-cp="${(due / 100).toFixed(2)}">${money(due)} <i>Copy</i></button></span></li>
      <li><span class="n">4</span><span>Memo <button class="cp" data-cp="${esc(memo)}">${esc(memo)} <i>Copy</i></button></span></li>
      <li><span class="n">5</span><span>Then tap <b>I paid</b> below so the office can match it</span></li></ol>
      <button class="btn big" data-ipaid>${ic('check', 20)} I paid</button></div>`}
    ${reps.length ? sec('Reported to the office') + `<div class="card list">${reps.map(r => row({ av: ic(r.status === 'confirmed' ? 'check' : 'clock', 20), avc: r.status === 'confirmed' ? 'g' : r.status === 'dismissed' ? 'red' : 'amber', t: `${money(r.amount)} · ${esc(r.method)}`, d: `${fdate(r.date)} · ${r.status === 'confirmed' ? 'Confirmed' : r.status === 'dismissed' ? 'Not matched. Please call the office.' : 'Waiting for the office'}` })).join('')}</div>` : ''}
    ${sec('Payment history')}<div class="card list">${hist.map(e => row({ av: ic('check', 20), avc: 'g', t: money(-e.amount), d: `${fdate(e.date)}${e.method ? ' · ' + esc(e.method) : ''}` })).join('') || empty('clock', 'No payments yet')}</div>`,
    after: (el) => {
      $$('.cp', el).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.cp); toast('Copied'); } catch (e) { prompt('Copy this', b.dataset.cp); } });
      let method = 'card'; $$('.seg [data-m]', el).forEach(b => b.onclick = () => { method = b.dataset.m; $$('.seg [data-m]', el).forEach(z => z.classList.toggle('on', z === b)); haptic(); });
      const pf = $('#payf', el); if (pf) pf.onsubmit = async e => { e.preventDefault(); const b = $('[type=submit]', pf); b.disabled = true; b.classList.add('busy'); try { const r = await api('t/pay', { body: { amount: $('[name=amount]', pf).value, method } }); if (r.status === 'succeeded') { toast('Payment sent. Thank you!'); render(true); } else showErr(pf, 'The payment did not go through. Try again or use another card.'); } catch (err) { showErr(pf, err.message); } finally { b.disabled = false; b.classList.remove('busy'); } };
      const ip = $('[data-ipaid]', el); if (ip) ip.onclick = () => { let m = 'Zelle';
        const s = sheet(`<form><div class="sh-h"><h2>I paid</h2><p class="mut">This tells the office. It shows on your balance once they confirm it.</p></div>${field('Amount you paid', `<div class="money-in"><span>$</span><input name="amount" inputmode="decimal" required value="${(due / 100).toFixed(2)}"></div>`)}
          <div class="fld"><span>How</span><div class="chips">${['Zelle', 'Check', 'Money order', 'Cash'].map(x => `<button type="button" class="chip ${x === m ? 'on' : ''}" data-m="${x}">${x}</button>`).join('')}</div></div>
          ${field('Date', `<input name="date" type="date" value="${new Date().toLocaleDateString('en-CA')}">`)}${field('Confirmation number (optional)', '<input name="ref" autocomplete="off">')}<button class="btn big" type="submit">Send to the office</button></form>`, { onSubmit: async x => { await api('t/paid', { body: { ...x, method: m } }); s.close(); toast('Thanks! The office will confirm it.'); render(true); } });
        $$('[data-m]', s.el).forEach(b => b.onclick = () => { m = b.dataset.m; $$('[data-m]', s.el).forEach(z => z.classList.toggle('on', z === b)); haptic(); }); };
    } };
};
R['t/pay'].sk = { title: 'Pay', sk: SK.hero + SK.list(3) };
const CATS = [['Plumbing', 'drop', 'Plumbing'], ['Electrical', 'bolt', 'Electrical'], ['Heating / AC', 'flame', 'Heating'], ['Appliance', 'fridge', 'Appliance'], ['Doors and locks', 'door', 'Doors & locks'], ['Pests', 'bug', 'Pest'], ['Leak', 'drop', 'Plumbing'], ['Something else', 'dots', 'General']];
function newRequest(after) {
  let cat = null, pr = 'normal';
  const s = sheet(`<form class="nreq"><div class="sh-h"><h2>Request a repair</h2><p class="mut">Tell us what is wrong. Photos help us fix it faster.</p></div>
    <div class="fld"><span>What needs fixing?</span><div class="cats">${CATS.map((c, i) => `<button type="button" class="cat" data-c="${i}">${ic(c[1], 26)}<b>${c[0]}</b></button>`).join('')}</div></div>
    ${field('Short title', '<input name="title" required maxlength="120" placeholder="Kitchen sink is leaking">')}
    ${field('Details', '<textarea name="description" rows="3" placeholder="Where is it, since when, anything you tried"></textarea>')}
    <div class="fld"><span>How urgent?</span><div class="seg"><button type="button" class="on" data-p="normal">Normal</button><button type="button" data-p="high">Urgent</button><button type="button" data-p="emergency">Emergency</button></div><small class="emerg" hidden>For fire, gas smell or flooding call 911 or the office right away.</small></div>
    <label class="tgl"><input type="checkbox" name="entry_ok" checked><span class="sw" aria-hidden="true"></span><span>OK to come in if I am not home</span></label>
    <div class="fld"><span>Photos or files</span><div class="thumbs" data-photos="p"></div></div>
    ${progHtml}<button class="btn big" type="submit">Send request</button></form>`, { full: true, onSubmit: async (x, f) => {
      if (!x.title.trim()) throw new Error('Add a short title'); const ids = await uploadPhotos(getP(), p => progSet(s.el, p));
      const r = await api('t/workorders', { body: { title: x.title.trim(), description: x.description, category: cat ? cat[2] : 'General', priority: pr, entry_ok: x.entry_ok ? 1 : 0, photo_ids: ids } });
      s.close(); toast('Request sent'); after ? after(r.id) : go('t/request/' + r.id); } });
  const getP = photoPicker(s.el, 'p', 'image/*,application/pdf');
  $$('[data-c]', s.el).forEach(b => b.onclick = () => { cat = CATS[+b.dataset.c]; $$('[data-c]', s.el).forEach(z => z.classList.toggle('on', z === b)); const t = $('[name=title]', s.el); if (!t.value || t.dataset.auto) { t.value = cat[0] === 'Something else' ? '' : cat[0] + ' problem'; t.dataset.auto = 1; } haptic(); });
  $('[name=title]', s.el).oninput = e => delete e.target.dataset.auto;
  $$('[data-p]', s.el).forEach(b => b.onclick = () => { pr = b.dataset.p; $$('[data-p]', s.el).forEach(z => z.classList.toggle('on', z === b)); $('.emerg', s.el).hidden = pr !== 'emergency'; haptic(); });
}
R['t/requests'] = async (ctx) => {
  const h = await api('t/home'); const rq = h.requests || []; const u = await api('t/x29/unread').catch(() => ({ by: {} }));
  const open = rq.filter(w => !['completed', 'closed'].includes(w.status)), done = rq.filter(w => ['completed', 'closed'].includes(w.status));
  const li = ws => `<div class="card list">${ws.map(w => row({ go: 't/request/' + w.id, av: ic('wrench', 20), avc: ['completed', 'closed'].includes(w.status) ? 'gray' : 'g', t: esc(w.title) + (u.by && u.by[w.id] ? ' <span class="ndot inl"></span>' : ''), d: `#${w.id} · ${fdate(w.created)}${w.vendor ? ' · ' + esc(w.vendor) : ''}`, r: stPill(w.status) })).join('')}</div>`;
  return { title: 'Requests', action: `<button class="nb" data-new aria-label="New request">${ic('plus', 26)}</button>`, body: `
    <button class="btn big" data-new>${ic('plus', 20)} Request a repair</button>
    ${sec('Open')}${open.length ? li(open) : `<div class="card">${empty('check', 'No open requests')}</div>`}
    ${done.length ? sec('Done') + li(done.slice(0, 20)) : ''}`, after: el => { $$('[data-new]', el).forEach(b => b.onclick = () => newRequest()); if (/new=1/.test(location.hash)) { history.replaceState(null, '', '#/t/requests'); newRequest(); } } };
};
const evFiles = c => { const o = {}; for (const p of (c && c.photos) || []) { const m = /^ev29:(\d+)/.exec(p.note || ''); if (m) (o[m[1]] = o[m[1]] || []).push(p); } return o; };
const STEPS = ['new', 'assigned', 'in_progress', 'completed'];
const steps = s => { const i = Math.max(0, STEPS.indexOf(s === 'closed' ? 'completed' : s === 'scheduled' ? 'assigned' : s)); return `<div class="steps-bar">${['Sent', 'Assigned', 'Working', 'Done'].map((l, k) => `<div class="st ${k <= i ? 'on' : ''}"><i></i><span>${l}</span></div>`).join('')}</div>`; };
R['t/request'] = async (ctx) => {
  const id = +ctx.args[0]; const [w, c] = await Promise.all([api('t/workorders/' + id), api('t/x29/chat/' + id)]);
  const evf = evFiles(c); const msgs = (c.events || []).filter(e => ['note', 'tmsg'].includes(e.kind)).map(e => ({ ...e, mine: e.kind === 'tmsg', files: evf[e.id] || [] }));
  const sys = (c.events || []).filter(e => !['note', 'tmsg'].includes(e.kind));
  return { title: 'Request #' + id, body: `
    <div class="card pad"><div class="rq-h"><h2>${esc(w.title)}</h2>${stPill(w.status)}</div>${steps(w.status)}
      ${w.description ? `<p class="desc">${esc(w.description)}</p>` : ''}
      <dl class="kv"><dt>Sent</dt><dd>${fdate(w.created)}</dd>${w.vendor ? `<dt>Who is fixing it</dt><dd>${esc(w.vendor)}</dd>` : ''}${w.sched_date ? `<dt>Visit</dt><dd>${fdate(w.sched_date)}${w.sched_time ? ' · ' + esc(w.sched_time) : ''}</dd>` : ''}</dl>
      ${(w.photos || []).length ? `<div class="gal">${w.photos.map(p => `<button class="ph" data-file="${p.id}" data-name="${esc(p.name || 'Photo')}"><img data-fid="${p.id}" alt="${esc(p.name || 'Photo')}"></button>`).join('')}</div>` : ''}</div>
    ${sys.length ? `<div class="timeline">${sys.slice(-4).map(e => `<div><i></i><span>${esc(e.body)}</span><small>${ago(e.created)}</small></div>`).join('')}</div>` : ''}
    ${sec('Messages with the office')}${chatHtml(msgs, m => m.mine)}${composer('Write to the office', true)}`,
    after: el => wireComposer(el, async (t, fs, pr) => { const ids = fs.length ? await uploadPhotos(fs, pr) : []; return api('t/x29/chat/' + id, { body: { text: t, photo_ids: ids } }); }) };
};
R['t/request'].sk = { title: 'Request', sk: SK.hero + SK.list(2) };
R['t/messages'] = async () => {
  const p = await api('t/portal'); const msgs = (p.msgs || []).map(m => ({ ...m, mine: !m.from_manager, author: m.from_manager ? (m.author || 'Office') : 'You' }));
  return { title: 'Messages', sub: esc(p.company || ''), body: `${p.office_phone || p.office_email ? `<div class="contact">${p.office_phone ? `<a class="btn tint sm" href="tel:${esc(p.office_phone)}">${ic('phone', 18)} Call</a><a class="btn tint sm" href="sms:${esc(p.office_phone)}">${ic('chat', 18)} Text</a>` : ''}${p.office_email ? `<a class="btn tint sm" href="mailto:${esc(p.office_email)}">Email</a>` : ''}</div>` : ''}
    ${chatHtml(msgs, m => m.mine)}${composer('Message the office')}`, after: el => wireComposer(el, t => api('t/msg', { body: { body: t } })) };
};
R['t/docs'] = async () => {
  const h = await api('t/home'); const l = h.lease || {}; const docs = h.documents || []; const p = await api('t/portal');
  return { title: 'Lease and documents', body: `
    ${l.id ? `<div class="card pad lease"><div class="ls-h">${ic('home', 22)}<div><b>${esc(l.property || '')}${l.unit ? ' · ' + esc(unitL(l.unit)) : ''}</b><small>${esc(l.address || '')}</small></div></div>
      <dl class="kv"><dt>Lease</dt><dd>${fdate(l.start)} to ${l.end ? fdate(l.end) : 'month to month'}</dd><dt>Rent</dt><dd>${money(l.rent)} a month, due day ${l.due_day || 1}</dd>${l.deposit ? `<dt>Deposit</dt><dd>${money(l.deposit)}</dd>` : ''}${l.late_fee ? `<dt>Late fee</dt><dd>${money(l.late_fee)} after ${l.grace_days || 0} days</dd>` : ''}</dl></div>` : ''}
    ${(p.sign || []).filter(s => s.link).map(s => `<a class="notice" href="${esc(s.link)}"><span class="ndot"></span><span><b>Sign: ${esc(s.title)}</b><small>Your lease is ready to sign</small></span>${ic('chev', 18, 'chv')}</a>`).join('')}
    ${sec('Documents', '<button class="seeall" data-up>Upload</button>')}<div class="card list">${docs.map(d => row({ tag: 'button', attr: `data-file="${d.id}" data-name="${esc(d.name)}"`, av: ic('file', 20), avc: 'a', t: esc(d.name), d: fdate(d.created), chev: 1 })).join('') || empty('file', 'No documents yet', 'Your lease and notices show up here.')}</div>
    <button class="btn big tint" data-up>${ic('share', 20)} Send a document to the office</button>`,
    after: el => $$('[data-up]', el).forEach(b => b.onclick = () => { const s = sheet(`<form><div class="sh-h"><h2>Send a document</h2><p class="mut">For example renters insurance, a pay stub or an ID. Take a photo or choose a PDF.</p></div><div class="fld"><span>Files</span><div class="thumbs" data-photos="dc"></div></div>${progHtml}<button class="btn big" type="submit">Send</button></form>`, { onSubmit: async () => { const fs = getD(); if (!fs.length) throw new Error('Add a photo or a file'); await uploadPhotos(fs, p => progSet(s.el, p), { for: 'document' }); s.close(); toast(fs.length === 1 ? 'Document sent' : fs.length + ' documents sent'); render(true); } }); const getD = photoPicker(s.el, 'dc', 'image/*,application/pdf'); }) };
};

// ================= WORKER (contractor) =================
const STG = { needs_price: 'amber', price_requested: 'amber', quote_sent: 'amber', quote_declined: 'red', approved: 'blue', photos_sent: 'amber', billed: 'green', paid: 'green', closed: 'gray' };
const jobRow = j => row({ go: 'w/job/' + j.id, av: ic('wrench', 20), avc: j.priority === 'emergency' || j.priority === 'high' ? 'red' : 'g', t: esc(j.title), d: `<span class="stg ${STG[j.stage] || 'gray'}">${esc(j.stage_label || cap(j.stage))}</span>${j.address || j.property ? ' · ' + esc(j.address || j.property) : ''}`, r: prioPill(j.priority) });
R['w/jobs'] = async () => {
  const x = await api('w/jobs'); const jobs = x.jobs || [];
  const todo = jobs.filter(j => !['paid', 'closed', 'billed'].includes(j.stage) && !['completed', 'closed'].includes(j.status));
  const done = jobs.filter(j => !todo.includes(j));
  const me = ME || await api('app67/me');
  return { title: `${greet()}, ${first(me.user.name)}`, sub: esc(me.company || ''), action: roleChip(), body: `
    <div class="kpis"><div class="kpi"><small>Open jobs</small><b>${todo.length}</b></div><div class="kpi"><small>Owed to you</small><b>${money0(x.earnings.owed)}</b></div><div class="kpi"><small>Paid this month</small><b>${money0(x.earnings.paid_month)}</b></div></div>
    ${(x.open || []).length ? sec('Open jobs you can take') + `<div class="card list">${x.open.map(jobRow).join('')}</div>` : ''}
    ${sec('Your jobs')}${todo.length ? `<div class="card list">${todo.map(jobRow).join('')}</div>` : `<div class="card">${empty('check', 'No open jobs', 'New jobs from the office show up here.')}</div>`}
    ${done.length ? sec('Finished') + `<div class="card list">${done.slice(0, 15).map(jobRow).join('')}</div>` : ''}`, after: wireSwitch };
};
R['w/jobs'].sk = { title: 'Jobs', sk: SK.tiles + SK.list(4) };
R['w/job'] = async (ctx) => {
  const id = +ctx.args[0]; const j = await api('w/jobs/' + id); const c = j.contact || {};
  const parts = j.parts || []; const q = (j.quotes || [])[0];
  const maps = j.address ? `https://maps.apple.com/?q=${encodeURIComponent(j.address)}` : '';
  return { title: 'Job #' + id, body: `
    <div class="card pad"><div class="rq-h"><h2>${esc(j.title)}</h2>${pill(j.stage_label || cap(j.stage), STG[j.stage] || 'gray')}</div>${prioPill(j.priority)}
      ${j.description ? `<p class="desc">${esc(j.description)}</p>` : ''}
      <div class="acts">${maps ? `<a class="btn tint sm" href="${maps}" target="_blank" rel="noopener">${ic('pin', 18)} Directions</a>` : ''}${c.phone ? `<a class="btn tint sm" href="tel:${esc(c.phone)}">${ic('phone', 18)} Call ${esc(first(c.name) || 'tenant')}</a>` : ''}<button class="btn tint sm" data-go="w/chat/${id}">${ic('chat', 18)} Office</button></div>
      <dl class="kv"><dt>Address</dt><dd>${esc(j.address || '')}</dd>${j.entry_ok ? '<dt>Entry</dt><dd>OK to enter if nobody is home</dd>' : ''}<dt>Reported</dt><dd>${fdate(j.created)}</dd></dl>
      ${(j.request_photos || []).length ? `<div class="gal">${j.request_photos.map(p => `<button class="ph" data-file="${p.id}" data-name="Photo"><img data-fid="${p.id}" alt="Photo from the tenant"></button>`).join('')}</div>` : ''}</div>
    ${j.mine === false ? `<button class="btn big" data-take>${ic('check', 20)} Take this job</button>` : ''}
    ${['needs_price', 'price_requested', 'quote_sent', 'quote_declined'].includes(j.stage) && j.mine !== false ? `<div class="card pad">${q && q.status === 'pending' ? `<div class="wait">${ic('clock', 22)}<div><b>Price sent: ${money(q.amount)}</b><small>Waiting for the office to approve</small></div></div>` : `<h3>Send your price</h3><p class="mut">The office approves it before you start.</p>`}<button class="btn ${q && q.status === 'pending' ? 'tint' : ''}" data-quote>${q && q.status === 'pending' ? 'Change price' : 'Send price'}</button></div>` : ''}
    ${parts.length ? sec('Work') + `<div class="card list">${parts.map(p => row({ av: ic(p.status === 'open' ? 'wrench' : 'check', 20), avc: p.status === 'open' ? 'amber' : 'g', t: esc(p.title || 'Work'), d: p.status === 'open' ? (p.reject_note ? 'Sent back: ' + esc(p.reject_note) : 'To do') : p.status === 'done' ? 'Sent for approval' : p.paid ? 'Paid' : 'Billed', r: `<b>${money(p.amount)}</b>${p.status === 'open' ? `<button class="btn sm" data-done="${p.id}">Mark done</button>` : ''}` })).join('')}</div>` : ''}
    ${(j.payments || []).length ? sec('Payments') + `<div class="card list">${j.payments.map(y => row({ av: ic('check', 20), avc: 'g', t: money(y.amount), d: `${fdate(y.date)}${y.method ? ' · ' + esc(y.method) : ''}` })).join('')}</div>` : ''}`,
    after: el => {
      const tk = $('[data-take]', el); if (tk) tk.onclick = async () => { try { await api(`w/jobs/${id}/take`, { body: {} }); toast('The job is yours'); render(true); } catch (e) { toast(e.message, 'err'); } };
      const qb = $('[data-quote]', el); if (qb) qb.onclick = () => { const s = sheet(`<form><div class="sh-h"><h2>Your price</h2><p class="mut">For the whole job. The office approves it, then you start.</p></div>${field('Price', '<div class="money-in"><span>$</span><input name="amount" inputmode="decimal" required placeholder="0.00"></div>')}${field('What it covers', '<textarea name="note" rows="3" placeholder="Parts and labor"></textarea>')}<button class="btn big" type="submit">Send price</button></form>`, { onSubmit: async x => { await api(`w/jobs/${id}/quote`, { body: x }); s.close(); toast('Price sent'); render(true); } }); };
      $$('[data-done]', el).forEach(b => b.onclick = () => { const pid = b.dataset.done; const s = sheet(`<form><div class="sh-h"><h2>Mark done and bill</h2><p class="mut">Add photos of the finished work. The office checks them and approves your bill at the agreed price.</p></div><div class="fld"><span>Photos of the work (at least 1)</span><div class="thumbs" data-photos="d"></div></div><div class="fld"><span>Your invoice (optional)</span><div class="thumbs" data-photos="inv"></div></div>${field('Note (optional)', '<textarea name="note" rows="2"></textarea>')}${progHtml}<button class="btn big" type="submit">Send for approval</button></form>`, { full: true, onSubmit: async x => { const fs = getP(); if (!fs.length) throw new Error('Add at least one photo of the finished work'); const fd = new FormData(); for (const f of fs) fd.append('photo', await shrink(f)); fd.append('note', x.note || ''); const inv = getI();
        await xhrUpload(`w/parts/${pid}/done`, fd, p => progSet(s.el, inv.length ? p * 0.7 : p));
        if (inv.length) { const f2 = new FormData(); for (const f of inv) f2.append('file', await shrink(f)); f2.append('text', 'Invoice for: ' + ((parts.find(p => p.id === +pid) || {}).title || 'the work')); await xhrUpload('app67/chat/' + id, f2, p => progSet(s.el, 0.7 + p * 0.3)); }
        s.close(); toast('Sent for approval'); render(true); } }); const getP = photoPicker(s.el, 'd'); const getI = photoPicker(s.el, 'inv', 'image/*,application/pdf'); });
    } };
};
R['w/job'].sk = { title: 'Job', sk: SK.hero + SK.list(2) };
R['w/money'] = async () => {
  const x = await api('w/jobs'); const e = x.earnings;
  return { title: 'Money', body: `<div class="hero sm"><small>Owed to you</small><div class="big">${money(e.owed)}</div><div class="hsub">Paid this month ${money(e.paid_month)} · all time ${money(e.paid_total)}</div></div>
    ${e.approved_unbilled ? `<div class="card pad wait">${ic('clock', 22)}<div><b>${money(e.approved_unbilled)} approved, not billed yet</b><small>Mark the work done with photos to send the bill</small></div></div>` : ''}
    ${sec('Bills')}<div class="card list">${(x.bills || []).map(b => row({ go: b.wo_id ? 'w/job/' + b.wo_id : '', av: ic('file', 20), avc: b.open ? 'amber' : 'g', t: esc(b.part || b.job || 'Bill'), d: `${fdate(b.bill_date)}${b.property ? ' · ' + esc(b.property) : ''}`, r: `<b>${money(b.amount)}</b>${pill(b.open ? 'Open' : 'Paid', b.open ? 'amber' : 'green')}` })).join('') || empty('file', 'No bills yet')}</div>
    ${sec('Payments')}<div class="card list">${(x.payments || []).map(y => row({ av: ic('check', 20), avc: 'g', t: money(y.amount), d: `${fdate(y.date)} · ${esc(y.part || y.job || '')}${y.method ? ' · ' + esc(y.method) : ''}` })).join('') || empty('wallet', 'No payments yet')}</div>` };
};
R['w/messages'] = async () => {
  const [c, x] = await Promise.all([api('app67/chats'), api('w/jobs')]); const have = new Set(c.threads.map(t => t.wo_id));
  const others = (x.jobs || []).filter(j => !have.has(j.id) && !['paid', 'closed'].includes(j.stage));
  return { title: 'Messages', body: `${c.threads.length ? `<div class="card list">${c.threads.map(t => row({ go: 'w/chat/' + t.wo_id, av: initials('Office'), t: esc(t.title) + (t.unread ? ' <span class="ndot inl"></span>' : ''), d: `${t.last && t.last.side === 'w' ? 'You: ' : ''}${esc((t.last && t.last.body || '').slice(0, 70))}`, r: `<small>${ago(t.last && t.last.created)}</small>` })).join('')}</div>` : `<div class="card">${empty('chat', 'No messages yet', 'Write to the office about any of your jobs.')}</div>`}
    ${others.length ? sec('Start a chat about a job') + `<div class="card list">${others.map(j => row({ go: 'w/chat/' + j.id, av: ic('briefcase', 20), avc: 'g', t: esc(j.title), d: esc(j.address || '') })).join('')}</div>` : ''}` };
};
R['w/chat'] = async (ctx) => { const id = +ctx.args[0]; const c = await api('app67/chat/' + id);
  return { title: c.title || 'Job #' + id, body: `<button class="linkrow" data-go="w/job/${id}">${ic('briefcase', 18)} Job #${id} details ${ic('chev', 16)}</button>${chatHtml(c.msgs, m => m.side === 'w')}${composer('Message the office', true)}`, after: el => wireComposer(el, async (t, fs, pr) => { if (!fs.length) return api('app67/chat/' + id, { body: { text: t } }); const fd = new FormData(); fd.append('text', t); for (const f of fs) fd.append('file', await shrink(f)); return xhrUpload('app67/chat/' + id, fd, pr); }) }; };

// ================= MANAGER =================
R['m/home'] = async () => {
  const [d, ap] = await Promise.all([api('m/dashboard'), api('app67/m/approvals').catch(() => ({ counts: { total: 0 } }))]);
  const pct = d.due ? Math.round(d.collected / d.due * 100) : 0; const occ = d.units ? Math.round(d.occupied / d.units * 100) : 0; const rq = d.requests || { open: 0, urgent: 0, list: [] };
  badge['m/inbox'] = ap.counts.total;
  return { title: `${greet()}, ${first((ME && ME.user.name) || (Acc.cur() || {}).name)}`, sub: esc(d.company || ''), action: roleChip(), body: `
    <div class="hero"><small>Rent collected · ${esc(d.month_label || '')}</small><div class="big">${money0(d.collected)}</div><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div><div class="hsub">${pct}% of ${money0(d.due)} due</div></div>
    <div class="kpis">
      <button class="kpi" data-go="m/work"><small>Open work orders</small><b>${rq.open}</b>${rq.urgent ? `<em class="red">${rq.urgent} urgent</em>` : ''}</button>
      <button class="kpi" data-go="m/properties"><small>Vacant units</small><b>${(d.vacancies || []).length}</b><em>${occ}% occupied</em></button>
      <button class="kpi" data-go="m/inbox"><small>Waiting for you</small><b>${ap.counts.total}</b><em>approvals</em></button>
      <button class="kpi" data-go="m/tenants?late=1"><small>Owed by tenants</small><b>${money0((d.delinquency || {}).total)}</b><em>${(d.delinquency || {}).count || 0} tenants</em></button>
    </div>
    ${sec('Quick actions')}
    <div class="qa"><button data-act="wo">${ic('wrench', 22)}<span>New work order</span></button><button data-go="m/inbox">${ic('check', 22)}<span>Approve</span></button><button data-act="msg">${ic('chat', 22)}<span>Message tenant</span></button><a href="/" target="_blank" rel="noopener">${ic('globe', 22)}<span>Full website</span></a></div>
    ${sec('Work orders', '<a href="#/m/work" class="seeall">See all</a>')}
    <div class="card list">${(rq.list || []).slice(0, 4).map(w => row({ go: 'm/job/' + w.id, av: ic('wrench', 20), avc: ['high', 'emergency'].includes(w.priority) ? 'red' : 'g', t: esc(w.title), d: esc([w.property, w.unit].filter(Boolean).join(' · ')) + ' · ' + ago(w.created), r: stPill(w.status) })).join('') || empty('check', 'No open work orders')}</div>
    ${(d.vacancies || []).length ? sec('Vacancies') + `<div class="card list">${d.vacancies.slice(0, 4).map(v => row({ av: ic('door', 20), avc: 'amber', t: `${esc(v.property)} · ${esc(v.unit)}`, d: `${v.days} days vacant`, r: `<b>${money0(v.market_rent)}</b>` })).join('')}</div>` : ''}
    ${((d.delinquency || {}).top || []).length ? sec('Highest balances') + `<div class="card list">${d.delinquency.top.slice(0, 4).map(t => row({ go: 'm/tenant/' + t.tenant_id, av: esc(initials(t.name)), t: esc(t.name), d: `${esc(t.property)} · ${esc(t.unit)}`, r: `<b class="neg">${money0(t.balance)}</b>` })).join('')}</div>` : ''}`,
    after: el => { wireSwitch(el); const w = $('[data-act=wo]', el); if (w) w.onclick = () => newWorkOrder(); const m = $('[data-act=msg]', el); if (m) m.onclick = () => go('m/tenants'); } };
};
R['m/home'].sk = { title: 'Home', sk: SK.hero + SK.tiles + SK.list(3) };
async function newWorkOrder(pre) {
  const props = await api('m/properties'); let pid = pre && pre.property_id || (props[0] || {}).id, uid = pre && pre.unit_id || '', pr = 'normal';
  const s = sheet(`<form><div class="sh-h"><h2>New work order</h2></div>
    ${field('Property', `<select name="property_id">${props.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`)}
    ${field('Unit', '<select name="unit_id"><option value="">Whole building</option></select>')}
    ${field('What is wrong', '<input name="title" required maxlength="140" placeholder="Leak under kitchen sink">')}${field('Details', '<textarea name="description" rows="3"></textarea>')}
    <div class="fld"><span>Priority</span><div class="seg"><button type="button" class="on" data-p="normal">Normal</button><button type="button" data-p="high">Urgent</button><button type="button" data-p="emergency">Emergency</button></div></div>
    <button class="btn big" type="submit">Create work order</button></form>`, { full: true, onSubmit: async x => { const r = await api('m/workorders', { body: { ...x, property_id: +x.property_id, unit_id: +x.unit_id || null, priority: pr } }); s.close(); toast('Work order created'); go('m/job/' + r.id); } });
  const loadUnits = async () => { const p = await api('m/properties/' + $('[name=property_id]', s.el).value); $('[name=unit_id]', s.el).innerHTML = '<option value="">Whole building</option>' + (p.units || []).map(u => `<option value="${u.unit_id}" ${u.unit_id === +uid ? 'selected' : ''}>${esc(u.unit)}${u.first ? ' · ' + esc(u.first + ' ' + u.last) : ''}</option>`).join(''); };
  $('[name=property_id]', s.el).onchange = loadUnits; loadUnits();
  $$('[data-p]', s.el).forEach(b => b.onclick = () => { pr = b.dataset.p; $$('[data-p]', s.el).forEach(z => z.classList.toggle('on', z === b)); haptic(); });
}
R['m/properties'] = async () => {
  const ps = await api('m/properties');
  return { title: 'Properties', sub: `${ps.length} properties · ${ps.reduce((s, p) => s + (p.units || 0), 0)} units`, body: `<div class="search"><input type="search" placeholder="Search properties" aria-label="Search properties" data-q></div>
    <div class="cards">${ps.map(p => `<a class="pcard" href="#/m/property/${p.id}" data-s="${esc((p.name + ' ' + (p.city || '') + ' ' + (p.owner || '')).toLowerCase())}"><div class="pc-img" style="--h:${p.hue || 150}">${ic('building', 30)}</div><div class="pc-b"><b>${esc(p.name)}</b><small>${esc([p.area || p.city, p.owner].filter(Boolean).join(' · '))}</small>
      <div class="pc-k"><span><b>${p.occupied}/${p.units}</b> occupied</span><span><b>${money0(p.rent)}</b> rent</span>${p.owed > 0 ? `<span class="neg"><b>${money0(p.owed)}</b> owed</span>` : ''}</div></div></a>`).join('') || empty('building', 'No properties yet')}</div>`,
    after: el => { const q = $('[data-q]', el); q.oninput = () => { const v = q.value.toLowerCase().trim(); $$('.pcard', el).forEach(c => c.hidden = v && !c.dataset.s.includes(v)); }; } };
};
R['m/property'] = async (ctx) => {
  const p = await api('m/properties/' + ctx.args[0]); const us = p.units || [];
  return { title: p.name, body: `<div class="card pad"><div class="ls-h">${ic('building', 22)}<div><b>${esc(p.address || p.name)}</b><small>${esc([p.city, p.state, p.zip].filter(Boolean).join(', '))}${p.owner ? ' · ' + esc(p.owner) : ''}</small></div></div>
    <div class="acts"><button class="btn tint sm" data-wo>${ic('wrench', 18)} Work order</button><a class="btn tint sm" target="_blank" rel="noopener" href="https://maps.apple.com/?q=${encodeURIComponent([p.address, p.city, p.state].filter(Boolean).join(', '))}">${ic('pin', 18)} Map</a></div></div>
    ${sec(`Units (${us.length})`)}<div class="card list">${us.map(u => row({ go: u.tenant_id ? 'm/tenant/' + u.tenant_id : '', av: esc(u.unit), avc: u.tenant_id ? 'g' : 'amber', t: u.tenant_id ? esc(u.first + ' ' + u.last) : 'Vacant', d: u.tenant_id ? `${money(u.rent)} rent${u.end ? ' · lease to ' + fdate(u.end) : ''}` : `${u.market_rent ? money0(u.market_rent) + ' market rent' : ''}${u.vacant_since ? ' · since ' + fdate(u.vacant_since) : ''}`, r: u.tenant_id ? (u.balance > 0 ? `<b class="neg">${money0(u.balance)}</b>` : pill('Paid', 'green')) : pill('Vacant', 'amber') })).join('') || empty('door', 'No units')}</div>`,
    after: el => { $('[data-wo]', el).onclick = () => newWorkOrder({ property_id: p.id }); } };
};
R['m/tenants'] = async () => {
  const ts = (await api('m/tenants')).filter(t => t.current !== false); const late = /late=1/.test(location.hash);
  const list = late ? ts.filter(t => t.balance > 0).sort((a, b) => b.balance - a.balance) : ts.sort((a, b) => (a.last || '').localeCompare(b.last || ''));
  return { title: late ? 'Tenants who owe' : 'Tenants', body: `<div class="search"><input type="search" placeholder="Search name, unit or property" aria-label="Search tenants" data-q></div>
    <div class="card list">${list.map(t => row({ go: 'm/tenant/' + t.id, av: esc(initials(t.first + ' ' + t.last)), t: esc(t.first + ' ' + t.last), d: esc([t.property, t.unit].filter(Boolean).join(' · ')), r: t.balance > 0 ? `<b class="neg">${money0(t.balance)}</b>` : '', attr: `data-s="${esc((t.first + ' ' + t.last + ' ' + (t.unit || '') + ' ' + (t.property || '')).toLowerCase())}"` })).join('') || empty('users', 'No tenants')}</div>`,
    after: el => { const q = $('[data-q]', el); q.oninput = () => { const v = q.value.toLowerCase().trim(); $$('.row[data-s]', el).forEach(c => c.hidden = v && !c.dataset.s.includes(v)); }; } };
};
R['m/tenant'] = async (ctx) => {
  const id = +ctx.args[0]; const x = await api('m/tenants/' + id); const t = x.tenant || {}; const l = x.lease || (x.leases || [])[0] || {};
  return { title: `${t.first || ''} ${t.last || ''}`.trim(), body: `<div class="card pad prof"><div class="av big">${esc(initials(t.first + ' ' + t.last))}</div><div><b>${esc(t.first + ' ' + t.last)}</b><small>${esc([l.property, l.unit ? unitL(l.unit) : ''].filter(Boolean).join(' · '))}</small></div></div>
    <div class="acts wide">${t.phone ? `<a class="btn tint" href="tel:${esc(t.phone)}">${ic('phone', 20)} Call</a><a class="btn tint" href="sms:${esc(t.phone)}">${ic('chat', 20)} Text</a>` : ''}<button class="btn tint" data-go="m/thread/${id}">${ic('chat', 20)} In-app</button></div>
    <div class="kpis two"><div class="kpi"><small>Balance</small><b class="${x.balance > 0 ? 'neg' : ''}">${money(x.balance || 0)}</b></div><div class="kpi"><small>Rent</small><b>${money0(l.rent)}</b><em>due day ${l.due_day || 1}</em></div></div>
    <div class="card pad"><dl class="kv">${l.start ? `<dt>Lease</dt><dd>${fdate(l.start)} to ${l.end ? fdate(l.end) : 'month to month'}</dd>` : ''}${t.email ? `<dt>Email</dt><dd>${esc(t.email)}</dd>` : ''}${t.phone ? `<dt>Phone</dt><dd>${esc(t.phone)}</dd>` : ''}${l.deposit ? `<dt>Deposit</dt><dd>${money(l.deposit)}</dd>` : ''}</dl></div>
    ${sec('Ledger')}<div class="card list">${(x.ledger || []).slice(0, 8).map(e => row({ av: ic(e.kind === 'payment' ? 'check' : 'file', 18), avc: e.kind === 'payment' ? 'g' : 'gray', t: esc(e.memo || cap(e.kind)), d: fdate(e.date), r: `<b class="${e.amount < 0 ? 'pos' : ''}">${e.amount < 0 ? '+' + money(-e.amount) : money(e.amount)}</b>` })).join('') || empty('file', 'No entries')}</div>
    ${(x.requests || []).length ? sec('Requests') + `<div class="card list">${x.requests.slice(0, 5).map(w => row({ go: 'm/job/' + w.id, av: ic('wrench', 18), avc: 'g', t: esc(w.title), d: fdate(w.created), r: stPill(w.status) })).join('')}</div>` : ''}` };
};
const WF = [['open', 'Open'], ['new', 'New'], ['assigned', 'Assigned'], ['in_progress', 'In progress'], ['done', 'Done']];
R['m/work'] = async () => {
  const ws = await api('m/workorders'); const f = LS.get('wf', 'open');
  const pick = w => f === 'open' ? !['completed', 'closed'].includes(w.status) : f === 'done' ? ['completed', 'closed'].includes(w.status) : w.status === f;
  const list = ws.filter(pick);
  return { title: 'Work orders', action: `<button class="nb" data-new aria-label="New work order">${ic('plus', 26)}</button>`, body: `<div class="chips scroll-x">${WF.map(([k, l]) => `<button class="chip ${k === f ? 'on' : ''}" data-f="${k}">${l} <i>${ws.filter(w => k === 'open' ? !['completed', 'closed'].includes(w.status) : k === 'done' ? ['completed', 'closed'].includes(w.status) : w.status === k).length}</i></button>`).join('')}</div>
    <div class="card list">${list.map(w => row({ go: 'm/job/' + w.id, av: ic('wrench', 20), avc: ['high', 'emergency'].includes(w.priority) ? 'red' : ['completed', 'closed'].includes(w.status) ? 'gray' : 'g', t: esc(w.title), d: `#${w.id} · ${esc([w.property, w.unit].filter(Boolean).join(' · '))}${w.vendor ? ' · ' + esc(w.vendor) : ''}`, r: `${prioPill(w.priority)}${stPill(w.status)}` })).join('') || empty('check', 'Nothing here')}</div>`,
    after: el => { $$('[data-f]', el).forEach(b => b.onclick = () => { LS.set('wf', b.dataset.f); haptic(); render(true); }); $('[data-new]', el).onclick = () => newWorkOrder(); } };
};
R['m/work'].sk = { title: 'Work orders', sk: SK.list(6) };
const MSTAT = [['new', 'New'], ['assigned', 'Assigned'], ['in_progress', 'In progress'], ['completed', 'Done']];
R['m/job'] = async (ctx) => {
  const id = +ctx.args[0]; const [w, j, c, wc] = await Promise.all([api('m/workorders/' + id), api('m/x65/job/' + id).catch(() => null), api('m/x29/chat/' + id).catch(() => null), api('app67/chat/' + id).catch(() => null)]);
  const evf = evFiles(c); const tmsgs = c ? (c.events || []).filter(e => ['note', 'tmsg'].includes(e.kind)).map(e => ({ ...e, mine: e.kind === 'note', files: evf[e.id] || [] })) : [];
  const parts = j ? j.parts || [] : []; const pq = j ? (j.quotes || []).find(q => q.status === 'pending') : null;
  return { title: 'Work order #' + id, body: `
    <div class="card pad"><div class="rq-h"><h2>${esc(w.title)}</h2>${stPill(w.status)}</div>${prioPill(w.priority)}
      ${w.description ? `<p class="desc">${esc(w.description)}</p>` : ''}
      <dl class="kv"><dt>Where</dt><dd>${esc([w.property, w.unit ? unitL(w.unit) : ''].filter(Boolean).join(' · '))}</dd>${w.first ? `<dt>Tenant</dt><dd>${esc(w.first + ' ' + w.last)}${w.tphone ? ` · <a href="tel:${esc(w.tphone)}">${esc(w.tphone)}</a>` : ''}</dd>` : ''}<dt>Worker</dt><dd>${w.vendor ? esc(w.vendor) : 'Not assigned'}</dd><dt>Opened</dt><dd>${fdate(w.created)}</dd></dl>
      ${(w.photos || []).length ? `<div class="gal">${w.photos.map(p => `<button class="ph" data-file="${p.id}" data-name="${esc(p.name || 'Photo')}"><img data-fid="${p.id}" alt="${esc(p.name || 'Photo')}"></button>`).join('')}</div>` : ''}
      <div class="acts"><button class="btn tint sm" data-addph>${ic('camera', 18)} Add photos or files</button></div></div>
    <div class="fld"><span>Status</span><div class="seg">${MSTAT.map(([k, l]) => `<button type="button" class="${(w.status === k || (k === 'completed' && w.status === 'closed')) ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div></div>
    ${j ? `<button class="opt" data-assign><span class="oi">${ic('user', 22)}</span><span class="m"><b>${w.vendor ? 'Worker: ' + esc(w.vendor) : 'Assign a worker'}</b><small>${(j.workers || []).length === 1 ? '1 worker' : (j.workers || []).length + ' workers'} with the app</small></span>${ic('chev', 18, 'chv')}</button>` : ''}
    ${pq ? `<div class="card pad appr"><div class="ap-h">${ic('wallet', 22)}<div><b>Price from ${esc(w.vendor || 'the worker')}: ${money(pq.amount)}</b>${pq.note ? `<small>${esc(pq.note)}</small>` : ''}</div></div><div class="acts"><button class="btn" data-qa="${pq.id}">Approve price</button><button class="btn tint" data-qd="${pq.id}">Decline</button></div></div>` : ''}
    ${parts.length ? sec('Work and bills') + `<div class="card list">${parts.map(p => row({ av: ic(p.status === 'open' ? 'wrench' : 'check', 18), avc: p.status === 'done' ? 'amber' : p.status === 'open' ? 'gray' : 'g', t: esc(p.title || 'Work'), d: p.status === 'done' ? 'Done photos sent. Check and approve.' : p.status === 'open' ? 'Not done yet' : p.paid ? 'Paid' : 'Bill created', r: `<b>${money(p.amount)}</b>${p.status === 'done' ? `<button class="btn sm" data-bill="${p.id}">Approve</button>` : ''}` })).join('')}</div>` : ''}
    ${sec('Tenant messages')}${c ? chatHtml(tmsgs, m => m.mine) + composer('Reply to the tenant', true) : '<div class="card">' + empty('chat', 'No tenant on this request') + '</div>'}
    ${w.vendor_id ? `<button class="linkrow" data-go="m/wchat/${id}">${ic('chat', 18)} Chat with ${esc(w.vendor || 'the worker')}${wc && wc.msgs.length ? ` · ${wc.msgs.length} messages` : ''} ${ic('chev', 16)}</button>` : ''}`,
    after: el => {
      $$('[data-st]', el).forEach(b => b.onclick = async () => { try { await api('m/workorders/' + id, { body: { status: b.dataset.st } }); toast('Status updated'); render(true); } catch (e) { toast(e.message, 'err'); } });
      const as = $('[data-assign]', el); if (as) as.onclick = () => { const s = sheet(`<div class="sw"><h2>Assign a worker</h2>${(j.workers || []).map(k => `<button class="acc" data-v="${k.vendor_id}"><span class="av">${esc(initials(k.name))}</span><span class="m"><b>${esc(k.name)}</b><small>${esc(k.kind === 'staff' ? 'Staff' : 'Contractor')}</small></span>${k.vendor_id === w.vendor_id ? ic('check', 20, 'okc') : ''}</button>`).join('') || empty('users', 'No workers yet', 'Add workers on the website: Maintenance > Workers.')}</div>`);
        $$('[data-v]', s.el).forEach(b => b.onclick = async () => { try { await api(`m/x65/job/${id}/assign`, { body: { vendor_id: +b.dataset.v } }); s.close(); toast('Assigned. The worker gets a notification.'); render(true); } catch (e) { toast(e.message, 'err'); } }); };
      const qa = $('[data-qa]', el); if (qa) qa.onclick = async () => { if (!(await ask('Approve this price?', 'The worker can start the job.', 'Approve'))) return; try { await api(`m/x65/quote/${qa.dataset.qa}/approve`, { body: {} }); toast('Price approved'); render(true); } catch (e) { toast(e.message, 'err'); } };
      const qd = $('[data-qd]', el); if (qd) qd.onclick = () => { const s = sheet(`<form><div class="sh-h"><h2>Decline the price</h2></div>${field('Reason for the worker', '<textarea name="reason" rows="3"></textarea>')}<button class="btn big danger" type="submit">Decline</button></form>`, { onSubmit: async x => { await api(`m/x65/quote/${qd.dataset.qd}/decline`, { body: x }); s.close(); toast('Declined'); render(true); } }); };
      $$('[data-bill]', el).forEach(b => b.onclick = () => approvePart(parts.find(p => p.id === +b.dataset.bill), w));
      if (c) wireComposer(el, async (t, fs, pr) => { const ids = fs.length ? await uploadPhotos(fs, pr) : []; return api('m/x29/chat/' + id, { body: { text: t, photo_ids: ids } }); });
      $('[data-addph]', el).onclick = () => chooseFiles('image/*,application/pdf', async fs => { const t = toastProg(); try { await uploadPhotos(fs, p => t.set(p), { wo_id: id }); t.done(fs.length === 1 ? 'Added' : fs.length + ' files added'); render(true); } catch (e) { t.fail(e.message); } });
    } };
};
R['m/job'].sk = { title: 'Work order', sk: SK.hero + SK.list(3) };
function approvePart(p, w) {
  const ph = (p.photo_ids || []);
  const s = sheet(`<div class="sh-h"><h2>Approve the work</h2><p class="mut">${esc(p.title || 'Work')} · ${esc(p.vendor || w.vendor || '')}</p></div>
    <div class="appamt"><small>Bill amount</small><b>${money(p.amount)}</b></div>${p.done_note ? `<p class="desc">${esc(p.done_note)}</p>` : ''}
    ${ph.length ? `<div class="gal">${ph.map(id => `<button class="ph" data-file="${id}" data-name="Done photo"><img data-fid="${id}" alt="Photo of the finished work"></button>`).join('')}</div>` : ''}
    <button class="btn big" data-ok>${ic('check', 20)} Approve and create bill</button><button class="btn big tint" data-back>Send back to the worker</button><p class="fine">The bill is made at the approved price. You pay it from Bills on the website or here once it shows in Money.</p>`, { full: true });
  lazyImgs(s.el); $$('[data-file]', s.el).forEach(x => x.onclick = () => openFile(+x.dataset.file, 'Photo'));
  $('[data-ok]', s.el).onclick = async () => { try { await api(`m/x65/part/${p.id}/bill`, { body: {} }); s.close(); toast('Bill created'); badges(); render(true); } catch (e) { toast(e.message, 'err'); } };
  $('[data-back]', s.el).onclick = () => { const s2 = sheet(`<form><div class="sh-h"><h2>What should be fixed?</h2></div>${field('Note for the worker', '<textarea name="reason" rows="3" placeholder="Please send a photo of the finished pipe"></textarea>')}<button class="btn big" type="submit">Send back</button></form>`, { onSubmit: async x => { await api(`m/x65/part/${p.id}/reject`, { body: x }); s2.close(); s.close(); toast('Sent back'); render(true); } }); };
}
R['m/inbox'] = async () => {
  const [ap, pt, wc] = await Promise.all([api('app67/m/approvals'), api('m/portal').catch(() => ({ msgs: [] })), api('app67/chats').catch(() => ({ threads: [] }))]);
  badge['m/inbox'] = ap.counts.total; tabbar();
  const threads = (pt.msgs || []).filter((m, i, a) => a.findIndex(z => z.tenant_id === m.tenant_id) === i);
  return { title: 'Inbox', body: `
    ${sec('Waiting for your OK', ap.counts.total ? pill(String(ap.counts.total), 'red') : '')}
    ${ap.counts.total ? `<div class="card list">
      ${ap.quotes.map(q => row({ go: 'm/job/' + q.wo_id, av: ic('wallet', 20), avc: 'amber', t: `Price ${money(q.amount)} · ${esc(q.vendor || '')}`, d: `${esc(q.title)} · ${esc([q.property, q.unit].filter(Boolean).join(' '))}`, r: pill('Price', 'amber') })).join('')}
      ${ap.parts.map(p => row({ tag: 'button', attr: `data-part="${p.id}"`, av: ic('camera', 20), avc: 'amber', t: `${esc(p.vendor || '')} finished: ${esc(p.part || p.title)}`, d: `${money(p.amount)} · ${esc(p.title)} · ${ago(p.done_at)}`, r: pill('Bill', 'amber'), chev: 1 })).join('')}
      ${ap.reports.map(r => row({ tag: 'div', av: ic('card', 20), avc: 'blue', t: `${esc(r.first + ' ' + r.last)} paid ${money(r.amount)}`, d: `${esc(r.method)} · ${fdate(r.date)}${r.ref ? ' · #' + esc(r.ref) : ''} · ${esc([r.property, r.unit].filter(Boolean).join(' '))}`, r: `<button class="btn sm" data-rok="${r.id}">Confirm</button><button class="nb sm" data-rno="${r.id}" aria-label="Dismiss">${ic('x', 18)}</button>` })).join('')}</div>` : `<div class="card">${empty('check', 'All caught up', 'Worker prices, finished work and tenant payments show up here.')}</div>`}
    ${sec('Tenant messages')}<div class="card list">${threads.map(m => row({ go: 'm/thread/' + m.tenant_id, av: esc(initials(m.first + ' ' + m.last)), t: esc(m.first + ' ' + m.last) + (!m.from_manager && !m.read_at ? ' <span class="ndot inl"></span>' : ''), d: (m.from_manager ? 'You: ' : '') + esc((m.body || '').slice(0, 70)), r: `<small>${ago(m.created)}</small>` })).join('') || empty('chat', 'No tenant messages')}</div>
    ${sec('Worker chats')}<div class="card list">${wc.threads.map(t => row({ go: 'm/wchat/' + t.wo_id, av: esc(initials(t.vendor || 'W')), t: esc(t.vendor || 'Worker') + (t.unread ? ' <span class="ndot inl"></span>' : ''), d: `#${t.wo_id} ${esc(t.title)} · ${esc((t.last && t.last.body || '').slice(0, 50))}`, r: `<small>${ago(t.last && t.last.created)}</small>` })).join('') || empty('chat', 'No worker chats')}</div>`,
    after: el => {
      $$('[data-part]', el).forEach(b => b.onclick = () => { const p = ap.parts.find(x => x.id === +b.dataset.part); approvePart(p, { vendor: p.vendor }); });
      $$('[data-rok]', el).forEach(b => b.onclick = async () => { if (!(await ask('Confirm this payment?', 'It posts to the tenant ledger.', 'Confirm and post'))) return; try { await api(`m/portal/report/${b.dataset.rok}`, { body: { action: 'confirm' } }); toast('Payment posted'); render(true); } catch (e) { toast(e.message, 'err'); } });
      $$('[data-rno]', el).forEach(b => b.onclick = async () => { if (!(await ask('Dismiss this report?', 'Nothing is posted. The tenant sees it was not matched.', 'Dismiss', true))) return; try { await api(`m/portal/report/${b.dataset.rno}`, { body: { action: 'dismiss' } }); toast('Dismissed'); render(true); } catch (e) { toast(e.message, 'err'); } });
    } };
};
R['m/inbox'].sk = { title: 'Inbox', sk: SK.list(4) + SK.list(3) };
R['m/thread'] = async (ctx) => { const tid = +ctx.args[0]; const [ms, t] = await Promise.all([api('m/portal/msgs/' + tid), api('m/tenants/' + tid).catch(() => null)]); const nm = t && t.tenant ? t.tenant.first + ' ' + t.tenant.last : 'Tenant';
  return { title: nm, body: `${t && t.tenant && t.tenant.phone ? `<div class="contact"><a class="btn tint sm" href="tel:${esc(t.tenant.phone)}">${ic('phone', 18)} Call</a><a class="btn tint sm" href="sms:${esc(t.tenant.phone)}">${ic('chat', 18)} Text</a><button class="btn tint sm" data-go="m/tenant/${tid}">${ic('user', 18)} Profile</button></div>` : ''}${chatHtml(ms.map(m => ({ ...m, author: m.from_manager ? (m.author || 'You') : nm })), m => m.from_manager)}${composer('Reply to ' + first(nm))}`, after: el => wireComposer(el, t => api('m/portal/reply/' + tid, { body: { body: t } })) }; };
R['m/wchat'] = async (ctx) => { const id = +ctx.args[0]; const c = await api('app67/chat/' + id);
  return { title: c.title || 'Job #' + id, body: `<button class="linkrow" data-go="m/job/${id}">${ic('wrench', 18)} Work order #${id} ${ic('chev', 16)}</button>${chatHtml(c.msgs, m => m.side === 'm')}${composer('Message the worker', true)}`, after: el => wireComposer(el, async (t, fs, pr) => { if (!fs.length) return api('app67/chat/' + id, { body: { text: t } }); const fd = new FormData(); fd.append('text', t); for (const f of fs) fd.append('file', await shrink(f)); return xhrUpload('app67/chat/' + id, fd, pr); }) }; };

// ================= OWNER =================
async function ownerCur() { const me = await api('o/x62/me'); const id = LS.get('own', null); return { me, cur: me.owners.find(o => o.owner_id === id) || me.owners[0] }; }
R['o/home'] = async () => {
  const [h, oc] = await Promise.all([api('o/home'), ownerCur()]); const ms = await api('o/x62/months').catch(() => ({ months: [] }));
  const units = (h.properties || []).reduce((s, p) => s + (p.units || 0), 0), occ = (h.properties || []).reduce((s, p) => s + (p.occupied || 0), 0);
  const last = (ms.months || [])[0];
  return { title: `${greet()}, ${first((Acc.cur() || {}).name)}`, sub: esc((h.owner || {}).name || ''), action: roleChip(), body: `
    <div class="hero"><small>Net this year</small><div class="big">${money0((h.ytd || {}).income - (h.ytd || {}).expenses)}</div><div class="hsub">Income ${money0((h.ytd || {}).income)} · Expenses ${money0((h.ytd || {}).expenses)}</div>${last ? `<button class="btn white" data-go="o/statement/${last.month}">${ic('chart', 20)} Latest statement</button>` : ''}</div>
    <div class="kpis"><div class="kpi"><small>This month in</small><b>${money0((h.mtd || {}).income)}</b></div><div class="kpi"><small>This month out</small><b>${money0((h.mtd || {}).expenses)}</b></div><div class="kpi"><small>Occupied</small><b>${occ}/${units}</b></div></div>
    ${sec('Your properties')}<div class="card list">${(h.properties || []).map(p => row({ av: ic('building', 20), avc: 'g', t: esc(p.name), d: esc([p.city, p.state].filter(Boolean).join(', ')), r: `<b>${p.occupied}/${p.units}</b>` })).join('') || empty('building', 'No properties')}</div>
    ${sec('Repairs', '<a href="#/o/requests" class="seeall">See all</a>')}<div class="card list">${(h.requests || []).slice(0, 4).map(w => row({ av: ic('wrench', 20), avc: 'g', t: esc(w.title), d: esc([w.property, w.unit].filter(Boolean).join(' · ')) + ' · ' + fdate(w.created), r: stPill(w.status) })).join('') || empty('check', 'No open repairs')}</div>`, after: wireSwitch };
};
R['o/home'].sk = { title: 'Home', sk: SK.hero + SK.tiles + SK.list(3) };
R['o/statements'] = async () => {
  const oc = await ownerCur(); const ms = await api('o/x62/months'); const months = ms.months || [];
  const mon = m => new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { title: 'Statements', sub: esc(oc.cur ? oc.cur.name : ''), body: `${oc.me.owners.length > 1 ? `<div class="chips scroll-x">${oc.me.owners.map(o => `<button class="chip ${o.owner_id === oc.cur.owner_id ? 'on' : ''}" data-own="${o.owner_id}">${esc(o.name)}</button>`).join('')}</div>` : ''}
    <div class="card list">${months.map(m => row({ go: 'o/statement/' + m.month, av: ic('chart', 20), avc: 'g', t: mon(m.month), d: m.sent ? 'Sent ' + fdate(m.sent) : '', r: m.has_pdf ? pill('PDF', 'gray') : '' })).join('') || empty('chart', 'No statements yet', 'Your manager sends one each month. It shows up here.')}</div>`,
    after: el => $$('[data-own]', el).forEach(b => b.onclick = () => { LS.set('own', +b.dataset.own); render(true); }) };
};
R['o/statement'] = async (ctx) => {
  const m = ctx.args[0]; const oc = await ownerCur(); const st = await api(`o/x62/stmt/${oc.cur.owner_id}/${m}`); const L = st.ledger || {};
  const rows = (L.rows || L.lines || []).slice(0, 60);
  return { title: new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), body: `
    <div class="kpis two"><div class="kpi"><small>Opening</small><b>${money0(L.opening)}</b></div><div class="kpi"><small>Closing</small><b>${money0(L.closing)}</b></div><div class="kpi"><small>Cash in</small><b class="pos">${money0(L.cash_in)}</b></div><div class="kpi"><small>Cash out</small><b>${money0(L.cash_out)}</b></div></div>
    ${st.has_pdf ? `<button class="btn big tint" data-pdf>${ic('file', 20)} Open statement PDF</button>` : ''}
    ${rows.length ? sec('Cash ledger') + `<div class="card list">${rows.map(r => row({ t: esc(r.text || r.memo || r.desc || ''), d: `${fdate(r.date)}${r.property ? ' · ' + esc(r.property) : ''}`, r: `<b class="${(r.amount || r.in || 0) > 0 ? 'pos' : ''}">${money(r.amount != null ? r.amount : (r.in || 0) - (r.out || 0))}</b>` })).join('')}</div>` : ''}`,
    after: el => { const b = $('[data-pdf]', el); if (b) b.onclick = async () => { const s = sheet('<div class="viewer"><div class="sk sk-doc"></div></div>', { full: true }); try { const r = await api(`o/x62/pdf/${oc.cur.owner_id}/${m}`, { raw: true }); const u = URL.createObjectURL(await r.blob()); $('.viewer', s.el).innerHTML = `<iframe src="${u}" title="Statement PDF"></iframe><a class="btn tint mt" href="${u}" download="statement-${m}.pdf">${ic('download', 20)} Save a copy</a>`; } catch (e) { $('.viewer', s.el).innerHTML = empty('alert', e.message); } }; } };
};
R['o/requests'] = async () => { const h = await api('o/home'); const rq = h.requests || [];
  return { title: 'Repairs', body: `<div class="card list">${rq.map(w => row({ av: ic('wrench', 20), avc: ['completed', 'closed'].includes(w.status) ? 'gray' : 'g', t: esc(w.title), d: esc([w.property, w.unit].filter(Boolean).join(' · ')) + ' · ' + fdate(w.created), r: stPill(w.status) })).join('') || empty('check', 'No repairs')}</div>` }; };

// ================= MORE / SETTINGS (all roles) =================
R['more'] = async () => {
  const a = Acc.cur(); const me = ME || await api('app67/me'); ME = me; const ps = await pushState();
  const role = a.role; const links = {
    tenant: [['t/docs', 'file', 'Lease and documents'], ['t/pay', 'clock', 'Payment history']],
    worker: [['w/money', 'wallet', 'Bills and payments']],
    manager: [['m/tenants', 'users', 'Tenants'], ['m/inbox', 'check', 'Approvals'], ['set/company', 'bell', 'Company notifications']],
    owner: [['o/statements', 'chart', 'Statements'], ['o/requests', 'wrench', 'Repairs']] }[role] || [];
  return { title: 'More', body: `<div class="card pad prof"><div class="av big">${esc(initials(me.user.name))}</div><div><b>${esc(me.user.name || '')}</b><small>${esc(me.user.email)}</small><small>${esc(ROLE_LABEL[role] || '')}${me.company ? ' · ' + esc(me.company) : ''}</small></div></div>
    <div class="card list">${links.map(l => row({ go: l[0], av: ic(l[1], 20), avc: 'g', t: l[2] })).join('')}</div>
    ${sec('This phone')}<div class="card list">
      ${row({ go: 'set/security', av: ic('face', 20), avc: 'blue', t: 'Face ID and PIN', d: [a.pk ? 'Face ID on' : '', hasPin() ? 'PIN on' : ''].filter(Boolean).join(' · ') || 'Off' })}
      ${row({ go: 'set/notify', av: ic('bell', 20), avc: 'red', t: 'Notifications', d: { on: 'On', off: 'Off', denied: 'Blocked in phone settings', unsupported: isIOS && !standalone() ? 'Install the app first' : 'Not available on this browser' }[ps] })}
      ${standalone() ? '' : row({ tag: 'button', attr: 'data-inst', av: ic('download', 20), avc: 'g', t: 'Install the app', d: 'Add DoorHold to your home screen', chev: 1 })}
      ${row({ go: 'set/accounts', av: ic('switch', 20), avc: 'amber', t: 'Accounts', d: Acc.all().length > 1 ? Acc.all().length + ' on this phone' : 'Add another company or role' })}</div>
    <div class="card list">${row({ tag: 'a', attr: 'href="/" target="_blank" rel="noopener"', av: ic('globe', 20), avc: 'gray', t: 'Open the full website', chev: 1 })}
      ${row({ tag: 'button', attr: 'data-pw', av: ic('key', 20), avc: 'gray', t: 'Change password', chev: 1 })}</div>
    <button class="btn big danger-t" data-out>${ic('out', 20)} Sign out</button><p class="fine center">DoorHold app · ${esc(String(me.build || '').slice(0, 7))}</p>`,
    after: el => { const i = $('[data-inst]', el); if (i) i.onclick = () => installHelp(); $('[data-out]', el).onclick = async () => { if (await ask('Sign out?', 'You can sign back in any time.', 'Sign out', true)) signOut(); };
      $('[data-pw]', el).onclick = () => { const s = sheet(`<form><div class="sh-h"><h2>Change password</h2></div>${field('Current password', '<input name="current" type="password" autocomplete="current-password" required>')}${field('New password', '<input name="password" type="password" autocomplete="new-password" minlength="8" required>', 'At least 8 characters')}<button class="btn big" type="submit">Save</button></form>`, { onSubmit: async x => { const pre = { tenant: 't', worker: 'w', owner: 'o', manager: 'm' }[role]; await api(pre + '/password', { body: { current: x.current, next: x.password } }); s.close(); toast('Password changed'); } }); }; } };
};
R['set/security'] = async () => { const a = Acc.cur(); const me = await api('app67/me');
  return { title: 'Face ID and PIN', body: `<p class="lead">You stay signed in on this phone. Add a lock so only you can open DoorHold.</p>
    <div class="card list">
      ${pkOK() ? `<label class="row tglrow"><div class="av blue">${ic('face', 20)}</div><div class="m"><div class="t">Face ID / fingerprint</div><div class="d">Uses a passkey saved on this phone</div></div><input type="checkbox" data-pk ${a.pk ? 'checked' : ''}><span class="sw" aria-hidden="true"></span></label>` : ''}
      <label class="row tglrow"><div class="av g">${ic('lock', 20)}</div><div class="m"><div class="t">App PIN</div><div class="d">4 digits, asked after 5 minutes away</div></div><input type="checkbox" data-pin ${hasPin() ? 'checked' : ''}><span class="sw" aria-hidden="true"></span></label></div>
    ${(me.passkeys || []).length ? sec('Passkeys on your login') + `<div class="card list">${me.passkeys.map(p => row({ av: ic('key', 18), avc: 'gray', t: esc(p.name || 'Passkey'), d: 'Added ' + fdate(p.created) + (p.last_used ? ' · used ' + ago(p.last_used) : ''), r: `<button class="nb sm" data-del="${p.id}" aria-label="Remove passkey">${ic('x', 18)}</button>` })).join('')}</div>` : ''}
    <p class="fine">Face ID never leaves your phone. DoorHold only keeps a public key to check it is you.</p>`,
    after: el => { const pk = $('[data-pk]', el); if (pk) pk.onchange = async () => { if (pk.checked) { try { await pkRegister(); Acc.update({ pklock: true }); toast('Face ID is on'); } catch (e) { pk.checked = false; if (e.name !== 'NotAllowedError') toast(e.message, 'err'); } } else { Acc.update({ pk: false, pklock: false }); toast('Face ID is off on this phone'); } render(true); };
      const pn = $('[data-pin]', el); pn.onchange = () => { if (pn.checked) { pn.checked = false; pinSetup(() => render(true)); } else { LS.del(pinKey()); toast('PIN is off'); } };
      $$('[data-del]', el).forEach(b => b.onclick = async () => { await api('app67/pk/del', { body: { id: +b.dataset.del } }); toast('Removed'); render(true); }); } };
};
R['set/notify'] = async () => { const ps = await pushState(); const me = await api('app67/me'); const role = Acc.cur().role;
  const what = { tenant: ['Replies from the office', 'Rent due reminders', 'Payment confirmations'], worker: ['New jobs and approved prices', 'Messages from the office', 'Payments sent'], manager: ['New maintenance requests', 'Messages from tenants and workers', 'Payments reported or received'], owner: ['Statements and updates from your manager'] }[role] || [];
  return { title: 'Notifications', body: `${ps === 'unsupported' ? `<div class="card pad note">${ic('alert', 22)}<div><b>${isIOS && !standalone() ? 'Install the app first' : 'This browser cannot get notifications'}</b><small>${isIOS ? 'On iPhone (iOS 16.4 or newer), add DoorHold to your Home Screen, open it from the icon, then turn notifications on here.' : 'Use Chrome on Android, or install the app.'}</small></div></div>${isIOS ? '<button class="btn big" data-inst>How to install</button>' : ''}` : `
    <div class="card list"><label class="row tglrow"><div class="av red">${ic('bell', 20)}</div><div class="m"><div class="t">Notifications on this phone</div><div class="d">${ps === 'denied' ? 'Blocked. Allow them in the phone settings for this app.' : 'You can turn them off any time'}</div></div><input type="checkbox" data-on ${ps === 'on' ? 'checked' : ''} ${ps === 'denied' ? 'disabled' : ''}><span class="sw" aria-hidden="true"></span></label></div>
    ${ps === 'on' ? '<button class="btn tint" data-test>Send a test notification</button>' : ''}`}
    ${sec('What you get')}<div class="card pad"><ul class="ticks">${what.map(w => `<li>${ic('check', 18)}${esc(w)}</li>`).join('')}</ul>${me.push.on ? '' : '<p class="note">Your company has notifications turned off right now.</p>'}</div>`,
    after: el => { const o = $('[data-on]', el); if (o) o.onchange = async () => { if (o.checked) { const ok = await pushOn().catch(e => { toast(e.message, 'err'); return false; }); if (!ok) o.checked = false; } else await pushOff(); render(true); };
      const t = $('[data-test]', el); if (t) t.onclick = async () => { const r = await api('app67/push/test', { body: {} }); toast(r.sent ? 'Sent. It should show in a moment.' : 'Nothing was sent. Turn notifications off and on again.', r.sent ? '' : 'err'); };
      const i = $('[data-inst]', el); if (i) i.onclick = () => installHelp(true); } };
};
R['set/company'] = async () => { const c = await api('app67/push/cfg'); const canEdit = !ME || !ME.staff || ME.staff.role === 'owner' || ((ME.staff.perms || {}).settings || 0) >= 2;
  return { title: 'Company notifications', body: `<p class="lead">For everyone in your company who uses the app: tenants, workers, owners and staff. Each person still chooses on their own phone.</p>
    <div class="card list"><label class="row tglrow"><div class="m"><div class="t">Send app notifications</div><div class="d">${c.devices} phone${c.devices === 1 ? '' : 's'} signed up</div></div><input type="checkbox" data-all ${c.push ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span class="sw" aria-hidden="true"></span></label>
    ${Object.entries(c.labels).map(([k, l]) => `<label class="row tglrow ${c.push ? '' : 'dim'}"><div class="m"><div class="t">${esc(l)}</div></div><input type="checkbox" data-ev="${k}" ${c.ev[k] ? 'checked' : ''} ${canEdit && c.push ? '' : 'disabled'}><span class="sw" aria-hidden="true"></span></label>`).join('')}</div>
    ${canEdit ? '' : '<p class="fine">Only the company owner can change these.</p>'}`,
    after: el => { const save = async b => { try { await api('app67/push/cfg', { body: b }); toast('Saved'); render(true); } catch (e) { toast(e.message, 'err'); render(true); } };
      $('[data-all]', el).onchange = e => save({ push: e.target.checked }); $$('[data-ev]', el).forEach(i => i.onchange = () => save({ ev: { [i.dataset.ev]: i.checked } })); } };
};
R['set/accounts'] = async () => ({ title: 'Accounts', body: `<div class="card list">${Acc.all().map(x => row({ tag: 'button', attr: `data-acc="${esc(x.email)}"`, av: esc(initials(x.name)), t: esc(x.name || x.email), d: `${esc(ROLE_LABEL[x.role] || '')}${x.company ? ' · ' + esc(x.company) : ''}`, r: x.email === Acc.cur().email ? ic('check', 20, 'okc') : '' })).join('')}</div>
  <button class="btn big tint" data-add>${ic('plus', 20)} Add another account</button><p class="fine">Use one phone for several logins, for example a manager who also rents, or a contractor who works for two companies.</p>`,
  after: el => { $$('[data-acc]', el).forEach(b => b.onclick = () => { if (b.dataset.acc === Acc.cur().email) return; Acc.use(b.dataset.acc); blobCache.clear(); ME = null; location.hash = '#/' + home(); LS.set('last', 0); boot(true); }); $('[data-add]', el).onclick = () => loginScreen(true); } });

Object.assign(IC, { edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>' });

// ---------- d68: Tasks box on the manager home + Tasks screen (same API as the website: /api/x68) ----------
const TKR = { lease: 'Lease', rent: 'Rent', bill: 'Bill', bank: 'Bank', mort: 'Mortgage', wo: 'Repair', doc: 'Document', pay: 'Payment' };
const tkMine = (t, me) => t.assignee_id === me || (!t.assignee_id && (t.kind === 'auto' || !t.created_by || t.created_by === me));
const tkPath = t => t.kind === 'auto' ? 'x68/a/' + encodeURIComponent(t.key) : 'x68/m/' + t.id;
const plusD = (T, n) => { const d = new Date(T + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function tkWhen(t, T) {
  if (t.snooze_until) return 'Reminds you ' + fdate(t.snooze_until);
  if (!t.due) return '';
  const tm = t.due_time ? ' ' + (() => { const [h, m] = t.due_time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; })() : '';
  return t.overdue ? 'Overdue · ' + (t.due === T ? 'today' : fdate(t.due)) + tm : t.due === T ? 'Today' + tm : t.due === plusD(T, 1) ? 'Tomorrow' + tm : 'Due ' + fdate(t.due) + tm;
}
function tkRowA(t, x, hist) {
  const when = tkWhen(t, x.today); const sub = t.sub || [t.property, t.unit ? 'Unit ' + t.unit : '', t.tenant].filter(Boolean).join(' · ');
  const meta = [when ? `<span class="${t.overdue ? 'tkod' : ''}">${esc(when)}</span>` : '', t.kind === 'auto' ? esc('Auto · ' + (TKR[t.rule] || 'Reminder')) : '', t.assignee ? esc(t.assignee) : ''].filter(Boolean).join(' · ');
  return `<div class="tkr${t.overdue ? ' od' : ''}${hist ? ' hs' : ''}" data-tk="${esc(t.key)}">
    ${hist ? `<span class="tkc dn">${ic(t.status === 'done' ? 'check' : 'x', 16)}</span>` : `<button class="tkc" data-tkdone aria-label="Mark done: ${esc(t.title)}">${ic('check', 16)}</button>`}
    <button class="tkm" data-tkopen><span class="tkt">${esc(t.title)}</span>${sub ? `<span class="tks">${esc(sub)}</span>` : ''}<span class="tkx">${hist ? esc((t.status === 'done' ? 'Done' : 'Dismissed') + (t.closed_by_name ? ' by ' + t.closed_by_name : '') + (t.closed_at ? ' · ' + fdate(String(t.closed_at).slice(0, 10)) : '')) : meta}</span></button>
    ${hist ? (t.gone ? '' : `<button class="tkb" data-tkreopen aria-label="Reopen">${ic('undo', 18)}</button>`) : `<button class="tkb" data-tksnz aria-label="Remind me later: ${esc(t.title)}">${ic('clock', 18)}</button>`}
  </div>`;
}
async function tkDo(t, act, body, after) { try { await api(tkPath(t) + '/' + act, { body: { title: t.title, ...(body || {}) } }); toast({ done: 'Done', dismiss: 'Dismissed for good', snooze: 'We’ll remind you', reopen: 'Back on the list', assign: 'Assigned', delete: 'Deleted' }[act] || 'Saved'); after && after(); } catch (e) { toast(e.message, 'err'); } }
function tkSnoozeA(t, x, after) {
  const T = x.today;
  const s = sheet(`<form><div class="sh-h"><h2>Remind me later</h2><p class="fine">${esc(t.title)}</p></div>
    <div class="tkq">${[['tomorrow', 'Tomorrow', 1], ['2d', 'In 2 days', 2], ['1w', 'In 1 week', 7]].map(([k, l, n]) => `<button type="button" class="btn tint" data-pre="${k}"><b>${l}</b><small>${esc(fdate(plusD(T, n)))}</small></button>`).join('')}</div>
    ${field('Or pick a date', `<input type="date" name="until" min="${plusD(T, 1)}">`)}<button class="btn big" type="submit">Remind me then</button></form>`, {
    onSubmit: async f => { if (!f.until) throw new Error('Pick a date, or tap one of the buttons'); await api(tkPath(t) + '/snooze', { body: { until: f.until, title: t.title } }); s.close(); toast('We’ll remind you ' + fdate(f.until)); after(); } });
  $$('[data-pre]', s.el).forEach(b => b.onclick = async () => { b.disabled = true; await tkDo(t, 'snooze', { preset: b.dataset.pre }, () => { s.close(); after(); }); b.disabled = false; });
}
async function tkEditA(t, x, after) {
  const props = await api('m/properties').catch(() => []); const v = t || { priority: 'normal' };
  const opts = (arr, val) => arr.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const s = sheet(`<form><div class="sh-h"><h2>${t ? 'Edit task' : 'New task'}</h2></div>
    ${field('What needs to be done', `<input name="title" required maxlength="200" value="${esc(v.title || '')}" placeholder="Call PSEG tomorrow">`)}
    <div class="two">${field('Due date', `<input type="date" name="due" value="${esc(v.due || plusD(x.today, 1))}">`)}${field('Time', `<input type="time" name="due_time" value="${esc(v.due_time || '')}">`)}</div>
    <div class="fld"><span>Priority</span><div class="seg" data-seg="priority">${[['low', 'Low'], ['normal', 'Normal'], ['high', 'High']].map(([k, l]) => `<button type="button" data-v="${k}" class="${(v.priority || 'normal') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    ${x.users.length > 1 ? field('Assign to', `<select name="assignee_id">${opts([['', 'Nobody (anyone)'], ...x.users.map(u => [u.id, u.id === x.me ? u.name + ' (me)' : u.name])], v.assignee_id || '')}</select>`) : ''}
    ${field('Property (optional)', `<select name="property_id">${opts([['', 'None'], ...props.map(p => [p.id, p.name])], v.property_id || '')}</select>`)}
    ${field('Notes', `<textarea name="notes" rows="3" maxlength="4000">${esc(v.notes || '')}</textarea>`)}
    <button class="btn big" type="submit">${t ? 'Save' : 'Add task'}</button></form>`, { full: true,
    onSubmit: async f => { f.priority = ($('[data-seg] .on', s.el) || {}).dataset?.v || 'normal'; await api(t ? `x68/m/${t.id}/edit` : 'x68/new', { body: f }); s.close(); toast(t ? 'Saved' : 'Task added'); after(); } });
  $$('[data-seg] button', s.el).forEach(b => b.onclick = () => { $$('[data-seg] button', s.el).forEach(o => o.classList.toggle('on', o === b)); });
}
function tkMoreA(t, x, after) {
  const auto = t.kind === 'auto'; const sub = t.sub || [t.property, t.unit ? 'Unit ' + t.unit : '', t.tenant].filter(Boolean).join(' · ');
  const web = auto && t.href ? '/' + t.href : '';
  const s = sheet(`<div class="sh-h"><h2>${esc(t.title)}</h2><p class="fine">${esc([sub, tkWhen(t, x.today), auto ? 'Automatic task' : (t.created_by_name ? 'Added by ' + t.created_by_name : '')].filter(Boolean).join(' · '))}</p></div>
    ${t.notes ? `<p class="desc">${esc(t.notes)}</p>` : ''}
    <div class="tkacts">
      <button class="btn big" data-a="done">${ic('check', 20)} Done</button>
      <button class="btn big tint" data-a="snz">${ic('clock', 20)} Remind me later</button>
      ${!auto ? `<button class="btn big tint" data-a="edit">${ic('edit', 20)} Edit</button>` : ''}
      ${web ? `<a class="btn big tint" href="${esc(web)}" target="_blank" rel="noopener">${ic('globe', 20)} Open on the website</a>` : ''}
      <button class="btn big tint" data-a="dismiss">${ic('x', 20)} Dismiss forever</button>
      ${!auto ? `<button class="btn big tint red" data-a="delete">${ic('trash', 20)} Delete</button>` : ''}
    </div>
    ${x.users.length > 1 ? field('Assigned to', `<select name="assignee_id">${[['', 'Nobody'], ...x.users.map(u => [u.id, u.id === x.me ? u.name + ' (me)' : u.name])].map(([k, l]) => `<option value="${k}" ${String(k) === String(t.assignee_id || '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`) : ''}`);
  $$('[data-a]', s.el).forEach(b => b.onclick = async () => { const a = b.dataset.a;
    if (a === 'snz') { s.close(); return tkSnoozeA(t, x, after); }
    if (a === 'edit') { s.close(); return tkEditA(t, x, after); }
    if (a === 'delete' && !confirm('Delete this task?')) return;
    b.disabled = true; await tkDo(t, a, {}, () => { s.close(); after(); }); b.disabled = false; });
  const sl = $('[name=assignee_id]', s.el); if (sl) sl.onchange = async () => { const id = +sl.value || null; if (auto) await tkDo(t, 'assign', { assignee_id: id }, after); else { try { await api(`x68/m/${t.id}/edit`, { body: { assignee_id: id } }); toast('Assigned'); after(); } catch (e) { toast(e.message, 'err'); } } };
}
function tkBindA(el, x, after) {
  $$('[data-tk]', el).forEach(r => { const t = x.items.find(i => i.key === r.dataset.tk); if (!t) return;
    const d = $('[data-tkdone]', r); if (d) d.onclick = async () => { d.disabled = true; r.classList.add('going'); haptic('ok'); await tkDo(t, 'done', {}, after); };
    const o = $('[data-tkopen]', r); if (o) o.onclick = () => tkMoreA(t, x, after);
    const z = $('[data-tksnz]', r); if (z) z.onclick = () => tkSnoozeA(t, x, after);
    const q = $('[data-tkreopen]', r); if (q) q.onclick = async () => { q.disabled = true; await tkDo(t, 'reopen', {}, after); }; });
}
const tkSegA = f => `<div class="seg tkseg" role="group" aria-label="Whose tasks"><button type="button" data-tkf="mine" class="${f === 'mine' ? 'on' : ''}" aria-pressed="${f === 'mine'}">Mine</button><button type="button" data-tkf="all" class="${f === 'all' ? 'on' : ''}" aria-pressed="${f === 'all'}">All</button></div>`;
{ const _mh = R['m/home']; const sk0 = _mh.sk;
  R['m/home'] = async (ctx) => {
    const [r, x] = await Promise.all([_mh(ctx), api('x68?box=1').catch(() => null)]); if (!x || !r || !r.body) return r;
    const f = LS.get('tkf', 'mine'); const list = x.items.filter(t => f === 'all' || tkMine(t, x.me)); const od = list.filter(t => t.overdue).length;
    const box = sec('Tasks', `<a href="#/m/tasks" class="seeall">${list.length > 4 ? 'See all ' + list.length : 'See all'}</a>`) + `<div class="tkhead">${tkSegA(f)}<button class="btn tint tkadd" data-tkadd>${ic('plus', 18)} Add</button></div>${od ? `<p class="tkodn">${od} overdue</p>` : ''}
      <div class="card tklist">${list.slice(0, 4).map(t => tkRowA(t, x)).join('') || empty('check', 'Nothing to do', f === 'mine' && x.items.length ? 'Tap All to see everyone’s tasks' : 'Add your own with the Add button')}</div>`;
    const q = sec('Quick actions'); r.body = r.body.includes(q) ? r.body.replace(q, box + q) : box + r.body;
    const a0 = r.after; r.after = el => { if (a0) a0(el); const again = () => render(true); tkBindA(el, x, again);
      $$('[data-tkf]', el).forEach(b => b.onclick = () => { LS.set('tkf', b.dataset.tkf); again(); }); const ad = $('[data-tkadd]', el); if (ad) ad.onclick = () => tkEditA(null, x, again); };
    return r;
  };
  R['m/home'].sk = sk0;
}
R['m/tasks'] = async () => {
  const x = await api('x68'); const f = LS.get('tkf', 'mine'); const tab = LS.get('tkt', 'open');
  const mine = x.items.filter(t => f === 'all' || tkMine(t, x.me));
  const open = mine.filter(t => t.status === 'open' && !t.snooze_until), snz = mine.filter(t => t.status === 'open' && t.snooze_until), hist = mine.filter(t => t.status !== 'open').sort((a, b) => String(b.closed_at || '').localeCompare(String(a.closed_at || '')));
  const cur = tab === 'snoozed' ? snz : tab === 'history' ? hist : open;
  return { title: 'Tasks', sub: `${open.length} open${open.some(t => t.overdue) ? ' · ' + open.filter(t => t.overdue).length + ' overdue' : ''}`, action: `<button class="nb" data-tkadd aria-label="New task">${ic('plus', 26)}</button>`, body: `
    <div class="tkhead">${tkSegA(f)}</div>
    <div class="seg tktabs" role="group" aria-label="Lists">${[['open', 'Open', open.length], ['snoozed', 'Snoozed', snz.length], ['history', 'Done', hist.length]].map(([k, l, n]) => `<button type="button" data-tkt="${k}" class="${tab === k ? 'on' : ''}" aria-pressed="${tab === k}">${l} ${n}</button>`).join('')}</div>
    <div class="card tklist">${cur.map(t => tkRowA(t, x, tab === 'history')).join('') || empty('check', tab === 'open' ? 'All clear' : tab === 'snoozed' ? 'Nothing snoozed' : 'Nothing done yet')}</div>
    <p class="fine tkfoot">Automatic tasks come from your data: ${x.rules.filter(r => r.live).map(r => esc(TKR[r.k].toLowerCase())).join(', ')}. They clear by themselves once handled.</p>`,
    after: el => { const again = () => render(true); tkBindA(el, x, again);
      $$('[data-tkf]', el).forEach(b => b.onclick = () => { LS.set('tkf', b.dataset.tkf); again(); });
      $$('[data-tkt]', el).forEach(b => b.onclick = () => { LS.set('tkt', b.dataset.tkt); again(); });
      $$('[data-tkadd]').forEach(b => b.onclick = () => tkEditA(null, x, again)); } };
};
R['m/tasks'].sk = { title: 'Tasks', sk: SK.list(6) };

// ---------- start ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.go) location.hash = e.data.go.replace(/^.*#/, '#'); });
document.documentElement.classList.toggle('ios', isIOS); document.documentElement.classList.toggle('pwa', standalone());
const st = document.createElement('div'); st.id = 'stage'; document.body.prepend(st); setTimeout(hideSplash, 3500);
const offb = document.createElement('div'); offb.className = 'offbar'; offb.setAttribute('role', 'status'); offb.textContent = 'You are offline'; document.body.append(offb); if (!navigator.onLine) document.body.classList.add('is-off');
window.DH67 = { go, render, api, Acc };
boot();
})();
