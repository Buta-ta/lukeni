"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  miniGame: any;
  miniGameSessionId?: string;
  initialState?: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
  onStateChange?: (state: any) => void;
}

export default function CounterfeitGame({
  miniGame,
  miniGameSessionId,
  initialState,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
  onStateChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // ✅ État de jeu (restaurable/sauvegardable)
  const [gameState, setGameState] = useState<{
    foundMarkers: string[];
    focus: number;
    lightFilter: "white" | "uv" | "ir";
    zoom: number;
    attemptCount: number;
  }>(() => {
    const defaults = {
      foundMarkers: [],
      focus: 50,
      lightFilter: "white" as const,
      zoom: 1,
      attemptCount: 0,
    };
    return initialState 
      ? { ...defaults, ...initialState }
      : defaults;
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = miniGame.config || {};
  const imageUrl = lang === "fr" ? config.banknote_image_url_fr : (config.banknote_image_url_en || config.banknote_image_url_fr);
  const focusTarget = config.focus_target || 85;
  const lightTarget = config.light_target || "uv";
  const markers = config.markers_to_find || [];

  // ── CHARGER L'IMAGE DU BILLET ──
  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setIsLoading(false);
    };
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  // ── DEBOUNCED AUTO-SAVE ──
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      if (onStateChange) {
        onStateChange(gameState);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [gameState, onStateChange]);

  // ── METTRE À JOUR LE STATE (avec sauvegarde auto) ──
  const updateGameState = useCallback((updates: Partial<typeof gameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── GÉRER LE CLIC SUR UN MARQUEUR ──
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !image) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Coordonnées normalisées (0-100)
    const normalizedX = (clickX / rect.width) * 100;
    const normalizedY = (clickY / rect.height) * 100;

    // Vérifier si le clic est proche d'un marqueur (zone de 8%)
    markers.forEach((marker: any) => {
      const distance = Math.sqrt(
        Math.pow(normalizedX - marker.x_percent, 2) +
        Math.pow(normalizedY - marker.y_percent, 2)
      );

      if (distance < 8 && !gameState.foundMarkers.includes(marker.id)) {
        updateGameState({
          foundMarkers: [...gameState.foundMarkers, marker.id],
        });
      }
    });
  };

  // ── RETIRER UN MARQUEUR DÉTECTÉ ──
  const removeMarker = (markerId: string) => {
    updateGameState({
      foundMarkers: gameState.foundMarkers.filter((id) => id !== markerId),
    });
  };

  // ── APPLIQUER LES FILTRES ET DESSINER ──
  useEffect(() => {
    if (!containerRef.current || !image) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    // Dessiner l'image de base
    ctx.drawImage(image, 0, 0);

    // ── APPLIQUER LE FILTRE LUMINEUX ──
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (gameState.lightFilter === "uv") {
        // UV : augmenter le violet/bleu, réduire rouge/vert
        data[i] = Math.min(255, r * 0.3 + b * 0.7);
        data[i + 1] = Math.min(255, g * 0.3);
        data[i + 2] = Math.min(255, b * 1.2);
      } else if (gameState.lightFilter === "ir") {
        // IR : augmenter rouge, réduire bleu
        data[i] = Math.min(255, r * 1.3);
        data[i + 1] = Math.min(255, g * 0.6);
        data[i + 2] = Math.min(255, b * 0.3);
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // ── APPLIQUER LA NETTETÉ (FLOU INVERSÉ) ──
    const focusAmount = (100 - gameState.focus) / 100;
    if (focusAmount > 0.1) {
      const blurRadius = focusAmount * 10;
      ctx.filter = `blur(${blurRadius}px)`;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(canvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }

    // Transformer le canvas en URL
    const dataUrl = canvas.toDataURL("image/png");
    if (containerRef.current) {
      const img = containerRef.current.querySelector("img");
      if (img) {
        img.src = dataUrl;
      }
    }
  }, [image, gameState.focus, gameState.lightFilter]);

  // ── CALCULER LA PÉNALITÉ FRACTIONNÉE ──
  const calculatePenalty = (): number => {
    const allMarkersFound = gameState.foundMarkers.length === markers.length;
    const focusCorrect = Math.abs(gameState.focus - focusTarget) <= 5;
    const lightCorrect = gameState.lightFilter === lightTarget;

    // ✅ Niveau 1 : Parfait
    if (allMarkersFound && focusCorrect && lightCorrect) {
      return 0; // Pas de pénalité, c'est un succès
    }

    // ✅ Niveau 2 : Partiellement bon (1 point de pénalité)
    if (allMarkersFound && (focusCorrect || lightCorrect)) {
      return 1; // Presque bon, réessayez
    }

    // ✅ Niveau 3 : Plusieurs erreurs (2 points de pénalité)
    return 2; // Grosse pénalité
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    const allMarkersFound = gameState.foundMarkers.length === markers.length;
    const focusCorrect = Math.abs(gameState.focus - focusTarget) <= 5;
    const lightCorrect = gameState.lightFilter === lightTarget;

    // ✅ Incrémenter les tentatives
    const newAttemptCount = gameState.attemptCount + 1;
    updateGameState({ attemptCount: newAttemptCount });

    setIsSubmitting(true);

    setTimeout(() => {
      if (allMarkersFound && focusCorrect && lightCorrect) {
        // ✅ SUCCÈS
        setFeedback(lang === "fr" ? "✅ Billet authentifié" : "✅ Banknote authenticated");
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 1500);
      } else {
        // ❌ ÉCHEC
        setFeedback(lang === "fr" ? "❌ Non détecté" : "❌ Non detected");

        // ✅ Appliquer la pénalité fractionnée
        const penalty = calculatePenalty();
        if (penalty > 0) {
          onFail(penalty);
        }

        // Reset pour réessai
        setTimeout(() => {
          setFeedback(null);
        }, 2000);
      }

      setIsSubmitting(false);
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          {lang === "fr" ? "Microscope Pro - Analyse Billet" : "Microscope Pro - Banknote Analysis"}
        </h3>
      </div>

      {/* Interface Microscope avec Zoom */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl border-4 border-gray-700 shadow-2xl space-y-4">
        
        {/* Contrôles Zoom */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => updateGameState({ zoom: Math.max(1, gameState.zoom - 0.5) })}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <div className="flex-1 bg-gray-800 rounded px-3 py-2 text-center text-xs text-gray-400 font-mono">
            {gameState.zoom.toFixed(1)}x
          </div>
          <button
            onClick={() => updateGameState({ zoom: Math.min(4, gameState.zoom + 0.5) })}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Canvas Microscope avec Zoom */}
        <div
          ref={containerRef}
          className="relative bg-[#0a190a] border-2 border-gray-600 rounded-lg overflow-auto shadow-inner"
          style={{
            height: "300px",
            cursor: "crosshair",
          }}
          onClick={handleCanvasClick}
        >
          <div
            style={{
              transform: `scale(${gameState.zoom})`,
              transformOrigin: "top left",
              width: "100%",
              display: "inline-block",
            }}
          >
            <img
              src={imageUrl}
              alt="Billet"
              className="w-full h-auto block"
            />

            {/* ✅ MARQUEURS INVISIBLES JUSQU'À DÉCOUVERTE */}
            <div className="absolute inset-0">
              {markers.map((marker: any) => {
                const isFound = gameState.foundMarkers.includes(marker.id);
                return (
                  <motion.div
                    key={marker.id}
                    className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${marker.x_percent}%`,
                      top: `${marker.y_percent}%`,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    {/* ✅ INVISIBLE AVANT DÉCOUVERTE */}
                    {!isFound ? (
                      // Zone cliquable invisible
                      <div className="w-full h-full rounded-full border border-transparent cursor-crosshair" />
                    ) : (
                      // ✅ VISIBLE APRÈS DÉCOUVERTE - Effet vert de succès
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                        }}
                        className="w-full h-full rounded-full bg-green-500/30 border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.6)] flex items-center justify-center"
                      >
                        <span className="text-lg">✓</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contrôles Netteté (Focus) */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <label className="text-gray-400 font-mono text-[10px] uppercase">
              {lang === "fr" ? "Netteté (Focus)" : "Focus"}
            </label>
            <span className={`text-xs font-mono ${Math.abs(gameState.focus - focusTarget) <= 5 ? "text-green-400" : "text-yellow-400"}`}>
              {gameState.focus.toFixed(0)}/100
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={gameState.focus}
            onChange={(e) => updateGameState({ focus: Number(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <p className="text-[9px] text-gray-600">
            {lang === "fr" ? "Cible:" : "Target:"} {focusTarget}/100
          </p>
        </div>

        {/* Contrôles Filtre Lumineux */}
        <div className="space-y-2">
          <label className="text-gray-400 font-mono text-[10px] uppercase block">
            {lang === "fr" ? "Filtre Lumineux" : "Light Filter"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["white", "uv", "ir"].map((filter) => (
              <button
                key={filter}
                onClick={() => updateGameState({ lightFilter: filter as any })}
                className={`py-2 rounded text-[10px] font-bold uppercase transition-all ${
                  gameState.lightFilter === filter
                    ? filter === "uv"
                      ? "bg-violet-600 text-white"
                      : filter === "ir"
                      ? "bg-red-600 text-white"
                      : "bg-white text-black"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {filter === "white"
                  ? lang === "fr" ? "Blanc" : "White"
                  : filter === "uv"
                  ? "UV"
                  : "IR"}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-gray-600">
            {lang === "fr" ? "Cible:" : "Target:"}{" "}
            {lightTarget === "uv" ? "UV" : lightTarget === "ir" ? "IR" : "Blanc"}
          </p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="text-center font-mono text-sm text-[#D4AF37]">
          {feedback}
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            // ✅ Sauvegarder l'état avant de fermer
            if (onStateChange) {
              onStateChange(gameState);
            }
            onClose();
          }}
          className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2 transition-colors"
        >
          <X size={16} /> {lang === "fr" ? "Quitter" : "Quit"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {lang === "fr" ? "Analyser" : "Analyze"}
        </button>
      </div>
    </div>
  );
}