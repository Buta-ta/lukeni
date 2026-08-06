"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Clock, Lightbulb, Unlock, Languages, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  onProgressUpdate?: (budgetCauris: number, caurisLost: number) => void;
  budgetCauris: number;
  lang: "fr" | "en";
  sessionId: string;
  userId: string;
}

interface WordToTranslate {
  word: string;
  translation_fr: string;
  translation_en: string;
  wrong_options_fr: string[];
  wrong_options_en: string[];
}

export default function TranslationGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  onProgressUpdate,
  budgetCauris,
  lang,
  sessionId,
  userId,
}: Props) {
  const config = miniGame.config || {};
  const sourceLanguage = config.source_language || "Lingala";
  const wordsConfig: WordToTranslate[] = config.words_to_translate || [];
  const messageText = config.message_text || "";

  const [translatedWords, setTranslatedWords] = useState<Record<string, string>>({});
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [showClues, setShowClues] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const clues = miniGame.mini_game_clues || [];
  const allTranslated = wordsConfig.length > 0 && wordsConfig.every(w => translatedWords[w.word]);

  // ✅ INIT SESSION
  useEffect(() => {
    const init = async () => {
      try {
        if (!sessionId || !userId || !miniGame.id) {
          setIsInitialized(true);
          return;
        }
        const { data: existingSession } = await supabase
          .from("investigation_mini_game_sessions")
          .select("*")
          .eq("mini_game_id", miniGame.id)
          .eq("investigation_session_id", sessionId)
          .eq("user_id", userId)
          .eq("status", "started")
          .maybeSingle();
        
        let sessionData = existingSession;
        
        if (!existingSession) {
          const { data: newSession } = await supabase
            .from("investigation_mini_game_sessions")
            .insert({
              investigation_session_id: sessionId,
              mini_game_id: miniGame.id,
              user_id: userId,
              status: "started",
              attempts_count: 0,
              cauris_lost: 0,
              mini_game_state: { translatedWords: {}, revealedClues: [], startTime: Date.now() },
            })
            .select()
            .single();
          if (newSession) sessionData = newSession;
        }
        
        if (sessionData) {
          setMiniGameSessionId(sessionData.id);
          setAttemptsCount(sessionData.attempts_count || 0);
          setTotalCaurisLost(sessionData.cauris_lost || 0);
          if (sessionData.mini_game_state?.revealedClues) {
            setUnlockedClues(sessionData.mini_game_state.revealedClues);
          }
          if (sessionData.mini_game_state?.translatedWords) {
            setTranslatedWords(sessionData.mini_game_state.translatedWords);
          }
        }
        setIsInitialized(true);
      } catch {
        setIsInitialized(true);
      }
    };
    init();
  }, [sessionId, userId, miniGame.id]);

  // ✅ TIMER
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitting || feedback) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timerId);
          setFeedback("❌ Temps écoulé!");
          setTimeout(() => onFail(miniGame.penalty_per_error || 2), 1500);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, feedback, onFail, miniGame.penalty_per_error]);

  // ✅ SAUVEGARDER SESSION
  const saveMiniGameSession = async (status: string, score: number, caurisEarned: number) => {
    if (!miniGameSessionId) return;
    try {
      await supabase.from("investigation_mini_game_sessions").update({
        status,
        attempts_count: attemptsCount,
        cauris_lost: totalCaurisLost,
        cauris_earned: caurisEarned,
        current_score: score,
        mini_game_state: { translatedWords, revealedClues: unlockedClues, startTime: Date.now() },
        completed_at: status !== "started" && status !== "paused" ? new Date().toISOString() : null,
      }).eq("id", miniGameSessionId);
    } catch {}
  };

  // ✅ ACHETER INDICE
  const handleBuyClue = (clue: any) => {
    const cost = clue.reveal_cost_cauris ?? 5;
    if (localBudget >= cost) {
      const nb = localBudget - cost;
      const nl = totalCaurisLost + cost;
      setLocalBudget(nb);
      setTotalCaurisLost(nl);
      setUnlockedClues(p => [...p, clue.id]);
      if (onProgressUpdate) onProgressUpdate(nb, nl);
    } else {
      setFeedback("❌ Pas assez de Cauris!");
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // ✅ CHOIX DE TRADUCTION
  const handleWordChoice = async (word: string, choice: string, isCorrect: boolean) => {
    if (isCorrect) {
      setTranslatedWords(prev => ({ ...prev, [word]: choice }));
      setActiveWord(null);
    } else {
      const penalty = miniGame.penalty_per_error || 2;
      const nb = Math.max(0, localBudget - penalty);
      const nl = totalCaurisLost + penalty;
      setLocalBudget(nb);
      setTotalCaurisLost(nl);
      if (onProgressUpdate) onProgressUpdate(nb, nl);
      await saveMiniGameSession("started", 0, 0);
    }
  };

  // ✅ SOUMISSION
  const handleSubmit = async () => {
    if (!allTranslated) return;
    setIsSubmitting(true);
    setTimeout(async () => {
      setFeedback("✅ Message traduit!");
      await saveMiniGameSession("completed", 100, miniGame.reward_cauris || 20);
      await markMiniGameComplete(miniGame.id, sessionId);
      setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 2000);
      setIsSubmitting(false);
    }, 1000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60}`;

  // ✅ RENDER MESSAGE WITH CLICKABLE WORDS
const renderMessage = () => {
  if (!messageText) return null;
  
  // Trier les mots par longueur décroissante pour matcher les plus longs d'abord
  const sortedWords = [...wordsConfig].sort((a, b) => b.word.length - a.word.length);
  
  let remaining = messageText;
  const result = [];
  let lastIdx = 0;

  while (remaining.length > 0) {
    const found = sortedWords.find(w => 
      remaining.toLowerCase().startsWith(w.word.toLowerCase())
    );

    if (found) {
      // Avant le mot trouvé
      const beforeIdx = messageText.indexOf(remaining, lastIdx);
      if (beforeIdx > lastIdx) {
        result.push(
          <span key={result.length}>
            {messageText.substring(lastIdx, beforeIdx)}
          </span>
        );
      }

      const isTranslated = translatedWords[found.word];
      const isActive = activeWord === found.word;

      result.push(
        <button
          key={result.length}
          onClick={() => !isTranslated && setActiveWord(isActive ? null : found.word)}
          className={`inline-block px-1 py-0.5 rounded font-bold transition-all ${
            isTranslated
              ? 'bg-green-900/30 text-green-400 border-b-2 border-green-500'
              : isActive
              ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-b-2 border-[#D4AF37]'
              : 'bg-white/5 text-white border-b-2 border-gray-600 hover:border-[#D4AF37] cursor-pointer'
          }`}
        >
          {isTranslated ? `${found.word}(${translatedWords[found.word]})` : found.word}
        </button>
      );

      lastIdx = beforeIdx + found.word.length;
      remaining = messageText.substring(lastIdx);
    } else {
      // Pas trouvé, affiche le premier caractère
      result.push(
        <span key={result.length}>{remaining[0]}</span>
      );
      remaining = remaining.substring(1);
      lastIdx++;
    }
  }

  return result;
};

  if (!isInitialized) {
    return (
      <div className="flex justify-center h-40">
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase tracking-widest">
          <Languages size={14} className="text-[#D4AF37]" />
          {lang === "fr" ? "Décodage Culturel" : "Cultural Decoding"}
        </div>
        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded font-bold border bg-amber-500/20 border-amber-500/30 text-amber-400">
              <Clock size={12} />
              {formatTime(timeLeft)}
            </div>
          )}
          {clues.length > 0 && (
            <button
              onClick={() => setShowClues(!showClues)}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-blue-900/30 text-blue-400 border border-blue-500/30"
            >
              <Lightbulb size={12} />
              💰 {localBudget}
            </button>
          )}
        </div>
      </div>

      {/* INDICES */}
      {showClues && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-2 space-y-2 max-h-28 overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-2">
            {clues.map((clue: any) => {
              const u = unlockedClues.includes(clue.id);
              return (
                <div
                  key={clue.id}
                  className={`p-2 rounded border text-[10px] ${
                    u ? "bg-blue-900/30 border-blue-500/50" : "bg-black/40 border-gray-700"
                  }`}
                >
                  {u ? (
                    <p className="text-blue-100">
                      {lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleBuyClue(clue)}
                      disabled={localBudget < (clue.reveal_cost_cauris ?? 5)}
                      className="w-full text-gray-400 hover:text-blue-300 disabled:text-red-400 flex justify-center gap-1 font-bold"
                    >
                      <Unlock size={10} />
                      {clue.reveal_cost_cauris ?? 5} 💰
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* MESSAGE SOURCE */}
      <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
        <p className="text-[9px] text-gray-400 font-mono uppercase mb-2">
          📡 Message intercepté ({sourceLanguage})
        </p>
        <div className="text-white text-sm leading-relaxed font-serif">
          {renderMessage()}
        </div>
      </div>

      {/* OPTIONS POUR LE MOT SÉLECTIONNÉ */}
      <AnimatePresence>
        {activeWord && !translatedWords[activeWord] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#1a1a1a] border border-[#D4AF37]/30 rounded-lg p-3 space-y-2"
          >
            <p className="text-[10px] text-[#D4AF37] font-mono uppercase flex items-center gap-1">
              <Languages size={12} />
              Traduisez : <span className="text-white font-bold text-sm">"{activeWord}"</span>
            </p>
            <div className="space-y-1.5">
              {(() => {
                const wordCfg = wordsConfig.find(w => w.word === activeWord);
                if (!wordCfg) return null;

                const correct = lang === "fr" ? wordCfg.translation_fr : wordCfg.translation_en;
                const wrongs = lang === "fr" ? wordCfg.wrong_options_fr : wordCfg.wrong_options_en;

                const options = [correct, ...wrongs].sort(() => Math.random() - 0.5);

                return options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleWordChoice(activeWord, opt, opt === correct)}
                    className="w-full text-left p-2 bg-black/40 border border-gray-700 rounded text-xs text-gray-300 hover:border-[#D4AF37] hover:text-white transition-all"
                  >
                    {opt}
                  </button>
                ));
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROGRESSION */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
        <span>
          {lang === "fr" ? "Mots traduits" : "Words translated"}: {Object.keys(translatedWords).length}/{wordsConfig.length}
        </span>
        <span className="text-[#D4AF37]">💰 {localBudget}</span>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center font-mono text-xs p-2 rounded-lg border font-bold ${
            feedback.includes("✅")
              ? "bg-green-900/30 border-green-500/50 text-green-400"
              : "bg-red-900/30 border-red-500/50 text-red-400"
          }`}
        >
          {feedback}
        </motion.div>
      )}

      {/* BOUTONS */}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await saveMiniGameSession("paused", 0, 0);
            if (onProgressUpdate) onProgressUpdate(localBudget, totalCaurisLost);
            onClose();
          }}
          className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700"
        >
          {lang === "fr" ? "Fermer" : "Close"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allTranslated || isSubmitting}
          className="flex-[2] py-2 bg-[#D4AF37] text-black hover:bg-white rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 shadow-[0_0_10px_rgba(212,175,55,0.3)] disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {lang === "fr" ? "Valider" : "Submit"}
        </button>
      </div>
    </div>
  );
}