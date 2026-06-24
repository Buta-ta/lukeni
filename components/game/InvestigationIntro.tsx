// components/game/InvestigationIntro.tsx
"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, SkipForward } from "lucide-react";

// ============================================================================
// LOGO LUKENI
// ============================================================================
const LukeniLogo = memo(() => (
  <div className="flex flex-col items-center gap-2">
    <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#D4AF37]" fill="currentColor">
      <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
      <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
      <path
        d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
    <span className="text-[#D4AF37] font-serif tracking-[0.4em] text-sm font-bold uppercase">
      Lukeni
    </span>
  </div>
));
LukeniLogo.displayName = "LukeniLogo";

// ============================================================================
// TYPES
// ============================================================================
interface InvestigationIntroProps {
  investigationId: string;
  lang: "fr" | "en";
  onComplete: () => void;
  directConfig?: {
    background_image_url: string | null;
    audio_url: string | null;
    scroll_texts_fr: string[];
    scroll_texts_en: string[];
    text_scroll_speed: number;
    audio_volume: number;
    skip_allowed: boolean;
    visual_filter?: string;
    image_effect?: string;
    final_message_fr?: string;
    final_message_en?: string;
    final_message_icon?: string;
    text_effect?: string;
    typewriter_speed?: number;
    text_color?: string;
    text_font?: string;
  };
}

interface IntroConfig {
  background_image_url: string | null;
  audio_url: string | null;
  scroll_texts_fr: string[];
  scroll_texts_en: string[];
  text_scroll_speed: number;
  audio_volume: number;
  skip_allowed: boolean;
  visual_filter?: string;
  image_effect?: string;
  final_message_fr?: string;
  final_message_en?: string;
  final_message_icon?: string;
  text_effect?: string;
  typewriter_speed?: number;
  text_color?: string;
  text_font?: string;
}

// ============================================================================
// HELPERS
// ============================================================================
const getFilterStyle = (filter?: string): string => {
  switch (filter) {
    case "sepia": return "sepia(80%) contrast(110%) brightness(90%)";
    case "grayscale": return "grayscale(100%) contrast(120%) brightness(85%)";
    case "vintage": return "sepia(40%) contrast(130%) saturate(120%)";
    case "noir": return "grayscale(100%) contrast(150%) brightness(60%)";
    default: return "none";
  }
};

