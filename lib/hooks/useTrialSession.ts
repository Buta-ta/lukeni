// lib/hooks/useTrialSession.ts

"use client";

import { useEffect, useState } from 'react';
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
  pauseTimer: (paused: boolean) => void; // ✅ NOUVEAU
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
  const [isPaused, setIsPaused] = useState(false); // ✅ NOUVEAU

  // Fonction pour calculer le temps restant AVEC BUFFER
  const calculateRemaining = (expiredAt: number): number => {
    const now = Date.now();
    // ✅ BUFFER DE 60 MINUTES (30 min décalage + 30 min marge)
    const TIME_OFFSET_MS = 60 * 60 * 1000;
    const remainingMs = expiredAt - now + TIME_OFFSET_MS;
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
          const expiredAt = new Date(data.expired_at).getTime();
          const remaining = calculateRemaining(expiredAt);
          
          console.log('⏰ [TRIAL] Initial remaining:', remaining, 'seconds');
          
          if (remaining <= 0) {
            setIsExpired(true);
            setTimeRemaining(0);
          } else {
            setIsExpired(false);
            setTimeRemaining(remaining);
          }
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

    return () => { isMounted = false; };
  }, [userId, targetId, targetType]);

  // 2. Mettre à jour le temps restant chaque seconde (SAUF SI PAUSE)
  useEffect(() => {
    if (!trial || isExpired || isPaused) return;

    const updateTimeRemaining = () => {
      const expiredAt = new Date(trial.expired_at).getTime();
      const remaining = calculateRemaining(expiredAt);
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [trial, isExpired, isPaused]);

  // 3. Démarrer un trial
  const startTrial = async (maxMinutes: number = 30): Promise<boolean> => {
    if (!userId || !targetId || !targetType) {
      setError('Missing user or target information');
      return false;
    }

    try {
      // ✅ SUPPRIMER LES ANCIENS TRIALS
      await supabase
        .from('trial_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .eq('target_type', targetType);

      const now = new Date();
      const expiredAt = new Date(now.getTime() + maxMinutes * 60000);

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
      setIsExpired(false);
      setIsPaused(false);
      setError(null);
      setTimeRemaining(maxMinutes * 60);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to start trial');
      return false;
    }
  };

  // ✅ NOUVEAU : Pause/Reprise du timer
  const pauseTimer = (paused: boolean) => {
    console.log('⏸️ [TRIAL] Timer paused:', paused);
    setIsPaused(paused);
  };

  return {
    trial,
    isLoading,
    timeRemaining,
    isExpired,
    startTrial,
    canRetry: false,
    timeBeforeRetry: null,
    error,
    pauseTimer, // ✅ NOUVEAU
  };
}