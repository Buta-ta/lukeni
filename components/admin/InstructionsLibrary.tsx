// components/admin/InstructionsLibrary.tsx
"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Languages,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
  X,
} from "lucide-react";

interface Instruction {
  id: string;
  investigation_id: string;
  name: string;
  name_en?: string;
  instruction_fr: string;
  instruction_en: string;
  icon: string;
  category?: "scene" | "hotspot" | "enigma" | "clue" | "chapter" | "timeline" | "board";
  created_at?: string;
}

interface Props {
  investigationId: string;
  showMsg: (type: "success" | "error", text: string) => void;
}

const ICON_PRESETS = [
  "📖", "💡", "🗓️", "🕸️", "🧩", "🔑", "📍", "🎬",
  "⚠️", "✦", "🔍", "📝", "🎯", "💭", "🚀", "🎪",
];

export default function InstructionsLibrary({
  investigationId,
  showMsg,
}: Props) {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<Partial<Instruction>>({
    name: "",
    name_en: "", 
    instruction_fr: "",
    instruction_en: "",
    icon: "💡",
    category: "scene",
  });

  // ── CHARGER LES INSTRUCTIONS ──
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("investigation_instructions")
        .select("*")
        .eq("investigation_id", investigationId)
        .order("created_at", { ascending: false });
      setInstructions(data || []);
      setIsLoading(false);
    };
    load();
  }, [investigationId]);

  // ── AJOUTER UNE INSTRUCTION ──
  const addInstruction = () => {
    setEditingId(null);
    setFormData({
      name: "",
      instruction_fr: "",
      instruction_en: "",
      icon: "💡",
      category: "scene",
    });
  };

  // ── ÉDITER UNE INSTRUCTION ──
  const editInstruction = (instr: Instruction) => {
    setEditingId(instr.id);
    setFormData(instr);
  };

  // ── SAUVEGARDER ──
  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.instruction_fr?.trim()) {
      showMsg("error", "Le nom et l'instruction FR sont obligatoires");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from("investigation_instructions")
          .update({
            name: formData.name,
            name_en: formData.name_en,
            instruction_fr: formData.instruction_fr,
            instruction_en: formData.instruction_en,
            icon: formData.icon,
            category: formData.category,
          })
          .eq("id", editingId);

        if (error) throw error;
        setInstructions((prev) =>
          prev.map((i) =>
            i.id === editingId
              ? {
                  ...i,
                  name: formData.name!,
                  name_en: formData.name_en,
                  instruction_fr: formData.instruction_fr!,
                  instruction_en: formData.instruction_en!,
                  icon: formData.icon!,
                  category: formData.category,
                }
              : i
          )
        );
        showMsg("success", "Instruction modifiée !");
      } else {
        // INSERT
        const newInstr: Instruction = {
          id: uuidv4(),
          investigation_id: investigationId,
          name: formData.name!,
          name_en: formData.name_en,
          instruction_fr: formData.instruction_fr!,
          instruction_en: formData.instruction_en!,
          icon: formData.icon!,
          category: formData.category,
        };

        const { data, error } = await supabase
          .from("investigation_instructions")
          .insert(newInstr)
          .select()
          .single();

        if (error) throw error;
        setInstructions((prev) => [data, ...prev]);
        showMsg("success", "Instruction créée !");
      }

      setEditingId(null);
      setFormData({
        name: "",
        instruction_fr: "",
        instruction_en: "",
        icon: "💡",
        category: "scene",
      });
    } catch (err: any) {
      showMsg("error", `Erreur: ${err.message}`);
    }
    setIsSaving(false);
  };

  // ── SUPPRIMER ──
  const deleteInstruction = async (id: string) => {
    const { error } = await supabase
      .from("investigation_instructions")
      .delete()
      .eq("id", id);

    if (error) {
      showMsg("error", `Erreur: ${error.message}`);
      return;
    }

    setInstructions((prev) => prev.filter((i) => i.id !== id));
    showMsg("success", "Instruction supprimée !");
  };

  // ── TRADUCTEUR AUTO ──
  const handleTranslate = async () => {
    if (!formData.instruction_fr?.trim()) return;
    setIsTranslating(true);
    try {
      const t = await autoTranslate(formData.instruction_fr, "fr");
      setFormData((prev) => ({ ...prev, instruction_en: t }));
    } catch {
      showMsg("error", "Erreur de traduction");
    }
    setIsTranslating(false);
  };

    const [isTranslatingName, setIsTranslatingName] = useState(false);

  const handleTranslateName = async () => {
    if (!formData.name?.trim()) return;
    setIsTranslatingName(true);
    try {
      const t = await autoTranslate(formData.name, "fr");
      setFormData((prev) => ({ ...prev, name_en: t }));
    } catch {
      showMsg("error", "Erreur de traduction du nom");
    }
    setIsTranslatingName(false);
  };

  // ── TOGGLER EXPANSION ──
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-blue-400" />
          <span className="text-sm font-bold text-blue-400">
            Bibliothèque d'Instructions
          </span>
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {instructions.length} instruction(s)
          </span>
        </div>
        {!editingId && (
          <button
            onClick={addInstruction}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600/40"
          >
            <Plus size={14} /> Nouvelle
          </button>
        )}
      </div>

      {/* ── FORMULAIRE ── */}
      {editingId !== undefined && (
        <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-blue-400">
              {editingId ? "Modifier l'instruction" : "Créer une instruction"}
            </h3>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  instruction_fr: "",
                  instruction_en: "",
                  icon: "💡",
                  category: "scene",
                });
              }}
              className="text-gray-600 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Nom FR & EN */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                  Nom FR (Interne & Affiché)
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Explication Timeline"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                  Name EN
                </label>
                <div className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={formData.name_en || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name_en: e.target.value }))
                    }
                    placeholder="Ex: Timeline Explanation"
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleTranslateName}
                    className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                  >
                    {isTranslatingName ? (
                      <Loader2 size={14} className="animate-spin text-blue-500" />
                    ) : (
                      <Languages size={14} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Icône */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Icône
              </label>
              <select
                value={formData.icon || "💡"}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, icon: e.target.value }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {ICON_PRESETS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            {/* Catégorie */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Catégorie
              </label>
              <select
                value={formData.category || "scene"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as any,
                  }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="scene">Scène</option>
                <option value="hotspot">Hotspot</option>
                <option value="enigma">Énigme</option>
                <option value="clue">Indice</option>
                <option value="chapter">Chapitre</option>
                <option value="timeline">Timeline</option>
                <option value="board">Tableau Connexions</option>
              </select>
            </div>
          </div>

          {/* Instruction FR */}
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
              Texte d'instruction (FR)
            </label>
            <textarea
              rows={3}
              value={formData.instruction_fr || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  instruction_fr: e.target.value,
                }))
              }
              placeholder="Ex: Glissez une preuve sur cette date pour établir un lien avec l'histoire..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
            />
          </div>

          {/* Instruction EN */}
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
              Texte d'instruction (EN)
            </label>
            <div className="flex gap-2 items-start">
              <textarea
                rows={3}
                value={formData.instruction_en || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instruction_en: e.target.value,
                  }))
                }
                placeholder="Ex: Drag evidence onto this date to establish a link with history..."
                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
              />
              <button
                onClick={handleTranslate}
                className="p-2 bg-white/5 rounded hover:bg-white/10 mt-1 flex-shrink-0"
              >
                {isTranslating ? (
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                ) : (
                  <Languages size={14} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Boutons __ */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  instruction_fr: "",
                  instruction_en: "",
                  icon: "💡",
                  category: "scene",
                });
              }}
              className="flex-1 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* ── LISTE DES INSTRUCTIONS ── */}
      <div className="space-y-2">
        {instructions.length === 0 && !editingId ? (
          <div className="text-center py-8 border border-dashed border-blue-500/20 rounded-xl">
            <Lightbulb size={32} className="mx-auto text-blue-500/50 mb-2" />
            <p className="text-gray-500 text-sm mb-3">Aucune instruction créée</p>
            <button
              onClick={addInstruction}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold hover:bg-blue-600/40 inline-flex items-center gap-2"
            >
              <Plus size={14} /> Créer une instruction
            </button>
          </div>
        ) : (
          instructions.map((instr) => (
            <div
              key={instr.id}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => toggleExpanded(instr.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{instr.icon}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {instr.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {instr.category || "Sans catégorie"} •{" "}
                      {instr.instruction_fr.slice(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editInstruction(instr);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/40"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteInstruction(instr.id);
                    }}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedIds[instr.id] ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </div>
              </div>

              {/* Contenu expandable */}
              {expandedIds[instr.id] && (
                <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                      Texte FR
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {instr.instruction_fr}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                      Texte EN
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {instr.instruction_en}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}