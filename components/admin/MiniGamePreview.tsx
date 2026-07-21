"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Info } from "lucide-react";
import { MiniGameRenderer } from "@/components/game/MiniGames";

interface Props {
  miniGame: any;
  isOpen: boolean;
  onClose: () => void;
  lang?: "fr" | "en";
}

export default function MiniGamePreview({
  miniGame,
  isOpen,
  onClose,
  lang = "fr",
}: Props) {
  const [showInfo, setShowInfo] = useState(true);

  if (!isOpen) return null;

  const getGameDescription = (type: string) => {
    const descriptions: Record<string, { fr: string; en: string }> = {
      radio: {
        fr: "L'admin entend une transmission radio bruitée. L'objectif du jeu est d'ajuster la fréquence pour capter le message caché. La bonne réponse attendue est affichée ci-dessous.",
        en: "Admin hears a noisy radio transmission. The goal is to adjust the frequency to capture the hidden message. The expected answer is shown below.",
      },
      ballistics: {
        fr: "L'admin doit analyser un échantillon au microscope en ajustant la netteté et le filtre lumineux. Les paramètres cibles sont affichés.",
        en: "Admin must analyze a sample under a microscope by adjusting focus and light filter. Target parameters are shown.",
      },
      puzzle: {
        fr: "L'admin doit reconstituer une image en réarrangeant les pièces du puzzle. La grille est déjà en position correcte pour tester.",
        en: "Admin must reassemble an image by rearranging puzzle pieces. The grid is already in correct position for testing.",
      },
      canvas: {
        fr: "L'admin frotte l'écran pour révéler un message caché. Le seuil de révélation est indiqué.",
        en: "Admin rubs the screen to reveal a hidden message. The reveal threshold is shown.",
      },
      map: {
        fr: "L'admin clique sur les points d'intérêt dans l'ordre cible pour tracer l'itinéraire correct.",
        en: "Admin clicks on points of interest in the target order to trace the correct route.",
      },
      portrait: {
        fr: "L'admin ajuste les calques pour reconstituer le portrait correct en fonction des paramètres cibles.",
        en: "Admin adjusts the layers to reconstruct the correct portrait according to target parameters.",
      },
      chemical: {
        fr: "L'admin sélectionne un échantillon et l'analyse. L'échantillon marqué comme 'correct' doit avoir une similarité ≥ au seuil.",
        en: "Admin selects a sample and analyzes it. The sample marked as 'correct' must have similarity ≥ threshold.",
      },

      counterfeit: {
        fr: "L'admin analyse un billet au microscope. Il doit ajuster la netteté et le filtre lumineux, puis détecter les marqueurs de sécurité (fil, filigrane, etc.) pour authentifier ou rejeter le billet.",
        en: "Admin analyzes a banknote under a microscope. Must adjust focus and light filter, then detect security markers to authenticate or reject the note.",
      },
      exchange_rate: {
        fr: "L'admin compare des taux de change avec un graphique de référence. L'objectif est de détecter les taux falsifiés parmi une liste de taux officiels et frauduleux.",
        en: "Admin compares exchange rates with a reference chart. Goal is to detect fraudulent rates among a list of official and manipulated rates.",
      },
      banking_flow: {
        fr: "L'admin trace un réseau financier par Drag & Drop. Il relie les entités (sociétés écrans, banques, comptes) pour exposer le réseau de blanchiment. Les bonnes connexions sont identifiées, les suspectes en rouge.",
        en: "Admin traces a financial network by Drag & Drop. Links entities (shell companies, banks, accounts) to expose the money laundering network. Correct connections in green, suspicious in red.",
      },
      treasury_calcul: {
        fr: "L'admin examine des cartes (bordereaux de virement) qui se retournent au clic. Il doit sélectionner les bons documents et additionner leurs montants pour reconstituer le total détourné.",
        en: "Admin examines flip cards (transfer statements). Must select the correct documents and sum their amounts to reconstruct the embezzled total.",
      },
      anomaly_detector: {
        fr: "L'admin inspecte un grand livre comptable. Il doit cliquer sur les anomalies (doublons, mauvaises sommes, ratures, montants suspects) pour démasquer la fraude comptable.",
        en: "Admin inspects an accounting ledger. Must click on anomalies (duplicates, wrong sums, crossed-out entries, suspicious amounts) to expose accounting fraud.",
      },

      customs_contraband: {
        fr: "L'admin compare deux cargaisons (déclarée vs réelle) pour détecter la contrebande. Selon le mode, il doit cliquer sur les différences, comparer des tableaux numériques, ou inspecter des containers.",
        en: "Admin compares two shipments (declared vs actual) to detect contraband. Depending on mode, must click on differences, compare numeric tables, or inspect containers.",
      },
      signature_analysis: {
        fr: "L'admin analyse des signatures manuscrites pour identifier un faux. Il peut cliquer sur la fausse signature, zoomer pour repérer les différences subtiles, ou apparier signatures aux contrats.",
        en: "Admin analyzes handwritten signatures to identify a forgery. Can click on fake signature, zoom in to spot subtle differences, or match signatures to contracts.",
      },
      contract_clauses: {
        fr: "L'admin lit les clauses d'un contrat minier et identifie celles réellement désavantageuses pour le pays. Certaines semblent suspectes mais sont légitimes.",
        en: "Admin reads mining contract clauses and identifies those truly disadvantageous to the country. Some may seem suspicious but are legitimate.",
      },
      stock_manipulation: {
        fr: "L'admin détecte une manipulation boursière en identifiant le graphique avec un point d'inflexion suspect, ou en associant des événements aux graphiques correspondants.",
        en: "Admin detects stock manipulation by identifying the chart with a suspicious inflection point, or by matching events to corresponding charts.",
      },
    };

    return descriptions[type] || { fr: "", en: "" };
  };

  const desc = getGameDescription(miniGame.type);
  const descText = lang === "fr" ? desc.fr : desc.en;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#111] border border-purple-500/30 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-gradient-to-b from-purple-950/50 to-transparent p-4 sm:p-6 border-b border-purple-500/20 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded uppercase">
                    {miniGame.type}
                  </span>
                  <span className="text-xs text-gray-500">APERÇU READ-ONLY</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {lang === "fr" ? miniGame.title_fr : (miniGame.title_en || miniGame.title_fr)}
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-lg transition-colors"
                  title="Afficher/masquer les infos"
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CONTENU */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* INFO BLOC */}
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-purple-300 font-bold uppercase tracking-wider mb-2">
                        {lang === "fr" ? "Mode Aperçu" : "Preview Mode"}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        {descText}
                      </p>
                    </div>
                  </div>

                  {/* INFOS CONFIG */}
                  <div className="border-t border-purple-500/20 pt-3 mt-3 space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">
                      {lang === "fr" ? "Paramètres" : "Parameters"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-black/30 p-2 rounded border border-purple-500/10">
                        <span className="text-gray-600">
                          {lang === "fr" ? "Récompense" : "Reward"}:
                        </span>
                        <span className="text-purple-400 font-bold ml-1">
                          {miniGame.reward_cauris} 💰
                        </span>
                      </div>
                      {miniGame.timer_seconds > 0 && (
                        <div className="bg-black/30 p-2 rounded border border-purple-500/10">
                          <span className="text-gray-600">
                            {lang === "fr" ? "Timer" : "Timer"}:
                          </span>
                          <span className="text-red-400 font-bold ml-1">
                            {miniGame.timer_seconds}s
                          </span>
                        </div>
                      )}
                      {miniGame.max_attempts > 0 && (
                        <div className="bg-black/30 p-2 rounded border border-purple-500/10">
                          <span className="text-gray-600">
                            {lang === "fr" ? "Max tentatives" : "Max attempts"}:
                          </span>
                          <span className="text-orange-400 font-bold ml-1">
                            {miniGame.max_attempts}
                          </span>
                        </div>
                      )}
                      <div className="bg-black/30 p-2 rounded border border-purple-500/10">
                        <span className="text-gray-600">
                          {lang === "fr" ? "Pénalité" : "Penalty"}:
                        </span>
                        <span className="text-red-400 font-bold ml-1">
                          {miniGame.penalty_per_error} 💰/erreur
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CONFIG SPÉCIFIQUE */}
                  {miniGame.config && Object.keys(miniGame.config).length > 0 && (
                    <div className="border-t border-purple-500/20 pt-3 mt-3">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                        {lang === "fr" ? "Configuration du jeu" : "Game Config"}
                      </p>
                      <div className="bg-black/30 p-2 rounded border border-purple-500/10 text-[10px] text-gray-400 font-mono max-h-24 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(miniGame.config, null, 2).substring(0, 300)}...
                        </pre>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* LE JEU EN APERÇU (READ-ONLY STYLING) */}
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 sm:p-6">
                <div className="opacity-75 pointer-events-none">
                  <MiniGameRenderer
                    miniGame={miniGame}
                    onComplete={() => { }} // Read-only
                    onFail={() => { }} // Read-only
                    onClose={onClose}
                    onProgressUpdate={() => { }}
                    budgetCauris={999999}
                    lang={lang}
                    sessionId="preview-session"
                    userId="preview-user"
                  />
                </div>
              </div>

              {/* FOOTER INFO */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 text-[10px] text-amber-300 text-center">
                ⚠️ {lang === "fr"
                  ? "Cet aperçu est en lecture seule. Les actions ne sont pas enregistrées."
                  : "This preview is read-only. Actions are not saved."}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}