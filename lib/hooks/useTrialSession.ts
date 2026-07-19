// lib/hooks/useTrialSession.ts

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

export function useTrialSession(
  userId: string | null,
  targetId: string | null,
  targetType: 'investigation' | 'book' | null
) {
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Charger la session d'essai au montage
  useEffect(() => {
    if (!userId || !targetId || !targetType) {
      setIsLoading(false);
      return;
    }

    const fetchTrial = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('trial_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('target_id', targetId)
          .eq('target_type', targetType)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (fetchError) throw fetchError;

        setTrial(data);
        setError(null);
      } catch (err) {
        console.error('Trial fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrial();
  }, [userId, targetId, targetType]);

  // 2. Calculer et mettre à jour le temps restant CHAQUE SECONDE
  useEffect(() => {
    if (!trial || trial.status === 'expired') {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const expiredAt = new Date(trial.expired_at).getTime();
      const now = Date.now();
      const remainingMs = expiredAt - now;
      const remaining = Math.max(0, Math.floor(remainingMs / 1000)); // En secondes

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setTrial((prev) =>
          prev ? { ...prev, status: 'expired' } : null
        );
      }
    };

    // Mise à jour immédiate
    updateTimeRemaining();

    // Mise à jour chaque seconde (1000ms)
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [trial]);

  // 3. Créer une nouvelle session d'essai
  const startTrial = async (maxMinutes: number = 30) => {
    if (!userId || !targetId || !targetType) {
      setError('Missing user or target information');
      return false;
    }

    try {
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
      setError(null);
      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start trial';
      setError(errorMsg);
      console.error('Trial start error:', err);
      return false;
    }
  };

  // 4. Vérifier si peut réessayer
  const canRetry = (): boolean => {
    if (!trial || trial.status !== 'expired') return false;
    if (!trial.can_retry_at) return true;

    const retryAt = new Date(trial.can_retry_at).getTime();
    return Date.now() >= retryAt;
  };

  // 5. Temps avant prochain essai (en minutes)
  const timeBeforeRetry = (): number | null => {
    if (!trial || trial.status !== 'expired' || !trial.can_retry_at) return null;

    const retryAt = new Date(trial.can_retry_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((retryAt - now) / 1000 / 60));

    return remaining > 0 ? remaining : null;
  };

  return {
    trial,
    isLoading,
    timeRemaining, // En secondes maintenant (plus granulaire)
    startTrial,
    canRetry: canRetry(),
    timeBeforeRetry: timeBeforeRetry(),
    error,
  };
}