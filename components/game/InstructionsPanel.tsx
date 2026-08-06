"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Compass,
  Brain,
  Wallet,
  Users,
} from "lucide-react";

interface InstructionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "fr" | "en";
  hasTimeline: boolean;
  hasBoard: boolean;
  timerActive: boolean;
  hasGroup: boolean;
  hasMiniGames: boolean;
  hasWordSearch: boolean;
  hasDialogues: boolean;
  onShowTutorial?: () => void;
}

export default function InstructionsPanel({
  isOpen,
  onClose,
  lang,
  hasTimeline,
  hasBoard,
  timerActive,
  hasGroup,
  hasMiniGames,
  hasWordSearch,
  hasDialogues,
  onShowTutorial,
}: InstructionsPanelProps) {
  const [expandedThemes, setExpandedThemes] = React.useState<
    Record<string, boolean>
  >({
    exploration: true,
    deduction: false,
    economy: false,
    social: false,
  });

  const [expandedSections, setExpandedSections] = React.useState<
    Record<string, boolean>
  >({
    global: true,
    minigames: false,
    enigmas: false,
    wordsearch: false,
    dialogues: false,
    timeline: false,
    board: false,
    cauris: false,
    timer: false,
    ending: false,
    group: false,
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

    if (diff > 50) {
      onClose();
    }
    startYRef.current = null;
  };

  const toggleTheme = (theme: string) => {
    setExpandedThemes((prev) => ({
      ...prev,
      [theme]: !prev[theme],
    }));
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

      // ════════════════════════════════════════════════════════════════
      // THÈME 1 : EXPLORATION
      // ════════════════════════════════════════════════════════════════
      themes: {
        exploration: {
          label: "🧭 Exploration",
          icon: "🧭",
          sections: {
            global: {
              label: "📖 Guide du Détective",
              items: [
                "Naviguez en cliquant et en glissant pour explorer chaque panorama",
                "Cliquez sur les objets brillants pour collecter des preuves et indices",
                "Ouvrez le panneau 'ÉNIGMES' pour répondre aux questions",
                "Consultez votre inventaire dans 'PREUVES' pour voir ce que vous avez collecté",
                "Gagnez des Cauris en trouvant des preuves et répondant correctement",
                "Utilisez vos Cauris pour acheter des indices ou du temps supplémentaire",
              ],
            },
            minigames: {
              label: "🎮 Mini-jeux",
              items: [
                "Les mini-jeux sont accessibles via le bouton 'OUTILS' dans la barre du bas",
                "Chaque mini-jeu a une récompense en Cauris et peut avoir un timer",
                "🔍 Counterfeit : Utilisez les filtres UV/IR pour détecter les faux billets",
                "💹 ExchangeRate : Identifiez les taux de change falsifiés",
                "🏦 BankingFlow : Tracez le réseau de blanchiment d'argent",
                "💰 TreasuryCalcul : Reconstituez le montant détourné",
                "✍️ SignatureAnalysis : Identifiez les signatures falsifiées",
                "📜 ContractClauses : Repérez les clauses abusives dans les contrats",
                "📻 Radio : Ajustez la fréquence pour capter le message caché",
                "🧩 Puzzle : Reconstituez l'image fragmentée",
                "🗺️ Map : Tracez l'itinéraire dans le bon ordre",
                "Une erreur coûte des Cauris, mais réussir rapporte gros !",
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
            wordsearch: {
              label: "🔤 Mots Mêlés",
              items: [
                "Trouvez les mots cachés dans la grille en les sélectionnant",
                "Les mots peuvent être horizontaux, verticaux ou diagonaux",
                "Chaque mot trouvé rapporte des Cauris",
                "Des indices sont disponibles pour vous aider (payants)",
                "Attention au nombre limité de tentatives !",
              ],
            },
            dialogues: {
              label: "💬 Dialogues PNJ",
              items: [
                "Cliquez sur les personnages pour engager la conversation",
                "Choisissez vos réponses avec soin - elles influencent l'enquête",
                "Certains dialogues débloquent des preuves ou des indices",
                "Les PNJ peuvent révéler des informations cruciales",
              ],
            },
          },
        },

        // ════════════════════════════════════════════════════════════════
        // THÈME 2 : DÉDUCTION
        // ════════════════════════════════════════════════════════════════
        deduction: {
          label: "🧠 Déduction",
          icon: "🧠",
          sections: {
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
                "Trouvez les bonnes preuves qui connectent les personnes/lieux/organisations",
                "Déplacez les nœuds pour mieux voir les connexions (touch & drag)",
                "Chaque lien établi peut déclencher des révélations",
              ],
            },
          },
        },

        // ════════════════════════════════════════════════════════════════
        // THÈME 3 : ÉCONOMIE
        // ════════════════════════════════════════════════════════════════
        economy: {
          label: "💰 Économie",
          icon: "💰",
          sections: {
            cauris: {
              label: "💎 Cauris & Budget",
              items: [
                "Vous commencez avec un budget de Cauris (monnaie du jeu)",
                "Gagnez des Cauris en résolvant des énigmes (+5) et en trouvant des preuves",
                "Perdez des Cauris en répondant mal (-1) ou en déclenchant des pièges",
                "Les mini-jeux peuvent rapporter gros ou vous coûter cher",
                "⚠️ Si votre budget tombe à ZÉRO = BANQUEROUTE (Game Over)",
                "Gérez votre budget intelligemment pour aller au bout de l'enquête",
              ],
            },
            timer: {
              label: "⏱️ Gestion du Temps",
              items: [
                "Vous avez un temps limité pour explorer chaque scène",
                "Répondez correctement aux énigmes pour conserver votre temps",
                "Cliquez sur le bouton '+' pour acheter du temps avec vos Cauris",
                "Si le temps s'écoule, vous recevez un Game Over",
                "Certaines scènes récompensent la rapidité avec des Cauris bonus",
              ],
            },
            ending: {
              label: "🏁 Fin de Partie",
              items: [
                "Votre score final dépend de votre progression globale",
                "🏆 Rangs : S (100%), A (75%), B (50%), C (25%)",
                "Chaque rang débloque un message de fin différent",
                "💀 Game Over : Si le temps s'écoule ou si vous faites faillite",
                "🚪 Abandon : Vous pouvez quitter à tout moment via le menu",
                "Des fins alternatives peuvent se déclencher selon vos choix",
              ],
            },
          },
        },

        // ════════════════════════════════════════════════════════════════
        // THÈME 4 : SOCIAL
        // ════════════════════════════════════════════════════════════════
        social: {
          label: "👥 Social",
          icon: "👥",
          sections: {
            group: {
              label: "💬 Jeu en Groupe",
              items: [
                "Vous jouez en groupe ! Utilisez le CHAT pour communiquer",
                "Voyez qui est connecté en temps réel dans la section Membres",
                "Partagez vos découvertes et organisez-vous pour résoudre l'enquête",
                "Les messages du groupe s'affichent pour tous instantanément",
                "Réagissez aux messages avec des emojis pour exprimer votre accord",
              ],
            },
          },
        },
      },
    },

    en: {
      title: "INSTRUCTIONS",

      themes: {
        exploration: {
          label: "🧭 Exploration",
          icon: "🧭",
          sections: {
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
            minigames: {
              label: "🎮 Mini-Games",
              items: [
                "Mini-games are accessible via the 'TOOLS' button in the bottom bar",
                "Each mini-game has a Cauris reward and may have a timer",
                "🔍 Counterfeit: Use UV/IR filters to detect fake banknotes",
                "💹 ExchangeRate: Identify falsified exchange rates",
                "🏦 BankingFlow: Trace the money laundering network",
                "💰 TreasuryCalcul: Reconstruct the embezzled amount",
                "✍️ SignatureAnalysis: Identify forged signatures",
                "📜 ContractClauses: Spot abusive clauses in contracts",
                "📻 Radio: Adjust the frequency to capture the hidden message",
                "🧩 Puzzle: Reassemble the fragmented image",
                "🗺️ Map: Trace the route in the correct order",
                "A mistake costs Cauris, but success pays big!",
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
            wordsearch: {
              label: "🔤 Word Search",
              items: [
                "Find hidden words in the grid by selecting them",
                "Words can be horizontal, vertical, or diagonal",
                "Each found word earns Cauris",
                "Clues are available to help you (paid)",
                "Watch out for the limited number of attempts!",
              ],
            },
            dialogues: {
              label: "💬 NPC Dialogues",
              items: [
                "Click on characters to start a conversation",
                "Choose your answers carefully - they influence the investigation",
                "Some dialogues unlock evidence or clues",
                "NPCs can reveal crucial information",
              ],
            },
          },
        },

        deduction: {
          label: "🧠 Deduction",
          icon: "🧠",
          sections: {
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
          },
        },

        economy: {
          label: "💰 Economy",
          icon: "💰",
          sections: {
            cauris: {
              label: "💎 Cauris & Budget",
              items: [
                "You start with a Cauris budget (in-game currency)",
                "Earn Cauris by solving enigmas (+5) and finding evidence",
                "Lose Cauris by answering wrong (-1) or triggering traps",
                "Mini-games can pay big or cost you dearly",
                "⚠️ If your budget hits ZERO = BANKRUPTCY (Game Over)",
                "Manage your budget wisely to complete the investigation",
              ],
            },
            timer: {
              label: "⏱️ Time Management",
              items: [
                "You have limited time to explore each scene",
                "Answer enigmas correctly to keep your time",
                "Click the '+' button to buy time with your Cauris",
                "If time runs out, you receive a Game Over",
                "Some scenes reward speed with bonus Cauris",
              ],
            },
            ending: {
              label: "🏁 End of Game",
              items: [
                "Your final score depends on your overall progress",
                "🏆 Ranks: S (100%), A (75%), B (50%), C (25%)",
                "Each rank unlocks a different ending message",
                "💀 Game Over: If time runs out or you go bankrupt",
                "🚪 Abandon: You can quit anytime via the menu",
                "Alternative endings can trigger based on your choices",
              ],
            },
          },
        },

        social: {
          label: "👥 Social",
          icon: "👥",
          sections: {
            group: {
              label: "💬 Group Play",
              items: [
                "You're playing as a group! Use CHAT to communicate",
                "See who's online in real time in the Members section",
                "Share your discoveries and coordinate to solve the investigation",
                "Group messages display to everyone instantly",
                "React to messages with emojis to express your agreement",
              ],
            },
          },
        },
      },
    },
  };

  const content = textContent[lang];

  // ════════════════════════════════════════════════════════════════
  // CONFIGURATION DES THÈMES ET SECTIONS
  // ════════════════════════════════════════════════════════════════
  const themesConfig = [
    {
      key: "exploration",
      data: content.themes.exploration,
      sections: [
        { key: "global", show: true, data: content.themes.exploration.sections.global },
        { key: "minigames", show: hasMiniGames, data: content.themes.exploration.sections.minigames },
        { key: "enigmas", show: true, data: content.themes.exploration.sections.enigmas },
        { key: "wordsearch", show: hasWordSearch, data: content.themes.exploration.sections.wordsearch },
        { key: "dialogues", show: hasDialogues, data: content.themes.exploration.sections.dialogues },
      ],
    },
    {
      key: "deduction",
      data: content.themes.deduction,
      sections: [
        { key: "timeline", show: hasTimeline, data: content.themes.deduction.sections.timeline },
        { key: "board", show: hasBoard, data: content.themes.deduction.sections.board },
      ],
    },
    {
      key: "economy",
      data: content.themes.economy,
      sections: [
        { key: "cauris", show: true, data: content.themes.economy.sections.cauris },
        { key: "timer", show: timerActive, data: content.themes.economy.sections.timer },
        { key: "ending", show: true, data: content.themes.economy.sections.ending },
      ],
    },
    {
      key: "social",
      data: content.themes.social,
      sections: [
        { key: "group", show: hasGroup, data: content.themes.social.sections.group },
      ],
    },
  ];

  // Filtrer les thèmes qui n'ont aucune section visible
  const visibleThemes = themesConfig.filter((theme) =>
    theme.sections.some((section) => section.show)
  );

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
                        <div className="sticky top-0 bg-black/95 px-4 py-3 flex items-center justify-between border-b border-[#D4AF37]/20 backdrop-blur-sm z-10">
              <span className="font-mono text-xs text-[#D4AF37] tracking-widest font-bold flex items-center gap-2">
                <Lightbulb size={14} />
                {content.title}
              </span>
              <div className="flex items-center gap-2">
                {/* ✅ Bouton pour revoir le Tutoriel rapide */}
                {onShowTutorial && (
                  <button
                    onClick={onShowTutorial}
                    className="flex items-center gap-1.5 px-3 py0.5 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-lg text-[10px] text-[#D4AF37] font-bold font-mono transition-all"
                  >
                    <span>🎓</span>
                    {lang === "fr" ? "Tutoriel" : "Tutorial"}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-[#D4AF37] hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Thèmes et Sections */}
            <div className="divide-y divide-[#D4AF37]/10">
              {visibleThemes.map((theme) => (
                <div key={theme.key} className="bg-black/50">
                  {/* Header du thème */}
                  <button
                    onClick={() => toggleTheme(theme.key)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors group bg-gradient-to-r from-[#D4AF37]/5 to-transparent"
                  >
                    <span className="font-mono text-sm text-[#D4AF37] font-bold flex items-center gap-2">
                      <span className="text-lg">{theme.data.icon}</span>
                      {theme.data.label}
                    </span>
                    {expandedThemes[theme.key] ? (
                      <ChevronUp size={16} className="text-[#D4AF37] group-hover:text-white" />
                    ) : (
                      <ChevronDown size={16} className="text-[#D4AF37] group-hover:text-white" />
                    )}
                  </button>

                  {/* Sections du thème */}
                  <AnimatePresence>
                    {expandedThemes[theme.key] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-white/5">
                          {theme.sections
                            .filter((section) => section.show)
                            .map((section) => (
                              <div key={section.key} className="bg-black/30">
                                {/* Header de section */}
                                <button
                                  onClick={() => toggleSection(section.key)}
                                  className="w-full px-6 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                                >
                                  <span className="font-mono text-xs text-white font-bold">
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
                                      <ul className="px-6 py-3 space-y-2 text-xs text-gray-300 leading-relaxed">
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