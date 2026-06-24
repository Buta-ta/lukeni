// components/game/DeductionPanel.tsx
"use client";

import React, { useState, useRef, useCallback, useEffect  } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Brain,
    Calendar,
    Network,
    ChevronRight,
    CheckCircle,
    Lock,
    Lightbulb,
    AlertCircle,
} from "lucide-react";
import {
    Timeline,
    DeductionBoard,
    BoardNode,
    BoardConnection,
    TimelineSlot,
    DeductionNotification,
} from "@/lib/hooks/useDeduction";

// ── TYPES ──────────────────────────────────────────────────
interface Props {
    timeline: Timeline | null;
    board: DeductionBoard | null;
    availableEvidences: any[];
    validatedDeductions: string[];
    notifications: DeductionNotification[];
    lang: "fr" | "en";
    onClose: () => void;
    onValidateTimelineSlot: (
        slotId: string,
        evidenceId: string,
    ) => Promise<boolean>;
    onValidateBoardConnection: (
        connectionId: string,
        evidenceId: string,
    ) => Promise<boolean>;
    onDismissNotification: (id: string) => void;
    isTimelineSlotValidated: (slotId: string) => boolean;
    isBoardConnectionValidated: (connectionId: string) => boolean;
}

// ── DRAGGABLE EVIDENCE CARD ────────────────────────────────
function EvidenceCard({
    evidence,
    isDragging,
    onDragStart,
    onDragEnd,
    lang,
}: {
    evidence: any;
    isDragging: boolean;
    onDragStart: (evidenceId: string) => void;
    onDragEnd: () => void;
    lang: "fr" | "en";
}) {
    return (
        <motion.div
            draggable
            onDragStart={() => onDragStart(evidence.id)}
            onDragEnd={onDragEnd}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
        flex-shrink-0 w-20 cursor-grab active:cursor-grabbing
        bg-black/60 border rounded-xl overflow-hidden
        transition-all duration-200 select-none
        ${isDragging ? "border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.5)] opacity-50" : "border-white/20 hover:border-white/40"}
      `}
        >
            {/* Miniature */}
            <div className="w-full h-14 bg-black flex items-center justify-center overflow-hidden">
                {evidence.media_type === "image" ? (
                    <img
                        src={evidence.media_url}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                    />
                ) : (
                    <span className="text-2xl pointer-events-none">
                        {evidence.media_type === "audio" ? "🎵" : "📄"}
                    </span>
                )}
            </div>
            {/* Label */}
            <div className="px-1 py-1.5">
                <p className="text-[9px] text-gray-300 text-center truncate font-mono">
                    {lang === "fr"
                        ? evidence.name_fr
                        : evidence.name_en || evidence.name_fr}
                </p>
            </div>
        </motion.div>
    );
}

// ── DROP ZONE (slot timeline ou connexion board) ───────────
function DropZone({
    isValidated,
    isOver,
    children,
    onDragOver,
    onDragLeave,
    onDrop,
}: {
    isValidated: boolean;
    isOver: boolean;
    children: React.ReactNode;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
}) {
    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
        relative rounded-xl border-2 transition-all duration-200
        ${isValidated
                    ? "border-green-500/50 bg-green-900/20"
                    : isOver
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        : "border-white/10 border-dashed bg-white/[0.02] hover:border-white/20"
                }
      `}
        >
            {children}
        </div>
    );
}

