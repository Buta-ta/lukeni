"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Difficulty = 'easy' | 'medium' | 'expert';

export interface AwaleStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
  avgDuration: number;
  byDifficulty: Record<Difficulty, { games: number; wins: number }>;
}

const EMPTY_STATS: AwaleStats = {
  totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0,
  bestStreak: 0, currentStreak: 0, avgDuration: 0,
  byDifficulty: {
    easy: { games: 0, wins: 0 },
    medium: { games: 0, wins: 0 },
    expert: { games: 0, wins: 0 },
  },
};

const LS_STATS_KEY = 'awale_local_stats';
const LS_STREAK_KEY = 'awale_streak';

export function useAwaleStats() {
  const [stats, setStats] = useState<AwaleStats>(EMPTY_STATS);
  const [globalStats, setGlobalStats] = useState<{ totalGames: number; playerWinRate: number } | null>(null);

  // Charger stats locales depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_STATS_KEY);
      if (raw) setStats(JSON.parse(raw));
    } catch {}
  }, []);

  // Charger stats globales depuis Supabase (anonymes)
  useEffect(() => {
    supabase
      .from('awale_player_stats')
      .select('result')
      .then(({ data }) => {
        if (!data) return;
        const total = data.length;
        const wins = data.filter((r) => r.result === 'win').length;
        setGlobalStats({
          totalGames: total,
          playerWinRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        });
      });
  }, []);

  const recordGame = useCallback(
    async (params: {
      result: 'win' | 'lose' | 'draw';
      playerScore: number;
      aiScore: number;
      movesCount: number;
      durationSeconds: number;
      difficulty: Difficulty;
    }) => {
      // Update localStorage
      setStats((prev) => {
        const next = { ...prev };
        next.totalGames++;
        if (params.result === 'win') {
          next.wins++;
          next.currentStreak++;
          if (next.currentStreak > next.bestStreak) next.bestStreak = next.currentStreak;
        } else if (params.result === 'lose') {
          next.losses++;
          next.currentStreak = 0;
        } else {
          next.draws++;
        }
        next.winRate = next.totalGames > 0
          ? Math.round((next.wins / next.totalGames) * 100)
          : 0;
        next.avgDuration = Math.round(
          (next.avgDuration * (next.totalGames - 1) + params.durationSeconds) / next.totalGames
        );
        const diff = params.difficulty;
        next.byDifficulty[diff].games++;
        if (params.result === 'win') next.byDifficulty[diff].wins++;

        try { localStorage.setItem(LS_STATS_KEY, JSON.stringify(next)); } catch {}
        return next;
      });

      // Envoyer à Supabase (sans user_id si anonyme)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('awale_player_stats').insert({
          user_id: session?.user?.id || null,
          difficulty: params.difficulty,
          result: params.result,
          player_score: params.playerScore,
          ai_score: params.aiScore,
          moves_count: params.movesCount,
          duration_seconds: params.durationSeconds,
        });
      } catch {}
    },
    []
  );

  const resetStats = useCallback(() => {
    setStats(EMPTY_STATS);
    try { localStorage.removeItem(LS_STATS_KEY); } catch {}
  }, []);

  return { stats, globalStats, recordGame, resetStats };
}