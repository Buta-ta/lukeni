"use client";

import { useActivityTimeout } from '@/lib/hooks/useActivityTimeout';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { TrackingProvider } from '@/components/TrackingProvider';
import { PWARegister } from '@/components/PWARegister';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import Footer from '@/components/Footer';
import GlobalAnnouncement from '@/components/GlobalAnnouncement';
import { AudioProvider } from '@/lib/contexts/AudioContext';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import LiveSpotWidget from '@/components/LiveSpotWidget';
import { LanguageProvider, useLanguage } from '@/lib/contexts/LanguageContext';

function LayoutInner({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const pathname = usePathname();
  const { lang } = useLanguage();

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isGamePage =
    pathname?.startsWith('/investigations/') && pathname !== '/investigations';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

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
        <GlobalAnnouncement>
          <AudioProvider>
            <div className="flex-1 flex flex-col">
              {children}
            </div>

            {!isGamePage && <Footer />}

            <GlobalAudioPlayer />
            <LiveSpotWidget />
          </AudioProvider>
        </GlobalAnnouncement>
      </TrackingProvider>

      <PWAInstallButton lang={lang} />
    </>
  );
}

export function LayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <LanguageProvider>
      <LayoutInner>{children}</LayoutInner>
    </LanguageProvider>
  );
}