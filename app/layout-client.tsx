// /app/layout-client.tsx
"use client";

import { useActivityTimeout } from '@/lib/hooks/useActivityTimeout';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { TrackingProvider } from '@/components/TrackingProvider';
import { PWARegister } from '@/components/PWARegister';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import Footer from '@/components/Footer';

export function LayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const isGamePage =
    pathname?.startsWith('/investigations/') && pathname !== '/investigations';

  useEffect(() => {
    // Lecture de la langue dans localStorage
    const stored = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (stored === 'fr' || stored === 'en') setLang(stored);

    // Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useActivityTimeout(
    isAuthenticated
      ? () => {
          console.log('⏱️ Session expirée');
        }
      : undefined
  );

  return (
    <>
      <PWARegister />

      <TrackingProvider>
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </TrackingProvider>

      {!isGamePage && <Footer />}

      <PWAInstallButton lang={lang} />
    </>
  );
}