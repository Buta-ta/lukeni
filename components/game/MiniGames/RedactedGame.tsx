"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, Clock, Lightbulb, Unlock, Eye, Flashlight } from "lucide-react";
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

export default function RedactedGame({
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
  const documentUrl = config.document_url || "";
  const hiddenText = lang === "fr" ? config.hidden_text_fr : config.hidden_text_en || config.hidden_text_fr || "";
  const revealType = config.reveal_type || "uv";
  const revealRadius = config.reveal_radius || 80;

  const [revealedAreas, setRevealedAreas] = useState<{ x: number; y: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const [totalCaurisLost, setTotalCaurisLost] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [showClues, setShowClues] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);
  const [miniGameSessionId, setMiniGameSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const clues = miniGame.mini_game_clues || [];

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
              mini_game_state: { revealedAreas: [], revealedClues: [], startTime: Date.now() },
            })
            .select()
            .single();
          if (newSession) sessionData = newSession;
        }

        if (sessionData) {
          setMiniGameSessionId(sessionData.id);
          setAttemptsCount(sessionData.attempts_count || 0);
          setTotalCaurisLost(sessionData.cauris_lost || 0);
          if (sessionData.mini_game_state?.revealedClues) setUnlockedClues(sessionData.mini_game_state.revealedClues);
          if (sessionData.mini_game_state?.revealedAreas) setRevealedAreas(sessionData.mini_game_state.revealedAreas);
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
          setFeedback("❌ " + (lang === "fr" ? "Temps écoulé!" : "Time's up!"));
          setTimeout(() => onFail(miniGame.penalty_per_error || 2), 1500);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, feedback, onFail, miniGame.penalty_per_error, lang]);

  // ✅ CHARGEMENT DE L'IMAGE UNE SEULE FOIS (Optimisation perf)
  useEffect(() => {
    if (!documentUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = documentUrl;
  }, [documentUrl]);

  // ✅ DESSIN DU CANVAS (Se met à jour au grattage)
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imageRef.current;

    // Redimensionner le canvas à la taille réelle de l'image
    canvas.width = img.width;
    canvas.height = img.height;

    // ÉTAPE 1 : DESSINER LE DOCUMENT (FOND)
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // ÉTAPE 2 : DESSINER LE TEXTE CACHÉ PAR-DESSUS L'IMAGE
    // Calcul de la taille de police proportionnelle à la largeur de l'image
    const fontSize = Math.max(18, canvas.width * 0.05);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const lines = hiddenText.split("\n");
    const lineHeight = fontSize * 1.2;
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;

    // Ajout d'un contour noir pour lisibilité
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = Math.max(2, fontSize * 0.1);
    ctx.lineJoin = "round";

    lines.forEach((line, idx) => {
      ctx.strokeText(line, centerX, startY + idx * lineHeight);
      ctx.fillText(line, centerX, startY + idx * lineHeight);
    });

    // ÉTAPE 3 : AJOUTER LE FILTRE DE COULEUR (Seulement dans les zones grattées)
    revealedAreas.forEach((area) => {
      const x = (area.x / 100) * canvas.width;
      const y = (area.y / 100) * canvas.height;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, revealRadius);

      if (revealType === "uv") {
        gradient.addColorStop(0, "rgba(139, 92, 246, 0.4)");
        gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
      } else if (revealType === "heat") {
        gradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");
        gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
      } else {
        gradient.addColorStop(0, "rgba(34, 197, 94, 0.4)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0)");
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, revealRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // ÉTAPE 4 : CRÉER LE MASQUE NOIR (Offscreen Canvas)
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    // Remplir le masque en noir
    maskCtx.fillStyle = "rgba(0, 0, 0, 0.98)";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Faire des "trous" dans le masque noir
    maskCtx.globalCompositeOperation = "destination-out";
    revealedAreas.forEach((area) => {
      const x = (area.x / 100) * maskCanvas.width;
      const y = (area.y / 100) * maskCanvas.height;
      
      // Gradient radial pour un pinceau à bords doux
      const gradient = maskCtx.createRadialGradient(x, y, 0, x, y, revealRadius);
      gradient.addColorStop(0, "rgba(0, 0, 0, 1)"); // Efface 100% au centre
      gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.8)"); // Bords semi-transparents
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Ne rien effacer

      maskCtx.fillStyle = gradient;
      maskCtx.beginPath();
      maskCtx.arc(x, y, revealRadius, 0, Math.PI * 2);
      maskCtx.fill();
    });

    // ÉTAPE 5 : APPLIQUER LE MASQUE SUR LE CANVAS PRINCIPAL
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(maskCanvas, 0, 0);

  }, [revealedAreas, imageLoaded, documentUrl, revealRadius, revealType, hiddenText]);

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
          mini_game_state: { revealedAreas: revealedAreas.slice(0, 200), revealedClues: unlockedClues, startTime: Date.now() },
          completed_at: status !== "started" && status !== "paused" ? new Date().toISOString() : null,
        })
        .eq("id", miniGameSessionId);
    } catch (err) {
      console.error("Erreur sauvegarde session:", err);
    }
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
      setFeedback("❌ " + (lang === "fr" ? "Pas assez de Cauris!" : "Not enough Cauris!"));
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // ✅ REVEAL AREA ON CLICK/DRAG
  const handleReveal = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setRevealedAreas((prev) => {
      if (prev.length >= 200) return prev; // Augmenté à 200 pour un meilleur grattage
      // Éviter de rajouter le point si la souris a très peu bougé
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.x - x) < 1.5 && Math.abs(last.y - y) < 1.5) return prev;
      
      return [...prev, { x, y }];
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    setTimeout(async () => {
      if (userAnswer.toUpperCase().trim() === hiddenText.toUpperCase().trim()) {
        setFeedback("✅ " + (lang === "fr" ? "Message révélé!" : "Message revealed!"));
        await saveMiniGameSession("completed", 100, miniGame.reward_cauris || 20);

        await markMiniGameComplete(miniGame.id, sessionId);
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 2000);
      } else {
        setFeedback("❌ " + (lang === "fr" ? "Réponse incorrecte" : "Incorrect answer"));
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60}`;

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
          <Eye size={14} className="text-[#D4AF37]" />
          {lang === "fr" ? "Document Classifié" : "Classified Document"}
        </div>
        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded font-bold border bg-purple-500/20 border-purple-500/30 text-purple-400">
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
                  className={`p-2 rounded border text-[10px] ${u ? "bg-blue-900/30 border-blue-500/50" : "bg-black/40 border-gray-700"}`}
                >
                  {u ? (
                    <p className="text-blue-100">{lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr}</p>
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

      {/* DOCUMENT AVEC CANVAS */}
      <div className="relative w-full bg-black border border-gray-700 rounded-lg overflow-hidden">
        {/* On n'affiche le canvas que quand l'image est prête */}
        {!imageLoaded ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="animate-spin text-gray-500 w-8 h-8" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair select-none touch-none"
            onMouseDown={handleReveal}
            onMouseMove={(e) => e.buttons === 1 && handleReveal(e as any)}
            onTouchStart={handleReveal}
            onTouchMove={handleReveal}
          />
        )}

        {/* Icône de révélation */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg p-2 flex items-center gap-1">
          <Flashlight size={14} className={revealType === "uv" ? "text-purple-400" : revealType === "heat" ? "text-red-400" : "text-green-400"} />
          <span className={`text-[9px] font-mono ${revealType === "uv" ? "text-purple-300" : revealType === "heat" ? "text-red-300" : "text-green-300"}`}>
            {revealType === "uv" ? "UV" : revealType === "heat" ? lang === "fr" ? "CHALEUR" : "HEAT" : lang === "fr" ? "GRATTAGE" : "SCRATCH"}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 font-mono text-center">
        {lang === "fr" ? "Glissez pour révéler le document caché" : "Drag to reveal the hidden document"}
      </p>

      {/* INPUT RÉPONSE */}
      <div>
        <label className="text-[9px] text-gray-400 font-mono uppercase mb-1 block">✍️ {lang === "fr" ? "Texte révélé" : "Revealed text"}</label>
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder={lang === "fr" ? "Tapez le texte révélé..." : "Type revealed text..."}
          className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* PROGRESSION */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
        <span>
          {lang === "fr" ? "Progression" : "Progress"}: {Math.min(100, Math.round((revealedAreas.length / 200) * 100))}%
        </span>
        <span className="text-[#D4AF37]">💰 {localBudget}</span>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center font-mono text-xs p-2 rounded-lg border font-bold ${feedback.includes("✅") ? "bg-green-900/30 border-green-500/50 text-green-400" : "bg-red-900/30 border-red-500/50 text-red-400"
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
          disabled={isSubmitting}
          className="flex-[2] py-2 bg-[#D4AF37] text-black hover:bg-white rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 shadow-[0_0_10px_rgba(212,175,55,0.3)] disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {lang === "fr" ? "Valider" : "Submit"}
        </button>
      </div>
    </div>
  );
}