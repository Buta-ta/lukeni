"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, Mouse, ScanSearch, 
  Coins, Wrench, BookOpen, Target, Briefcase, 
  Puzzle, Gamepad2, Brain, MessageCircle, Flag, HelpCircle, PieChart
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: "fr" | "en";
  hasWordSearch?: boolean;
  hasMiniGames?: boolean;
  hasDeduction?: boolean;
  hasGroup?: boolean;
}

export default function TutorialModal({ isOpen, onClose, lang, hasWordSearch, hasMiniGames, hasDeduction, hasGroup }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // --- SLIDE 1: NAVIGATION ---
    {
      icon: <Mouse size={32} className="text-[#D4AF37]" />,
      title_fr: "L'Exploration",
      title_en: "Exploration",
      desc_fr: "Cliquez-glissez pour regarder autour de vous. Molette ou touches A/R pour zoomer. 🕹️ Utilisez le joystick sur mobile.",
      desc_en: "Click and drag to look around. Scroll or A/R keys to zoom. 🕹️ Use the joystick on mobile.",
      visual: (
        <div className="flex items-center justify-center gap-4 my-4 text-2xl">
          <span className="animate-bounce">👆</span>
          <span className="text-gray-500">↔</span>
          <span className="font-mono text-sm text-[#D4AF37] bg-black/50 px-2 py-1 rounded">A</span>
          <span className="font-mono text-sm text-[#D4AF37] bg-black/50 px-2 py-1 rounded">R</span>
        </div>
      )
    },
    // --- SLIDE 2: HOTSPOTS ---
    {
      icon: <ScanSearch size={32} className="text-cyan-400" />,
      title_fr: "Interactions",
      title_en: "Interactions",
      desc_fr: "Cliquez sur les icônes lumineuses pour interagir : 🔍 Indices, 💬 Personnages, 🚪 Scènes. 🔒 = Condition à remplir.",
      desc_en: "Click on glowing icons to interact: 🔍 Clues, 💬 Characters, 🚪 Scenes. 🔒 = Condition to meet.",
      visual: (
        <div className="flex items-center justify-center gap-3 my-4 text-2xl">
          <span className="animate-pulse">🔍</span>
          <span className="animate-pulse">💬</span>
          <span className="animate-pulse">🚪</span>
          <span className="opacity-50 grayscale">🔒</span>
        </div>
      )
    },

        // --- SLIDE SCANNER: MODE SCANNER ---
    {
      icon: <ScanSearch size={32} className="text-[#06b6d4]" />,
      title_fr: "Le Scanner",
      title_en: "The Scanner",
      desc_fr: "Utilisez la jumelle 🔭 (en bas à gauche) pour scanner la zone. Les hotspots cachés apparaissent brièvement, puis se re-cachent. Mémorisez leur position !",
      desc_en: "Use the binoculars 🔭 (bottom left) to scan the area. Hidden hotspots appear briefly, then hide again. Memorize their position!",
      visual: (
        <div className="flex items-center justify-center gap-3 my-4 text-3xl">
          <span>🔭</span>
          <span className="text-gray-500">→</span>
          <span className="text-[#06b6d4] animate-pulse">📡</span>
          <span className="text-gray-500">→</span>
          <span className="text-[#D4AF37]">✨</span>
        </div>
      )
    },

    
    // --- SLIDE 3: CAURIS ECONOMY ---
    {
      icon: <Coins size={32} className="text-[#D4AF37]" />,
      title_fr: "L'Économie",
      title_en: "Economy",
      desc_fr: "Bonne réponse : +5 💰. Mauvaise : -1 💰. Révéler un indice coûte des Cauris. Budget à 0 = Fin de partie !",
      desc_en: "Right answer: +5 💰. Wrong: -1 💰. Revealing clues costs Cauris. Budget at 0 = Game Over!",
      visual: (
        <div className="flex items-center justify-center gap-4 my-4 font-mono font-bold">
          <span className="text-green-400 text-lg">+5</span>
          <span className="text-red-400 text-lg">-1</span>
          <span className="text-red-500 text-xs border border-red-500/30 px-2 py-1 rounded">💀 = 0</span>
        </div>
      )
    },
     // --- SLIDE 4: VOS OUTILS (PERMANENTS) ---
    {
      icon: <Wrench size={32} className="text-purple-400" />,
      title_fr: "Vos Outils d'Enquêteur",
      title_en: "Your Investigator Tools",
      desc_fr: "Consultez le Guide et la Mission. Lisez la Mémoire pour le contexte historique. Suivez votre progression avec le Rapport !",
      desc_en: "Check the Guide and Mission. Read Memory for historical context. Track your progress with the Report!",
      visual: (
        <div className="flex flex-wrap items-center justify-center gap-2 my-4">
          <ToolChip icon={<HelpCircle size={14}/>} label="Guide (Aide)" active />
          <ToolChip icon={<Flag size={14}/>} label="Mission" active />
          <ToolChip icon={<BookOpen size={14}/>} label="Mémoire (Histoire)" active />
          <ToolChip icon={<Target size={14}/>} label="Énigmes" active />
          <ToolChip icon={<Briefcase size={14}/>} label="Preuves" active />
          <ToolChip icon={<Puzzle size={14}/>} label="Puzzle" active />
          <ToolChip icon={<Gamepad2 size={14}/>} label="Mini-Jeux" active />
          <ToolChip icon={<Brain size={14}/>} label="Déduction" active />
          <ToolChip icon={<MessageCircle size={14}/>} label="Chat" active />
          <ToolChip icon={<PieChart size={14}/>} label="Rapport (%)" active />
        </div>
      )
    }
  ];

  const totalSlides = slides.length;
  const slide = slides[currentSlide];

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col"
          >
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-3 right-3 text-white/50 hover:text-white z-10">
              <X size={18} />
            </button>

            {/* Slide Content */}
            <div className="p-8 flex-1 flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-white/5 rounded-full border border-white/10">
                {slide.icon}
              </div>
              
              <h2 className="text-2xl font-serif font-bold text-white mb-2">
                {lang === "fr" ? slide.title_fr : slide.title_en}
              </h2>
              
              <p className="text-sm text-gray-300 leading-relaxed mb-4 max-w-sm">
                {lang === "fr" ? slide.desc_fr : slide.desc_en}
              </p>

              {slide.visual}
            </div>

            {/* Footer Navigation */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/30">
              <button 
                onClick={() => setCurrentSlide(p => Math.max(0, p - 1))} 
                disabled={currentSlide === 0}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full transition-all ${i === currentSlide ? 'bg-[#D4AF37] w-4' : 'bg-white/20'}`} 
                  />
                ))}
              </div>

              {currentSlide < totalSlides - 1 ? (
                <button 
                  onClick={() => setCurrentSlide(p => p + 1)}
                  className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button 
                  onClick={handleClose}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-white text-black text-xs font-bold rounded-lg transition-all"
                >
                  {lang === "fr" ? "C'est parti !" : "Let's go!"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Micro Composant pour les outils dynamiques ---
function ToolChip({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
      {icon} {label}
    </div>
  );
}