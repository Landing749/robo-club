/* RoboSys Service Worker v1.0 */
const CACHE = 'robosys-v1';
const SHELL = ['/', '/index.html', '/app.html'];

// Install – pre-cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate – clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch – cache-first for shell, network-first for Firebase/Cloudinary
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network for Firebase and Cloudinary
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('cloudinary') ||
      url.hostname.includes('googleapis')) {
    return; // let browser handle
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful GET responses for same-origin
        if (e.request.method === 'GET' && res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'RoboSys', body: 'You have a new update.' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'RoboSys', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.url || '/',
      actions: [{ action: 'open', title: 'Open App' }]
    })
  );
});

// Notification click – focus or open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const target = e.notification.data || '/';
      const open = wins.find(w => w.url.includes(self.location.origin) && 'focus' in w);
      if (open) return open.focus();
      return clients.openWindow(target);
    })
  );
});
