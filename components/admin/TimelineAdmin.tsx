// components/admin/TimelineAdmin.tsx
"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import {
    X, Plus, Trash2, Save, Loader2, Languages, ChevronDown,
    ChevronUp, Calendar, Gift, AlertCircle, Upload, PlusCircle, Layers,
    ArrowRight, Music, Camera, Clock, ImagePlus, User, FileQuestion, Paperclip, AlertTriangle, Zap, Lightbulb
} from "lucide-react";

import TimelineConditionEditor from "@/components/admin/TimelineConditionEditor";

// ── TYPES ──────────────────────────────────────────────────
interface Reward {
    id: string;
    type: "scene" | "hotspot" | "enigma" | "evidence" | "clue" | "chapter" | "narrative_event" | "ending";
    target_id: string;
    notif_fr: string;
    notif_en: string;
}

interface TimelineSlot {
    id: string;
    label_fr: string;
    label_en: string;
    hint_fr: string;
    hint_en: string;
    expected_evidence_id: string;
    rewards: Reward[];
    conditions?: TimelineCondition[];
    instruction_id?: string;
}

interface Timeline {
    id?: string;
    chapter_id: string;
    title_fr: string;
    title_en: string;
    slots: TimelineSlot[];
    instruction_id?: string;
}

interface Props {
    chapterId: string;
    evidences: any[];
    scenes: any[];
    chapters: any[];
    enigmas: any[];
    outroConfig: any;
    wordSearches?: any[];
    lang?: "fr" | "en";
    showMsg: (type: "success" | "error", text: string) => void;
    investigationId?: string;
}


interface TimelineAction {
    id: string;
    actionType: "navigate_scene" | "navigate_chapter" | "reveal_hotspot" | "trigger_event" | "reward";
    targetId?: string;
    rewardData?: Reward;
    description_fr: string;
    description_en: string;
}

interface TimelineCondition {
    id: string;
    type: "success" | "failure" | "partial";
    actions: TimelineAction[];
}
// ── REWARD TYPES CONFIG ────────────────────────────────────
const REWARD_TYPES = [
    { value: "scene", label: "🗺️ Scène panoramique", color: "#8b5cf6" },
    { value: "hotspot", label: "📍 Hotspot dans la scène", color: "#ef4444" },
    { value: "enigma", label: "🧩 Énigme", color: "#D4AF37" },
    { value: "evidence", label: "📄 Preuve directe", color: "#06b6d4" },
    { value: "clue", label: "💡 Indice d'énigme", color: "#3b82f6" },
    { value: "chapter", label: "📖 Chapitre suivant", color: "#10b981" },
    { value: "narrative_event", label: "🎬 Événement narratif", color: "#ec4899" },
    { value: "ending", label: "🏁 Fin alternative", color: "#f97316" },
];

