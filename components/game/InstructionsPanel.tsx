// components/game/InstructionsPanel.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MapPin,
  Fingerprint,
  Clock,
  Users,
  Target,
  Network,
} from "lucide-react";

interface InstructionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "fr" | "en";
  hasTimeline: boolean;
  hasBoard: boolean;
  timerActive: boolean;
  hasGroup: boolean;
}

export default function InstructionsPanel({
  isOpen,
  onClose,
  lang,
  hasTimeline,
  hasBoard,
  timerActive,
  hasGroup,
}: InstructionsPanelProps) {
  const [expandedSections, setExpandedSections] = React.useState<
    Record<string, boolean>
  >({
    global: true,
    timeline: false,
    board: false,
    timer: false,
    group: false,
    enigmas: false,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);

  // Gestion du swipe vers le haut
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const diff = startYRef.current - endY;

    // Swipe vers le haut (au moins 50px)
    if (diff > 50) {
      onClose();
    }
    startYRef.current = null;
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const textContent = {
    fr: {
      title: "INSTRUCTIONS",
      global: {
        label: "📖 Guide du Détective",
        items: [
          "Naviguez en cliquant et en glissant pour explorer chaque panorama",
          "Cliquez sur les objets brillants pour collecter des preuves et indices",
          "Ouvrez le panneau 'ÉNIGMES' pour répondre aux questions",
          "Consultez votre inventaire dans 'PREUVES' pour voir ce que vous avez collecté",
          "Gagnez des Cauris en trouvant des preuves et répondant correctement aux énigmes",
          "Utilisez vos Cauris pour acheter des indice ou du temps supplémentaire",
        ],
      },
      timeline: {
        label: "🗓️ Timeline Chronologique",
        items: [
          "Drag & drop : Glissez une preuve de votre inventaire sur une date",
          "Trouvez la bonne preuve pour chaque moment historique",
          "Les dates validées restent verrouillées en vert",
          "Validez toutes les dates pour débloquer des récompenses",
        ],
      },
      board: {
        label: "🕸️ Tableau de Connexions",
        items: [
          "Glissez une preuve sur le fil entre deux entités pour établir un lien",
          "Trouvez les bonne preuve qui connectent les personnes/lieux/organisations",
          "Déplacez les nœuds pour mieux voir les connexions (touch & drag)",
          "Chaque lien établi peut déclencher des révélations",
        ],
      },
      timer: {
        label: "⏱️ Gestion du Temps",
        items: [
          "Vous avez un temps limité pour explorer cette scène",
          "Répondez correctement aux énigmes pour conserver votre temps",
          "Cliquez sur le bouton '+' pour acheter du temps avec vos Cauris",
          "Si le temps s'écoule, vous recevrez un Game Over",
        ],
      },
      group: {
        label: "💬 Jeu en Groupe",
        items: [
          "Vous jouez en groupe ! Utilisez le CHAT pour communiquer",
          "Voyez qui est connecté en temps réel dans la section Membres",
          "Partagez vos découvertes et organisez-vous pour résoudre l'enquête",
          "Les messages du groupe s'affichent pour tous instantanément",
        ],
      },
      enigmas: {
        label: "🧩 Les Énigmes",
        items: [
          "Chaque énigme a une réponse spécifique (insensible à la casse/accents)",
          "Vous avez des indices pour vous aider - cliquez pour en révéler",
          "Les indices gratuits se débloquent après 3 erreurs consécutives",
          "Vous pouvez payer des Cauris pour révéler un indice immédiatement",
          "Une bonne réponse vous rapporte +5 Cauris",
          "Une mauvaise réponse vous coûte -1 Cauri",
        ],
      },
    },
    en: {
      title: "INSTRUCTIONS",
      global: {
        label: "📖 Detective's Guide",
        items: [
          "Navigate by clicking and dragging to explore each panorama",
          "Click on shimmering objects to collect evidence and clues",
          "Open the 'ENIGMAS' panel to answer questions",
          "Check your inventory in 'EVIDENCE' to see what you've collected",
          "Earn Cauris by finding evidence and answering enigmas correctly",
          "Use your Cauris to buy clues or extra time",
        ],
      },
      timeline: {
        label: "🗓️ Timeline",
        items: [
          "Drag & drop: Drag evidence from your inventory onto a date",
          "Find the correct evidence for each historical moment",
          "Validated dates are locked in green",
          "Validate all dates to unlock rewards",
        ],
      },
      board: {
        label: "🕸️ Connection Board",
        items: [
          "Drag evidence onto the thread between two entities to make a link",
          "Find the right evidence that connects people/places/organizations",
          "Move nodes to better see connections (touch & drag)",
          "Each established link can trigger revelations",
        ],
      },
      timer: {
        label: "⏱️ Time Management",
        items: [
          "You have limited time to explore this scene",
          "Answer enigmas correctly to keep your time",
          "Click the '+' button to buy time with your Cauris",
          "If time runs out, you receive a Game Over",
        ],
      },
      group: {
        label: "💬 Group Play",
        items: [
          "You're playing as a group! Use CHAT to communicate",
          "See who's online in real time in the Members section",
          "Share your discoveries and coordinate to solve the investigation",
          "Group messages display to everyone instantly",
        ],
      },
      enigmas: {
        label: "🧩 Enigmas",
        items: [
          "Each enigma has a specific answer (case-insensitive/accent-insensitive)",
          "You have clues to help you - click to reveal them",
          "Free clues unlock after 3 consecutive errors",
          "You can pay Cauris to reveal a clue immediately",
          "A correct answer gives you +5 Cauris",
          "A wrong answer costs you -1 Cauri",
        ],
      },
    },
  };

  const content = textContent[lang];

  const sections = [
    {
      key: "global",
      show: true,
      data: content.global,
      icon: "📖",
    },
    {
      key: "timeline",
      show: hasTimeline,
      data: content.timeline,
      icon: "🗓️",
    },
    {
      key: "board",
      show: hasBoard,
      data: content.board,
      icon: "🕸️",
    },
    {
      key: "timer",
      show: timerActive,
      data: content.timer,
      icon: "⏱️",
    },
    {
      key: "group",
      show: hasGroup,
      data: content.group,
      icon: "💬",
    },
    {
      key: "enigmas",
      show: true,
      data: content.enigmas,
      icon: "🧩",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay semi-transparent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[25] bg-black/40 backdrop-blur-sm md:hidden"
          />

          {/* Panneau glissant */}
          <motion.div
            ref={panelRef}
            initial={{ y: -500, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -500, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed top-20 inset-x-0 z-[40] max-h-[70vh] overflow-y-auto bg-gradient-to-b from-black/95 to-black/90 border-b border-[#D4AF37]/20 shadow-2xl"
          >
            {/* Header du panneau */}
            <div className="sticky top-0 bg-black/95 px-4 py-3 flex items-center justify-between border-b border-[#D4AF37]/20 backdrop-blur-sm">
              <span className="font-mono text-xs text-[#D4AF37] tracking-widest font-bold flex items-center gap-2">
                <Lightbulb size={14} />
                {content.title}
              </span>
              <button
                onClick={onClose}
                className="text-[#D4AF37] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sections */}
            <div className="divide-y divide-white/10">
              {sections
                .filter((section) => section.show)
                .map((section) => (
                  <div key={section.key} className="bg-black/50">
                    {/* Header de section (accordéon) */}
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                    >
                      <span className="font-mono text-xs text-white font-bold flex items-center gap-2">
                        <span className="text-lg">{section.icon}</span>
                        {section.data.label}
                      </span>
                      {expandedSections[section.key] ? (
                        <ChevronUp size={14} className="text-gray-500 group-hover:text-white" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-500 group-hover:text-white" />
                      )}
                    </button>

                    {/* Contenu de la section */}
                    <AnimatePresence>
                      {expandedSections[section.key] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-white/5"
                        >
                          <ul className="px-4 py-3 space-y-2 text-xs text-gray-300 leading-relaxed">
                            {section.data.items.map((item, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-[#D4AF37] font-bold flex-shrink-0">
                                  ▸
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
            </div>

            {/* Footer info */}
            <div className="sticky bottom-0 px-4 py-2 bg-black/50 border-t border-white/10 text-[10px] text-gray-500 text-center font-mono">
              {lang === "fr"
                ? "Swipez vers le haut pour fermer"
                : "Swipe up to close"}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}