const getKenBurnsAnimation = (effect?: string): string => {
  switch (effect) {
    case "zoom-in": return "kenburns-zoom-in 20s ease-in-out infinite alternate";
    case "zoom-out": return "kenburns-zoom-out 20s ease-in-out infinite alternate";
    case "pan-left": return "kenburns-pan-left 20s ease-in-out infinite alternate";
    case "pan-right": return "kenburns-pan-right 20s ease-in-out infinite alternate";
    default: return "none";
  }
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
export default function InvestigationIntro({
  investigationId,
  lang,
  onComplete,
  directConfig,
}: InvestigationIntroProps) {
  const [config, setConfig] = useState<IntroConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showEnableSound, setShowEnableSound] = useState(false);

  // État de la machine à textes
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [textPhase, setTextPhase] = useState<"entering" | "holding" | "exiting" | "complete">("entering");
  const [displayedText, setDisplayedText] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Chargement de la config ──────────────────────────────────────────────
  useEffect(() => {
    const initAudio = (url: string, volume: number) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.loop = true;
      audioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setShowEnableSound(true);
        });
      }
    };

    if (directConfig) {
      setConfig(directConfig);
      setIsLoading(false);
      if (directConfig.audio_url) {
        initAudio(directConfig.audio_url, directConfig.audio_volume ?? 0.8);
      }
      return;
    }

    const loadIntroConfig = async () => {
      try {
        const response = await fetch(`/api/investigation-intro?investigationId=${investigationId}`);
        if (!response.ok) { onComplete(); return; }

        const result = await response.json();
        const introConfig: IntroConfig = result.introConfig;
        if (!introConfig) { onComplete(); return; }

        setConfig(introConfig);
        setIsLoading(false);

        if (introConfig.audio_url) {
          initAudio(introConfig.audio_url, introConfig.audio_volume ?? 0.8);
        }
      } catch (err) {
        console.error("Load intro config error:", err);
        onComplete();
      }
    };

    loadIntroConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigationId, directConfig]);

  // ── Cleanup Audio au démontage du composant ──────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // ── Machine à états des textes ───────────────────────────────────────────
  useEffect(() => {
    if (!config || textPhase === "complete") return;

    const texts = lang === "fr" ? config.scroll_texts_fr : config.scroll_texts_en;

    if (texts.length === 0 || currentTextIndex >= texts.length) {
      setTextPhase("complete");
      return;
    }

    const fullText = texts[currentTextIndex] || "";
    const effect = config.text_effect || "none";
    let timer: ReturnType<typeof setTimeout>;

    if (textPhase === "entering") {
      if (effect === "typewriter") {
        if (displayedText.length < fullText.length) {
          timer = setTimeout(() => {
            setDisplayedText(fullText.substring(0, displayedText.length + 1));
          }, config.typewriter_speed || 30);  // ✅ AJOUT
        } else {
          timer = setTimeout(() => setTextPhase("holding"), 500);
        }
      } else {
        // Pour les autres effets, on affiche le texte direct et l'animation CSS s'occupe du reste
        setDisplayedText(fullText);
        timer = setTimeout(() => setTextPhase("holding"), 1000); // Temps de l'anim d'entrée
      }
    } else if (textPhase === "holding") {
      const holdTime = (config.text_scroll_speed || 5) * 1000;
      timer = setTimeout(() => setTextPhase("exiting"), holdTime);
    } else if (textPhase === "exiting") {
      timer = setTimeout(() => {
        if (currentTextIndex < texts.length - 1) {
          setCurrentTextIndex((prev) => prev + 1);
          setDisplayedText("");
          setTextPhase("entering");
        } else {
          setTextPhase("complete");
        }
      }, 800); // Temps de l'anim de sortie
    }

    return () => clearTimeout(timer);
  }, [config, currentTextIndex, textPhase, displayedText, lang]);

  // ── Détection de fin ─────────────────────────────────────────────────────
  useEffect(() => {
    if (textPhase === "complete") {
      const timer = setTimeout(() => handleComplete(), 2500);
      return () => clearTimeout(timer);
    }
  }, [textPhase]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleComplete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onComplete();
  };

  const handleSkip = () => {
    if (config?.skip_allowed !== false) handleComplete();
  };

  const handleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      if (!newMuted) {
        audioRef.current.play().catch(() => { });
      }
      setIsMuted(newMuted);
    }
  };

  const handleEnableSound = () => {
    if (audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => { });
      setShowEnableSound(false);
      setIsMuted(false);
    }
  };

  // ── Variantes d'animation de texte ───────────────────────────────────────
  const getTextVariants = (effect: string = "none") => {
    switch (effect) {
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
      case "blur":
        return {
          initial: { opacity: 0, filter: "blur(10px)" },
          animate: { opacity: 1, filter: "blur(0px)" },
          exit: { opacity: 0, filter: "blur(10px)" }
        };
      case "slide":
        return {
          initial: { opacity: 0, y: 50 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -50 }
        };
      case "typewriter":
      case "none":
      default:
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  // ── Rendu chargement ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#D4AF37] font-mono text-sm tracking-widest">CHARGEMENT...</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const scrollTexts = lang === "fr" ? config.scroll_texts_fr : config.scroll_texts_en;
  const finalMessage = lang === "fr"
    ? (config.final_message_fr || "Bonne enquête")
    : (config.final_message_en || "Good investigation");
  const finalIcon = config.final_message_icon || "✦";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
      className="h-[100dvh] w-screen bg-black overflow-hidden relative select-none"
    >
      {/* ── Fond d'écran ────────────────────────────────────────────────── */}
      {config.background_image_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5 }}
          className="absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              backgroundImage: `url(${config.background_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: getFilterStyle(config.visual_filter),
              animation: getKenBurnsAnimation(config.image_effect),
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        </motion.div>
      )}

      {!config.background_image_url && (
        <div className="absolute inset-0 bg-gradient-radial from-gray-900 via-black to-black" />
      )}

      {/* ── Logo Lukeni ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
      >
        <LukeniLogo />
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.4, duration: 1.2, ease: "easeOut" }}
        className="absolute top-[90px] left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent z-20"
      />

      {/* ── Zone centrale : textes cinématiques ─────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-3xl w-full min-h-[150px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {scrollTexts.length > 0 && textPhase !== "complete" && (
              <motion.div
                key={currentTextIndex}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={getTextVariants(config.text_effect)}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-4"
              >
                <h2
                  className="text-2xl md:text-4xl lg:text-5xl font-bold leading-relaxed drop-shadow-2xl"
                  style={{
                    fontFamily: config.text_font || 'serif',
                    color: config.text_color || '#FFFFFF'
                  }}
                >
                  {displayedText}
                  {config.text_effect === "typewriter" && textPhase === "entering" && (
                    <span className="animate-pulse ml-1" style={{ color: config.text_color || '#D4AF37' }}>|</span>
                  )}
                </h2>
              </motion.div>
            )}

            {/* Message de fin configuré */}
            {textPhase === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8 }}
                className="space-y-4"
              >
                <div
                  className="text-xl md:text-3xl tracking-[0.3em] uppercase drop-shadow-lg flex items-center gap-3"
                  style={{
                    fontFamily: config.text_font || 'monospace',
                    color: config.text_color || '#D4AF37'
                  }}
                >
                  <span>{finalIcon}</span>
                  <span>{finalMessage}</span>
                  <span>{finalIcon}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicateurs de progression */}
        {scrollTexts.length > 1 && textPhase !== "complete" && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 items-center">
            {scrollTexts.map((_, idx) => (
              <motion.div
                key={idx}
                animate={{
                  width: idx === currentTextIndex ? 28 : 6,
                  opacity: idx < currentTextIndex ? 0.4 : idx === currentTextIndex ? 1 : 0.2,
                  backgroundColor: idx <= currentTextIndex ? "#D4AF37" : "#ffffff",
                }}
                transition={{ duration: 0.4 }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Contrôles ──────────────────────────────────────────────────────── */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        {config.audio_url && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={handleMute}
            className="p-3 bg-black/40 hover:bg-black/70 backdrop-blur-sm border border-white/10 rounded-full text-white transition-all"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
        )}

        {config.skip_allowed !== false && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={handleSkip}
            className="px-5 py-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-sm border border-white/10 rounded-full text-white text-xs font-mono tracking-widest transition-all flex items-center gap-2"
          >
            <SkipForward size={13} />
            {lang === "fr" ? "PASSER" : "SKIP"}
          </motion.button>
        )}
      </div>

      {/* ── Bouton "Activer le son" ─────────────────────────────────────── */}
      <AnimatePresence>
        {showEnableSound && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.5 }}
            onClick={handleEnableSound}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-black/50 hover:bg-black/80 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full text-[#D4AF37] text-xs font-mono tracking-widest transition-all flex items-center gap-2"
          >
            <Volume2 size={14} />
            {lang === "fr" ? "ACTIVER LE SON" : "ENABLE SOUND"}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Barre de progression ─────────────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/5 z-20">
        <motion.div
          className="h-full bg-gradient-to-r from-[#D4AF37]/60 via-[#D4AF37] to-[#D4AF37]/60"
          initial={{ width: "0%" }}
          animate={{ width: textPhase === "complete" ? "100%" : `${((currentTextIndex + (textPhase !== "entering" ? 1 : 0)) / scrollTexts.length) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </div>

      {/* ── Keyframes Ken Burns ───────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes kenburns-zoom-in {
          0%   { transform: scale(1)   translate(0, 0); }
          100% { transform: scale(1.2) translate(0, 0); }
        }
        @keyframes kenburns-zoom-out {
          0%   { transform: scale(1.2) translate(0, 0); }
          100% { transform: scale(1)   translate(0, 0); }
        }
        @keyframes kenburns-pan-left {
          0%   { transform: scale(1.1) translate(0, 0); }
          100% { transform: scale(1.1) translate(-5%, 0); }
        }
        @keyframes kenburns-pan-right {
          0%   { transform: scale(1.1) translate(-5%, 0); }
          100% { transform: scale(1.1) translate(0, 0); }
        }
        .bg-gradient-radial {
          background: radial-gradient(ellipse at center, #1a1a2e 0%, #000000 70%);
        }
      `}</style>
    </motion.div>
  );
}