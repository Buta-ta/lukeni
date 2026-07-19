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

export function useTrialSession(
  userId: string | null,
  targetId: string | null,
  targetType: 'investigation' | 'book' | null
) {
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Charger la session d'essai au montage
  useEffect(() => {
    // ✅ VÉRIFICATION STRICTE : ne pas faire de requête si les paramètres manquent
    if (!userId || !targetId || !targetType) {
      setIsLoading(false);
      setTrial(null);
      return;
    }

    let isMounted = true;

    const fetchTrial = async () => {
      try {
        // ✅ Vérifier que supabase est accessible
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

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

        if (fetchError) {
          console.error('Trial fetch error:', fetchError);
          throw fetchError;
        }

        if (data) {
          setTrial(data);
          // Vérifier immédiatement si expiré
          const expiredAt = new Date(data.expired_at).getTime();
          if (Date.now() > expiredAt) {
            setIsExpired(true);
          }
        } else {
          setTrial(null);
        }
        setError(null);
      } catch (err: any) {
        if (isMounted) {
          console.error('Trial hook error:', err);
          setError(err.message || 'Unknown error');
          setTrial(null);
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

  // 2. Calculer et mettre à jour le temps restant CHAQUE SECONDE
  useEffect(() => {
    if (!trial || trial.status === 'expired' || isExpired) {
      setTimeRemaining(null);
      return;
    }

    let isComponentMounted = true;

    const updateTimeRemaining = () => {
      if (!isComponentMounted) return;

      const expiredAt = new Date(trial.expired_at).getTime();
      const now = Date.now();
      const remainingMs = expiredAt - now;
      const remaining = Math.max(0, Math.floor(remainingMs / 1000));

      setTimeRemaining(remaining);

      if (remaining <= 0 && isComponentMounted) {
        setIsExpired(true);
        setTrial((prev) =>
          prev ? { ...prev, status: 'expired' } : null
        );
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => {
      isComponentMounted = false;
      clearInterval(interval);
    };
  }, [trial, isExpired]);

  // 3. Créer une nouvelle session d'essai
  const startTrial = async (maxMinutes: number = 30): Promise<boolean> => {
    if (!userId || !targetId || !targetType) {
      setError('Missing user or target information');
      return false;
    }

    if (!supabase) {
      setError('Supabase client not initialized');
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

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      if (data) {
        setTrial(data);
        setIsExpired(false);
        setError(null);
        return true;
      }
      return false;
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

  // 5. Temps avant prochain essai
  const timeBeforeRetry = (): number | null => {
    if (!trial || trial.status !== 'expired' || !trial.can_retry_at)
      return null;
    const retryAt = new Date(trial.can_retry_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((retryAt - now) / 1000 / 60));
    return remaining > 0 ? remaining : null;
  };

  return {
    trial,
    isLoading,
    timeRemaining,
    isExpired,
    startTrial,
    canRetry: canRetry(),
    timeBeforeRetry: timeBeforeRetry(),
    error,
  };
}