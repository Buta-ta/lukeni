"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, Target, Eye, Clock, Lightbulb, Unlock, ZoomIn, ZoomOut, Lock } from "lucide-react";
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

export default function BallisticsGame({
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
  const imageUrl = lang === "fr" ? config.evidence_image_url_fr : (config.evidence_image_url_en || config.evidence_image_url_fr);
  const targetFocus = config.focus_target || 80;
  const targetLight = config.light_target || "white";

  // --- ÉTAT DU JEU ---
  const [focus, setFocus] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [showClues, setShowClues] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // --- TIMER ---
  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);

  // --- SESSION ---
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const clues = miniGame.mini_game_clues || [];

  // ✅ INITIALISER LA SESSION
  useEffect(() => {
    const initMiniGameSession = async () => {
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
              mini_game_state: { focus: 0, revealedClues: [], startTime: Date.now() },
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
          if (savedState.revealedClues && Array.isArray(savedState.revealedClues)) {
            setUnlockedClues(savedState.revealedClues);
          }
        }

        setIsInitialized(true);
      } catch (err) {
        console.error("Erreur init session:", err);
        setIsInitialized(true);
      }
    };

    initMiniGameSession();
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
      await supabase
        .from("investigation_mini_game_sessions")
        .update({
          status,
          attempts_count: attemptsCount,
          cauris_lost: totalCaurisLost,
          cauris_earned: caurisEarned,
          current_score: score,
          mini_game_state: { focus, revealedClues: unlockedClues, startTime: Date.now() },
          completed_at: status !== "started" && status !== "paused" ? new Date().toISOString() : null,
        })
        .eq("id", miniGameSessionId);
    } catch (err) {
      console.error("Erreur sauvegarde session:", err);
    }
  };

  // Calculs visuels (uniquement pour le flou, plus d'indicateur de proximité)
  const focusGap = Math.abs(focus - targetFocus);
  const isFocusCorrect = focusGap <=0;
  const currentBlur = focusGap / 10;

  const getLightFilter = () => {
    if (targetLight === "uv") return "hue-rotate(240deg) saturate(2) brightness(0.8) contrast(1.2)";
    if (targetLight === "ir") return "hue-rotate(0deg) saturate(5) sepia(1) brightness(0.6) contrast(2)";
    return "none";
  };

  // ✅ Calculs pour le Zoom (sans conflit CSS avec Framer Motion)
  const baseWidth = 150;
  const currentWidth = baseWidth * zoomLevel;
  const centerOffset = -(currentWidth / 2);

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

  // ✅ SOUMISSION (Toujours possible, le joueur peut se tromper)
  const handleSubmit = async () => {
    setIsSubmitting(true);

    setTimeout(async () => {
      if (isFocusCorrect) {
        setFeedback(lang === "fr" ? "✅ Analyse confirmée" : "✅ Analysis confirmed");
        await saveMiniGameSession("completed", 100, miniGame.reward_cauris || 20);
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback(lang === "fr" ? "❌ Cible floue, analyse échouée" : "❌ Blurry target, analysis failed");

        const penalty = miniGame.penalty_per_error || 2;
        const newBudget = Math.max(0, localBudget - penalty);
        const newLost = totalCaurisLost + penalty;
        const newAttempts = attemptsCount + 1;

        setLocalBudget(newBudget);
        setTotalCaurisLost(newLost);
        setAttemptsCount(newAttempts);

        // ✅ SYNCHRO PARENT POUR SAUVEGARDE IMMÉDIATE
        if (onProgressUpdate) onProgressUpdate(newBudget, newLost);
        await saveMiniGameSession("started", 0, 0);

        if (miniGame.max_attempts > 0 && newAttempts >= miniGame.max_attempts) {
          setFeedback("❌ " + (lang === "fr" ? `Max tentatives atteint (${miniGame.max_attempts})` : `Max attempts reached (${miniGame.max_attempts})`));
          await saveMiniGameSession("failed", 0, 0);
          setTimeout(() => onFail(penalty), 1500);
        } else {
          if (newBudget <= 0) {
            await saveMiniGameSession("failed", 0, 0);
            setTimeout(() => onFail(penalty), 1500);
          } else {
            setTimeout(() => setFeedback(null), 2000);
          }
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
    <div className="space-y-3">
      {/* ✅ HEADER COMPACT */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase tracking-widest">
          <Target size={14} className="text-[#D4AF37]" />
          {lang === "fr" ? "Analyse Balistique" : "Ballistics Analysis"}
        </div>

        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 font-mono text-xs px-2 py-1 rounded font-bold border ${
              timeLeft <= 10 ? "bg-red-500/20 border-red-500/50 text-red-400"
              : timeLeft <= 30 ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
              : "bg-green-500/20 border-green-500/30 text-green-400"
            }`}>
              <Clock size={12} />
              {formatTime(timeLeft)}
            </div>
          )}

          {clues.length > 0 && (
            <button
              onClick={() => setShowClues(!showClues)}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-all ${
                showClues ? "bg-blue-600 text-white" : "bg-blue-900/30 text-blue-400 border border-blue-500/30"
              }`}
            >
              <Lightbulb size={12} />
              <span className="hidden sm:inline">{lang === "fr" ? "Indices" : "Clues"}</span>
              <span className="bg-black/50 px-1 rounded text-[9px]">{clues.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* ✅ INDICES COMPACTS */}
      {showClues && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-2 space-y-2 max-h-32 overflow-y-auto">
          <div className="flex justify-between items-center text-[10px] font-mono text-blue-300">
            <span className="uppercase">{lang === "fr" ? "📋 Indices" : "📋 Clues"}</span>
            <span className="text-[#D4AF37]">💰 {localBudget}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {clues.map((clue: any, idx: number) => {
              const isUnlocked = unlockedClues.includes(clue.id);
              return (
                <div key={clue.id} className={`p-2 rounded border text-[10px] ${isUnlocked ? "bg-blue-900/30 border-blue-500/50" : "bg-black/40 border-gray-700"}`}>
                  {isUnlocked ? (
                    <p className="text-blue-100">{lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}</p>
                  ) : (
                    <button
                      onClick={() => handleBuyClue(clue)}
                      disabled={localBudget < (clue.reveal_cost_cauris ?? 5)}
                      className="w-full text-gray-400 hover:text-blue-300 disabled:text-red-400 flex items-center justify-center gap-1 font-bold"
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

      {/* ✅ MICROSCOPE + ZOOM */}
      <div className="flex flex-col items-center gap-2">
        <div 
          className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[8px] border-gray-900 bg-black shadow-[0_0_40px_rgba(0,0,0,0.8)_inset] overflow-hidden" 
          ref={containerRef}
        >
          {/* Réticule */}
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center opacity-20">
            <Target size={150} className="text-[#D4AF37]" strokeWidth={0.5} />
          </div>
          <div className="absolute inset-0 z-10 pointer-events-none rounded-full shadow-[0_0_20px_rgba(0,0,0,0.9)_inset]" />

          {/* ✅ Image avec Zoom par Taille (pas de conflit CSS avec Drag) */}
          <motion.img
            src={imageUrl}
            drag
            dragConstraints={containerRef}
            dragElastic={0.1}
            dragMomentum={false}
            className="absolute max-w-none cursor-grab active:cursor-grabbing"
            style={{
              width: `${currentWidth}%`,
              left: "50%",
              top: "50%",
              marginLeft: `${centerOffset}%`,
              marginTop: `${centerOffset}%`,
              filter: `blur(${currentBlur}px) ${getLightFilter()}`,
              transition: "filter 0.5s ease, width 0.3s ease, margin 0.3s ease",
            }}
          />
        </div>

        {/* Contrôles Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
            disabled={zoomLevel <= 1}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] font-mono text-gray-400 w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
            disabled={zoomLevel >= 4}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* ✅ PANNEAU DE CONTRÔLE COMPACT (SANS BARRE DE PROGRESSION) */}
      <div className="bg-[#111] border border-gray-800 p-3 rounded-xl space-y-3">
        
        {/* Filtre Imposé */}
        <div className="bg-black/40 border border-gray-700 rounded p-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-mono uppercase flex items-center gap-1">
            <Eye size={10} /> {lang === "fr" ? "Spectre" : "Spectrum"}
          </span>
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
            targetLight === "white" ? "bg-gray-200 text-black"
            : targetLight === "uv" ? "bg-purple-900 text-purple-200"
            : "bg-red-900 text-red-200"
          }`}>
            <Lock size={10} className="inline mr-1" />
            {targetLight === "white" ? (lang === "fr" ? "Blanc" : "White") 
            : targetLight === "uv" ? "UV" 
            : (lang === "fr" ? "Infrarouge" : "Infrared")}
          </span>
        </div>

        {/* Focus Slider (Seul contrôle du joueur) */}
        <div>
          <label className="text-[9px] text-gray-400 font-mono uppercase mb-1 block flex items-center justify-between">
            <span>🎯 {lang === "fr" ? "Molette de Netteté" : "Focus Dial"}</span>
            <span className="text-gray-500">{focus}</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={focus}
            onChange={(e) => setFocus(Number(e.target.value))}
            className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
          <div className="flex justify-between text-[8px] text-gray-600 font-mono mt-0.5">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* ✅ FEEDBACK COMPACT */}
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

      {/* ✅ BOUTONS (TOUJOURS ACTIFS) */}
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
          className="flex-[2] py-2 bg-[#D4AF37] text-black hover:bg-white rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(212,175,55,0.3)]"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {lang === "fr" ? "Scanner" : "Scan"}
        </button>
      </div>
    </div>
  );
}