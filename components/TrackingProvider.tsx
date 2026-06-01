// components/TrackingProvider.tsx
"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('lukeni_sid');
  if (!id) {
    id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('lukeni_sid', id);
  }
  return id;
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasTracked = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    if (hasTracked.current.has(pathname)) return;

    const sessionId = getSessionId();
    if (!sessionId) return;

    const referrer = typeof document !== 'undefined' ? document.referrer || null : null;

    async function track() {
      try {
        // Attendre la session avec retry
        let userId: string | null = null;
        let attempts = 0;

        while (attempts < 5) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }

        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            page: pathname,
            referrer,
          }),
        });

        if (res.ok) {
          hasTracked.current.add(pathname);
          if (process.env.NODE_ENV === 'development') {
            const data = await res.json();
            console.log('[TRACKING] ✅', pathname, {
              user: userId ? `connected (${userId.slice(0, 8)}...)` : 'anonymous',
              geo: data.debug?.geo,
              ip: data.debug?.ip,
              mobile: data.debug?.mobile,
            });
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TRACKING] ❌ Failed:', err);
        }
      }
    }

    const timer = setTimeout(track, 1500);
    return () => clearTimeout(timer);

  }, [pathname]);

  return <>{children}</>;
}