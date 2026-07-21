"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, AlertCircle, TrendingDown } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

interface StockData {
  id: string;
  product_fr: string;
  product_en: string;
  normal_trend: number[];
  suspicious_point_index: number;
  suspicious_point_value: number;
  is_manipulated: boolean;
}

interface TimelineEvent {
  id: string;
  date: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  is_relevant: boolean;
  stock_id?: string;
}

export default function StockManipulationGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"single" | "timeline">("single");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [matchedEvents, setMatchedEvents] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = miniGame.config || {};

  useEffect(() => {
    const configMode = config.market_mode || "single";
    if (["single", "timeline"].includes(configMode)) {
      setMode(configMode as "single" | "timeline");
    }
    setIsLoading(false);
  }, [config]);

  const stocks: StockData[] = config.stocks || [];
  const events: TimelineEvent[] = config.events || [];
  const targetStock = stocks.find((s) => s.is_manipulated);

  // ── MODE SINGLE : Cliquer sur le point suspect ──
  const handleSelectStock = (stockId: string) => {
    setSelectedStock(stockId);
  };

  // ── MODE TIMELINE : Apparier évènements et graphiques ──
  const handleMatchEvent = (eventId: string, stockId: string) => {
    setMatchedEvents((prev) => ({
      ...prev,
      [eventId]: stockId,
    }));
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    setIsSubmitting(true);

    let isCorrect = false;

    if (mode === "single") {
      isCorrect =
        selectedStock === targetStock?.id &&
        targetStock?.is_manipulated === true;
    } else if (mode === "timeline") {
      // Vérifier que tous les appariements sont corrects
      isCorrect = events.every((event) => {
        if (!event.is_relevant) return true; // Les événements non pertinents peuvent être ignorés
        const matchedStockId = matchedEvents[event.id];
        return matchedStockId === event.stock_id;
      });
    }

    setTimeout(() => {
      if (isCorrect) {
        setFeedback(
          lang === "fr"
            ? "✅ Manipulation Détectée"
            : "✅ Manipulation Detected"
        );
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 25), 1500);
      } else {
        setFeedback(
          lang === "fr"
            ? "❌ Analyse Incorrecte"
            : "❌ Incorrect Analysis"
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

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={18} className="text-[#D4AF37]" />
        <h3 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          {lang === "fr"
            ? "Détection Manipulation Boursière"
            : "Stock Manipulation Detection"}
        </h3>
      </div>

      {/* MODE SINGLE : Identifier le graphique manipulé */}
      {mode === "single" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {lang === "fr"
              ? "Identifiez le graphique avec un point d'inflexion suspect"
              : "Identify the chart with a suspicious inflection point"}
          </p>

          <div className="space-y-4">
            {stocks.map((stock) => (
              <motion.div
                key={stock.id}
                onClick={() => handleSelectStock(stock.id)}
                whileHover={{ scale: 1.02 }}
                animate={{
                  borderColor: selectedStock === stock.id
                    ? stock.is_manipulated ? "#ef4444" : "#22c55e"
                    : "rgba(255, 255, 255, 0.1)",
                  boxShadow: selectedStock === stock.id
                    ? stock.is_manipulated
                      ? "0 0 20px rgba(239, 68, 68, 0.3)"
                      : "0 0 20px rgba(34, 197, 94, 0.3)"
                    : "none",
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedStock === stock.id
                    ? stock.is_manipulated
                      ? "bg-red-500/10"
                      : "bg-green-500/10"
                    : "bg-white/5 hover:bg-white/[0.07]"
                }`}
              >
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">
                    {lang === "fr" ? stock.product_fr : stock.product_en}
                  </h4>

                  {/* Mini graphique ASCII */}
                  <div className="bg-black/40 p-3 rounded border border-white/10 font-mono text-[9px]">
                    <div className="flex items-end gap-0.5 h-16 justify-between">
                      {stock.normal_trend.map((value, idx) => {
                        const isPointSuspect =
                          idx === stock.suspicious_point_index &&
                          stock.is_manipulated;
                        const height = (value / 100) * 60;

                        return (
                          <motion.div
                            key={idx}
                            animate={{
                              backgroundColor: isPointSuspect
                                ? "#ef4444"
                                : "#06b6d4",
                            }}
                            className="flex-1 rounded-t transition-all"
                            style={{
                              height: `${height}%`,
                              minHeight: "4px",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Indicateurs */}
                  {selectedStock === stock.id && (
                    <p className="text-[10px] font-bold text-center">
                      {stock.is_manipulated ? (
                        <span className="text-red-400">
                          ⚠️ {lang === "fr" ? "SUSPECT" : "SUSPICIOUS"}
                        </span>
                      ) : (
                        <span className="text-green-400">
                          ✓ {lang === "fr" ? "NORMAL" : "NORMAL"}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* MODE TIMELINE : Associer événements aux graphiques */}
      {mode === "timeline" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {lang === "fr"
              ? "Associez chaque événement au graphique correspondant"
              : "Match each event to the corresponding chart"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeline à gauche */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {lang === "fr" ? "Événements" : "Events"}
              </p>

              <div className="relative space-y-3 pl-4">
                {/* Ligne verticale */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#D4AF37] to-transparent" />

                {events.map((event) => {
                  const isMatched = Object.keys(matchedEvents).includes(
                    event.id
                  );
                  const matchedStockId = matchedEvents[event.id];

                  return (
                    <motion.div
                      key={event.id}
                      onClick={() => {
                        // Pour la démo, on appariera au premier stock manipulé
                        const stockToMatch = stocks[0]?.id;
                        if (stockToMatch) {
                          handleMatchEvent(event.id, stockToMatch);
                        }
                      }}
                      whileHover={{ x: 5 }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isMatched
                          ? "bg-green-500/10 border-green-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-[10px] text-gray-600 flex-shrink-0 font-bold">
                          {event.date}
                        </span>
                        {isMatched && (
                          <span className="text-[9px] text-green-400 font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-gray-300">
                        {lang === "fr"
                          ? event.title_fr
                          : event.title_en}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-1">
                        {lang === "fr"
                          ? event.description_fr
                          : event.description_en}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Graphiques à droite */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {lang === "fr" ? "Graphiques" : "Charts"}
              </p>

              {stocks.map((stock) => {
                const isLinked = Object.values(matchedEvents).includes(
                  stock.id
                );

                return (
                  <motion.div
                    key={stock.id}
                    animate={{
                      borderColor: isLinked
                        ? "#22c55e"
                        : "rgba(255, 255, 255, 0.1)",
                      backgroundColor: isLinked
                        ? "rgba(34, 197, 94, 0.05)"
                        : "rgba(255, 255, 255, 0.02)",
                    }}
                    className="p-3 rounded-lg border-2 transition-all"
                  >
                    <p className="text-[10px] font-bold text-gray-300 mb-2">
                      {lang === "fr" ? stock.product_fr : stock.product_en}
                    </p>

                    {/* Mini graphique */}
                    <div className="bg-black/40 p-2 rounded border border-white/10 font-mono text-[9px]">
                      <div className="flex items-end gap-0.5 h-12 justify-between">
                        {stock.normal_trend.slice(0, 10).map((value, idx) => {
                          const isPointSuspect =
                            idx === stock.suspicious_point_index &&
                            stock.is_manipulated;
                          const height = (value / 100) * 40;

                          return (
                            <div
                              key={idx}
                              className={`flex-1 rounded-t transition-all ${
                                isPointSuspect
                                  ? "bg-red-500"
                                  : "bg-cyan-500"
                              }`}
                              style={{
                                height: `${height}%`,
                                minHeight: "2px",
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 flex justify-center items-center gap-2"
        >
          <X size={16} /> {lang === "fr" ? "Quitter" : "Abort"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={
            (mode === "single" && !selectedStock) || isSubmitting
          }
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider l'Analyse" : "Validate Analysis"}
        </button>
      </div>
    </div>
  );
}