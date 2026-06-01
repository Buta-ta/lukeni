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

// ✅ HANDLER POUR LES PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  try {
    const data = event.data?.json() ?? {};
    
    console.log('[SW] Push data:', data);

    event.waitUntil(
      self.registration.showNotification(data.title || 'Lukeni', {
        body: data.body || 'Nouvelle notification',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/badge-72x72.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        data: { 
          url: data.url || '/',
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
        icon: '/icons/icon-192x192.png',
      })
    );
  }
});

// ✅ HANDLER POUR LES CLICS SUR LES NOTIFICATIONS
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Vérifier si une fenêtre est déjà ouverte
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          console.log('[SW] Focus existing client');
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ✅ HANDLER POUR L'ANNULATION DES NOTIFICATIONS
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ✅ HANDLER POUR LES REQUÊTES
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ne pas intercepter les domaines externes
  if (url.origin !== self.location.origin) return;
  
  // Ne pas intercepter les API
  if (url.pathname.startsWith('/api/')) return;
  
  // Ne pas intercepter Supabase
  if (url.hostname.includes('supabase')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cloner la réponse
        const clonedResponse = response.clone();
        
        // Sauvegarder dans le cache
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse);
        });
        
        return response;
      })
      .catch(() => {
        // Si offline, retourner du cache
        return caches.match(event.request)
          .then((cached) => cached || new Response('Offline', { status: 503 }));
      })
  );
});