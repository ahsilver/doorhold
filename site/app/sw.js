/* DoorHold app service worker: app shell cache, offline start, push notifications. Scope /app/. */
const VERSION = '59a9cfe097';
const SHELL = ['/app/', '/app/app.js?v=' + VERSION, '/app/app.css?v=' + VERSION, '/app/manifest.webmanifest', '/app/img/icon-192.png', '/app/img/icon-96.png', '/fonts/InterSub.woff2'];
const CACHE = 'dh-app-' + VERSION;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dh-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return; // live data always goes to the network
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put('/app/', c)); return res; }).catch(() => caches.match('/app/'))); return; }
  if (u.pathname.startsWith('/app/') || u.pathname.startsWith('/fonts/')) e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })));
});
self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (x) { m = { title: 'DoorHold', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'DoorHold', { body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag, icon: '/app/img/icon-192.png', badge: '/app/img/icon-96.png', data: { url: m.url || '/app/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/app/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if (new URL(c.url).pathname.startsWith('/app/')) { c.postMessage({ go: url }); return c.focus(); } } return self.clients.openWindow(url); }));
});
