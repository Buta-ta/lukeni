// components/game/EvidenceModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, WheelEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Star,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Microscope,
  Type,
  CheckCircle2,
  FileText,
  Volume2,
  Video,
  ImageIcon,
  ScanLine,
} from "lucide-react";
import { Hotspot, HOTSPOT_CONFIG } from "@/types/panorama";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Evidence {
  id: string;
  media_type: "image" | "audio" | "video" | "document";
  media_url: string;
  name_fr?: string;
  name_en?: string;
  [key: string]: any;
}

interface Props {
  hotspot: Hotspot | null;
  evidence: Evidence | null;
  allEvidences?: Evidence[];
  lang?: "fr" | "en";
  onClose: () => void;
  onEvidenceCollected?: (evidenceId: string) => void;
  onNavigate?: (direction: "prev" | "next") => void;
  collectedIds?: string[];
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.5;

const FORENSIC_FILTERS = [
  { id: "none", labelFr: "Normal", labelEn: "Normal", emoji: "👁️", style: "none" },
  { id: "contrast", labelFr: "Contraste", labelEn: "Contrast", emoji: "⚡", style: "contrast(180%) brightness(110%)" },
  { id: "negative", labelFr: "Négatif", labelEn: "Negative", emoji: "📷", style: "invert(1)" },
  { id: "sepia", labelFr: "Sépia", labelEn: "Sepia", emoji: "🟤", style: "sepia(80%)" },
  { id: "edge", labelFr: "Contours", labelEn: "Edges", emoji: "🔷", style: "contrast(300%) brightness(50%) grayscale(1)" },
] as const;

type FilterId = typeof FORENSIC_FILTERS[number]["id"];

const MEDIA_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon size={12} />,
  audio: <Volume2 size={12} />,
  video: <Video size={12} />,
  document: <FileText size={12} />,
};

const MEDIA_LABELS = {
  image: { fr: "📸 Photographie", en: "📸 Photograph" },
  audio: { fr: "🎵 Audio", en: "🎵 Audio" },
  video: { fr: "🎬 Vidéo", en: "🎬 Video" },
  document: { fr: "📄 Document", en: "📄 Document" },
};

