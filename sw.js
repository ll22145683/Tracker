// Offline support: the app files come from the network when online (so updates show up),
// and from this cache when offline. Firebase's own data traffic is never touched here.
const CACHE = 'tracker-v6';
const SHELL = ['./', './index.html', './app-firebase.js', './firebase-config.js', './manifest.webmanifest',
               './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const library = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (sameOrigin) {
    // network first, cache as fallback
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
  } else if (library || fonts) {
    // versioned files: cache first
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
