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

    event.waitUntil(
      self.registration.showNotification(data.title || 'Lukeni', {
        body: data.body || 'Nouvelle notification',
        icon: data.icon || 'https://lukeni.app/icons/icon-192x192.png',
        badge: data.badge || 'https://lukeni.app/icons/badge-72x72.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        sound: data.sound || undefined,
        vibrate: data.vibrate || undefined,
        data: { 
          url: data.url || 'https://lukeni.app/',
          title: data.title,
          body: data.body,
        },
      })
    );
  } catch (error) {
    console.error('[SW] Push event error:', error);
    event.waitUntil(
      self.registration.showNotification('Lukeni', {
        body: 'Une nouvelle notification est disponible',
        icon: 'https://lukeni.app/icons/icon-192x192.png',
        data: { url: 'https://lukeni.app/' }
      })
    );
  }
});

// ✅ NOTIFICATION CLICK (CORRIGÉ)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  let urlToOpen = event.notification.data?.url || 'https://lukeni.app/';
  
  console.log('[SW] URL to open:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Chercher une fenêtre existante
      for (const client of clientList) {
        // Comparer les URLs proprement
        if (new URL(client.url).pathname === new URL(urlToOpen, 'https://lukeni.app').pathname) {
          console.log('[SW] Focus existing client:', client.url);
          return client.focus();
        }
      }
      
      // Convertir en URL absolue si nécessaire
      if (!urlToOpen.startsWith('http')) {
        urlToOpen = `https://lukeni.app${urlToOpen}`;
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
  
  // Ignorer les domaines externes
  if (url.origin !== self.location.origin) return;
  
  // Ignorer les API
  if (url.pathname.startsWith('/api/')) return;
  
  // Ignorer Supabase
  if (url.hostname.includes('supabase')) return;

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
          .then((cached) => cached || new Response('Offline', { status: 503 }));
      })
  );
});