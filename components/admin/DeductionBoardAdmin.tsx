// components/admin/DeductionBoardAdmin.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import {
    Plus, Trash2, Save, Loader2, Languages,
    Network, Gift, AlertCircle, Link, X
} from "lucide-react";

// ── TYPES ──────────────────────────────────────────────────
interface Reward {
    id: string;
    type: "scene" | "hotspot" | "enigma" | "evidence" | "clue" | "chapter" | "narrative_event" | "ending";
    target_id: string;
    notif_fr: string;
    notif_en: string;
}

interface BoardNode {
    id: string;
    label_fr: string;
    label_en: string;
    type: "person" | "place" | "org" | "event" | "document";
    image_url?: string;
    filter_type: "none" | "sepia" | "grayscale";
    pos_x: number; // 0-100 (% du canvas)
    pos_y: number; // 0-100 (% du canvas)
}

interface BoardConnection {
    id: string;
    node_a_id: string;
    node_b_id: string;
    expected_evidence_id: string;
    rewards: Reward[];
}

interface DeductionBoard {
    id?: string;
    chapter_id: string;
    title_fr: string;
    title_en: string;
    nodes: BoardNode[];
    connections: BoardConnection[];
    instruction_id?: string;
}

interface Props {
  chapterId: string;
  evidences: any[];
  scenes: any[];
  chapters: any[];
  enigmas: any[];
  outroConfig: any;
  showMsg: (type: "success" | "error", text: string) => void;
  investigationId?: string;
}

// ── CONFIG ─────────────────────────────────────────────────
const NODE_TYPES = [
    { value: "person", label: "👤 Personne", color: "#14b8a6" },
    { value: "place", label: "📍 Lieu", color: "#8b5cf6" },
    { value: "org", label: "🏛️ Organisation", color: "#f59e0b" },
    { value: "event", label: "📅 Événement", color: "#ef4444" },
    { value: "document", label: "📄 Document", color: "#06b6d4" },
];

const REWARD_TYPES = [
    { value: "scene", label: "🗺️ Scène panoramique" },
    { value: "hotspot", label: "📍 Hotspot" },
    { value: "enigma", label: "🧩 Énigme" },
    { value: "evidence", label: "📄 Preuve directe" },
    { value: "clue", label: "💡 Indice d'énigme" },
    { value: "chapter", label: "📖 Chapitre" },
    { value: "narrative_event", label: "🎬 Événement narratif" },
    { value: "ending", label: "🏁 Fin alternative" },
];

