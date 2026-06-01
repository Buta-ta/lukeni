"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2, PlusCircle, Edit2, Trash2, X,
  Globe, Link2, CheckCircle, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteModal from "@/components/admin/shared/DeleteModal";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

const PLATFORM_PRESETS = [
  { name: "Twitter", icon: "𝕏", color: "#000000" },
  { name: "Instagram", icon: "📷", color: "#E4405F" },
  { name: "Facebook", icon: "f", color: "#1877F2" },
  { name: "YouTube", icon: "▶️", color: "#FF0000" },
  { name: "TikTok", icon: "♪", color: "#000000" },
  { name: "LinkedIn", icon: "in", color: "#0A66C2" },
  { name: "Discord", icon: "⚙️", color: "#5865F2" },
  { name: "Telegram", icon: "✈️", color: "#0088CC" },
];

export default function SocialMediaTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("key", "social_links")
      .single();

    if (error && error.code !== "PGRST116") {
      showMsg("error", error.message);
    } else if (data?.value) {
      setLinks(data.value as SocialLink[]);
    }

    setIsLoading(false);
  }

  const resetForm = useCallback(() => {
    setEditingId(null);
    setPlatform("");
    setUrl("");
    setIcon("");
    setIsActive(true);
    setSortOrder(links.length);
  }, [links.length]);

  const handleEdit = useCallback((link: SocialLink) => {
    setEditingId(link.id);
    setPlatform(link.platform);
    setUrl(link.url);
    setIcon(link.icon);
    setIsActive(link.is_active);
    setSortOrder(link.sort_order);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSave = async () => {
    if (!platform.trim()) return showMsg("error", "Plateforme requise");
    if (!url.trim()) return showMsg("error", "URL requise");

    setIsSaving(true);

    let updatedLinks: SocialLink[];

    if (editingId) {
      updatedLinks = links.map((l) =>
        l.id === editingId
          ? {
              ...l,
              platform: platform.trim(),
              url: url.trim(),
              icon: icon.trim() || "🔗",
              is_active: isActive,
              sort_order: sortOrder,
            }
          : l
      );
    } else {
      updatedLinks = [
        ...links,
        {
          id: `social_${Date.now()}`,
          platform: platform.trim(),
          url: url.trim(),
          icon: icon.trim() || "🔗",
          is_active: isActive,
          sort_order: sortOrder,
        },
      ];
    }

    try {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "social_links",
          value: updatedLinks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) throw error;
      setLinks(updatedLinks);
      showMsg("success", "✅ Lien social sauvegardé !");
      resetForm();
    } catch (err: any) {
      showMsg("error", err.message);
    }

    setIsSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;
    setIsDeleting(true);

    const updatedLinks = links.filter((l) => l.id !== linkToDelete);

    try {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "social_links",
          value: updatedLinks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) throw error;
      setLinks(updatedLinks);
      showMsg("success", "Lien supprimé.");
      setDeleteModalOpen(false);
      setLinkToDelete(null);
    } catch (err: any) {
      showMsg("error", err.message);
    }

    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Globe className="text-blue-400" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Réseaux Sociaux</h2>
          <p className="text-gray-400 text-xs">
            {links.length} liens · {links.filter((l) => l.is_active).length} actifs
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId ? (
              <Edit2 size={18} className="text-blue-400" />
            ) : (
              <PlusCircle size={18} className="text-blue-400" />
            )}
            {editingId ? "Modifier le lien" : "Nouveau lien"}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Plateforme *
            </label>
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                const preset = PLATFORM_PRESETS.find(
                  (p) => p.name === e.target.value
                );
                if (preset) setIcon(preset.icon);
              }}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="">Sélectionner…</option>
              {PLATFORM_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Icône
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ex: 𝕏, 📷, ▶️"
              maxLength={2}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 text-center text-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1 font-mono">
            URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://twitter.com/lukeni"
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer w-full">
              <div
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
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
                {isActive ? "Actif" : "Inactif"}
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {editingId ? "Mettre à jour" : "Ajouter le lien"}
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {links.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <Globe size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun lien social. Créez-en un ci-dessus.</p>
          </div>
        )}

        {links
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((link) => (
            <div
              key={link.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                link.is_active
                  ? "bg-white/[0.02] border-white/10 hover:border-white/20"
                  : "bg-black/20 border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{link.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-bold">{link.platform}</p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs hover:underline truncate"
                  >
                    {link.url}
                  </a>
                </div>
              </div>

              {!link.is_active && (
                <span className="text-[9px] bg-gray-500/20 text-gray-500 px-2 py-0.5 rounded-full">
                  inactive
                </span>
              )}

              <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                <button
                  onClick={() => handleEdit(link)}
                  className="p-2 bg-white/5 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => {
                    setLinkToDelete(link.id);
                    setDeleteModalOpen(true);
                  }}
                  className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        title="Supprimer ce lien ?"
        itemName={links.find((l) => l.id === linkToDelete)?.platform}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setLinkToDelete(null);
        }}
        isDeleting={isDeleting}
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
}