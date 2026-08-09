// components/game/JudgmentModal.tsx
// Écran de jugement : le joueur désigne un ou plusieurs coupables parmi les suspects.
// Configuré par scène via `judgment_config` (textes FR/EN, image de fond, coupables, clôture).
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Check, X, Loader2 } from "lucide-react";

interface Suspect {
  id: string;
  name_fr: string;
  name_en?: string;
  role?: string;
  avatar_url?: string;
}

interface JudgmentConfig {
  enabled?: boolean;
  suspects?: string[];              // ids des personnages proposés
  culprits?: string[];              // ids des bons coupables
  close_on_judge?: boolean;         // clôt l'enquête ou continue
  background_image?: string | null;
  title_fr?: string;
  title_en?: string;
  message_exact_fr?: string;
  message_exact_en?: string;
  message_partial_fr?: string;
  message_partial_en?: string;
  message_wrong_fr?: string;
  message_wrong_en?: string;
}

interface JudgmentModalProps {
  isOpen: boolean;
  config: JudgmentConfig | null;
  suspects: Suspect[];
  lang: "fr" | "en";
  onClose: () => void;
  onComplete: (result: "exact" | "partial" | "wrong", selectedIds: string[], closeOnJudge: boolean) => void;
}

export default function JudgmentModal({
  isOpen,
  config,
  suspects,
  lang,
  onClose,
  onComplete,
}: JudgmentModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<"exact" | "partial" | "wrong" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !config) return null;

  const culpritIds = config.culprits || [];
  const effectiveSuspects = suspects.filter((s) => (config.suspects || []).includes(s.id));
  const list = effectiveSuspects.length > 0 ? effectiveSuspects : suspects;

  const t = (fr?: string, en?: string) => (lang === "fr" ? fr : en || fr) || "";

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const evaluate = () => {
    const correct = selected.filter((id) => culpritIds.includes(id)).length;
    const wrong = selected.filter((id) => !culpritIds.includes(id)).length;
    // exact = a coché exactement les bons coupables (et rien de faux)
    if (correct === culpritIds.length && wrong === 0 && culpritIds.length > 0) {
      return "exact" as const;
    }
    // partial = a coché au moins un bon coupable mais incomplet ou avec des faux
    if (correct > 0) return "partial" as const;
    return "wrong" as const;
  };

  const handleValidate = () => {
    if (selected.length === 0) return;
    setIsSubmitting(true);
    // petit délai pour l'effet visuel
    setTimeout(() => {
      const res = evaluate();
      setResult(res);
      setShowResult(true);
      setIsSubmitting(false);
    }, 300);
  };

  const handleContinue = () => {
    const res = result || evaluate();
    onComplete(res, selected, config.close_on_judge || false);
  };

  const resultMessage =
    result === "exact"
      ? t(config.message_exact_fr, config.message_exact_en) || (lang === "fr" ? "Excellente déduction ! Vous avez identifié les responsables." : "Excellent deduction! You identified the culprits.")
      : result === "partial"
        ? t(config.message_partial_fr, config.message_partial_en) || (lang === "fr" ? "Partiellement correct. Certains coupables manquent ou sont faux." : "Partially correct. Some culprits are missing or wrong.")
        : t(config.message_wrong_fr, config.message_wrong_en) || (lang === "fr" ? "Mauvaise désignation. Vos preuves ne pointent pas vers ces personnes." : "Wrong accusation. Your evidence doesn't point to these people.");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      >
        {/* Image de fond configurée */}
        {config.background_image ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${config.background_image})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/90" />
        )}
        <div className="absolute inset-0 bg-black/60" />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg bg-[#111]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-[#D4AF37]/10 px-5 py-4 flex items-center justify-between border-b border-[#D4AF37]/20">
            <span className="font-mono text-xs text-[#D4AF37] tracking-widest font-bold flex items-center gap-2">
              <Scale size={14} /> {lang === "fr" ? "JUGEMENT" : "JUDGMENT"}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Titre */}
            <h3 className="text-xl font-serif font-bold text-white">
              {t(config.title_fr, config.title_en) || (lang === "fr" ? "Qui est responsable ?" : "Who is responsible?")}
            </h3>

            {/* Liste des suspects */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {list.map((s) => {
                const isSel = selected.includes(s.id);
                const isCorrect = culpritIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => !showResult && toggle(s.id)}
                    disabled={showResult}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSel
                        ? "bg-[#D4AF37]/20 border-[#D4AF37]/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">👤</div>
                    )}
                    <span className="flex-1 text-left">
                      <span className="text-sm font-bold text-white block">
                        {lang === "fr" ? s.name_fr : s.name_en || s.name_fr}
                      </span>
                      {s.role && <span className="text-[10px] text-gray-400">{s.role}</span>}
                    </span>
                    {/* Checkbox */}
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSel ? "bg-[#D4AF37] border-[#D4AF37]" : "border-gray-500"}`}>
                      {isSel && <Check size={12} className="text-black" />}
                    </span>
                    {/* Révélation après validation */}
                    {showResult && isSel && (
                      <span className={`text-[10px] font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                        {isCorrect ? "✓" : "✗"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Message de résultat */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border text-sm ${
                    result === "exact"
                      ? "bg-green-500/10 border-green-500/30 text-green-300"
                      : result === "partial"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  {resultMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Boutons */}
            {!showResult ? (
              <button
                onClick={handleValidate}
                disabled={selected.length === 0 || isSubmitting}
                className="w-full py-3 bg-[#D4AF37] hover:bg-white text-black rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
                {lang === "fr" ? "Valider le jugement" : "Validate judgment"}
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-[#D4AF37] hover:bg-white text-black rounded-xl font-bold transition-colors"
              >
                {config.close_on_judge
                  ? (lang === "fr" ? "Terminer" : "Finish")
                  : (lang === "fr" ? "Continuer l'enquête" : "Continue investigation")}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
