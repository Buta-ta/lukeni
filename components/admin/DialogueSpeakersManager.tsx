// components/admin/DialogueSpeakersManager.tsx
"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Languages,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { autoTranslate } from "@/lib/lingua";

interface DialogueSpeaker {
  id: string;
  investigation_id: string;
  name_fr: string;
  name_en: string;
  role_fr: string;
  role_en: string;
  avatar_url?: string;
  created_at?: string;
}

interface Props {
  investigationId: string;
  showMsg: (type: "success" | "error", text: string) => void;
}

export default function DialogueSpeakersManager({
  investigationId,
  showMsg,
}: Props) {
  const [speakers, setSpeakers] = useState<DialogueSpeaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<DialogueSpeaker>>({
    name_fr: "",
    name_en: "",
    role_fr: "",
    role_en: "",
    avatar_url: "",
  });

  // ── CHARGER LES SPEAKERS ──
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("investigation_dialogue_speakers")
        .select("*")
        .eq("investigation_id", investigationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load speakers error:", error);
        showMsg("error", `Erreur: ${error.message}`);
      } else {
        setSpeakers(data || []);
      }
      setIsLoading(false);
    };

    if (investigationId) load();
  }, [investigationId, showMsg]);

  // ── AJOUTER UN SPEAKER ──
  const addSpeaker = () => {
    setEditingId(null);
    setFormData({
      name_fr: "",
      name_en: "",
      role_fr: "",
      role_en: "",
      avatar_url: "",
    });
  };

  // ── ÉDITER UN SPEAKER ──
  const editSpeaker = (speaker: DialogueSpeaker) => {
    setEditingId(speaker.id);
    setFormData(speaker);
  };

  // ── SAUVEGARDER ──
  const handleSave = async () => {
    if (!formData.name_fr?.trim()) {
      showMsg("error", "Le nom FR est obligatoire");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from("investigation_dialogue_speakers")
          .update({
            name_fr: formData.name_fr,
            name_en: formData.name_en,
            role_fr: formData.role_fr,
            role_en: formData.role_en,
            avatar_url: formData.avatar_url,
          })
          .eq("id", editingId);

        if (error) throw error;
        setSpeakers((prev) =>
          prev.map((s) =>
            s.id === editingId ? { ...s, ...formData } : s
          ) as DialogueSpeaker[]
        );
        showMsg("success", "Speaker modifié !");
      } else {
        // INSERT
        const newSpeaker: DialogueSpeaker = {
          id: uuidv4(),
          investigation_id: investigationId,
          name_fr: formData.name_fr!,
          name_en: formData.name_en || "",
          role_fr: formData.role_fr || "",
          role_en: formData.role_en || "",
          avatar_url: formData.avatar_url,
        };

        const { error } = await supabase
          .from("investigation_dialogue_speakers")
          .insert(newSpeaker);

        if (error) throw error;
        setSpeakers((prev) => [newSpeaker, ...prev]);
        showMsg("success", "Speaker créé !");
      }

      setEditingId(null);
      setFormData({
        name_fr: "",
        name_en: "",
        role_fr: "",
        role_en: "",
        avatar_url: "",
      });
    } catch (err: any) {
      showMsg("error", `Erreur: ${err.message}`);
    }
    setIsSaving(false);
  };

  // ── SUPPRIMER ──
  const deleteSpeaker = async (id: string) => {
    if (!confirm("Supprimer ce speaker ?")) return;

    const { error } = await supabase
      .from("investigation_dialogue_speakers")
      .delete()
      .eq("id", id);

    if (error) {
      showMsg("error", `Erreur: ${error.message}`);
    } else {
      setSpeakers((prev) => prev.filter((s) => s.id !== id));
      showMsg("success", "Speaker supprimé !");
    }
  };

  // ── TRADUCTEUR AUTO ──
  const handleTranslate = async (frText: string, field: keyof DialogueSpeaker) => {
    if (!frText.trim()) return;
    setIsTranslating(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setFormData((prev) => ({ ...prev, [field]: translated }));
    } catch {
      showMsg("error", "Erreur de traduction");
    }
    setIsTranslating(false);
  };

  // ── UPLOAD AVATAR ──
  const uploadAvatar = () => {
    setIsUploading(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          sources: ["local", "url"],
          resourceType: "image",
          folder: "lukeni/dialogue-speakers",
          croppingAspectRatio: 1,
        },
        (_error: any, result: any) => {
          setIsUploading(false);
          if (result?.event === "success") {
            setFormData((prev) => ({
              ...prev,
              avatar_url: result.info.secure_url,
            }));
            showMsg("success", "✅ Avatar uploadé !");
          }
        }
      );
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  // ── TOGGLER EXPANSION ──
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-purple-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span className="text-sm font-bold text-purple-400">
            Dialogue Speakers (Avatars de bulles)
          </span>
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            {speakers.length}
          </span>
        </div>
        {!editingId && (
          <button
            onClick={addSpeaker}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-600/40"
          >
            <Plus size={14} /> Nouveau Speaker
          </button>
        )}
      </div>

      {/* FORMULAIRE */}
      {editingId !== undefined && (
        <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-purple-400">
              {editingId ? "Modifier le Speaker" : "Créer un Speaker"}
            </h3>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({});
              }}
              className="text-gray-600 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Nom FR */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Nom (FR)
              </label>
              <input
                type="text"
                value={formData.name_fr || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name_fr: e.target.value }))
                }
                placeholder="Ex: Patrice Lumumba"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>

            {/* Nom EN */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Nom (EN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.name_en || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name_en: e.target.value }))
                  }
                  placeholder="Ex: Patrice Lumumba"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
                <button
                  onClick={() =>
                    handleTranslate(formData.name_fr || "", "name_en")
                  }
                  className="p-2 bg-white/5 rounded hover:bg-white/10"
                >
                  {isTranslating ? (
                    <Loader2 size={14} className="animate-spin text-purple-500" />
                  ) : (
                    <Languages size={14} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Rôle FR */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Rôle (FR)
              </label>
              <input
                type="text"
                value={formData.role_fr || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, role_fr: e.target.value }))
                }
                placeholder="Ex: Premier Ministre"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>

            {/* Rôle EN */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Rôle (EN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.role_en || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role_en: e.target.value }))
                  }
                  placeholder="Ex: Prime Minister"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleTranslate(formData.role_fr || "", "role_en")}
                  className="p-2 bg-white/5 rounded hover:bg-white/10"
                >
                  {isTranslating ? (
                    <Loader2 size={14} className="animate-spin text-purple-500" />
                  ) : (
                    <Languages size={14} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
              Avatar (Optionnel)
            </label>
            <button
              onClick={uploadAvatar}
              className="w-full py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-600/40 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {formData.avatar_url ? "Changer l'avatar" : "Uploader un avatar"}
            </button>
            {formData.avatar_url && (
              <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                <img
                  src={formData.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, avatar_url: "" }))
                  }
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({});
              }}
              className="flex-1 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* LISTE DES SPEAKERS */}
      <div className="space-y-2">
        {speakers.length === 0 && !editingId ? (
          <div className="text-center py-8 border border-dashed border-purple-500/20 rounded-xl">
            <span className="text-2xl mb-2">💬</span>
            <p className="text-gray-500 text-sm">Aucun speaker créé</p>
            <button
              onClick={addSpeaker}
              className="mt-3 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-bold hover:bg-purple-600/40"
            >
              <Plus size={14} className="inline mr-1" /> Créer un speaker
            </button>
          </div>
        ) : (
          speakers.map((speaker) => (
            <div
              key={speaker.id}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => toggleExpanded(speaker.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {speaker.avatar_url && (
                    <img
                      src={speaker.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {speaker.name_fr}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {speaker.role_fr || "Sans rôle"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editSpeaker(speaker);
                    }}
                    className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600/40"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSpeaker(speaker.id);
                    }}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedIds[speaker.id] ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </div>
              </div>

              {/* Contenu expandable */}
              {expandedIds[speaker.id] && (
                <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 space-y-2 text-xs">
                  <div>
                    <p className="text-gray-500 font-bold">Nom EN</p>
                    <p className="text-gray-300">{speaker.name_en}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold">Rôle EN</p>
                    <p className="text-gray-300">{speaker.role_en || "-"}</p>
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