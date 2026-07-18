"use client";

import { supabase } from "@/lib/supabase-browser";
import { useState, useCallback, useEffect } from "react";

export function useMiniGameSession(
  investigationSessionId: string | null,
  userId: string | null,
) {
  const [miniGameSessions, setMiniGameSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── CHARGER LES SESSIONS DE MINI-JEUX ──
  const loadMiniGameSessions = useCallback(async () => {
    if (!investigationSessionId || !userId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("investigation_mini_game_sessions")
      .select("*")
      .eq("investigation_session_id", investigationSessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMiniGameSessions(data);
    }
    setIsLoading(false);
  }, [investigationSessionId, userId]);

  // ── CHARGER AU MONTAGE ──
  useEffect(() => {
    loadMiniGameSessions();
  }, [loadMiniGameSessions]);

  // ── CRÉER/DÉMARRER UNE SESSION DE MINI-JEU ──
  const startMiniGame = useCallback(
    async (miniGameId: string) => {
      if (!investigationSessionId || !userId) return null;

      const { data, error } = await supabase
        .from("investigation_mini_game_sessions")
        .insert({
          investigation_session_id: investigationSessionId,
          mini_game_id: miniGameId,
          user_id: userId,
          status: "started",
          attempts_count: 0,
          best_score: 0,
          current_score: 0,
          time_spent_seconds: 0,
          cauris_earned: 0,
          cauris_lost: 0,
          revealed_clues: [],
          mini_game_state: {},
        })
        .select()
        .single();

      if (!error && data) {
        // Mettre à jour la session d'investigation
        await supabase
          .from("investigation_sessions")
          .update({ current_mini_game_id: miniGameId })
          .eq("id", investigationSessionId);

        setMiniGameSessions((prev) => [data, ...prev]);
        return data;
      }

      return null;
    },
    [investigationSessionId, userId],
  );

  // ── METTRE À JOUR LE STATUT ET LES DONNÉES ──
  const updateMiniGameSession = useCallback(
    async (
      sessionId: string,
      updates: {
        status?: string;
        attempts_count?: number;
        best_score?: number;
        current_score?: number;
        time_spent_seconds?: number;
        cauris_earned?: number;
        cauris_lost?: number;
        revealed_clues?: string[];
        mini_game_state?: any;
      },
    ) => {
      const { error } = await supabase
        .from("investigation_mini_game_sessions")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (!error) {
        setMiniGameSessions((prev) =>
          prev.map((mg) =>
            mg.id === sessionId ? { ...mg, ...updates } : mg,
          ),
        );
        return true;
      }

      return false;
    },
    [],
  );

  // ── COMPLÉTER UN MINI-JEU ──
  const completeMiniGame = useCallback(
    async (
      sessionId: string,
      finalScore: number,
      caurisEarned: number,
      caurisLost: number,
    ) => {
      // D'abord mettre à jour la session du mini-jeu
      const { error: updateError } = await supabase
        .from("investigation_mini_game_sessions")
        .update({
          status: "completed",
          best_score: finalScore,
          current_score: finalScore,
          cauris_earned: caurisEarned,
          cauris_lost: caurisLost,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) return false;

      // Mettre à jour la liste locale
      setMiniGameSessions((prev) =>
        prev.map((mg) =>
          mg.id === sessionId
            ? {
                ...mg,
                status: "completed",
                best_score: finalScore,
                current_score: finalScore,
                cauris_earned: caurisEarned,
                cauris_lost: caurisLost,
                completed_at: new Date().toISOString(),
              }
            : mg,
        ),
      );

      if (investigationSessionId) {
        // Ajouter le mini-jeu aux "complétés"
        const { data: session } = await supabase
          .from("investigation_sessions")
          .select("completed_mini_games")
          .eq("id", investigationSessionId)
          .single();

        if (session) {
          const completed = session.completed_mini_games || [];
          const miniGameId = miniGameSessions.find(
            (mg) => mg.id === sessionId,
          )?.mini_game_id;

          if (miniGameId && !completed.includes(miniGameId)) {
            await supabase
              .from("investigation_sessions")
              .update({
                completed_mini_games: [...completed, miniGameId],
                current_mini_game_id: null,
              })
              .eq("id", investigationSessionId);
          }
        }
      }

      return true;
    },
    [investigationSessionId, miniGameSessions],
  );

  // ── ÉCHOUER UN MINI-JEU ──
  const failMiniGame = useCallback(
    async (sessionId: string, caurisLost: number) => {
      return updateMiniGameSession(sessionId, {
        status: "failed",
        cauris_lost: caurisLost,
      });
    },
    [updateMiniGameSession],
  );

  // ── TIMEOUT ──
  const timeoutMiniGame = useCallback(
    async (sessionId: string) => {
      return updateMiniGameSession(sessionId, {
        status: "timeout",
      });
    },
    [updateMiniGameSession],
  );

  // ── RÉVÉLER UN INDICE ──
  const revealClue = useCallback(
    async (sessionId: string, clueId: string) => {
      const session = miniGameSessions.find((mg) => mg.id === sessionId);
      if (!session) return false;

      const revealed = session.revealed_clues || [];
      if (revealed.includes(clueId)) return true; // Déjà révélé

      return updateMiniGameSession(sessionId, {
        revealed_clues: [...revealed, clueId],
      });
    },
    [miniGameSessions, updateMiniGameSession],
  );

  // ── OBTENIR UN MINI-JEU PAR ID ──
  const getMiniGameById = useCallback(
    (miniGameId: string) => {
      return miniGameSessions.find((mg) => mg.mini_game_id === miniGameId);
    },
    [miniGameSessions],
  );

  return {
    miniGameSessions,
    isLoading,
    loadMiniGameSessions,
    startMiniGame,
    updateMiniGameSession,
    completeMiniGame,
    failMiniGame,
    timeoutMiniGame,
    revealClue,
    getMiniGameById,
  };
}