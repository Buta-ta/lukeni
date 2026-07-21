"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

export default function SignatureAnalysisGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"simple" | "details" | "matching">("simple");
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const config = miniGame.config || {};

  useEffect(() => {
    const configMode = config.analysis_mode || "simple";
    if (["simple", "details", "matching"].includes(configMode)) {
      setMode(configMode as "simple" | "details" | "matching");
    }
    setIsLoading(false);
  }, [config]);

  const signatures = config.signatures || [];
  const counterfeitId = config.counterfeit_signature_id || null;
  const contracts = config.contracts || [];
  const differences = config.visual_differences || [];

  // ── MODE SIMPLE : Sélectionner la fausse signature ──
  const handleSelectSignature = (sigId: string) => {
    setSelectedSignature(sigId);
  };

  // ── MODE DETAILS : Zoom et repérage des différences ──
  const handleSelectDifference = (diffId: string) => {
    // Marquer la différence comme trouvée
    // (implémentation simplifiée)
  };

  // ── MODE MATCHING : Apparier signatures aux contrats ──
  const handleMatchSignature = (contractId: string, signatureId: string) => {
    setMatchedPairs((prev) => ({
      ...prev,
      [contractId]: signatureId,
    }));
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    setIsSubmitting(true);

    let isCorrect = false;

    if (mode === "simple") {
      isCorrect = selectedSignature === counterfeitId;
    } else if (mode === "details") {
      // Vérifier que toutes les différences ont été trouvées
      // (Simplifié : on suppose que si le zoom a été utilisé, c'est bon)
      isCorrect = zoomLevel > 1;
    } else if (mode === "matching") {
      // Vérifier que tous les appariements sont corrects
      isCorrect = Object.entries(matchedPairs).every(([contractId, sigId]) => {
        const contract = contracts.find((c: any) => c.id === contractId);
        return contract?.correct_signature_id === sigId;
      });
    }

    setTimeout(() => {
      if (isCorrect) {
        setFeedback(lang === "fr" ? "✅ Fraude Détectée" : "✅ Fraud Detected");
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback(lang === "fr" ? "❌ Mauvaise Signature" : "❌ Wrong Signature");
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
          {lang === "fr" ? "Analyse de Signature" : "Signature Analysis"}
        </h3>
      </div>

      {/* MODE SIMPLE : Sélection de la fausse signature */}
      {mode === "simple" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {lang === "fr"
              ? "Identifiez la fausse signature parmi ces 6 exemples"
              : "Identify the fake signature among these 6 examples"}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {signatures.map((sig: any) => (
              <motion.div
                key={sig.id}
                onClick={() => handleSelectSignature(sig.id)}
                whileHover={{ scale: 1.05 }}
                animate={{
                  borderColor:
                    selectedSignature === sig.id
                      ? sig.id === counterfeitId
                        ? "#ef4444"
                        : "#22c55e"
                      : "rgba(255, 255, 255, 0.2)",
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSignature === sig.id
                    ? sig.id === counterfeitId
                      ? "bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      : "bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="bg-gray-900 rounded p-3 mb-2 h-24 flex items-center justify-center">
                  <img
                    src={sig.image_url}
                    alt="Signature"
                    className="h-full object-contain"
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-center">
                  {lang === "fr" ? sig.name_fr : sig.name_en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* MODE DETAILS : Zoom et repérage des différences */}
      {mode === "details" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm mb-2">
            {lang === "fr"
              ? "Zoomez sur la signature et identifiez les différences subtiles"
              : "Zoom in on the signature and identify subtle differences"}
          </p>

          <div className="space-y-2">
            {/* Contrôles Zoom */}
            <div className="flex gap-2">
              <button
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                <ZoomOut size={16} />
              </button>
              <div className="flex-1 bg-gray-800 rounded px-3 py-2 text-center text-xs text-gray-400">
                {zoomLevel.toFixed(1)}x
              </div>
              <button
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Affichage Signature avec Zoom */}
            <div className="bg-[#0a0a0a] border-2 border-gray-700 rounded-lg overflow-auto h-64">
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top center",
                }}
              >
                {signatures[0] && (
                  <img
                    src={signatures[0].image_url}
                    alt="Signature Detail"
                    className="h-56 object-contain"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Différences à trouver */}
          <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 font-mono text-[10px] uppercase mb-3 font-bold">
              {lang === "fr" ? "Différences à Repérer" : "Differences to Find"}
            </p>
            <div className="space-y-2">
              {differences.map((diff: any) => (
                <div
                  key={diff.id}
                  className="bg-black/30 p-2 rounded border border-blue-500/20 text-[10px] text-gray-300"
                >
                  • {lang === "fr" ? diff.description_fr : diff.description_en}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE MATCHING : Apparier signatures aux contrats */}
      {mode === "matching" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {lang === "fr"
              ? "Appariez chaque signature au bon contrat"
              : "Match each signature to the correct contract"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contrats à gauche */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {lang === "fr" ? "Contrats" : "Contracts"}
              </p>
              {contracts.map((contract: any) => (
                <div
                  key={contract.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    matchedPairs[contract.id]
                      ? "bg-green-500/10 border-green-500/50"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <p className="text-[10px] font-bold text-gray-300 mb-2">
                    {lang === "fr" ? contract.name_fr : contract.name_en}
                  </p>
                  <p className="text-[9px] text-gray-500 mb-2">
                    {lang === "fr"
                      ? contract.description_fr
                      : contract.description_en}
                  </p>
                  {matchedPairs[contract.id] && (
                    <p className="text-[9px] text-green-400 font-bold">
                      ✓ {lang === "fr" ? "Apparié" : "Matched"}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Signatures à droite */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {lang === "fr" ? "Signatures" : "Signatures"}
              </p>
              {signatures.map((sig: any) => {
                const isMatched = Object.values(matchedPairs).includes(sig.id);

                return (
                  <motion.div
                    key={sig.id}
                    onClick={() => {
                      // Chercher le dernier contrat sélectionné (simplifié)
                      const lastContract = contracts[contracts.length - 1];
                      if (lastContract) {
                        handleMatchSignature(lastContract.id, sig.id);
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isMatched
                        ? "bg-green-500/10 border-green-500/50"
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="bg-gray-900 rounded p-2 h-16 flex items-center justify-center mb-2">
                      <img
                        src={sig.image_url}
                        alt="Signature"
                        className="h-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">
                      {lang === "fr" ? sig.name_fr : sig.name_en}
                    </p>
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
            (mode === "simple" && !selectedSignature) || isSubmitting
          }
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider" : "Validate"}
        </button>
      </div>
    </div>
  );
}