// ── REWARD FORM ────────────────────────────────────────────
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
    const handleTranslate = async () => {
        if (!reward.notif_fr.trim()) return;
        setIsTranslating(true);
        try {
            const t = await autoTranslate(reward.notif_fr, "fr");
            onChange({ ...reward, notif_en: t });
        } catch { }
        setIsTranslating(false);
    };

    // Tous les hotspots de toutes les scènes
    const allHotspots = scenes.flatMap((sc: any) =>
        (sc.hotspots || []).map((h: any) => ({
            ...h,
            sceneName: sc.title_fr || "Scène"
        }))
    );

    const renderTarget = () => {
        switch (reward.type) {
            case "scene":
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— Choisir une scène —</option>
                        {scenes.map((sc: any, i: number) => (
                            <option key={sc.id} value={sc.id}>Scène {i + 1} — {sc.title_fr}</option>
                        ))}
                    </select>
                );
            case "hotspot":
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
            case "enigma":
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— Choisir une énigme —</option>
                        {enigmas.map((en: any) => (
                            <option key={en.id} value={en.id}>{en.question_fr || "Sans titre"}</option>
                        ))}
                    </select>
                );
            case "evidence":
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
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
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— Choisir un indice —</option>
                        {enigmas.flatMap((en: any) =>
                            (en.clues || []).map((cl: any, i: number) => (
                                <option key={cl.id} value={cl.id}>
                                    [{en.question_fr?.slice(0, 20)}...] Indice {i + 1}
                                </option>
                            ))
                        )}
                    </select>
                );
            case "chapter":
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
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
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500">
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
            case "ending":
                return (
                    <select value={reward.target_id}
                        onChange={e => onChange({ ...reward, target_id: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">— Type de fin —</option>
                        <option value="victory">✅ Victoire</option>
                        <option value="abandon">🚪 Abandon</option>
                        <option value="alternate">❓ Fin alternative</option>
                    </select>
                );
            default: return null;
        }
    };

    return (
        <div className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-2">
            <div className="flex items-center gap-2">
                <select value={reward.type}
                    onChange={e => onChange({ ...reward, type: e.target.value as Reward["type"], target_id: "" })}
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                    {REWARD_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
                <button onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded">
                    <Trash2 size={12} />
                </button>
            </div>
            <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Cible</label>
                {renderTarget()}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Notif (FR)</label>
                    <input type="text" value={reward.notif_fr}
                        onChange={e => onChange({ ...reward, notif_fr: e.target.value })}
                        placeholder="Ex: Le lien est établi..."
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Notif (EN)</label>
                    <div className="flex gap-1">
                        <input type="text" value={reward.notif_en}
                            onChange={e => onChange({ ...reward, notif_en: e.target.value })}
                            placeholder="Ex: The link is established..."
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none" />
                        <button onClick={handleTranslate} className="p-1.5 bg-white/5 rounded hover:bg-white/10">
                            {isTranslating
                                ? <Loader2 size={10} className="animate-spin text-red-500" />
                                : <Languages size={10} className="text-gray-400" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── CANVAS VISUEL ──────────────────────────────────────────
function BoardCanvas({
    nodes,
    connections,
    onNodeMove,
}: {
    nodes: BoardNode[];
    connections: BoardConnection[];
    onNodeMove: (id: string, x: number, y: number) => void;
}) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef<{
        id: string;
        startMouseX: number;
        startMouseY: number;
        startNodeX: number;
        startNodeY: number;
    } | null>(null);

    const handleMouseDown = (e: React.MouseEvent, node: BoardNode) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = {
            id: node.id,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startNodeX: node.pos_x,
            startNodeY: node.pos_y,
        };

        const handleMouseMove = (me: MouseEvent) => {
            if (!draggingRef.current || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const dx = ((me.clientX - draggingRef.current.startMouseX) / rect.width) * 100;
            const dy = ((me.clientY - draggingRef.current.startMouseY) / rect.height) * 100;
            const newX = Math.max(0, Math.min(75, draggingRef.current.startNodeX + dx));
            const newY = Math.max(0, Math.min(70, draggingRef.current.startNodeY + dy));
            onNodeMove(draggingRef.current.id, newX, newY);
        };

        const handleMouseUp = () => {
            draggingRef.current = null;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Calcule les coordonnées pixel depuis les % pour le SVG
    const getPixelPos = (node: BoardNode, canvasW: number, canvasH: number) => ({
        x: (node.pos_x / 100) * canvasW + 40,
        y: (node.pos_y / 100) * canvasH + 40,
    });

    return (
        <div
            ref={canvasRef}
            className="relative w-full bg-[#080808] border border-white/10 rounded-xl overflow-hidden select-none"
            style={{
                height: "420px",
                backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px"
            }}
        >
            {/* SVG connexions */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                    <marker id="admin-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#D4AF37" opacity="0.7" />
                    </marker>
                </defs>
                {connections.map(conn => {
                    const nodeA = nodes.find(n => n.id === conn.node_a_id);
                    const nodeB = nodes.find(n => n.id === conn.node_b_id);
                    if (!nodeA || !nodeB) return null;

                    // On utilise des % directement via SVG viewBox-like
                    // On calcule les positions en px en supposant 100% = taille du SVG
                    const x1pct = nodeA.pos_x + 5; // centre approximatif
                    const y1pct = nodeA.pos_y + 10;
                    const x2pct = nodeB.pos_x + 5;
                    const y2pct = nodeB.pos_y + 10;

                    const hasEvidence = !!conn.expected_evidence_id;

                    return (
                        <line
                            key={conn.id}
                            x1={`${x1pct}%`} y1={`${y1pct}%`}
                            x2={`${x2pct}%`} y2={`${y2pct}%`}
                            stroke={hasEvidence ? "#D4AF37" : "#4b5563"}
                            strokeWidth="2"
                            strokeDasharray="6,3"
                            markerEnd="url(#admin-arrow)"
                            opacity="0.8"
                        />
                    );
                })}
            </svg>

            {/* Nœuds */}
            {nodes.map(node => {
                const typeCfg = NODE_TYPES.find(t => t.value === node.type);
                return (
                    <div
                        key={node.id}
                        className="absolute z-10 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
                        style={{ left: `${node.pos_x}%`, top: `${node.pos_y}%` }}
                        onMouseDown={e => handleMouseDown(e, node)}
                    >
                        {/* Épingle */}
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: typeCfg?.color || "#fff" }} />
                        {/* Image/icône */}
                        <div
                            className="w-12 h-12 rounded-lg border-2 overflow-hidden flex items-center justify-center shadow-xl"
                            style={{
                                borderColor: typeCfg?.color || "#fff",
                                backgroundColor: (typeCfg?.color || "#fff") + "22",
                                filter: node.filter_type === "sepia" ? "sepia(80%)" : node.filter_type === "grayscale" ? "grayscale(100%)" : "none"
                            }}
                        >
                            {node.image_url
                                ? <img src={node.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                                : <span className="text-xl pointer-events-none">
                                    {node.type === "person" ? "👤" : node.type === "place" ? "📍" : node.type === "org" ? "🏛️" : node.type === "event" ? "📅" : "📄"}
                                </span>
                            }
                        </div>
                        {/* Label complet */}
                        <div
                            className="px-2 py-1 rounded text-[9px] font-bold text-white text-center leading-tight shadow pointer-events-none"
                            style={{
                                backgroundColor: (typeCfg?.color || "#333") + "cc",
                                maxWidth: "90px",
                                wordBreak: "break-word",
                                whiteSpace: "normal",
                            }}
                        >
                            {node.label_fr || "?"}
                        </div>
                    </div>
                );
            })}

            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs font-mono pointer-events-none">
                    Ajoutez des nœuds dans l'onglet "Nœuds" puis revenez ici pour les positionner
                </div>
            )}
        </div>
    );
}

// ── COMPOSANT PRINCIPAL ────────────────────────────────────
export default function DeductionBoardAdmin({
  chapterId, evidences, scenes, chapters, enigmas, outroConfig, showMsg, investigationId
}: Props) {
    const [board, setBoard] = useState<DeductionBoard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<"canvas" | "nodes" | "connections">("canvas");

      const [allInstructions, setAllInstructions] = useState<any[]>([]);

  // ── Charger le board et les instructions ──
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("investigation_deduction_boards")
        .select("*")
        .eq("chapter_id", chapterId)
        .maybeSingle();
      setBoard(data || null);

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

    const createBoard = () => setBoard({
        chapter_id: chapterId,
        title_fr: "Nouveau Tableau",
        title_en: "New Board",
        nodes: [],
        connections: [],
    });

    // ── Nœuds ──
    // Positions prédéfinies en grille pour les nouveaux nœuds
    const GRID_POSITIONS = [
        { x: 10, y: 10 }, { x: 55, y: 10 },
        { x: 10, y: 55 }, { x: 55, y: 55 },
        { x: 32, y: 32 }, { x: 78, y: 32 },
        { x: 32, y: 78 }, { x: 78, y: 78 },
    ];

    const addNode = () => {
        if (!board) return;
        const idx = board.nodes.length % GRID_POSITIONS.length;
        const pos = GRID_POSITIONS[idx];
        setBoard({
            ...board,
            nodes: [...board.nodes, {
                id: uuidv4(),
                label_fr: "", label_en: "",
                type: "person",
                filter_type: "none",
                pos_x: pos.x,
                pos_y: pos.y,
            }]
        });
    };

    const updateNode = (id: string, updated: BoardNode) => {
        if (!board) return;
        setBoard({ ...board, nodes: board.nodes.map(n => n.id === id ? updated : n) });
    };

    const moveNode = (id: string, x: number, y: number) => {
        if (!board) return;
        setBoard({ ...board, nodes: board.nodes.map(n => n.id === id ? { ...n, pos_x: x, pos_y: y } : n) });
    };

    const deleteNode = (id: string) => {
        if (!board) return;
        setBoard({
            ...board,
            nodes: board.nodes.filter(n => n.id !== id),
            connections: board.connections.filter(c => c.node_a_id !== id && c.node_b_id !== id),
        });
    };

    // ── Connexions ──
    const addConnection = () => {
        if (!board || board.nodes.length < 2) {
            showMsg("error", "Vous devez avoir au moins 2 nœuds pour créer une connexion.");
            return;
        }
        const newConn: BoardConnection = {
            id: uuidv4(),
            node_a_id: board.nodes[0].id,
            node_b_id: board.nodes[1].id,
            expected_evidence_id: "",
            rewards: [],
        };
        setBoard({ ...board, connections: [...board.connections, newConn] });
    };

    const updateConnection = (id: string, updated: BoardConnection) => {
        if (!board) return;
        setBoard({ ...board, connections: board.connections.map(c => c.id === id ? updated : c) });
    };

    const deleteConnection = (id: string) => {
        if (!board) return;
        setBoard({ ...board, connections: board.connections.filter(c => c.id !== id) });
    };

    // ── Upload image nœud ──
    const uploadNodeImage = (nodeId: string) => {
        setIsUploading(true);
        const run = () => {
            // @ts-ignore
            window.cloudinary.createUploadWidget({
                cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                sources: ["local", "url"],
                resourceType: "image",
                folder: "lukeni/board-nodes",
            }, (error: any, result: any) => {
                setIsUploading(false);
                if (result?.event === "success") {
                    const node = board?.nodes.find(n => n.id === nodeId);
                    if (node) updateNode(nodeId, { ...node, image_url: result.info.secure_url });
                }
            }).open();
        };
        // @ts-ignore
        if (!window.cloudinary) {
            const s = document.createElement("script");
            s.src = "https://upload-widget.cloudinary.com/global/all.js";
            s.onload = run;
            document.body.appendChild(s);
        } else { run(); }
    };

    // ── Traduction titre ──
    const translateTitle = async () => {
        if (!board?.title_fr.trim()) return;
        setIsTranslating(true);
        try {
            const t = await autoTranslate(board.title_fr, "fr");
            setBoard({ ...board, title_en: t });
        } catch { }
        setIsTranslating(false);
    };

    // ── Sauvegarde ──
    const handleSave = async () => {
        if (!board) return;
        setIsSaving(true);
        try {
            const payload = {
                title_fr: board.title_fr,
                title_en: board.title_en,
                nodes: board.nodes,
                connections: board.connections,
                instruction_id: board.instruction_id || null,
            };
            if (board.id) {
                const { error } = await supabase
                    .from("investigation_deduction_boards")
                    .update(payload).eq("id", board.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from("investigation_deduction_boards")
                    .insert({ chapter_id: chapterId, ...payload })
                    .select().single();
                if (error) throw error;
                setBoard(data);
            }
            showMsg("success", "Tableau sauvegardé !");
        } catch (err: any) {
            showMsg("error", `Erreur: ${err.message}`);
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!board?.id) return;
        await supabase.from("investigation_deduction_boards").delete().eq("id", board.id);
        setBoard(null);
        showMsg("success", "Tableau supprimé.");
    };

    // ── RENDU ──────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-purple-500" size={24} />
        </div>
    );

    if (!board) return (
        <div className="text-center py-8 border border-dashed border-purple-500/20 rounded-xl">
            <Network size={32} className="mx-auto text-purple-500/50 mb-3" />
            <p className="text-gray-500 text-sm mb-4">Aucun tableau de connexions</p>
            <button onClick={createBoard}
                className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-bold hover:bg-purple-600/40 flex items-center gap-2 mx-auto">
                <Plus size={14} /> Créer un Tableau
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Network size={16} className="text-purple-400" />
                    <span className="text-sm font-bold text-purple-400">Tableau de Connexions</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                        {board.nodes.length} nœud(s) • {board.connections.length} lien(s)
                    </span>
                </div>
                <button onClick={handleDelete} className="p-1.5 text-gray-600 hover:text-red-500">
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Titre */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Titre (FR)</label>
                    <input type="text" value={board.title_fr}
                        onChange={e => setBoard({ ...board, title_fr: e.target.value })}
                        placeholder="Ex: Réseau de la trahison"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Titre (EN)</label>
                    <div className="flex gap-2">
                        <input type="text" value={board.title_en}
                            onChange={e => setBoard({ ...board, title_en: e.target.value })}
                            placeholder="Ex: Network of betrayal"
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none" />
                        <button onClick={translateTitle} className="p-2 bg-white/5 rounded hover:bg-white/10">
                            {isTranslating
                                ? <Loader2 size={14} className="animate-spin text-red-500" />
                                : <Languages size={14} className="text-gray-400" />}
                        </button>
                    </div>
                </div>
            </div>



                  {/* Instruction du board */}
      <div>
        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
          💡 Instruction à afficher quand le joueur ouvre ce tableau (optionnel)
        </label>
        <select
          value={board.instruction_id || ""}
          onChange={e => setBoard({ ...board, instruction_id: e.target.value || undefined })}
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

            {/* Onglets */}
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                {[
                    { id: "canvas", label: `🗺️ Canvas` },
                    { id: "nodes", label: `👤 Nœuds (${board.nodes.length})` },
                    { id: "connections", label: `🔗 Liens (${board.connections.length})` },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${activeTab === tab.id
                            ? "bg-purple-600/30 text-purple-300"
                            : "text-gray-500 hover:text-white"}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── CANVAS ── */}
            {activeTab === "canvas" && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-500">
                            Glissez les nœuds pour les positionner. Les connexions apparaissent en pointillés.
                        </p>
                        <button
                            onClick={() => {
                                if (!board) return;
                                const recentered = board.nodes.map((node, idx) => {
                                    const pos = GRID_POSITIONS[idx % GRID_POSITIONS.length];
                                    return { ...node, pos_x: pos.x, pos_y: pos.y };
                                });
                                setBoard({ ...board, nodes: recentered });
                            }}
                            className="flex-shrink-0 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            🔄 Recentrer
                        </button>
                    </div>
                    <BoardCanvas
                        nodes={board.nodes}
                        connections={board.connections}
                        onNodeMove={moveNode}
                    />
                </div>
            )}

            {/* ── NŒUDS ── */}
            {activeTab === "nodes" && (
                <div className="space-y-3">
                    <button onClick={addNode}
                        className="w-full py-2 border border-dashed border-purple-500/30 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/10 flex items-center justify-center gap-2">
                        <Plus size={12} /> Ajouter un nœud
                    </button>

                    {board.nodes.map(node => {
                        const typeCfg = NODE_TYPES.find(t => t.value === node.type);
                        return (
                            <div key={node.id}
                                className="p-3 rounded-lg border space-y-3"
                                style={{ borderColor: (typeCfg?.color || "#fff") + "33", backgroundColor: (typeCfg?.color || "#fff") + "0a" }}>

                                {/* Type + Supprimer */}
                                <div className="flex items-center gap-2">
                                    <select value={node.type}
                                        onChange={e => updateNode(node.id, { ...node, type: e.target.value as BoardNode["type"] })}
                                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                        {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <button onClick={() => deleteNode(node.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0">
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {/* Labels FR/EN avec traduction */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Nom (FR)</label>
                                        <input type="text" value={node.label_fr}
                                            onChange={e => updateNode(node.id, { ...node, label_fr: e.target.value })}
                                            placeholder="Ex: Mobutu"
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Name (EN)</label>
                                        <div className="flex gap-1">
                                            <input type="text" value={node.label_en}
                                                onChange={e => updateNode(node.id, { ...node, label_en: e.target.value })}
                                                placeholder="Ex: Mobutu"
                                                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none" />
                                            <button
                                                onClick={async () => {
                                                    if (!node.label_fr.trim()) return;
                                                    setIsTranslating(true);
                                                    try {
                                                        const t = await autoTranslate(node.label_fr, "fr");
                                                        updateNode(node.id, { ...node, label_en: t });
                                                    } catch { }
                                                    setIsTranslating(false);
                                                }}
                                                className="p-1.5 bg-white/5 rounded hover:bg-white/10 flex-shrink-0">
                                                {isTranslating
                                                    ? <Loader2 size={10} className="animate-spin text-red-500" />
                                                    : <Languages size={10} className="text-gray-400" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Image + Filtre */}
                                <div className="flex items-center gap-2">
                                    {node.image_url && (
                                        <img src={node.image_url} alt=""
                                            className="w-10 h-10 rounded object-cover border border-white/10 flex-shrink-0" />
                                    )}
                                    <button onClick={() => uploadNodeImage(node.id)} disabled={isUploading}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                                        {isUploading ? <Loader2 size={10} className="animate-spin" /> : "📷"} Photo
                                    </button>
                                    <select value={node.filter_type}
                                        onChange={e => updateNode(node.id, { ...node, filter_type: e.target.value as BoardNode["filter_type"] })}
                                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                        <option value="none">Normal</option>
                                        <option value="sepia">Sépia</option>
                                        <option value="grayscale">N&B</option>
                                    </select>
                                </div>
                            </div>
                        );
                    })}

                    {board.nodes.length === 0 && (
                        <p className="text-gray-600 text-xs text-center py-4">Aucun nœud créé</p>
                    )}
                </div>
            )}

            {/* ── CONNEXIONS ── */}
            {activeTab === "connections" && (
                <div className="space-y-3">
                    <button onClick={addConnection}
                        className="w-full py-2 border border-dashed border-purple-500/30 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/10 flex items-center justify-center gap-2">
                        <Link size={12} /> Ajouter une connexion
                    </button>

                    {board.connections.length === 0 && (
                        <p className="text-gray-600 text-xs text-center py-4">
                            Aucune connexion — ajoutez d'abord des nœuds dans l'onglet Nœuds
                        </p>
                    )}

                    {board.connections.map((conn, cIdx) => {
                        const nodeA = board.nodes.find(n => n.id === conn.node_a_id);
                        const nodeB = board.nodes.find(n => n.id === conn.node_b_id);
                        return (
                            <div key={conn.id}
                                className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-3">

                                {/* Header connexion */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white flex items-center gap-2">
                                        <Link size={12} className="text-[#D4AF37]" />
                                        Connexion {cIdx + 1} : {nodeA?.label_fr || "?"} → {nodeB?.label_fr || "?"}
                                    </span>
                                    <button onClick={() => deleteConnection(conn.id)}
                                        className="p-1 text-gray-600 hover:text-red-500">
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {/* Nœuds A et B */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">De (Nœud A)</label>
                                        <select value={conn.node_a_id}
                                            onChange={e => updateConnection(conn.id, { ...conn, node_a_id: e.target.value })}
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                            <option value="">— Choisir —</option>
                                            {board.nodes.map(n => (
                                                <option key={n.id} value={n.id}>{n.label_fr || "Sans nom"}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Vers (Nœud B)</label>
                                        <select value={conn.node_b_id}
                                            onChange={e => updateConnection(conn.id, { ...conn, node_b_id: e.target.value })}
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                            <option value="">— Choisir —</option>
                                            {board.nodes.filter(n => n.id !== conn.node_a_id).map(n => (
                                                <option key={n.id} value={n.id}>{n.label_fr || "Sans nom"}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Preuve attendue */}
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                        🔍 Preuve qui valide cette connexion
                                    </label>
                                    <select value={conn.expected_evidence_id}
                                        onChange={e => updateConnection(conn.id, { ...conn, expected_evidence_id: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-amber-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500">
                                        <option value="">— Choisir la preuve attendue —</option>
                                        {evidences.map((ev: any) => (
                                            <option key={ev.id} value={ev.id}>
                                                {ev.media_type === "image" ? "🖼️" : ev.media_type === "audio" ? "🎵" : "📄"} {ev.name_fr || "Sans nom"}
                                            </option>
                                        ))}
                                    </select>
                                    {!conn.expected_evidence_id && (
                                        <p className="text-[10px] text-amber-500/70 mt-1 flex items-center gap-1">
                                            <AlertCircle size={10} /> Sans preuve, cette connexion ne peut pas être validée
                                        </p>
                                    )}
                                </div>

                                {/* Récompenses */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                                            <Gift size={10} /> Récompenses ({conn.rewards.length})
                                        </label>
                                        <button
                                            onClick={() => updateConnection(conn.id, {
                                                ...conn,
                                                rewards: [...conn.rewards, {
                                                    id: uuidv4(), type: "scene", target_id: "", notif_fr: "", notif_en: ""
                                                }]
                                            })}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 border border-green-500/30 rounded text-[10px] font-bold hover:bg-green-600/40">
                                            <Plus size={10} /> Ajouter
                                        </button>
                                    </div>
                                    {conn.rewards.map((reward, rIdx) => (
                                        <RewardForm
                                            key={reward.id}
                                            reward={reward}
                                            scenes={scenes}
                                            chapters={chapters}
                                            enigmas={enigmas}
                                            evidences={evidences}
                                            outroConfig={outroConfig}
                                            onChange={updated => {
                                                const rewards = [...conn.rewards];
                                                rewards[rIdx] = updated;
                                                updateConnection(conn.id, { ...conn, rewards });
                                            }}
                                            onDelete={() => updateConnection(conn.id, {
                                                ...conn,
                                                rewards: conn.rewards.filter((_, i) => i !== rIdx)
                                            })}
                                            isTranslating={isTranslating}
                                            setIsTranslating={setIsTranslating}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sauvegarde */}
            <button onClick={handleSave} disabled={isSaving}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Sauvegarder le Tableau
            </button>
        </div>
    );
}