// components/game/MapGame.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, RotateCcw, MapPin, Clock, Lightbulb, DollarSign } from "lucide-react";
import dynamic from "next/dynamic";


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
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
  sessionId: string;
}

// Charger Leaflet dynamiquement pour éviter les problèmes SSR
const LeafletMap = dynamic(() => import("./MapGameGeo"), {
  loading: () => <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin size-8 text-purple-400" /></div>,
  ssr: false,
});

export default function MapGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
  sessionId,
}: Props) {
  const config = miniGame.config || {};
  const mapMode = config.map_mode || "image";
  const mapUrl = lang === "fr" ? config.map_url_fr : (config.map_url_en || config.map_url_fr);
  const points = config.points || [];
  const targetSequence = config.target_sequence || [];

  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // ✅ NOUVEAU : Timer
  const [timeLeft, setTimeLeft] = useState(miniGame.timer_seconds || 0);
  
  // ✅ NOUVEAU : Indices
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [localBudget, setLocalBudget] = useState(budgetCauris);

  // Sync budget avec le parent
  useEffect(() => {
    setLocalBudget(budgetCauris);
  }, [budgetCauris]);

  // ✅ NOUVEAU : Effet du Timer
  useEffect(() => {
    if (!miniGame.timer_seconds || miniGame.timer_seconds <= 0) return;
    
    if (timeLeft <= 0) {
      setFeedback(lang === "fr" ? "⏱️ Temps écoulé !" : "⏱️ Time's up!");
      const penalty = miniGame.penalty_per_error || 1;
      setTimeout(() => onFail(penalty), 1500);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, miniGame.timer_seconds, onFail, lang]);

  const handlePointClick = (id: string) => {
    if (selectedPath.includes(id) || feedback) return;
    setSelectedPath([...selectedPath, id]);
  };

  const handleReset = () => {
  // ✅ On peut reset même après une erreur, mais pas pendant la soumission
  if (isSubmitting) return;
  setSelectedPath([]);
  setFeedback(null);
};

  // ✅ CORRECTION : Toujours appeler onFail en cas de mauvaise réponse
  const handleSubmit = () => {
    if (selectedPath.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const isCorrect = JSON.stringify(selectedPath) === JSON.stringify(targetSequence);

    setTimeout(() => {
      if (isCorrect) {
        setFeedback(lang === "fr" ? "✅ Itinéraire confirmé" : "✅ Route confirmed");
        markMiniGameComplete(miniGame.id, sessionId);

        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback(lang === "fr" ? "❌ Tracé incorrect" : "❌ Incorrect route");
        const penalty = miniGame.penalty_per_error || 1;
        // ✅ On appelle toujours onFail pour déduire les Cauris
        onFail(penalty);
      }
      setIsSubmitting(false);
    }, 800);
  };

  // ✅ NOUVEAU : Révéler un indice
  const handleRevealClue = (clueId: string, cost: number) => {
    if (localBudget < cost) return;
    setRevealedClues(prev => [...prev, clueId]);
    setLocalBudget(prev => prev - cost);
    // Le parent gère la déduction réelle via onFail/onComplete, 
    // mais on met à jour l'UI locale
  };

  // ✅ NOUVEAU : Rendu du Timer
  const renderTimer = () => {
    if (!miniGame.timer_seconds || miniGame.timer_seconds <= 0) return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isUrgent = timeLeft <= 10;

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm font-bold border ${
        isUrgent 
          ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" 
          : "bg-black/50 border-white/20 text-white"
      }`}>
        <Clock size={14} />
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </div>
    );
  };

  // ✅ NOUVEAU : Rendu des Indices
  const renderClues = () => {
    const clues = miniGame.mini_game_clues || [];
    if (clues.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <Lightbulb size={12} /> {lang === "fr" ? "Indices disponibles" : "Available clues"}
        </p>
        {clues.map((clue: any) => {
          const isRevealed = revealedClues.includes(clue.id);
          const cost = clue.reveal_cost_cauris ?? 5;

          return (
            <div key={clue.id} className={`p-3 rounded-lg text-xs border ${
              isRevealed 
                ? "bg-blue-900/20 border-blue-500/30 text-blue-300" 
                : "bg-white/5 border-white/10"
            }`}>
              {isRevealed ? (
                <p className="italic leading-relaxed">
                  {lang === "fr" ? clue.text_fr : (clue.text_en || clue.text_fr)}
                </p>
              ) : (
                <button
                  onClick={() => handleRevealClue(clue.id, cost)}
                  disabled={localBudget < cost}
                  className="w-full flex items-center justify-between text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb size={12} />
                    {lang === "fr" ? "Révéler l'indice" : "Reveal clue"}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-[#D4AF37]">
                    {cost} <DollarSign size={12} />
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ✅ NOUVEAU : Rendu du Budget local
  const renderBudget = () => (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 border border-[#D4AF37]/30 rounded-full">
      <DollarSign size={14} className="text-[#D4AF37]" />
      <span className="font-mono text-xs font-bold text-[#D4AF37]">
        {localBudget}
      </span>
    </div>
  );

  // MODE IMAGE (ancien système)
  if (mapMode === "image") {
    if (!mapUrl) return <Loader2 className="animate-spin text-[#D4AF37] mx-auto" />;

    return (
      <div className="space-y-4">
        {/* ✅ HEADER : Timer + Budget */}
        <div className="flex items-center justify-between">
          {renderTimer()}
          {renderBudget()}
        </div>

        <p className="text-center text-xs text-gray-400 font-mono uppercase">
          {lang === "fr" ? "Tracez l'itinéraire chronologique" : "Trace the chronological route"}
        </p>

        {/* Conteneur de la Carte */}
        <div className="relative w-full aspect-[4/3] bg-black rounded-xl border border-gray-800 overflow-hidden shadow-inner">
          <img src={mapUrl} alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          
          {/* Lignes tracées */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {selectedPath.map((ptId, index) => {
              if (index === 0) return null;
              const prevPt = points.find((p: any) => p.id === selectedPath[index - 1]);
              const currPt = points.find((p: any) => p.id === ptId);
              if (!prevPt || !currPt) return null;

              return (
                <motion.line
                  key={`${prevPt.id}-${currPt.id}`}
                  x1={prevPt.x}
                  y1={prevPt.y}
                  x2={currPt.x}
                  y2={currPt.y}
                  stroke="#D4AF37"
                  strokeWidth="0.8"
                  strokeDasharray="1,1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              );
            })}
          </svg>

          {/* Les Points d'intérêt */}
          {points.map((pt: any) => {
            const isSelected = selectedPath.includes(pt.id);
            const orderIndex = selectedPath.indexOf(pt.id);

            return (
              <button
                key={pt.id}
                onClick={() => handlePointClick(pt.id)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 group"
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? "bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.8)]" : "bg-black/80 border border-white/50 text-white hover:bg-white/20"
                }`}>
                  {isSelected ? <span className="text-[8px] font-bold">{orderIndex + 1}</span> : <div className="w-1 h-1 bg-white rounded-full" />}
                </div>
                <span className={`mt-1 text-[8px] px-1 py-0.5 rounded backdrop-blur-sm font-bold whitespace-nowrap transition-all ${
                  isSelected ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-black/60 text-white opacity-0 group-hover:opacity-100"
                }`}>
                  {lang === "fr" ? pt.name_fr : (pt.name_en || pt.name_fr)}
                </span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`text-center font-mono text-sm p-3 rounded-lg border ${
              feedback.includes("✅") 
                ? "bg-green-900/20 border-green-500/30 text-green-400" 
                : "bg-red-900/20 border-red-500/30 text-red-400"
            }`}
          >
            {feedback}
          </motion.div>
        )}

        {/* ✅ INDICES PAYANTS */}
        {renderClues()}

        <div className="flex gap-2">
          <button onClick={handleReset} className="flex-[0.5] py-3 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center">
            <RotateCcw size={16} />
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30">
            {lang === "fr" ? "Annuler" : "Abort"}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={selectedPath.length === 0 || isSubmitting || !!feedback} 
            className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-30 disabled:bg-gray-800 transition-all"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {lang === "fr" ? "Tracer" : "Trace"}
          </button>
        </div>
      </div>
    );
  }

  // MODE GEO (Leaflet)
  return (
    <div className="space-y-4">
      {/* ✅ HEADER : Timer + Budget */}
      <div className="flex items-center justify-between">
        {renderTimer()}
        {renderBudget()}
      </div>

      <p className="text-center text-xs text-gray-400 font-mono uppercase flex items-center justify-center gap-2">
        <MapPin size={14} />
        {lang === "fr" ? "Cliquez sur les points géographiques dans l'ordre" : "Click on the geographic points in order"}
      </p>

      <LeafletMap
        points={config.geo_points || []}
        targetSequence={targetSequence}
        selectedPath={selectedPath}
        onPointClick={handlePointClick}
        lang={lang}
        center={config.map_center || [0, 0]}
        zoom={config.map_zoom || 4}
      />

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className={`text-center font-mono text-sm p-3 rounded-lg border ${
            feedback.includes("✅") 
              ? "bg-green-900/20 border-green-500/30 text-green-400" 
              : "bg-red-900/20 border-red-500/30 text-red-400"
          }`}
        >
          {feedback}
        </motion.div>
      )}

      {/* ✅ INDICES PAYANTS */}
      {renderClues()}

      <div className="flex gap-2">
        <button 
          onClick={handleReset} 
          className="flex-[0.5] py-3 bg-white/5 text-white rounded-xl text-xs font-bold hover:bg-white/10 flex justify-center items-center"
        >
          <RotateCcw size={16} />
        </button>
        <button 
          onClick={onClose} 
          className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30"
        >
          {lang === "fr" ? "Annuler" : "Abort"}
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={selectedPath.length === 0 || isSubmitting || !!feedback} 
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-30 disabled:bg-gray-800 transition-all"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider l'itinéraire" : "Validate route"}
        </button>
      </div>
    </div>
  );
}