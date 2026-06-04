const CACHE_NAME = 'lukeni-v1';

self.addEventListener('install', () => {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('[SW] Clearing old caches:', keys);
      return Promise.all(keys.map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

// ✅ PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  try {
    const data = event.data?.json() ?? {};
    
    console.log('[SW] Push data:', data);

    const options = {
      body: data.body || 'Nouvelle notification',
      icon: data.icon || 'https://lukeni.vercel.app/icons/icon-192x192.png',
      badge: data.badge || 'https://lukeni.vercel.app/icons/badge-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      sound: data.sound || undefined,
      vibrate: data.vibrate || undefined,
      data: { 
        url: data.url || 'https://lukeni.vercel.app/encyclopedie',
        title: data.title,
        body: data.body,
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Lukeni', options)
    );
  } catch (error) {
    console.error('[SW] Push event error:', error);
    event.waitUntil(
      self.registration.showNotification('Lukeni', {
        body: 'Une nouvelle notification est disponible',
        icon: 'https://lukeni.vercel.app/icons/icon-192x192.png',
        badge: 'https://lukeni.vercel.app/icons/badge-72x72.png',
        data: { url: 'https://lukeni.vercel.app/encyclopedie' }
      })
    );
  }
});

// ✅ NOTIFICATION CLICK (ROBUSTE)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  let urlToOpen = event.notification.data?.url || 'https://lukeni.vercel.app/encyclopedie';
  
  console.log('[SW] URL to open:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ✅ Chercher une fenêtre existante
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen);
          
          // Comparer les pathname
          if (clientUrl.pathname === targetUrl.pathname) {
            console.log('[SW] Focus existing client:', client.url);
            return client.focus();
          }
        } catch (e) {
          console.warn('[SW] URL parsing error:', e);
        }
      }
      
      // ✅ S'assurer que l'URL est absolue
      if (!urlToOpen.startsWith('http')) {
        urlToOpen = `https://lukeni.vercel.app${urlToOpen}`;
      }
      
      console.log('[SW] Opening new window:', urlToOpen);
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ✅ NOTIFICATION CLOSE
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ✅ FETCH HANDLER
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ✅ Ignorer les domaines externes
  if (url.origin !== self.location.origin) return;
  
  // ✅ Ignorer les API (toujours fetch du réseau)
  if (url.pathname.startsWith('/api/')) return;
  
  // ✅ Ignorer Supabase et googleapis
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis')) return;

  // ✅ NETWORK FIRST pour les pages HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match('/'))
            .catch(() => new Response('Offline - Page not available', { status: 503 }));
        })
    );
    return;
  }

  // ✅ CACHE FIRST pour les assets (CSS, JS, images)
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          // Mettre à jour le cache en arrière-plan
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          
          return cached;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
            
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'image') {
              return new Response('Image not available', { status: 503 });
            }
            return new Response('Resource not available', { status: 503 });
          });
      })
  );
});

// ✅ BACKGROUND SYNC (optionnel - pour les actions offline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      fetch('/api/sync').catch(() => {
        console.warn('[SW] Sync failed - will retry later');
      })
    );
  }
});