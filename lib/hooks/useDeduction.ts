// lib/hooks/useDeduction.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";

// ── TYPES ──────────────────────────────────────────────────
export interface Reward {
  id: string;
  type:
    | "scene"
    | "hotspot"
    | "enigma"
    | "evidence"
    | "clue"
    | "chapter"
    | "narrative_event"
    | "ending";
  target_id: string;
  notif_fr: string;
  notif_en: string;
}

export interface TimelineSlot {
  id: string;
  label_fr: string;
  label_en: string;
  hint_fr: string;
  hint_en: string;
  expected_evidence_id: string;
  rewards: Reward[];
  instruction_id?: string;
}

export interface Timeline {
  id: string;
  chapter_id: string;
  title_fr: string;
  title_en: string;
  slots: TimelineSlot[];
  instruction_id?: string;
}

export interface BoardNode {
  id: string;
  label_fr: string;
  label_en: string;
  type: "person" | "place" | "org" | "event" | "document";
  image_url?: string;
  filter_type: "none" | "sepia" | "grayscale";
  pos_x: number;
  pos_y: number;
}

export interface BoardConnection {
  id: string;
  node_a_id: string;
  node_b_id: string;
  expected_evidence_id: string;
  rewards: Reward[];
}

export interface DeductionBoard {
  id: string;
  chapter_id: string;
  title_fr: string;
  title_en: string;
  nodes: BoardNode[];
  connections: BoardConnection[];
  instruction_id?: string;
}

export interface DeductionNotification {
  id: string;
  message: string;
  type: "success" | "unlock" | "error";
}