// ── ONGLET TIMELINE ────────────────────────────────────────
function TimelineTab({
    timeline,
    availableEvidences,
    lang,
    onValidate,
    isSlotValidated,
}: {
    timeline: Timeline;
    availableEvidences: any[];
    lang: "fr" | "en";
    onValidate: (slotId: string, evidenceId: string) => Promise<boolean>;
    isSlotValidated: (slotId: string) => boolean;
}) {
    const [draggingEvidenceId, setDraggingEvidenceId] = useState<string | null>(
        null,
    );
    const [overSlotId, setOverSlotId] = useState<string | null>(null);
    const [shaking, setShaking] = useState<string | null>(null);

    const handleDrop = async (slotId: string) => {
        if (!draggingEvidenceId) return;
        setOverSlotId(null);

        const success = await onValidate(slotId, draggingEvidenceId);
        if (!success) {
            // Animation shake sur le slot
            setShaking(slotId);
            setTimeout(() => setShaking(null), 600);
        }
        setDraggingEvidenceId(null);
    };

    const title = lang === "fr" ? timeline.title_fr : timeline.title_en;

    return (
        <div className="space-y-5">
            {/* Titre */}
            <div className="text-center">
                <h3 className="text-sm font-bold text-amber-400 font-mono tracking-wider">
                    {title}
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">
                    {lang === "fr"
                        ? "Glissez une preuve sur la bonne date"
                        : "Drop evidence on the correct date"}
                </p>
            </div>

            {/* Preuves disponibles */}
            {availableEvidences.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        {lang === "fr" ? "Vos preuves" : "Your evidence"} (
                        {availableEvidences.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {availableEvidences.map((ev) => (
                            <EvidenceCard
                                key={ev.id}
                                evidence={ev}
                                isDragging={draggingEvidenceId === ev.id}
                                onDragStart={setDraggingEvidenceId}
                                onDragEnd={() => setDraggingEvidenceId(null)}
                                lang={lang}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 bg-black/20 rounded-xl border border-dashed border-white/10">
                    <Lock size={20} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-[10px] text-gray-600 font-mono">
                        {lang === "fr"
                            ? "Explorez la scène pour collecter des preuves"
                            : "Explore the scene to collect evidence"}
                    </p>
                </div>
            )}

            {/* Frise chronologique */}
            <div className="space-y-3">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                    {lang === "fr" ? "Dates à identifier" : "Dates to identify"}
                </p>

                {/* Ligne de frise */}
                <div className="relative">
                    {/* Ligne horizontale */}
                    <div className="absolute top-6 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20" />

                    {/* Slots */}
                    <div className="flex gap-3 overflow-x-auto pb-4 pt-2">
                        {timeline.slots.map((slot, idx) => {
                            const isValidated = isSlotValidated(slot.id);
                            const isOver = overSlotId === slot.id;
                            const isShaking = shaking === slot.id;
                            const label = lang === "fr" ? slot.label_fr : slot.label_en;
                            const hint = lang === "fr" ? slot.hint_fr : slot.hint_en;

                            return (
                                <motion.div
                                    key={slot.id}
                                    animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                    className="flex-shrink-0 w-36"
                                >
                                    {/* Point sur la frise */}
                                    <div className="flex justify-center mb-2">
                                        <div
                                            className={`w-3 h-3 rounded-full border-2 ${isValidated ? "bg-green-500 border-green-400" : "bg-[#0f0f0f] border-amber-500/50"}`}
                                        />
                                    </div>

                                    <DropZone
                                        isValidated={isValidated}
                                        isOver={isOver}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setOverSlotId(slot.id);
                                        }}
                                        onDragLeave={() => setOverSlotId(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            handleDrop(slot.id);
                                        }}
                                    >
                                        <div className="p-3 text-center space-y-2">
                                            {/* Numéro */}
                                            <div className="text-[10px] text-gray-600 font-mono">
                                                #{String(idx + 1).padStart(2, "0")}
                                            </div>

                                            {/* Label de la date */}
                                            <p className="text-xs font-bold text-amber-300 leading-tight">
                                                {label || "???"}
                                            </p>

                                            {/* État */}
                                            {isValidated ? (
                                                <div className="flex items-center justify-center gap-1 text-green-400">
                                                    <CheckCircle size={12} />
                                                    <span className="text-[9px] font-bold">
                                                        {lang === "fr" ? "Validé" : "Validated"}
                                                    </span>
                                                </div>
                                            ) : isOver ? (
                                                <div className="text-[9px] text-[#D4AF37] font-bold animate-pulse">
                                                    {lang === "fr" ? "Déposer ici" : "Drop here"}
                                                </div>
                                            ) : (
                                                <div className="text-[9px] text-gray-600">
                                                    {lang === "fr"
                                                        ? "Déposez une preuve"
                                                        : "Drop evidence"}
                                                </div>
                                            )}

                                            {/* Indice optionnel */}
                                            {hint && !isValidated && (
                                                <div className="flex items-center gap-1 text-[9px] text-blue-400/60 border-t border-white/5 pt-2 mt-1">
                                                    <Lightbulb size={8} />
                                                    <span className="line-clamp-2 text-left">{hint}</span>
                                                </div>
                                            )}
                                        </div>
                                    </DropZone>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Progression */}
            {timeline.slots.length > 0 &&
                (() => {
                    const validated = timeline.slots.filter((s) =>
                        isSlotValidated(s.id),
                    ).length;
                    const total = timeline.slots.length;
                    const pct = Math.round((validated / total) * 100);
                    return (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                <span>{lang === "fr" ? "Progression" : "Progress"}</span>
                                <span>
                                    {validated}/{total}
                                </span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                    );
                })()}
        </div>
    );
}

// ── ONGLET TABLEAU DE CONNEXIONS ───────────────────────────
function BoardTab({
    board,
    availableEvidences,
    lang,
    onValidate,
    isConnectionValidated,
}: {
    board: DeductionBoard;
    availableEvidences: any[];
    lang: "fr" | "en";
    onValidate: (connectionId: string, evidenceId: string) => Promise<boolean>;
    isConnectionValidated: (connectionId: string) => boolean;
}) {
    const [draggingEvidenceId, setDraggingEvidenceId] = useState<string | null>(
        null,
    );
    const [overConnectionId, setOverConnectionId] = useState<string | null>(null);
    const [shaking, setShaking] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);


    // ── Positions locales des nœuds (modifiables par le joueur) ──
    const [localNodePositions, setLocalNodePositions] = useState<Record<string, { x: number; y: number }>>({});

    // ✅ Reset des positions quand le board change
    useEffect(() => {
        if (!board?.nodes) {
            setLocalNodePositions({});
            return;
        }
        const initial: Record<string, { x: number; y: number }> = {};
        board.nodes.forEach(n => { initial[n.id] = { x: n.pos_x, y: n.pos_y }; });
        setLocalNodePositions(initial);
    }, [board?.nodes]);

    const draggingNodeRef = useRef<{
        id: string;
        startMouseX: number;
        startMouseY: number;
        startNodeX: number;
        startNodeY: number;
    } | null>(null);

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        // On ne déclenche pas le drag si c'est pour déposer une preuve
        if (draggingEvidenceId) return;
        e.preventDefault();
        e.stopPropagation();

        const pos = localNodePositions[nodeId] || { x: 0, y: 0 };
        draggingNodeRef.current = {
            id: nodeId,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startNodeX: pos.x,
            startNodeY: pos.y,
        };

        const handleMouseMove = (me: MouseEvent) => {
            if (!draggingNodeRef.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dx = ((me.clientX - draggingNodeRef.current.startMouseX) / rect.width) * 100;
            const dy = ((me.clientY - draggingNodeRef.current.startMouseY) / rect.height) * 100;
            const newX = Math.max(0, Math.min(75, draggingNodeRef.current.startNodeX + dx));
            const newY = Math.max(0, Math.min(70, draggingNodeRef.current.startNodeY + dy));

            // ✅ FIX : Stocker l'id dans une variable locale pour éviter le null
            const nodeId = draggingNodeRef.current.id;
            setLocalNodePositions(prev => ({
                ...prev,
                [nodeId]: { x: newX, y: newY }
            }));
        };

        const handleMouseUp = () => {
            draggingNodeRef.current = null;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };


    const handleDrop = async (connectionId: string) => {
        if (!draggingEvidenceId) return;
        setOverConnectionId(null);

        const success = await onValidate(connectionId, draggingEvidenceId);
        if (!success) {
            setShaking(connectionId);
            setTimeout(() => setShaking(null), 600);
        }
        setDraggingEvidenceId(null);
    };

    const title = lang === "fr" ? board.title_fr : board.title_en;

    // Calcule le centre d'une connexion pour positionner la drop zone
    const getConnectionMidpoint = (conn: BoardConnection) => {
        const posA = localNodePositions[conn.node_a_id];
        const posB = localNodePositions[conn.node_b_id];
        if (!posA || !posB) return { x: 0, y: 0 };
        return {
            x: (posA.x + posB.x) / 2,
            y: (posA.y + posB.y) / 2,
        };
    };

    return (
        <div className="space-y-5">
            {/* Titre */}
            <div className="text-center">
                <h3 className="text-sm font-bold text-purple-400 font-mono tracking-wider">
                    {title}
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">
                    {lang === "fr"
                        ? "Glissez une preuve sur le fil entre deux entités"
                        : "Drop evidence on the thread between two entities"}
                </p>
            </div>

            {/* Preuves disponibles */}
            {availableEvidences.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        {lang === "fr" ? "Vos preuves" : "Your evidence"} (
                        {availableEvidences.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {availableEvidences.map((ev) => (
                            <EvidenceCard
                                key={ev.id}
                                evidence={ev}
                                isDragging={draggingEvidenceId === ev.id}
                                onDragStart={setDraggingEvidenceId}
                                onDragEnd={() => setDraggingEvidenceId(null)}
                                lang={lang}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 bg-black/20 rounded-xl border border-dashed border-white/10">
                    <Lock size={20} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-[10px] text-gray-600 font-mono">
                        {lang === "fr"
                            ? "Explorez la scène pour collecter des preuves"
                            : "Explore the scene to collect evidence"}
                    </p>
                </div>
            )}

            {/* Canvas du tableau */}
            <div
                ref={containerRef}
                className="relative w-full bg-[#080808] border border-white/10 rounded-xl overflow-hidden"
                style={{
                    height: "380px",
                    backgroundImage:
                        "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            >
                {/* SVG des connexions */}
                <svg
                    ref={svgRef}
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                >
                    <defs>
                        <marker
                            id="arrow-validated"
                            markerWidth="8"
                            markerHeight="6"
                            refX="8"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill="#10b981" opacity="0.8" />
                        </marker>
                        <marker
                            id="arrow-pending"
                            markerWidth="8"
                            markerHeight="6"
                            refX="8"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill="#D4AF37" opacity="0.5" />
                        </marker>
                    </defs>

                    {board.connections.map(conn => {
                        const posA = localNodePositions[conn.node_a_id];
                        const posB = localNodePositions[conn.node_b_id];
                        if (!posA || !posB) return null;

                        const x1 = `${posA.x + 5}%`;
                        const y1 = `${posA.y + 10}%`;
                        const x2 = `${posB.x + 5}%`;
                        const y2 = `${posB.y + 10}%`;
                        const isValidated = isConnectionValidated(conn.id);
                        const isOver = overConnectionId === conn.id;

                        return (
                            <line
                                key={conn.id}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={
                                    isValidated ? "#10b981" : isOver ? "#D4AF37" : "#374151"
                                }
                                strokeWidth={isOver ? 3 : 2}
                                strokeDasharray={isValidated ? "none" : "6,3"}
                                markerEnd={
                                    isValidated ? "url(#arrow-validated)" : "url(#arrow-pending)"
                                }
                                opacity={isValidated ? 1 : 0.6}
                            />
                        );
                    })}
                </svg>

                {/* Nœuds — draggables par le joueur */}
                {board.nodes.map(node => {
                    const typeCfg = getNodeTypeCfg(node.type);
                    const pos = localNodePositions[node.id] || { x: node.pos_x, y: node.pos_y };
                    const label = lang === "fr" ? node.label_fr : node.label_en || node.label_fr;

                    return (
                        <div
                            key={node.id}
                            className="absolute z-10 flex flex-col items-center gap-1 select-none cursor-grab active:cursor-grabbing group"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            onMouseDown={e => handleNodeMouseDown(e, node.id)}
                        >
                            {/* Épingle */}
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: typeCfg.color }}
                            />

                            {/* Image ou icône */}
                            <div
                                className="w-12 h-12 rounded-lg border-2 overflow-hidden flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                                style={{
                                    borderColor: typeCfg.color,
                                    backgroundColor: typeCfg.color + "22",
                                    filter: node.filter_type === "sepia"
                                        ? "sepia(80%)"
                                        : node.filter_type === "grayscale"
                                            ? "grayscale(100%)"
                                            : "none"
                                }}
                            >
                                {node.image_url ? (
                                    <img src={node.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                                ) : (
                                    <span className="text-xl pointer-events-none">{typeCfg.icon}</span>
                                )}
                            </div>

                            {/* Label complet — wrap sur 2 lignes max */}
                            <div
                                className="px-2 py-1 rounded text-[9px] font-bold text-white text-center leading-tight shadow-lg"
                                style={{
                                    backgroundColor: typeCfg.color + "dd",
                                    maxWidth: "90px",
                                    wordBreak: "break-word",
                                    whiteSpace: "normal",
                                }}
                            >
                                {label}
                            </div>

                            {/* Tooltip au hover — titre complet si trop long */}
                            {label && label.length > 12 && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10">
                                    {label}
                                </div>
                            )}

                            {/* Indicateur de déplacement */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[6px]">✥</span>
                            </div>
                        </div>
                    );
                })}

                {/* Drop zones sur les connexions (au milieu des fils) */}
                {board.connections.map((conn) => {
                    const mid = getConnectionMidpoint(conn);
                    const isValidated = isConnectionValidated(conn.id);
                    const isOver = overConnectionId === conn.id;
                    const isShaking = shaking === conn.id;

                    return (
                        <motion.div
                            key={conn.id}
                            animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
                            transition={{ duration: 0.4 }}
                            className="absolute z-20"
                            style={{ left: `calc(${mid.x}% - 20px)`, top: `calc(${mid.y}% - 20px)` }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setOverConnectionId(conn.id);
                            }}
                            onDragLeave={() => setOverConnectionId(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(conn.id);
                            }}
                        >
                            <div
                                className={`
                w-10 h-10 rounded-full border-2 flex items-center justify-center
                transition-all duration-200 cursor-crosshair
                ${isValidated
                                        ? "bg-green-900/50 border-green-500"
                                        : isOver
                                            ? "bg-[#D4AF37]/30 border-[#D4AF37] scale-125 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                                            : "bg-black/60 border-white/20 border-dashed hover:border-white/40"
                                    }
              `}
                            >
                                {isValidated ? (
                                    <CheckCircle size={14} className="text-green-400" />
                                ) : isOver ? (
                                    <span className="text-[#D4AF37] text-lg">⬇</span>
                                ) : (
                                    <span className="text-gray-600 text-xs font-bold">?</span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Canvas vide */}
                {board.nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-700 text-xs font-mono">
                            {lang === "fr" ? "Aucun nœud configuré" : "No nodes configured"}
                        </p>
                    </div>
                )}
            </div>

            {/* Légende */}
            <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono">
                <div className="flex items-center gap-1">
                    <div className="w-6 h-px border-t-2 border-dashed border-gray-600" />
                    <span>{lang === "fr" ? "À valider" : "To validate"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 h-px border-t-2 border-green-500" />
                    <span>{lang === "fr" ? "Validé" : "Validated"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-[#D4AF37] flex items-center justify-center">
                        <span className="text-[7px] text-[#D4AF37]">?</span>
                    </div>
                    <span>{lang === "fr" ? "Zone de dépôt" : "Drop zone"}</span>
                </div>
            </div>

            {/* Progression */}
            {board.connections.length > 0 &&
                (() => {
                    const validated = board.connections.filter((c) =>
                        isConnectionValidated(c.id),
                    ).length;
                    const total = board.connections.length;
                    const pct = Math.round((validated / total) * 100);
                    return (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                <span>
                                    {lang === "fr"
                                        ? "Connexions établies"
                                        : "Connections established"}
                                </span>
                                <span>
                                    {validated}/{total}
                                </span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                    );
                })()}
        </div>
    );
}

// ── HELPER : Config visuelle des types de nœuds ────────────
function getNodeTypeCfg(type: BoardNode["type"]) {
    const configs = {
        person: { color: "#14b8a6", icon: "👤" },
        place: { color: "#8b5cf6", icon: "📍" },
        org: { color: "#f59e0b", icon: "🏛️" },
        event: { color: "#ef4444", icon: "📅" },
        document: { color: "#06b6d4", icon: "📄" },
    };
    return configs[type] || { color: "#ffffff", icon: "❓" };
}

// ── COMPOSANT PRINCIPAL ────────────────────────────────────
export default function DeductionPanel({
    timeline,
    board,
    availableEvidences,
    validatedDeductions,
    notifications,
    lang,
    onClose,
    onValidateTimelineSlot,
    onValidateBoardConnection,
    onDismissNotification,
    isTimelineSlotValidated,
    isBoardConnectionValidated,
}: Props) {
    const [activeTab, setActiveTab] = useState<"timeline" | "board">(
        timeline ? "timeline" : "board",
    );

    const hasTimeline = !!timeline;
    const hasBoard = !!board;
    const hasNothing = !hasTimeline && !hasBoard;

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute z-30 bottom-24 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-24 md:w-[600px] max-h-[70vh] bg-[#05050A]/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_40px_rgba(212,175,55,0.1)]"
        >
            {/* ── Header ── */}
            <div className="bg-[#D4AF37]/10 px-4 py-3 flex items-center justify-between border-b border-[#D4AF37]/20 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Brain size={16} className="text-[#D4AF37]" />
                    <span className="font-mono text-xs text-[#D4AF37] tracking-widest font-bold">
                        {lang === "fr" ? "DÉDUCTION" : "DEDUCTION"}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-[#D4AF37] hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Onglets (seulement si les deux existent) ── */}
            {hasTimeline && hasBoard && (
                <div className="flex border-b border-white/10 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab("timeline")}
                        className={`flex-1 py-2.5 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 ${activeTab === "timeline"
                            ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500"
                            : "text-gray-500 hover:text-white"
                            }`}
                    >
                        <Calendar size={12} />
                        {lang === "fr" ? "TIMELINE" : "TIMELINE"}
                    </button>
                    <button
                        onClick={() => setActiveTab("board")}
                        className={`flex-1 py-2.5 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 ${activeTab === "board"
                            ? "bg-purple-600/20 text-purple-400 border-b-2 border-purple-500"
                            : "text-gray-500 hover:text-white"
                            }`}
                    >
                        <Network size={12} />
                        {lang === "fr" ? "CONNEXIONS" : "CONNECTIONS"}
                    </button>
                </div>
            )}

            {/* ── Contenu ── */}
            <div className="flex-1 overflow-y-auto p-4">
                {hasNothing && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10">
                        <Brain size={40} className="text-gray-700" />
                        <p className="text-gray-500 text-sm font-mono">
                            {lang === "fr"
                                ? "Aucun outil de déduction configuré pour ce chapitre"
                                : "No deduction tools configured for this chapter"}
                        </p>
                    </div>
                )}

                {/* Timeline */}
                {hasTimeline && (!hasBoard || activeTab === "timeline") && (
                    <TimelineTab
                        timeline={timeline!}
                        availableEvidences={availableEvidences}
                        lang={lang}
                        onValidate={onValidateTimelineSlot}
                        isSlotValidated={isTimelineSlotValidated}
                    />
                )}

                {/* Board */}
                {hasBoard && (!hasTimeline || activeTab === "board") && (
                    <BoardTab
                        board={board!}
                        availableEvidences={availableEvidences}
                        lang={lang}
                        onValidate={onValidateBoardConnection}
                        isConnectionValidated={isBoardConnectionValidated}
                    />
                )}
            </div>

            {/* ── Notifications internes au panel ── */}
            <AnimatePresence>
                {notifications.length > 0 && (
                    <div className="flex-shrink-0 border-t border-white/10 p-3 space-y-2 max-h-32 overflow-y-auto">
                        {notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold ${notif.type === "success"
                                    ? "bg-green-900/30 text-green-400 border border-green-500/20"
                                    : notif.type === "unlock"
                                        ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20"
                                        : "bg-red-900/30 text-red-400 border border-red-500/20"
                                    }`}
                            >
                                <span>{notif.message}</span>
                                <button
                                    onClick={() => onDismissNotification(notif.id)}
                                    className="opacity-50 hover:opacity-100 flex-shrink-0"
                                >
                                    <X size={10} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
