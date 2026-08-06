"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  X,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Lightbulb,
  RotateCcw,
  CheckCircle,
  FileText,
  ScrollText,
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

interface Justification {
  id: string;
  text_fr: string;
  text_en: string;
  is_correct: boolean;
}

interface Clause {
  id: string;
  article_number: string;
  title_fr: string;
  title_en: string;
  text_fr: string;
  text_en: string;
  is_abusive: boolean;
  justifications: Justification[];
  explanation_fr: string;
  explanation_en: string;
}

type GamePhase = "intro" | "analysis" | "results";

export default function ContractClausesGame({
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
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [timeLeft, setTimeLeft] = useState(miniGame.timer_seconds || 300);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [finalScore, setFinalScore] = useState(0);
  const [caurisEarned, setCaurisEarned] = useState(0);

  const config = miniGame.config || {};
  const clues = miniGame.mini_game_clues || [];
  const penaltyPerError = miniGame.penalty_per_error || 0;
  const rewardCauris = miniGame.reward_cauris || 0;
  const minimumAbusiveCount = config.minimum_abusive_count || 3;

  // ── SYNC BUDGET ──
  useEffect(() => {
    setLocalBudget(budgetCauris);
  }, [budgetCauris]);

  // ── CHARGER LES DONNÉES ──
  useEffect(() => {
    setClauses(config.clauses || []);

    if (initialState) {
      if (initialState.phase) setPhase(initialState.phase);
      if (initialState.selectedClauses) setSelectedClauses(initialState.selectedClauses);
      if (initialState.justifications) setJustifications(initialState.justifications);
      if (initialState.revealedClues) setRevealedClues(initialState.revealedClues);
      if (initialState.isVictory) setIsVictory(initialState.isVictory);
      if (initialState.results) setResults(initialState.results);
      if (initialState.finalScore) setFinalScore(initialState.finalScore);
      if (initialState.caurisEarned) setCaurisEarned(initialState.caurisEarned);
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
          phase,
          selectedClauses,
          justifications,
          revealedClues,
          isVictory,
          results,
          finalScore,
          caurisEarned,
        });
      }
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [phase, selectedClauses, justifications, revealedClues, isVictory, results, finalScore, caurisEarned, onStateChange]);

  // ── TIMER ──
  useEffect(() => {
    if (!miniGame.timer_seconds || miniGame.timer_seconds <= 0) return;
    if (isVictory || phase === "intro") return;

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
  }, [timeLeft, miniGame.timer_seconds, onFail, lang, isVictory, phase, penaltyPerError]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── SÉLECTIONNER/DÉSÉLECTIONNER UNE CLAUSE ──
  const handleToggleClause = (clauseId: string) => {
    if (isVictory || isSubmitting) return;
    setSelectedClauses((prev) =>
      prev.includes(clauseId)
        ? prev.filter((id) => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  // ── SÉLECTIONNER UNE JUSTIFICATION ──
  const handleSelectJustification = (clauseId: string, justificationId: string) => {
    if (isVictory || isSubmitting) return;
    setJustifications((prev) => ({ ...prev, [clauseId]: justificationId }));
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

    // Vérifier que toutes les clauses sélectionnées ont une justification
    const missingJustifications = selectedClauses.filter(
      (id) => !justifications[id]
    );

    if (missingJustifications.length > 0) {
      setFeedback(
        lang === "fr"
          ? "❌ Vous devez justifier chaque clause sélectionnée"
          : "❌ You must justify each selected clause"
      );
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    // Vérifier le minimum
    const abusiveSelected = selectedClauses.filter((id) => {
      const clause = clauses.find((c) => c.id === id);
      return clause?.is_abusive;
    });

    if (abusiveSelected.length < minimumAbusiveCount) {
      setFeedback(
        lang === "fr"
          ? `❌ Vous devez trouver au moins ${minimumAbusiveCount} clauses abusives`
          : `❌ You must find at least ${minimumAbusiveCount} abusive clauses`
      );
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    setIsSubmitting(true);

    // Calculer les résultats
    let score = 0;
    let earned = 0;
    const newResults: Record<string, any> = {};

    clauses.forEach((clause) => {
      const isSelected = selectedClauses.includes(clause.id);
      const selectedJustId = justifications[clause.id];
      const selectedJust = clause.justifications.find((j) => j.id === selectedJustId);
      const isJustCorrect = selectedJust?.is_correct || false;

      let clauseScore = 0;
      let clauseEarned = 0;
      let verdict: "correct_abusive" | "correct_acceptable" | "wrong_abusive" | "wrong_acceptable" | "missed" = "missed";

      if (clause.is_abusive) {
        if (isSelected) {
          if (isJustCorrect) {
            verdict = "correct_abusive";
            clauseScore += 15; // +10 sélection +5 justification
            clauseEarned += 15;
          } else {
            verdict = "wrong_abusive";
            clauseScore += 5; // Juste la sélection
            clauseEarned += 5;
          }
        } else {
          verdict = "missed";
          clauseScore -= 5;
        }
      } else {
        if (isSelected) {
          verdict = "wrong_acceptable";
          clauseScore -= 10;
          clauseEarned -= 10;
          if (penaltyPerError > 0) {
            const newBudget = Math.max(0, localBudget + clauseEarned);
            setLocalBudget(newBudget);
            if (onProgressUpdate) onProgressUpdate(newBudget, Math.abs(clauseEarned));
          }
        } else {
          verdict = "correct_acceptable";
          clauseScore += 5;
          clauseEarned += 5;
        }
      }

      score += clauseScore;
      earned += clauseEarned;

      newResults[clause.id] = {
        isSelected,
        selectedJustId,
        isJustCorrect,
        verdict,
        clauseScore,
      };
    });

    // Bonus si toutes les clauses abusives trouvées
    const allAbusiveFound = clauses
      .filter((c) => c.is_abusive)
      .every((c) => selectedClauses.includes(c.id));

    if (allAbusiveFound) {
      score += 20;
      earned += 20;
    }

    score = Math.max(0, score);
    earned = Math.max(0, earned);

    setResults(newResults);
    setFinalScore(score);
    setCaurisEarned(earned);

    setTimeout(() => {
      setIsVictory(true);
      setPhase("results");
      setIsSubmitting(false);
    }, 800);
  };

  // ── RESET ──
  const handleReset = () => {
    if (isVictory || isSubmitting) return;
    setSelectedClauses([]);
    setJustifications({});
    setFeedback(null);
    setExpandedClause(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // ÉCRAN D'INTRO
  // ════════════════════════════════════════════════════
  if (phase === "intro") {
    return (
      <div className="space-y-4">
        {/* En-tête du contrat */}
        <div className="bg-amber-950/30 border-2 border-amber-500/40 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <ScrollText size={32} className="text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                {lang === "fr" ? config.title_fr : config.title_en}
              </h2>
              <p className="text-[10px] text-amber-400 font-mono uppercase">
                {lang === "fr" ? "Document officiel" : "Official document"}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-500">{lang === "fr" ? "Entre :" : "Between:"}</span>
              <span className="font-bold text-white">
                {lang === "fr" ? config.state_name_fr : config.state_name_en}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-500">{lang === "fr" ? "Et :" : "And:"}</span>
              <span className="font-bold text-white">
                {lang === "fr" ? config.company_name_fr : config.company_name_en}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-500">{lang === "fr" ? "Date :" : "Date:"}</span>
              <span className="font-mono">{config.date}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-500">{lang === "fr" ? "Référence :" : "Reference:"}</span>
              <span className="font-mono">{config.reference}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-gray-500">{lang === "fr" ? "Objet :" : "Object:"}</span>
              <span className="text-right max-w-[60%]">
                {lang === "fr" ? config.object_fr : config.object_en}
              </span>
            </div>
          </div>

          {/* Image du contrat */}
          {config.contract_image_url && (
            <div className="bg-gray-900 rounded-lg p-3 border border-white/10">
              <img
                src={config.contract_image_url}
                alt="Contract"
                className="w-full h-48 object-contain"
              />
            </div>
          )}

          {/* Mission */}
          <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
            <p className="text-amber-400 font-mono text-[10px] uppercase font-bold mb-2">
              {lang === "fr" ? "🎯 Votre mission" : "🎯 Your mission"}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {lang === "fr"
                ? `Analysez ce contrat et identifiez les clauses abusives (désavantageuses pour l'État). Vous devez trouver au moins ${minimumAbusiveCount} clauses abusives et justifier chaque sélection.`
                : `Analyze this contract and identify the abusive clauses (disadvantageous to the State). You must find at least ${minimumAbusiveCount} abusive clauses and justify each selection.`}
            </p>
          </div>
        </div>

        {/* Bouton commencer */}
        <button
          onClick={() => setPhase("analysis")}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
        >
          <FileText size={18} />
          {lang === "fr" ? "COMMENCER L'ANALYSE" : "START ANALYSIS"}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2 border border-red-500/30"
        >
          <X size={16} /> {lang === "fr" ? "Quitter" : "Abort"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // ÉCRAN DE RÉSULTATS
  // ════════════════════════════════════════════════════
  if (phase === "results") {
    return (
      <div className="space-y-4">
        {/* Score */}
        <div className="bg-amber-950/30 border-2 border-amber-500/40 rounded-xl p-6 text-center">
          <p className="text-amber-400 font-mono text-[10px] uppercase font-bold mb-2">
            {lang === "fr" ? "Résultat de l'analyse" : "Analysis Result"}
          </p>
          <p className="text-4xl font-bold text-white mb-2">{finalScore}</p>
          <p className="text-amber-400 font-mono text-sm">
            💰 +{caurisEarned} Cauris
          </p>
        </div>

        {/* Détails par article */}
        <div className="space-y-3">
          {clauses.map((clause) => {
            const result = results[clause.id];
            if (!result) return null;

            const isCorrect =
              result.verdict === "correct_abusive" ||
              result.verdict === "correct_acceptable";

            const selectedJust = clause.justifications.find(
              (j) => j.id === result.selectedJustId
            );

            return (
              <motion.div
                key={clause.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border-2 p-4 space-y-3 ${
                  isCorrect
                    ? "bg-green-900/20 border-green-500/50"
                    : "bg-red-900/20 border-red-500/50"
                }`}
              >
                {/* En-tête */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase">
                      {clause.article_number}
                    </p>
                    <h4 className="text-sm font-bold text-white">
                      {lang === "fr" ? clause.title_fr : clause.title_en}
                    </h4>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isCorrect
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {isCorrect ? "✓" : "✗"} {result.clauseScore > 0 ? "+" : ""}
                    {result.clauseScore}
                  </div>
                </div>

                {/* Texte de la clause */}
                <div className="bg-black/30 rounded p-3 border border-white/10">
                  <p className="text-xs text-gray-300 italic">
                    "{lang === "fr" ? clause.text_fr : clause.text_en}"
                  </p>
                </div>

                {/* Verdict */}
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 font-mono uppercase font-bold">
                    {lang === "fr" ? "Verdict" : "Verdict"}
                  </p>

                  {clause.is_abusive ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold">
                        ❌ {lang === "fr" ? "Clause ABUSIVE" : "ABUSIVE clause"}
                      </span>
                      {result.verdict === "correct_abusive" && (
                        <span className="text-xs text-green-400 font-bold">
                          ✓ {lang === "fr" ? "Correctement identifiée" : "Correctly identified"}
                        </span>
                      )}
                      {result.verdict === "missed" && (
                        <span className="text-xs text-red-400 font-bold">
                          ⚠️ {lang === "fr" ? "Vous n'avez pas sélectionné cette clause" : "You did not select this clause"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold">
                        ✓ {lang === "fr" ? "Clause acceptable" : "Acceptable clause"}
                      </span>
                      {result.verdict === "correct_acceptable" && (
                        <span className="text-xs text-green-400 font-bold">
                          ✓ {lang === "fr" ? "Correctement ignorée" : "Correctly ignored"}
                        </span>
                      )}
                      {result.verdict === "wrong_acceptable" && (
                        <span className="text-xs text-red-400 font-bold">
                          ⚠️ {lang === "fr" ? "Vous avez sélectionné cette clause à tort" : "You wrongly selected this clause"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Justification */}
                {result.isSelected && selectedJust && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <p className="text-[10px] text-gray-500 font-mono uppercase font-bold">
                      {lang === "fr" ? "Votre justification" : "Your justification"}
                    </p>
                    <div
                      className={`p-2 rounded border ${
                        result.isJustCorrect
                          ? "bg-green-900/20 border-green-500/30"
                          : "bg-red-900/20 border-red-500/30"
                      }`}
                    >
                      <p className="text-xs text-gray-300">
                        "{lang === "fr" ? selectedJust.text_fr : selectedJust.text_en}"
                      </p>
                      <p
                        className={`text-[10px] font-bold mt-1 ${
                          result.isJustCorrect ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {result.isJustCorrect
                          ? lang === "fr"
                            ? "✓ Justification correcte"
                            : "✓ Correct justification"
                          : lang === "fr"
                          ? "✗ Justification incorrecte"
                          : "✗ Incorrect justification"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Explication pédagogique */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="text-[10px] text-gray-500 font-mono uppercase font-bold">
                    {lang === "fr" ? "💡 Pourquoi ?" : "💡 Why?"}
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {lang === "fr" ? clause.explanation_fr : clause.explanation_en}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2 border border-red-500/30"
          >
            <X size={16} /> {lang === "fr" ? "Fermer" : "Close"}
          </button>
          <button
            onClick={() => {
              markMiniGameComplete(miniGame.id, sessionId); 
              onComplete(finalScore, caurisEarned);
            }}
            className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs font-bold flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            <Send size={16} />
            {lang === "fr" ? "Continuer l'enquête" : "Continue investigation"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // ÉCRAN D'ANALYSE
  // ════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-400" />
          <h3 className="text-gray-300 font-mono text-sm tracking-widest uppercase">
            {lang === "fr" ? "Analyse du contrat" : "Contract Analysis"}
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

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 border border-amber-500/30 rounded-lg">
            <DollarSign size={14} className="text-amber-400" />
            <span className="font-mono text-xs font-bold text-amber-400">
              {localBudget}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <span className="text-[10px] text-blue-400 font-mono font-bold">
              🎯 {selectedClauses.length} / {minimumAbusiveCount} min
            </span>
          </div>
        </div>
      </div>

      {/* Image du contrat en haut */}
      {config.contract_image_url && (
        <div className="bg-gray-900 rounded-lg p-2 border border-white/10">
          <img
            src={config.contract_image_url}
            alt="Contract"
            className="w-full h-32 object-contain"
          />
        </div>
      )}

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

      {/* Instructions */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3">
        <p className="text-gray-300 text-xs leading-relaxed">
          {lang === "fr"
            ? `Sélectionnez les clauses abusives et justifiez chaque sélection. Minimum ${minimumAbusiveCount} clauses à trouver.`
            : `Select abusive clauses and justify each selection. Minimum ${minimumAbusiveCount} clauses to find.`}
        </p>
      </div>

      {/* Liste des clauses */}
      <div className="space-y-3">
        {clauses.map((clause) => {
          const isSelected = selectedClauses.includes(clause.id);
          const isExpanded = expandedClause === clause.id;
          const selectedJustId = justifications[clause.id];

          return (
            <motion.div
              key={clause.id}
              className={`rounded-lg border-2 overflow-hidden transition-all ${
                isSelected
                  ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  : "bg-white/5 border-white/10 hover:border-white/30"
              }`}
            >
              {/* En-tête */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleClause(clause.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? "bg-amber-500 border-amber-500"
                        : "border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    {isSelected && <CheckCircle size={14} className="text-black" />}
                  </button>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-[10px] text-gray-500 font-mono uppercase">
                          {clause.article_number}
                        </p>
                        <h4 className="text-sm font-bold text-white">
                          {lang === "fr" ? clause.title_fr : clause.title_en}
                        </h4>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedClause(isExpanded ? null : clause.id)
                        }
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-500" />
                        )}
                      </button>
                    </div>

                    {/* Texte de la clause */}
                    <p className="text-xs text-gray-300 leading-relaxed">
                      "{lang === "fr" ? clause.text_fr : clause.text_en}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Justifications (si sélectionnée) */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-amber-500/30 bg-black/30"
                  >
                    <div className="p-4 space-y-2">
                      <p className="text-[10px] text-amber-400 font-mono uppercase font-bold">
                        {lang === "fr"
                          ? "Pourquoi cette clause est-elle abusive ?"
                          : "Why is this clause abusive?"}
                      </p>

                      {/* Mélanger les justifications pour l'affichage */}
                      {[...clause.justifications]
                        .sort(() => Math.random() - 0.5)
                        .map((just) => {
                          const isJustSelected = selectedJustId === just.id;

                          return (
                            <button
                              key={just.id}
                              onClick={() =>
                                handleSelectJustification(clause.id, just.id)
                              }
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                isJustSelected
                                  ? "bg-amber-500/20 border-amber-500 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                                  : "bg-white/5 border-white/10 hover:border-amber-500/50"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isJustSelected
                                      ? "bg-amber-500 border-amber-500"
                                      : "border-gray-600"
                                  }`}
                                >
                                  {isJustSelected && (
                                    <div className="w-2 h-2 bg-black rounded-full" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-300">
                                  {lang === "fr" ? just.text_fr : just.text_en}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
          disabled={isSubmitting || isVictory || selectedClauses.length === 0}
          className="py-3 px-4 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={16} />
        </button>
                <button
          onClick={handleSubmit}
          disabled={
            selectedClauses.length < minimumAbusiveCount ||
            isSubmitting ||
            isVictory ||
            // Vérifier que toutes les clauses sélectionnées ont une justification
            selectedClauses.some((id) => !justifications[id])
          }
          className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {lang === "fr" ? "Valider l'analyse" : "Validate Analysis"}
        </button>
      </div>
    </div>
  );
}