// PRIMEPIPFX Service Worker v3 — always serves the newest deployed version.
//  · Pages (navigations, index.html): NETWORK FIRST — a new deploy is visible on the next load.
//    The cached copy is used only when offline.
//  · /assets/* (content-hashed, immutable): cache first — fast and always matches its page.
//  · Everything else: straight to the network.
// On activation every older cache is deleted and open tabs are told to reload once.
const CACHE = 'primepipfx-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(new Request('/', { cache: 'reload' }))).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const hadOld = keys.some((k) => k !== CACHE);
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (hadOld) {
      const tabs = await self.clients.matchAll({ type: 'window' });
      tabs.forEach((t) => t.postMessage({ type: 'PPFX_SW_UPDATED' }));
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) (await caches.open(CACHE)).put('/', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});

// Tapping a PrimePipFX notification focuses (or opens) the app.
// Phone / PC notifications for H1 Level 1 / Level 2 events, delivered even when the app is closed.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'Prime Pip', body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'Prime Pip level alert', {
      body: d.body || '', icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', tag: d.tag || 'ppfx-level',
      renotify: d.renotify !== false, requireInteraction: true, data: { url: d.url || '/?tab=FUNDAMENTALS' },
    });
    // If the app is open somewhere, let it speak the announcement too.
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'ppfx-level-push', speech: d.speech || '', title: d.title || '', kind: d.kind || '' });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow((event.notification.data && event.notification.data.url) || '/');
  })());
});
