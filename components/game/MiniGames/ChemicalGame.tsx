"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, RotateCcw, Send, Activity, FlaskConical } from "lucide-react";



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
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
  sessionId: string;
}

export default function ChemicalGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
  sessionId, 
}: Props) {
  const config = miniGame.config || {};
  const referenceImageUrl = config.reference_image_url;
  const samples = config.samples || [];
  const similarityThreshold = config.similarity_threshold || 85;

  const [isLoading, setIsLoading] = useState(false);
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<{ idx: number, score: number } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectSample = (idx: number) => {
    if (isAnalyzing || isSubmitting) return;
    setSelectedSampleIdx(idx);
    setAnalyzedData(null);
    setFeedback(null);
  };

  const handleAnalyze = () => {
    if (selectedSampleIdx === null) return;
    setIsAnalyzing(true);
    setFeedback(null);

    // Simulation de l'analyse (1.5 sec)
    setTimeout(() => {
      const sample = samples[selectedSampleIdx];
      // Si c'est la bonne réponse, score élevé. Sinon, score aléatoire bas.
      const score = sample.is_correct 
        ? Math.floor(Math.random() * (100 - similarityThreshold + 1)) + similarityThreshold 
        : Math.floor(Math.random() * (similarityThreshold - 10));
      
      setAnalyzedData({ idx: selectedSampleIdx, score });
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!analyzedData) return;
    setIsSubmitting(true);

    const isCorrect = samples[analyzedData.idx].is_correct && analyzedData.score >= similarityThreshold;

    setTimeout(() => {
      if (isCorrect) {
        const name = lang === "fr" ? samples[analyzedData.idx].name_fr : (samples[analyzedData.idx].name_en || samples[analyzedData.idx].name_fr);
        setFeedback(`✅ ${lang === "fr" ? "Correspondance" : "Match"}: ${name}`);

        markMiniGameComplete(miniGame.id, sessionId);
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 25), 1500);
      } else {
        setFeedback("❌ " + (lang === "fr" ? "Substance non identifiée" : "Substance unidentified"));
        const penalty = miniGame.penalty_per_error || 2;
        if (budgetCauris - penalty <= 0) onFail(penalty);
      }
      setIsSubmitting(false);
    }, 800);
  };

  if (!referenceImageUrl) return <Loader2 className="animate-spin text-[#D4AF37] mx-auto" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-gray-400 font-mono text-xs uppercase tracking-widest border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2"><Activity size={16} className="text-[#06b6d4]" /> {lang === "fr" ? "Spectromètre" : "Spectrometer"}</div>
        <span className="text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-0.5 rounded">SYS. ONLINE</span>
      </div>

      {/* ÉCRAN D'ANALYSE PRINCIPAL */}
      <div className="relative bg-[#050b14] rounded-xl border-2 border-gray-800 overflow-hidden aspect-[16/7] flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.1)_inset]">
        {/* Grille Millimétrique */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(#06b6d4_1px,transparent_1px),linear-gradient(90deg,#06b6d4_1px,transparent_1px)] bg-[size:15px_15px]" />
        
        {/* Courbe de référence (Toujours visible en fond) */}
        <img src={referenceImageUrl} className="absolute inset-0 w-full h-full object-contain opacity-30 mix-blend-screen" alt="ref" />
        
        {/* Animation Scan */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ left: "0%" }}
              animate={{ left: "100%" }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="absolute top-0 bottom-0 w-1 bg-[#06b6d4] shadow-[0_0_15px_#06b6d4] z-20"
            />
          )}
        </AnimatePresence>

        {/* Résultat (Superposition de l'échantillon) */}
        <AnimatePresence>
          {analyzedData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 flex items-center justify-center">
              <img 
                src={samples[analyzedData.idx].image_url} 
                className="w-full h-full object-contain mix-blend-screen opacity-80" 
                style={{ filter: analyzedData.score >= similarityThreshold ? 'hue-rotate(90deg)' : 'hue-rotate(0deg)' }} 
                alt="sample" 
              />
              <div className="absolute top-4 right-4 bg-black/80 border border-[#06b6d4]/50 px-3 py-1 rounded backdrop-blur-sm">
                <span className="text-[10px] text-gray-400 block font-mono uppercase">{lang === "fr" ? "Similarité" : "Match"}</span>
                <span className={`text-lg font-mono font-bold ${analyzedData.score >= similarityThreshold ? 'text-green-400' : 'text-red-400'}`}>
                  {analyzedData.score}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* État initial */}
        {!isAnalyzing && !analyzedData && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-black/80 px-3 py-1 rounded font-mono text-xs text-gray-500 border border-gray-800">
              {lang === "fr" ? "SÉLECTIONNEZ UN ÉCHANTILLON" : "SELECT A SAMPLE"}
            </span>
          </div>
        )}
      </div>

      {/* SÉLECTEUR D'ÉCHANTILLONS (Fioles) */}
      <div className="bg-[#111] border border-gray-800 p-4 rounded-xl">
        <p className="text-[10px] text-gray-500 font-mono uppercase mb-3">
          {lang === "fr" ? "Échantillons disponibles" : "Available samples"}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {samples.map((sample: any, idx: number) => {
            const isSelected = selectedSampleIdx === idx;
            const name = lang === "fr" ? sample.name_fr : (sample.name_en || sample.name_fr);
            
            return (
              <button
                key={idx}
                onClick={() => handleSelectSample(idx)}
                className={`flex-shrink-0 w-24 flex flex-col items-center gap-2 p-2 rounded-lg transition-all border-2 ${
                  isSelected ? "bg-[#06b6d4]/10 border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "bg-black border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? "bg-[#06b6d4]/20 text-[#06b6d4]" : "bg-gray-900 text-gray-600"}`}>
                  <FlaskConical size={20} />
                </div>
                <span className={`text-[10px] font-mono text-center truncate w-full ${isSelected ? "text-white" : "text-gray-500"}`}>
                  {name || `Ech-${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`text-center font-mono text-sm p-3 rounded-lg border ${feedback.includes("✅") ? "bg-green-900/20 border-green-500/30 text-green-400" : "bg-red-900/20 border-red-500/30 text-red-400"}`}>
          {feedback}
        </motion.div>
      )}

      {/* BOUTONS D'ACTION */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSelectedSampleIdx(null); setAnalyzedData(null); setFeedback(null); }}
          disabled={isAnalyzing || isSubmitting}
          className="flex-[0.5] py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onClose}
          disabled={isAnalyzing || isSubmitting}
          className="flex-1 py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 transition-colors"
        >
          {lang === "fr" ? "Annuler" : "Abort"}
        </button>
        
        {/* Bouton Dynamique : Analyser OU Valider */}
        {!analyzedData ? (
          <button
            onClick={handleAnalyze}
            disabled={selectedSampleIdx === null || isAnalyzing}
            className="flex-[2] py-3 bg-[#06b6d4] hover:bg-white text-black rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <><Loader2 size={16} className="animate-spin" /> {lang === "fr" ? "Analyse..." : "Scanning..."}</> : <><Activity size={16} /> {lang === "fr" ? "Analyser" : "Analyze"}</>}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-3 bg-green-500 hover:bg-white text-black rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {lang === "fr" ? "Confirmer la preuve" : "Confirm evidence"}
          </button>
        )}
      </div>
    </div>
  );
}