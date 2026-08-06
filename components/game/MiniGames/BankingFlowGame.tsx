"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  X,
  Send,
  Share2,
  Clock,
  DollarSign,
  Lightbulb,
  RotateCcw,
} from "lucide-react";


import { supabase } from "@/lib/supabase-browser";

const markMiniGameComplete = async (miniGameId: string, sessionId: string) => {
  if (!sessionId) return;
  const conditionKey = `minigame_${miniGameId}_completed`;
  try {
    const { data: session } = await supabase.from('investigation_sessions').select('completed_mini_games').eq('id', sessionId).single();
    const completed = session?.completed_mini_games || [];
    if (!completed.includes(conditionKey)) {
      await supabase.from('investigation_sessions').update({ completed_mini_games: [...completed, conditionKey] }).eq('id', sessionId);
    }
  } catch (err) { console.error('❌ Erreur sauvegarde mini-game complété:', err); }
};

interface Props {
  miniGame: any;
  miniGameSessionId?: string;
  initialState?: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
  onStateChange?: (state: any) => void;
  onProgressUpdate?: (budgetCauris: number, caurisLost: number) => void;
  sessionId?: string;
  userId?: string;
}

interface Entity {
  id: string;
  type: string;
  name_fr: string;
  name_en: string;
  x_percent: number;
  y_percent: number;
  avatar_url?: string;
}

interface Connection {
  id: string;
  from_id: string;
  to_id: string;
  is_correct: boolean;
  amount_fr: string;
  amount_en: string;
}

