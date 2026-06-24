// components/game/DialogueBubble.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { DIALOGUE_BUBBLE_STYLES } from "@/types/panorama";

interface Props {
  text: string;
  speaker?: any;
  style: string;
  size: "small" | "medium" | "large";
  speed: number;
  lang: "fr" | "en";
  onClose: () => void;
}

export default function DialogueBubble({
  text,
  speaker,
  style,
  size,
  speed,
  lang,
  onClose,
}: Props) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Trouver le style de la bulle
  const bubbleStyle = DIALOGUE_BUBBLE_STYLES.find((s) => s.id === style) || DIALOGUE_BUBBLE_STYLES[0];

  // Taille de la bulle
  const sizeClasses = {
    small: "max-w-[280px]",
    medium: "max-w-[380px]",
    large: "max-w-[500px]",
  };

  // Animation Machine à écrire
  useEffect(() => {
    if (!text) return;

    let i = 0;
    setDisplayText("");
    setIsTyping(true);

    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed || 30);

    return () => clearInterval(interval);
  }, [text, speed]);

    return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      >
        {/* ✅ Backdrop semi-transparent (cliquer dessus ferme la bulle) */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* ✅ Bulle de dialogue (centrée) */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          className={`relative ${sizeClasses[size] || sizeClasses.medium} w-[90vw] md:w-auto`}
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md border"
            style={{
              backgroundColor: bubbleStyle.bgColor + "E6",
              borderColor: bubbleStyle.borderColor,
            }}
          >
            {/* Header avec Speaker */}
            {speaker && (
              <div
                className="flex items-center gap-3 p-3 border-b"
                style={{ borderColor: bubbleStyle.borderColor + "44" }}
              >
                {/* Avatar */}
                {speaker.avatar_url ? (
                  <img
                    src={speaker.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0"
                    style={{ borderColor: bubbleStyle.accentColor }}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                    style={{
                      borderColor: bubbleStyle.borderColor,
                      backgroundColor: bubbleStyle.bgColor,
                    }}
                  >
                    <User size={16} style={{ color: bubbleStyle.accentColor }} />
                  </div>
                )}

                {/* Nom & Rôle */}
                <div className="min-w-0">
                  <p
                    className="font-bold text-sm truncate"
                    style={{ color: bubbleStyle.accentColor }}
                  >
                    {lang === "fr" ? speaker.name_fr : speaker.name_en}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: bubbleStyle.textColor + "99" }}>
                    {lang === "fr" ? speaker.role_fr : speaker.role_en}
                  </p>
                </div>
              </div>
            )}

            {/* Bouton Fermer */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-1.5 rounded-full transition-colors z-10"
              style={{ backgroundColor: bubbleStyle.bgColor + "80" }}
            >
              <X size={14} style={{ color: bubbleStyle.textColor }} />
            </button>

            {/* Corps du texte */}
            <div className="p-4 pt-3">
              <p
                className="text-sm leading-relaxed font-serif"
                style={{ color: bubbleStyle.textColor }}
              >
                {displayText}
                {/* Curseur clignotant */}
                {isTyping && (
                  <span
                    className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
                    style={{ backgroundColor: bubbleStyle.accentColor }}
                  />
                )}
              </p>
            </div>

            {/* Barre d'accent en bas */}
            <div
              className="h-1"
              style={{ backgroundColor: bubbleStyle.accentColor }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}