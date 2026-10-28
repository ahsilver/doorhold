/* r6: DoorHold never used a service worker at the site root. If any browser ever registered one here, this replaces it,
   removes itself and its caches, and reloads open pages onto the live version. (The tenant/staff app keeps its own worker under /app/.) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil((async () => { try { const ks = await caches.keys(); await Promise.all(ks.filter(k => !/^dh-app-/.test(k)).map(k => caches.delete(k))); } catch (x) { } await self.registration.unregister(); const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach(c => { try { c.navigate(c.url); } catch (x) { } }); })()); });
