"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Clock, Lightbulb, Unlock, FileQuestion } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Template à appliquer à chaque mini-jeu :
interface Props {
  miniGame: any;
  miniGameSessionId?: string;        // Ajout
  initialState?: any;                // Ajout
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
  onStateChange?: (state: any) => void;  // Ajout
  onProgressUpdate?: (budgetCauris: number, caurisLost: number) => void;  // Ajout
  sessionId?: string;                // Ajout
  userId?: string;                   // Ajout
}

export default function PuzzleGame({
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
  const imageUrl = lang === "fr" ? config.puzzle_image_url_fr : (config.puzzle_image_url_en || config.puzzle_image_url_fr);
  const gridSize = config.grid_size || 3;

  // --- ETAT : SESSION ET BUDGET ---
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(null);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);

  // --- ETAT : TIMER ET INDICES ---
  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);
  const [showClues, setShowClues] = useState(false);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const clues = miniGame.mini_game_clues || [];

  // --- ETAT : JEU ---
  const [pieces, setPieces] = useState<number[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isVictory, setIsVictory] = useState(false);
  const [correctPieces, setCorrectPieces] = useState<boolean[]>([]);
  const [swapCount, setSwapCount] = useState(0);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ INITIALISER LA SESSION DU MINI-JEU
  useEffect(() => {
    const initMiniGameSession = async () => {
      try {
        if (!sessionId || !userId || !miniGame.id) {
          console.warn("Missing required props:", { sessionId, userId, miniGameId: miniGame.id });
          setIsInitialized(true);
          return;
        }

        // 1️⃣ Chercher une session existante pour ce mini-jeu
        const { data: existingSession, error: searchErr } = await supabase
          .from("investigation_mini_game_sessions")
          .select("*")
          .eq("mini_game_id", miniGame.id)
          .eq("investigation_session_id", sessionId)
          .eq("user_id", userId)
          .eq("status", "started")
          .maybeSingle();

        if (searchErr && searchErr.code !== "PGRST116") {
          console.error("Erreur recherche session:", searchErr);
        }

        let sessionData = existingSession;

        // 2️⃣ Si pas de session existante, en créer une
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
              mini_game_state: {
                pieces: [],
                swapCount: 0,
                correctPieces: [],
                revealedClues: [],
                startTime: Date.now(),
              },
            })
            .select()
            .single();

          if (createErr) {
            console.error("Erreur création session:", createErr);
            setIsInitialized(true);
            return;
          }
          sessionData = newSession;
        }

        setMiniGameSessionId(sessionData.id);
        setAttemptsCount(sessionData.attempts_count || 0);
        setTotalCaurisLost(sessionData.cauris_lost || 0);

        // 3️⃣ Récupérer l'état sauvegardé
        const savedState = sessionData.mini_game_state || {};
        if (savedState.revealedClues && Array.isArray(savedState.revealedClues)) {
          setUnlockedClues(savedState.revealedClues);
        }

        setIsInitialized(true);
      } catch (err) {
        console.error("Erreur init session mini-jeu:", err);
        setIsInitialized(true);
      }
    };

    initMiniGameSession();
  }, [sessionId, userId, miniGame.id]);

  // ✅ INITIALISATION DU PUZZLE
  useEffect(() => {
    if (!imageUrl) return;
    if (pieces.length > 0) return;

    const totalPieces = gridSize * gridSize;
    const initialPieces = Array.from({ length: totalPieces }, (_, i) => i);
    const randomRotations = Array.from({ length: totalPieces }, () => (Math.random() * 12) - 6);
    const initialCorrect = Array(totalPieces).fill(false);

    setRotations(randomRotations);
    setCorrectPieces(initialCorrect);

    for (let i = initialPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [initialPieces[i], initialPieces[j]] = [initialPieces[j], initialPieces[i]];
    }
    setPieces(initialPieces);
    setTimeLeft(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);
  }, [imageUrl, gridSize, miniGame.timer_seconds]);

  // ✅ GESTION DU TIMER
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitting || feedback || isVictory) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timerId);
          setFeedback("❌ " + (lang === "fr" ? "Temps écoulé !" : "Time's up!"));
          saveMiniGameSession("timeout", 0, 0);
          setTimeout(() => onFail(miniGame.penalty_per_error || 1), 1500);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, feedback, isVictory, lang, miniGame.penalty_per_error, onFail]);

  // ✅ DÉTECTION AUTOMATIQUE DE PIÈCES CORRECTES
  useEffect(() => {
    if (pieces.length === 0) return;
    const newCorrect = pieces.map((p, i) => p === i);
    setCorrectPieces(newCorrect);
  }, [pieces]);

  // ✅ SAUVEGARDER L'ÉTAT DU MINI-JEU EN BASE
  const saveMiniGameSession = async (
    status: "started" | "completed" | "failed" | "timeout" | "paused",
    score: number,
    caurisEarned: number
  ) => {
    if (!miniGameSessionId) return;

    try {
      const payload: any = {
        status,
        attempts_count: attemptsCount,
        cauris_lost: totalCaurisLost,
        cauris_earned: caurisEarned,
        current_score: score,
        mini_game_state: {
          pieces,
          swapCount,
          correctPieces,
          revealedClues: unlockedClues,
          startTime: Date.now(),
        },
      };

      if (status === "completed" || status === "failed" || status === "timeout") {
        payload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("investigation_mini_game_sessions")
        .update(payload)
        .eq("id", miniGameSessionId);

      if (error) {
        console.error("Erreur sauvegarde session:", error);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ✅ GESTION DES INDICES
  const handleBuyClue = (clue: any) => {
    const cost = clue.reveal_cost_cauris ?? 5;
    if (localBudget >= cost) {
      const newBudget = localBudget - cost;
      const newLost = totalCaurisLost + cost;
      
      setLocalBudget(newBudget);
      setTotalCaurisLost(newLost);
      setUnlockedClues((prev) => [...prev, clue.id]);

      // ✅ NOTIFIER LE PARENT EN TEMPS RÉEL
      if (onProgressUpdate) {
        onProgressUpdate(newBudget, newLost);
      }
    } else {
      setFeedback("❌ " + (lang === "fr" ? "Pas assez de Cauris pour cet indice !" : "Not enough Cauris!"));
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // ✅ LOGIQUE DE SWAP
  const handlePieceClick = (index: number) => {
    if (isVictory || isSubmitting) return;

    if (selectedIdx === null) {
      setSelectedIdx(index);
    } else {
      const newPieces = [...pieces];
      [newPieces[selectedIdx], newPieces[index]] = [newPieces[index], newPieces[selectedIdx]];
      setPieces(newPieces);
      setSelectedIdx(null);
      setSwapCount((prev) => prev + 1);
    }
  };

  // ✅ DRAG AND DROP
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    setDraggedPiece(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedPiece !== null && draggedPiece !== index) {
      const newPieces = [...pieces];
      [newPieces[draggedPiece], newPieces[index]] = [newPieces[index], newPieces[draggedPiece]];
      setPieces(newPieces);
      setSwapCount((prev) => prev + 1);
    }
    setDraggedPiece(null);
  };

  // ✅ VALIDATION DU PUZZLE
  const handleSubmit = async () => {
    if (isSubmitting || isVictory) return;
    setIsSubmitting(true);
    setFeedback(null);

    const isCorrect = pieces.every((p, i) => p === i);
    const newAttempts = attemptsCount + 1;

    setTimeout(async () => {
      if (isCorrect) {
        // ✅ VICTOIRE
        setIsVictory(true);
        setFeedback("✅ " + (lang === "fr" ? "Document restauré !" : "Document restored!"));
        const totalReward = miniGame.reward_cauris || 20;

        // Sauvegarder la victoire
        await saveMiniGameSession("completed", 100, totalReward);

        // ✅ Notifier le parent
        if (onProgressUpdate) {
          onProgressUpdate(localBudget, totalCaurisLost);
        }

        setTimeout(() => onComplete(100, totalReward), 3500);
      } else {
        // ❌ ERREUR
        const penalty = miniGame.penalty_per_error || 1;
        const newBudget = Math.max(0, localBudget - penalty);
        const newLost = totalCaurisLost + penalty;

        setLocalBudget(newBudget);
        setTotalCaurisLost(newLost);
        setAttemptsCount(newAttempts);
        setFeedback("❌ " + (lang === "fr" ? "La reconstitution est incorrecte" : "Incorrect assembly"));

        // ✅ NOTIFIER LE PARENT EN TEMPS RÉEL
        if (onProgressUpdate) {
          onProgressUpdate(newBudget, newLost);
        }

        // ✅ SAUVEGARDER APRÈS CHAQUE TENTATIVE ÉCHOUÉE
        await saveMiniGameSession("started", 0, 0);

        // Vérifier si on a dépassé le max de tentatives
        if (miniGame.max_attempts > 0 && newAttempts >= miniGame.max_attempts) {
          setFeedback(
            "❌ " +
            (lang === "fr"
              ? `Vous avez dépassé le nombre max de tentatives (${miniGame.max_attempts})`
              : `You exceeded the maximum attempts (${miniGame.max_attempts})`)
          );

          // Sauvegarder l'échec final
          await saveMiniGameSession("failed", 0, 0);

          setTimeout(() => onFail(penalty), 1500);
        } else {
          if (newBudget <= 0) {
            setFeedback(
              "❌ " +
              (lang === "fr"
                ? "Vous n'avez plus assez de Cauris pour continuer"
                : "You don't have enough Cauris to continue")
            );

            // Sauvegarder avant d'échouer
            await saveMiniGameSession("failed", 0, 0);

            setTimeout(() => onFail(penalty), 1500);
          } else {
            setTimeout(() => setFeedback(null), 2000);
          }
        }

        setIsSubmitting(false);
      }
    }, 800);
  };

  const getBackgroundPosition = (correctIndex: number) => {
    const col = correctIndex % gridSize;
    const row = Math.floor(correctIndex / gridSize);
    const x = (col / (gridSize - 1)) * 100;
    const y = (row / (gridSize - 1)) * 100;
    return `${x}% ${y}%`;
  };

  const correctCount = correctPieces.filter(Boolean).length;
  const totalPieces = gridSize * gridSize;
  const progressPercent = (correctCount / totalPieces) * 100;

  if (!imageUrl || !isInitialized)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      </div>
    );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* HEADER : TITRE, TIMER ET CONTRÔLES */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-xs uppercase tracking-widest">
          <FileQuestion size={16} className="text-[#D4AF37]" />
          {lang === "fr" ? "Reconstitution de Preuve" : "Evidence Reconstruction"}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {timeLeft !== null && (
            <motion.div
              animate={{ scale: timeLeft <= 10 ? [1, 1.05, 1] : 1 }}
              transition={{
                repeat: timeLeft <= 10 ? Infinity : 0,
                duration: 0.5,
              }}
              className={`flex items-center gap-1 font-mono text-xs md:text-sm px-2 md:px-3 py-1.5 rounded-lg transition-all font-bold border ${
                timeLeft <= 10
                  ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  : timeLeft <= 30
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : "bg-green-500/20 border-green-500/30 text-green-400"
              }`}
            >
              <Clock size={14} />
              {formatTime(timeLeft)}
            </motion.div>
          )}

          {clues.length > 0 && (
            <button
              onClick={() => setShowClues(!showClues)}
              className={`flex items-center gap-1 text-xs font-bold px-2 md:px-3 py-1.5 rounded-lg transition-all ${
                showClues
                  ? "bg-blue-600 text-white"
                  : "bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-900/50"
              }`}
            >
              <Lightbulb size={14} />
              <span className="hidden sm:inline">{lang === "fr" ? "Indices" : "Clues"}</span>
              <span className="bg-black/50 px-1.5 py-0.5 rounded-full text-[10px] ml-0.5 md:ml-1">
                {clues.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ✅ BARRE DE PROGRESSION */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-900 to-black p-3 md:p-4 rounded-xl border border-gray-800"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs md:text-sm font-mono text-gray-400">
            🧩 {lang === "fr" ? "Fragments au bon endroit" : "Correct Fragments"}
          </span>
          <span className="text-xs md:text-sm font-bold text-[#D4AF37]">
            {correctCount}/{totalPieces}
          </span>
        </div>
        <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-gray-700">
          <motion.div
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.5)]"
          />
        </div>
      </motion.div>

      {/* ✅ PANNEAU DES INDICES */}
      <AnimatePresence>
        {showClues && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 md:p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-blue-300">
                <span className="uppercase tracking-wider">
                  {lang === "fr" ? "📋 Dossier d'enquête" : "📋 Case File"}
                </span>
                <span className="text-[#D4AF37] bg-black/50 px-2 py-1 rounded-lg text-[10px]">
                  Budget: {localBudget} 💰
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {clues.map((clue: any, idx: number) => {
                  const isUnlocked = unlockedClues.includes(clue.id);
                  return (
                    <motion.div
                      key={clue.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-3 rounded-lg border transition-all ${
                        isUnlocked
                          ? "bg-blue-900/30 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                          : "bg-black/40 border-gray-700 hover:border-blue-500/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          💡 {lang === "fr" ? "Indice" : "Clue"} {idx + 1}
                        </span>
                        {!isUnlocked && (
                          <span className="text-[10px] text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                            {clue.reveal_cost_cauris ?? 5} 💰
                          </span>
                        )}
                      </div>
                      {isUnlocked ? (
                        <div className="space-y-2">
                          {(lang === "fr"
                            ? clue.text_fr
                            : clue.text_en || clue.text_fr) && (
                            <p className="text-xs text-blue-100 leading-relaxed">
                              {lang === "fr"
                                ? clue.text_fr
                                : clue.text_en || clue.text_fr}
                            </p>
                          )}

                          {clue.media_url && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                              {clue.media_url.match(
                                /\.(mp3|wav|ogg|m4a)$/i
                              ) ? (
                                <audio
                                  src={clue.media_url}
                                  controls
                                  className="w-full h-8"
                                />
                              ) : clue.media_url.match(/\.(mp4|webm)$/i) ? (
                                <video
                                  src={clue.media_url}
                                  controls
                                  className="w-full max-h-32 object-cover"
                                />
                              ) : (
                                <img
                                  src={clue.media_url}
                                  alt="Indice"
                                  className="w-full max-h-32 object-contain"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuyClue(clue)}
                          disabled={localBudget < (clue.reveal_cost_cauris ?? 5)}
                          className="w-full py-2 bg-white/5 hover:bg-blue-600/20 disabled:bg-red-500/10 text-gray-400 hover:text-blue-300 disabled:text-red-400 border border-dashed border-gray-700 hover:border-blue-500/50 disabled:border-red-500/30 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 font-bold"
                        >
                          <Unlock size={12} />{" "}
                          {lang === "fr"
                            ? "Débloquer l'indice"
                            : "Unlock clue"}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[10px] text-gray-500 font-mono uppercase tracking-wider">
        {lang === "fr"
          ? "👆 Touchez ou glissez deux fragments pour les échanger"
          : "👆 Tap or drag two fragments to swap them"}
      </p>

      {/* ✅ PLATEAU DU PUZZLE OPTIMISÉ */}
      <div className="bg-gradient-to-b from-[#2a2520] to-[#1a1a1a] p-4 md:p-6 rounded-xl border-2 border-gray-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden max-w-2xl mx-auto w-full">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] pointer-events-none" />

        <div
          className={`relative w-full mx-auto grid transition-all duration-1000 ${
            isVictory ? "gap-0" : "gap-2 md:gap-3"
          }`}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            aspectRatio: "1",
            maxWidth: "500px",
          }}
          onDragOver={handleDragOver}
        >
          <AnimatePresence>
            {pieces.map((pieceVal, idx) => {
              const isCorrect = correctPieces[idx];
              const isSelected = selectedIdx === idx;
              const isDragged = draggedPiece === idx;

              return (
                <motion.button
                  key={`${pieceVal}-${idx}`}
                  layout
                  draggable
                  onDragStart={(e) => handleDragStart(e as any, idx)}
                  onDragEnd={() => setDraggedPiece(null)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: isSelected ? 1.1 : isDragged ? 0.95 : 1,
                    rotate: isVictory ? 0 : rotations[pieceVal],
                    zIndex: isSelected ? 50 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  onClick={() => handlePieceClick(idx)}
                  className={`relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-300 ${
                    isVictory
                      ? "border-none rounded-none shadow-none"
                      : `p-[2px] md:p-[3px] bg-gradient-to-br from-[#f4ecd8] to-[#e8dcc8] border-2 rounded-lg shadow-[2px_4px_10px_rgba(0,0,0,0.5)] ${
                          isSelected
                            ? "shadow-[0_0_20px_rgba(212,175,55,0.6)] ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-black border-[#D4AF37]"
                            : isCorrect
                            ? "border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                            : "border-[#d3cbb8] hover:border-[#D4AF37]/50 hover:shadow-[2px_4px_15px_rgba(212,175,55,0.2)]"
                        }`
                  }`}
                >
                  <div
                    className={`w-full h-full ${
                      !isVictory && "border border-black/10"
                    }`}
                    style={{
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                      backgroundPosition: getBackgroundPosition(pieceVal),
                    }}
                  />

                  {isCorrect && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                      ✓
                    </div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>

          {isVictory && (
            <>
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  initial={{
                    opacity: 1,
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100,
                    scale: 1,
                  }}
                  animate={{
                    opacity: 0,
                    x: Math.random() * 400 - 200,
                    y: Math.random() * 400 - 200,
                    scale: 0,
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute pointer-events-none"
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                >
                  <div className="text-2xl">✨</div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`text-center font-mono text-sm md:text-base p-4 rounded-xl border font-bold transition-all ${
            feedback.includes("✅")
              ? "bg-green-900/30 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
              : "bg-red-900/30 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          }`}
        >
          {feedback}
        </motion.div>
      )}

      {!isVictory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-2 text-center text-xs"
        >
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <p className="text-gray-500 uppercase text-[10px] font-mono">
              {lang === "fr" ? "Échanges" : "Swaps"}
            </p>
            <p className="text-white font-bold text-lg">{swapCount}</p>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <p className="text-gray-500 uppercase text-[10px] font-mono">
              {lang === "fr" ? "Tentatives" : "Attempts"}
            </p>
            <p className="text-white font-bold text-lg">
              {attemptsCount}{miniGame.max_attempts > 0 ? `/${miniGame.max_attempts}` : ""}
            </p>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <p className="text-gray-500 uppercase text-[10px] font-mono">
              {lang === "fr" ? "Budget" : "Budget"}
            </p>
            <p className={`font-bold text-lg ${localBudget <= 0 ? "text-red-400" : "text-[#D4AF37]"}`}>
              {localBudget}
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 flex-wrap justify-center md:justify-start">
        <button
          onClick={async () => {
            await saveMiniGameSession("paused", 0, 0);
            if (onProgressUpdate) {
              onProgressUpdate(localBudget, totalCaurisLost);
            }
            onClose();
          }}
          disabled={isSubmitting || isVictory}
          className="flex-1 md:flex-none py-2 md:py-3 px-4 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 hover:border-red-500/50 rounded-xl text-xs md:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {lang === "fr" ? "Abandonner" : "Abort"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isVictory}
          className="flex-1 py-2 md:py-3 px-6 bg-gradient-to-r from-[#D4AF37] to-yellow-400 hover:from-white hover:to-gray-200 text-black rounded-xl text-xs md:text-sm font-bold transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {lang === "fr"
            ? "Vérifier la reconstitution"
            : "Verify reconstruction"}
        </button>
      </div>
    </div>
  );
}