// ── HOOK PRINCIPAL ─────────────────────────────────────────
export function useDeduction(
  chapterId: string | null,
  sessionId: string | null,
  collectedEvidences: string[],
  lang: "fr" | "en",
) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [board, setBoard] = useState<DeductionBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // IDs des déductions déjà validées (persistées en base)
  const [validatedDeductions, setValidatedDeductions] = useState<string[]>([]);

  // File de notifications à afficher au joueur
  const [notifications, setNotifications] = useState<DeductionNotification[]>([]);

  // Récompenses débloquées (pour que page.tsx puisse réagir)
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);

  // ── Charger timeline + board + déductions validées ──
  useEffect(() => {
    if (!chapterId || !sessionId) return;

    const load = async () => {
      setIsLoading(true);

      // Timeline
      const { data: tl } = await supabase
        .from("investigation_timelines")
        .select("*")
        .eq("chapter_id", chapterId)
        .maybeSingle();
      setTimeline(tl || null);

      // Board
      const { data: bd } = await supabase
        .from("investigation_deduction_boards")
        .select("*")
        .eq("chapter_id", chapterId)
        .maybeSingle();
      setBoard(bd || null);

      // Déductions déjà validées dans la session
      const { data: sess } = await supabase
        .from("investigation_sessions")
        .select("validated_deductions")
        .eq("id", sessionId)
        .single();
      if (sess?.validated_deductions) {
        setValidatedDeductions(sess.validated_deductions);
      }

      setIsLoading(false);
    };

    load();
  }, [chapterId, sessionId]);

  // ── Ajouter une notification ──
  const pushNotification = useCallback(
    (message: string, type: DeductionNotification["type"] = "success") => {
      const id = Math.random().toString(36).slice(2);
      setNotifications((prev) => [...prev, { id, message, type }]);
      // Auto-suppression après 4 secondes
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    [],
  );

  // ── Persister les déductions validées en base ──
  const persistValidated = useCallback(
    async (newValidated: string[]) => {
      if (!sessionId) return;
      await supabase
        .from("investigation_sessions")
        .update({ validated_deductions: newValidated })
        .eq("id", sessionId);
    },
    [sessionId],
  );

  // ── Déclencher les récompenses d'une déduction ──
  const triggerRewards = useCallback(
    (rewards: Reward[]) => {
      rewards.forEach((reward, idx) => {
        // Délai progressif pour ne pas tout afficher en même temps
        setTimeout(() => {
          // Notification au joueur
          const message =
            lang === "fr"
              ? reward.notif_fr || getDefaultNotif(reward.type, "fr")
              : reward.notif_en || getDefaultNotif(reward.type, "en");

          if (message) {
            pushNotification(message, "unlock");
          }

          // Ajouter à la file des récompenses pour que page.tsx réagisse
          setPendingRewards((prev) => [...prev, reward]);
        }, idx * 800);
      });
    },
    [lang, pushNotification],
  );

  // ── VALIDER UN SLOT DE TIMELINE ──
  const validateTimelineSlot = useCallback(
    async (slotId: string, droppedEvidenceId: string): Promise<boolean> => {
      if (!timeline) return false;

      // Déjà validé ?
      if (validatedDeductions.includes(`timeline_${slotId}`)) {
        pushNotification(
          lang === "fr"
            ? "✅ Déjà validé !"
            : "✅ Already validated!",
          "success",
        );
        return true;
      }

      const slot = timeline.slots.find((s) => s.id === slotId);
      if (!slot) return false;

      // La preuve déposée est-elle la bonne ?
      if (slot.expected_evidence_id !== droppedEvidenceId) {
        pushNotification(
          lang === "fr"
            ? "❌ Cette preuve ne correspond pas à cette date"
            : "❌ This evidence doesn't match this date",
          "error",
        );
        return false;
      }

      // ✅ CORRECT
      const deductionKey = `timeline_${slotId}`;
      const newValidated = [...validatedDeductions, deductionKey];
      setValidatedDeductions(newValidated);
      await persistValidated(newValidated);

      // Notification de succès
      pushNotification(
        lang === "fr"
          ? `✅ ${slot.label_fr} — Déduction validée !`
          : `✅ ${slot.label_en} — Deduction validated!`,
        "success",
      );

      // Déclencher les récompenses
      if (slot.rewards.length > 0) {
        triggerRewards(slot.rewards);
      }

      return true;
    },
    [timeline, validatedDeductions, lang, pushNotification, persistValidated, triggerRewards],
  );

  // ── VALIDER UNE CONNEXION DU BOARD ──
  const validateBoardConnection = useCallback(
    async (connectionId: string, droppedEvidenceId: string): Promise<boolean> => {
      if (!board) return false;

      // Déjà validée ?
      if (validatedDeductions.includes(`board_${connectionId}`)) {
        pushNotification(
          lang === "fr"
            ? "✅ Connexion déjà établie !"
            : "✅ Connection already established!",
          "success",
        );
        return true;
      }

      const connection = board.connections.find((c) => c.id === connectionId);
      if (!connection) return false;

      // La preuve est-elle la bonne ?
      if (connection.expected_evidence_id !== droppedEvidenceId) {
        pushNotification(
          lang === "fr"
            ? "❌ Cette preuve ne prouve pas ce lien"
            : "❌ This evidence doesn't prove this link",
          "error",
        );
        return false;
      }

      // ✅ CORRECT
      const deductionKey = `board_${connectionId}`;
      const newValidated = [...validatedDeductions, deductionKey];
      setValidatedDeductions(newValidated);
      await persistValidated(newValidated);

      // Trouver les nœuds pour le message
      const nodeA = board.nodes.find((n) => n.id === connection.node_a_id);
      const nodeB = board.nodes.find((n) => n.id === connection.node_b_id);
      const labelA = lang === "fr" ? nodeA?.label_fr : nodeA?.label_en;
      const labelB = lang === "fr" ? nodeB?.label_fr : nodeB?.label_en;

      pushNotification(
        lang === "fr"
          ? `🔗 Connexion établie : ${labelA} → ${labelB}`
          : `🔗 Connection established: ${labelA} → ${labelB}`,
        "success",
      );

      // Déclencher les récompenses
      if (connection.rewards.length > 0) {
        triggerRewards(connection.rewards);
      }

      return true;
    },
    [board, validatedDeductions, lang, pushNotification, persistValidated, triggerRewards],
  );

  // ── Consommer une récompense (après que page.tsx l'a traitée) ──
  const consumeReward = useCallback((rewardId: string) => {
    setPendingRewards((prev) => prev.filter((r) => r.id !== rewardId));
  }, []);

  // ── Supprimer une notification manuellement ──
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Preuves disponibles pour la déduction (seulement collectées) ──
  const availableEvidences = useCallback(
    (allEvidences: any[]) => {
      return allEvidences.filter((ev) =>
        collectedEvidences.includes(ev.id),
      );
    },
    [collectedEvidences],
  );

  // ── Vérifier si un slot/connexion est validé ──
  const isTimelineSlotValidated = useCallback(
    (slotId: string) => validatedDeductions.includes(`timeline_${slotId}`),
    [validatedDeductions],
  );

  const isBoardConnectionValidated = useCallback(
    (connectionId: string) =>
      validatedDeductions.includes(`board_${connectionId}`),
    [validatedDeductions],
  );


    // ── Réinitialiser les déductions (pour le replay) ──
  const resetDeductions = useCallback(() => {
    setValidatedDeductions([]);
    setNotifications([]);
    setPendingRewards([]);
  }, []);



  const refreshDeductions = useCallback(async () => {
    if (!sessionId) return;
    const { data: sess } = await supabase
      .from("investigation_sessions")
      .select("validated_deductions")
      .eq("id", sessionId)
      .single();
    if (sess?.validated_deductions) {
      setValidatedDeductions(sess.validated_deductions);
    }
  }, [sessionId]);

  return {
    // Données
    timeline,
    board,
    isLoading,
    validatedDeductions,
    notifications,
    pendingRewards,

    // Actions
    validateTimelineSlot,
    validateBoardConnection,
    consumeReward,
    dismissNotification,
    availableEvidences,
    resetDeductions,
    refreshDeductions,

    // Helpers
    isTimelineSlotValidated,
    isBoardConnectionValidated,
  };
}

// ── NOTIFICATIONS PAR DÉFAUT selon le type de récompense ──
function getDefaultNotif(
  type: Reward["type"],
  lang: "fr" | "en",
): string {
  const notifs: Record<Reward["type"], { fr: string; en: string }> = {
    scene: {
      fr: "🗺️ Un nouveau lieu est maintenant accessible !",
      en: "🗺️ A new location is now accessible!",
    },
    hotspot: {
      fr: "📍 Un nouvel indice est apparu dans la scène !",
      en: "📍 A new clue appeared in the scene!",
    },
    enigma: {
      fr: "🧩 Une nouvelle énigme vient d'être débloquée !",
      en: "🧩 A new enigma has been unlocked!",
    },
    evidence: {
      fr: "📄 Une nouvelle preuve a été déduite !",
      en: "📄 A new piece of evidence has been deduced!",
    },
    clue: {
      fr: "💡 Un indice vous a été révélé !",
      en: "💡 A clue has been revealed to you!",
    },
    chapter: {
      fr: "📖 Le chapitre suivant est maintenant disponible !",
      en: "📖 The next chapter is now available!",
    },
    narrative_event: {
      fr: "🎬 Un événement se déclenche...",
      en: "🎬 An event is triggered...",
    },
    ending: {
      fr: "🏁 Une conclusion se révèle...",
      en: "🏁 An ending reveals itself...",
    },
  };

  return notifs[type]?.[lang] || "";
}