// ─────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────
function IconButton({
  onClick,
  title,
  active,
  disabled,
  children,
  className = "",
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-label={title}
      aria-pressed={active}
      className={`
        p-2 rounded-lg transition-all duration-200 focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-2 focus-visible:outline-white/50
        disabled:opacity-30 disabled:cursor-not-allowed
        ${active
          ? "bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
          : "text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  onFullscreen,
  lang,
}: {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFullscreen: () => void;
  lang: "fr" | "en";
}) {
  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
      <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-1">
        <button
          onClick={onZoomOut}
          disabled={zoomLevel <= ZOOM_MIN}
          title={lang === "fr" ? "Dézoomer" : "Zoom out"}
          className="p-1.5 rounded text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ZoomOut size={14} />
        </button>

        <span className="px-2 text-xs text-white font-mono min-w-[40px] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>

        <button
          onClick={onZoomIn}
          disabled={zoomLevel >= ZOOM_MAX}
          title={lang === "fr" ? "Zoomer" : "Zoom in"}
          className="p-1.5 rounded text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-1">
        <button
          onClick={onReset}
          title={lang === "fr" ? "Réinitialiser" : "Reset"}
          className="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={onFullscreen}
          title={lang === "fr" ? "Plein écran" : "Fullscreen"}
          className="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
export default function EvidenceModal({
  hotspot,
  evidence,
  lang = "fr",
  onClose,
  onEvidenceCollected,
  onNavigate,
  collectedIds = [],
}: Props) {
  if (!hotspot) return null;

  const config = HOTSPOT_CONFIG[hotspot.type] || HOTSPOT_CONFIG.evidence;
  const activeColor = hotspot.color || config.color;
  const activeIcon = hotspot.icon || config.icon;
  const hasCustomImage = !!hotspot.icon_url;
  const isCollected = evidence ? collectedIds.includes(evidence.id) : false;
  const isEvidenceType = ["evidence", "audio", "document", "video", "image"].includes(hotspot.type);

  // ── Zoom / pan ──
  const [zoomLevel, setZoomLevel] = useState(ZOOM_MIN);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // ── Mode forensique ──
  const [isForensicMode, setIsForensicMode] = useState(false);
  const [forensicFilter, setForensicFilter] = useState<FilterId>("none");
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
  const [showLoupe, setShowLoupe] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const forensicRef = useRef<HTMLDivElement>(null);

  // ── Notes ──
  const [playerNote, setPlayerNote] = useState("");
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // ── Collecte ──
  const [justCollected, setJustCollected] = useState(false);

  // ── Swipe ──
  const touchStartX = useRef(0);

  // ─────────────────────────────────────────────
  // Effets
  // ─────────────────────────────────────────────

  // Charger note
  useEffect(() => {
    if (!evidence?.id) return;
    const saved = localStorage.getItem(`note_${evidence.id}`);
    setPlayerNote(saved ?? "");
  }, [evidence?.id]);

  // Reset états quand l'hotspot change
  useEffect(() => {
    setZoomLevel(ZOOM_MIN);
    setPosition({ x: 0, y: 0 });
    setIsForensicMode(false);
    setForensicFilter("none");
    setJustCollected(false);
  }, [hotspot?.id]);

  // Observer la taille du conteneur forensique
  useEffect(() => {
    if (!forensicRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    ro.observe(forensicRef.current);
    return () => ro.disconnect();
  }, [isForensicMode]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape": onClose(); break;
        case "ArrowLeft": onNavigate?.("prev"); break;
        case "ArrowRight": onNavigate?.("next"); break;
        case "+":
        case "=": handleZoomIn(); break;
        case "-": handleZoomOut(); break;
        case "r":
        case "R": handleReset(); break;
        case "f":
        case "F":
          if (evidence?.media_type === "image") setIsForensicMode(m => !m);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomLevel, onClose, onNavigate, evidence?.media_type]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  const handleZoomIn = useCallback(() => setZoomLevel(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoomLevel(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleReset = useCallback(() => { setZoomLevel(ZOOM_MIN); setPosition({ x: 0, y: 0 }); }, []);

  // Zoom molette
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoomLevel(z => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
  }, []);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [zoomLevel, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Double-clic zoom cyclique
  const handleDoubleClick = useCallback(() => {
    if (zoomLevel < 2) setZoomLevel(2);
    else if (zoomLevel < 4) setZoomLevel(4);
    else handleReset();
  }, [zoomLevel, handleReset]);

  // Pinch-to-zoom
  const lastPinchDistance = useRef<number | null>(null);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDistance.current !== null) {
        const delta = (dist - lastPinchDistance.current) * 0.01;
        setZoomLevel(z => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
      }
      lastPinchDistance.current = dist;
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    lastPinchDistance.current = null;
    // Swipe navigation
    if (e.changedTouches.length === 1) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) onNavigate?.(diff > 0 ? "next" : "prev");
    }
  };

  // Loupe forensique
  const handleForensicMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!forensicRef.current) return;
    const rect = forensicRef.current.getBoundingClientRect();
    setLoupePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  // Plein écran
  const handleFullscreen = useCallback(async () => {
    const el = imageContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen unavailable:", err);
    }
  }, []);

  // Sauvegarder note
  const handleNoteChange = useCallback((text: string) => {
    setPlayerNote(text);
    setNoteSaved(false);
    if (evidence?.id) {
      localStorage.setItem(`note_${evidence.id}`, text);
      setNoteSaved(true);
    }
  }, [evidence?.id]);

  // Collecte
  const handleCollect = useCallback(() => {
    if (!evidence || !onEvidenceCollected) return;
    setJustCollected(true);
    onEvidenceCollected(evidence.id);
    setTimeout(onClose, 800);
  }, [evidence, onEvidenceCollected, onClose]);

  // Filtre CSS actif
  const activeFilterStyle = FORENSIC_FILTERS.find(f => f.id === forensicFilter)?.style ?? "none";

  // Référence forensique
  const forensicRef2 = (el: HTMLDivElement | null) => {
    (forensicRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/92 backdrop-blur-lg"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
        aria-label={lang === "fr" ? "Pièce à conviction" : "Evidence"}
      >
        {/* ── Navigation latérale ── */}
        {onNavigate && (
          <>
            <NavArrow
              direction="prev"
              onClick={e => { e.stopPropagation(); onNavigate("prev"); }}
              title={lang === "fr" ? "Précédent (←)" : "Previous (←)"}
            />
            <NavArrow
              direction="next"
              onClick={e => { e.stopPropagation(); onNavigate("next"); }}
              title={lang === "fr" ? "Suivant (→)" : "Next (→)"}
            />
          </>
        )}

        {/* ── Raccourcis clavier hint ── */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 text-[10px] text-gray-600 font-mono select-none pointer-events-none">
          <span>ESC: fermer</span>
          {evidence?.media_type === "image" && <span>F: forensique · +/-: zoom · R: reset</span>}
        </div>

        {/* ════════════════════════════════
            CARTE PRINCIPALE
        ════════════════════════════════ */}
        <motion.div
          key="modal"
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={`
            relative w-full bg-[#080808] rounded-2xl border shadow-2xl flex flex-col
            ${isForensicMode ? "max-w-4xl" : "max-w-2xl"}
          `}
          style={{
            borderColor: activeColor + "40",
            boxShadow: `0 0 60px ${activeColor}18, 0 25px 60px rgba(0,0,0,0.7)`,
            maxHeight: "90vh",
          }}
          onClick={e => e.stopPropagation()}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barre de couleur supérieure */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)` }}
          />

          {/* ── HEADER ── */}
          <header
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: activeColor + "20", backgroundColor: activeColor + "0a" }}
          >
            <div className="flex items-center gap-3">
              {/* Icône */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{
                  backgroundColor: activeColor + "25",
                  outline: `2px solid ${activeColor}`,
                  outlineOffset: "2px",
                }}
              >
                {hasCustomImage
                  ? <img src={hotspot.icon_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xl">{activeIcon}</span>
                }
              </div>

              {/* Titres */}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: activeColor }}>
                  {lang === "fr" ? config.label_fr : config.label_en}
                </p>
                <h2 className="text-white font-bold text-base leading-tight truncate max-w-[280px]">
                  {lang === "fr" ? hotspot.label_fr : hotspot.label_en}
                </h2>
              </div>
            </div>

            {/* Actions header */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isEvidenceType && evidence?.media_type === "image" && (
                <IconButton
                  onClick={() => { setIsForensicMode(m => !m); setForensicFilter("none"); }}
                  title={lang === "fr" ? "Mode forensique (F)" : "Forensic mode (F)"}
                  active={isForensicMode}
                >
                  <Microscope size={17} />
                </IconButton>
              )}

              {isCollected && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold">
                  <CheckCircle2 size={11} />
                  {lang === "fr" ? "Collecté" : "Collected"}
                </div>
              )}

              <IconButton onClick={onClose} title={lang === "fr" ? "Fermer (Esc)" : "Close (Esc)"}>
                <X size={17} />
              </IconButton>
            </div>
          </header>

          {/* ── BODY SCROLLABLE ── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

            {/* ╔══════════════════╗
                ║   TYPE: INFO     ║
                ╚══════════════════╝ */}
            {hotspot.type === "info" && (
              <div className="space-y-4">
                <p className="text-gray-200 leading-relaxed font-serif text-sm md:text-base">
                  {lang === "fr" ? hotspot.info_text_fr : hotspot.info_text_en}
                </p>
                {hotspot.inline_audio_url && (
                  <AudioBlock src={hotspot.inline_audio_url} label="Audio" />
                )}
              </div>
            )}

            {/* ╔══════════════════════╗
                ║   TYPE: INLINE IMAGE ║
                ╚══════════════════════╝ */}
            {hotspot.type === "image" && hotspot.inline_image_url && (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden bg-black border border-white/5">
                  <img
                    src={hotspot.inline_image_url}
                    alt={lang === "fr" ? hotspot.inline_image_caption_fr ?? "" : hotspot.inline_image_caption_en ?? ""}
                    className="w-full max-h-80 object-contain"
                  />
                </div>
                {(hotspot.inline_image_caption_fr || hotspot.inline_image_caption_en) && (
                  <p className="text-gray-500 text-xs text-center italic">
                    {lang === "fr" ? hotspot.inline_image_caption_fr : hotspot.inline_image_caption_en}
                  </p>
                )}
              </div>
            )}

            {/* ╔═══════════════════════════╗
                ║   TYPE: EVIDENCE + médias ║
                ╚═══════════════════════════╝ */}
            {isEvidenceType && evidence && (
              <>
                {/* ── IMAGE: mode normal ── */}
                {evidence.media_type === "image" && !isForensicMode && (
                  <div className="space-y-2">
                    <div
                      ref={imageContainerRef}
                      className="relative rounded-xl overflow-hidden bg-black border border-white/5 select-none"
                      style={{
                        height: 380,
                        cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onDoubleClick={handleDoubleClick}
                      onWheel={handleWheel}
                    >
                      <motion.img
                        src={evidence.media_url}
                        alt={lang === "fr" ? "Pièce à conviction" : "Evidence"}
                        className="absolute inset-0 w-full h-full object-contain origin-center"
                        style={{
                          scale: zoomLevel,
                          x: position.x / zoomLevel,
                          y: position.y / zoomLevel,
                          transition: isDragging ? "none" : "scale 0.15s ease",
                        }}
                        draggable={false}
                      />

                      {/* Badge type */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] text-gray-400 font-mono">
                        {MEDIA_ICONS[evidence.media_type]}
                        {lang === "fr"
                          ? MEDIA_LABELS[evidence.media_type]?.fr
                          : MEDIA_LABELS[evidence.media_type]?.en}
                      </div>

                      {/* Indicateur zoom */}
                      <AnimatePresence>
                        {zoomLevel > 1 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white font-mono"
                          >
                            {Math.round(zoomLevel * 100)}%
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Contrôles zoom */}
                      <ZoomControls
                        zoomLevel={zoomLevel}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onReset={handleReset}
                        onFullscreen={handleFullscreen}
                        lang={lang}
                      />
                    </div>

                    <p className="text-[10px] text-gray-600 text-center font-mono">
                      {lang === "fr"
                        ? "Molette ou double-clic pour zoomer · glisser pour déplacer"
                        : "Scroll or double-click to zoom · drag to pan"}
                    </p>
                  </div>
                )}

                {/* ── IMAGE: mode forensique ── */}
                {evidence.media_type === "image" && isForensicMode && (
                  <div className="space-y-3">
                    {/* Filtres */}
                    <div className="flex gap-1.5 flex-wrap">
                      {FORENSIC_FILTERS.map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setForensicFilter(filter.id)}
                          className={`
                            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold
                            border transition-all duration-200
                            ${forensicFilter === filter.id
                              ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                              : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                            }
                          `}
                        >
                          <span role="img" aria-hidden>{filter.emoji}</span>
                          {lang === "fr" ? filter.labelFr : filter.labelEn}
                        </button>
                      ))}
                    </div>

                    {/* Zone d'examen */}
                    <div
                      ref={forensicRef2}
                      className="relative rounded-xl overflow-hidden bg-black border-2 border-cyan-500/30 select-none"
                      style={{ height: 420 }}
                      onMouseMove={handleForensicMouseMove}
                      onMouseEnter={() => setShowLoupe(true)}
                      onMouseLeave={() => setShowLoupe(false)}
                    >
                      {/* Image filtrée */}
                      <img
                        src={evidence.media_url}
                        alt={lang === "fr" ? "Examen forensique" : "Forensic examination"}
                        className="w-full h-full object-contain pointer-events-none"
                        style={{ filter: activeFilterStyle }}
                        draggable={false}
                      />

                      {/* Grille de référence */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)
                          `,
                          backgroundSize: "40px 40px",
                        }}
                      />

                      {/* Scan animé */}
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 pointer-events-none"
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Réticule central */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-6 h-6 border border-cyan-400">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400" />
                        </div>
                      </div>

                      {/* ── Loupe ── */}
                      <AnimatePresence>
                        {showLoupe && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.12 }}
                            className="absolute pointer-events-none rounded-full overflow-hidden border-2 border-cyan-400"
                            style={{
                              width: 120,
                              height: 120,
                              left: loupePos.x - 60,
                              top: loupePos.y - 60,
                              zIndex: 50,
                              boxShadow: "0 0 0 2px rgba(34,211,238,0.3), 0 0 30px rgba(34,211,238,0.6)",
                            }}
                          >
                            {/* Image zoomée dans la loupe */}
                            {containerSize.w > 0 && (
                              <div className="absolute inset-0 overflow-hidden">
                                <img
                                  src={evidence.media_url}
                                  alt=""
                                  draggable={false}
                                  className="absolute"
                                  style={{
                                    width: containerSize.w * 3,
                                    height: containerSize.h * 3,
                                    left: -(loupePos.x * 3) + 60,
                                    top: -(loupePos.y * 3) + 60,
                                    filter: activeFilterStyle,
                                  }}
                                />
                              </div>
                            )}

                            {/* Croix de visée */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-4 h-px bg-cyan-400/70" />
                              <div className="absolute h-4 w-px bg-cyan-400/70" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Coordonnées de la loupe */}
                      {showLoupe && containerSize.w > 0 && (
                        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded font-mono text-[10px] text-cyan-400/70">
                          X:{Math.round((loupePos.x / containerSize.w) * 100)}%
                          &nbsp;Y:{Math.round((loupePos.y / containerSize.h) * 100)}%
                        </div>
                      )}

                      {/* Badge analyse */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[11px] text-cyan-400 font-mono font-bold">
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >●</motion.span>
                        <ScanLine size={12} />
                        {lang === "fr" ? "ANALYSE EN COURS" : "ANALYSIS RUNNING"}
                      </div>

                      {/* Hint loupe */}
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1.5 rounded-lg text-[10px] text-gray-400 font-mono">
                        🔬 {lang === "fr" ? "Déplacez la loupe" : "Move the loupe"}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── AUDIO ── */}
                {evidence.media_type === "audio" && (
                  <AudioBlock src={evidence.media_url} label={lang === "fr" ? "Témoignage audio" : "Audio testimony"} color={activeColor} />
                )}

                {/* ── VIDEO ── */}
                {evidence.media_type === "video" && (
                  <video
                    src={evidence.media_url}
                    controls
                    autoPlay
                    className="w-full rounded-xl border border-white/5 bg-black max-h-64"
                  />
                )}

                {/* ── DOCUMENT ── */}
                {evidence.media_type === "document" && (
                  <iframe
                    src={evidence.media_url}
                    className="w-full rounded-xl border border-white/5 bg-white"
                    style={{ height: 280 }}
                    title={lang === "fr" ? "Document" : "Document"}
                  />
                )}

                {/* ── Métadonnées ── */}
                {(evidence.name_fr || evidence.name_en) && (
                  <MetadataBlock evidence={evidence} lang={lang} />
                )}

                {/* ── Notes ── */}
                <NoteBlock
                  note={playerNote}
                  saved={noteSaved}
                  show={showNotePanel}
                  onToggle={() => setShowNotePanel(s => !s)}
                  onChange={handleNoteChange}
                  lang={lang}
                />
              </>
            )}

            {/* ── Pas de média ── */}
            {isEvidenceType && !evidence && (
              <div className="py-12 flex flex-col items-center gap-3" style={{ color: activeColor + "80" }}>
                <span className="text-5xl">{activeIcon}</span>
                <p className="text-gray-500 text-sm text-center">
                  {lang === "fr" ? "Aucun média lié à cet indice." : "No media linked to this clue."}
                </p>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          {(isEvidenceType && evidence && onEvidenceCollected) || onNavigate ? (
            <footer className="px-5 py-4 border-t border-white/8 flex items-center justify-between gap-3 flex-shrink-0 bg-black/30">
              {/* Navigation hint */}
              {onNavigate && (
                <p className="text-[10px] text-gray-600 font-mono hidden sm:block">
                  ← → {lang === "fr" ? "Naviguer" : "Navigate"}
                </p>
              )}

              {/* Bouton collecter */}
              {isEvidenceType && evidence && onEvidenceCollected && !isCollected && (
                <motion.button
                  onClick={handleCollect}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`
                    ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl
                    font-bold text-sm text-white transition-all
                    ${justCollected ? "opacity-70 pointer-events-none" : ""}
                  `}
                  style={{
                    background: justCollected
                      ? "linear-gradient(135deg, #16a34a, #15803d)"
                      : `linear-gradient(135deg, ${activeColor}, ${activeColor}bb)`,
                    boxShadow: `0 0 20px ${activeColor}44`,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {justCollected ? (
                      <motion.span
                        key="ok"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 size={15} />
                        {lang === "fr" ? "Collecté !" : "Collected!"}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="cta"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Star size={15} fill="currentColor" />
                        {lang === "fr" ? "Ajouter au dossier" : "Add to case file"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}

              {/* Déjà collecté */}
              {isEvidenceType && evidence && isCollected && (
                <div className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-bold">
                  <CheckCircle2 size={15} />
                  {lang === "fr" ? "Dans votre dossier" : "In your case file"}
                </div>
              )}
            </footer>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// Composants auxiliaires
// ─────────────────────────────────────────────

function NavArrow({
  direction,
  onClick,
  title,
}: {
  direction: "prev" | "next";
  onClick: (e: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`
        absolute top-1/2 -translate-y-1/2 z-[60]
        p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10
        border border-white/5 hover:border-white/20
        transition-all duration-200 backdrop-blur-sm
        ${direction === "prev" ? "left-3" : "right-3"}
      `}
    >
      {direction === "prev" ? <ChevronLeft size={26} /> : <ChevronRight size={26} />}
    </button>
  );
}

function AudioBlock({
  src,
  label,
  color,
}: {
  src: string;
  label: string;
  color?: string;
}) {
  return (
    <div
      className="p-5 rounded-xl border border-white/8 flex flex-col items-center gap-4"
      style={{ backgroundColor: color ? color + "0d" : "rgba(255,255,255,0.03)" }}
    >
      <motion.div
        className="text-4xl"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🎵
      </motion.div>
      <audio src={src} controls autoPlay className="w-full" />
      <p className="text-[11px] text-gray-500 font-mono">{label}</p>
    </div>
  );
}

function MetadataBlock({
  evidence,
  lang,
}: {
  evidence: Evidence;
  lang: "fr" | "en";
}) {
  const rows = [
    {
      key: lang === "fr" ? "Nom" : "Name",
      value: lang === "fr" ? evidence.name_fr : evidence.name_en || evidence.name_fr,
      className: "text-white font-semibold",
    },
    {
      key: lang === "fr" ? "Type" : "Type",
      value: lang === "fr"
        ? MEDIA_LABELS[evidence.media_type]?.fr
        : MEDIA_LABELS[evidence.media_type]?.en,
      className: "text-white",
    },
    {
      key: lang === "fr" ? "Référence" : "Reference",
      value: `REF-${new Date().getFullYear()}-${evidence.id.slice(0, 8).toUpperCase()}`,
      className: "text-amber-400 font-mono",
    },
  ];

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <div className="px-3 py-2 bg-white/4 border-b border-white/8">
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
          {lang === "fr" ? "Informations" : "Information"}
        </p>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map(row => (
          <div key={row.key} className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-gray-500 font-mono">{row.key}</span>
            <span className={row.className}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBlock({
  note,
  saved,
  show,
  onToggle,
  onChange,
  lang,
}: {
  note: string;
  saved: boolean;
  show: boolean;
  onToggle: () => void;
  onChange: (t: string) => void;
  lang: "fr" | "en";
}) {
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/6 transition-colors text-xs font-semibold text-gray-300"
        aria-expanded={show}
      >
        <span className="flex items-center gap-2">
          <Type size={13} />
          {lang === "fr" ? "Mes observations" : "My observations"}
          {note && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={lang === "fr" ? "Note enregistrée" : "Note saved"} />
          )}
        </span>
        <motion.span
          animate={{ rotate: show ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-500"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              <textarea
                value={note}
                onChange={e => onChange(e.target.value)}
                placeholder={lang === "fr" ? "Notez vos observations…" : "Write your observations…"}
                maxLength={300}
                rows={3}
                className="w-full bg-black/40 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-white/25 resize-none transition-colors"
              />
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-600">{note.length}/300</span>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-green-500 flex items-center gap-1"
                  >
                    <CheckCircle2 size={10} />
                    {lang === "fr" ? "Sauvegardé" : "Saved"}
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}