// Universe Academy Service Worker
// Version: 4.0.0

const CACHE_VERSION = 'universe-v4';
const STATIC_CACHE = `universe-static-${CACHE_VERSION}`;
const PAGES_CACHE = `universe-pages-${CACHE_VERSION}`;
const DATA_CACHE = `universe-data-${CACHE_VERSION}`;

// Core assets to pre-cache immediately upon installation
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon.png',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

// ==========================================
// 1. Service Worker Installation & Pre-cache
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Universe SW] Pre-caching core application shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ==========================================
// 2. Service Worker Activation & Cache Cleanup
// ==========================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheKeys) => {
      return Promise.all(
        cacheKeys.map((key) => {
          if (![STATIC_CACHE, PAGES_CACHE, DATA_CACHE].includes(key)) {
            console.log('[Universe SW] Removing obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// 3. Fetch Strategy & Offline Routing
// ==========================================
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests with HTTP/HTTPS schemes
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Bypass Google Firebase API endpoints and Dev Server HMR
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/api/gemini')
  ) {
    return;
  }

  // Strategy A: Page / Navigation Requests (Fast Network-First with Immediate Offline Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Fast race: network with 1500ms timeout so offline/poor connections on iPhones load instantly from cache
        const networkPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(PAGES_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 1500)
        );

        try {
          return await Promise.race([networkPromise, timeoutPromise]);
        } catch (err) {
          // Network failed or timed out -> serve from cache immediately
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          // Match root app shell from cache
          const homePage = await caches.match('/');
          if (homePage) return homePage;

          // Dedicated offline fallback
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) return offlineFallback;

          return new Response(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Universe Academy - وضع عدم الاتصال</title><style>body{background:#09090b;color:#f8fafc;font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;}h1{color:#22c55e;font-size:24px;}p{color:#a1a1aa;font-size:14px;max-width:400px;margin:12px auto;line-height:1.6;}</style></head><body><h1>منصة Universe Academy</h1><p>أنت تتصفح حالياً في وضع عدم الاتصال (Offline). جميع سجلاتك وبيانات الطلاب محفوظة بأمان على جهازك.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Strategy B: Static Assets (JS, CSS, Fonts, Images, Icons - Stale-While-Revalidate)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|json|webmanifest)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately, update cache in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => { /* Silent offline background refresh failure */ });

          return cachedResponse;
        }

        // Cache miss -> fetch from network and store in static cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 404, statusText: 'Resource Not Found' });
        });
      })
    );
    return;
  }

  // Strategy C: Default Network-First for other GET requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(DATA_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ==========================================
// 4. Background Sync (Offline Action Queue)
// ==========================================
self.addEventListener('sync', (event) => {
  console.log('[Universe SW] Background sync event triggered:', event.tag);
  if (event.tag === 'sync-offline-attendance' || event.tag === 'universe-background-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_ONE_WAY_PUSH',
            reason: 'background_sync_connection_resumed'
          });
        });
      })
    );
  }
});

// ==========================================
// 5. Periodic Background Sync
// ==========================================
self.addEventListener('periodicsync', (event) => {
  console.log('[Universe SW] Periodic background sync triggered:', event.tag);
  if (event.tag === 'universe-sync-rosters' || event.tag === 'get-latest-academy-updates') {
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(['/manifest.json', '/offline']);
      })
    );
  }
});

// ==========================================
// 6. Push Notifications
// ==========================================
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Universe Academy', body: event.data.text() };
    }
  }

  const title = data.title || 'Universe Academy';
  const options = {
    body: data.body || 'New update available in your academy workspace.',
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'academy-notification-' + Date.now(),
    renotify: true,
    data: {
      url: data.url || '/teacher',
    },
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification interaction in system tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Universe SW] Notification dismissed by user:', event.notification.tag);
});

// ==========================================
// 7. Client Message Communication
// ==========================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      })
    );
  }

  if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body, icon, tag, url } = event.data;
    const options = {
      body: body || 'You have a new update from Universe Academy.',
      icon: icon || '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: tag || 'academy-notification-' + Date.now(),
      renotify: true,
      data: {
        url: url || '/',
      },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title || 'Universe Academy', options));
  }
});
