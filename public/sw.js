// Service Worker for Awal Shehada PWA
// Optimized for Sudan's network conditions: Fast offline caching & app shell resilience

const CACHE_NAME = 'awal-shehada-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
  '/og-image.svg',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache non-critical issue:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'exam-diagrams-v1') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-first for diagram media assets and bundled diagram paths (reads only exam-diagrams-v1)
  if (url.pathname.startsWith('/api/media/') || url.pathname.startsWith('/assets/diagrams/')) {
    event.respondWith(
      caches.open('exam-diagrams-v1').then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            return cached || new Response('Offline diagram asset not available', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // Do not cache other API calls, let network handle them with offline fallback in app
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first for images, fonts, icons, manifest
  if (
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        });
      })
    );
    return;
  }

  // Network-first falling back to cache for HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Stale-while-revalidate for JS/CSS assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Clear diagram cache on student logout for multi-user device safety
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_DIAGRAM_CACHE') {
    event.waitUntil(caches.delete('exam-diagrams-v1'));
  }
});

