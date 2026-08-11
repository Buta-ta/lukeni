// components/admin/DialogueEditor.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";
import { autoTranslate } from "@/lib/lingua";
import {
    Plus, Trash2, Save, Loader2, Languages, ChevronDown, ChevronUp,
    MessageSquare, User, Bot, ArrowRight, Lock, Gift, Zap, X, Music
} from "lucide-react";
import { Dialogue, DialogueNode, DialogueChoice } from "@/types/dialogue";

interface Props {
    investigationId: string;
    dialogueSpeakers: any[]; // Vient de investigation_dialogue_speakers
    evidences: any[];
    outroConfig: any;
    showMsg: (type: "success" | "error", text: string) => void;
}

export default function DialogueEditor({ investigationId, dialogueSpeakers, evidences, outroConfig, showMsg }: Props) {
    const [dialogues, setDialogues] = useState<Dialogue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeDialogueId, setActiveDialogueId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const activeDialogue = dialogues.find(d => d.id === activeDialogueId);

    useEffect(() => {
        fetchDialogues();
    }, [investigationId]);

    const fetchDialogues = async () => {
        setIsLoading(true);

        // 1. Charger les dialogues
        const { data: dialoguesData, error: dialoguesError } = await supabase
            .from("investigation_dialogues")
            .select("*")
            .eq("investigation_id", investigationId)
            .order("created_at", { ascending: true });

        if (dialoguesError) {
            console.error("❌ Erreur chargement dialogues:", dialoguesError);
            showMsg("error", "Erreur de chargement des dialogues");
            setIsLoading(false);
            return;
        }

        if (!dialoguesData || dialoguesData.length === 0) {
            setDialogues([]);
            setIsLoading(false);
            return;
        }

        // 2. Charger tous les nodes de ces dialogues
        const dialogueIds = dialoguesData.map(d => d.id);
        const { data: nodesData, error: nodesError } = await supabase
            .from("investigation_dialogue_nodes")
            .select("*")
            .in("dialogue_id", dialogueIds)
            .order("order_index", { ascending: true });

        if (nodesError) {
            console.error("❌ Erreur chargement nodes:", nodesError);
            setIsLoading(false);
            return;
        }

        // 3. Charger tous les choices de ces nodes
        const nodeIds = (nodesData || []).map(n => n.id);
        let choicesData: any[] = [];

        if (nodeIds.length > 0) {
            const { data: choices, error: choicesError } = await supabase
                .from("investigation_dialogue_choices")
                .select("*")
                .in("node_id", nodeIds)
                .order("order_index", { ascending: true });

            if (choicesError) {
                console.error("❌ Erreur chargement choices:", choicesError);
            } else {
                choicesData = choices || [];
            }
        }

        // 4. Assembler les données
        const assembledData = dialoguesData.map(dialogue => ({
            ...dialogue,
            nodes: (nodesData || [])
                .filter(n => n.dialogue_id === dialogue.id)
                .map(node => ({
                    ...node,
                    choices: choicesData.filter(c => c.node_id === node.id)
                }))
        }));

        setDialogues(assembledData);
        setIsLoading(false);
    };

    const createDialogue = async () => {
        const { data, error } = await supabase
            .from("investigation_dialogues")
            .insert({ investigation_id: investigationId, name: "Nouveau Dialogue" })
            .select()
            .single();

        if (error) {
            showMsg("error", "Erreur création dialogue");
        } else if (data) {
            setDialogues(prev => [...prev, { ...data, nodes: [] }]);
            setActiveDialogueId(data.id);
            showMsg("success", "Dialogue créé !");
        }
    };

    const deleteDialogue = async (id: string) => {
        if (!confirm("Supprimer ce dialogue et tous ses nœuds ?")) return;
        await supabase.from("investigation_dialogues").delete().eq("id", id);
        setDialogues(prev => prev.filter(d => d.id !== id));
        if (activeDialogueId === id) setActiveDialogueId(null);
        showMsg("success", "Dialogue supprimé");
    };

    const updateDialogueName = async (id: string, name: string) => {
        setDialogues(prev => prev.map(d => d.id === id ? { ...d, name } : d));
        await supabase.from("investigation_dialogues").update({ name }).eq("id", id);
    };

    // ── NODES ──
    const addNode = async (dialogueId: string) => {
        const dialogue = dialogues.find(d => d.id === dialogueId);
        const orderIndex = dialogue?.nodes?.length || 0;

        const { data, error } = await supabase
            .from("investigation_dialogue_nodes")
            .insert({
                dialogue_id: dialogueId,
                speaker_type: "npc",
                text_fr: "Bonjour...",
                order_index: orderIndex
            })
            .select()
            .single();

        if (error) {
            showMsg("error", "Erreur création nœud");
        } else if (data) {
            setDialogues(prev => prev.map(d =>
                d.id === dialogueId
                    ? { ...d, nodes: [...(d.nodes || []), { ...data, choices: [] }] }
                    : d
            ));
            setExpandedNodes(prev => ({ ...prev, [data.id]: true }));
        }
    };

    const uploadNodeAudio = (
        dialogueId: string,
        nodeId: string,
        language: "fr" | "en"
    ) => {
        const field: "audio_url_fr" | "audio_url_en" =
            language === "fr"
                ? "audio_url_fr"
                : "audio_url_en";

        const folder = `dialogue-audio/${language}`;

        const createWidget = () => {
            // @ts-ignore
            const widget = window.cloudinary.createUploadWidget(
                {
                    /*
                     * Ces deux valeurs viennent de Vercel
                     */
                    cloudName:
                        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,

                    apiKey:
                        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,

                    /*
                     * uploadSignature n'est PAS une variable Vercel.
                     * C'est une fonction appelée par Cloudinary.
                     */
                    uploadSignature: async (
                        callback: (signature: string) => void,
                        paramsToSign: Record<string, unknown>
                    ) => {
                        try {
                            const response = await fetch(
                                "/api/cloudinary-sign",
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        paramsToSign,
                                    }),
                                }
                            );

                            const result = await response.json();

                            if (!response.ok || !result.signature) {
                                console.error(
                                    "Erreur API /api/cloudinary-sign:",
                                    response.status,
                                    result
                                );

                                showMsg(
                                    "error",
                                    result.error ||
                                    "Erreur lors de la signature Cloudinary"
                                );

                                return;
                            }

                            /*
                             * Retourner la signature à Cloudinary
                             */
                            callback(result.signature);
                        } catch (error) {
                            console.error(
                                "Erreur réseau de signature Cloudinary:",
                                error
                            );

                            showMsg(
                                "error",
                                "Impossible de contacter le serveur Cloudinary"
                            );
                        }
                    },

                    sources: ["local", "url"],

                    /*
                     * Cloudinary utilise "video" pour les fichiers audio
                     */
                    resourceType: "video",

                    /*
                     * Ce dossier doit être présent dans
                     * app/api/cloudinary-sign/route.ts
                     */
                    folder,
                },

                (error: any, result: any) => {
                    if (error) {
                        console.error(
                            "Erreur upload audio dialogue:",
                            error
                        );

                        showMsg(
                            "error",
                            "Erreur lors de l'upload audio"
                        );

                        return;
                    }

                    if (result?.event === "success") {
                        const audioUrl = result.info.secure_url;

                        updateNodeLocal(dialogueId, nodeId, {
                            [field]: audioUrl,
                        });

                        showMsg(
                            "success",
                            language === "fr"
                                ? "Audio français uploadé"
                                : "English audio uploaded"
                        );
                    }
                }
            );

            widget.open();
        };

        // @ts-ignore
        if (!window.cloudinary) {
            const script = document.createElement("script");

            script.src =
                "https://upload-widget.cloudinary.com/global/all.js";

            script.onload = createWidget;
            document.body.appendChild(script);
        } else {
            createWidget();
        }
    };

    const updateNodeLocal = (dialogueId: string, nodeId: string, updates: Partial<DialogueNode>) => {
        setDialogues(prev => prev.map(d =>
            d.id === dialogueId
                ? { ...d, nodes: (d.nodes || []).map(n => n.id === nodeId ? { ...n, ...updates } : n) }
                : d
        ));
    };

    const saveNode = async (dialogueId: string, node: DialogueNode) => {
        setIsSaving(true);

        // 1. Sauvegarder le nœud
        const { error } = await supabase
            .from("investigation_dialogue_nodes")
            .update({
                speaker_type: node.speaker_type,
                speaker_npc_id: node.speaker_npc_id,
                text_fr: node.text_fr,
                text_en: node.text_en,
                is_entry_point: node.is_entry_point,
                auto_next_node_id: node.auto_next_node_id,
                audio_url: node.audio_url || null,

                // Nouveaux audios bilingues
                audio_url_fr: node.audio_url_fr || null,
                audio_url_en: node.audio_url_en || null,
            })
            .eq("id", node.id);

        if (error) {
            showMsg("error", "Erreur sauvegarde nœud");
            setIsSaving(false);
            return;
        }

        // 2. Sauvegarder TOUS les choix de ce nœud
        if (node.choices && node.choices.length > 0) {
            for (const choice of node.choices) {
                await supabase
                    .from("investigation_dialogue_choices")
                    .update({
                        text_fr: choice.text_fr,
                        text_en: choice.text_en,
                        next_node_id: choice.next_node_id,
                        required_evidence_id: choice.required_evidence_id,
                        unlocks_evidence_id: choice.unlocks_evidence_id,
                        trigger_event_id: choice.trigger_event_id,
                        disappears_after_use: choice.disappears_after_use,
                        required_flag: choice.required_flag || null,
                        set_flag: choice.set_flag || null
                    })
                    .eq("id", choice.id);
            }
        }

        // 3. Si c'est le point d'entrée, mettre à jour le dialogue parent
        if (node.is_entry_point) {
            await supabase.from("investigation_dialogues").update({ entry_node_id: node.id }).eq("id", dialogueId);
            setDialogues(prev => prev.map(d => d.id === dialogueId ? { ...d, entry_node_id: node.id } : d));
        }

        showMsg("success", "Nœud et choix sauvegardés !");
        setIsSaving(false);
    };
    const deleteNode = async (dialogueId: string, nodeId: string) => {
        if (!confirm("Supprimer ce nœud et ses choix ?")) return;
        await supabase.from("investigation_dialogue_nodes").delete().eq("id", nodeId);
        setDialogues(prev => prev.map(d =>
            d.id === dialogueId
                ? { ...d, nodes: (d.nodes || []).filter(n => n.id !== nodeId) }
                : d
        ));
    };

    // ── CHOICES ──
    const addChoice = async (dialogueId: string, nodeId: string) => {
        const dialogue = dialogues.find(d => d.id === dialogueId);
        const node = dialogue?.nodes?.find(n => n.id === nodeId);
        const orderIndex = node?.choices?.length || 0;

        const { data, error } = await supabase
            .from("investigation_dialogue_choices")
            .insert({
                node_id: nodeId,
                text_fr: "Nouveau choix",
                order_index: orderIndex
            })
            .select()
            .single();

        if (error) {
            showMsg("error", "Erreur création choix");
        } else if (data) {
            setDialogues(prev => prev.map(d =>
                d.id === dialogueId
                    ? { ...d, nodes: (d.nodes || []).map(n => n.id === nodeId ? { ...n, choices: [...(n.choices || []), data] } : n) }
                    : d
            ));
        }
    };

    const updateChoiceLocal = (dialogueId: string, nodeId: string, choiceId: string, updates: Partial<DialogueChoice>) => {
        setDialogues(prev => prev.map(d =>
            d.id === dialogueId
                ? { ...d, nodes: (d.nodes || []).map(n => n.id === nodeId ? { ...n, choices: (n.choices || []).map(c => c.id === choiceId ? { ...c, ...updates } : c) } : n) }
                : d
        ));
    };

    const saveChoice = async (dialogueId: string, nodeId: string, choice: DialogueChoice) => {
        setIsSaving(true);
        const { error } = await supabase
            .from("investigation_dialogue_choices")
            .update({
                text_fr: choice.text_fr,
                text_en: choice.text_en,
                next_node_id: choice.next_node_id,
                required_evidence_id: choice.required_evidence_id,
                unlocks_evidence_id: choice.unlocks_evidence_id,
                trigger_event_id: choice.trigger_event_id,
                disappears_after_use: choice.disappears_after_use
            })
            .eq("id", choice.id);

        if (error) showMsg("error", "Erreur sauvegarde choix");
        else showMsg("success", "Choix sauvegardé");
        setIsSaving(false);
    };

    const deleteChoice = async (dialogueId: string, nodeId: string, choiceId: string) => {
        await supabase.from("investigation_dialogue_choices").delete().eq("id", choiceId);
        setDialogues(prev => prev.map(d =>
            d.id === dialogueId
                ? { ...d, nodes: (d.nodes || []).map(n => n.id === nodeId ? { ...n, choices: (n.choices || []).filter(c => c.id !== choiceId) } : n) }
                : d
        ));
    };

    const toggleNode = (id: string) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));

    const handleTranslate = async (text: string, dialogueId: string, nodeId: string, choiceId: string | null, field: string) => {
        if (!text.trim()) return;
        const key = `${nodeId}_${choiceId || 'node'}_${field}`;
        setIsTranslating(key);
        try {
            const translated = await autoTranslate(text, "fr");
            if (choiceId) {
                updateChoiceLocal(dialogueId, nodeId, choiceId, { [field]: translated });
                // Save to DB immediately
                const dialogue = dialogues.find(d => d.id === dialogueId);
                const node = dialogue?.nodes?.find(n => n.id === nodeId);
                const choice = node?.choices?.find(c => c.id === choiceId);
                if (choice) await supabase.from("investigation_dialogue_choices").update({ [field]: translated }).eq("id", choiceId);
            } else {
                updateNodeLocal(dialogueId, nodeId, { [field]: translated });
                await supabase.from("investigation_dialogue_nodes").update({ [field]: translated }).eq("id", nodeId);
            }
        } catch { }
        setIsTranslating(null);
    };

    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-500" size={32} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-teal-500/20 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare size={18} className="text-teal-400" />
                    Arbres de Dialogue
                </h3>
                <button onClick={createDialogue} className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-500 font-bold">
                    <Plus size={14} /> Nouveau Dialogue
                </button>
            </div>

            {/* Liste des dialogues */}
            <div className="space-y-4">
                {dialogues.map(dialogue => (
                    <div key={dialogue.id} className="bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden">
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setActiveDialogueId(activeDialogueId === dialogue.id ? null : dialogue.id)}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-2xl">🌳</span>
                                <input
                                    type="text"
                                    value={dialogue.name}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateDialogueName(dialogue.id, e.target.value)}
                                    onBlur={() => supabase.from("investigation_dialogues").update({ name: dialogue.name }).eq("id", dialogue.id)}
                                    className="bg-transparent text-white font-bold text-sm outline-none focus:border-b focus:border-teal-500 flex-1"
                                />
                                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
                                    {(dialogue.nodes || []).length} nœuds
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); deleteDialogue(dialogue.id); }} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                                {activeDialogueId === dialogue.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </div>
                        </div>

                        {activeDialogueId === dialogue.id && (
                            <div className="p-4 sm:p-6 border-t border-white/5 space-y-6 bg-black/20">
                                <div className="flex justify-end">
                                    <button onClick={() => addNode(dialogue.id)} className="text-xs text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded font-bold hover:bg-teal-500/20 flex items-center gap-1">
                                        <Plus size={12} /> Ajouter un Nœud
                                    </button>
                                </div>

                                {/* NODES LIST */}
                                <div className="space-y-4">
                                    {(dialogue.nodes || []).map((node, nIdx) => {
                                        const isExpanded = expandedNodes[node.id] !== false;
                                        const speaker = node.speaker_type === 'npc'
                                            ? dialogueSpeakers.find(s => s.id === node.speaker_npc_id)
                                            : null;

                                        return (
                                            <div key={node.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
                                                <div
                                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
                                                    onClick={() => toggleNode(node.id)}
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${node.speaker_type === 'player' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                            {node.speaker_type === 'player' ? <User size={16} /> : <Bot size={16} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold uppercase text-gray-400">
                                                                    {node.speaker_type === 'player' ? 'JOUEUR' : (speaker ? (speaker.name_fr || 'PNJ') : 'PAS DE PNJ')}
                                                                </span>
                                                                {node.is_entry_point && <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">ENTRÉE</span>}
                                                            </div>
                                                            <p className="text-xs text-gray-300 truncate">{node.text_fr || "..."}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); deleteNode(dialogue.id, node.id); }} className="text-gray-600 hover:text-red-500"><Trash2 size={14} /></button>
                                                        {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-4 border-t border-white/5 space-y-4 bg-black/40">
                                                        {/* Config Speaker */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Qui parle ?</label>
                                                                <select
                                                                    value={node.speaker_type}
                                                                    onChange={e => { updateNodeLocal(dialogue.id, node.id, { speaker_type: e.target.value as any }); }}
                                                                    className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
                                                                >
                                                                    <option value="player">🧑‍💼 Le Joueur</option>
                                                                    <option value="npc">🎭 Un PNJ</option>
                                                                </select>
                                                            </div>

                                                            {node.speaker_type === 'npc' && (
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Quel PNJ ?</label>
                                                                    <select
                                                                        value={node.speaker_npc_id || ''}
                                                                        onChange={e => { updateNodeLocal(dialogue.id, node.id, { speaker_npc_id: e.target.value || null }); }}
                                                                        className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
                                                                    >
                                                                        <option value="">-- Sélectionner --</option>
                                                                        {dialogueSpeakers.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name_fr} ({s.role_fr})</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Text FR/EN */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texte (FR)</label>
                                                                <textarea
                                                                    rows={3} value={node.text_fr}
                                                                    onChange={e => updateNodeLocal(dialogue.id, node.id, { text_fr: e.target.value })}
                                                                    placeholder="Réplique du personnage..."
                                                                    className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-teal-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texte (EN)</label>
                                                                <div className="flex gap-2">
                                                                    <textarea
                                                                        rows={3} value={node.text_en || ''}
                                                                        onChange={e => updateNodeLocal(dialogue.id, node.id, { text_en: e.target.value })}
                                                                        placeholder="Character line..."
                                                                        className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-teal-500"
                                                                    />
                                                                    <button onClick={() => handleTranslate(node.text_fr, dialogue.id, node.id, null, 'text_en')} className="p-2 bg-white/5 rounded hover:bg-white/10 h-fit flex-shrink-0 mt-1">
                                                                        {isTranslating === `${node.id}_node_text_en` ? <Loader2 size={14} className="animate-spin text-teal-500" /> : <Languages size={14} className="text-gray-400" />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>


                                                        {/* 🔊 Audios bilingues de la réplique */}
                                                        {node.speaker_type === "npc" && (
                                                            <div className="border-t border-white/10 pt-4 space-y-4">
                                                                <label className="text-[10px] text-gray-500 font-bold uppercase block">
                                                                    🔊 Audios de la réplique
                                                                </label>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {/* AUDIO FRANÇAIS */}
                                                                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                                                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-2 block">
                                                                            🇫🇷 Français
                                                                        </label>

                                                                        {node.audio_url_fr || node.audio_url ? (
                                                                            <div className="space-y-2">
                                                                                <audio
                                                                                    src={node.audio_url_fr || node.audio_url || undefined}
                                                                                    controls
                                                                                    className="w-full h-8"
                                                                                />

                                                                                <button
                                                                                    onClick={() =>
                                                                                        updateNodeLocal(dialogue.id, node.id, {
                                                                                            audio_url_fr: null,
                                                                                            audio_url: null,
                                                                                        })
                                                                                    }
                                                                                    className="w-full text-[10px] text-red-400 hover:text-red-300"
                                                                                >
                                                                                    Supprimer l'audio français
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() =>
                                                                                    uploadNodeAudio(dialogue.id, node.id, "fr")
                                                                                }
                                                                                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400 flex items-center justify-center gap-2"
                                                                            >
                                                                                <Music size={14} />
                                                                                Uploader l'audio FR
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* AUDIO ANGLAIS */}
                                                                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                                                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-2 block">
                                                                            🇬🇧 English
                                                                        </label>

                                                                        {node.audio_url_en ? (
                                                                            <div className="space-y-2">
                                                                                <audio
                                                                                    src={node.audio_url_en}
                                                                                    controls
                                                                                    className="w-full h-8"
                                                                                />

                                                                                <button
                                                                                    onClick={() =>
                                                                                        updateNodeLocal(dialogue.id, node.id, {
                                                                                            audio_url_en: null,
                                                                                        })
                                                                                    }
                                                                                    className="w-full text-[10px] text-red-400 hover:text-red-300"
                                                                                >
                                                                                    Delete English audio
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() =>
                                                                                    uploadNodeAudio(dialogue.id, node.id, "en")
                                                                                }
                                                                                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400 flex items-center justify-center gap-2"
                                                                            >
                                                                                <Music size={14} />
                                                                                Upload English audio
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <p className="text-[9px] text-gray-600 italic">
                                                                    L'audio correspondant à la langue active du jeu sera joué automatiquement.
                                                                    Si l'audio anglais est absent, l'audio français sera utilisé.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Settings */}
                                                        <div className="flex gap-4 items-center border-t border-white/10 pt-4 flex-wrap">
                                                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={node.is_entry_point}
                                                                    onChange={e => updateNodeLocal(dialogue.id, node.id, { is_entry_point: e.target.checked })}
                                                                    className="accent-teal-500 w-4 h-4"
                                                                />
                                                                <span className="text-gray-300 font-bold">Point d'entrée</span>
                                                                <span className="text-gray-600">(Qui commence ?)</span>
                                                            </label>

                                                            {node.speaker_type === 'npc' && (
                                                                <div className="flex-1 min-w-[200px]">
                                                                    <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1">
                                                                        <ArrowRight size={10} /> Auto-Suivant (si pas de choix)
                                                                    </label>
                                                                    <select
                                                                        value={node.auto_next_node_id || ''}
                                                                        onChange={e => updateNodeLocal(dialogue.id, node.id, { auto_next_node_id: e.target.value || null })}
                                                                        className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                                                    >
                                                                        <option value="">-- Fin du dialogue --</option>
                                                                        {(dialogue.nodes || []).filter(n => n.id !== node.id).map(n => (
                                                                            <option key={n.id} value={n.id}>Nœud: {n.text_fr.substring(0, 30)}...</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* CHOICES (Only for Player nodes) */}
                                                        {node.speaker_type === 'player' && (
                                                            <div className="mt-4 space-y-3 bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Choix du Joueur</h5>
                                                                    <button onClick={() => addChoice(dialogue.id, node.id)} className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded font-bold hover:bg-blue-500/20 flex items-center gap-1">
                                                                        <Plus size={10} /> Ajouter un choix
                                                                    </button>
                                                                </div>

                                                                {(node.choices || []).map((choice, cIdx) => (
                                                                    <div key={choice.id} className="bg-black/40 p-3 rounded border border-white/10 space-y-3 relative">
                                                                        <button onClick={() => deleteChoice(dialogue.id, node.id, choice.id)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500"><X size={12} /></button>

                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <input type="text" value={choice.text_fr} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { text_fr: e.target.value })} placeholder="Choix FR" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500" />
                                                                            <div className="flex gap-1">
                                                                                <input type="text" value={choice.text_en || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { text_en: e.target.value })} placeholder="Choice EN" className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none" />
                                                                                <button onClick={() => handleTranslate(choice.text_fr, dialogue.id, node.id, choice.id, 'text_en')} className="p-1.5 bg-white/5 rounded hover:bg-white/10">
                                                                                    {isTranslating === `${node.id}_${choice.id}_text_en` ? <Loader2 size={10} className="animate-spin text-blue-500" /> : <Languages size={10} className="text-gray-400" />}
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            <div>
                                                                                <label className="text-[8px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1"><ArrowRight size={8} /> Mène à</label>
                                                                                <select value={choice.next_node_id || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { next_node_id: e.target.value || null })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none">
                                                                                    <option value="">-- Fin --</option>
                                                                                    {(dialogue.nodes || []).map(n => <option key={n.id} value={n.id}>{n.text_fr.substring(0, 25)}...</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1"><Lock size={8} /> Condition</label>
                                                                                <select value={choice.required_evidence_id || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { required_evidence_id: e.target.value || null })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none">
                                                                                    <option value="">-- Aucune --</option>
                                                                                    {evidences.map(ev => <option key={ev.id} value={ev.id}>{ev.name_fr}</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1"><Gift size={8} /> Débloque</label>
                                                                                <select value={choice.unlocks_evidence_id || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { unlocks_evidence_id: e.target.value || null })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none">
                                                                                    <option value="">-- Aucune --</option>
                                                                                    {evidences.map(ev => <option key={ev.id} value={ev.id}>{ev.name_fr}</option>)}
                                                                                </select>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-4 border-t border-white/10 pt-2">
                                                                            <div className="flex-1">
                                                                                <label className="text-[8px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1"><Zap size={8} /> Événement</label>
                                                                                <select value={choice.trigger_event_id || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { trigger_event_id: e.target.value || null })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none">
                                                                                    <option value="">-- Aucun --</option>
                                                                                    {(outroConfig?.narrative_events || []).map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer mt-2">
                                                                                <input type="checkbox" checked={choice.disappears_after_use} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { disappears_after_use: e.target.checked })} className="accent-blue-500" />
                                                                                Disparaît après utilisation
                                                                            </label>
                                                                        </div>





                                                                        <div className="flex gap-2 border-t border-white/10 pt-2">
                                                                            <div className="flex-1">
                                                                                <label className="text-[8px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1">🧠 Requiert un flag</label>
                                                                                <input type="text" value={choice.required_flag || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { required_flag: e.target.value || null })} placeholder="ex: caught_lying" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none font-mono" />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <label className="text-[8px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-1">🏷️ Ajoute un flag</label>
                                                                                <input type="text" value={choice.set_flag || ''} onChange={e => updateChoiceLocal(dialogue.id, node.id, choice.id, { set_flag: e.target.value || null })} placeholder="ex: told_truth" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none font-mono" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="flex justify-end pt-2">
                                                            <button onClick={() => saveNode(dialogue.id, node)} disabled={isSaving} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                                                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Sauvegarder Nœud
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}