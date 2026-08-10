"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface VisitorTicket {
  code: string;
  expires_at: string;
  renewed: boolean;
  new_expires_at: string | null;
  status: string;
}

interface UseVisitorSessionReturn {
  isVisitor: boolean;
  ticket: VisitorTicket | null;
  timeRemaining: number | null;     // secondes restantes
  isExpired: boolean;
  canRenew: boolean;                // pas encore renouvelé et pas expiré
  isRenewed: boolean;
  isFinalExpired: boolean;          // 4h écoulées (fin définitive)
  isLoading: boolean;
  renew: () => Promise<{ success: boolean; error?: string }>;
  formatTime: (seconds: number) => string;
}

export function useVisitorSession(): UseVisitorSessionReturn {
  const [isVisitor, setIsVisitor] = useState(false);
  const [ticket, setTicket] = useState<VisitorTicket | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [canRenew, setCanRenew] = useState(false);
  const [isRenewed, setIsRenewed] = useState(false);
  const [isFinalExpired, setIsFinalExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Vérifier si l'utilisateur est un visiteur et charger le ticket
  useEffect(() => {
    let mounted = true;

    async function checkVisitor() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (mounted) setIsLoading(false);
          return;
        }

        // Vérifier le rôle
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!mounted) return;

        if (!profile || profile.role !== 'visitor') {
          setIsLoading(false);
          return;
        }

        setIsVisitor(true);

        // Charger le ticket
        const { data: ticketData } = await supabase
          .from('visitor_tickets')
          .select('code, expires_at, renewed, new_expires_at, status')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (ticketData) {
          setTicket(ticketData);
          setIsRenewed(ticketData.renewed);
        }
      } catch (err) {
        console.error('❌ useVisitorSession error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    checkVisitor();
    return () => { mounted = false; };
  }, []);

  // 2. Timer local (décompte seconde par seconde)
  useEffect(() => {
    if (!ticket || !isVisitor) return;

    const computeRemaining = (): number => {
      const now = Date.now();
      const effectiveExpiry = ticket.renewed && ticket.new_expires_at
        ? new Date(ticket.new_expires_at).getTime()
        : new Date(ticket.expires_at).getTime();
      return Math.max(0, Math.floor((effectiveExpiry - now) / 1000));
    };

    const initial = computeRemaining();
    setTimeRemaining(initial);

    if (initial <= 0) {
      if (ticket.renewed) {
        // Déjà renouvelé et expiré → fin définitive
        setIsFinalExpired(true);
        setIsExpired(true);
        setCanRenew(false);
      } else {
        // Première expiration → peut renouveler
        setIsExpired(true);
        setCanRenew(true);
      }
      return;
    }

    const interval = setInterval(() => {
      const remaining = computeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (ticket.renewed) {
          setIsFinalExpired(true);
          setIsExpired(true);
          setCanRenew(false);
        } else {
          setIsExpired(true);
          setCanRenew(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket, isVisitor]);

  // 3. Fonction de renouvellement
  const renew = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Session introuvable.' };
      }

      const res = await fetch('/api/visitor/renew-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur lors du renouvellement.' };
      }

      // Mettre à jour le state local
      if (ticket) {
        const updatedTicket = {
          ...ticket,
          renewed: true,
          new_expires_at: data.new_expires_at,
        };
        setTicket(updatedTicket);
        setIsRenewed(true);
        setIsExpired(false);
        setCanRenew(false);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [ticket]);

  // 4. Format mm:ss
  const formatTime = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return {
    isVisitor,
    ticket,
    timeRemaining,
    isExpired,
    canRenew,
    isRenewed,
    isFinalExpired,
    isLoading,
    renew,
    formatTime,
  };
}
