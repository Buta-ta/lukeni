"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, ChevronLeft, ChevronRight, RotateCcw, Send, ScanFace, Sliders, UserX, CheckCircle2, Clock, Lightbulb, Unlock } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

export default function PortraitGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- ETAT : TIMER ET INDICES ---
  const [timeLeft, setTimeLeft] = useState<number | null>(miniGame.timer_seconds > 0 ? miniGame.timer_seconds : null);
  const [showClues, setShowClues] = useState(false);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [localBudget, setLocalBudget] = useState(budgetCauris);
  const clues = miniGame.mini_game_clues || [];

  const config = miniGame.config || {};
  const mode = config.portrait_mode || "layers";

  // --- ETAT : MODE LAYERS ---
  const categories = config.categories || [];
  const targetCombination = config.target_combination || {};
  const [layers, setLayers] = useState<any[]>([]);
  const [currentSelections, setCurrentSelections] = useState<Record<string, number>>({});
  const [previewMode, setPreviewMode] = useState(true);

  // --- ETAT : MODE LINEUP ---
  const suspects = config.suspects || [];
  const [selectedSuspectIdx, setSelectedSuspectIdx] = useState<number | null>(null);
  const [eliminatedIdxs, setEliminatedIdxs] = useState<number[]>([]);

  // --- ETAT : MODE REVEAL ---
  const [currentBlur, setCurrentBlur] = useState(8);
  const [currentContrast, setCurrentContrast] = useState(50);
  const [currentBrightness, setCurrentBrightness] = useState(50);

  useEffect(() => {
    if (mode === "layers" && categories.length > 0) {
      const initialSelections: Record<string, number> = {};
      categories.forEach((cat: any) => { initialSelections[cat.name_fr] = 0; });
      setCurrentSelections(initialSelections);
      setLayers(categories);
    }
    setIsLoading(false);
  }, [mode, categories]);

  // --- GESTION DU TIMER ---
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitting || isScanning || feedback) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timerId);
          setFeedback("❌ " + (lang === "fr" ? "Temps écoulé !" : "Time's up!"));
          setTimeout(() => onFail(miniGame.penalty_per_error || 1), 1500);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, isScanning, feedback, lang, miniGame.penalty_per_error, onFail]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // --- GESTION DES INDICES ---
  const handleBuyClue = (clue: any) => {
    const cost = clue.reveal_cost_cauris ?? 5;
    if (localBudget >= cost) {
      setLocalBudget(prev => prev - cost);
      setUnlockedClues(prev => [...prev, clue.id]);
      // Note technique: Si tu as une fonction onSpendCauris passée en props par le parent, 
      // c'est ici qu'il faudrait l'appeler pour déduire de la base de données.
    } else {
      alert(lang === "fr" ? "Pas assez de Cauris pour cet indice !" : "Not enough Cauris!");
    }
  };


  // ---- ACTIONS COMMUNES ----
  const triggerResult = (isCorrect: boolean) => {
    setIsSubmitting(true);
    setIsScanning(true);
    setFeedback(null);

    setTimeout(() => {
      setIsScanning(false);
      if (isCorrect) {
        setFeedback("✅ " + (lang === "fr" ? "Identification Confirmée" : "ID Confirmed"));
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback("❌ " + (lang === "fr" ? "Aucune correspondance" : "No match found"));
        const penalty = miniGame.penalty_per_error || 1;
        if (localBudget - penalty <= 0) {
          setTimeout(() => onFail(penalty), 1500);
        } else {
          setLocalBudget(prev => prev - penalty);
        }
      }
      setIsSubmitting(false);
    }, 2000);
  };

  const handleSubmitLayers = () => {
    let isCorrect = true;
    for (const [catName, targetIdx] of Object.entries(targetCombination)) {
      if (currentSelections[catName] !== targetIdx) { isCorrect = false; break; }
    }
    triggerResult(isCorrect);
  };

  const handleSubmitLineup = () => {
    if (selectedSuspectIdx === null) return;
    const isCorrect = suspects[selectedSuspectIdx]?.is_correct === true;
    triggerResult(isCorrect);
  };

  const handleSubmitReveal = () => {
    const tBlur = config.target_blur || 0;
    const tContrast = config.target_contrast ?? 100;
    const tBright = config.target_brightness ?? 100;

    const isCorrect =
      Math.abs(currentBlur - tBlur) <= 1 &&
      Math.abs(currentContrast - tContrast) <= 10 &&
      Math.abs(currentBrightness - tBright) <= 10;

    triggerResult(isCorrect);
  };


  if (isLoading) return <Loader2 className="animate-spin text-[#D4AF37] mx-auto" />;

  return (
    <div className="space-y-6">
      {/* HEADER : TITRE, TIMER ET INDICES */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-xs uppercase tracking-widest">
          {mode === "reveal" ? <Sliders size={16} className="text-[#D4AF37]" /> : <ScanFace size={16} className="text-[#D4AF37]" />}
          {lang === "fr" ? "Base de données Criminelle" : "Criminal Database"}
        </div>

        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 font-mono text-sm px-2 py-1 rounded bg-black border ${timeLeft <= 10 ? 'text-red-500 border-red-500/50 animate-pulse' : 'text-gray-300 border-gray-700'}`}>
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
          )}

          {clues.length > 0 && (
            <button
              onClick={() => setShowClues(!showClues)}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition-colors ${showClues ? 'bg-blue-600 text-white' : 'bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-900/50'}`}
            >
              <Lightbulb size={14} />
              {lang === "fr" ? "Indices" : "Clues"}
              <span className="bg-black/50 px-1.5 rounded-full text-[10px] ml-1">{clues.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* PANNEAU DES INDICES */}
      <AnimatePresence>
        {showClues && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex justify-between items-center text-xs font-mono text-blue-300">
                <span>{lang === "fr" ? "Dossier d'enquête" : "Case File"}</span>
                <span className="text-[#D4AF37] bg-black/50 px-2 py-1 rounded">Budget: {localBudget} Cauris</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clues.map((clue: any, idx: number) => {
                  const isUnlocked = unlockedClues.includes(clue.id);
                  return (
                    <div key={clue.id} className={`p-3 rounded-lg border ${isUnlocked ? 'bg-blue-900/20 border-blue-500/50' : 'bg-black/50 border-gray-800'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Indice {idx + 1}</span>
                        {!isUnlocked && (
                          <span className="text-[10px] text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded flex items-center gap-1">
                            {clue.reveal_cost_cauris ?? 5} 💰
                          </span>
                        )}
                      </div>
                      {isUnlocked ? (
                        <div className="space-y-2">
                          {/* Affichage du texte s'il y en a un */}
                          {(lang === "fr" ? clue.text_fr : (clue.text_en || clue.text_fr)) && (
                            <p className="text-sm text-blue-100">
                              {lang === "fr" ? clue.text_fr : (clue.text_en || clue.text_fr)}
                            </p>
                          )}

                          {/* Affichage du Media s'il y en a un */}
                          {clue.media_url && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                              {clue.media_url.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                                <audio src={clue.media_url} controls className="w-full h-10" />
                              ) : clue.media_url.match(/\.(mp4|webm)$/i) ? (
                                <video src={clue.media_url} controls className="w-full max-h-40 object-cover" />
                              ) : (
                                <img src={clue.media_url} alt="Indice" className="w-full max-h-40 object-contain" />
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => handleBuyClue(clue)} className="w-full py-2 bg-white/5 hover:bg-blue-600/20 text-gray-400 hover:text-blue-300 border border-dashed border-gray-700 hover:border-blue-500/50 rounded text-xs transition-colors flex items-center justify-center gap-2">
                          <Unlock size={14} /> {lang === "fr" ? "Débloquer l'indice" : "Unlock clue"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ========================================================
          MODE 1 : LAYERS (Portrait-Robot)
      ======================================================== */}
      {mode === "layers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative bg-black rounded-lg border-2 border-gray-800 overflow-hidden shadow-inner aspect-[3/4] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
            {previewMode && layers.map((category) => {
              const selectedUrl = (category.options || [])[currentSelections[category.name_fr] || 0];
              return (
                <AnimatePresence mode="wait" key={category.name_fr}>
                  {selectedUrl && (
                    <motion.img
                      key={selectedUrl}
                      src={selectedUrl}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ zIndex: category.layer_order || 0 }}
                    />
                  )}
                </AnimatePresence>
              );
            })}
            {isScanning && <motion.div initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-[#D4AF37] shadow-[0_0_20px_#D4AF37] z-50 opacity-80" />}
          </div>

          <div className="space-y-3 bg-[#111] p-4 rounded-xl border border-gray-800 h-full flex flex-col justify-center">
            {layers.map((category) => {
              const selectedIdx = currentSelections[category.name_fr] || 0;
              const maxIdx = (category.options || []).length - 1;
              const catName = lang === "fr" ? category.name_fr : (category.name_en || category.name_fr);
              return (
                <div key={category.name_fr} className="bg-black/50 p-2 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2 px-2">
                    <p className="text-[10px] font-bold text-gray-300 uppercase font-mono">{catName}</p>
                    <span className="text-[9px] text-[#D4AF37] font-mono bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">{selectedIdx + 1} / {maxIdx + 1}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => setCurrentSelections(p => ({ ...p, [category.name_fr]: selectedIdx === 0 ? maxIdx : selectedIdx - 1 }))} disabled={isScanning} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <div className="h-10 flex-1 border border-dashed border-gray-700 rounded bg-black/50 flex items-center justify-center overflow-hidden">
                      {(category.options || [])[selectedIdx] ? <img src={(category.options || [])[selectedIdx]} alt="option" className="h-full object-contain" /> : <span className="text-[10px] text-gray-600 font-mono italic">Vide</span>}
                    </div>
                    <button onClick={() => setCurrentSelections(p => ({ ...p, [category.name_fr]: selectedIdx === maxIdx ? 0 : selectedIdx + 1 }))} disabled={isScanning} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors disabled:opacity-50"><ChevronRight size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ========================================================
          MODE 2 : LINEUP (Tapissage)
      ======================================================== */}
      {mode === "lineup" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 text-center font-mono">
            {lang === "fr" ? "Analysez les profils et identifiez le suspect correspondant à vos indices." : "Analyze the profiles and identify the matching suspect."}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {suspects.map((suspect: any, idx: number) => {
              const isSelected = selectedSuspectIdx === idx;
              const isEliminated = eliminatedIdxs.includes(idx);

              return (
                <div
                  key={idx}
                  onClick={() => { if (!isEliminated && !isScanning) setSelectedSuspectIdx(idx); }}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 
                    ${isEliminated ? 'border-gray-800 opacity-40 grayscale' :
                      isSelected ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' :
                        'border-white/10 hover:border-white/30'}`}
                >
                  <img src={suspect.image_url} alt="suspect" className="w-full aspect-square object-cover" />

                  {isScanning && isSelected && (
                    <motion.div initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-[#D4AF37] shadow-[0_0_20px_#D4AF37] z-50 opacity-80" />
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-2 flex items-center justify-between">
                    <span className="text-[10px] text-white font-mono truncate mr-2">
                      #{idx + 1} {lang === "fr" ? suspect.name_fr : (suspect.name_en || suspect.name_fr)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isScanning) return;
                        if (isEliminated) {
                          setEliminatedIdxs(prev => prev.filter(i => i !== idx));
                        } else {
                          setEliminatedIdxs(prev => [...prev, idx]);
                          if (isSelected) setSelectedSuspectIdx(null);
                        }
                      }}
                      className={`p-1 rounded-full ${isEliminated ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-red-500 hover:text-white'} transition-colors`}
                    >
                      <UserX size={12} />
                    </button>
                  </div>

                  {isEliminated && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-4 border-red-500 text-red-500 font-bold uppercase tracking-widest text-lg transform -rotate-12 px-2 rounded backdrop-blur-sm bg-black/40">
                        {lang === "fr" ? "Écarté" : "Cleared"}
                      </div>
                    </div>
                  )}
                  {isSelected && !isEliminated && (
                    <div className="absolute top-2 right-2 bg-[#D4AF37] text-black p-1 rounded-full">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ========================================================
          MODE 3 : REVEAL (Développement / Filtrage)
      ======================================================== */}
      {mode === "reveal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative bg-black rounded-lg border-2 border-gray-800 overflow-hidden aspect-square flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] z-10 pointer-events-none" />
            <img
              src={config.reveal_image_url}
              alt="evidence"
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: `blur(${currentBlur}px) contrast(${currentContrast}%) brightness(${currentBrightness}%)` }}
            />
            {isScanning && <motion.div initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-[#D4AF37] shadow-[0_0_20px_#D4AF37] z-50 opacity-80" />}
          </div>

          <div className="space-y-6 bg-[#111] p-6 rounded-xl border border-gray-800 h-full flex flex-col justify-center">
            <h3 className="text-xs font-mono text-gray-400 uppercase mb-4 text-center border-b border-gray-800 pb-2">
              {lang === "fr" ? "Calibrage Optique" : "Optical Calibration"}
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>{lang === "fr" ? "Focalisation" : "Focus"}</span>
                <span>{currentBlur === 0 ? "MAX" : currentBlur}</span>
              </div>
              <input type="range" min="0" max="10" step="1" value={currentBlur} onChange={(e) => setCurrentBlur(Number(e.target.value))} disabled={isScanning} className="w-full accent-[#D4AF37]" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>{lang === "fr" ? "Contraste" : "Contrast"}</span>
                <span>{currentContrast}%</span>
              </div>
              <input type="range" min="50" max="150" step="5" value={currentContrast} onChange={(e) => setCurrentContrast(Number(e.target.value))} disabled={isScanning} className="w-full accent-[#D4AF37]" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>{lang === "fr" ? "Luminosité" : "Brightness"}</span>
                <span>{currentBrightness}%</span>
              </div>
              <input type="range" min="50" max="150" step="5" value={currentBrightness} onChange={(e) => setCurrentBrightness(Number(e.target.value))} disabled={isScanning} className="w-full accent-[#D4AF37]" />
            </div>
          </div>
        </div>
      )}


      {/* ---- FOOTER : FEEDBACK ET BOUTONS ---- */}
      {feedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`text-center font-mono text-sm p-3 rounded-lg border ${feedback.includes("✅") ? "bg-green-900/20 border-green-500/30 text-green-400" : "bg-red-900/20 border-red-500/30 text-red-400"}`}>
          {feedback}
        </motion.div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setFeedback(null);
            if (mode === "layers") {
              const initialSelections: Record<string, number> = {};
              layers.forEach((cat: any) => { initialSelections[cat.name_fr] = 0; });
              setCurrentSelections(initialSelections);
            } else if (mode === "lineup") {
              setSelectedSuspectIdx(null);
              setEliminatedIdxs([]);
            } else if (mode === "reveal") {
              setCurrentBlur(8);
              setCurrentContrast(50);
              setCurrentBrightness(50);
            }
          }}
          disabled={isScanning}
          className="flex-[0.5] py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onClose}
          disabled={isScanning}
          className="flex-1 py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 transition-colors disabled:opacity-50"
        >
          {lang === "fr" ? "Annuler" : "Abort"}
        </button>
        <button
          onClick={() => {
            if (mode === "layers") handleSubmitLayers();
            else if (mode === "lineup") handleSubmitLineup();
            else if (mode === "reveal") handleSubmitReveal();
          }}
          disabled={isSubmitting || (mode === "lineup" && selectedSuspectIdx === null)}
          className="flex-[2] py-3 bg-[#D4AF37] hover:bg-white text-black rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <><Loader2 size={16} className="animate-spin" /> {lang === "fr" ? "Recherche..." : "Scanning..."}</>
          ) : (
            <><Send size={16} /> {lang === "fr" ? "Lancer la recherche" : "Run search"}</>
          )}
        </button>
      </div>
    </div>
  );
}