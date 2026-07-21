"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Send, AlertCircle } from "lucide-react";

interface Props {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  budgetCauris: number;
  lang: "fr" | "en";
}

export default function CustomsContrabandGame({
  miniGame,
  onComplete,
  onFail,
  onClose,
  budgetCauris,
  lang,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"visual" | "numeric" | "inspection">("visual");
  const [foundDiscrepancies, setFoundDiscrepancies] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const config = miniGame.config || {};

  // ── DÉTERMINER LE MODE ──
  useEffect(() => {
    const configMode = config.comparison_mode || "visual";
    if (["visual", "numeric", "inspection"].includes(configMode)) {
      setMode(configMode as "visual" | "numeric" | "inspection");
    }
    setIsLoading(false);
  }, [config]);

  // ── GÉRER LES CLICS ──
  const handleItemClick = (itemId: string) => {
    if (!foundDiscrepancies.includes(itemId)) {
      setFoundDiscrepancies((prev) => [...prev, itemId]);
    } else {
      setFoundDiscrepancies((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // ── VÉRIFIER LA SOLUTION ──
  const handleSubmit = async () => {
    if (foundDiscrepancies.length === 0) return;

    setIsSubmitting(true);

    const discrepancies = config.discrepancies || [];
    const correctDiscrepancies = discrepancies.map((d: any) => d.id);

    const allCorrect = foundDiscrepancies.every((id) =>
      correctDiscrepancies.includes(id)
    );
    const allFound = correctDiscrepancies.every((id) =>
      foundDiscrepancies.includes(id)
    );

    setTimeout(() => {
      if (allCorrect && allFound) {
        setFeedback(lang === "fr" ? "✅ Contrebande Détectée" : "✅ Contraband Detected");
        setTimeout(() => onComplete(100, miniGame.reward_cauris || 20), 1500);
      } else {
        setFeedback(
          lang === "fr"
            ? "❌ Discordances Manquantes"
            : "❌ Missing Discrepancies"
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

  const discrepancies = config.discrepancies || [];

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={18} className="text-[#D4AF37]" />
        <h3 className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          {lang === "fr" ? "Inspection Douanière" : "Customs Inspection"}
        </h3>
      </div>

      {/* MODE VISUAL : Comparaison d'Images */}
      {mode === "visual" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm mb-4">
            {lang === "fr"
              ? "Comparez les deux images et cliquez sur les différences"
              : "Compare the two images and click on the differences"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Déclarée */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                {lang === "fr" ? "Cargaison Déclarée" : "Declared Cargo"}
              </p>
              <div className="relative bg-[#0a0a0a] border-2 border-gray-700 rounded-lg overflow-hidden h-64">
                {config.declared_image_url ? (
                  <img
                    src={config.declared_image_url}
                    alt="Declared"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    {lang === "fr" ? "Image non disponible" : "Image unavailable"}
                  </div>
                )}
              </div>
            </div>

            {/* Image Réelle */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                {lang === "fr" ? "Cargaison Réelle" : "Actual Cargo"}
              </p>
              <div className="relative bg-[#0a0a0a] border-2 border-gray-700 rounded-lg overflow-hidden h-64">
                {config.actual_image_url ? (
                  <img
                    src={config.actual_image_url}
                    alt="Actual"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    {lang === "fr" ? "Image non disponible" : "Image unavailable"}
                  </div>
                )}

                {/* Zones cliquables pour les discrepancies */}
                {discrepancies.map((disc: any) => (
                  <motion.div
                    key={disc.id}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${disc.x_percent}%`,
                      top: `${disc.y_percent}%`,
                      width: `${disc.width_percent || 10}%`,
                      height: `${disc.height_percent || 10}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={() => handleItemClick(disc.id)}
                    onMouseEnter={() => setHoveredItem(disc.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <motion.div
                      animate={{
                        borderColor: foundDiscrepancies.includes(disc.id)
                          ? "#22c55e"
                          : "rgba(212, 175, 55, 0.3)",
                        boxShadow: hoveredItem === disc.id
                          ? "0 0 20px rgba(212, 175, 55, 0.5)"
                          : "none",
                      }}
                      className="w-full h-full border-2 border-dashed rounded-lg transition-all"
                    />

                    {/* Tooltip */}
                    {hoveredItem === disc.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[10px] text-gray-300 whitespace-nowrap z-20 border border-white/20"
                      >
                        {lang === "fr" ? disc.description_fr : disc.description_en}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE NUMERIC : Comparaison de Tableaux */}
      {mode === "numeric" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm mb-4">
            {lang === "fr"
              ? "Comparez les montants et cliquez sur les lignes qui ne correspondent pas"
              : "Compare the amounts and click on mismatched lines"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tableau Déclaré */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                {lang === "fr" ? "Manifeste Déclaré" : "Declared Manifest"}
              </p>
              <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-900 border-b border-gray-700">
                      <th className="px-3 py-2 text-left text-gray-400">
                        {lang === "fr" ? "Article" : "Item"}
                      </th>
                      <th className="px-3 py-2 text-right text-gray-400">
                        {lang === "fr" ? "Quantité" : "Qty"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(config.declared_items || []).map((item: any) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-800 hover:bg-gray-900/50"
                      >
                        <td className="px-3 py-2 text-gray-400">
                          {lang === "fr" ? item.name_fr : item.name_en}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tableau Réel */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                {lang === "fr" ? "Cargaison Réelle" : "Actual Cargo"}
              </p>
              <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-900 border-b border-gray-700">
                      <th className="px-3 py-2 text-left text-gray-400">
                        {lang === "fr" ? "Article" : "Item"}
                      </th>
                      <th className="px-3 py-2 text-right text-gray-400">
                        {lang === "fr" ? "Quantité" : "Qty"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(config.actual_items || []).map((item: any) => {
                      const isDiscrepancy = discrepancies.find(
                        (d: any) => d.id === item.id
                      );
                      return (
                        <motion.tr
                          key={item.id}
                          onClick={() => handleItemClick(item.id)}
                          animate={{
                            backgroundColor: foundDiscrepancies.includes(
                              item.id
                            )
                              ? "rgba(34, 197, 94, 0.1)"
                              : "transparent",
                          }}
                          className={`border-b border-gray-800 cursor-pointer hover:bg-gray-900/50 transition-all ${
                            isDiscrepancy ? "border-l-4 border-l-red-500" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-gray-400">
                            {lang === "fr" ? item.name_fr : item.name_en}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-bold ${
                              isDiscrepancy ? "text-red-400" : "text-gray-400"
                            }`}
                          >
                            {item.quantity}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE INSPECTION : Containers */}
      {mode === "inspection" && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm mb-4">
            {lang === "fr"
              ? "Inspectez les containers et trouvez les discordances"
              : "Inspect containers and find the discrepancies"}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(config.containers || []).map((container: any) => {
              const isDiscrepancy = discrepancies.find(
                (d: any) => d.id === container.id
              );

              return (
                <motion.div
                  key={container.id}
                  onClick={() => handleItemClick(container.id)}
                  whileHover={{ scale: 1.05 }}
                  animate={{
                    borderColor: foundDiscrepancies.includes(container.id)
                      ? "#22c55e"
                      : isDiscrepancy
                      ? "#ef4444"
                      : "rgba(255, 255, 255, 0.2)",
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    foundDiscrepancies.includes(container.id)
                      ? "bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                      : isDiscrepancy
                      ? "bg-red-500/5 hover:bg-red-500/10"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="text-3xl mb-2 text-center">📦</div>
                  <p className="text-[10px] text-gray-300 text-center font-bold">
                    {lang === "fr" ? container.name_fr : container.name_en}
                  </p>
                  <p className="text-[9px] text-gray-500 text-center mt-1">
                    {lang === "fr" ? "Contenu:" : "Contents:"} {container.contents}
                  </p>
                  {isDiscrepancy && !foundDiscrepancies.includes(container.id) && (
                    <div className="text-[10px] text-red-400 font-bold mt-2 text-center">
                      ⚠️ {lang === "fr" ? "Suspect" : "Suspicious"}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistiques */}
      <motion.div
        animate={{
          borderColor: foundDiscrepancies.length >= discrepancies.length 
            ? "rgba(34, 197, 94, 0.5)" 
            : "rgba(239, 68, 68, 0.3)",
          backgroundColor: foundDiscrepancies.length >= discrepancies.length 
            ? "rgba(34, 197, 94, 0.05)" 
            : "rgba(239, 68, 68, 0.05)",
        }}
        className="border-2 rounded-lg p-4 space-y-3"
      >
        <p className="text-gray-400 font-mono text-[10px] uppercase font-bold">
          {lang === "fr" ? "Progression" : "Progress"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600 text-[10px]">
              {lang === "fr" ? "Trouvées" : "Found"}:
            </span>
            <p className="text-white font-bold">
              {foundDiscrepancies.length}/{discrepancies.length}
            </p>
          </div>
          <div className="bg-black/30 p-2 rounded border border-white/10">
            <span className="text-gray-600 text-[10px]">
              {lang === "fr" ? "Montant Détourné" : "Diverted Amount"}:
            </span>
            <p className="text-amber-400 font-bold">
              {foundDiscrepancies
                .filter((id) =>
                  discrepancies.find((d: any) => d.id === id)
                )
                .reduce(
                  (sum, id) => {
                    const disc = discrepancies.find(
                      (d: any) => d.id === id
                    );
                    return sum + (disc?.amount || 0);
                  },
                  0
                )
                .toLocaleString()}
              USD
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
          disabled={foundDiscrepancies.length === 0 || isSubmitting}
          className="flex-[2] py-3 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-white flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "fr" ? "Valider l'Inspection" : "Validate Inspection"}
        </button>
      </div>
    </div>
  );
}