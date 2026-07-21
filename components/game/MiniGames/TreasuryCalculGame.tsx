"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Send, ChevronDown } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

interface Document {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  description_fr: string;
  description_en: string;
  is_correct: boolean;
  image_url?: string;
  details_fr: string[];
  details_en: string[];
}

export default function TreasuryCalculGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = miniGame.config || {};
  const targetAmount = config.target_amount || 0;
  const tolerance = config.tolerance || 10000;
  const targetText = lang === "fr" ? config.target_total_fr : config.target_total_en;

  // ── CHARGER LES DOCUMENTS ──
  useEffect(() => {
    const docs = config.documents || [];
    // Mélanger les documents pour plus de défi
    setDocuments(docs.sort(() => Math.random() - 0.5));
    setIsLoading(false);
  }, [config]);

  // ── BASCULER LA SÉLECTION D'UN DOCUMENT ──
  const toggleDocument = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  // ── BASCULER LE FLIP CARTE ──
  const toggleFlip = (docId: string) => {
    setFlipped((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  // ── CALCULER LE TOTAL ──
  const calculateTotal = () => {
    return selectedDocs.reduce((sum, docId) => {
      const doc = documents.find((d) => d.id === docId);
      return sum + (doc ? doc.amount : 0);
    }, 0);
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    if (selectedDocs.length === 0) return;

    setIsSubmitting(true);

    const total = calculateTotal();
    const diff = Math.abs(total - targetAmount);

    // Vérifier que seuls les bons documents sont sélectionnés
    const onlyCorrectSelected = selectedDocs.every((docId) => {
      const doc = documents.find((d) => d.id === docId);
      return doc?.is_correct;
    });

    // Vérifier que tous les bons documents sont sélectionnés
    const allCorrectSelected = documents
      .filter((d) => d.is_correct)
      .every((d) => selectedDocs.includes(d.id));

    setTimeout(() => {
      if (onlyCorrectSelected && allCorrectSelected && diff <= tolerance) {
        setFeedback(lang === "fr" ? "✅ Détournement Exposé" : "✅ Embezzlement Exposed");
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 25), 1500);
      } else {
        setFeedback(lang === "fr" ? "❌ Total Incorrect" : "❌ Incorrect Total");
        const penalty = miniGame.penalty_per_error || 2;
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

  const currentTotal = calculateTotal();
  const isAccurate = Math.abs(currentTotal - targetAmount) <= tolerance;

  return (
    <div className="space-y-6">
      {/* Titre et Objectif */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4">
        <p className="text-amber-400 font-mono text-[10px] uppercase mb-2 font-bold">
          {lang === "fr" ? "Objectif" : "Objective"}
        </p>
        <p className="text-gray-300 text-sm mb-3">{targetText}</p>
        <div className="bg-black/30 p-3 rounded border border-amber-500/20">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-xs">
              {lang === "fr" ? "Montant à Reconstituer" : "Amount to Reconstruct"}:
            </span>
            <span className="text-amber-400 font-mono font-bold">
              {targetAmount.toLocaleString()} {lang === "fr" ? "USD" : "USD"}
            </span>
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            {lang === "fr" ? "Tolérance:" : "Tolerance:"} ±{tolerance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Grille de Documents (Cartes) */}
      <div className="space-y-3">
        <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr" ? "Bordereaux de Virement" : "Transfer Statements"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isSelected = selectedDocs.includes(doc.id);
            const isFaceUp = flipped[doc.id];

            return (
              <motion.div
                key={doc.id}
                className="relative h-48 cursor-pointer perspective"
                onClick={() => toggleFlip(doc.id)}
                whileHover={{ y: -5 }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotateY: isFaceUp ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative w-full h-full"
                >
                  {/* VERSO (MONTANT CACHÉ) */}
                  <div
                    style={{ backfaceVisibility: "hidden" }}
                    className={`absolute inset-0 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-green-500/20 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                        : "bg-blue-900/30 border-blue-500/50"
                    }`}
                  >
                    <div className="text-center space-y-2">
                      <ChevronDown size={24} className="text-gray-500 mx-auto" />
                      <p className="text-gray-400 text-[10px] uppercase font-mono">
                        {lang === "fr" ? "Retourner" : "Flip"}
                      </p>
                    </div>
                  </div>

                  {/* RECTO (DÉTAILS) */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    className={`absolute inset-0 rounded-lg border-2 p-4 space-y-2 overflow-hidden transition-all ${
                      isSelected
                        ? "bg-green-500/20 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    {/* Image si présente */}
                    {doc.image_url && (
                      <img
                        src={doc.image_url}
                        alt="Document"
                        className="w-full h-20 object-cover rounded border border-white/10"
                      />
                    )}

                    {/* Détails */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[#D4AF37] uppercase">
                        {lang === "fr" ? doc.description_fr : doc.description_en}
                      </p>
                      <div className="text-[9px] text-gray-400 space-y-0.5">
                        {(lang === "fr" ? doc.details_fr : doc.details_en).map(
                          (detail, idx) => (
                            <p key={idx}>{detail}</p>
                          )
                        )}
                      </div>
                      <p className="text-xs font-bold text-green-400 pt-1 border-t border-white/10">
                        {doc.amount.toLocaleString()} {doc.currency}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <label className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocument(doc.id)}
                        className="w-4 h-4 accent-green-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-[10px] text-gray-400 uppercase">
                        {lang === "fr" ? "Inclure" : "Include"}
                      </span>
                    </label>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Calcul en Temps Réel */}
      <motion.div
        animate={{
          borderColor: isAccurate ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
          backgroundColor: isAccurate ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
        }}
        className="border-2 rounded-lg p-4 space-y-3"
      >
        <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr" ? "Calcul Actuel" : "Current Calculation"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600 text-[10px]">
              {lang === "fr" ? "Montant" : "Amount"}:
            </span>
            <p className="text-white font-mono font-bold">
              {currentTotal.toLocaleString()} USD
            </p>
          </div>
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600 text-[10px]">
              {lang === "fr" ? "Écart" : "Difference"}:
            </span>
            <p
              className={`font-mono font-bold ${
                isAccurate ? "text-green-400" : "text-red-400"
              }`}
            >
              {Math.abs(currentTotal - targetAmount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Barre de Progression */}
        <div className="space-y-1">
          <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
            <motion.div
              animate={{
                width: `${Math.min(100, (currentTotal / targetAmount) * 100)}%`,
              }}
              className={`h-full ${
                isAccurate ? "bg-green-500" : "bg-red-500"
              }`}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-[9px] text-gray-500 text-center">
            {Math.round((currentTotal / targetAmount) * 100)}% {lang === "fr" ? "reconstitué" : "reconstructed"}
          </p>
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
          disabled={selectedDocs.length === 0 || isSubmitting}
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider le Total" : "Validate Total"}
        </button>
      </div>
    </div>
  );
}