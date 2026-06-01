// /app/layout-client.tsx
"use client";

import { useActivityTimeout } from '@/lib/hooks/useActivityTimeout';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { TrackingProvider } from '@/components/TrackingProvider';
import { PWARegister } from '@/components/PWARegister';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import Footer from '@/components/Footer';

export function LayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useActivityTimeout(
    isAuthenticated ? () => {
      console.log('⏱️ Session expirée');
    } : undefined
  );

  if (isLoading) return null;

  return (
    <>
      <PWARegister />   
      <PWAInstallButton />    
      <TrackingProvider>
        {children}
      </TrackingProvider>
      <Footer />
    </>
  );
}