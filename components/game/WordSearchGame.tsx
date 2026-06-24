// components/game/WordSearchGame.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { generateWordSearch } from "@/lib/wordSearchGenerator";

interface Props {
  wordSearch: any;
  lang: "fr" | "en";
  onWordFound: (reward: number) => void;
  onBadAttempt: (penalty: number) => void;
  onGameComplete: () => void;
  savedProgress?: string[]; // ✅ NOUVEAU : Mots déjà trouvés
  onSaveProgress: (foundWords: string[]) => void; // ✅ NOUVEAU : Sauvegarder
  clues?: any[];
  budgetCauris?: number;
  revealedClues?: string[];
  onRevealClue?: (clueId: string, cost: number) => Promise<void>;
  attempts?: number;
  maxAttempts?: number;
  onMaxAttemptsReached?: (behavior: string) => void;
}

export default function WordSearchGame({
  wordSearch,
  lang,
  onWordFound,
  onBadAttempt,
  onGameComplete,
  savedProgress,
  onSaveProgress,
  clues,
  budgetCauris,
  revealedClues,
  onRevealClue,
  attempts = 0,
  maxAttempts = 0,
  onMaxAttemptsReached,
}: Props) {
  if (!wordSearch) return null;

  const words =
    lang === "fr"
      ? wordSearch.words_list_fr || []
      : wordSearch.words_list_en || wordSearch.words_list_fr || [];
  const trapWords =
    lang === "fr"
      ? wordSearch.trap_words_fr || []
      : wordSearch.trap_words_en || wordSearch.trap_words_fr || [];
  const gridSize = wordSearch.grid_size || 12;
  const gameMode = wordSearch.game_mode || "classic";
  const isHard = wordSearch.is_hard || false;
  const hint = lang === "fr" ? wordSearch.hint_fr : wordSearch.hint_en;
  const reward = wordSearch.reward_per_word ?? 2;
  const penalty = wordSearch.penalty_per_error ?? 1;

  const allWords = [...words, ...trapWords];

  // Clé stable pour éviter que la grille ne se régénère
  const wordsKey = JSON.stringify(words);
  const trapWordsKey = JSON.stringify(trapWords);

  // Générer la grille
  const { grid, placements } = useMemo(() => {
    const validWords = allWords.filter((w) => w && w.trim() !== "");
    return generateWordSearch(validWords, gridSize, isHard);
  }, [wordsKey, trapWordsKey, gridSize, isHard]);

  const [foundWords, setFoundWords] = useState<string[]>(savedProgress || []);

  useEffect(() => {
    if (!savedProgress || savedProgress.length === 0) return;
    setFoundWords(savedProgress);
  }, [wordSearch?.id]);

  const [triggeredTraps, setTriggeredTraps] = useState<string[]>([]);
  const [selectedStart, setSelectedStart] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectedCells, setSelectedCells] = useState<
    { row: number; col: number }[]
  >([]);
  const [isValidating, setIsValidating] = useState(false);

  // Feedback visuel
  const [successCells, setSuccessCells] = useState<
    { row: number; col: number }[]
  >([]);
  const [errorCells, setErrorCells] = useState<{ row: number; col: number }[]>(
    [],
  );
  const [shakeGrid, setShakeGrid] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error" | "trap";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "trap") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handleCellClick = (row: number, col: number) => {
    // ✅ BLOQUER SI ESSAIS MAX ATTEINTS EN MODE "PAUSE"
    if (
      maxAttempts > 0 &&
      attempts >= maxAttempts &&
      wordSearch.attempt_behavior === "pause"
    ) {
      showToast(
        lang === "fr"
          ? "⏸️ Les essais sont épuisés. Le jeu est suspendu."
          : "⏸️ Attempts exhausted. Game is paused.",
        "error",
      );
      return;
    }

    if (isValidating) return;

    if (!selectedStart) {
      // Premier clic
      setSelectedStart({ row, col });
      setSelectedEnd(null);
      setSelectedCells([{ row, col }]);
      setErrorCells([]);
    } else {
      // Deuxième clic
      const start = selectedStart;
      const end = { row, col };

      const dr = Math.sign(end.row - start.row);
      const dc = Math.sign(end.col - start.col);
      const rowDiff = Math.abs(end.row - start.row);
      const colDiff = Math.abs(end.col - start.col);

      // Vérifier si c'est une ligne droite valide
      if (rowDiff !== colDiff && rowDiff !== 0 && colDiff !== 0) {
        // Invalide, on remplace le point de départ
        setSelectedStart(end);
        setSelectedEnd(null);
        setSelectedCells([end]);
        return;
      }

      // Calculer les cellules IMMÉDIATEMENT
      const steps = Math.max(rowDiff, colDiff);
      const cells: { row: number; col: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        cells.push({ row: start.row + i * dr, col: start.col + i * dc });
      }

      setSelectedEnd(end);
      setSelectedCells(cells);
      setIsValidating(true);

      // Valider avec les cellules calculées (plus de problème de state)
      setTimeout(() => validateSelection(cells), 300);
    }
  };

  const validateSelection = (cells: { row: number; col: number }[]) => {
    if (cells.length < 2) {
      resetSelection();
      return;
    }

    const selectedWord = cells.map((c) => grid[c.row][c.col]).join("");
    const reversedWord = selectedWord.split("").reverse().join("");

    // Vérifier si c'est un mot piège (Intrus)
    const matchedTrap = trapWords.find(
      (w) =>
        w.toUpperCase() === selectedWord || w.toUpperCase() === reversedWord,
    );

    if (matchedTrap && !triggeredTraps.includes(matchedTrap.toUpperCase())) {
      setTriggeredTraps((prev) => [...prev, matchedTrap.toUpperCase()]);
      setErrorCells([...cells]);
      setShakeGrid(true);
      setTimeout(() => {
        setShakeGrid(false);
        setErrorCells([]);
      }, 800);
      showToast(`💣 INTRUS (${matchedTrap}) ! -${penalty} Cauris`, "trap");
      onBadAttempt(penalty);
      resetSelection();
      return;
    }

    // Vérifier si c'est un mot valide
    const matchedWord = words.find(
      (w) =>
        w.toUpperCase() === selectedWord || w.toUpperCase() === reversedWord,
    );

    if (matchedWord && !foundWords.includes(matchedWord.toUpperCase())) {
      const upperWord = matchedWord.toUpperCase();
      const newFound = [...foundWords, upperWord];
      setFoundWords(newFound);
      onSaveProgress(newFound);
      setSuccessCells([...cells]);
      setTimeout(() => setSuccessCells([]), 1000);
      showToast(`✅ ${matchedWord} trouvé ! +${reward} Cauris`, "success");
      onWordFound(reward);

      if (newFound.length === words.length) {
        setTimeout(() => onGameComplete(), 1000);
      }
    } else {
      // Raté
      setErrorCells([...cells]);
      setShakeGrid(true);
      setTimeout(() => {
        setShakeGrid(false);
        setErrorCells([]);
      }, 800);

      if (penalty > 0) {
        showToast(
          `❌ ${selectedWord} n'est pas valide ! -${penalty} Cauris`,
          "error",
        );
        onBadAttempt(penalty);
      } else {
        showToast(`❌ ${selectedWord} n'est pas valide !`, "error");
      }

      // ✅ VÉRIFIER LES ESSAIS MAX
      const newAttempts = attempts + 1;
      if (
        maxAttempts > 0 &&
        newAttempts >= maxAttempts &&
        onMaxAttemptsReached
      ) {
        // Le joueur a atteint le maximum d'essais
        setTimeout(() => {
          onMaxAttemptsReached("attempt_limit_reached");
        }, 500);
      }
    }

    resetSelection();
  };

  const resetSelection = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    setSelectedCells([]);
    setIsValidating(false);
  };

  const isCellSelected = (row: number, col: number) =>
    selectedCells.some((c) => c.row === row && c.col === col);

  const isCellFound = (row: number, col: number) => {
    for (const placement of placements) {
      if (
        foundWords.includes(placement.word) &&
        !trapWords.includes(placement.word)
      ) {
        if (placement.cells.some((c) => c.row === row && c.col === col))
          return true;
      }
    }
    return false;
  };

  const isCellError = (row: number, col: number) =>
    errorCells.some((c) => c.row === row && c.col === col);

  const isCellSuccess = (row: number, col: number) =>
    successCells.some((c) => c.row === row && c.col === col);

  const isWordFound = (word: string) => foundWords.includes(word.toUpperCase());

  // ✅ Helper pour afficher le statut des essais
  // ✅ Helper pour afficher le statut des essais
  const getAttemptStatusColor = (attempts: number, maxAttempts: number) => {
    if (maxAttempts === 0) return "text-gray-400"; // Illimité
    const percentage = (attempts / maxAttempts) * 100;
    if (percentage >= 100) return "text-red-400";
    if (percentage >= 75) return "text-orange-400";
    if (percentage >= 50) return "text-yellow-400";
    return "text-green-400";
  };

  // ✅ Vérifier si le jeu est en mode "pause" ET essais max atteints
  const isGamePaused =
    maxAttempts > 0 &&
    attempts >= maxAttempts &&
    wordSearch.attempt_behavior === "pause";
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed z-50 bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[700px] bg-[#05050A]/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl max-h-[75vh]"
    >
      {/* ✅ OVERLAY "JEU SUSPENDU" */}
      <AnimatePresence>
        {isGamePaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
          >
            <div className="text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
              </motion.div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {lang === "fr" ? "JEU SUSPENDU" : "GAME PAUSED"}
                </h3>
                <p className="text-gray-300 text-sm font-mono">
                  {lang === "fr"
                    ? "Vous avez épuisé vos essais autorisés."
                    : "You have exhausted your allowed attempts."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-pink-500/10 px-4 py-3 flex items-center justify-between border-b border-pink-500/30 flex-shrink-0">
        <span className="font-mono text-xs text-pink-400 tracking-widest font-bold flex items-center gap-2">
          🧩{" "}
          {lang === "fr"
            ? wordSearch.title_fr
            : wordSearch.title_en || wordSearch.title_fr}
        </span>
        <div className="flex items-center gap-3">
          {/* Progression des mots */}
          <span className="text-xs text-gray-400">
            {foundWords.length}/{words.length}
          </span>

          {/* Indicateur des indices */}
          {clues && clues.length > 0 && (
            <span className="text-xs text-blue-400 font-mono flex items-center gap-1 px-2 py-0.5 bg-blue-900/20 rounded">
              💡{" "}
              {clues.filter((c: any) => revealedClues?.includes(c.id)).length}/
              {clues.length}
            </span>
          )}

          {/* ✅ COMPTEUR D'ESSAIS AVEC ANIMATION */}
          {maxAttempts > 0 && (
            <motion.span
              animate={
                attempts >= maxAttempts
                  ? {
                    scale: [1, 1.1, 1],
                    borderColor: ["#ef4444", "#f87171", "#ef4444"],
                  }
                  : attempts >= maxAttempts * 0.75
                    ? { scale: [1, 1.05, 1] }
                    : {}
              }
              transition={{
                repeat: attempts >= maxAttempts * 0.75 ? Infinity : 0,
                duration: attempts >= maxAttempts ? 0.8 : 1.2,
              }}
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${attempts >= maxAttempts
                ? "bg-red-500/30 text-red-300 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                : attempts >= maxAttempts * 0.75
                  ? "bg-orange-500/25 text-orange-300 border-orange-500/50"
                  : attempts >= maxAttempts * 0.5
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-gray-700/20 text-gray-400 border-gray-500/30"
                }`}
            >
              {lang === "fr" ? "Essais" : "Attempts"}: {attempts}/{maxAttempts}
            </motion.span>
          )}
        </div>
      </div>

      {/* ✅ BARRE DE PROGRESSION DES ESSAIS */}
      {maxAttempts > 0 && (
        <div className="h-1 bg-gray-900/50 border-b border-pink-500/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(attempts / maxAttempts) * 100}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full transition-colors ${attempts >= maxAttempts
              ? "bg-red-500/70"
              : attempts >= maxAttempts * 0.75
                ? "bg-orange-500/70"
                : attempts >= maxAttempts * 0.5
                  ? "bg-yellow-500/60"
                  : "bg-green-500/60"
              }`}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Grille */}
        <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
          <div
            className={`grid gap-0.5 select-none transition-transform ${shakeGrid ? "animate-shake" : ""}`}
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              width: "100%",
              maxWidth: `${gridSize * 28}px`,
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((letter, cIdx) => {
                const selected = isCellSelected(rIdx, cIdx);
                const found = isCellFound(rIdx, cIdx);
                const error = isCellError(rIdx, cIdx);
                const success = isCellSuccess(rIdx, cIdx);
                const isFirst =
                  selectedStart?.row === rIdx && selectedStart?.col === cIdx;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    disabled={isGamePaused}
                    className={`aspect-square flex items-center justify-center font-mono text-[10px] md:text-xs font-bold rounded-sm transition-all ${isGamePaused ? "opacity-40 cursor-not-allowed" : ""
                      } ${error
                        ? "bg-red-500/40 text-red-300 scale-110"
                        : success
                          ? "bg-green-500/30 text-green-300 scale-110 ring-1 ring-green-400"
                          : found
                            ? "bg-green-500/20 text-green-400"
                            : selected
                              ? "bg-pink-500/30 text-white scale-110"
                              : isFirst
                                ? "bg-pink-500/50 text-white ring-1 ring-pink-400"
                                : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {/* Liste des mots / Indices */}
        <div className="md:w-48 p-4 bg-black/20 border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto space-y-4">
          {gameMode === "mystery" ? (
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                Mode Mystère 🔮
              </p>
              <p className="text-xs text-purple-300 italic font-serif">
                {hint ||
                  (lang === "fr"
                    ? "Trouvez les mots cachés..."
                    : "Find the hidden words...")}
              </p>

              {/* Mots trouvés */}
              <div className="border-t border-white/10 pt-2 mt-2">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">
                  {lang === "fr" ? "Mots trouvés" : "Found words"} (
                  {foundWords.length}/{words.length})
                </p>
                {foundWords.length === 0 ? (
                  <p className="text-[10px] text-gray-600 italic">
                    {lang === "fr" ? "Aucun pour l'instant..." : "None yet..."}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {foundWords.map((word, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono bg-green-500/10 text-green-400"
                      >
                        <CheckCircle size={12} className="flex-shrink-0" />
                        {word}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mots restants (cachés) */}
              {words.length - foundWords.length > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">
                    {lang === "fr" ? "Restants" : "Remaining"}
                  </p>
                  <div className="space-y-1.5">
                    {words
                      .filter((w) => !foundWords.includes(w.toUpperCase()))
                      .map((_, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono bg-white/5 text-gray-600"
                        >
                          <span className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0" />
                          ???
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-3">
                {gameMode === "intruder"
                  ? "Mots à trouver / Intrus 💣"
                  : "Mots à trouver"}
              </p>
              <div className="space-y-1.5">
                {words.map((word: string, idx: number) => (
                  <div
                    key={`word-${idx}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono ${isWordFound(word)
                      ? "bg-green-500/10 text-green-400 line-through"
                      : "bg-white/5 text-gray-300"
                      }`}
                  >
                    {isWordFound(word) ? (
                      <CheckCircle size={12} className="flex-shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0" />
                    )}
                    {word.toUpperCase()}
                  </div>
                ))}
                {gameMode === "intruder" &&
                  trapWords.map((word: string, idx: number) => (
                    <div
                      key={`trap-${idx}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono ${triggeredTraps.includes(word.toUpperCase())
                        ? "bg-red-500/10 text-red-400 line-through"
                        : "bg-white/5 text-gray-300"
                        }`}
                    >
                      {triggeredTraps.includes(word.toUpperCase()) ? (
                        <AlertTriangle size={12} className="flex-shrink-0" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0" />
                      )}
                      {word.toUpperCase()}
                      {triggeredTraps.includes(word.toUpperCase()) && (
                        <span className="text-[8px]">💣</span>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* ✅ INDICES PAYANTS DU JEU DE MOTS MÊLÉS */}
          {clues && clues.length > 0 && (
            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  <span className="inline-block animate-pulse mr-1">💡</span>
                  {lang === "fr" ? "Indices" : "Clues"}
                </p>
                <span className="text-[8px] text-blue-500 font-mono bg-blue-900/30 px-1.5 py-0.5 rounded">
                  {
                    clues.filter((c: any) => revealedClues?.includes(c.id))
                      .length
                  }
                  /{clues.length}
                </span>
              </div>
              <div className="space-y-2">
                {clues.map((clue: any, idx: number) => {
                  const isRevealed = revealedClues?.includes(clue.id);
                  const clueText = lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr;
                  const clueCost = clue.reveal_cost_cauris ?? 5;
                  const canAfford = (budgetCauris ?? 0) >= clueCost;

                  return (
                    <div
                      key={clue.id || `ws-clue-${idx}`}
                      className={`p-2 rounded-lg text-xs border transition-all ${isRevealed
                        ? "bg-blue-900/20 border-blue-500/30"
                        : "bg-black/40 border-white/10"
                        }`}
                    >
                      {isRevealed ? (
                        <div className="space-y-2">
                          {/* Texte de l'indice */}
                          <p className="text-blue-300 font-serif italic leading-tight text-[11px]">
                            <span className="text-blue-400 font-mono mr-1 font-bold">
                              [{idx + 1}]
                            </span>
                            {clueText}
                          </p>

                          {/* Média si présent */}
                          {clue.media_url && (
                            <div className="mt-2 p-2 bg-blue-900/40 rounded-lg border border-blue-500/30 overflow-hidden">
                              {clue.media_type === "image" ? (
                                <div className="relative group cursor-zoom-in">
                                  <img
                                    src={clue.media_url}
                                    alt="Indice"
                                    className="w-full h-auto max-h-24 object-contain rounded border border-blue-500/20 bg-black/20 transition-transform group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded text-[8px] text-blue-300">
                                    {lang === "fr"
                                      ? "Cliquez pour zoomer"
                                      : "Click to zoom"}
                                  </div>
                                </div>
                              ) : clue.media_type === "audio" ? (
                                <div className="space-y-1.5">
                                  <p className="text-[9px] text-blue-300 font-mono">
                                    🎵 {lang === "fr" ? "Audio" : "Audio"}
                                  </p>
                                  <audio
                                    src={clue.media_url}
                                    controls
                                    className="w-full h-5 accent-blue-500"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 p-2 bg-blue-900/20 rounded">
                                  <span className="text-lg">📄</span>
                                  <a
                                    href={clue.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 underline text-[10px] hover:text-blue-300 transition-colors flex-1 truncate"
                                  >
                                    {lang === "fr"
                                      ? "Ouvrir le document"
                                      : "Open document"}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Badge de révélation */}
                          <div className="flex items-center gap-1 text-[9px] text-blue-400 font-mono">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            {lang === "fr" ? "Révélé" : "Revealed"}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 group">
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-600 font-mono text-[10px] group-hover:text-gray-500 transition-colors">
                              🔒{" "}
                              {lang === "fr"
                                ? `Indice ${idx + 1}`
                                : `Clue ${idx + 1}`}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              if (onRevealClue && canAfford) {
                                onRevealClue(clue.id, clueCost);
                              }
                            }}
                            disabled={!canAfford}
                            title={
                              canAfford
                                ? lang === "fr"
                                  ? `Révéler l'indice (-${clueCost} Cauris)`
                                  : `Reveal clue (-${clueCost} Cauris)`
                                : lang === "fr"
                                  ? "Fonds insuffisants"
                                  : "Not enough funds"
                            }
                            className={`flex-shrink-0 px-2 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-all ${canAfford
                              ? "bg-blue-500/30 hover:bg-blue-500/50 border border-blue-500/50 text-blue-300 hover:text-blue-200 cursor-pointer hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                              : "bg-red-500/15 border border-red-500/30 text-red-500 cursor-not-allowed opacity-60"
                              }`}
                          >
                            <span className="inline-block">💡</span>
                            <span className="ml-0.5">-{clueCost}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Message de félicitations si tous révélés */}
              {clues.length > 0 &&
                clues.every((c: any) => revealedClues?.includes(c.id)) && (
                  <div className="mt-3 p-2 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                    <p className="text-[10px] text-green-400 font-mono">
                      ✅{" "}
                      {lang === "fr"
                        ? "Tous les indices sont maintenant accessibles !"
                        : "All clues are now available!"}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 bg-white/[0.02] border-t border-white/10 text-center">
        <p className="text-[10px] text-gray-500">
          {selectedStart
            ? lang === "fr"
              ? "👉 Cliquez sur la dernière lettre"
              : "👉 Click the last letter"
            : lang === "fr"
              ? "👉 Cliquez sur la première lettre du mot"
              : "👉 Click the first letter of the word"}
        </p>
      </div>
      {/* Toast Feedback — ZONE FIXE LISIBLE */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div
              className={`px-6 py-4 rounded-xl font-bold text-sm shadow-2xl flex items-center gap-3 backdrop-blur-md border ${toast.type === "success"
                ? "bg-green-600/95 text-white border-green-500/50"
                : toast.type === "trap"
                  ? "bg-red-700/95 text-white border-red-500/50"
                  : "bg-red-600/95 text-white border-red-500/50"
                }`}
            >
              <span className="text-lg">
                {toast.type === "success"
                  ? "✅"
                  : toast.type === "trap"
                    ? "💣"
                    : "❌"}
              </span>
              <span>{toast.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
