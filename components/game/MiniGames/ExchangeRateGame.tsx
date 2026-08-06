"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Zap,
  Eye,
  Shield,
  FileWarning,
  Search,
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
  sessionId?: string;
  userId?: string;
}

export default function ExchangeRateGame({
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
  userId,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRate, setSelectedRate] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyzedRates, setAnalyzedRates] = useState<
    Record<number, "fraud" | "authentic">
  >({});
  const [timeLeft, setTimeLeft] = useState(miniGame.timer_seconds || 90);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [showBriefing, setShowBriefing] = useState(true);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);

  const config = miniGame.config || {};
  const exchangeRates = config.exchange_rates || [];
  const referenceUrl =
    lang === "fr"
      ? config.reference_chart_url_fr
      : config.reference_chart_url_en || config.reference_chart_url_fr;
  const threshold = config.similarity_threshold || 90; // Seuil de tolérance en %
  const clues = miniGame.mini_game_clues || [];

  // Sync budget avec le parent
  useEffect(() => {
    setLocalBudget(budgetCauris);
  }, [budgetCauris]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Timer
  useEffect(() => {
    if (!miniGame.timer_seconds || miniGame.timer_seconds <= 0) return;

    if (timeLeft <= 0) {
      setFeedback(
        lang === "fr" ? "⏱️ Temps écoulé !" : "⏱️ Time's up!"
      );
      const penalty = miniGame.penalty_per_error || 1;
      setTimeout(() => onFail(penalty), 1500);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, miniGame.timer_seconds, onFail, lang]);

  // Calculer si un taux est une fraude (écart > seuil de tolérance)
  const isRateFraud = (rate: any): boolean => {
    const diff = Math.abs(rate.correct_rate - rate.official_rate);
    const percentDiff = (diff / rate.correct_rate) * 100;
    // Si l'écart dépasse (100 - threshold)%, c'est une fraude
    return percentDiff > (100 - threshold) / 10;
  };

  // Compter les vraies fraudes
  const totalFrauds = exchangeRates.filter(isRateFraud).length;
  const fraudsFound = Object.entries(analyzedRates).filter(
    ([idx, verdict]) =>
      verdict === "fraud" && isRateFraud(exchangeRates[Number(idx)])
  ).length;

  // Gérer l'analyse d'un taux
  const handleAnalyzeRate = (verdict: "fraud" | "authentic") => {
    if (selectedRate === null || isSubmitting) return;

    setIsSubmitting(true);
    const rate = exchangeRates[selectedRate];
    const actualIsFraud = isRateFraud(rate);

    setTimeout(() => {
      let isCorrectVerdict = false;

      if (verdict === "fraud" && actualIsFraud) {
        // ✅ Bonne détection de fraude
        isCorrectVerdict = true;
        setFeedback(
          lang === "fr"
            ? "✅ Fraude détectée ! +10 Cauris"
            : "✅ Fraud detected! +10 Cauris"
        );

        const reward = 10;
        const newBudget = localBudget + reward;
        setLocalBudget(newBudget);
        if (onProgressUpdate) onProgressUpdate(newBudget, 0);
      } else if (verdict === "authentic" && !actualIsFraud) {
        // ✅ Bonne validation d'un taux authentique
        isCorrectVerdict = true;
        setFeedback(
          lang === "fr"
            ? "✅ Taux authentique confirmé ! +5 Cauris"
            : "✅ Authentic rate confirmed! +5 Cauris"
        );

        const reward = 5;
        const newBudget = localBudget + reward;
        setLocalBudget(newBudget);
        if (onProgressUpdate) onProgressUpdate(newBudget, 0);
      } else if (verdict === "fraud" && !actualIsFraud) {
        // ❌ Faux positif : accuser un taux authentique
        isCorrectVerdict = false;
        setFeedback(
          lang === "fr"
            ? "❌ Faux positif ! Ce taux est authentique. -5 Cauris"
            : "❌ False positive! This rate is authentic. -5 Cauris"
        );

        const penalty = 5;
        const newBudget = Math.max(0, localBudget - penalty);
        setLocalBudget(newBudget);
        if (onProgressUpdate) onProgressUpdate(newBudget, penalty);
        onFail(penalty);
      } else {
        // ❌ Faux négatif : valider un taux frauduleux
        isCorrectVerdict = false;
        setFeedback(
          lang === "fr"
            ? "❌ Vous avez validé une fraude ! -10 Cauris"
            : "❌ You validated a fraud! -10 Cauris"
        );

        const penalty = 10;
        const newBudget = Math.max(0, localBudget - penalty);
        setLocalBudget(newBudget);
        if (onProgressUpdate) onProgressUpdate(newBudget, penalty);
        onFail(penalty);
      }

      // Marquer le taux comme analysé
      setAnalyzedRates((prev) => ({
        ...prev,
        [selectedRate]: verdict,
      }));

      setIsSubmitting(false);
      setSelectedRate(null);
      setTimeout(() => setFeedback(null), 2500);

      // Vérifier si tous les taux ont été analysés
      const totalAnalyzed = Object.keys(analyzedRates).length + 1;
      if (totalAnalyzed >= exchangeRates.length) {
        setTimeout(async () => {
          await markMiniGameComplete(miniGame.id, sessionId);
          onComplete(100, miniGame.reward_cauris || 20);
        }, 3000);
      }
    }, 800);
  };

  // Révéler un indice
  const handleRevealHint = (clueId: string, cost: number) => {
    if (localBudget < cost) return;

    const newBudget = localBudget - cost;
    setLocalBudget(newBudget);
    setRevealedHints((prev) => [...prev, clueId]);
    if (onProgressUpdate) onProgressUpdate(newBudget, cost);
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

  // Écran de briefing
  if (showBriefing) {
    return (
      <div className="relative overflow-hidden">
        {/* Fond terminal */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(34,197,94,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(34,197,94,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <FileWarning size={32} className="text-[#D4AF37]" />
            <h2 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">
              {lang === "fr" ? "Briefing d'Enquête" : "Investigation Briefing"}
            </h2>
          </div>

          <div className="bg-black/50 border border-[#D4AF37]/30 rounded-xl p-6 space-y-4">
            <p className="text-gray-300 leading-relaxed">
              {lang === "fr"
                ? "Un cambiste est suspecté de falsifier les taux de change pour voler de l'argent aux citoyens. Votre mission : analyser les taux proposés et identifier les fraudes en les comparant au graphique de référence."
                : "A money changer is suspected of falsifying exchange rates to steal from citizens. Your mission: analyze the proposed rates and identify frauds by comparing them with the reference chart."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 font-bold text-sm uppercase">
                    {lang === "fr" ? "Récompenses" : "Rewards"}
                  </span>
                </div>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>
                    💰 +10 Cauris par fraude détectée
                  </li>
                  <li>
                    💰 +5 Cauris par taux authentique validé
                  </li>
                  <li>
                    🏆 Bonus de complétion : {miniGame.reward_cauris || 20} Cauris
                  </li>
                </ul>
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-red-400 font-bold text-sm uppercase">
                    {lang === "fr" ? "Pénalités" : "Penalties"}
                  </span>
                </div>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>
                    ❌ -5 Cauris par faux positif
                  </li>
                  <li>
                    ❌ -10 Cauris si vous validez une fraude
                  </li>
                  <li>
                    ⏱️ Pénalité si le temps est écoulé
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={16} className="text-amber-400" />
                <span className="text-amber-400 font-bold text-sm uppercase">
                  {lang === "fr" ? "Méthode" : "Method"}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                {lang === "fr"
                  ? "1. Observez le graphique de référence (taux réel du marché)"
                  : "1. Observe the reference chart (real market rate)"}
              </p>
              <p className="text-xs text-gray-300">
                {lang === "fr"
                  ? "2. Cliquez sur un taux proposé pour l'analyser"
                  : "2. Click on a proposed rate to analyze it"}
              </p>
              <p className="text-xs text-gray-300">
                {lang === "fr"
                  ? "3. Décidez : FRAUDE 🚨 ou AUTHENTIQUE ✅"
                  : "3. Decide: FRAUD 🚨 or AUTHENTIC ✅"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowBriefing(false)}
            className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            <Search size={18} />
            {lang === "fr" ? "COMMENCER L'ANALYSE" : "START ANALYSIS"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative overflow-hidden">
      {/* Fond animé style terminal */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(34,197,94,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(34,197,94,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        {/* Scan line animée */}
        <motion.div
          className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-green-500/5 to-transparent"
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header avec Timer et Budget */}
      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-[#D4AF37]" />
          <h3 className="text-gray-300 font-mono text-sm tracking-widest uppercase">
            {lang === "fr" ? "Terminal d'Analyse" : "Analysis Terminal"}
          </h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Timer */}
          {miniGame.timer_seconds > 0 && (
            <motion.div
              animate={{
                scale: timeLeft <= 10 ? [1, 1.1, 1] : 1,
              }}
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

          {/* Budget */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 border border-[#D4AF37]/30 rounded-lg">
            <DollarSign size={14} className="text-[#D4AF37]" />
            <span className="font-mono text-xs font-bold text-[#D4AF37]">
              {localBudget}
            </span>
          </div>

          {/* Compteur de fraudes */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="font-mono text-xs font-bold text-red-400">
              {fraudsFound}/{totalFrauds}
            </span>
          </div>

          {/* Progression */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Eye size={14} className="text-blue-400" />
            <span className="font-mono text-xs font-bold text-blue-400">
              {Object.keys(analyzedRates).length}/{exchangeRates.length}
            </span>
          </div>
        </div>
      </div>

      {/* Graphique de Référence en 3D */}
      {referenceUrl && (
        <motion.div
          initial={{ opacity: 0, y: -50, rotateX: -45 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          style={{ perspective: "1000px" }}
          className="relative"
        >
          <div
            className="bg-gradient-to-b from-[#0a190a] to-[#0f1f0f] border-2 border-green-500/30 rounded-xl p-4 relative overflow-hidden shadow-[0_10px_40px_rgba(34,197,94,0.2)]"
            style={{
              transform: "rotateX(5deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Label RÉFÉRENCE */}
            <div className="absolute top-3 right-3 text-[10px] text-green-400 font-mono bg-black/70 px-2 py-1 rounded border border-green-500/30 z-10">
              {lang === "fr" ? "📊 RÉFÉRENCE MARCHÉ" : "📊 MARKET REFERENCE"}
            </div>

            {/* Image du graphique */}
            <img
              src={referenceUrl}
              alt="Reference chart"
              className="w-full h-48 object-contain relative z-0"
            />

            {/* Overlay scan line */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/10 to-transparent pointer-events-none"
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Effet CRT */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.25) 50%, transparent 50%)",
                backgroundSize: "100% 4px",
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Indices payants */}
      {clues.length > 0 && (
        <div className="relative z-10 bg-blue-950/30 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-blue-400" />
            <h4 className="text-blue-400 font-mono text-xs uppercase tracking-wider">
              {lang === "fr" ? "Indices disponibles" : "Available clues"}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {clues.map((clue: any) => {
              const isRevealed = revealedHints.includes(clue.id);
              const cost = clue.reveal_cost_cauris ?? 5;

              return (
                <div
                  key={clue.id}
                  className={`p-3 rounded-lg border transition-all ${isRevealed
                      ? "bg-blue-900/30 border-blue-500/50"
                      : "bg-black/40 border-gray-700"
                    }`}
                >
                  {isRevealed ? (
                    <p className="text-xs text-blue-100 italic">
                      {lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleRevealHint(clue.id, cost)}
                      disabled={localBudget < cost}
                      className="w-full py-2 bg-white/5 hover:bg-blue-600/20 disabled:bg-red-500/10 text-gray-400 hover:text-blue-300 disabled:text-red-400 border border-dashed border-gray-700 hover:border-blue-500/50 disabled:border-red-500/30 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 font-bold"
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

      {/* Titre section taux */}
      <div className="relative z-10 flex items-center gap-2">
        <Zap size={16} className="text-[#D4AF37]" />
        <h4 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          {lang === "fr"
            ? "Taux proposés par le cambiste"
            : "Rates proposed by the money changer"}
        </h4>
      </div>

      {/* Grille de cartes de taux en 3D */}
      <div
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        style={{ perspective: "1000px" }}
      >
        {exchangeRates.map((rate: any, idx: number) => {
          const isSelected = selectedRate === idx;
          const analyzed = analyzedRates[idx];
          const isFraud = isRateFraud(rate);

          return (
            <motion.button
              key={idx}
              initial={{
                opacity: 0,
                y: 50,
                rotateX: -45,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
                scale: 1,
              }}
              transition={{
                delay: idx * 0.1,
                type: "spring",
                damping: 15,
              }}
              whileHover={
                !analyzed
                  ? {
                    rotateY: 5,
                    rotateX: -5,
                    z: 50,
                    scale: 1.05,
                  }
                  : {}
              }
              whileTap={!analyzed ? { scale: 0.98 } : {}}
              onClick={() => !analyzed && setSelectedRate(isSelected ? null : idx)}
              disabled={!!analyzed}
              className={`relative group ${analyzed ? "cursor-default" : "cursor-pointer"}`}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className={`relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 rounded-xl p-4 backdrop-blur-sm transition-all ${analyzed === "fraud"
                    ? isFraud
                      ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                      : "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    : analyzed === "authentic"
                      ? !isFraud
                        ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                        : "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      : isSelected
                        ? "border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                        : "border-white/10 hover:border-[#D4AF37]/50"
                  }`}
              >
                {/* Effet holographique au hover */}
                {!analyzed && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                )}

                {/* Badge de verdict */}
                {analyzed && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`absolute -top-2 -right-2 rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-20 ${(analyzed === "fraud" && isFraud) ||
                        (analyzed === "authentic" && !isFraud)
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                      }`}
                  >
                    {(analyzed === "fraud" && isFraud) ||
                      (analyzed === "authentic" && !isFraud) ? (
                      <CheckCircle size={18} />
                    ) : (
                      <X size={18} />
                    )}
                  </motion.div>
                )}

                {/* Header carte */}
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <span className="text-lg font-bold text-white font-mono">
                    {rate.currency_pair}
                  </span>
                  <span className="text-[10px] text-gray-500 bg-black/50 px-2 py-0.5 rounded">
                    {rate.date}
                  </span>
                </div>

                {/* Taux proposé (SEUL ce que le joueur voit) */}
                <div className="relative z-10">
                  <motion.div
                    className="text-2xl font-mono font-bold text-[#D4AF37]"
                    key={rate.official_rate}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    {rate.official_rate.toFixed(4)}
                  </motion.div>

                  {/* Label */}
                  <div className="mt-2 flex items-center gap-2">
                    <Shield size={12} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 uppercase">
                      {lang === "fr" ? "Taux proposé" : "Proposed rate"}
                    </span>
                  </div>
                </div>

                {/* Ombre portée 3D */}
                <div className="absolute -bottom-3 left-4 right-4 h-3 bg-black/30 blur-xl rounded-full" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Panneau d'analyse en 3D */}
      <AnimatePresence>
        {selectedRate !== null && !analyzedRates[selectedRate] && (
          <motion.div
            initial={{ opacity: 0, x: 100, rotateY: -30, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, rotateY: -30, scale: 0.8 }}
            transition={{ type: "spring", damping: 20 }}
            style={{ perspective: "1000px" }}
            className="relative z-10 bg-gradient-to-br from-amber-950/40 to-black/60 border border-amber-500/30 rounded-xl p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(212,175,55,0.2)]"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-amber-400" />
              <h5 className="text-amber-400 font-mono text-sm uppercase tracking-wider">
                {lang === "fr" ? "Analyse détaillée" : "Detailed analysis"}
              </h5>
            </div>

            {/* Description du taux */}
            {exchangeRates[selectedRate].deviation_fr && (
              <p className="text-gray-300 text-sm mb-4 italic">
                "{lang === "fr"
                  ? exchangeRates[selectedRate].deviation_fr
                  : exchangeRates[selectedRate].deviation_en ||
                  exchangeRates[selectedRate].deviation_fr}"
              </p>
            )}

            {/* Taux proposé */}
            <div className="bg-black/30 p-4 rounded-lg border border-amber-500/20 mb-4">
              <span className="text-gray-500 text-[10px] uppercase block mb-1">
                {lang === "fr" ? "Taux proposé par le cambiste" : "Rate proposed by the changer"}
              </span>
              <span className="text-[#D4AF37] font-bold text-2xl font-mono">
                {exchangeRates[selectedRate].official_rate.toFixed(4)}
              </span>
              <p className="text-[10px] text-gray-500 mt-2">
                {lang === "fr"
                  ? "⚠️ Comparez ce taux avec le graphique de référence ci-dessus"
                  : "⚠️ Compare this rate with the reference chart above"}
              </p>
            </div>

            {/* Boutons de décision */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => handleAnalyzeRate("fraud")}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    {lang === "fr" ? "🚨 FRAUDE" : "🚨 FRAUD"}
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={() => handleAnalyzeRate("authentic")}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {lang === "fr" ? "✅ AUTHENTIQUE" : "✅ AUTHENTIC"}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`relative z-10 text-center font-mono text-sm p-4 rounded-xl border font-bold ${feedback.includes("✅")
                ? "bg-green-900/30 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                : "bg-red-900/30 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              }`}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boutons d'action */}
      <div className="relative z-10 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2 border border-red-500/30"
        >
          <X size={16} /> {lang === "fr" ? "Quitter" : "Abort"}
        </button>
      </div>
    </div>
  );
}