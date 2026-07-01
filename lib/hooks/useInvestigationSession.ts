import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface InvestigationSession {
  id: string;
  investigation_id: string;
  user_id: string;
  character_id: string | null;
  current_chapter_id: string | null;
  current_scene_id: string | null;
  solved_enigmas: string[];
  collected_evidences: string[];
  group_id: string | null;
  group_code: string | null;
  is_group_creator: boolean;
  status: 'active' | 'completed' | 'abandoned';
  completed_at: string | null;
  last_played_at: string;
  created_at: string;
  current_cauris?: number;
  enigma_attempts?: Record<string, number>;
  revealed_clues?: string[];
  current_timer_seconds?: number | null;
  completed_word_searches?: string[];
  word_search_progress?: Record<string, string[]>;
  revealed_hotspot_ids?: string[];
}

// ── Générateur de code de groupe ──
const generateGroupCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `LUKENI-${code}`;
};

// ✅ FIX : Nettoyer les données non sérialisables
const serializeSession = (data: any): InvestigationSession | null => {
  if (!data) return null;

  return {
    id: data.id ?? '',
    investigation_id: data.investigation_id ?? '',
    user_id: data.user_id ?? '',
    character_id: data.character_id ?? null,
    current_chapter_id: data.current_chapter_id ?? null,
    current_scene_id: data.current_scene_id ?? null,
    solved_enigmas: Array.isArray(data.solved_enigmas) ? data.solved_enigmas : [],
    collected_evidences: Array.isArray(data.collected_evidences) ? data.collected_evidences : [],
    group_id: data.group_id ?? null,
    group_code: data.group_code ?? null,
    is_group_creator: data.is_group_creator ?? false,
    status: (data.status as 'active' | 'completed' | 'abandoned') ?? 'active',
    completed_at: data.completed_at ?? null,
    last_played_at: data.last_played_at ?? new Date().toISOString(),
    created_at: data.created_at ?? new Date().toISOString(),
    current_cauris: typeof data.current_cauris === 'number' ? data.current_cauris : undefined,
    enigma_attempts: typeof data.enigma_attempts === 'object' ? data.enigma_attempts : undefined,
    revealed_clues: Array.isArray(data.revealed_clues) ? data.revealed_clues : undefined,
    current_timer_seconds: typeof data.current_timer_seconds === 'number' || data.current_timer_seconds === null ? data.current_timer_seconds : null,
    completed_word_searches: Array.isArray(data.completed_word_searches) ? data.completed_word_searches : [],
    revealed_hotspot_ids: Array.isArray(data.revealed_hotspot_ids) ? data.revealed_hotspot_ids : [],
    word_search_progress: (data.word_search_progress && typeof data.word_search_progress === "object") ? data.word_search_progress : {},
  };
};

