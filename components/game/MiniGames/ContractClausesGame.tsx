"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence } from "framer-motion";
interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

interface Clause {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  is_disadvantageous: boolean;
  impact_level: number; // 1-5
  explanation_fr: string;
  explanation_en: string;
}

export default function ContractClausesGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = miniGame.config || {};
  const clauses: Clause[] = config.clauses || [];
  const requiredFindsCount = config.required_disadvantageous_count || 3;

  useEffect(() => {
    setIsLoading(false);
  }, [config]);

  // ── SÉLECTIONNER/DÉSÉLECTIONNER UNE CLAUSE ──
  const handleToggleClause = (clauseId: string) => {
    setSelectedClauses((prev) =>
      prev.includes(clauseId)
        ? prev.filter((id) => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    if (selectedClauses.length === 0) return;

    setIsSubmitting(true);

    // Trouver les clauses réellement désavantageuses
    const disadvantageousClauses = clauses.filter(
      (c) => c.is_disadvantageous
    );

    // Vérifier que seules les bonnes clauses sont sélectionnées
    const onlyCorrectSelected = selectedClauses.every((id) => {
      const clause = clauses.find((c) => c.id === id);
      return clause?.is_disadvantageous;
    });

    // Vérifier que le minimum de clauses a été trouvé
    const minimumMet = selectedClauses.filter((id) =>
      clauses.find((c) => c.id === id && c.is_disadvantageous)
    ).length >= requiredFindsCount;

    setTimeout(() => {
      if (onlyCorrectSelected && minimumMet) {
        setFeedback(lang === "fr" ? "✅ Contrat Léonin Exposé" : "✅ Unfair Contract Exposed");
        const score = selectedClauses.length * 25;
        setTimeout(() => onComplete(score, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback(
          lang === "fr"
            ? `❌ Trouvez au moins ${requiredFindsCount} clauses désavantageuses`
            : `❌ Find at least ${requiredFindsCount} disadvantageous clauses`
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

  const disadvantageousCount = clauses.filter((c) => c.is_disadvantageous).length;
  const foundCorrectCount = selectedClauses.filter((id) =>
    clauses.find((c) => c.id === id && c.is_disadvantageous)
  ).length;

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={18} className="text-[#D4AF37]" />
        <h3 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          {lang === "fr" ? "Analyse Contrat Minier" : "Mining Contract Analysis"}
        </h3>
      </div>

      {/* Instructions */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4 space-y-2">
        <p className="text-amber-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr" ? "Objectif" : "Objective"}
        </p>
        <p className="text-gray-300 text-sm">
          {lang === "fr"
            ? "Identifiez les clauses réellement désavantageuses pour le pays. Certaines clauses semblent suspectes mais sont légitimes."
            : "Identify clauses that are truly disadvantageous to the country. Some clauses may seem suspicious but are legitimate."}
        </p>
      </div>

      {/* Grille de Clauses */}
      <div className="space-y-3">
        {clauses.map((clause) => {
          const isSelected = selectedClauses.includes(clause.id);
          const isExpanded = expandedClause === clause.id;
          const isDisadvantageousInList = clause.is_disadvantageous;

          return (
            <motion.div
              key={clause.id}
              animate={{
                borderColor: isSelected
                  ? "#ef4444"
                  : "rgba(255, 255, 255, 0.1)",
              }}
              className={`border-2 rounded-lg overflow-hidden transition-all ${
                isSelected
                  ? "bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-white/5 hover:bg-white/[0.07]"
              }`}
            >
              {/* En-tête Clause */}
              <button
                onClick={() => handleToggleClause(clause.id)}
                className="w-full p-4 flex items-start gap-3 cursor-pointer"
              >
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? "bg-red-500 border-red-500"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </div>

                {/* Contenu */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h4 className="text-sm font-bold text-white">
                      {lang === "fr" ? clause.title_fr : clause.title_en}
                    </h4>
                    {isDisadvantageousInList && !isSelected && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded flex-shrink-0 font-bold">
                        ⚠️ {lang === "fr" ? "SUSPECTE" : "SUSPICIOUS"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">
                    {lang === "fr"
                      ? clause.description_fr
                      : clause.description_en}
                  </p>
                </div>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="flex-shrink-0 mt-1"
                >
                  <ChevronDown size={16} className="text-gray-500" />
                </motion.div>
              </button>

              {/* Détails Expandables */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10 bg-black/20"
                  >
                    <div className="p-4 space-y-3">
                      {/* Impact Level */}
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">
                          {lang === "fr" ? "Niveau de Préjudice" : "Impact Level"}
                        </p>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-2 rounded-full flex-1 ${
                                i < clause.impact_level
                                  ? "bg-red-500"
                                  : "bg-gray-800"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[9px] text-gray-500">
                          {clause.impact_level}/5
                        </p>
                      </div>

                      {/* Explication */}
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">
                          {lang === "fr" ? "Pourquoi ?" : "Why?"}
                        </p>
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          {lang === "fr"
                            ? clause.explanation_fr
                            : clause.explanation_en}
                        </p>
                      </div>

                      {/* Badge Verdict */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        {isDisadvantageousInList ? (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold flex items-center gap-1">
                            ❌ {lang === "fr" ? "Désavantageuse" : "Disadvantageous"}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold flex items-center gap-1">
                            ✓ {lang === "fr" ? "Légitime" : "Legitimate"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Statistiques */}
      <motion.div
        animate={{
          borderColor:
            foundCorrectCount >= requiredFindsCount
              ? "rgba(34, 197, 94, 0.5)"
              : "rgba(239, 68, 68, 0.3)",
          backgroundColor:
            foundCorrectCount >= requiredFindsCount
              ? "rgba(34, 197, 94, 0.05)"
              : "rgba(239, 68, 68, 0.05)",
        }}
        className="border-2 rounded-lg p-4 space-y-3"
      >
        <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr" ? "Progression" : "Progress"}
        </p>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600">
              {lang === "fr" ? "Trouvées" : "Found"}:
            </span>
            <p className="text-red-400 font-bold">
              {foundCorrectCount}/{requiredFindsCount}
            </p>
          </div>
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600">
              {lang === "fr" ? "Existantes" : "Total"}:
            </span>
            <p className="text-gray-300 font-bold">
              {disadvantageousCount}
            </p>
          </div>
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600">
              {lang === "fr" ? "Sélectionnées" : "Selected"}:
            </span>
            <p className="text-gray-300 font-bold">
              {selectedClauses.length}
            </p>
          </div>
        </div>
      </motion.div>

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
          disabled={selectedClauses.length === 0 || isSubmitting}
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider l'Analyse" : "Validate Analysis"}
        </button>
      </div>
    </div>
  );
}