"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, AlertCircle } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";

// ✅ AJOUTER CETTE FONCTION dans chaque mini-game
const markMiniGameComplete = async (miniGameId: string, sessionId: string) => {
  if (!sessionId) return;

  // ✅ Stocker le FORMAT COMPLET pour matcher les conditions de hotspot
  const conditionKey = `minigame_${miniGameId}_completed`;

  try {
    const { data: session } = await supabase
      .from('investigation_sessions')
      .select('completed_mini_games')
      .eq('id', sessionId)
      .single();

    const completed = session?.completed_mini_games || [];
    if (!completed.includes(conditionKey)) {
      const updated = [...completed, conditionKey];
      await supabase
        .from('investigation_sessions')
        .update({ completed_mini_games: updated })
        .eq('id', sessionId);
    }
  } catch (err) {
    console.error('❌ Erreur sauvegarde mini-game complété:', err);
  }
};

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
  sessionId: string;
}

interface Anomaly {
  id: string;
  type: "duplicate_entry" | "wrong_sum" | "crossed_out" | "suspicious_amount";
  x_percent: number;
  y_percent: number;
  description_fr: string;
  description_en: string;
  hint_fr: string;
  hint_en: string;
}

export default function AnomalyDetectorGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
  sessionId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [foundAnomalies, setFoundAnomalies] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [hoveredAnomaly, setHoveredAnomaly] = useState<string | null>(null);

  const config = miniGame.config || {};
  const ledgerImageUrl = lang === "fr" ? config.ledger_image_url_fr : (config.ledger_image_url_en || config.ledger_image_url_fr);
  const minAnomalies = config.min_anomalies_to_find || 3;

  // ── CHARGER L'IMAGE DU GRAND LIVRE ──
  useEffect(() => {
    if (!ledgerImageUrl) {
      setIsLoading(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setAnomalies(config.anomalies || []);
      setIsLoading(false);
    };
    img.onerror = () => setIsLoading(false);
    img.src = ledgerImageUrl;
  }, [ledgerImageUrl, config]);

  // ── GÉRER LE CLIC SUR UNE ANOMALIE ──
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !image) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Vérifier si le clic est près d'une anomalie
    anomalies.forEach((anomaly) => {
      const distance = Math.sqrt(
        Math.pow(clickX - anomaly.x_percent, 2) +
        Math.pow(clickY - anomaly.y_percent, 2)
      );

      // Zone de clic: 8% de la largeur/hauteur
      if (distance < 8 && !foundAnomalies.includes(anomaly.id)) {
        setFoundAnomalies((prev) => [...prev, anomaly.id]);
      }
    });
  };

  // ── RETIRER UNE ANOMALIE DÉTECTÉE ──
  const removeAnomaly = (anomalyId: string) => {
    setFoundAnomalies((prev) => prev.filter((a) => a !== anomalyId));
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    if (foundAnomalies.length === 0) return;

    setIsSubmitting(true);

    // Vérifier que le minimum d'anomalies a été trouvé
    const minimumMet = foundAnomalies.length >= minAnomalies;
    const allCorrect = foundAnomalies.every((id) =>
      anomalies.some((a) => a.id === id)
    );

    setTimeout(() => {
      if (minimumMet && allCorrect) {
        setFeedback(lang === "fr" ? "✅ Fraudes Détectées" : "✅ Frauds Detected");
        const score = foundAnomalies.length * 20;
        // ✅ MARQUER COMME COMPLÉTÉ AVANT onComplete
        markMiniGameComplete(miniGame.id, sessionId);
        setTimeout(() => onComplete(score, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback(
          lang === "fr"
            ? `❌ Trouvez au moins ${minAnomalies} anomalies`
            : `❌ Find at least ${minAnomalies} anomalies`
        );
        const penalty = miniGame.penalty_per_error || 1;
        if (budgetCauris - penalty <= 0) onFail(penalty);
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

  const getAnomalyTypeIcon = (type: string) => {
    switch (type) {
      case "duplicate_entry":
        return "🔄";
      case "wrong_sum":
        return "🧮";
      case "crossed_out":
        return "✏️";
      case "suspicious_amount":
        return "⚠️";
      default:
        return "❓";
    }
  };

  const getAnomalyTypeColor = (type: string) => {
    switch (type) {
      case "duplicate_entry":
        return "from-yellow-500 to-orange-500";
      case "wrong_sum":
        return "from-red-500 to-pink-500";
      case "crossed_out":
        return "from-purple-500 to-violet-500";
      case "suspicious_amount":
        return "from-orange-500 to-red-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Titre et Instructions */}
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={18} className="text-[#D4AF37]" />
        <h3 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          {lang === "fr" ? "Audit du Grand Livre" : "Ledger Audit"}
        </h3>
      </div>

      {/* Instructions */}
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-4 space-y-2">
        <p className="text-blue-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr" ? "Instructions" : "Instructions"}
        </p>
        <p className="text-gray-300 text-sm">
          {lang === "fr"
            ? `Cliquez sur ${minAnomalies} anomalies ou plus dans le grand livre pour démasquer la fraude comptable.`
            : `Click on ${minAnomalies} or more anomalies in the ledger to expose accounting fraud.`}
        </p>
      </div>

      {/* Conteneur Image */}
      <div
        ref={containerRef}
        className="relative bg-[#0a0a0a] border-2 border-gray-700 rounded-lg overflow-hidden shadow-inner cursor-crosshair"
        style={{ aspectRatio: "4/3" }}
        onClick={handleImageClick}
      >
        {/* Image du Grand Livre */}
        {ledgerImageUrl && (
          <img
            ref={imageRef}
            src={ledgerImageUrl}
            alt="Ledger"
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay semi-transparent */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Marqueurs des Anomalies Trouvées */}
        {foundAnomalies.map((anomalyId) => {
          const anomaly = anomalies.find((a) => a.id === anomalyId);
          if (!anomaly) return null;

          return (
            <motion.div
              key={anomalyId}
              className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${anomaly.x_percent}%`,
                top: `${anomaly.y_percent}%`,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-full h-full rounded-full border-3 border-green-400 flex items-center justify-center bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              >
                <span className="text-lg">✓</span>
              </motion.div>
            </motion.div>
          );
        })}

        {/* Points Cibles (Guides visuels subtils) */}
        {showHints &&
          anomalies.map((anomaly) => {
            const isFound = foundAnomalies.includes(anomaly.id);

            return (
              <motion.div
                key={`hint-${anomaly.id}`}
                className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 z-5"
                style={{
                  left: `${anomaly.x_percent}%`,
                  top: `${anomaly.y_percent}%`,
                }}
                onMouseEnter={() => setHoveredAnomaly(anomaly.id)}
                onMouseLeave={() => setHoveredAnomaly(null)}
              >
                <motion.div
                  animate={!isFound ? { scale: [0.8, 1.1, 0.8] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-full h-full rounded-full border-2 border-dashed ${isFound
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-red-500/50 bg-red-500/5"
                    }`}
                />

                {/* Tooltip */}
                {hoveredAnomaly === anomaly.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[10px] text-gray-300 whitespace-nowrap z-20 border border-white/20"
                  >
                    {lang === "fr"
                      ? anomaly.description_fr
                      : anomaly.description_en}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
      </div>

      {/* Panneau Découverte */}
      <motion.div
        animate={{
          borderColor: foundAnomalies.length >= minAnomalies
            ? "rgba(34, 197, 94, 0.5)"
            : "rgba(239, 68, 68, 0.3)",
          backgroundColor: foundAnomalies.length >= minAnomalies
            ? "rgba(34, 197, 94, 0.05)"
            : "rgba(239, 68, 68, 0.05)",
        }}
        className="border-2 rounded-lg p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
            {lang === "fr" ? "Anomalies Détectées" : "Detected Anomalies"}
          </p>
          <button
            onClick={() => setShowHints(!showHints)}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${showHints
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/30"
              }`}
          >
            {lang === "fr" ? showHints ? "Masquer Indices" : "Afficher Indices" : showHints ? "Hide Hints" : "Show Hints"}
          </button>
        </div>

        {/* Barre de Progression */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>
              {foundAnomalies.length} / {minAnomalies}
            </span>
            <span>
              {Math.round((foundAnomalies.length / minAnomalies) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
            <motion.div
              animate={{
                width: `${Math.min(100, (foundAnomalies.length / minAnomalies) * 100)}%`,
              }}
              className={`h-full transition-colors ${foundAnomalies.length >= minAnomalies ? "bg-green-500" : "bg-red-500"
                }`}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Grille des Anomalies Trouvées */}
        {foundAnomalies.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {foundAnomalies.map((anomalyId) => {
              const anomaly = anomalies.find((a) => a.id === anomalyId);
              if (!anomaly) return null;

              return (
                <motion.div
                  key={anomalyId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`relative p-2 rounded border-2 bg-gradient-to-br ${getAnomalyTypeColor(
                    anomaly.type
                  )} bg-opacity-10 border-opacity-30 group`}
                >
                  <div className="text-center">
                    <p className="text-lg">
                      {getAnomalyTypeIcon(anomaly.type)}
                    </p>
                    <p className="text-[8px] text-gray-400 mt-1 truncate">
                      {lang === "fr"
                        ? anomaly.description_fr
                        : anomaly.description_en}
                    </p>
                  </div>

                  {/* Bouton Retirer */}
                  <button
                    onClick={() => removeAnomaly(anomalyId)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center bg-black/50 rounded text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Message */}
        {foundAnomalies.length < minAnomalies && (
          <p className="text-red-400 text-[10px] text-center">
            {lang === "fr"
              ? `Trouvez ${minAnomalies - foundAnomalies.length} anomalies supplémentaires`
              : `Find ${minAnomalies - foundAnomalies.length} more anomalies`}
          </p>
        )}
      </motion.div>

      {/* Référence des Types */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <p className="text-gray-400 font-mono text-[10px] uppercase mb-3 font-bold">
          {lang === "fr" ? "Types d'Anomalies" : "Anomaly Types"}
        </p>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-2 text-gray-400">
            <span>🔄</span>
            <span>{lang === "fr" ? "Doublon" : "Duplicate"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>🧮</span>
            <span>{lang === "fr" ? "Mauvaise Somme" : "Wrong Sum"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>✏️</span>
            <span>{lang === "fr" ? "Raturé" : "Crossed Out"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>⚠️</span>
            <span>{lang === "fr" ? "Montant Suspect" : "Suspicious"}</span>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center font-mono text-sm text-[#D4AF37]"
        >
          {feedback}
        </motion.div>
      )}

      {/* Boutons Action */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2"
        >
          <X size={16} /> {lang === "fr" ? "Quitter" : "Abort"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={foundAnomalies.length < minAnomalies || isSubmitting}
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider l'Audit" : "Validate Audit"}
        </button>
      </div>
    </div>
  );
}