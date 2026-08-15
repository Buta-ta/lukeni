// components/game/SceneIntro.tsx
// Écran d'intro de TRANSITION entre scènes (différent de l'intro de début de jeu).
// Affiche un extrait vidéo/image d'archive (max ~30s) + un texte, puis on entre dans la scène.
// L'admin le configure par scène (vide = pas d'intro).
// ✅ Options avancées : couleur/police du texte, position du texte (utile pour vidéo),
//    effet de texte, audio de fond, filtre visuel sur le média, skip.
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Play, SkipForward, Film, Loader2 } from "lucide-react";

interface SceneIntroProps {
  mediaUrl: string;          // vidéo OU image
  mediaType: "video" | "image";
  textFr?: string;
  textEn?: string;
  sceneTitle?: string;       // ex "Salle Vodou"
  sceneIndex?: number;       // ex 4 → "SCÈNE 4"
  skipAllowed?: boolean;
  lang: "fr" | "en";
  onComplete: () => void;

  // ── OPTIONS AVANCÉES ──
  textColor?: string;                 // ex "#FFFFFF"
  textFont?: string;                  // serif | sans | mono | courier | georgia | times | cursive
  textEffect?: string;                // none | typewriter | fade | blur | slide
  textPosition?: string;              // 'top' | 'center' | 'bottom' — où le texte apparaît (important pour vidéo)
  audioUrl?: string | null;           // audio de fond narratif
  mediaFilter?: string;               // none | sepia | grayscale | vintage | noir
}

// ── Générateur de miniature Cloudinary (image de fond pendant le préchargement) ──
function cloudinaryThumb(url: string, maxW = 1200): string {
  try {
    const marker = "/image/upload/";
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    return url.slice(0, idx + marker.length) + `w_${maxW},q_60,f_auto/` + url.slice(idx + marker.length);
  } catch {
    return url;
  }
}

// ── Styles helpers ──
function fontClass(font?: string): string {
  switch (font) {
    case "sans": return "font-sans";
    case "mono": return "font-mono";
    case "courier": return "font-mono";
    case "georgia": return "font-serif";
    case "times": return "font-serif";
    case "cursive": return "font-serif italic";
    case "serif":
    default: return "font-serif";
  }
}

function filterClass(filter?: string): string {
  switch (filter) {
    case "sepia": return "sepia(70%) contrast(105%)";
    case "grayscale": return "grayscale(100%) contrast(110%)";
    case "vintage": return "sepia(40%) contrast(130%) saturate(120%)";
    case "noir": return "grayscale(100%) contrast(150%) brightness(60%)";
    default: return "none";
  }
}

// ── Positions du texte (utile surtout pour la vidéo) ──
const POSITION_CLASSES: Record<string, string> = {
  top: "items-start pt-20 md:pt-16",
  center: "items-center",
  bottom: "items-end pb-24 md:pb-20",
};

