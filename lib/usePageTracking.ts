// lib/usePageTracking.ts
"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Génère ou récupère un session_id persistant
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('lukeni_session_id');
  if (!sessionId) {
    // UUID v4 simple
    sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('lukeni_session_id', sessionId);
  }
  return sessionId;
}

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    // Ne pas tracker les routes admin
    if (pathname?.startsWith('/admin')) return;
    // Ne pas tracker en développement (optionnel)
    // if (process.env.NODE_ENV === 'development') return;

    const sessionId = getSessionId();
    const referrer  = document.referrer || null;

    async function track() {
      try {
        // Récupérer l'utilisateur connecté si présent
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            user_id:    userId,
            page:       pathname,
            referrer,
          }),
          // Fire and forget - ne bloque pas la navigation
          keepalive: true,
        });
      } catch {
        // Silencieux - le tracking ne doit jamais impacter l'UX
      }
    }

    // Petit délai pour ne pas bloquer le rendu initial
    const timer = setTimeout(track, 500);
    return () => clearTimeout(timer);
  }, [pathname]);
}