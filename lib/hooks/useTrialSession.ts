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

  // Charger la session d'essai
  useEffect(() => {
    if (!userId || !targetId || !targetType) {
      setIsLoading(false);
      return;
    }

    const fetchTrial = async () => {
      try {
        const { data } = await supabase
          .from('trial_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('target_id', targetId)
          .eq('target_type', targetType)
          .maybeSingle();

        setTrial(data);
      } catch (err) {
        console.error('Trial fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrial();
  }, [userId, targetId, targetType]);

  // Calculer le temps restant
  useEffect(() => {
    if (!trial || trial.status === 'expired') {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const expiredAt = new Date(trial.expired_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiredAt - now) / 1000 / 60));

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setTrial((prev) =>
          prev ? { ...prev, status: 'expired' } : null
        );
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update toutes les minutes

    return () => clearInterval(interval);
  }, [trial]);

  // Créer une nouvelle session d'essai
  const startTrial = async (maxMinutes: number = 30) => {
    console.log('📍 startTrial appelé avec:', { userId, targetId, targetType, maxMinutes });

    if (!userId || !targetId || !targetType) {
      console.log('❌ Paramètres manquants:', { userId, targetId, targetType });
      return false;
    }

    try {
      const now = new Date();
      const expiredAt = new Date(now.getTime() + maxMinutes * 60000);

      console.log('📤 Envoi de l\'insert trial_sessions...');

      const { data, error } = await supabase
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

      console.log('📥 Réponse reçue:', { data, error });

      if (error) {
        console.error('❌ Erreur insert:', error.message);
        return false;
      }

      console.log('✅ Trial créée avec succès:', data.id);
      setTrial(data);
      return true;
    } catch (err: any) {
      console.error('💥 Exception catch:', err);
      return false;
    }
  };

  // Vérifier si peut réessayer
  const canRetry = (): boolean => {
    if (!trial || trial.status !== 'expired') return false;
    if (!trial.can_retry_at) return true;

    const retryAt = new Date(trial.can_retry_at).getTime();
    return Date.now() >= retryAt;
  };

  // Temps avant prochain essai
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
    timeRemaining,
    startTrial,
    canRetry: canRetry(),
    timeBeforeRetry: timeBeforeRetry(),
  };
}