export default function SceneIntro({
  mediaUrl,
  mediaType,
  textFr,
  textEn,
  sceneTitle,
  sceneIndex,
  skipAllowed = true,
  lang,
  onComplete,
  textColor = "#FFFFFF",
  textFont = "serif",
  textEffect = "typewriter",
  textPosition = "bottom",
  audioUrl,
  mediaFilter = "none",
}: SceneIntroProps) {
  const text = lang === "fr" ? textFr : textEn || textFr;

  // ── États ──
  const [phase, setPhase] = useState<"listen" | "playing" | "done">("listen"); // écran d'accroche → lecture → fini
  const [displayedText, setDisplayedText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(mediaType === "image"); // image: prêt direct; vidéo: après buffering
  const [videoEnded, setVideoEnded] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIX : Pour une IMAGE (pas de vidéo), on passe directement en phase "playing"
  // au montage → le texte s'affiche immédiatement. Pour une vidéo, on garde
  // l'écran d'accroche "Écouter l'archive" (phase "listen") jusqu'au clic.
  useEffect(() => {
    if (mediaType === "image") {
      setPhase("playing");
    }
  }, [mediaType]);

  // ── Effet typewriter (rapide, ~20ms/caractère) ──
  useEffect(() => {
    if (textEffect !== "typewriter") return;
    if (phase !== "playing" && phase !== "done") return;
    const fullText = text || "";
    if (displayedText.length < fullText.length) {
      typeTimer.current = setTimeout(() => {
        setDisplayedText(fullText.substring(0, displayedText.length + 1));
      }, 20);
    }
    return () => {
      if (typeTimer.current) clearTimeout(typeTimer.current);
    };
  }, [phase, displayedText, text, textEffect]);

  // ── Lancer la lecture vidéo quand on entre en phase "playing" ──
  useEffect(() => {
    if (phase === "playing" && mediaType === "video" && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
    // Audio de fond (déclenché par le clic utilisateur → autorisé)
    if (phase === "playing" && audioUrl && audioRef.current) {
      audioRef.current.muted = audioMuted;
      audioRef.current.play().catch(() => {});
    }
  }, [phase, mediaType, isMuted, audioMuted, audioUrl]);

  // ── Précharger la vidéo dès le montage pour éviter le gel ──
  useEffect(() => {
    if (mediaType === "video") {
      const vid = document.createElement("video");
      vid.preload = "auto";
      vid.src = mediaUrl;
      vid.oncanplaythrough = () => setVideoReady(true);
      vid.onerror = () => setVideoReady(true); // en cas d'erreur, on ne bloque pas
    }
  }, [mediaType, mediaUrl]);

  // ── Audio de fond préchargé ──
  useEffect(() => {
    if (audioUrl) {
      const a = new Audio(audioUrl);
      a.loop = true;
      audioRef.current = a;
    }
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = null;
    };
  }, [audioUrl]);

  const handleStart = () => {
    setPhase("playing");
    setVideoReady(true);
    if (mediaType === "video" && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.muted = audioMuted;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleComplete = () => {
    if (typeTimer.current) clearTimeout(typeTimer.current);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }

    setDisplayedText(text || "");
    onComplete();
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    setPhase("done");
  };

  const handleToggleMute = () => {
    // Si on coupe, on mute vidéo + audio
    const muted = !isMuted;
    setIsMuted(muted);
    setAudioMuted(muted);
    if (videoRef.current) videoRef.current.muted = muted;
    if (audioRef.current) audioRef.current.muted = muted;
  };

  // ── Image de fond ──
  const backgroundImage =
    mediaType === "image" ? mediaUrl : videoReady ? mediaUrl : cloudinaryThumb(mediaUrl);

  // ── Texte (avec effet non-typewriter) ──
  const renderedText =
    textEffect === "typewriter"
      ? displayedText
      : phase === "playing" || phase === "done"
        ? text || ""
        : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-[#0a0908] overflow-hidden flex flex-col"
    >
      {/* ── Média en fond (avec filtre) ── */}
      {mediaType === "image" && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: filterClass(mediaFilter),
            opacity: 0.55,
          }}
        />
      )}

      {mediaType === "video" && (
        <video
          ref={videoRef}
          src={mediaUrl}
          autoPlay={false}
          playsInline
          loop={false}
          muted={isMuted}
          onEnded={handleVideoEnded}
          onError={() => setMediaError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: filterClass(mediaFilter), opacity: 0.85 }}
        />
      )}

      {/* ── Voile sombre pour lisibilité (adapté à la position du texte) ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/80" />

      {/* ── Bandeau "SCÈNE X" ── */}
      <div className="relative z-10 pt-6 px-6 md:px-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 border border-[#D4AF37]/40 bg-black/60 backdrop-blur-sm rounded">
          <Film size={14} className="text-[#D4AF37]" />
          <span className="text-[#D4AF37] font-mono text-xs tracking-[0.3em] uppercase">
            {lang === "fr" ? "Scène" : "Scene"} {sceneIndex ?? ""}
          </span>
        </div>
        {sceneTitle && (
          <h2 className="mt-3 font-serif text-2xl md:text-3xl font-bold text-white drop-shadow-md">
            {sceneTitle}
          </h2>
        )}
      </div>

      {/* ── Zone du texte (position configurable) ── */}
      <div className={`relative z-10 flex-1 flex ${POSITION_CLASSES[textPosition] || POSITION_CLASSES.bottom} px-6 md:px-12 max-w-4xl`}>
        <AnimatePresence>
          {renderedText && (
            <motion.p
              key={textEffect}
              initial={{ opacity: 0, y: textEffect === "slide" ? 30 : 0, filter: textEffect === "blur" ? "blur(10px)" : "none" }}
              animate={{ opacity: 1, y: 0, filter: "none" }}
              transition={{ duration: 0.8 }}
              className={`text-lg md:text-2xl leading-relaxed drop-shadow-lg ${fontClass(textFont)}`}
              style={{ color: textColor }}
            >
              {renderedText}
              {textEffect === "typewriter" && phase !== "done" && (
                <span className="inline-block w-[2px] h-5 ml-1 align-middle animate-pulse" style={{ backgroundColor: textColor }} />
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Barre du bas : son + continue/skip ── */}
      <div className="relative z-10 absolute bottom-0 inset-x-0 px-6 md:px-12 py-6 flex items-center justify-between">
        {/* Bouton son */}
        <button
          onClick={handleToggleMute}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/70 transition-colors"
          title={isMuted ? "Activer le son" : "Couper le son"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Écran d'accroche OU continuer */}
        {phase === "listen" && mediaType === "video" ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold transition-colors shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          >
            <Play size={18} />
            {lang === "fr" ? "Écouter l'archive" : "Play archive"}
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={!videoReady && mediaType === "video"}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold transition-colors disabled:opacity-50"
          >
            {!videoReady && mediaType === "video" ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {lang === "fr" ? "Chargement…" : "Loading…"}
              </>
            ) : (
              <>
                {lang === "fr" ? "Continuer" : "Continue"}
                <SkipForward size={18} />
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Skip (toujours dispo si autorisé) ── */}
      {skipAllowed && phase !== "listen" && (
        <button
          onClick={handleComplete}
          className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-4 py-2 bg-black/50 border border-white/20 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-widest rounded-full transition-colors"
        >
          <SkipForward size={14} />
          {lang === "fr" ? "Passer" : "Skip"}
        </button>
      )}

      {mediaError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <button onClick={handleComplete} className="px-6 py-3 bg-white/10 border border-white/30 text-white rounded-xl">
            {lang === "fr" ? "Impossible de lire la vidéo — Continuer" : "Video unavailable — Continue"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
