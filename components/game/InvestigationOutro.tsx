// components/game/InvestigationOutro.tsx
"use client";

import React, { useEffect, useState, memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Briefcase, RotateCcw, LogOut, Trophy, AlertTriangle } from "lucide-react";
import { CaurisIcon } from "@/components/logo";

const LukeniLogo = memo(() => (
  <div className="flex flex-col items-center gap-2">
    <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#D4AF37]" fill="currentColor">
      <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
      <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
      <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span className="text-[#D4AF37] font-serif tracking-[0.4em] text-sm font-bold uppercase">Lukeni</span>
  </div>
));
LukeniLogo.displayName = "LukeniLogo";

interface InvestigationOutroProps {
  investigation: { title_fr: string; title_en: string; reward_cauris: number; };
  lang: "fr" | "en";
  solvedEnigmas: string[];
  totalEnigmas: number;
  collectedEvidences: string[];
  totalEvidences: number;
  config?: any; 
  isTimeout?: boolean; 
  forcedPreview?: { title: string; message: string; color?: string; score?: number };
  onReplay: () => void; // <-- LIGNE À RAJOUTER ICI
  onExit: () => void;
}

export default function InvestigationOutro({
  investigation, lang, solvedEnigmas, totalEnigmas, collectedEvidences, totalEvidences, config, isTimeout = false, forcedPreview, onReplay, onExit,
}: InvestigationOutroProps) {
  const [showContent, setShowContent] = useState(false);
  const [randomMessage, setRandomMessage] = useState("");

  const pointsEnigmas = solvedEnigmas.length * 100;
  const pointsEvidences = collectedEvidences.length * 50;
  const maxPoints = (totalEnigmas * 100) + (totalEvidences * 50);
  const percentage = forcedPreview?.score !== undefined ? forcedPreview.score : (maxPoints > 0 ? Math.round(((pointsEnigmas + pointsEvidences) / maxPoints) * 100) : 100);


  // 1. On trie les rangs du plus haut % au plus bas
  const sortedRanks = [...(config?.ranks || [])].sort((a: any, b: any) => b.min_percent - a.min_percent);
  
  // 2. On trouve le rang atteint par le joueur
  const achievedRank = sortedRanks.find((r: any) => percentage >= r.min_percent) || sortedRanks[sortedRanks.length - 1] || { title_fr: "DÉTECTIVE", title_en: "DETECTIVE", main_title_fr: "ENQUÊTE TERMINÉE", main_title_en: "INVESTIGATION COMPLETE", messages: [] };

  // 3. Maintenant on peut utiliser achievedRank pour calculer le titre
  const mainTitle = lang === "fr" 
    ? (achievedRank.main_title_fr || config?.title_fr || "ENQUÊTE TERMINÉE") 
    : (achievedRank.main_title_en || config?.title_en || "INVESTIGATION COMPLETE");

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 800);
    // Tirage au sort du message une seule fois au chargement
    if (!forcedPreview) {
      if (isTimeout && config?.game_overs?.length > 0) {
        const msgs = config.game_overs;
        const rand = msgs[Math.floor(Math.random() * msgs.length)];
        setRandomMessage(lang === 'fr' ? rand.text_fr : rand.text_en);
      } else if (!isTimeout && achievedRank?.messages?.length > 0) {
        const msgs = achievedRank.messages;
        const rand = msgs[Math.floor(Math.random() * msgs.length)];
        setRandomMessage(lang === 'fr' ? rand.text_fr : rand.text_en);
      }
    }
    return () => clearTimeout(t);
  }, []);

  const displayMessage = forcedPreview ? forcedPreview.message : randomMessage;
  const displayTitle = forcedPreview ? forcedPreview.title : (lang === "fr" ? achievedRank.title_fr : achievedRank.title_en);
  const displayColor = forcedPreview?.color || "#D4AF37";

  // ── GAME OVER (TIME OUT) ──
  if (isTimeout) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[100dvh] w-screen bg-[#0a0000] flex flex-col items-center justify-center relative overflow-hidden z-[100]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,#f00_100%)] pointer-events-none" />
        <div className="relative z-10 max-w-lg w-full mx-4 space-y-8 text-center bg-red-950/40 backdrop-blur-sm p-8 rounded-3xl border border-red-500/30">
          <AlertTriangle size={64} className="mx-auto text-red-500 mb-4 animate-pulse" />
          <h1 className="text-3xl md:text-4xl font-black text-red-500 tracking-widest">{lang === "fr" ? "TEMPS ÉCOULÉ" : "TIME OUT"}</h1>
          <p className="text-red-300 font-serif italic text-lg">"{displayMessage || 'Vous avez été arrêté.'}"</p>
          <div className="flex gap-3 pt-8">
            <button onClick={onReplay} className="flex-1 py-3 bg-red-900/50 hover:bg-red-800 text-white rounded-xl font-mono text-xs font-bold tracking-widest border border-red-500/50 transition-colors flex items-center justify-center gap-2"><RotateCcw size={14} />{lang === "fr" ? "RECOMMENCER" : "RETRY"}</button>
            <button onClick={onExit} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-mono text-xs font-bold tracking-widest transition-colors flex items-center justify-center gap-2"><LogOut size={14} />{lang === "fr" ? "ABANDONNER" : "ABORT"}</button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── VICTOIRE (RANGS) ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[100dvh] w-screen bg-[#05050A] flex flex-col items-center justify-center relative overflow-hidden z-[100]">
      {config?.background_image_url ? (
        <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${config.background_image_url})` }} />
      ) : (
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      )}

      {config?.audio_url && <audio src={config.audio_url} autoPlay className="hidden" />}

      {showContent && Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-[#D4AF37]" initial={{ opacity: 0, x: "50vw", y: "50vh" }} animate={{ opacity: [0, 1, 0], x: `${Math.random() * 100}vw`, y: `${Math.random() * 100}vh` }} transition={{ duration: 2 + Math.random() * 2, delay: i * 0.1 }} />
      ))}

      <div className="relative z-10 max-w-lg w-full mx-4 space-y-8 text-center bg-black/60 backdrop-blur-md p-8 rounded-3xl border border-[#D4AF37]/20 shadow-2xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}><LukeniLogo /></motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }} transition={{ delay: 0.6 }} className="space-y-2">
          <p className="text-[#D4AF37] font-mono text-xs tracking-[0.4em] uppercase">{mainTitle}</p>
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-white">{lang === "fr" ? investigation.title_fr : investigation.title_en}</h1>
          {displayMessage && <p className="text-gray-300 text-sm mt-4 font-serif italic leading-relaxed">"{displayMessage}"</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.8 }} transition={{ delay: 1, type: "spring" }} className="inline-flex flex-col items-center gap-1">
          <div className="px-6 py-2 rounded-full border font-mono text-sm font-bold tracking-widest flex items-center gap-2" style={{ borderColor: displayColor, color: displayColor, backgroundColor: `${displayColor}15` }}>
            <Trophy size={14} />{displayTitle}
          </div>
          <span className="text-[10px] text-gray-500 font-mono tracking-widest">SCORE: {percentage}%</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }} transition={{ delay: 1.2 }} className="grid grid-cols-3 gap-4">
          {[
            { icon: CheckCircle, value: `${solvedEnigmas.length}/${totalEnigmas}`, label: lang === "fr" ? "Énigmes" : "Enigmas", color: "#4ADE80" },
            { icon: Briefcase, value: `${collectedEvidences.length}/${totalEvidences}`, label: lang === "fr" ? "Preuves" : "Evidence", color: "#60A5FA" },
            { icon: CaurisIcon, value: `+${investigation.reward_cauris}`, label: "Cauris", color: "#D4AF37" },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2">
              <Icon size={20} className="mx-auto" style={{ color }} />
              <p className="font-serif text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: showContent ? 1 : 0 }} transition={{ delay: 1.6 }} className="flex flex-col sm:flex-row gap-3">
          <button onClick={onReplay} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/20 text-white rounded-xl font-mono text-xs font-bold tracking-widest hover:bg-white/10 transition-colors"><RotateCcw size={14} />{lang === "fr" ? "REJOUER" : "REPLAY"}</button>
          <button onClick={onExit} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#D4AF37] text-black rounded-xl font-mono text-xs font-bold tracking-widest hover:bg-white transition-colors"><LogOut size={14} />{lang === "fr" ? "BUREAU" : "OFFICE"}</button>
        </motion.div>
      </div>
    </motion.div>
  );
}