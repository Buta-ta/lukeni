"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  X,
  Send,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Clock,
  DollarSign,
  Lightbulb,
  RotateCcw,
  CheckCircle,
  Droplet,
  Sun,
  Contrast,
} from "lucide-react";



import { supabase } from "@/lib/supabase-browser";

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

interface Signature {
  id: string;
  name_fr: string;
  name_en: string;
  image_url: string;
}

interface Contract {
  id: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  image_url?: string;
  correct_signature_id: string;
}

type FilterType = "normal" | "uv" | "ir" | "contrast";

// ── COMPOSANT : IMAGE AVEC FILTRE (comme CounterfeitGame) ──
// ── COMPOSANT : IMAGE AVEC FILTRE (comme CounterfeitGame) ──
const FilteredImage = ({
  src,
  alt,
  filter,
  className = "",
}: {
  src: string;
  alt: string;
  filter: FilterType;
  className?: string;
}) => {
  const [filteredSrc, setFilteredSrc] = useState<string>(src);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;

      if (filter === "normal") {
        setFilteredSrc(src);
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (filter === "uv") {
          // UV : teinte violette, révèle encres invisibles
          data[i] = Math.min(255, r * 0.3 + b * 0.7);
          data[i + 1] = Math.min(255, g * 0.3);
          data[i + 2] = Math.min(255, b * 1.2);
        } else if (filter === "ir") {
          // IR : teinte rouge, contraste élevé
          data[i] = Math.min(255, r * 1.3);
          data[i + 1] = Math.min(255, g * 0.6);
          data[i + 2] = Math.min(255, b * 0.3);
        } else if (filter === "contrast") {
          // ✅ CONTRASTE AMÉLIORÉ : noir et blanc avec contraste très élevé
          const gray = 0.299 * r + 0.587 * g + 0.114 * b; // Formule luminance
          const contrastFactor = 2.5; // Facteur de contraste élevé
          const newGray = ((gray / 255 - 0.5) * contrastFactor + 0.5) * 255;
          const finalGray = Math.max(0, Math.min(255, newGray));

          data[i] = finalGray;     // R
          data[i + 1] = finalGray; // G
          data[i + 2] = finalGray; // B
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setFilteredSrc(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      setFilteredSrc(src);
    };
    img.src = src;
  }, [src, filter]);

  return <img src={filteredSrc} alt={alt} className={className} />;
};

