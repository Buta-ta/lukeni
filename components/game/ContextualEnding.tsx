// components/game/ContextualEnding.tsx
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, LogOut, Puzzle, Search, Briefcase, Coins } from "lucide-react";

interface ContextualEndingProps {
  lang: "fr" | "en";
  title: string;
  message: string;
  endingType: "victory" | "abandon" | "alternate";
  score: number;
  solvedEnigmas: number;
  totalEnigmas: number;
  collectedEvidences: number;
  totalEvidences: number;
  reward: number;
  budgetCauris?: number; // ✅ NOUVEAU : Cauris actuels du joueur
  solvedWordSearches?: number; // ✅ NOUVEAU
  totalWordSearches?: number; // ✅ NOUVEAU
  onReplay: () => void;
  onExit: () => void;
}

export default function ContextualEnding({
  lang, title, message, endingType, score,
  solvedEnigmas, totalEnigmas, collectedEvidences, totalEvidences, reward,
  budgetCauris = 0, solvedWordSearches = 0, totalWordSearches = 0,
  onReplay, onExit,
}: ContextualEndingProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(t);
  }, []);

  const bgColor = endingType === "victory" ? "bg-green-950" : endingType === "alternate" ? "bg-amber-950" : "bg-red-950";
  const accentColor = endingType === "victory" ? "#10b981" : endingType === "alternate" ? "#f59e0b" : "#ef4444";
  const Icon = endingType === "victory" ? null : AlertTriangle;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`h-[100dvh] w-screen ${bgColor} flex flex-col items-center justify-center relative overflow-hidden z-[100]`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)` }} />

      <div className="relative z-10 max-w-2xl w-full mx-4 space-y-8 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.8 }} transition={{ delay: 0.3, type: "spring" }} className="space-y-4">
          {Icon && <Icon size={64} className="mx-auto animate-pulse" style={{ color: accentColor }} />}
          <h1 className="text-4xl md:text-5xl font-black font-serif tracking-widest" style={{ color: accentColor }}>{title}</h1>
          <p className="text-lg font-serif italic text-gray-200 max-w-lg mx-auto leading-relaxed">"{message}"</p>
        </motion.div>

        {/* ✅ NOUVEAU : Grille de stats complète */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }} transition={{ delay: 0.8 }} className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border" style={{ borderColor: accentColor + "44" }}>
          
          {/* Score global */}
          <div className="mb-6 pb-4 border-b border-white/10">
            <p className="text-5xl font-black" style={{ color: accentColor }}>{score}%</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
              {lang === "fr" ? "Score Global" : "Global Score"}
            </p>
          </div>

          {/* Stats détaillées */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* Énigmes */}
            <div className="bg-white/5 p-3 rounded-xl">
              <Search size={16} className="mx-auto mb-1 text-green-400" />
              <p className="text-xl font-black text-green-400">{solvedEnigmas}/{totalEnigmas}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                {lang === "fr" ? "Énigmes" : "Enigmas"}
              </p>
            </div>

            {/* Preuves */}
            <div className="bg-white/5 p-3 rounded-xl">
              <Briefcase size={16} className="mx-auto mb-1 text-blue-400" />
              <p className="text-xl font-black text-blue-400">{collectedEvidences}/{totalEvidences}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                {lang === "fr" ? "Preuves" : "Evidence"}
              </p>
            </div>

            {/* Mots Mêlés */}
            <div className="bg-white/5 p-3 rounded-xl">
              <Puzzle size={16} className="mx-auto mb-1 text-pink-400" />
              <p className="text-xl font-black text-pink-400">{solvedWordSearches}/{totalWordSearches}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                {lang === "fr" ? "Mots Mêlés" : "Word Search"}
              </p>
            </div>

            {/* Cauris */}
            <div className="bg-white/5 p-3 rounded-xl">
              <Coins size={16} className="mx-auto mb-1 text-[#D4AF37]" />
              <p className="text-xl font-black text-[#D4AF37]">{budgetCauris}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                {lang === "fr" ? "Cauris" : "Cauris"}
              </p>
            </div>
          </div>

          {/* Récompense */}
          {reward > 0 && endingType === "victory" && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-gray-400">
                {lang === "fr" ? "Récompense :" : "Reward:"}{" "}
                <span className="text-[#D4AF37] font-black text-lg">+{reward} Cauris</span>
              </p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: showContent ? 1 : 0 }} transition={{ delay: 1.2 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onReplay} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors border border-white/20 flex items-center justify-center gap-2">
            <RotateCcw size={16} /> {lang === "fr" ? "REJOUER" : "REPLAY"}
          </button>
          <button onClick={onExit} className="px-8 py-3 text-black rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: accentColor }} >
            <LogOut size={16} /> {lang === "fr" ? "QUITTER" : "EXIT"}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}