// PowerForecast v3.4.0 - BETAv Service Worker — High-Performance Mobile Caching & Offline Resilience
const SW_VERSION = '3.4.0-BETAv';
const CACHE_NAME = `powerforecast-${SW_VERSION}-cache`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/Assets/LOGO.png',
  '/Assets/icon-192.png',
  '/Assets/icon-512.png',
  '/Assets/icon-maskable-512.png',
  '/favicon.svg',
  '/rates.json',
  '/appliance_db.json'
];

// Install Event: Precache static shells and optionally prepare waiting worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical precache failure:', err);
      });
    })
  );
});

// Message Event: Listen for SKIP_WAITING signal triggered by client update prompt
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Activate Event: Clear older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('powerforecast-')) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for dynamic data & navigations; Cache-fallback for offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Supabase Auth Endpoints: Strictly bypass Service Worker to prevent synthetic offline errors & token corruption
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/v1/')) {
    return; // Pass through directly to browser network stack
  }

  // Supabase & external APIs: Network-first with cache fallback
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // HTML Page Navigations: Network-first to always pull newest deployment assets when online
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts, JSON): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Event: Handle background web push notifications even when PWA window is closed
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'PowerForecast Alert';
  const options = {
    body: data.body || 'Smart Energy Notification',
    icon: data.icon || '/Assets/LOGO.png',
    badge: '/Assets/LOGO.png',
    tag: data.tag || `powerforecast-alert-${Date.now()}`,
    requireInteraction: data.urgency === 'critical' || data.urgency === 'high' || data.requireInteraction === true,
    data: data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event: Focus existing window or open dashboard when clicked from Windows Action Center
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && client.url.includes(urlToOpen)) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification Close Event
self.addEventListener('notificationclose', (event) => {
  // Cleanly close notification
});
