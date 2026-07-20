// lib/hooks/useTrialSession.ts

"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface TrialSession {
  id: string;
  user_id: string;
  target_id: string;
  target_type: 'investigation' | 'book';
  session_minutes_used: number;
  max_session_minutes: number;
  started_at: string;
  expired_at: string;
  status: 'active' | 'expired';
  can_retry_at: string | null;
}

interface UseTrialSessionReturn {
  trial: TrialSession | null;
  isLoading: boolean;
  timeRemaining: number | null;
  isExpired: boolean;
  startTrial: (maxMinutes: number) => Promise<boolean>;
  canRetry: boolean;
  timeBeforeRetry: number | null;
  error: string | null;
  pauseTimer: (paused: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTrialSession(
  userId: string | null,
  targetId: string | null,
  targetType: 'investigation' | 'book' | null
): UseTrialSessionReturn {
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timeRemainingRef = useRef<number | null>(null);
  const trialIdRef = useRef<string | null>(null);

  // ✅ Calcul simple du temps restant
  const calculateRemaining = (expiredAt: string): number => {
    const expired = new Date(expiredAt).getTime();
    const now = Date.now();
    const remainingMs = expired - now;
    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  // 1. Charger la session d'essai
  useEffect(() => {
    if (!userId || !targetId || !targetType) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTrial = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('trial_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('target_id', targetId)
          .eq('target_type', targetType)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;
        if (fetchError) throw fetchError;

               if (data) {
          setTrial(data);
          trialIdRef.current = data.id; // ✅ Initialiser le ref
          const remaining = calculateRemaining(data.expired_at);

          console.log('⏰ [TRIAL] Initial remaining:', remaining, 'seconds');

          if (remaining <= 0) {
            setIsExpired(true);
            setTimeRemaining(0);
          } else {
            setIsExpired(false);
            setTimeRemaining(remaining);
          }
        } else {
          setTimeRemaining(null);
        }
        setError(null);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setTrial(null);
          setTimeRemaining(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    fetchTrial();

    return () => {
      isMounted = false;
    };
  }, [userId, targetId, targetType]);

    // 2. Compteur local : décompte seconde par seconde SANS recalculer depuis expired_at
  // 2. Compteur local : décompte seconde par seconde
  useEffect(() => {
    if (!trial || isExpired) return;

    if (timeRemaining === null || timeRemaining <= 0) {
      if (timeRemaining !== null && timeRemaining <= 0) {
        setIsExpired(true);
      }
      return;
    }

    console.log('⏱️ [TRIAL] Démarrage compteur local, départ:', timeRemaining, 'secondes');

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        // ✅ Mettre à jour le ref à chaque tick
        timeRemainingRef.current = prev;
        
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          console.log('⏱️ [TRIAL] Compteur local arrivé à 0');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial?.id, isExpired]);

  // 3. Démarrer un trial
  const startTrial = async (maxMinutes: number = 30): Promise<boolean> => {
    if (!userId || !targetId || !targetType) {
      setError('Missing user or target information');
      return false;
    }

    try {
      // Supprimer les anciens trials
            // Supprimer les anciens trials
      const { error: deleteError } = await supabase
        .from('trial_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .eq('target_type', targetType);

      if (deleteError) {
        console.error('❌ [TRIAL] Erreur suppression anciens trials:', deleteError);
      } else {
        console.log('✅ [TRIAL] Anciens trials supprimés');
      }

      const now = new Date();
      const expiredAt = new Date(now.getTime() + maxMinutes * 60000);

      console.log('✅ [TRIAL] Démarrage, expired_at:', expiredAt.toISOString());

      const { data, error: insertError } = await supabase
        .from('trial_sessions')
        .insert({
          user_id: userId,
          target_id: targetId,
          target_type: targetType,
          session_minutes_used: 0,
          max_session_minutes: maxMinutes,
          started_at: now.toISOString(),
          expired_at: expiredAt.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw insertError;

            setTrial(data);
      trialIdRef.current = data.id; // ✅ Initialiser le ref
      setIsExpired(false);
      setError(null);
      setTimeRemaining(maxMinutes * 60);

      console.log('✅ [TRIAL] Trial créé, timeRemaining:', maxMinutes * 60);
      return true;
     
    } catch (err: any) {
      setError(err.message || 'Failed to start trial');
      return false;
    }
  };

  
  // ✅ NO-OP : La pause n'est pas supportée (timer linéaire comme Netflix/Spotify)
  const pauseTimer = async (paused: boolean) => {
    // Ne fait rien : le timer continue de tourner
  };

  // ✅ Refetch
  const refetch = useCallback(async () => {
    if (!userId || !targetId || !targetType) return;

    try {
      const { data, error } = await supabase
        .from('trial_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        // ✅ Ne mettre à jour QUE si le trial a changé (nouveau trial créé)
        if (data.id !== trialIdRef.current) {
          console.log('🔄 [TRIAL] Nouveau trial détecté, mise à jour...');
          trialIdRef.current = data.id;
          setTrial(data);
          const remaining = calculateRemaining(data.expired_at);
          setTimeRemaining(remaining);
          setIsExpired(remaining <= 0);
        }
        // ✅ Sinon, ne rien faire (le compteur local continue)
      }
    } catch (err: any) {
      console.error('❌ [TRIAL] Erreur refetch:', err.message);
    }
  }, [userId, targetId, targetType]);

  return {
    trial,
    isLoading,
    timeRemaining,
    isExpired,
    startTrial,
    canRetry: false,
    timeBeforeRetry: null,
    error,
    pauseTimer,
    refetch,
  };
}