// ── SOUS-COMPOSANT : UNE RÉCOMPENSE ───────────────────────
function RewardForm({
    reward, scenes, chapters, enigmas, evidences, outroConfig,
    onChange, onDelete, isTranslating, setIsTranslating
}: {
    reward: Reward;
    scenes: any[];
    chapters: any[];
    enigmas: any[];
    evidences: any[];
    outroConfig: any;
    onChange: (updated: Reward) => void;
    onDelete: () => void;
    isTranslating: boolean;
    setIsTranslating: (v: boolean) => void;
}) {
    const cfg = REWARD_TYPES.find(r => r.value === reward.type);

    const handleTranslate = async () => {
        if (!reward.notif_fr.trim()) return;
        setIsTranslating(true);
        try {
            const translated = await autoTranslate(reward.notif_fr, "fr");
            onChange({ ...reward, notif_en: translated });
        } catch { }
        setIsTranslating(false);
    };

    // Calcule les options de cible selon le type
    const renderTargetSelect = () => {
        switch (reward.type) {
            case "scene":
                return (
                    <select
                        value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                    >
                        <option value="">— Choisir une scène —</option>
                        {scenes.map((sc: any, idx: number) => (
                            <option key={sc.id} value={sc.id}>Scène {idx + 1} — {sc.title_fr}</option>
                        ))}
                    </select>
                );
            case "enigma":
                return (
                    <select
                        value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                    >
                        <option value="">— Choisir une énigme —</option>
                        {enigmas.map((en: any) => (
                            <option key={en.id} value={en.id}>{en.question_fr || "Énigme sans titre"}</option>
                        ))}
                    </select>
                );
            case "evidence":
                return (
                    <select
                        value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                    >
                        <option value="">— Choisir une preuve —</option>
                        {evidences.map((ev: any) => (
                            <option key={ev.id} value={ev.id}>
                                {ev.media_type === "image" ? "🖼️" : ev.media_type === "audio" ? "🎵" : "📄"} {ev.name_fr || "Sans nom"}
                            </option>
                        ))}
                    </select>
                );
            case "clue":
                return (
                    <select
                        value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                    >
                        <option value="">— Choisir un indice —</option>
                        {enigmas.flatMap((en: any) =>
                            (en.clues || []).map((cl: any, clIdx: number) => (
                                <option key={cl.id} value={cl.id}>
                                    [{en.question_fr?.slice(0, 20)}...] Indice {clIdx + 1}
                                </option>
                            ))
                        )}
                    </select>
                );
            case "chapter":
                return (
                    <select
                        value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                    >
                        <option value="">— Choisir un chapitre —</option>
                        {chapters.map((ch: any) => (
                            <option key={ch.id} value={ch.id}>{ch.step_order}. {ch.title_fr}</option>
                        ))}
                    </select>
                );
            case "narrative_event":
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— Choisir un événement outro —</option>

                        {(outroConfig?.ranks || []).filter((r: any) => r.name).length > 0 && (
                            <optgroup label="🏆 Victoires & Rangs">
                                {outroConfig.ranks.filter((r: any) => r.name).map((r: any) => (
                                    <option key={r.id} value={`rank|${r.id}`}>
                                        {r.name} ({r.min_percent}%)
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {(outroConfig?.game_overs || []).filter((g: any) => g.name).length > 0 && (
                            <optgroup label="💀 Game Over">
                                {outroConfig.game_overs.filter((g: any) => g.name).map((g: any) => (
                                    <option key={g.id} value={`game_over|${g.id}`}>
                                        {g.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {(outroConfig?.abandons || []).filter((a: any) => a.name).length > 0 && (
                            <optgroup label="🚪 Abandons">
                                {outroConfig.abandons.filter((a: any) => a.name).map((a: any) => (
                                    <option key={a.id} value={`abandon|${a.id}`}>
                                        {a.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {(outroConfig?.milestones || []).filter((m: any) => m.name).length > 0 && (
                            <optgroup label="💭 Toasts d'encouragement">
                                {outroConfig.milestones.filter((m: any) => m.name).map((m: any) => (
                                    <option key={m.id} value={`milestone|${m.id}`}>
                                        {m.name} ({m.percent}%)
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                );
            case "hotspot":
                const allHotspots = scenes.flatMap((sc: any) =>
                    (sc.hotspots || []).map((h: any) => ({
                        ...h, sceneName: sc.title_fr || "Scène"
                    }))
                );
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— Choisir un hotspot —</option>
                        {allHotspots.map((h: any) => (
                            <option key={h.id} value={h.id}>
                                {h.icon} {h.label_fr} ({h.sceneName})
                            </option>
                        ))}
                    </select>
                );
            case "ending":
                return (
                    <select
                        value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                    >
                        <option value="">— Choisir un type de fin —</option>
                        <option value="victory">✅ Victoire</option>
                        <option value="abandon">🚪 Abandon</option>
                        <option value="alternate">❓ Fin alternative</option>
                    </select>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className="p-3 rounded-lg border space-y-2"
            style={{ borderColor: (cfg?.color || "#fff") + "33", backgroundColor: (cfg?.color || "#fff") + "0a" }}
        >
            {/* Type + Supprimer */}
            <div className="flex items-center gap-2">
                <select
                    value={reward.type}
                    onChange={e => onChange({ ...reward, type: e.target.value as Reward["type"], target_id: "" })}
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                >
                    {REWARD_TYPES.map(rt => (
                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                </select>
                <button onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded">
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Cible */}
            <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Cible</label>
                {renderTargetSelect()}
            </div>

            {/* Notification */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Notification (FR)</label>
                    <input
                        type="text"
                        value={reward.notif_fr}
                        onChange={e => onChange({ ...reward, notif_fr: e.target.value })}
                        placeholder="Ex: Un lieu secret se révèle..."
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-red-500"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Notification (EN)</label>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={reward.notif_en}
                            onChange={e => onChange({ ...reward, notif_en: e.target.value })}
                            placeholder="Ex: A secret place reveals itself..."
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                        />
                        <button
                            onClick={handleTranslate}
                            className="p-1.5 bg-white/5 rounded hover:bg-white/10"
                        >
                            {isTranslating
                                ? <Loader2 size={10} className="animate-spin text-red-500" />
                                : <Languages size={10} className="text-gray-400" />
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── SOUS-COMPOSANT : UN SLOT DE TIMELINE ──────────────────
function TimelineSlotForm({
    slot,
    index,
    evidences,
    scenes,
    chapters,
    enigmas,
    outroConfig,
    allInstructions,
    wordSearches,
    lang,
    onChange,
    onDelete,
    isTranslating,
    setIsTranslating
}: {
    slot: TimelineSlot;
    index: number;
    evidences: any[];
    scenes: any[];
    chapters: any[];
    enigmas: any[];
    outroConfig: any;
    allInstructions: any[];
    wordSearches: any[];
    lang: "fr" | "en";
    onChange: (updated: TimelineSlot) => void;
    onDelete: () => void;
    isTranslating: boolean;
    setIsTranslating: (v: boolean) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    const addReward = () => {
        onChange({
            ...slot,
            rewards: [...slot.rewards, {
                id: uuidv4(),
                type: "scene",
                target_id: "",
                notif_fr: "",
                notif_en: "",
            }]
        });
    };

    const updateReward = (rIdx: number, updated: Reward) => {
        const rewards = [...slot.rewards];
        rewards[rIdx] = updated;
        onChange({ ...slot, rewards });
    };

    const deleteReward = (rIdx: number) => {
        onChange({ ...slot, rewards: slot.rewards.filter((_, i) => i !== rIdx) });
    };

    const translateField = async (frText: string, field: "label_en" | "hint_en") => {
        if (!frText.trim()) return;
        setIsTranslating(true);
        try {
            const translated = await autoTranslate(frText, "fr");
            onChange({ ...slot, [field]: translated });
        } catch { }
        setIsTranslating(false);
    };

    return (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden">
            {/* Header du slot */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                        {index + 1}
                    </div>
                    <span className="text-sm font-bold text-white">
                        {slot.label_fr || `Date ${index + 1}`}
                    </span>
                    {slot.rewards.length > 0 && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            {slot.rewards.length} récompense(s)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="p-1 text-gray-600 hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t border-white/5 space-y-4">

                    {/* Labels */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                <Calendar size={10} className="inline mr-1" /> Label (FR)
                            </label>
                            <input
                                type="text"
                                value={slot.label_fr}
                                onChange={e => onChange({ ...slot, label_fr: e.target.value })}
                                placeholder="Ex: 14 Septembre 1960"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Label (EN)</label>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={slot.label_en}
                                    onChange={e => onChange({ ...slot, label_en: e.target.value })}
                                    placeholder="Ex: September 14, 1960"
                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                                />
                                <button
                                    onClick={() => translateField(slot.label_fr, "label_en")}
                                    className="p-2 bg-white/5 rounded hover:bg-white/10"
                                >
                                    {isTranslating
                                        ? <Loader2 size={12} className="animate-spin text-red-500" />
                                        : <Languages size={12} className="text-gray-400" />
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Indices */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                💡 Indice pour le joueur (FR)
                            </label>
                            <input
                                type="text"
                                value={slot.hint_fr}
                                onChange={e => onChange({ ...slot, hint_fr: e.target.value })}
                                placeholder="Ex: Regardez les archives financières..."
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Indice (EN)</label>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={slot.hint_en}
                                    onChange={e => onChange({ ...slot, hint_en: e.target.value })}
                                    placeholder="Ex: Look at the financial records..."
                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none"
                                />
                                <button
                                    onClick={() => translateField(slot.hint_fr, "hint_en")}
                                    className="p-2 bg-white/5 rounded hover:bg-white/10"
                                >
                                    {isTranslating
                                        ? <Loader2 size={12} className="animate-spin text-red-500" />
                                        : <Languages size={12} className="text-gray-400" />
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preuve attendue */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                            🔍 Preuve attendue (que le joueur doit déposer ici)
                        </label>
                        <select
                            value={slot.expected_evidence_id}
                            onChange={e => onChange({ ...slot, expected_evidence_id: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-amber-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                        >
                            <option value="">— Choisir la preuve attendue —</option>
                            {evidences.map((ev: any) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.media_type === "image" ? "🖼️" : ev.media_type === "audio" ? "🎵" : "📄"} {ev.name_fr || "Sans nom"}
                                </option>
                            ))}
                        </select>
                        {!slot.expected_evidence_id && (
                            <p className="text-[10px] text-amber-500/70 mt-1 flex items-center gap-1">
                                <AlertCircle size={10} /> Sans preuve attendue, ce slot ne peut pas être validé
                            </p>
                        )}
                    </div>



                    {/* Instruction du slot */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                            💡 Instruction à afficher (optionnel)
                        </label>
                        <select
                            value={slot.instruction_id || ""}
                            onChange={e => onChange({ ...slot, instruction_id: e.target.value || undefined })}
                            className="w-full bg-[#1a1a1a] border border-blue-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        >
                            <option value="">— Aucune instruction —</option>
                            {allInstructions.map((instr: any) => (
                                <option key={instr.id} value={instr.id}>
                                    {instr.icon} {instr.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-600 mt-1">
                            Cette instruction s'affichera quand le joueur accède à cette timeline.
                        </p>
                    </div>



                    {/* ✅ AJOUTE JUSTE AVANT LES RÉCOMPENSES */}
                    <TimelineConditionEditor
                        slot={slot}
                        onUpdateSlot={onChange}
                        scenes={scenes}
                        chapters={chapters}
                        outroConfig={outroConfig}
                        wordSearches={wordSearches}
                        allEnigmas={enigmas}
                        lang={lang}
                        evidences={evidences}
                        sceneHotspots={scenes.flatMap((sc: any) => sc.hotspots || [])}
                    />


                    {/* Récompenses */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                                <Gift size={10} /> Récompenses si validé ({slot.rewards.length})
                            </label>
                            <button
                                onClick={addReward}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 border border-green-500/30 rounded text-[10px] font-bold hover:bg-green-600/40"
                            >
                                <Plus size={10} /> Ajouter
                            </button>
                        </div>

                        {slot.rewards.length === 0 && (
                            <p className="text-[10px] text-gray-600 italic">
                                Aucune récompense — la validation sera silencieuse
                            </p>
                        )}

                        {slot.rewards.map((reward, rIdx) => (
                            <RewardForm
                                key={reward.id}
                                reward={reward}
                                scenes={scenes}
                                chapters={chapters}
                                enigmas={enigmas}
                                evidences={evidences}
                                outroConfig={outroConfig}
                                onChange={updated => updateReward(rIdx, updated)}
                                onDelete={() => deleteReward(rIdx)}
                                isTranslating={isTranslating}
                                setIsTranslating={setIsTranslating}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── COMPOSANT PRINCIPAL ────────────────────────────────────
export default function TimelineAdmin({
    chapterId,
    evidences,
    scenes,
    chapters,
    enigmas,
    outroConfig,
    wordSearches = [],
    lang = "fr",
    showMsg,
    investigationId
}: Props) {
    const [timeline, setTimeline] = useState<Timeline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);



    const [allInstructions, setAllInstructions] = useState<any[]>([]);

    // ── Charger la timeline existante et les instructions ──
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data } = await supabase
                .from("investigation_timelines")
                .select("*")
                .eq("chapter_id", chapterId)
                .maybeSingle();

            if (data) {
                setTimeline(data);
            } else {
                setTimeline(null);
            }

            // Charger les instructions disponibles
            if (investigationId) {
                const { data: instrs } = await supabase
                    .from("investigation_instructions")
                    .select("*")
                    .eq("investigation_id", investigationId);
                setAllInstructions(instrs || []);
            }

            setIsLoading(false);
        };
        load();
    }, [chapterId, investigationId]);

    const createTimeline = () => {
        setTimeline({
            chapter_id: chapterId,
            title_fr: "Nouvelle Timeline",
            title_en: "New Timeline",
            slots: [],
        });
    };

    const addSlot = () => {
        if (!timeline) return;
        setTimeline({
            ...timeline,
            slots: [...timeline.slots, {
                id: uuidv4(),
                label_fr: "",
                label_en: "",
                hint_fr: "",
                hint_en: "",
                expected_evidence_id: "",
                rewards: [],
            }]
        });
    };

    const updateSlot = (idx: number, updated: TimelineSlot) => {
        if (!timeline) return;
        const slots = [...timeline.slots];
        slots[idx] = updated;
        setTimeline({ ...timeline, slots });
    };

    const deleteSlot = (idx: number) => {
        if (!timeline) return;
        setTimeline({ ...timeline, slots: timeline.slots.filter((_, i) => i !== idx) });
    };

    const translateTitle = async () => {
        if (!timeline?.title_fr.trim()) return;
        setIsTranslating(true);
        try {
            const translated = await autoTranslate(timeline.title_fr, "fr");
            setTimeline({ ...timeline, title_en: translated });
        } catch { }
        setIsTranslating(false);
    };

    const handleSave = async () => {
        if (!timeline) return;
        setIsSaving(true);
        try {
            if (timeline.id) {
                // Update
                const { error } = await supabase
                    .from("investigation_timelines")
                    .update({
                        title_fr: timeline.title_fr,
                        title_en: timeline.title_en,
                        slots: timeline.slots,
                    })
                    .eq("id", timeline.id);
                if (error) throw error;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from("investigation_timelines")
                    .insert({
                        chapter_id: chapterId,
                        title_fr: timeline.title_fr,
                        title_en: timeline.title_en,
                        slots: timeline.slots,
                    })
                    .select()
                    .single();
                if (error) throw error;
                setTimeline(data);
            }
            showMsg("success", "Timeline sauvegardée !");
        } catch (err: any) {
            showMsg("error", `Erreur: ${err.message}`);
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!timeline?.id) return;
        await supabase.from("investigation_timelines").delete().eq("id", timeline.id);
        setTimeline(null);
        showMsg("success", "Timeline supprimée.");
    };

    // ── RENDU ──────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-amber-500" size={24} />
        </div>
    );

    if (!timeline) return (
        <div className="text-center py-8 border border-dashed border-amber-500/20 rounded-xl">
            <Calendar size={32} className="mx-auto text-amber-500/50 mb-3" />
            <p className="text-gray-500 text-sm mb-4">Aucune timeline pour ce chapitre</p>
            <button
                onClick={createTimeline}
                className="px-4 py-2 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-bold hover:bg-amber-600/40 flex items-center gap-2 mx-auto"
            >
                <Plus size={14} /> Créer une Timeline
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">Timeline Chronologique</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        {timeline.slots.length} date(s)
                    </span>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Titre de la timeline */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Titre (FR)</label>
                    <input
                        type="text"
                        value={timeline.title_fr}
                        onChange={e => setTimeline({ ...timeline, title_fr: e.target.value })}
                        placeholder="Ex: Chronologie du Coup d'État"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Titre (EN)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={timeline.title_en}
                            onChange={e => setTimeline({ ...timeline, title_en: e.target.value })}
                            placeholder="Ex: Coup d'État Timeline"
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                        />
                        <button
                            onClick={translateTitle}
                            className="p-2 bg-white/5 rounded hover:bg-white/10"
                        >
                            {isTranslating
                                ? <Loader2 size={14} className="animate-spin text-red-500" />
                                : <Languages size={14} className="text-gray-400" />
                            }
                        </button>
                    </div>
                </div>
            </div>



            {/* Instruction de la timeline */}
            <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                    💡 Instruction à afficher quand le joueur ouvre cette timeline (optionnel)
                </label>
                <select
                    value={timeline.instruction_id || ""}
                    onChange={e => setTimeline({ ...timeline, instruction_id: e.target.value || undefined })}
                    className="w-full bg-[#1a1a1a] border border-blue-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                    <option value="">— Aucune instruction —</option>
                    {allInstructions.map((instr: any) => (
                        <option key={instr.id} value={instr.id}>
                            {instr.icon} {instr.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Slots */}
            <div className="space-y-3">
                {timeline.slots.map((slot, idx) => (
                    <TimelineSlotForm
                        key={slot.id}
                        slot={slot}
                        index={idx}
                        evidences={evidences}
                        scenes={scenes}
                        chapters={chapters}
                        enigmas={enigmas}
                        outroConfig={outroConfig}
                        allInstructions={allInstructions}
                        wordSearches={wordSearches}
                        lang={lang}
                        onChange={updated => updateSlot(idx, updated)}
                        onDelete={() => deleteSlot(idx)}
                        isTranslating={isTranslating}
                        setIsTranslating={setIsTranslating}
                    />
                ))}

                <button
                    onClick={addSlot}
                    className="w-full py-3 border border-dashed border-amber-500/30 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/10 flex items-center justify-center gap-2"
                >
                    <Plus size={14} /> Ajouter une Date
                </button>
            </div>

            {/* Sauvegarde */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Sauvegarder la Timeline
            </button>
        </div>
    );
}