export function useInvestigationSession(
  investigationId: string,
  user: User | null
) {
  const [session, setSession] = useState<InvestigationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Charger ou créer la session
  useEffect(() => {
    if (
      !investigationId ||
      investigationId === '[id]' ||
      !user
    ) {
      setIsLoading(false);
      return;
    }

    const loadOrCreateSession = async () => {
      try {
        const { data: existing, error: err } = await supabase
          .from('investigation_sessions')
          .select('*')
          .eq('investigation_id', investigationId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (err) throw err;

        if (existing) {
          setSession(serializeSession(existing));
          setError(null);
        } else {
          const { data: newSession, error: createErr } = await supabase
            .from('investigation_sessions')
            .insert({
              investigation_id: investigationId,
              user_id: user.id,
              character_id: null,
              current_chapter_id: null,
              current_scene_id: null,
              solved_enigmas: [],
              collected_evidences: [],
              group_id: null,
              group_code: null,
              is_group_creator: false,
              status: 'active',
              current_cauris: 50,
              enigma_attempts: {},
              revealed_clues: [],
              completed_word_searches: [],
              word_search_progress: {},
              revealed_hotspot_ids: [],

            })
            .select()
            .single();

          if (createErr) throw createErr;
          setSession(serializeSession(newSession));
          setError(null);
        }
      } catch (err: any) {
        console.error('Load/create session error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrCreateSession();
  }, [investigationId, user?.id]);

  // ✅ Sauvegarder la progression
  const updateProgress = useCallback(
    async (chapterId: string, sceneId: string | null) => {
      if (!session) return;

      setIsSaving(true);
      try {
        const { error: err } = await supabase
          .from('investigation_sessions')
          .update({
            current_chapter_id: chapterId,
            current_scene_id: sceneId,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (err) throw err;

        setSession((prev) =>
          prev
            ? serializeSession({
              ...prev,
              current_chapter_id: chapterId,
              current_scene_id: sceneId,
              last_played_at: new Date().toISOString(),
            })
            : null
        );
      } catch (err: any) {
        console.error('Update progress error:', err);
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [session]
  );

  // ✅ Marquer une énigme comme résolue
  const solveEnigma = useCallback(
    async (enigmaId: string) => {
      if (!session) return;

      const newSolved = [
        ...new Set([
          ...session.solved_enigmas,
          `enigma_${enigmaId}_solved`,
        ]),
      ];

      setIsSaving(true);
      try {
        const { error: err } = await supabase
          .from('investigation_sessions')
          .update({
            solved_enigmas: newSolved,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (err) throw err;

        setSession((prev) =>
          prev
            ? serializeSession({
              ...prev,
              solved_enigmas: newSolved,
              last_played_at: new Date().toISOString(),
            })
            : null
        );
      } catch (err: any) {
        console.error('Solve enigma error:', err);
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [session]
  );

  // ✅ Collecter une preuve
  // ✅ Après avoir collecté une preuve, ajouter au tableau "recentlyAdded"
  const collectEvidence = useCallback(
    async (evidenceId: string) => {
      if (!session) return;

      const newCollected = [
        ...new Set([...session.collected_evidences, evidenceId]),
      ];

      setIsSaving(true);
      try {
        const { error: err } = await supabase
          .from('investigation_sessions')
          .update({
            collected_evidences: newCollected,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (err) throw err;

        setSession((prev) =>
          prev
            ? serializeSession({
              ...prev,
              collected_evidences: newCollected,
              last_played_at: new Date().toISOString(),
            })
            : null
        );

        

      } catch (err: any) {
        console.error('Collect evidence error:', err);
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [session]
  );

  // ✅ Sauvegarder le personnage choisi
  const setCharacter = useCallback(
    async (characterId: string) => {
      if (!session) return;

      setIsSaving(true);
      try {
        const { error: err } = await supabase
          .from('investigation_sessions')
          .update({
            character_id: characterId,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (err) throw err;

        setSession((prev) =>
          prev
            ? serializeSession({
              ...prev,
              character_id: characterId,
              last_played_at: new Date().toISOString(),
            })
            : null
        );
      } catch (err: any) {
        console.error('Set character error:', err);
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [session]
  );

  // ✅ Créer un groupe multijoueur
  // ✅ Créer un groupe multijoueur (CORRIGÉ)
  const createGroup = useCallback(async (): Promise<{
    group_code: string;
    group_id: string;
  } | null> => {
    if (!session) return null;

    setIsSaving(true);
    try {
      const newGroupCode = generateGroupCode();
      const newGroupId = crypto.randomUUID();

      // 1️⃣ ON CRÉE LE GROUPE DANS LA BASE DE DONNÉES (La ligne qui manquait !)
      const { error: groupErr } = await supabase
        .from('investigation_groups')
        .insert({
          id: newGroupId,
          investigation_id: session.investigation_id,
          created_by: session.user_id,
          invite_code: newGroupCode,
          status: 'playing', // ou 'waiting' selon ta logique
        });

      if (groupErr) {
        console.error('Erreur lors de la création du groupe dans Supabase:', groupErr);
        throw groupErr;
      }

      // 2️⃣ ENSUITE SEULEMENT, ON MET À JOUR LA SESSION DU JOUEUR
      const { error: err } = await supabase
        .from('investigation_sessions')
        .update({
          group_code: newGroupCode,
          group_id: newGroupId,
          is_group_creator: true,
          last_played_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (err) throw err;

      // 3️⃣ ON MET À JOUR L'AFFICHAGE LOCAL
      setSession((prev) =>
        prev
          ? serializeSession({
            ...prev,
            group_code: newGroupCode,
            group_id: newGroupId,
            is_group_creator: true,
          })
          : null
      );

      return { group_code: newGroupCode, group_id: newGroupId };
    } catch (err: any) {
      console.error('Create group error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  // ✅ Désactiver le multijoueur
  const disableGroup = useCallback(async () => {
    if (!session) return;

    setIsSaving(true);
    try {
      const { error: err } = await supabase
        .from('investigation_sessions')
        .update({
          group_id: null,
          group_code: null,
          is_group_creator: false,
          last_played_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (err) throw err;

      setSession((prev) =>
        prev
          ? serializeSession({
            ...prev,
            group_id: null,
            group_code: null,
            is_group_creator: false,
          })
          : null
      );
    } catch (err: any) {
      console.error('Disable group error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  // ✅ Rejoindre un groupe via code
  // ✅ Rejoindre un groupe via code (CORRIGÉ)
  const joinGroupByCode = useCallback(
    async (
      code: string
    ): Promise<{ success: boolean; creatorName?: string; error?: string }> => {
      if (!session) return { success: false, error: 'No session' };

      setIsSaving(true);
      try {
        const cleanCode = code.toUpperCase().trim();

        // 1️⃣ On cherche le groupe directement dans la table des groupes !
        const { data: groupData, error: searchErr } = await supabase
          .from('investigation_groups')
          .select('id, created_by')
          .eq('invite_code', cleanCode)
          .eq('investigation_id', investigationId)
          .maybeSingle();

        if (searchErr) throw searchErr;

        if (!groupData || !groupData.id) {
          return { success: false, error: 'invalid_code' };
        }

        // 2️⃣ (Optionnel) On récupère le nom du créateur
        let creatorName = undefined;
        if (groupData.created_by) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', groupData.created_by)
            .maybeSingle();
          if (profileData) creatorName = profileData.full_name;
        }

        // 3️⃣ On met à jour la session du joueur pour l'ajouter au groupe
        const { error: updateErr } = await supabase
          .from('investigation_sessions')
          .update({
            group_id: groupData.id,
            group_code: cleanCode, // On sauvegarde aussi le code chez le joueur
            is_group_creator: false,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (updateErr) throw updateErr;

        setSession((prev) =>
          prev
            ? serializeSession({
              ...prev,
              group_id: groupData.id,
              group_code: cleanCode,
              is_group_creator: false,
            })
            : null
        );

        return { success: true, creatorName };
      } catch (err: any) {
        console.error('Join group error:', err);
        return { success: false, error: err.message };
      } finally {
        setIsSaving(false);
      }
    },
    [session, investigationId]
  );

  // ✅ Supprimer la session
  const deleteSession = useCallback(async (): Promise<boolean> => {
    if (!session) return false;

    setIsSaving(true);
    try {
      const { error: err } = await supabase
        .from('investigation_sessions')
        .delete()
        .eq('id', session.id);

      if (err) throw err;

      setSession(null);
      return true;
    } catch (err: any) {
      console.error('Delete session error:', err);
      setError(err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  // ✅ Marquer comme complétée
  const completeInvestigation = useCallback(async () => {
    if (!session) return;

    setIsSaving(true);
    try {
      const { error: err } = await supabase
        .from('investigation_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_played_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (err) throw err;

      setSession((prev) =>
        prev
          ? serializeSession({
            ...prev,
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_played_at: new Date().toISOString(),
          })
          : null
      );
    } catch (err: any) {
      console.error('Complete investigation error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  // ✅ Abandonner
  const abandonInvestigation = useCallback(async () => {
    if (!session) return;

    setIsSaving(true);
    try {
      const { error: err } = await supabase
        .from('investigation_sessions')
        .update({
          status: 'abandoned',
          last_played_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (err) throw err;

      setSession((prev) =>
        prev
          ? serializeSession({
            ...prev,
            status: 'abandoned',
            last_played_at: new Date().toISOString(),
          })
          : null
      );
    } catch (err: any) {
      console.error('Abandon investigation error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [session]);



  // ✅ NOUVEAU : Reset complet de la session (Supabase + State local)
  const resetSession = useCallback(async (startBudget: number) => {
    if (!session) return;

    setIsSaving(true);
    try {
      const resetPayload = {
        current_cauris: startBudget,
        enigma_attempts: {},
        revealed_clues: [],
        solved_enigmas: [],          // ✅ C'est ici que les conditions des hotspots se réinitialisent
        collected_evidences: [],
        current_chapter_id: null,
        current_scene_id: null,
        character_id: null,
        validated_deductions: [],
        current_timer_seconds: null,
        status: 'active',
        completed_at: null,
        completed_word_searches: [],
        word_search_progress: {},
        revealed_hotspot_ids: [],
      };

      const { error: err } = await supabase
        .from('investigation_sessions')
        .update(resetPayload)
        .eq('id', session.id);

      if (err) throw err;

      // ✅ MISE À JOUR LOCALE IMMÉDIATE (sans attendre le realtime)
      setSession(prev => prev ? serializeSession({ ...prev, ...resetPayload }) : null);

    } catch (err: any) {
      console.error('Reset session error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [session]);




  // ✅ Sauvegarder la progression des mots mêlés
  const saveWordSearchProgress = useCallback(
    async (progress: Record<string, string[]>) => {
      if (!session) return;

      try {
        const { error: err } = await supabase
          .from('investigation_sessions')
          .update({
            word_search_progress: progress,
            last_played_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (err) throw err;

        setSession(prev =>
          prev
            ? serializeSession({ ...prev, word_search_progress: progress })
            : null
        );
      } catch (err: any) {
        console.error('Save word search progress error:', err);
      }
    },
    [session]
  );


  // ✅ NOUVEAU : Forcer le refresh de la session depuis la BDD
  const refreshSession = useCallback(async () => {
    if (!session) return;

    try {
      const { data: freshData, error } = await supabase
        .from('investigation_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (error) throw error;

      console.log("🔄 Session rechargée depuis BDD:", freshData?.completed_word_searches);
      setSession(serializeSession(freshData));
    } catch (err: any) {
      console.error('Refresh session error:', err);
    }
  }, [session?.id]);



  // ✅ NOUVEAU : Forcer une mise à jour complète depuis la BDD
  const forceRefreshSession = useCallback(async () => {
    if (!session) return;

    try {
      const { data: freshData, error } = await supabase
        .from('investigation_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (error) {
        console.error('❌ Erreur forceRefreshSession:', error);
        return;
      }

      console.log("🔄 FORÇAGE : Session mise à jour dans React:", freshData?.completed_word_searches);
      setSession(serializeSession(freshData));
    } catch (err: any) {
      console.error('Force refresh error:', err);
    }
  }, [session?.id]);





  // ✅ Realtime sync
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'investigation_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(serializeSession(payload.new));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.id]);

  return {
    session,
    isLoading,
    isSaving,
    error,
    updateProgress,
    solveEnigma,
    collectEvidence,
    setCharacter,
    createGroup,
    disableGroup,
    joinGroupByCode,
    deleteSession,
    completeInvestigation,
    abandonInvestigation,
    resetSession,
    saveWordSearchProgress,
    refreshSession,
    forceRefreshSession,
  };
}