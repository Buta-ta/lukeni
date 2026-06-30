// components/admin/WordSearchAdmin.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import {
    Plus,
    Trash2,
    Save,
    Loader2,
    Languages,
    X,
    ChevronDown,
    ChevronUp,
    Clock,
    Zap,
    Lightbulb,
    AlertTriangle,
} from "lucide-react";

interface Props {
    investigationId: string;
    chapters: any[];
    outroConfig: any;
    allInstructions: any[];
    showMsg: (type: "success" | "error", text: string) => void;
}

export default function WordSearchAdmin({
    investigationId,
    chapters,
    outroConfig,
    allInstructions,
    showMsg,
}: Props) {
    const [wordSearches, setWordSearches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState<any>({
        title_fr: "",
        title_en: "",
        chapter_id: "",
        scene_id: null,
        words_list_fr: ["", ""],
        words_list_en: ["", ""],
        trap_words_fr: [],
        trap_words_en: [],
        grid_size: 12,
        game_mode: "classic",
        is_hard: false,
        hint_fr: "",
        hint_en: "",
        reward_per_word: 2,
        penalty_per_error: 1,
        timer_seconds: 0,
        timer_behavior: "alert",
        instruction_id: null,
        trigger_event_on_success_id: null,
        trigger_event_on_failure_id: null,
        trigger_event_on_timeout_id: null,
        success_target_scene_id: null,
        success_target_chapter_id: null,
        max_attempts: 0,
        attempt_behavior: "alert",
        auto_reveal_clue_after_attempts: null,
        trigger_event_on_max_attempts: null,
        word_search_clues: [],
    });

    // ── CHARGER LES MOTS MÊLÉS ──
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("investigation_word_search")
                .select("*, word_search_clues:investigation_word_search_clues(*)")
                .eq("investigation_id", investigationId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Load word search error:", error);
                showMsg("error", `Erreur: ${error.message}`);
            } else {
                setWordSearches(data || []);
            }
            setIsLoading(false);
        };

        if (investigationId) load();
    }, [investigationId, showMsg]);

    // ── AJOUTER ──
    const addWordSearch = () => {
        setEditingId(null);
        setFormData({
            title_fr: "",
            title_en: "",
            chapter_id: chapters[0]?.id || "",
            scene_id: null,
            words_list_fr: ["", ""],
            words_list_en: ["", ""],
            grid_size: 12,
            timer_seconds: 0,
            timer_behavior: "alert",
            instruction_id: null,
            trigger_event_on_success_id: null,
            trigger_event_on_failure_id: null,
            trigger_event_on_timeout_id: null,
            max_attempts: 0,
            attempt_behavior: "alert",
            auto_reveal_clue_after_attempts: null,
            trigger_event_on_max_attempts: null,
            word_search_clues: [],
        });
    };

    // ── ÉDITER ──
    const editWordSearch = (ws: any) => {
        setEditingId(ws.id);
        setFormData({
            ...ws,
            words_list_fr: ws.words_list_fr || ["", ""],
            words_list_en: ws.words_list_en || ["", ""],
            word_search_clues: ws.word_search_clues || [],
            max_attempts: ws.max_attempts || 0,
            attempt_behavior: ws.attempt_behavior || "alert",
            auto_reveal_clue_after_attempts: ws.auto_reveal_clue_after_attempts || null,
            trigger_event_on_max_attempts: ws.trigger_event_on_max_attempts || null,
        });
    };

    // ── SAUVEGARDER ──
    const handleSave = async () => {
        if (!formData.title_fr?.trim()) {
            showMsg("error", "Le titre FR est obligatoire");
            return;
        }
        if (!formData.chapter_id) {
            showMsg("error", "Le chapitre est obligatoire");
            return;
        }
        const validWords = formData.words_list_fr.filter((w: string) => w.trim() !== "");
        if (validWords.length < 2) {
            showMsg("error", "Ajoutez au moins 2 mots");
            return;
        }

        setIsSaving(true);
        try {
            // ✅ Créer le payload SANS word_search_clues
            const payload = {
                investigation_id: investigationId,
                chapter_id: formData.chapter_id,
                scene_id: formData.scene_id || null,
                title_fr: formData.title_fr,
                title_en: formData.title_en,
                words_list_fr: validWords,
                words_list_en: formData.words_list_en.filter((w: string) => w.trim() !== ""),
                trap_words_fr: (formData.trap_words_fr || []).filter((w: string) => w.trim() !== ""),
                trap_words_en: (formData.trap_words_en || []).filter((w: string) => w.trim() !== ""),
                grid_size: formData.grid_size || 12,
                game_mode: formData.game_mode || "classic",
                is_hard: formData.is_hard || false,
                hint_fr: formData.hint_fr || null,
                hint_en: formData.hint_en || null,
                reward_per_word: formData.reward_per_word ?? 2,
                penalty_per_error: formData.penalty_per_error ?? 1,
                timer_seconds: formData.timer_seconds || 0,
                timer_behavior: formData.timer_behavior || "alert",
                instruction_id: formData.instruction_id || null,
                trigger_event_on_success_id: formData.trigger_event_on_success_id || null,
                trigger_event_on_failure_id: formData.trigger_event_on_failure_id || null,
                trigger_event_on_timeout_id: formData.trigger_event_on_timeout_id || null,
                success_target_scene_id: formData.success_target_scene_id || null,
                success_target_chapter_id: formData.success_target_chapter_id || null,
                max_attempts: formData.max_attempts || 0,
                attempt_behavior: formData.attempt_behavior || "alert",
                auto_reveal_clue_after_attempts: formData.auto_reveal_clue_after_attempts || null,
                trigger_event_on_max_attempts: formData.trigger_event_on_max_attempts || null,
                // ✅ PAS de word_search_clues ici !
            };

            let wordSearchId = editingId;

            if (editingId) {
                // ✅ MODIFICATION
                const { error } = await supabase
                    .from("investigation_word_search")
                    .update(payload)
                    .eq("id", editingId);
                if (error) throw error;
                showMsg("success", "Mots mêlés mis à jour !");
            } else {
                // ✅ CRÉATION
                const { data: newWS, error } = await supabase
                    .from("investigation_word_search")
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                wordSearchId = newWS.id;
                showMsg("success", "Mots mêlés créé !");
            }

            // ✅ SAUVEGARDER LES INDICES SÉPARÉMENT
            if (formData.word_search_clues && formData.word_search_clues.length > 0) {
                for (const clue of formData.word_search_clues) {
                    const clueId = clue.id as string;

                    // ✅ Vérifier si c'est une clue existante (UUID) ou nouvelle (Date.now)
                    if (clueId && clueId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/)) {
                        // Mise à jour d'une clue existante
                        await supabase
                            .from("investigation_word_search_clues")
                            .update({
                                text_fr: clue.text_fr,
                                text_en: clue.text_en,
                                reveal_cost_cauris: clue.reveal_cost_cauris ?? 5,
                            })
                            .eq("id", clueId);
                    } else if (clue.text_fr?.trim()) {
                        // Nouvelle clue (créer)
                        await supabase
                            .from("investigation_word_search_clues")
                            .insert({
                                word_search_id: wordSearchId,
                                text_fr: clue.text_fr,
                                text_en: clue.text_en || null,
                                reveal_cost_cauris: clue.reveal_cost_cauris ?? 5,
                                clue_order: formData.word_search_clues.indexOf(clue),
                            });
                    }
                }
            }

            // ✅ RECHARGER LES MOTS MÊLÉS AVEC LES CLUES
            const { data } = await supabase
                .from("investigation_word_search")
                .select("*, word_search_clues:investigation_word_search_clues(*)")
                .eq("investigation_id", investigationId)
                .order("created_at", { ascending: false });
            setWordSearches(data || []);

            setEditingId(null);
        } catch (err: any) {
            showMsg("error", `Erreur: ${err.message}`);
            console.error("HandleSave error:", err);
        }
        setIsSaving(false);
    };

    // ── SUPPRIMER ──
    const deleteWordSearch = async (id: string) => {
        if (!confirm("Supprimer ce mots mêlés ?")) return;
        const { error } = await supabase
            .from("investigation_word_search")
            .delete()
            .eq("id", id);
        if (error) {
            showMsg("error", `Erreur: ${error.message}`);
        } else {
            setWordSearches((prev) => prev.filter((ws) => ws.id !== id));
            showMsg("success", "Mots mêlés supprimé !");
        }
    };

    // ── MODIFIER UN MOT DANS LA LISTE ──
    const updateWord = (index: number, value: string, lang: "fr" | "en") => {
        const field = lang === "fr" ? "words_list_fr" : "words_list_en";
        const newList = [...(formData[field] || [])];
        newList[index] = value.toUpperCase();
        setFormData((prev: any) => ({ ...prev, [field]: newList }));
    };

    // ── AJOUTER UN MOT ──
    const addWord = () => {
        setFormData((prev: any) => ({
            ...prev,
            words_list_fr: [...(prev.words_list_fr || []), ""],
            words_list_en: [...(prev.words_list_en || []), ""],
        }));
    };

    // ── SUPPRIMER UN MOT ──
    const removeWord = (index: number) => {
        setFormData((prev: any) => ({
            ...prev,
            words_list_fr: (prev.words_list_fr || []).filter((_: any, i: number) => i !== index),
            words_list_en: (prev.words_list_en || []).filter((_: any, i: number) => i !== index),
        }));
    };

    // ── TRADUIRE TOUS LES MOTS ──
    const translateAllWords = async () => {
        setIsTranslating(true);
        try {
            const translated = [];
            for (const word of formData.words_list_fr) {
                if (word.trim()) {
                    const t = await autoTranslate(word, "fr");
                    translated.push(t.toUpperCase());
                } else {
                    translated.push("");
                }
            }
            setFormData((prev: any) => ({ ...prev, words_list_en: translated }));
        } catch {
            showMsg("error", "Erreur de traduction");
        }
        setIsTranslating(false);
    };

    // ── OBTENIR LES SCÈNES D'UN CHAPITRE ──
    const getScenesForChapter = (chapterId: string) => {
        const chap = chapters.find((c) => c.id === chapterId);
        return chap?.scenes || [];
    };

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-pink-500" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🧩</span>
                    <span className="text-sm font-bold text-pink-400">Mots Mêlés</span>
                    <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
                        {wordSearches.length}
                    </span>
                </div>
                {!editingId && (
                    <button
                        onClick={addWordSearch}
                        className="flex items-center gap-2 px-3 py-1.5 bg-pink-600/20 text-pink-400 border border-pink-500/30 rounded-lg text-xs font-bold hover:bg-pink-600/40"
                    >
                        <Plus size={14} /> Nouveau
                    </button>
                )}
            </div>

            {/* FORMULAIRE */}
            {editingId !== undefined && (
                <div className="bg-pink-950/20 p-4 rounded-xl border border-pink-500/30 space-y-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-pink-400">
                            {editingId ? "Modifier" : "Créer"} un Mots Mêlés
                        </h3>
                        <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Titre */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                Titre (FR)
                            </label>
                            <input
                                type="text"
                                value={formData.title_fr}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, title_fr: e.target.value }))}
                                placeholder="Ex: Les acteurs de l'indépendance"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                Titre (EN)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.title_en || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, title_en: e.target.value }))}
                                    placeholder="Ex: The actors of independence"
                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                                />
                                <button
                                    onClick={async () => {
                                        if (!formData.title_fr?.trim()) return;
                                        setIsTranslating(true);
                                        const t = await autoTranslate(formData.title_fr, "fr");
                                        setFormData((prev: any) => ({ ...prev, title_en: t }));
                                        setIsTranslating(false);
                                    }}
                                    className="p-2 bg-white/5 rounded hover:bg-white/10"
                                >
                                    {isTranslating ? <Loader2 size={14} className="animate-spin text-pink-500" /> : <Languages size={14} className="text-gray-400" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Portée */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                📍 Chapitre
                            </label>
                            <select
                                value={formData.chapter_id}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, chapter_id: e.target.value, scene_id: null }))}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                            >
                                <option value="">— Sélectionner —</option>
                                {chapters.map((chap: any) => (
                                    <option key={chap.id} value={chap.id}>
                                        {chap.title_fr}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                Scène (optionnel)
                            </label>
                            <select
                                value={formData.scene_id || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, scene_id: e.target.value || null }))}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                            >
                                <option value="">— Tout le chapitre —</option>
                                {getScenesForChapter(formData.chapter_id).map((scene: any, idx: number) => (
                                    <option key={scene.id} value={scene.id}>
                                        Scène {idx + 1} — {scene.title_fr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Taille de la grille */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                Taille de la grille
                            </label>
                            <select
                                value={formData.grid_size || 12}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, grid_size: Number(e.target.value) }))}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                            >
                                <option value={8}>8x8 (Facile)</option>
                                <option value={10}>10x10 (Moyen)</option>
                                <option value={12}>12x12 (Classique)</option>
                                <option value={15}>15x15 (Expert)</option>
                            </select>
                        </div>

                        {/* Mode de jeu */}
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                🎮 Mode de jeu
                            </label>
                            <select
                                value={formData.game_mode || "classic"}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, game_mode: e.target.value }))}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                            >
                                <option value="classic">📋 Classique (Liste visible)</option>
                                <option value="mystery">🔮 Mystère (Liste cachée)</option>
                                <option value="intruder">💣 Intrus (Mots pièges)</option>
                            </select>
                        </div>
                    </div>

                    {/* Difficulté */}
                    <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/10">
                        <div>
                            <p className="text-xs font-bold text-white">🔀 Mode Difficile</p>
                            <p className="text-[10px] text-gray-500">Les mots peuvent être écrits à l'envers</p>
                        </div>
                        <button
                            onClick={() => setFormData((prev: any) => ({ ...prev, is_hard: !prev.is_hard }))}
                            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${formData.is_hard ? 'bg-pink-600' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.is_hard ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Économie Cauris */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#D4AF37]/10 p-3 rounded-lg border border-[#D4AF37]/30">
                        <div>
                            <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block flex items-center gap-1">
                                💰 Récompense par mot trouvé
                            </label>
                            <input
                                type="number"
                                value={formData.reward_per_word ?? 2}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, reward_per_word: Number(e.target.value) }))}
                                min={0}
                                className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Cauris gagnés par mot trouvé</p>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block flex items-center gap-1">
                                ❌ Pénalité par erreur
                            </label>
                            <input
                                type="number"
                                value={formData.penalty_per_error ?? 1}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, penalty_per_error: Number(e.target.value) }))}
                                min={0}
                                className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">0 = Pas de pénalité</p>
                        </div>
                    </div>

                    {/* Indice si mode Mystère */}
                    {formData.game_mode === 'mystery' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                    💡 Indice (FR)
                                </label>
                                <input
                                    type="text"
                                    value={formData.hint_fr || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, hint_fr: e.target.value }))}
                                    placeholder="Ex: Trouvez 5 pays d'Afrique"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                    💡 Hint (EN)
                                </label>
                                <input
                                    type="text"
                                    value={formData.hint_en || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, hint_en: e.target.value }))}
                                    placeholder="Ex: Find 5 African countries"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Liste des mots */}
                    <div className="border-t border-white/10 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">
                                Mots à chercher (FR)
                            </label>
                            <button
                                onClick={translateAllWords}
                                className="text-[10px] text-pink-400 font-bold flex items-center gap-1 bg-pink-500/10 px-2 py-1 rounded hover:bg-pink-500/20"
                            >
                                {isTranslating ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />} Traduire tout
                            </button>
                        </div>

                        {(formData.words_list_fr || []).map((word: string, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-[10px] text-gray-500 w-4">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={word}
                                    onChange={(e) => updateWord(idx, e.target.value, "fr")}
                                    placeholder="Mot FR"
                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-pink-500 uppercase"
                                />
                                <input
                                    type="text"
                                    value={(formData.words_list_en || [])[idx] || ""}
                                    onChange={(e) => updateWord(idx, e.target.value, "en")}
                                    placeholder="Mot EN"
                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-pink-500 uppercase"
                                />
                                <button
                                    onClick={() => removeWord(idx)}
                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={addWord}
                            className="w-full py-2 border border-dashed border-pink-500/30 text-pink-400 text-xs font-bold rounded hover:bg-pink-500/10"
                        >
                            + Ajouter un mot
                        </button>
                    </div>

                    {/* Mots pièges si mode Intrus */}
                    {formData.game_mode === 'intruder' && (
                        <div className="border-t border-red-500/20 pt-4 space-y-3">
                            <label className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1">
                                💣 Mots Pièges (Intrus)
                            </label>
                            <p className="text-[10px] text-gray-500">Ces mots seront dans la grille mais ne doivent PAS être sélectionnés.</p>

                            {(formData.trap_words_fr || []).map((word: string, idx: number) => (
                                <div key={`trap-${idx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-red-400 w-4">{idx + 1}.</span>
                                    <input
                                        type="text"
                                        value={word}
                                        onChange={(e) => {
                                            const newList = [...(formData.trap_words_fr || [])];
                                            newList[idx] = e.target.value.toUpperCase();
                                            setFormData((prev: any) => ({ ...prev, trap_words_fr: newList }));
                                        }}
                                        placeholder="Mot piège FR"
                                        className="flex-1 bg-[#1a1a1a] border border-red-500/30 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-red-500 uppercase"
                                    />
                                    <button
                                        onClick={() => {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                trap_words_fr: (prev.trap_words_fr || []).filter((_: any, i: number) => i !== idx),
                                                trap_words_en: (prev.trap_words_en || []).filter((_: any, i: number) => i !== idx),
                                            }));
                                        }}
                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        trap_words_fr: [...(prev.trap_words_fr || []), ""],
                                        trap_words_en: [...(prev.trap_words_en || []), ""],
                                    }));
                                }}
                                className="w-full py-2 border border-dashed border-red-500/30 text-red-400 text-xs font-bold rounded hover:bg-red-500/10"
                            >
                                + Ajouter un mot piège
                            </button>
                        </div>
                    )}

                    {/* Essais / Tentatives */}
                    <div className="border-t border-white/10 pt-4 space-y-3 bg-orange-900/10 p-3 rounded border border-orange-500/20">
                        <label className="text-[10px] text-orange-400 font-bold uppercase flex items-center gap-2">
                            <AlertTriangle size={12} /> Configuration des Essais
                        </label>
                        <p className="text-[10px] text-gray-500">Le joueur peut faire plusieurs tentatives. Après X essais, une action se déclenche.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold mb-1 block">
                                    Nombre max d'essais (0 = illimité)
                                </label>
                                <input
                                    type="number"
                                    value={formData.max_attempts || 0}
                                    onChange={(e) =>
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            max_attempts: Number(e.target.value),
                                        }))
                                    }
                                    min={0}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                    placeholder="0"
                                />
                            </div>

                            {formData.max_attempts > 0 && (
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold mb-1 block">
                                        Comportement après max essais
                                    </label>
                                    <select
                                        value={formData.attempt_behavior || "alert"}
                                        onChange={(e) =>
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                attempt_behavior: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                                    >
                                        <option value="alert">💡 Juste alerte</option>
                                        <option value="pause">⏸️ Pause le jeu</option>
                                        <option value="end_game">🔴 Termine le jeu</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {formData.max_attempts > 0 && (
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold mb-1 block">
                                    Révéler automatiquement un indice après X essais
                                </label>
                                <input
                                    type="number"
                                    value={formData.auto_reveal_clue_after_attempts || ""}
                                    onChange={(e) =>
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            auto_reveal_clue_after_attempts: e.target.value ? Number(e.target.value) : null,
                                        }))
                                    }
                                    min={1}
                                    max={formData.max_attempts}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                    placeholder="Ex: 3 (après 3 essais)"
                                />
                            </div>
                        )}
                    </div>

                    {/* Timer & Événements */}
                    <div className="border-t border-white/10 pt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block flex items-center gap-1">
                                    <Clock size={12} /> Timer (secondes)
                                </label>
                                <input
                                    type="number"
                                    value={formData.timer_seconds || 0}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, timer_seconds: Number(e.target.value) }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-pink-500"
                                    placeholder="0 = pas de timer"
                                />
                            </div>
                            {formData.timer_seconds > 0 && (
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                        Comportement du timer
                                    </label>
                                    <select
                                        value={formData.timer_behavior || "alert"}
                                        onChange={(e) => setFormData((prev: any) => ({ ...prev, timer_behavior: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                                    >
                                        <option value="alert">💡 Juste alerte</option>
                                        <option value="pause">⏸️ Pause le jeu</option>
                                        <option value="end_game">🔴 Termine le jeu</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Événements narratifs */}
                        <div className="bg-purple-900/10 p-3 rounded border border-purple-500/20 space-y-3">
                            <label className="text-[10px] text-purple-400 font-bold uppercase flex items-center gap-1">
                                <Zap size={12} /> Événements narratifs
                            </label>

                            <div>
                                <label className="text-[10px] text-gray-500 font-bold mb-1 block">✅ Si tous les mots trouvés</label>
                                <select
                                    value={formData.trigger_event_on_success_id || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, trigger_event_on_success_id: e.target.value || null }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                >
                                    <option value="">— Aucun —</option>
                                    {(outroConfig?.narrative_events || []).map((ev: any) => (
                                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-500 font-bold mb-1 block">❌ Si mauvaises tentatives</label>
                                <select
                                    value={formData.trigger_event_on_failure_id || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, trigger_event_on_failure_id: e.target.value || null }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                >
                                    <option value="">— Aucun —</option>
                                    {(outroConfig?.narrative_events || []).map((ev: any) => (
                                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.timer_seconds > 0 && (
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold mb-1 block">⏱️ Si timer = 0</label>
                                    <select
                                        value={formData.trigger_event_on_timeout_id || ""}
                                        onChange={(e) => setFormData((prev: any) => ({ ...prev, trigger_event_on_timeout_id: e.target.value || null }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                    >
                                        <option value="">— Aucun —</option>
                                        {(outroConfig?.narrative_events || []).map((ev: any) => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.max_attempts > 0 && (
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold mb-1 block">⚠️ Si max essais atteint</label>
                                    <select
                                        value={formData.trigger_event_on_max_attempts || ""}
                                        onChange={(e) => setFormData((prev: any) => ({ ...prev, trigger_event_on_max_attempts: e.target.value || null }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                    >
                                        <option value="">— Aucun —</option>
                                        {(outroConfig?.narrative_events || []).map((ev: any) => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action de réussite (Navigation) */}
                    <div className="bg-green-900/10 p-3 rounded border border-green-500/20 space-y-3">
                        <label className="text-[10px] text-green-400 font-bold uppercase flex items-center gap-1">
                            🎯 Action si tous les mots sont trouvés
                        </label>

                        <div>
                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">Aller vers une scène</label>
                            <select
                                value={formData.success_target_scene_id || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, success_target_scene_id: e.target.value || null }))}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                            >
                                <option value="">— Aucune —</option>
                                {chapters.map((chap: any) => (
                                    <optgroup key={chap.id} label={chap.title_fr}>
                                        {(chap.scenes || []).map((scene: any, idx: number) => (
                                            <option key={scene.id} value={scene.id}>
                                                Scène {idx + 1} — {scene.title_fr}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">Ou aller vers un chapitre</label>
                            <select
                                value={formData.success_target_chapter_id || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, success_target_chapter_id: e.target.value || null }))}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                            >
                                <option value="">— Aucun —</option>
                                {chapters.map((chap: any) => (
                                    <option key={chap.id} value={chap.id}>
                                        {chap.title_fr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Instruction */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block flex items-center gap-1">
                            <Lightbulb size={12} /> Instruction à l'ouverture
                        </label>
                        <select
                            value={formData.instruction_id || ""}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, instruction_id: e.target.value || null }))}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                        >
                            <option value="">— Aucune —</option>
                            {allInstructions.map((instr: any) => (
                                <option key={instr.id} value={instr.id}>{instr.icon} {instr.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Indices payants pour les mots mêlés */}
                    <div className="border-t border-white/10 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                                <Lightbulb size={12} className="text-blue-400" /> Indices Payants
                            </label>
                            <button
                                onClick={() => {
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        word_search_clues: [
                                            ...(prev.word_search_clues || []),
                                            {
                                                id: Date.now().toString(),
                                                text_fr: "",
                                                text_en: "",
                                                media_url: null,
                                                media_type: null,
                                                reveal_cost_cauris: 5,
                                                clue_order: (prev.word_search_clues || []).length,
                                            },
                                        ],
                                    }));
                                }}
                                className="text-[10px] text-blue-400 font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-500/20"
                            >
                                <Plus size={12} /> Ajouter un indice
                            </button>
                        </div>

                        {(formData.word_search_clues || []).length === 0 ? (
                            <p className="text-[10px] text-gray-600 italic">Aucun indice ajouté</p>
                        ) : (
                            <div className="space-y-3">
                                {(formData.word_search_clues || []).map((clue: any, idx: number) => (
                                    <div
                                        key={clue.id}
                                        className="bg-blue-900/10 p-3 rounded border border-blue-500/20 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-blue-400 font-bold">
                                                Indice {idx + 1}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        word_search_clues: (prev.word_search_clues || []).filter(
                                                            (_: any, i: number) => i !== idx,
                                                        ),
                                                    }));
                                                }}
                                                className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>

                                        <div className="flex gap-2 items-center p-2 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30">
                                            <span className="text-[10px] text-[#D4AF37] font-bold flex-shrink-0">💰</span>
                                            <input
                                                type="number"
                                                value={clue.reveal_cost_cauris ?? 5}
                                                onChange={(e) => {
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        word_search_clues: (prev.word_search_clues || []).map(
                                                            (c: any, i: number) =>
                                                                i === idx
                                                                    ? {
                                                                        ...c,
                                                                        reveal_cost_cauris: Number(e.target.value),
                                                                    }
                                                                    : c,
                                                        ),
                                                    }));
                                                }}
                                                min={0}
                                                className="flex-1 bg-[#1a1a1a] border border-[#D4AF37]/30 rounded px-2 py-1 text-xs text-[#D4AF37] font-bold outline-none focus:border-[#D4AF37]"
                                                placeholder="5"
                                            />
                                            <span className="text-[10px] text-gray-500">Cauris</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                value={clue.text_fr || ""}
                                                onChange={(e) => {
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        word_search_clues: (prev.word_search_clues || []).map(
                                                            (c: any, i: number) =>
                                                                i === idx
                                                                    ? { ...c, text_fr: e.target.value }
                                                                    : c,
                                                        ),
                                                    }));
                                                }}
                                                placeholder="Indice FR"
                                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                            />
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={clue.text_en || ""}
                                                    onChange={(e) => {
                                                        setFormData((prev: any) => ({
                                                            ...prev,
                                                            word_search_clues: (prev.word_search_clues || []).map(
                                                                (c: any, i: number) =>
                                                                    i === idx
                                                                        ? { ...c, text_en: e.target.value }
                                                                        : c,
                                                            ),
                                                        }));
                                                    }}
                                                    placeholder="Indice EN"
                                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        if (!clue.text_fr?.trim()) return;
                                                        setIsTranslating(true);
                                                        const t = await autoTranslate(clue.text_fr, "fr");
                                                        setFormData((prev: any) => ({
                                                            ...prev,
                                                            word_search_clues: (prev.word_search_clues || []).map(
                                                                (c: any, i: number) =>
                                                                    i === idx ? { ...c, text_en: t } : c,
                                                            ),
                                                        }));
                                                        setIsTranslating(false);
                                                    }}
                                                    className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                                                >
                                                    {isTranslating ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Languages size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-gray-600 italic">
                                            Cet indice sera proposé au joueur à la révélation
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-2 pt-4 border-t border-white/10">
                        <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Sauvegarder
                        </button>
                    </div>
                </div>
            )}

            {/* LISTE */}
            <div className="space-y-2">
                {wordSearches.length === 0 && !editingId ? (
                    <div className="text-center py-8 border border-dashed border-pink-500/20 rounded-xl">
                        <span className="text-2xl">🧩</span>
                        <p className="text-gray-500 text-sm">Aucun mots mêlés créé</p>
                        <button
                            onClick={addWordSearch}
                            className="mt-3 px-4 py-2 bg-pink-600/20 text-pink-400 border border-pink-500/30 rounded-lg text-sm font-bold hover:bg-pink-600/40"
                        >
                            <Plus size={14} className="inline mr-1" /> Créer
                        </button>
                    </div>
                ) : (
                    wordSearches.map((ws) => (
                        <div key={ws.id} className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden">
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                onClick={() => toggleExpanded(ws.id)}
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{ws.title_fr}</p>
                                    <p className="text-[10px] text-gray-500">
                                        {ws.words_list_fr?.length || 0} mot(s) • Grille {ws.grid_size}x{ws.grid_size}
                                        {ws.timer_seconds > 0 && ` • ⏱ ${ws.timer_seconds}s`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            editWordSearch(ws);
                                        }}
                                        className="px-2 py-1 text-xs bg-pink-600/20 text-pink-400 border border-pink-500/30 rounded hover:bg-pink-600/40"
                                    >
                                        Éditer
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteWordSearch(ws.id);
                                        }}
                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {expandedIds[ws.id] ? (
                                        <ChevronUp size={14} className="text-gray-500" />
                                    ) : (
                                        <ChevronDown size={14} className="text-gray-500" />
                                    )}
                                </div>
                            </div>
                            {expandedIds[ws.id] && (
                                <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 text-xs text-gray-400">
                                    <p>Mots : {(ws.words_list_fr || []).join(", ")}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}