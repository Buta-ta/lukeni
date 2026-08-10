// components/admin/DailyChallengeTab.tsx
// Onglet admin : configuration du "Défi du jour".
// L'admin choisit la date, le titre (FR/EN + traduction auto), l'enquête, la scène et la récompense.
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Loader2, Languages, Calendar, Star } from "lucide-react";
import { autoTranslate } from "@/lib/lingua";

interface DailyChallenge {
  id: string;
  challenge_date: string;
  investigation_id: string | null;
  scene_id: string | null;
  title_fr: string | null;
  title_en: string | null;
  reward_cauris: number;
}

interface Props {
  showMsg?: (type: "success" | "error", text: string) => void;
}

export default function DailyChallengeTab({ showMsg }: Props) {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Charger les enquêtes
  useEffect(() => {
    supabase.from("investigations").select("id, title_fr").then(({ data }) => setInvestigations(data || []));
  }, []);

  // Charger le défi pour la date sélectionnée
  useEffect(() => {
    if (!date) return;
    setIsLoading(true);
    supabase
      .from("daily_challenge")
      .select("*")
      .eq("challenge_date", date)
      .maybeSingle()
      .then(({ data }) => {
        setChallenge(data || null);
        if (data?.investigation_id) loadScenes(data.investigation_id);
        setIsLoading(false);
      });
  }, [date]);

  // Charger les scènes d'une enquête
  const loadScenes = async (invId: string) => {
    const { data: chaps } = await supabase
      .from("investigation_chapters")
      .select("id, title_fr, scenes:investigation_scenes(id, title_fr)")
      .eq("investigation_id", invId);
    const all = (chaps || []).flatMap((c: any) => (c.scenes || []).map((s: any) => ({ ...s, chapter: c.title_fr })));
    setScenes(all);
  };

  const handleInvChange = async (invId: string) => {
    setChallenge((prev) => ({ ...(prev as DailyChallenge), investigation_id: invId, scene_id: null }));
    if (invId) await loadScenes(invId);
    else setScenes([]);
  };

  const save = async () => {
    if (!date) return;
    setIsSaving(true);
    const payload = {
      challenge_date: date,
      investigation_id: challenge?.investigation_id || null,
      scene_id: challenge?.scene_id || null,
      title_fr: challenge?.title_fr || null,
      title_en: challenge?.title_en || null,
      reward_cauris: challenge?.reward_cauris || 50,
    };
    const { error } = await supabase.from("daily_challenge").upsert(payload, { onConflict: "challenge_date" });
    setIsSaving(false);
    if (error) {
      showMsg?.("error", "Erreur sauvegarde : " + error.message);
    } else {
      showMsg?.("success", "Défi du jour enregistré !");
    }
  };

  const translate = async () => {
    if (!challenge?.title_fr?.trim()) return;
    setIsTranslating(true);
    try {
      const t = await autoTranslate(challenge.title_fr, "fr");
      setChallenge((prev) => ({ ...(prev as DailyChallenge), title_en: t }));
    } catch { }
    setIsTranslating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Star size={18} className="text-[#D4AF37]" />
        <h2 className="text-lg font-bold text-white">Défi du jour</h2>
      </div>

      {/* Sélecteur de date */}
      <div className="bg-[#111] p-4 rounded-xl border border-white/10 space-y-3">
        <label className="text-xs font-bold text-[#D4AF37] flex items-center gap-2"><Calendar size={14} /> Date du défi</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-[#D4AF37]" /></div>
      ) : (
        <div className="space-y-4">
          {/* Titre FR / EN + traduction */}
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 space-y-3">
            <label className="text-xs font-bold text-white">Titre du défi</label>
            <div className="space-y-2">
              <input
                type="text"
                value={challenge?.title_fr || ""}
                onChange={(e) => setChallenge((prev) => ({ ...(prev as DailyChallenge), title_fr: e.target.value }))}
                placeholder="Titre FR — Ex: Retrouvez l'indice caché"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={challenge?.title_en || ""}
                  onChange={(e) => setChallenge((prev) => ({ ...(prev as DailyChallenge), title_en: e.target.value }))}
                  placeholder="Title EN"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={translate}
                  disabled={isTranslating}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded flex-shrink-0"
                  title="Traduire en anglais"
                >
                  {isTranslating ? <Loader2 size={16} className="animate-spin text-[#D4AF37]" /> : <Languages size={16} className="text-gray-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Enquête + Scène */}
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 space-y-3">
            <label className="text-xs font-bold text-white">Enquête liée</label>
            <select
              value={challenge?.investigation_id || ""}
              onChange={(e) => handleInvChange(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
            >
              <option value="">-- Aucune enquête --</option>
              {investigations.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.title_fr}</option>
              ))}
            </select>

            {scenes.length > 0 && (
              <>
                <label className="text-xs font-bold text-white">Scène ciblée</label>
                <select
                  value={challenge?.scene_id || ""}
                  onChange={(e) => setChallenge((prev) => ({ ...(prev as DailyChallenge), scene_id: e.target.value || null }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="">-- Scène de départ (défaut) --</option>
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>{s.chapter ? `[${s.chapter}] ` : ""}{s.title_fr}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Récompense */}
          <div className="bg-[#111] p-4 rounded-xl border border-white/10">
            <label className="text-xs font-bold text-white flex items-center gap-2"><Star size={14} className="text-[#D4AF37]" /> Récompense (Cauris)</label>
            <input
              type="number"
              value={challenge?.reward_cauris ?? 50}
              onChange={(e) => setChallenge((prev) => ({ ...(prev as DailyChallenge), reward_cauris: Number(e.target.value) }))}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white mt-2"
            />
          </div>

          <button
            onClick={save}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-3 bg-[#D4AF37] hover:bg-white text-black rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer le défi
          </button>
        </div>
      )}
    </div>
  );
}
