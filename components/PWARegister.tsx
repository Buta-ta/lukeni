// components/PWARegister.tsx
"use client";

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Toujours vérifier les mises à jour
        });

        console.log('[PWA] Service Worker registered:', registration.scope);

        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
          console.log('[PWA] Checking for SW updates...');
        }, 60 * 60 * 1000);

        // Notifier quand une mise à jour est disponible
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] New version available!');
              // Optionnel : afficher un toast "Mise à jour disponible"
            }
          });
        });

      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    };

    // Enregistrer après le chargement complet
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  return null; // Pas de rendu
}