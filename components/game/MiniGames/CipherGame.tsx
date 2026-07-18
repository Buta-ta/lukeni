"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Clock, Lightbulb, Unlock, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function CipherGame({
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
  
  // ✅ CORRECTION : Parenthèses correctes pour éviter undefined.toUpperCase()
  const encodedMessage = ((lang === "fr" ? config.encoded_message_fr : config.encoded_message_en || config.encoded_message_fr) || "").toUpperCase();
  const decodedMessage = ((lang === "fr" ? config.decoded_message_fr : config.decoded_message_en || config.decoded_message_fr) || "").toUpperCase();
  const shiftValue = config.shift_value || 3;

  // --- ÉTAT DU JEU ---
  const [currentShift, setCurrentShift] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [showClues, setShowClues] = useState(false);

  // --- TIMER ---
  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);

  // --- SESSION ---
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const clues = miniGame.mini_game_clues || [];

  // ✅ INITIALISER SESSION
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
          const { data: newSession, error: createErr } = await supabase
            .from("investigation_mini_game_sessions")
            .insert({
              investigation_session_id: sessionId,
              mini_game_id: miniGame.id,
              user_id: userId,
              status: "started",
              attempts_count: 0,
              cauris_lost: 0,
              mini_game_state: { currentShift: 0, revealedClues: [], startTime: Date.now() },
            })
            .select()
            .single();

          if (!createErr) sessionData = newSession;
        }

        if (sessionData) {
          setMiniGameSessionId(sessionData.id);
          setAttemptsCount(sessionData.attempts_count || 0);
          setTotalCaurisLost(sessionData.cauris_lost || 0);

          const savedState = sessionData.mini_game_state || {};
          if (savedState.currentShift !== undefined) setCurrentShift(savedState.currentShift);
          if (savedState.revealedClues) setUnlockedClues(savedState.revealedClues);
        }

        setIsInitialized(true);
      } catch (err) {
        console.error("Erreur init session:", err);
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
          setFeedback("❌ " + (lang === "fr" ? "Temps écoulé !" : "Time's up!"));
          setTimeout(() => onFail(miniGame.penalty_per_error || 2), 1500);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, feedback, lang, miniGame.penalty_per_error, onFail]);

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
        mini_game_state: { currentShift, revealedClues: unlockedClues, startTime: Date.now() },
        completed_at: status !== "started" && status !== "paused" ? new Date().toISOString() : null,
      }).eq("id", miniGameSessionId);
    } catch (err) {
      console.error("Erreur sauvegarde session:", err);
    }
  };

  // ✅ LOGIQUE DE DÉCHIFFREMENT CÉSAR
  const decodeChar = (char: string, shift: number): string => {
    if (!ALPHABET.includes(char)) return char;
    const idx = ALPHABET.indexOf(char);
    const decodedIdx = (idx - shift + ALPHABET.length) % ALPHABET.length;
    return ALPHABET[decodedIdx];
  };

  const decodedText = encodedMessage.split("").map(c => decodeChar(c, currentShift)).join("");
  const isCorrect = decodedText === decodedMessage;

  // ✅ ACHETER INDICE
  const handleBuyClue = (clue: any) => {
    const cost = clue.reveal_cost_cauris ?? 5;
    if (localBudget >= cost) {
      const newBudget = localBudget - cost;
      const newLost = totalCaurisLost + cost;
      setLocalBudget(newBudget);
      setTotalCaurisLost(newLost);
      setUnlockedClues((prev) => [...prev, clue.id]);
      if (onProgressUpdate) onProgressUpdate(newBudget, newLost);
    } else {
      setFeedback("❌ " + (lang === "fr" ? "Pas assez de Cauris !" : "Not enough Cauris!"));
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // ✅ SOUMISSION
  const handleSubmit = async () => {
    setIsSubmitting(true);

    setTimeout(async () => {
      if (isCorrect) {
        setFeedback(lang === "fr" ? "✅ Message décrypté !" : "✅ Message decoded!");
        await saveMiniGameSession("completed", 100, miniGame.reward_cauris || 20);
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 2000);
      } else {
        setFeedback(lang === "fr" ? "❌ Le décalage est incorrect" : "❌ Wrong shift value");
        const penalty = miniGame.penalty_per_error || 2;
        const newBudget = Math.max(0, localBudget - penalty);
        const newLost = totalCaurisLost + penalty;
        const newAttempts = attemptsCount + 1;

        setLocalBudget(newBudget);
        setTotalCaurisLost(newLost);
        setAttemptsCount(newAttempts);

        if (onProgressUpdate) onProgressUpdate(newBudget, newLost);
        await saveMiniGameSession("started", 0, 0);

        if (miniGame.max_attempts > 0 && newAttempts >= miniGame.max_attempts) {
          setFeedback("❌ " + (lang === "fr" ? `Max tentatives atteint` : `Max attempts reached`));
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else if (newBudget <= 0) {
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else {
          setTimeout(() => setFeedback(null), 2000);
        }
      }
      setIsSubmitting(false);
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ HEADER */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase tracking-widest">
          <KeyRound size={14} className="text-[#D4AF37]" />
          {lang === "fr" ? "Déchiffrement" : "Decryption"}
        </div>
        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 font-mono text-xs px-2 py-1 rounded font-bold border ${
              timeLeft <= 10 ? "bg-red-500/20 border-red-500/50 text-red-400"
              : timeLeft <= 30 ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
              : "bg-green-500/20 border-green-500/30 text-green-400"
            }`}>
              <Clock size={12} /> {formatTime(timeLeft)}
            </div>
          )}
          {clues.length > 0 && (
            <button onClick={() => setShowClues(!showClues)} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded ${showClues ? "bg-blue-600 text-white" : "bg-blue-900/30 text-blue-400 border border-blue-500/30"}`}>
              <Lightbulb size={12} /> 💰 {localBudget}
            </button>
          )}
        </div>
      </div>

      {/* ✅ INDICES */}
      {showClues && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-2 space-y-2 max-h-28 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {clues.map((clue: any) => {
              const isUnlocked = unlockedClues.includes(clue.id);
              return (
                <div key={clue.id} className={`p-2 rounded border text-[10px] ${isUnlocked ? "bg-blue-900/30 border-blue-500/50" : "bg-black/40 border-gray-700"}`}>
                  {isUnlocked ? (
                    <p className="text-blue-100">{lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}</p>
                  ) : (
                    <button onClick={() => handleBuyClue(clue)} disabled={localBudget < (clue.reveal_cost_cauris ?? 5)} className="w-full text-gray-400 hover:text-blue-300 disabled:text-red-400 flex items-center justify-center gap-1 font-bold">
                      <Unlock size={10} /> {clue.reveal_cost_cauris ?? 5} 💰
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ✅ DISQUE DE CHIFFREMENT VISUEL */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56">
          {/* Ring Extérieur (Fixe) */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-700 bg-black/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)_inset]">
            {/* Ring Intérieur (Rotatif) */}
            <motion.div
              className="absolute inset-4 rounded-full border-2 border-[#D4AF37]/50 bg-gray-900 flex items-center justify-center"
              animate={{ rotate: -(currentShift * (360 / ALPHABET.length)) }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Lettre active du ring intérieur (en haut) */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black w-6 h-6 flex items-center justify-center rounded-t font-mono text-xs font-black">
                {ALPHABET[currentShift % ALPHABET.length]}
              </div>
            </motion.div>

            {/* Indicateur du haut (A fixe) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black w-6 h-6 flex items-center justify-center rounded-t font-mono text-xs font-black z-10">
              A
            </div>
          </div>
        </div>

        {/* Slider de décalage */}
        <div className="w-full px-4">
          <label className="text-[9px] text-gray-400 font-mono uppercase mb-1 block text-center">
            {lang === "fr" ? "Décalage (Shift)" : "Shift Value"}: <span className="text-[#D4AF37] font-bold">{currentShift}</span>
          </label>
          <input
            type="range"
            min="0"
            max="25"
            value={currentShift}
            onChange={(e) => setCurrentShift(Number(e.target.value))}
            className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
        </div>
      </div>

      {/* ✅ MESSAGE DÉCHIFFRÉ EN TEMPS RÉEL */}
      <div className="space-y-2">
        <div className="bg-black/40 border border-gray-700 rounded-lg p-3">
          <p className="text-[9px] text-gray-500 font-mono uppercase mb-1">{lang === "fr" ? "📡 Message intercepté" : "📡 Intercepted message"}</p>
          <p className="text-gray-300 font-mono text-xs break-all">{encodedMessage || "..."}</p>
        </div>
        
        <div className={`border rounded-lg p-3 transition-all ${isCorrect ? 'bg-green-900/20 border-green-500/50' : 'bg-[#111] border-gray-800'}`}>
          <p className="text-[9px] text-gray-500 font-mono uppercase mb-1">{lang === "fr" ? "🔓 Traduction en cours" : "🔓 Decoding"}</p>
          <p className={`font-mono text-xs break-all ${isCorrect ? 'text-green-400' : 'text-white'}`}>{decodedText || "..."}</p>
        </div>
      </div>

      {/* ✅ FEEDBACK */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center font-mono text-xs p-2 rounded-lg border font-bold ${
            feedback.includes("✅") ? "bg-green-900/30 border-green-500/50 text-green-400"
            : "bg-red-900/30 border-red-500/50 text-red-400"
          }`}
        >
          {feedback}
        </motion.div>
      )}

      {/* ✅ BOUTONS */}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await saveMiniGameSession("paused", 0, 0);
            if (onProgressUpdate) onProgressUpdate(localBudget, totalCaurisLost);
            onClose();
          }}
          className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-all"
        >
          {lang === "fr" ? "Fermer" : "Close"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-2 bg-[#D4AF37] text-black hover:bg-white rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(212,175,55,0.3)] disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {lang === "fr" ? "Décrypter" : "Decode"}
        </button>
      </div>
    </div>
  );
}