export default function BankingFlowGame({
  miniGame,
  miniGameSessionId,
  initialState,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
  onStateChange,
  onProgressUpdate,
  sessionId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickRef = useRef<{ entityId: string; time: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [allConnections, setAllConnections] = useState<Connection[]>([]);
  const [drawnConnections, setDrawnConnections] = useState<string[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [timeLeft, setTimeLeft] = useState(miniGame.timer_seconds || 120);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [particles, setParticles] = useState<
    { id: string; fromX: number; fromY: number; toX: number; toY: number; progress: number }[]
  >([]);

  const config = miniGame.config || {};
  const clues = miniGame.mini_game_clues || [];
  const penaltyPerError = miniGame.penalty_per_error || 0;
  const rewardCauris = miniGame.reward_cauris || 0;

  // ── SYNC BUDGET ──
  useEffect(() => {
    setLocalBudget(budgetCauris);
  }, [budgetCauris]);

  // ── CHARGER LES DONNÉES ──
  useEffect(() => {
    setEntities(config.entities || []);
    setAllConnections(config.all_connections || []);

    if (initialState) {
      if (initialState.drawnConnections)
        setDrawnConnections(initialState.drawnConnections);
      if (initialState.revealedClues)
        setRevealedClues(initialState.revealedClues);
      if (initialState.isVictory) setIsVictory(initialState.isVictory);
    }

    setIsLoading(false);
  }, [config, initialState]);

  // ── SAUVEGARDE AUTO ──
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (onStateChange) {
        onStateChange({
          drawnConnections,
          revealedClues,
          isVictory,
        });
      }
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [drawnConnections, revealedClues, isVictory, onStateChange]);

  // ── TIMER ──
  useEffect(() => {
    if (!miniGame.timer_seconds || miniGame.timer_seconds <= 0) return;
    if (isVictory) return;

    if (timeLeft <= 0) {
      setFeedback(lang === "fr" ? "⏱️ Temps écoulé !" : "⏱️ Time's up!");
      if (penaltyPerError > 0) {
        setTimeout(() => onFail(penaltyPerError), 1500);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, miniGame.timer_seconds, onFail, lang, isVictory, penaltyPerError]);

  // ── ANIMATION DES PARTICULES ──
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + 0.02 }))
          .filter((p) => p.progress <= 1)
      );
    }, 50);
    return () => clearInterval(interval);
  }, [particles]);

  // ── EFFACER TOUS LES LIENS D'UNE ENTITÉ (double-clic) ──
  const clearEntityConnections = (entityId: string) => {
    setDrawnConnections((prev) =>
      prev.filter(
        (connId) =>
          !connId.startsWith(`${entityId}-`) && !connId.endsWith(`-${entityId}`)
      )
    );
  };

  // ── CLIC SUR UNE ENTITÉ ──
  const handleEntityClick = (entityId: string) => {
    if (isVictory || isSubmitting) return;

    const now = Date.now();

    // ✅ DOUBLE-CLIC : effacer tous les liens de cette entité
    if (
      lastClickRef.current &&
      lastClickRef.current.entityId === entityId &&
      now - lastClickRef.current.time < 400
    ) {
      clearEntityConnections(entityId);
      setSelectedFrom(null);
      setFeedback(lang === "fr" ? "🗑️ Liens effacés" : "🗑️ Links cleared");
      setTimeout(() => setFeedback(null), 1500);
      lastClickRef.current = null;
      return;
    }

    lastClickRef.current = { entityId, time: now };

    if (!selectedFrom) {
      setSelectedFrom(entityId);
      return;
    }

    if (selectedFrom === entityId) {
      setSelectedFrom(null);
      return;
    }

    const connectionId = `${selectedFrom}-${entityId}`;
    const reverseConnectionId = `${entityId}-${selectedFrom}`;

    // Vérifier si ce lien existe déjà
    if (
      drawnConnections.includes(connectionId) ||
      drawnConnections.includes(reverseConnectionId)
    ) {
      setSelectedFrom(null);
      return;
    }

    // Ajouter le lien (BLANC, pas encore validé)
    setDrawnConnections((prev) => [...prev, connectionId]);
    setSelectedFrom(null);

    

    // ✅ Ajouter des particules jaunes avec coordonnées 0-100
    const fromEntity = entities.find((e) => e.id === selectedFrom);
    const toEntity = entities.find((e) => e.id === entityId);
    if (fromEntity && toEntity) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          setParticles((prev) => [
            ...prev,
            {
              id: `p_${Date.now()}_${i}`,
              fromX: fromEntity.x_percent,
              fromY: fromEntity.y_percent,
              toX: toEntity.x_percent,
              toY: toEntity.y_percent,
              progress: 0,
            },
          ]);
        }, i * 200);
      }
    }
  };

  // ── RÉVÉLER UN INDICE ──
  const handleRevealClue = (clueId: string, cost: number) => {
    if (localBudget < cost) {
      setFeedback(
        lang === "fr" ? "❌ Fonds insuffisants !" : "❌ Not enough funds!"
      );
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const newBudget = localBudget - cost;
    setLocalBudget(newBudget);
    setRevealedClues((prev) => [...prev, clueId]);
    if (onProgressUpdate) onProgressUpdate(newBudget, cost);
  };

  // ── VALIDATION DU RÉSEAU (Scénario B) ──
const handleSubmit = async () => {
  if (drawnConnections.length === 0 || isSubmitting || isVictory) return;

  setIsSubmitting(true);

  const correctConnections = allConnections.filter((c) => c.is_correct);

  const allCorrectFound = correctConnections.every((c) =>
    drawnConnections.some((connId) => connId === `${c.from_id}-${c.to_id}`)
  );

  const allDrawnAreCorrect = drawnConnections.every((connId) => {
    const [fromId, toId] = connId.split("-");
    return allConnections.some(
      (c) => c.from_id === fromId && c.to_id === toId && c.is_correct
    );
  });

  setTimeout(() => {
    if (allCorrectFound && allDrawnAreCorrect) {
      setIsVictory(true);
      setFeedback(
        lang === "fr" ? "✅ Réseau Démasqué !" : "✅ Network Exposed!"
      );

      markMiniGameComplete(miniGame.id, sessionId); // ✅ AJOUTER

      // ✅ NE PAS modifier le budget ici !
      // Laisser onComplete le faire dans page.tsx
      setTimeout(() => onComplete(100, rewardCauris), 2000);
    } else {
      let reason = "";
      if (!allDrawnAreCorrect) {
        reason =
          lang === "fr"
            ? "❌ Lien incorrect détecté"
            : "❌ Incorrect link detected";
      } else {
        reason =
          lang === "fr"
            ? "❌ Réseau incomplet"
            : "❌ Incomplete network";
      }

      setFeedback(reason);

      // ✅ NE PAS modifier le budget ici !
      // Laisser onFail le faire dans page.tsx
      if (penaltyPerError > 0) {
        onFail(penaltyPerError);
      }
    }

    setIsSubmitting(false);
  }, 800);
};

  // ── RESET ──
  const handleReset = () => {
    if (isVictory || isSubmitting) return;
    setDrawnConnections([]);
    setSelectedFrom(null);
    setFeedback(null);
    setParticles([]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec Timer et Budget */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Share2 size={18} className="text-[#D4AF37]" />
          <h3 className="text-gray-300 font-mono text-sm tracking-widest uppercase">
            {lang === "fr" ? "Traçage du Réseau" : "Network Tracing"}
          </h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {miniGame.timer_seconds > 0 && (
            <motion.div
              animate={{ scale: timeLeft <= 10 ? [1, 1.1, 1] : 1 }}
              transition={{
                repeat: timeLeft <= 10 ? Infinity : 0,
                duration: 0.5,
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border ${
                timeLeft <= 10
                  ? "bg-red-500/20 border-red-500/50 text-red-400"
                  : timeLeft <= 30
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : "bg-green-500/20 border-green-500/30 text-green-400"
              }`}
            >
              <Clock size={14} />
              {formatTime(timeLeft)}
            </motion.div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 border border-[#D4AF37]/30 rounded-lg">
            <DollarSign size={14} className="text-[#D4AF37]" />
            <span className="font-mono text-xs font-bold text-[#D4AF37]">
              {localBudget}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <span className="text-[10px] text-blue-400 font-mono font-bold">
              🔗 {drawnConnections.length}
            </span>
          </div>
        </div>
      </div>

      {/* Indices payants */}
      {clues.length > 0 && (
        <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-blue-400" />
            <span className="text-blue-400 font-mono text-[10px] uppercase tracking-wider font-bold">
              {lang === "fr" ? "Indices" : "Clues"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {clues.map((clue: any) => {
              const isRevealedClue = revealedClues.includes(clue.id);
              const cost = clue.reveal_cost_cauris ?? 10;
              return (
                <div
                  key={clue.id}
                  className={`p-2 rounded-lg border ${
                    isRevealedClue
                      ? "bg-blue-900/30 border-blue-500/50"
                      : "bg-black/40 border-gray-700"
                  }`}
                >
                  {isRevealedClue ? (
                    <p className="text-[10px] text-blue-100 italic">
                      {lang === "fr"
                        ? clue.text_fr
                        : clue.text_en || clue.text_fr}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleRevealClue(clue.id, cost)}
                      disabled={localBudget < cost || isVictory}
                      className="w-full py-1.5 bg-white/5 hover:bg-blue-600/20 disabled:bg-red-500/10 text-gray-400 hover:text-blue-300 disabled:text-red-400 border border-dashed border-gray-700 hover:border-blue-500/50 disabled:border-red-500/30 rounded text-[10px] transition-all flex items-center justify-center gap-1 font-bold"
                    >
                      💡 {lang === "fr" ? "Révéler" : "Reveal"} ({cost} 💰)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ Diagramme SVG avec viewBox 0-100 */}
      <div
        ref={containerRef}
        className="relative bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-2 border-gray-700 overflow-hidden shadow-inner"
        style={{ minHeight: "400px" }}
      >
        {/* Fond de carte */}
        {config.background_url_fr && (
          <img
            src={
              lang === "fr"
                ? config.background_url_fr
                : config.background_url_en || config.background_url_fr
            }
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}

        {/* ✅ SVG avec viewBox 0-100 : les coordonnées sont en pourcentages */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Lignes dessinées */}
          {drawnConnections.map((connId) => {
            const [fromId, toId] = connId.split("-");
            const fromEntity = entities.find((e) => e.id === fromId);
            const toEntity = entities.find((e) => e.id === toId);
            if (!fromEntity || !toEntity) return null;

            // ✅ Couleur : blanche par défaut, verte uniquement si victoire
            const strokeColor = isVictory ? "#22c55e" : "#ffffff";
            const strokeWidth = isVictory ? 0.5 : 0.3;

            return (
              <g key={connId}>
                <motion.line
                  x1={fromEntity.x_percent}
                  y1={fromEntity.y_percent}
                  x2={toEntity.x_percent}
                  y2={toEntity.y_percent}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  markerEnd="url(#arrow)"
                />

                {/* Label montant (visible seulement en cas de victoire) */}
                {isVictory && (() => {
                  const conn = allConnections.find(
                    (c) => c.from_id === fromId && c.to_id === toId
                  );
                  if (!conn) return null;
                  return (
                    <motion.text
                      x={(fromEntity.x_percent + toEntity.x_percent) / 2}
                      y={(fromEntity.y_percent + toEntity.y_percent) / 2 - 2}
                      textAnchor="middle"
                      fill="#22c55e"
                      fontSize="2.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {lang === "fr" ? conn.amount_fr : conn.amount_en}
                    </motion.text>
                  );
                })()}
              </g>
            );
          })}

          {/* Particules jaunes */}
          {particles.map((particle) => {
            const x = particle.fromX + (particle.toX - particle.fromX) * particle.progress;
            const y = particle.fromY + (particle.toY - particle.fromY) * particle.progress;

            return (
              <circle
                key={particle.id}
                cx={x}
                cy={y}
                r="1"
                fill="#D4AF37"
                opacity={1 - particle.progress * 0.5}
              >
                <animate
                  attributeName="r"
                  values="0.8;1.5;0.8"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}

          {/* Marqueur de flèche */}
          <defs>
            <marker
              id="arrow"
              markerWidth="4"
              markerHeight="4"
              refX="3"
              refY="2"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,4 L4,2 z" fill={isVictory ? "#22c55e" : "#ffffff"} />
            </marker>
          </defs>
        </svg>

        {/* Entités cliquables (positionnées en % CSS) */}
        {entities.map((entity) => {
          const isSelected = selectedFrom === entity.id;
          const hasOutgoing = drawnConnections.some((connId) =>
            connId.startsWith(`${entity.id}-`)
          );
          const hasIncoming = drawnConnections.some((connId) =>
            connId.endsWith(`-${entity.id}`)
          );

          return (
            <motion.div
              key={entity.id}
              className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{
                left: `${entity.x_percent}%`,
                top: `${entity.y_percent}%`,
              }}
              onClick={() => handleEntityClick(entity.id)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                className={`w-full h-full rounded-full flex items-center justify-center border-3 transition-all shadow-lg ${
                  isSelected
                    ? "bg-[#D4AF37]/30 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                    : hasOutgoing || hasIncoming
                    ? "bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                    : "bg-gray-800 border-gray-600 hover:border-gray-400"
                }`}
              >
                {entity.avatar_url ? (
                  <img
                    src={entity.avatar_url}
                    alt={entity.name_fr}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="text-2xl">
                    {entity.type === "shell_company"
                      ? "🏢"
                      : entity.type === "offshore_bank"
                      ? "🏦"
                      : entity.type === "personal_account"
                      ? "👤"
                      : entity.type === "government"
                      ? "🏛️"
                      : "💼"}
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="absolute top-full mt-2 text-center pointer-events-none w-32 -translate-x-1/2 left-1/2">
                <p className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded whitespace-nowrap">
                  {lang === "fr" ? entity.name_fr : entity.name_en}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`text-center font-mono text-sm p-3 rounded-lg border font-bold ${
              feedback.includes("✅")
                ? "bg-green-900/30 border-green-500/50 text-green-400"
                : feedback.includes("❌")
                ? "bg-red-900/30 border-red-500/50 text-red-400"
                : "bg-blue-900/30 border-blue-500/50 text-blue-400"
            }`}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boutons Action */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2 border border-red-500/30 disabled:opacity-50"
        >
          <X size={16} /> {lang === "fr" ? "Quitter" : "Abort"}
        </button>
        <button
          onClick={handleReset}
          disabled={isSubmitting || isVictory || drawnConnections.length === 0}
          className="py-3 px-4 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={
            drawnConnections.length === 0 || isSubmitting || isVictory
          }
          className="flex-[2] py-3 bg-gradient-to-r from-[#D4AF37] to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {lang === "fr" ? "Valider le Réseau" : "Validate Network"}
        </button>
      </div>
    </div>
  );
}