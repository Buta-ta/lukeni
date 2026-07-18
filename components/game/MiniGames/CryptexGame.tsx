"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  Loader2,
  Send,
  Clock,
  Lightbulb,
  Unlock,
  ChevronUp,
  ChevronDown,
  Lock,
  UnlockIcon,
  Target,
} from "lucide-react";
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
const DRAG_STEP_PX = 24; // px nécessaires pour faire tourner l'anneau d'une lettre

export default function CryptexGame({
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

  const password = ((lang === "fr" ? config.password_fr : config.password_en || config.password_fr) || "LUKENI")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const hintPositions = config.hint_positions || [];

  // --- ÉTAT DU JEU ---
  const [rings, setRings] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastCorrectCount, setLastCorrectCount] = useState<number | null>(null); // ✅ feedback type Mastermind
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [showClues, setShowClues] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // --- TIMER ---
  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);

  // --- SESSION ---
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const startTimeRef = useRef<number>(Date.now()); // ✅ conserve le vrai temps de début

  // --- DRAG STATE (ref pour éviter re-render à chaque pixel) ---
  const dragState = useRef<{ ringIdx: number; startY: number; accumulated: number } | null>(null);

  // --- ANIMATION SHAKE ---
  const shakeControls = useAnimation();

  const clues = miniGame.mini_game_clues || [];
  const maxAttempts = miniGame.max_attempts || 0;

  // ✅ INITIALISER SESSION & RINGS
  useEffect(() => {
    const initRings = () => {
      const initialRings = password.split("").map((_, idx) => {
        if (hintPositions.includes(idx)) {
          return ALPHABET.indexOf(password[idx]);
        }
        return Math.floor(Math.random() * ALPHABET.length);
      });
      setRings(initialRings);
    };

    const init = async () => {
      try {
        if (!sessionId || !userId || !miniGame.id) {
          initRings();
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
              mini_game_state: { rings: [], revealedClues: [], startTime: Date.now() },
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

          // ✅ Conserver le vrai startTime d'origine (ne pas l'écraser à chaque save)
          if (savedState.startTime) {
            startTimeRef.current = savedState.startTime;
          }

          if (savedState.revealedClues && Array.isArray(savedState.revealedClues)) {
            setUnlockedClues(savedState.revealedClues);
          }
          if (savedState.rings && Array.isArray(savedState.rings) && savedState.rings.length === password.length) {
            setRings(savedState.rings);
          } else {
            initRings();
          }
        } else {
          initRings();
        }

        setIsInitialized(true);
      } catch (err) {
        console.error("Erreur init session:", err);
        initRings();
        setIsInitialized(true);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId, miniGame.id, password]);

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

  // ✅ SAUVEGARDER SESSION (conserve le vrai startTime)
  const saveMiniGameSession = async (status: string, score: number, caurisEarned: number) => {
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
          mini_game_state: { rings, revealedClues: unlockedClues, startTime: startTimeRef.current },
          completed_at: status !== "started" && status !== "paused" ? new Date().toISOString() : null,
        })
        .eq("id", miniGameSessionId);
    } catch (err) {
      console.error("Erreur sauvegarde session:", err);
    }
  };

  const moveRing = (index: number, direction: "up" | "down") => {
    if (isUnlocked) return;
    setRings((prev) => {
      const newRings = [...prev];
      const current = newRings[index];
      if (direction === "up") {
        newRings[index] = (current + 1) % ALPHABET.length;
      } else {
        newRings[index] = (current - 1 + ALPHABET.length) % ALPHABET.length;
      }
      return newRings;
    });
  };

  const isCorrect = rings.length === password.length && rings.every((r, idx) => ALPHABET[r] === password[idx]);

  // ✅ DRAG (pointer events) — tourner un anneau en glissant verticalement
  const handlePointerDown = (ringIdx: number) => (e: React.PointerEvent) => {
    if (isUnlocked) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { ringIdx, startY: e.clientY, accumulated: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || isUnlocked) return;
    const deltaY = e.clientY - dragState.current.startY;
    const diff = deltaY - dragState.current.accumulated;
    const steps = Math.trunc(diff / DRAG_STEP_PX);
    if (steps !== 0) {
      const direction = steps > 0 ? "down" : "up";
      for (let i = 0; i < Math.abs(steps); i++) {
        moveRing(dragState.current.ringIdx, direction);
      }
      dragState.current.accumulated += steps * DRAG_STEP_PX;
    }
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  // ✅ MOLETTE SOURIS (desktop)
  const handleWheel = (ringIdx: number) => (e: React.WheelEvent) => {
    if (isUnlocked) return;
    moveRing(ringIdx, e.deltaY > 0 ? "down" : "up");
  };

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

  const triggerShake = () => {
    shakeControls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.4 },
    });
  };

  // ✅ SOUMISSION
  const handleSubmit = async () => {
    setIsSubmitting(true);

    setTimeout(async () => {
      if (isCorrect) {
        setIsUnlocked(true);
        setLastCorrectCount(null);
        setFeedback(lang === "fr" ? "✅ Cryptex ouvert !" : "✅ Cryptex opened!");
        await saveMiniGameSession("completed", 100, miniGame.reward_cauris || 20);
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 2500);
      } else {
        // ✅ Feedback type "Mastermind" : nombre de lettres correctes SANS révéler lesquelles
        const correctCount = rings.filter((r, idx) => ALPHABET[r] === password[idx]).length;
        setLastCorrectCount(correctCount);
        triggerShake();

        setFeedback(lang === "fr" ? "❌ Combinaison incorrecte" : "❌ Wrong combination");
        const penalty = miniGame.penalty_per_error || 2;
        const newBudget = Math.max(0, localBudget - penalty);
        const newLost = totalCaurisLost + penalty;
        const newAttempts = attemptsCount + 1;

        setLocalBudget(newBudget);
        setTotalCaurisLost(newLost);
        setAttemptsCount(newAttempts);

        if (onProgressUpdate) onProgressUpdate(newBudget, newLost);
        await saveMiniGameSession("started", 0, 0);

        if (maxAttempts > 0 && newAttempts >= maxAttempts) {
          setFeedback("❌ " + (lang === "fr" ? `Max tentatives atteint (${maxAttempts})` : `Max attempts reached`));
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else if (newBudget <= 0) {
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else {
          setTimeout(() => {
            setFeedback(null);
          }, 2200);
        }
      }
      setIsSubmitting(false);
    }, 800);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!isInitialized || rings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
          {lang === "fr" ? "Chargement du cryptex..." : "Loading cryptex..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ HEADER */}
      <div className="space-y-2 border-b border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock size={16} className="text-[#D4AF37]" />
            {lang === "fr" ? "Cryptex" : "Cryptex"}
          </h3>

          {timeLeft !== null && (
            <motion.div
              animate={timeLeft <= 10 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 1 }}
              className={`flex items-center gap-1 font-mono text-xs px-2 py-1 rounded font-bold border ${
                timeLeft <= 10
                  ? "bg-red-500/20 border-red-500/50 text-red-400"
                  : timeLeft <= 30
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : "bg-green-500/20 border-green-500/30 text-green-400"
              }`}
            >
              <Clock size={12} /> {formatTime(timeLeft)}
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>
            {lang === "fr" ? "Tentative" : "Attempt"} {attemptsCount}
            {maxAttempts > 0 ? `/${maxAttempts}` : ""}
          </span>

          {clues.length > 0 && (
            <button
              onClick={() => setShowClues(!showClues)}
              className={`flex items-center gap-1 font-bold px-2 py-1 rounded ${
                showClues ? "bg-blue-600 text-white" : "bg-blue-900/30 text-blue-400 border border-blue-500/30"
              }`}
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
          className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-2 space-y-2 max-h-32 overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-2">
            {clues.map((clue: any) => {
              const isClueUnlocked = unlockedClues.includes(clue.id); // ✅ renommé (évite shadowing)
              return (
                <div
                  key={clue.id}
                  className={`p-2 rounded border text-[10px] ${
                    isClueUnlocked ? "bg-blue-900/30 border-blue-500/50" : "bg-black/40 border-gray-700"
                  }`}
                >
                  {isClueUnlocked ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-start gap-1.5"
                    >
                      <Lightbulb size={10} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-blue-100 leading-relaxed">
                        {lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}
                      </p>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => handleBuyClue(clue)}
                      disabled={localBudget < (clue.reveal_cost_cauris ?? 5)}
                      className="w-full py-1 text-gray-400 hover:text-blue-300 disabled:text-red-400 flex items-center justify-center gap-1 font-bold"
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

      {/* ✅ CRYPTEX VISUAL */}
      <div className="flex flex-col items-center gap-4 py-4">
        <motion.div
          animate={shakeControls}
          className={`relative flex items-center gap-1 p-3 bg-gradient-to-b from-[#2a2520] to-[#1a1a1a] border-2 ${
            isUnlocked ? "border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]" : "border-[#D4AF37]/30"
          } rounded-2xl shadow-2xl overflow-hidden`}
        >
          <motion.div
            className="absolute inset-0"
            animate={
              isUnlocked
                ? { boxShadow: "0 0 40px rgba(34,197,94,0.4) inset" }
                : { boxShadow: "0 0 0px rgba(34,197,94,0) inset" }
            }
          />
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] pointer-events-none" />

          {rings.map((letterIdx, ringIdx) => {
            const currentLetter = ALPHABET[letterIdx];
            const isHinted = hintPositions.includes(ringIdx);

            return (
              <div key={ringIdx} className="flex flex-col items-center gap-0.5 relative z-10">
                {/* ✅ Zone de clic agrandie (padding invisible) */}
                <button
                  onClick={() => moveRing(ringIdx, "up")}
                  disabled={isUnlocked}
                  className="p-2.5 -m-1 text-gray-500 hover:text-[#D4AF37] active:scale-90 disabled:opacity-20 transition-transform"
                >
                  <ChevronUp size={16} />
                </button>

                {/* ✅ Anneau : drag vertical + molette + PLUS de coloration "correcte" en live */}
                <div
                  onPointerDown={handlePointerDown(ringIdx)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel(ringIdx)}
                  className={`w-11 h-14 flex items-center justify-center rounded-lg font-mono text-2xl font-black border-2 select-none touch-none transition-colors duration-300 ${
                    isUnlocked
                      ? "bg-green-900/30 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)] cursor-default"
                      : "bg-black/50 border-gray-700 text-gray-200 cursor-grab active:cursor-grabbing hover:border-gray-500"
                  }`}
                >
                  {currentLetter}
                </div>

                <button
                  onClick={() => moveRing(ringIdx, "down")}
                  disabled={isUnlocked}
                  className="p-2.5 -m-1 text-gray-500 hover:text-[#D4AF37] active:scale-90 disabled:opacity-20 transition-transform"
                >
                  <ChevronDown size={16} />
                </button>

                {isHinted && !isUnlocked && <div className="text-[8px] text-[#D4AF37] font-mono mt-0.5">💡</div>}
              </div>
            );
          })}
        </motion.div>

        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest text-center">
          {isUnlocked
            ? lang === "fr"
              ? "🔓 Accès autorisé"
              : "🔓 Access granted"
            : lang === "fr"
            ? "Glissez ou cliquez pour aligner les lettres"
            : "Drag or click to align the letters"}
        </p>

        {/* ✅ FEEDBACK MASTERMIND : nombre de lettres correctes sans révéler lesquelles */}
        {lastCorrectCount !== null && !isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-950/20 border border-amber-500/30 px-3 py-1.5 rounded-full"
          >
            <Target size={12} />
            {lastCorrectCount} / {password.length}{" "}
            {lang === "fr" ? "lettres bien placées" : "letters in the right position"}
          </motion.div>
        )}
      </div>

      {/* ✅ FEEDBACK GÉNÉRAL */}
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

      {/* ✅ BOUTONS */}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await saveMiniGameSession("paused", 0, 0);
            if (onProgressUpdate) onProgressUpdate(localBudget, totalCaurisLost);
            onClose();
          }}
          className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 active:scale-95 transition-all"
        >
          {lang === "fr" ? "Fermer" : "Close"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isUnlocked}
          className="flex-[2] py-2.5 bg-[#D4AF37] text-black hover:bg-white active:scale-95 rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isUnlocked ? (
            <UnlockIcon size={14} />
          ) : (
            <Lock size={14} />
          )}
          {isUnlocked ? (lang === "fr" ? "Ouvert" : "Opened") : lang === "fr" ? "Ouvrir" : "Unlock"}
        </button>
      </div>
    </div>
  );
}