export default function SignatureAnalysisGame({
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
  const [mode, setMode] = useState<"simple" | "matching">("simple");
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [counterfeitId, setCounterfeitId] = useState<string | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [timeLeft, setTimeLeft] = useState(miniGame.timer_seconds || 120);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("normal");
  const [zoomedSignature, setZoomedSignature] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [feedbackMode, setFeedbackMode] = useState<"immediate" | "end">("end");
  const [matchResults, setMatchResults] = useState<Record<string, boolean>>({});

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
    const configMode = config.analysis_mode || "simple";
    if (["simple", "matching"].includes(configMode)) {
      setMode(configMode as "simple" | "matching");
    }

    setSignatures(config.signatures || []);
    setContracts(config.contracts || []);
    setCounterfeitId(config.counterfeit_signature_id || null);
    setFeedbackMode(config.feedback_mode || "end");

    if (initialState) {
      if (initialState.selectedSignature)
        setSelectedSignature(initialState.selectedSignature);
      if (initialState.matchedPairs)
        setMatchedPairs(initialState.matchedPairs);
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
          selectedSignature,
          matchedPairs,
          revealedClues,
          isVictory,
        });
      }
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [selectedSignature, matchedPairs, revealedClues, isVictory, onStateChange]);

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

  // ── MODE SIMPLE : Sélection de la fausse signature ──
  const handleSelectSignature = (sigId: string) => {
    if (isVictory || isSubmitting) return;
    setSelectedSignature(sigId === selectedSignature ? null : sigId);
  };

  // ── MODE MATCHING : Clic sur contrat puis signature ──
  const handleContractClick = (contractId: string) => {
    if (isVictory || isSubmitting) return;
    if (feedbackMode === "immediate" && matchedPairs[contractId]) return;
    setSelectedContract(contractId);
  };

  const handleSignatureClick = (signatureId: string) => {
    if (isVictory || isSubmitting || !selectedContract) return;

    const newPairs = { ...matchedPairs, [selectedContract]: signatureId };
    setMatchedPairs(newPairs);

    if (feedbackMode === "immediate") {
      const contract = contracts.find((c) => c.id === selectedContract);
      if (contract) {
        const isCorrect = contract.correct_signature_id === signatureId;
        setMatchResults((prev) => ({ ...prev, [selectedContract]: isCorrect }));

        if (isCorrect) {
          setFeedback(
            lang === "fr" ? "✅ Appariement correct" : "✅ Correct match"
          );
        } else {
          setFeedback(
            lang === "fr" ? "❌ Appariement incorrect" : "❌ Incorrect match"
          );

          if (penaltyPerError > 0) {
            const newBudget = Math.max(0, localBudget - penaltyPerError);
            setLocalBudget(newBudget);
            if (onProgressUpdate) onProgressUpdate(newBudget, penaltyPerError);
          }
        }

        setTimeout(() => setFeedback(null), 1500);
      }
    }

    setSelectedContract(null);
  };

  // ── ZOOM SUR SIGNATURE ──
  const handleZoomClick = (sigId: string) => {
    if (zoomedSignature === sigId) {
      setZoomedSignature(null);
      setZoomLevel(1);
    } else {
      setZoomedSignature(sigId);
      setZoomLevel(2);
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

  // ── VALIDATION ──
  const handleSubmit = async () => {
    if (isSubmitting || isVictory) return;

    setIsSubmitting(true);

    let isCorrect = false;

    if (mode === "simple") {
      isCorrect = selectedSignature === counterfeitId;
    } else if (mode === "matching") {
      const allContractsMatched = contracts.every((c) => matchedPairs[c.id]);

      if (!allContractsMatched) {
        setFeedback(
          lang === "fr"
            ? "❌ Tous les contrats doivent être appariés"
            : "❌ All contracts must be matched"
        );
        setIsSubmitting(false);
        return;
      }

      isCorrect = contracts.every((contract) => {
        const matchedSigId = matchedPairs[contract.id];
        return contract.correct_signature_id === matchedSigId;
      });

      if (feedbackMode === "end") {
        const results: Record<string, boolean> = {};
        contracts.forEach((contract) => {
          const matchedSigId = matchedPairs[contract.id];
          results[contract.id] = contract.correct_signature_id === matchedSigId;
        });
        setMatchResults(results);
      }
    }

    setTimeout(() => {
      if (isCorrect) {
        setIsVictory(true);
        setFeedback(
          mode === "simple"
            ? lang === "fr"
              ? "✅ Fraude Détectée !"
              : "✅ Fraud Detected!"
            : lang === "fr"
              ? "✅ Tous les appariements corrects !"
              : "✅ All matches correct!"
        );

        markMiniGameComplete(miniGame.id, sessionId);
        setTimeout(() => onComplete(100, rewardCauris), 2000);
      } else {
        setFeedback(
          mode === "simple"
            ? lang === "fr"
              ? "❌ Mauvaise Signature"
              : "❌ Wrong Signature"
            : lang === "fr"
              ? "❌ Certains appariements sont incorrects"
              : "❌ Some matches are incorrect"
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
    setSelectedSignature(null);
    setMatchedPairs({});
    setSelectedContract(null);
    setFeedback(null);
    setMatchResults({});
    setZoomedSignature(null);
    setZoomLevel(1);
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-[#D4AF37]" />
          <h3 className="text-gray-300 font-mono text-sm tracking-widest uppercase">
            {mode === "simple"
              ? lang === "fr"
                ? "Analyse de Signature"
                : "Signature Analysis"
              : lang === "fr"
                ? "Appariement Signatures/Contrats"
                : "Signature/Contract Matching"}
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border ${timeLeft <= 10
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

          {mode === "matching" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <span className="text-[10px] text-blue-400 font-mono font-bold">
                🔗 {Object.keys(matchedPairs).length}/{contracts.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filtres de laboratoire */}
      <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Droplet size={14} className="text-purple-400" />
          <span className="text-purple-400 font-mono text-[10px] uppercase tracking-wider font-bold">
            {lang === "fr" ? "Filtres de laboratoire" : "Laboratory Filters"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveFilter("normal")}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeFilter === "normal"
                ? "bg-white text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
          >
            <Sun size={14} />
            {lang === "fr" ? "Normal" : "Normal"}
          </button>
          <button
            onClick={() => setActiveFilter("uv")}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeFilter === "uv"
                ? "bg-purple-600 text-white"
                : "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
              }`}
          >
            <Droplet size={14} />
            UV
          </button>
          <button
            onClick={() => setActiveFilter("ir")}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeFilter === "ir"
                ? "bg-red-600 text-white"
                : "bg-red-900/30 text-red-400 hover:bg-red-900/50"
              }`}
          >
            <Droplet size={14} />
            IR
          </button>
          <button
            onClick={() => setActiveFilter("contrast")}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeFilter === "contrast"
                ? "bg-gray-600 text-white"
                : "bg-gray-900/30 text-gray-400 hover:bg-gray-900/50"
              }`}
          >
            <Contrast size={14} />
            {lang === "fr" ? "Contraste" : "Contrast"}
          </button>
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
                  className={`p-2 rounded-lg border ${isRevealedClue
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

      {/* ════════════════════════════════════════════════════
          MODE SIMPLE : TROUVER LA FAUSSE SIGNATURE
      ════════════════════════════════════════════════════ */}
      {mode === "simple" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {lang === "fr"
              ? "Identifiez la fausse signature parmi ces exemples"
              : "Identify the fake signature among these examples"}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {signatures.map((sig) => {
              const isSelected = selectedSignature === sig.id;

              return (
                <motion.div
                  key={sig.id}
                  whileHover={{ y: -3 }}
                  className={`relative rounded-lg border-2 cursor-pointer transition-all ${isSelected
                      ? "bg-[#D4AF37]/20 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                >
                  {/* Bouton zoom */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomClick(sig.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black/90 z-10"
                  >
                    <ZoomIn size={14} />
                  </button>

                  <div
                    onClick={() => handleSelectSignature(sig.id)}
                    className="p-4"
                  >
                    <div className="bg-gray-900 rounded p-3 mb-2 h-24 flex items-center justify-center overflow-hidden">
                      <FilteredImage
                        src={sig.image_url}
                        alt="Signature"
                        filter={activeFilter}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">
                      {lang === "fr" ? sig.name_fr : sig.name_en}
                    </p>
                  </div>

                  {/* Checkbox visuelle */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-[#D4AF37] rounded-full w-6 h-6 flex items-center justify-center">
                      <CheckCircle size={14} className="text-black" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODE MATCHING : APPARIER SIGNATURES/CONTRATS
      ════════════════════════════════════════════════════ */}
      {mode === "matching" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {lang === "fr"
              ? "Cliquez sur un contrat puis sur la signature correspondante"
              : "Click on a contract then on the corresponding signature"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contrats à gauche */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {lang === "fr" ? "Contrats" : "Contracts"}
              </p>
              {contracts.map((contract) => {
                const isMatched = !!matchedPairs[contract.id];
                const isSelected = selectedContract === contract.id;
                const isCorrect = matchResults[contract.id];
                const matchedSig = signatures.find(
                  (s) => s.id === matchedPairs[contract.id]
                );

                return (
                  <motion.div
                    key={contract.id}
                    onClick={() => handleContractClick(contract.id)}
                    whileHover={
                      !isMatched || feedbackMode === "end" ? { y: -2 } : {}
                    }
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${isMatched && feedbackMode === "immediate"
                        ? isCorrect
                          ? "bg-green-500/20 border-green-500/50"
                          : "bg-red-500/20 border-red-500/50"
                        : isSelected
                          ? "bg-[#D4AF37]/20 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                          : "bg-white/5 border-white/10 hover:border-white/30"
                      }`}
                  >
                    {contract.image_url && (
                      <img
                        src={contract.image_url}
                        alt="Contract"
                        className="w-full h-20 object-cover rounded border border-white/10 mb-2"
                      />
                    )}
                    <p className="text-[10px] font-bold text-gray-300 mb-1">
                      {lang === "fr" ? contract.name_fr : contract.name_en}
                    </p>
                    <p className="text-[9px] text-gray-500 mb-2">
                      {lang === "fr"
                        ? contract.description_fr
                        : contract.description_en}
                    </p>
                    {isMatched && matchedSig && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <div className="bg-gray-900 rounded p-1 h-10 w-16 flex items-center justify-center overflow-hidden">
                          <FilteredImage
                            src={matchedSig.image_url}
                            alt="Matched signature"
                            filter={activeFilter}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <span className="text-[9px] text-gray-400">
                          → {lang === "fr" ? matchedSig.name_fr : matchedSig.name_en}
                        </span>
                        {feedbackMode === "immediate" &&
                          (isCorrect ? (
                            <CheckCircle size={14} className="text-green-400 ml-auto" />
                          ) : (
                            <X size={14} className="text-red-400 ml-auto" />
                          ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Signatures à droite */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {lang === "fr" ? "Signatures" : "Signatures"}
              </p>
              {signatures.map((sig) => {
                const isMatched = Object.values(matchedPairs).includes(sig.id);

                return (
                  <motion.div
                    key={sig.id}
                    onClick={() => handleSignatureClick(sig.id)}
                    whileHover={!isMatched ? { y: -2 } : {}}
                    className={`relative p-3 rounded-lg border-2 transition-all ${isMatched
                        ? "bg-green-500/10 border-green-500/50 opacity-50 cursor-not-allowed"
                        : selectedContract
                          ? "bg-white/5 border-white/10 hover:border-[#D4AF37] cursor-pointer"
                          : "bg-white/5 border-white/10 cursor-not-allowed opacity-70"
                      }`}
                  >
                    {/* Bouton zoom */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoomClick(sig.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black/90 z-10"
                    >
                      <ZoomIn size={14} />
                    </button>

                    <div className="bg-gray-900 rounded p-2 h-16 flex items-center justify-center mb-2 overflow-hidden">
                      <FilteredImage
                        src={sig.image_url}
                        alt="Signature"
                        filter={activeFilter}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">
                      {lang === "fr" ? sig.name_fr : sig.name_en}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomedSignature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setZoomedSignature(null);
              setZoomLevel(1);
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#1a1a1a] border border-white/20 rounded-2xl p-6 max-w-lg max-h-[70vh] flex flex-col items-center shadow-2xl"
            >
              {/* Bouton fermer */}
              <button
                onClick={() => {
                  setZoomedSignature(null);
                  setZoomLevel(1);
                }}
                className="absolute -top-3 -right-3 p-2 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg z-20"
              >
                <X size={16} />
              </button>

              {/* Titre */}
              <p className="text-xs text-gray-400 font-mono uppercase mb-3">
                {lang === "fr" ? "Zoom d'analyse" : "Analysis Zoom"}
              </p>

              {/* ✅ Image avec filtre ET zoom */}
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-gray-900 rounded-lg p-2 mb-4">
                <div
                  className="transition-transform duration-300"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <FilteredImage
                    src={signatures.find((s) => s.id === zoomedSignature)?.image_url || ""}
                    alt="Zoomed signature"
                    filter={activeFilter}
                    className="max-w-full max-h-[50vh] object-contain"
                  />
                </div>
              </div>

              {/* Contrôles zoom */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                  disabled={zoomLevel <= 1}
                  className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="px-4 py-2 bg-white/10 rounded-full text-white font-mono text-sm min-w-[60px] text-center">
                  {zoomLevel.toFixed(1)}x
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
                  disabled={zoomLevel >= 4}
                  className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              {/* Indication */}
              <p className="text-[9px] text-gray-500 mt-3 text-center">
                {lang === "fr"
                  ? "Cliquez en dehors ou sur ✕ pour fermer"
                  : "Click outside or ✕ to close"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`text-center font-mono text-sm p-3 rounded-lg border font-bold ${feedback.includes("✅")
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
          disabled={isSubmitting || isVictory}
          className="py-3 px-4 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={
            (mode === "simple" && !selectedSignature) ||
            (mode === "matching" &&
              Object.keys(matchedPairs).length !== contracts.length) ||
            isSubmitting ||
            isVictory
          }
          className="flex-[2] py-3 bg-gradient-to-r from-[#D4AF37] to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {lang === "fr" ? "Valider" : "Validate"}
        </button>
      </div>
    </div>
  );
}