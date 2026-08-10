// components/game/AnimatedPortrait.tsx
// Portrait de personnage animé + audio de la réplique.
// Centralise : affichage du portrait, animation (glow/bouche) quand il parle,
// et lecture de l'audio du nœud (la voix du PNJ pour cette réplique).
"use client";

import React, { useEffect, useRef } from "react";

interface AnimatedPortraitProps {
  avatarUrl?: string | null;
  name?: string;
  role?: string;
  audioUrl?: string | null;   // audio de CE nœud / réplique
  isSpeaking: boolean;         // true quand le personnage parle
  onAudioEnd?: () => void;     // quand l'audio se termine (optionnel)
  size?: number;               // taille en px
}

export default function AnimatedPortrait({
  avatarUrl,
  name,
  role,
  audioUrl,
  isSpeaking,
  onAudioEnd,
  size = 64,
}: AnimatedPortraitProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gérer la lecture de l'audio quand isSpeaking change
  useEffect(() => {
    // Si on a un audio et que le perso parle
    if (audioUrl && isSpeaking) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => onAudioEnd?.();
      } else {
        // rejouer depuis le début
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play().catch(() => {});
    }
    // Si le perso arrête de parler OU pas d'audio → pause
    else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioUrl, isSpeaking, onAudioEnd]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div
        className="relative rounded-full overflow-hidden border-2 flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderColor: isSpeaking ? "#D4AF37" : "rgba(255,255,255,0.15)",
          boxShadow: isSpeaking ? "0 0 25px 8px rgba(212,175,55,0.6)" : "none",
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{
              // Respiration + micro-tremblement quand il parle
              transform: isSpeaking ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.3s ease",
              animation: isSpeaking ? "animated-portrait-talk 0.9s ease-in-out infinite" : "none",
            }}
          />
        ) : (
          <div className="w-full h-full bg-teal-500/20 flex items-center justify-center text-teal-400">
            {name?.charAt(0) || "?"}
          </div>
        )}
      </div>
      {name && (
        <span className="text-[10px] font-bold text-white text-center leading-tight">{name}</span>
      )}
      {role && (
        <span className="text-[9px] text-gray-500 text-center leading-tight">{role}</span>
      )}

      <style jsx>{`
        @keyframes animated-portrait-talk {
          0%, 100% { transform: scale(1.04) translateY(0); }
          50% { transform: scale(1.08) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
