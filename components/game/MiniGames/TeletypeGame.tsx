"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, Clock, Lightbulb, Unlock, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getLocalizedField } from "@/lib/miniGameUtils";



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

const MORSE_CODE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  " ": "/",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  "0": "-----",
};

export default function TeletypeGame({
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

  // ✅ FIX : utilisation du helper sécurisé (plus jamais de undefined.toUpperCase())
  const message = getLocalizedField(lang, config.message_fr, config.message_en);

  const codeType = config.code_type || "morse";
  const customAlphabet = config.custom_alphabet || {};

  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [showClues, setShowClues] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(
    miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null,
  );
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(
    null,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const clues = miniGame.mini_game_clues || [];

  // ✅ Encode Message (sécurisé : si message est vide, retourne un tableau vide)
  const encodedSignals = message
    ? message.split("").map((char) => {
        if (codeType === "morse") return MORSE_CODE[char] || char;
        if (codeType === "custom" && customAlphabet[char])
          return customAlphabet[char];
        return char;
      })
    : [];

  // ✅ Lexique affiché
  const lexicon = Object.entries(
    codeType === "morse" ? MORSE_CODE : customAlphabet,
  ).filter(([key]) => key !== " " && key !== "/");

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
              mini_game_state: { revealedClues: [], startTime: Date.now() },
            })
            .select()
            .single();
          if (newSession) sessionData = newSession;
        }
        if (sessionData) {
          setMiniGameSessionId(sessionData.id);
          setAttemptsCount(sessionData.attempts_count || 0);
          setTotalCaurisLost(sessionData.cauris_lost || 0);
          if (sessionData.mini_game_state?.revealedClues)
            setUnlockedClues(sessionData.mini_game_state.revealedClues);
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

  const saveMiniGameSession = async (
    status: string,
    score: number,
    caurisEarned: number,
  ) => {
    if (!miniGameSessionId) return;
    try {
      await supabase
        .from("investigation_mini_game_sessions")
        .update({
          status,
          attempts_count: attemptsCount,
          cauris_lost: totalCaurisLost,
          cauris_earned: caurisEarned,
          current_score: score,
          mini_game_state: {
            revealedClues: unlockedClues,
            startTime: Date.now(),
          },
          completed_at:
            status !== "started" && status !== "paused"
              ? new Date().toISOString()
              : null,
        })
        .eq("id", miniGameSessionId);
    } catch {}
  };

  const handleBuyClue = (clue: any) => {
    const cost = clue.reveal_cost_cauris ?? 5;
    if (localBudget >= cost) {
      const nb = localBudget - cost;
      const nl = totalCaurisLost + cost;
      setLocalBudget(nb);
      setTotalCaurisLost(nl);
      setUnlockedClues((p) => [...p, clue.id]);
      if (onProgressUpdate) onProgressUpdate(nb, nl);
    } else {
      setFeedback("❌ Pas assez de Cauris!");
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const handleSubmit = async () => {
    // ✅ Garde-fou : empêche la soumission si le message est vide (config incomplète)
    if (!message) {
      setFeedback("❌ Erreur de configuration du mini-jeu");
      return;
    }

    setIsSubmitting(true);
    setTimeout(async () => {
      if (userInput.toUpperCase().trim() === message.toUpperCase().trim()) {
        setFeedback("✅ Message décodé!");
        await saveMiniGameSession(
          "completed",
          100,
          miniGame.reward_cauris || 20,
        );
        await markMiniGameComplete(miniGame.id, sessionId);
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 2000);
      } else {
        setFeedback("❌ Décodage incorrect");
        const penalty = miniGame.penalty_per_error || 2;
        const nb = Math.max(0, localBudget - penalty);
        const nl = totalCaurisLost + penalty;
        const na = attemptsCount + 1;
        setLocalBudget(nb);
        setTotalCaurisLost(nl);
        setAttemptsCount(na);
        if (onProgressUpdate) onProgressUpdate(nb, nl);
        await saveMiniGameSession("started", 0, 0);
        if (miniGame.max_attempts > 0 && na >= miniGame.max_attempts) {
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else if (nb <= 0) {
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else {
          setTimeout(() => setFeedback(null), 2000);
        }
      }
      setIsSubmitting(false);
    }, 1000);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60}`;

  if (!isInitialized)
    return (
      <div className="flex justify-center h-40">
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      </div>
    );

  // ✅ Garde-fou : affichage d'une erreur claire si la config est incomplète
  // (plutôt qu'un crash silencieux ou un jeu vide non-jouable)
  if (!message) {
    return (
      <div className="space-y-4">
        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400 font-mono text-xs font-bold mb-2">
            ⚠️ Configuration incomplète
          </p>
          <p className="text-gray-400 text-[10px]">
            {lang === "fr"
              ? "Ce mini-jeu n'a pas de message configuré. Contactez un administrateur."
              : "This mini-game has no message configured. Contact an administrator."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700"
        >
          {lang === "fr" ? "Fermer" : "Close"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase tracking-widest">
          <Radio size={14} className="text-[#D4AF37]" />
          Téléscripteur
        </div>
        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded font-bold border bg-red-500/20 border-red-500/50 text-red-400">
              <Clock size={12} />
              {formatTime(timeLeft)}
            </div>
          )}
          {clues.length > 0 && (
            <button
              onClick={() => setShowClues(!showClues)}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-blue-900/30 text-blue-400 border border-blue-500/30"
            >
              <Lightbulb size={12} /> 💰 {localBudget}
            </button>
          )}
        </div>
      </div>

      {/* ✅ INDICES */}
      {showClues && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-2 space-y-2 max-h-28 overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-2">
            {clues.map((clue: any) => {
              const isClueUnlocked = unlockedClues.includes(clue.id);
              return (
                <div
                  key={clue.id}
                  className={`p-2 rounded border text-[10px] ${isClueUnlocked ? "bg-blue-900/30 border-blue-500/50" : "bg-black/40 border-gray-700"}`}
                >
                  {isClueUnlocked ? (
                    <p className="text-blue-100">
                      {lang === "fr"
                        ? clue.text_fr
                        : clue.text_en || clue.text_fr}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleBuyClue(clue)}
                      disabled={localBudget < (clue.reveal_cost_cauris ?? 5)}
                      className="w-full text-gray-400 hover:text-blue-300 disabled:text-red-400 flex justify-center gap-1 font-bold"
                    >
                      <Unlock size={10} /> {clue.reveal_cost_cauris ?? 5} 💰
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* BANDE DE SIGNAUX */}
      <div className="bg-black border border-green-500/30 rounded-lg p-3 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
        <p className="text-[9px] text-green-400 font-mono uppercase mb-2 flex items-center gap-1">
          <Radio size={10} /> Transmission Interceptée
        </p>
        <div className="font-mono text-green-300 text-xs break-all leading-relaxed bg-green-900/10 p-2 rounded border border-green-500/10 max-h-32 overflow-y-auto">
          {encodedSignals.map((sig, i) => (
            <span key={i} className="inline-block mr-3">
              {sig}
            </span>
          ))}
        </div>
      </div>

      {/* LEXIQUE */}
      <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
        <p className="text-[9px] text-gray-400 font-mono uppercase mb-2">
          📖 Lexique
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-28 overflow-y-auto">
          {lexicon.map(([char, code]) => (
            <div
              key={char}
              className="text-center bg-black/40 rounded p-1 border border-gray-800"
            >
              <div className="text-[10px] text-white font-bold">{char}</div>
              <div className="text-[8px] text-gray-500 font-mono truncate">
                {String(code)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INPUT */}
      <div>
        <label className="text-[9px] text-gray-400 font-mono uppercase mb-1 block">
          ✍️ Votre décodage
        </label>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={
            lang === "fr" ? "Tapez le message ici..." : "Type message here..."
          }
          className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center font-mono text-xs p-2 rounded-lg border font-bold ${feedback.includes("✅") ? "bg-green-900/30 border-green-500/50 text-green-400" : "bg-red-900/30 border-red-500/50 text-red-400"}`}
        >
          {feedback}
        </motion.div>
      )}

      {/* BOUTONS */}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await saveMiniGameSession("paused", 0, 0);
            if (onProgressUpdate)
              onProgressUpdate(localBudget, totalCaurisLost);
            onClose();
          }}
          className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700"
        >
          Fermer
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-2 bg-[#D4AF37] text-black hover:bg-white rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 shadow-[0_0_10px_rgba(212,175,55,0.3)] disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Décoder
        </button>
      </div>
    </div>
  );
}