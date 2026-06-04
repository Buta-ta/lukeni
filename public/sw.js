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
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      // ✅ SON ET VIBRATION
      sound: data.sound || undefined,
      vibrate: data.vibrate || undefined,
      // ✅ DATA PERSISTENTE
      data: { 
        url: data.url || '/',
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
        icon: '/icons/icon-192x192.png',
        data: { url: '/' }
      })
    );
  }
});

// ✅ NOTIFICATION CLICK (CORRIGÉ)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  // ✅ Fermer la notification
  event.notification.close();
  
  // ✅ Récupérer l'URL depuis data (avec fallback)
  const urlToOpen = event.notification.data?.url || '/';
  
  console.log('[SW] Opening URL:', urlToOpen);

  event.waitUntil(
    // ✅ Chercher une fenêtre existante avec cet URL
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // ✅ Vérifier si une fenêtre est déjà ouverte
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Chercher une fenêtre avec l'URL exact ou le domaine
        if (client.url === urlToOpen || client.url.includes(new URL(urlToOpen, self.location.href).hostname)) {
          console.log('[SW] Focus existing client:', client.url);
          return client.focus();
        }
      }
      
      // ✅ Si pas de fenêtre existante, en ouvrir une nouvelle
      if (clients.openWindow) {
        const fullUrl = new URL(urlToOpen, self.location.href).href;
        console.log('[SW] Opening new window:', fullUrl);
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// ✅ NOTIFICATION CLOSE
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ✅ FETCH HANDLER (CACHE FIRST POUR LES ASSETS)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ✅ Ignorer les domaines externes
  if (url.origin !== self.location.origin) return;
  
  // ✅ Ignorer les API (toujours fetch du réseau)
  if (url.pathname.startsWith('/api/')) return;
  
  // ✅ Ignorer Supabase et externes
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
            // Fallback pour les assets manquants
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
      // Retenter une action si elle a échoué en offline
      fetch('/api/sync').catch(() => {
        console.warn('[SW] Sync failed - will retry later');
      })
    );
  }
});