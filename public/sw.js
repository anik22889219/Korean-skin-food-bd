// Service Worker for Korean Skin Food POS & Web App
// Provides offline capability during temporary internet outages

const CACHE_NAME = 'ksf-pos-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

// Precache essential static assets on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache partial warning:', err);
      });
    })
  );
});

// Clean up older cache versions on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interception strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests (POST, PUT, DELETE should hit network directly)
  if (req.method !== 'GET') {
    return;
  }

  // Ignore chrome-extension or other non-http(s) schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML SPA pages): Network-First, fallback to cached /index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
              cache.put('/index.html', networkRes.clone());
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Offline fallback: serve cached index.html
          return caches.match('/index.html').then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Do not cache dynamic sensitive API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Static Vite assets & Bundles (/assets/*, .js, .css, .woff2, .svg, .png)
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp');

  const isGoogleFont = 
    url.hostname === 'fonts.googleapis.com' || 
    url.hostname === 'fonts.gstatic.com';

  if (isStaticAsset || isGoogleFont) {
    // Stale-While-Revalidate: Return cache immediately if available, update in background
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default strategy: Network with Cache Fallback
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse.status === 200 && req.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req);
      })
  );
});

// Allow client pages to trigger immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
