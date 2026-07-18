"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Volume2, RotateCcw } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

export default function CanvasGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [opaqueImage, setOpaqueImage] = useState<HTMLImageElement | null>(null);
  const [revealedImage, setRevealedImage] = useState<HTMLImageElement | null>(null);
  const [revealPercentage, setRevealPercentage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);

  const config = miniGame.config || {};
  const revealThreshold = config.reveal_threshold || 75;
  const brushSize = config.brush_size === "small" ? 15 : config.brush_size === "large" ? 35 : 25;
  const showProgressBar = config.show_progress_bar !== false;

  // ── CHARGER LES IMAGES ──
  useEffect(() => {
    if (!config.opaque_image_url || !config.revealed_image_url) {
      setIsLoading(false);
      return;
    }

    let loaded = 0;
    const totalToLoad = 2;

    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loaded++;
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    Promise.all([
      loadImage(config.opaque_image_url),
      loadImage(config.revealed_image_url),
    ])
      .then(([opaque, revealed]) => {
        setOpaqueImage(opaque);
        setRevealedImage(revealed);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Image load error:", err);
        setIsLoading(false);
      });
  }, [config.opaque_image_url, config.revealed_image_url]);

  // ── INITIALISER LE CANVAS ──
  useEffect(() => {
    if (!canvasRef.current || !opaqueImage || !revealedImage || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Définir la taille du canvas
    const width = revealedImage.width;
    const height = revealedImage.height;

    // Adapter au conteneur
    if (containerRef.current) {
      const maxWidth = containerRef.current.clientWidth;
      const maxHeight = containerRef.current.clientHeight - 100;

      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      canvas.width = width * scale;
      canvas.height = height * scale;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    // Dessiner l'image opaque
    ctx.drawImage(opaqueImage, 0, 0, canvas.width, canvas.height);
  }, [opaqueImage, revealedImage, isLoading]);

  // ── GESTION DU DESSIN (FRICTION) ──
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    erase(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    erase(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const erase = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !revealedImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Mode "destination-out" pour effacer
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();

    // Recalculer le pourcentage
    updateRevealPercentage();

    // Vérifier si le seuil est atteint
    if (revealPercentage >= revealThreshold) {
      completeGame();
    }
  };

  const updateRevealPercentage = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let revealedPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) {
        revealedPixels++;
      }
    }

    const percentage = (revealedPixels / (canvas.width * canvas.height)) * 100;
    setRevealPercentage(Math.min(percentage, 100));
  };

  const completeGame = () => {
    const caurisEarned = miniGame.reward_cauris || 10;
    onComplete(100, caurisEarned);
  };

  const handleReset = () => {
    if (!canvasRef.current || !opaqueImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(opaqueImage, 0, 0, canvas.width, canvas.height);
    setRevealPercentage(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <p className="text-sm text-gray-300 text-center">
        {lang === "fr"
          ? "Frottez l'écran pour révéler le message caché"
          : "Rub the screen to reveal the hidden message"}
      </p>

      {/* Canvas */}
      <div className="relative bg-black rounded-lg border border-gray-700 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-auto cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            setIsDrawing(true);
            const touch = e.touches[0];
            erase({
              clientX: touch.clientX,
              clientY: touch.clientY,
            } as any);
          }}
          onTouchMove={(e) => {
            if (!isDrawing) return;
            const touch = e.touches[0];
            erase({
              clientX: touch.clientX,
              clientY: touch.clientY,
            } as any);
          }}
          onTouchEnd={() => setIsDrawing(false)}
        />
      </div>

      {/* Barre de progression */}
      {showProgressBar && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {lang === "fr" ? "Révélé" : "Revealed"}
            </span>
            <span className="font-mono text-[#D4AF37]">
              {Math.round(revealPercentage)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <motion.div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-yellow-400 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${revealPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} />
          {lang === "fr" ? "Réinitialiser" : "Reset"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2"
        >
          <X size={14} />
          {lang === "fr" ? "Abandonner" : "Quit"}
        </button>
      </div>
    </div>
  );
}