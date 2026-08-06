"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  X,
  Send,
  ChevronDown,
  Clock,
  DollarSign,
  Lightbulb,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  sessionId: string;
  userId: string;
}




const markMiniGameComplete = async (miniGameId: string, sessionId: string) => {
  if (!sessionId) return;
  const conditionKey = `minigame_${miniGameId}_completed`;
  try {
    const { data: session } = await supabase
      .from('investigation_sessions')
      .select('completed_mini_games')
      .eq('id', sessionId)
      .single();
    const completed = session?.completed_mini_games || [];
    if (!completed.includes(conditionKey)) {
      await supabase
        .from('investigation_sessions')
        .update({ completed_mini_games: [...completed, conditionKey] })
        .eq('id', sessionId);
    }
  } catch (err) {
    console.error('❌ Erreur sauvegarde mini-game complété:', err);
  }
};
interface Document {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  description_fr: string;
  description_en: string;
  is_correct: boolean;
  image_url?: string;
  details_fr: string[];
  details_en: string[];
}

interface Contract {
  id: string;
  description_fr: string;
  description_en: string;
  quantity: number;
  unit: string;
  budget: number;
  currency: string;
  year: number;
  image_url?: string;
  is_correct: boolean;
}

export default function TreasuryCalculGame({
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
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reference, setReference] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [timeLeft, setTimeLeft] = useState(miniGame.timer_seconds || 120);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);

  const config = miniGame.config || {};
  const mode = config.mode || "black_box";
  const clues = miniGame.mini_game_clues || [];
  const penaltyPerError = miniGame.penalty_per_error || 0;
  const rewardCauris = miniGame.reward_cauris || 0;

  // ── SYNC BUDGET ──
  useEffect(() => {
    setLocalBudget(budgetCauris);
  }, [budgetCauris]);

  // ── CHARGER LES DONNÉES ──
  useEffect(() => {
    if (mode === "black_box") {
      const docs = config.documents || [];
      setDocuments(docs.sort(() => Math.random() - 0.5));
    } else {
      setReference(config.reference || null);
      const cts = config.contracts || [];
      setContracts(cts.sort(() => Math.random() - 0.5));
    }

    if (initialState) {
      if (initialState.selectedIds) setSelectedIds(initialState.selectedIds);
      if (initialState.revealedClues) setRevealedClues(initialState.revealedClues);
      if (initialState.isVictory) setIsVictory(initialState.isVictory);
    }

    setIsLoading(false);
  }, [config, initialState, mode]);

  // ── SAUVEGARDE AUTO ──
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (onStateChange) {
        onStateChange({
          selectedIds,
          revealedClues,
          isVictory,
        });
      }
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [selectedIds, revealedClues, isVictory, onStateChange]);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── TOGGLE SÉLECTION ──
  const toggleSelection = (id: string) => {
    if (isVictory || isSubmitting) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ── TOGGLE FLIP (Mode 1 uniquement) ──
  const toggleFlip = (id: string) => {
    if (isVictory || isSubmitting) return;
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── CALCUL TOTAL (Mode 1) ──
  const calculateTotal = () => {
    return selectedIds.reduce((sum, docId) => {
      const doc = documents.find((d) => d.id === docId);
      return sum + (doc ? doc.amount : 0);
    }, 0);
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

  // ── VALIDATION ──
  const handleSubmit = async () => {
    if (selectedIds.length === 0 || isSubmitting || isVictory) return;

    setIsSubmitting(true);

    let isCorrect = false;

    if (mode === "black_box") {
      // Mode 1 : Vérifier que seuls les bons documents sont sélectionnés
      const targetAmount = config.target_amount || 0;
      const tolerance = config.tolerance || 10000;
      const total = calculateTotal();
      const diff = Math.abs(total - targetAmount);

      const onlyCorrectSelected = selectedIds.every((docId) => {
        const doc = documents.find((d) => d.id === docId);
        return doc?.is_correct;
      });

      const allCorrectSelected = documents
        .filter((d) => d.is_correct)
        .every((d) => selectedIds.includes(d.id));

      isCorrect = onlyCorrectSelected && allCorrectSelected && diff <= tolerance;
    } else {
      // Mode 2 : Vérifier que seuls les contrats frauduleux sont sélectionnés
      const onlyFraudsSelected = selectedIds.every((contractId) => {
        const contract = contracts.find((c) => c.id === contractId);
        return contract?.is_correct;
      });

      const allFraudsSelected = contracts
        .filter((c) => c.is_correct)
        .every((c) => selectedIds.includes(c.id));

      isCorrect = onlyFraudsSelected && allFraudsSelected;
    }

    setTimeout(() => {
      if (isCorrect) {
        setIsVictory(true);
        setFeedback(
          mode === "black_box"
            ? lang === "fr"
              ? "✅ Détournement Exposé !"
              : "✅ Embezzlement Exposed!"
            : lang === "fr"
            ? "✅ Audit Réussi !"
            : "✅ Audit Successful!"
        );
        markMiniGameComplete(miniGame.id, sessionId);
        setTimeout(() => onComplete(100, rewardCauris), 2000);
      } else {
        setFeedback(
          mode === "black_box"
            ? lang === "fr"
              ? "❌ Total Incorrect"
              : "❌ Incorrect Total"
            : lang === "fr"
            ? "❌ Audit Incorrect"
            : "❌ Incorrect Audit"
        );

        if (penaltyPerError > 0) {
          const newBudget = Math.max(0, localBudget - penaltyPerError);
          setLocalBudget(newBudget);
          if (onProgressUpdate) onProgressUpdate(newBudget, penaltyPerError);
          onFail(penaltyPerError);
        }
      }

      setIsSubmitting(false);
    }, 800);
  };

  // ── RESET ──
  const handleReset = () => {
    if (isVictory || isSubmitting) return;
    setSelectedIds([]);
    setFlipped({});
    setFeedback(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // MODE 1 : CAISSE NOIRE
  // ════════════════════════════════════════════════════
  if (mode === "black_box") {
    const targetAmount = config.target_amount || 0;
    const tolerance = config.tolerance || 10000;
    const targetText = lang === "fr" ? config.target_total_fr : config.target_total_en;
    const currentTotal = calculateTotal();
    const isAccurate = Math.abs(currentTotal - targetAmount) <= tolerance;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-[#D4AF37]" />
            <h3 className="text-gray-300 font-mono text-sm tracking-widest uppercase">
              {lang === "fr" ? "Caisse Noire" : "Black Box"}
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
                📄 {selectedIds.length}
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
                        {lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}
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

        {/* Objectif */}
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-400 font-mono text-[10px] uppercase mb-2 font-bold">
            {lang === "fr" ? "Objectif" : "Objective"}
          </p>
          <p className="text-gray-300 text-sm mb-3">{targetText}</p>
          <div className="bg-black/30 p-3 rounded border border-amber-500/20">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs">
                {lang === "fr" ? "Montant à Reconstituer" : "Amount to Reconstruct"}:
              </span>
              <span className="text-amber-400 font-mono font-bold">
                {targetAmount.toLocaleString()}{" "}
                {documents[0]?.currency || "USD"}
              </span>
            </div>
            <div className="text-[10px] text-gray-600 mt-1">
              {lang === "fr" ? "Tolérance:" : "Tolerance:"} ±{tolerance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Grille de Documents */}
        <div className="space-y-3">
          <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
            {lang === "fr" ? "Bordereaux de Virement" : "Transfer Statements"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.id);
              const isFaceUp = flipped[doc.id];

              return (
                <motion.div
                  key={doc.id}
                  className="relative h-48 cursor-pointer perspective"
                  onClick={() => toggleFlip(doc.id)}
                  whileHover={{ y: -5 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotateY: isFaceUp ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative w-full h-full"
                  >
                    {/* VERSO */}
                    <div
                      style={{ backfaceVisibility: "hidden" }}
                      className={`absolute inset-0 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-green-500/20 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                          : "bg-blue-900/30 border-blue-500/50"
                      }`}
                    >
                      <div className="text-center space-y-2">
                        <ChevronDown size={24} className="text-gray-500 mx-auto" />
                        <p className="text-gray-400 text-[10px] uppercase font-mono">
                          {lang === "fr" ? "Retourner" : "Flip"}
                        </p>
                      </div>
                    </div>

                    {/* RECTO */}
                    <div
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                      className={`absolute inset-0 rounded-lg border-2 p-4 space-y-2 overflow-hidden transition-all ${
                        isSelected
                          ? "bg-green-500/20 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      {doc.image_url && (
                        <img
                          src={doc.image_url}
                          alt="Document"
                          className="w-full h-20 object-cover rounded border border-white/10"
                        />
                      )}

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-[#D4AF37] uppercase">
                          {lang === "fr" ? doc.description_fr : doc.description_en}
                        </p>
                        <div className="text-[9px] text-gray-400 space-y-0.5">
                          {(lang === "fr" ? doc.details_fr : doc.details_en).map(
                            (detail, idx) => (
                              <p key={idx}>{detail}</p>
                            )
                          )}
                        </div>
                        <p className="text-xs font-bold text-green-400 pt-1 border-t border-white/10">
                          {doc.amount.toLocaleString()} {doc.currency}
                        </p>
                      </div>

                      <label className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(doc.id)}
                          className="w-4 h-4 accent-green-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-[10px] text-gray-400 uppercase">
                          {lang === "fr" ? "Inclure" : "Include"}
                        </span>
                      </label>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
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
                  : "bg-red-900/30 border-red-500/50 text-red-400"
              }`}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boutons */}
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
            disabled={isSubmitting || isVictory || selectedIds.length === 0}
            className="py-3 px-4 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || isSubmitting || isVictory}
            className="flex-[2] py-3 bg-gradient-to-r from-[#D4AF37] to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {lang === "fr" ? "Valider le Total" : "Validate Total"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // MODE 2 : AUDIT DE SURFACTUALISATION
  // ════════════════════════════════════════════════════
  const referenceUnitPrice =
    reference && reference.quantity > 0
      ? reference.budget / reference.quantity
      : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-[#D4AF37]" />
          <h3 className="text-gray-300 font-mono text-sm tracking-widest uppercase">
            {lang === "fr" ? "Audit de Surfactualisation" : "Overpricing Audit"}
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
              📋 {selectedIds.length}
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
                      {lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}
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

      {/* Référence de marché */}
      {reference && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-400 font-mono text-[10px] uppercase mb-2 font-bold">
            📊 {lang === "fr" ? "Référence de marché" : "Market Reference"}
          </p>
          <p className="text-gray-300 text-sm mb-3">
            {lang === "fr" ? reference.description_fr : reference.description_en}
          </p>
          <div className="bg-black/30 p-3 rounded border border-amber-500/20">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs">
                {lang === "fr" ? "Prix unitaire de référence" : "Reference unit price"}:
              </span>
              <span className="text-amber-400 font-mono font-bold">
                {referenceUnitPrice.toLocaleString()} {reference.currency}/
                {reference.unit}
              </span>
            </div>
            <div className="text-[10px] text-gray-600 mt-1">
              {reference.quantity} {reference.unit} / {reference.budget.toLocaleString()}{" "}
              {reference.currency}
            </div>
          </div>
        </div>
      )}

      {/* Contrats à analyser */}
      <div className="space-y-3">
        <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr"
            ? "Contrats à analyser (sélectionnez les frauduleux)"
            : "Contracts to analyze (select fraudulent ones)"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((contract) => {
            const isSelected = selectedIds.includes(contract.id);
            const unitPrice =
              contract.quantity > 0 ? contract.budget / contract.quantity : 0;

            return (
                            <motion.div
                key={contract.id}
                className={`relative rounded-lg border-2 p-4 space-y-3 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    : "bg-white/5 border-white/10 hover:border-amber-500/50"
                }`}
                onClick={() => toggleSelection(contract.id)}
                whileHover={{ y: -3 }}
              >
                {/* Badge sélection */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-20"
                  >
                    <AlertTriangle size={16} />
                  </motion.div>
                )}

                {/* Image du contrat */}
                {contract.image_url && (
                  <img
                    src={contract.image_url}
                    alt="Contract"
                    className="w-full h-24 object-cover rounded border border-white/10"
                  />
                )}

                {/* Header contrat */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase">
                      {lang === "fr" ? "Contrat" : "Contract"} #{contracts.indexOf(contract) + 1}
                    </p>
                    <p className="text-xs font-bold text-white mt-1">
                      {lang === "fr" ? contract.description_fr : contract.description_en}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-500 bg-black/50 px-2 py-0.5 rounded">
                    {contract.year}
                  </span>
                </div>

                {/* Détails */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div className="bg-black/30 p-2 rounded border border-white/10">
                    <span className="text-gray-600 text-[9px] block">
                      {lang === "fr" ? "Quantité" : "Quantity"}
                    </span>
                    <p className="text-white font-mono font-bold text-sm">
                      {contract.quantity} {contract.unit}
                    </p>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-white/10">
                    <span className="text-gray-600 text-[9px] block">
                      {lang === "fr" ? "Budget" : "Budget"}
                    </span>
                    <p className="text-amber-400 font-mono font-bold text-sm">
                      {contract.budget.toLocaleString()} {contract.currency}
                    </p>
                  </div>
                </div>

                {/* Calcul prix unitaire - CACHÉ au joueur (pas de feedback) */}
                {contract.quantity > 0 && (
                  <div className="bg-black/30 p-2 rounded border border-amber-500/20">
                    <span className="text-gray-600 text-[9px] block">
                      {lang === "fr" ? "Prix unitaire" : "Unit price"}
                    </span>
                    <p className="text-amber-400 font-mono font-bold">
                      {unitPrice.toLocaleString()} {contract.currency}/{contract.unit}
                    </p>
                  </div>
                )}

                {/* Checkbox visuelle */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-red-500 border-red-500"
                        : "bg-white/5 border-gray-500"
                    }`}
                  >
                    {isSelected && <CheckCircle size={14} className="text-white" />}
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase">
                    {isSelected
                      ? lang === "fr"
                        ? "Marqué comme frauduleux"
                        : "Marked as fraudulent"
                      : lang === "fr"
                      ? "Cliquer pour signaler"
                      : "Click to flag"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
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
                : "bg-red-900/30 border-red-500/50 text-red-400"
            }`}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boutons */}
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
          disabled={isSubmitting || isVictory || selectedIds.length === 0}
          className="py-3 px-4 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedIds.length === 0 || isSubmitting || isVictory}
          className="flex-[2] py-3 bg-gradient-to-r from-[#D4AF37] to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {lang === "fr" ? "Valider l'Audit" : "Validate Audit"}
        </button>
      </div>
    </div>
  );
}