// Minimal service worker — required for Android "Add to home screen" prompt.
// Strategy: cache the app shell on first load; always fetch API calls live.
const CACHE = 'uksc-ops-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(['/console/', '/console/index.html'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Drop caches from old versions
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls and images always go straight to the network — never cache live data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/images/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: network-first so you always get fresh code after a deploy,
  // with the cached version as a fallback if offline
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
