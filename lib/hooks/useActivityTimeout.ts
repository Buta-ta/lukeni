// /lib/hooks/useActivityTimeout.ts
"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 heures en ms
const COOKIE_REFRESH_INTERVAL = 5 * 60 * 1000;  // Rafraîchit le cookie toutes les 5 min

const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keydown',
  'scroll', 'touchstart', 'click'
];

function refreshActivityCookie() {
  const now = Date.now();
  document.cookie = `last_activity=${now}; path=/; max-age=${8 * 60 * 60}; samesite=lax`;
  localStorage.setItem('last_activity', String(now));
}

export function useActivityTimeout(onTimeout?: () => void) {
  const timeoutRef     = useRef<NodeJS.Timeout | null>(null);
  const intervalRef    = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Rafraîchit le cookie max 1 fois par intervalle pour éviter le spam
    const now = Date.now();
    if (now - lastRefreshRef.current >= COOKIE_REFRESH_INTERVAL) {
      lastRefreshRef.current = now;
      refreshActivityCookie();
    }

    // Timer de déconnexion
    timeoutRef.current = setTimeout(async () => {
      console.log('⏱️ Session expirée par inactivité (8h)');
      await supabase.auth.signOut();
      localStorage.removeItem('last_activity');

      if (onTimeout) {
        onTimeout();
      } else {
        window.location.href = '/auth?reason=timeout';
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // ── Vérifier l'activité précédente au chargement ──
    const lastActivity = localStorage.getItem('last_activity');
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        console.log('⏱️ Session expirée (inactivité détectée au chargement)');
        supabase.auth.signOut();
        localStorage.removeItem('last_activity');
        window.location.href = '/auth?reason=timeout';
        return;
      }
    }

    // ── Initialisation ──
    refreshActivityCookie();
    resetTimer();

    // ── Écoute des événements utilisateur ──
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // ── Rafraîchissement périodique du cookie (même sans activité) ──
    // Utile quand l'admin travaille dans un formulaire sans bouger la souris
    intervalRef.current = setInterval(() => {
      refreshActivityCookie();
    }, COOKIE_REFRESH_INTERVAL);

    // ── Cleanup ──
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { resetTimer };
}