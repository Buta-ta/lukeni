// components/MusicErasTab.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Clock, PlusCircle, Edit2, Trash2, X,
  Languages, CheckCircle, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import DeleteModal from "@/components/admin/shared/DeleteModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MusicEra {
  id: string;
  value: number;
  label_fr: string;
  label_en: string;
  description_fr: string | null;
  description_en: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
}

// ─── Presets couleur ──────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  "#D4AF37", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#BB8FCE", "#F39C12", "#E74C3C", "#2ECC71", "#3498DB",
  "#E91E63", "#00BCD4", "#FF5722", "#9C27B0", "#607D8B",
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MusicErasTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [eras, setEras]               = useState<MusicEra[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSaving, setIsSaving]       = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Champs formulaire
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [value,     setValue]       = useState<number | "">(2000);
  const [labelFr,   setLabelFr]     = useState("");
  const [labelEn,   setLabelEn]     = useState("");
  const [descFr,    setDescFr]      = useState("");
  const [descEn,    setDescEn]      = useState("");
  const [color,     setColor]       = useState("#D4AF37");
  const [isActive,  setIsActive]    = useState(true);
  const [sortOrder, setSortOrder]   = useState(0);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eraToDelete,     setEraToDelete]     = useState<string | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);

  useEffect(() => { fetchEras(); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchEras() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("music_eras")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) showMsg("error", error.message);
    else setEras((data as MusicEra[]) || []);
    setIsLoading(false);
  }

  // ── Reset formulaire ───────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setEditingId(null);
    setValue(2000);
    setLabelFr(""); setLabelEn("");
    setDescFr("");  setDescEn("");
    setColor("#D4AF37");
    setIsActive(true);
    setSortOrder(eras.length);
  }, [eras.length]);

  // ── Édition ────────────────────────────────────────────────────────────────

  const handleEdit = useCallback((era: MusicEra) => {
    setEditingId(era.id);
    setValue(era.value);
    setLabelFr(era.label_fr);
    setLabelEn(era.label_en);
    setDescFr(era.description_fr || "");
    setDescEn(era.description_en || "");
    setColor(era.color || "#D4AF37");
    setIsActive(era.is_active);
    setSortOrder(era.sort_order);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Traduction ─────────────────────────────────────────────────────────────

  const handleTranslate = async (direction: "to-en" | "to-fr") => {
    const key = `translate-${direction}`;
    setIsProcessing(key);
    try {
      if (direction === "to-en") {
        if (labelFr) setLabelEn(await autoTranslate(labelFr, "fr"));
        if (descFr)  setDescEn(await autoTranslate(descFr, "fr"));
      } else {
        if (labelEn) setLabelFr(await autoTranslate(labelEn, "en"));
        if (descEn)  setDescFr(await autoTranslate(descEn, "en"));
      }
    } catch {
      showMsg("error", "Erreur traduction");
    }
    setIsProcessing(null);
  };

  // ── Sauvegarde ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!labelFr.trim()) return showMsg("error", "Label FR requis");
    if (!value)          return showMsg("error", "Valeur décennale requise");

    setIsSaving(true);

    const payload = {
      value:          Number(value),
      label_fr:       labelFr.trim(),
      label_en:       labelEn.trim() || labelFr.trim(),
      description_fr: descFr.trim() || null,
      description_en: descEn.trim() || null,
      color,
      is_active:      isActive,
      sort_order:     sortOrder,
      updated_at:     new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("music_eras")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showMsg("success", "✅ Époque mise à jour !");
      } else {
        const { error } = await supabase
          .from("music_eras")
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        showMsg("success", "✅ Époque créée !");
      }
      resetForm();
      fetchEras();
    } catch (err: any) {
      showMsg("error", err.message || "Erreur lors de la sauvegarde");
    }

    setIsSaving(false);
  };

  // ── Toggle actif ───────────────────────────────────────────────────────────

  const handleToggleActive = async (era: MusicEra) => {
    const { error } = await supabase
      .from("music_eras")
      .update({ is_active: !era.is_active })
      .eq("id", era.id);
    if (error) {
      showMsg("error", error.message);
    } else {
      setEras((prev) =>
        prev.map((e) =>
          e.id === era.id ? { ...e, is_active: !e.is_active } : e
        )
      );
    }
  };

  // ── Suppression ────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!eraToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("music_eras")
        .delete()
        .eq("id", eraToDelete);
      if (error) throw error;
      setEras((prev) => prev.filter((e) => e.id !== eraToDelete));
      showMsg("success", "Époque supprimée.");
      setDeleteModalOpen(false);
      setEraToDelete(null);
    } catch (err: any) {
      showMsg("error", err.message);
    }
    setIsDeleting(false);
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock className="text-amber-400" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Époques Musicales</h2>
          <p className="text-gray-400 text-xs">
            {eras.length} époques · {eras.filter((e) => e.is_active).length} actives
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Les époques actives apparaissent dans la barre de filtres de la MusicMap
          et dans le formulaire de contribution des utilisateurs.
        </p>
      </div>

      {/* ── Formulaire ────────────────────────────────────────────────────── */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId
              ? <Edit2 size={18} className="text-amber-400" />
              : <PlusCircle size={18} className="text-amber-400" />}
            {editingId ? "Modifier l'époque" : "Nouvelle époque"}
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X size={14} /> Annuler
            </button>
          )}
        </div>

        {/* Valeur + ordre + toggle */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Valeur décennale *
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) =>
                setValue(e.target.value ? parseInt(e.target.value) : "")
              }
              placeholder="Ex: 1960"
              min={1800}
              max={2100}
              step={10}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 font-mono"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              Correspond au champ era_decade des tracks
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer w-full">
              <div
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  isActive ? "bg-green-600" : "bg-gray-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-white">
                {isActive ? "Active" : "Inactive"}
              </span>
            </label>
          </div>
        </div>

        {/* Labels FR / EN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🇫🇷 Label FR *
            </label>
            <input
              type="text"
              value={labelFr}
              onChange={(e) => setLabelFr(e.target.value)}
              placeholder="Ex: Années 60, Avant 1920, Aujourd'hui…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 placeholder-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🇬🇧 Label EN
            </label>
            <input
              type="text"
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              placeholder="Ex: 1960s, Before 1920, Today…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 placeholder-gray-700"
            />
          </div>
        </div>

        {/* Boutons traduction */}
        <div className="flex gap-2">
          <button
            onClick={() => handleTranslate("to-en")}
            disabled={!!isProcessing || !labelFr}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 text-xs disabled:opacity-30 transition-colors"
          >
            {isProcessing === "translate-to-en" ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Languages size={11} />
            )}
            FR → EN (auto)
          </button>
          <button
            onClick={() => handleTranslate("to-fr")}
            disabled={!!isProcessing || !labelEn}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 text-xs disabled:opacity-30 transition-colors"
          >
            {isProcessing === "translate-to-fr" ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Languages size={11} />
            )}
            EN → FR (auto)
          </button>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Description FR (optionnel)
            </label>
            <textarea
              value={descFr}
              onChange={(e) => setDescFr(e.target.value)}
              rows={2}
              placeholder="Ex: L'âge d'or de la rumba congolaise et du highlife…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 resize-none placeholder-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Description EN (optionnel)
            </label>
            <textarea
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              rows={2}
              placeholder="Ex: The golden age of Congolese rumba and highlife…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 resize-none placeholder-gray-700"
            />
          </div>
        </div>

        {/* Couleur */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-mono">
            Couleur d'accentuation
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#D4AF37"
                className="w-24 bg-[#1a1a1a] border border-white/20 rounded px-3 py-1.5 text-white text-xs font-mono outline-none focus:border-amber-500"
              />
              <div
                className="w-9 h-9 rounded-lg border border-white/20 flex-shrink-0"
                style={{ background: color }}
              />
            </div>
          </div>
        </div>

        {/* Aperçu */}
        {(labelFr || labelEn) && (
          <div className="rounded-xl p-3 border border-white/5 bg-black/30">
            <p className="text-[10px] text-gray-500 mb-2">
              Aperçu dans la timeline de la MusicMap :
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {/* État actif */}
              <div
                className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-black"
                style={{ background: color }}
              >
                {labelFr || labelEn}
              </div>
              {/* État inactif */}
              <div
                className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                style={{
                  color,
                  borderColor: `${color}50`,
                  background: `${color}15`,
                }}
              >
                {labelFr || labelEn}
              </div>
              {/* Badge valeur */}
              {value && (
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    color,
                    borderColor: `${color}40`,
                    background: `${color}20`,
                  }}
                >
                  {value}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bouton save */}
        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-amber-600 text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-amber-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {editingId ? "Mettre à jour" : "Créer l'époque"}
          </button>
        </div>
      </div>

      {/* ── Liste des époques ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        {eras.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <Clock size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              Aucune époque. Créez-en une ci-dessus ou exécutez le SQL d'initialisation.
            </p>
          </div>
        )}

        <AnimatePresence>
          {eras.map((era) => (
            <motion.div
              key={era.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                era.is_active
                  ? "bg-white/[0.02] border-white/10 hover:border-white/20"
                  : "bg-black/20 border-white/5 opacity-60"
              }`}
            >
              {/* Barre couleur */}
              <div
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ background: era.color, minHeight: 40 }}
              />

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span
                    className="text-sm font-bold"
                    style={{ color: era.color }}
                  >
                    {era.label_fr}
                  </span>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-white/40 text-xs italic">
                    {era.label_en}
                  </span>
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full ml-1"
                    style={{
                      background: `${era.color}20`,
                      color: era.color,
                      border: `1px solid ${era.color}40`,
                    }}
                  >
                    {era.value}
                  </span>
                  {!era.is_active && (
                    <span className="text-[9px] bg-gray-500/20 text-gray-500 px-2 py-0.5 rounded-full">
                      inactive
                    </span>
                  )}
                </div>
                {era.description_fr && (
                  <p className="text-white/30 text-xs truncate mt-0.5">
                    {era.description_fr}
                  </p>
                )}
                <p className="text-gray-700 text-[10px] font-mono mt-0.5">
                  ordre: {era.sort_order}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(era)}
                  title={era.is_active ? "Désactiver" : "Activer"}
                  className={`p-2 rounded-lg transition-colors ${
                    era.is_active
                      ? "text-green-400 hover:text-green-300 bg-green-500/10"
                      : "text-gray-500 hover:text-gray-300 bg-white/5"
                  }`}
                >
                  {era.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => handleEdit(era)}
                  className="p-2 bg-white/5 text-gray-400 hover:text-amber-400 rounded-lg transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => {
                    setEraToDelete(era.id);
                    setDeleteModalOpen(true);
                  }}
                  className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal suppression */}
      <DeleteModal
        isOpen={deleteModalOpen}
        title="Supprimer cette époque ?"
        description="Les filtres de la MusicMap seront mis à jour. Les tracks avec cette era_decade ne seront pas supprimés."
        itemName={eras.find((e) => e.id === eraToDelete)?.label_fr}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setEraToDelete(null);
        }}
        isDeleting={isDeleting}
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
}