"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useLiveCounter } from "@/lib/hooks/useLiveCounter";
import { useAudio } from "@/lib/contexts/AudioContext";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";

interface LiveSpot {
  id: string;
  spot_type: "counter" | "weather";
  badge_label_fr: string;
  badge_label_en?: string;
  badge_color: string;
  badge_pulse: boolean;
  region_label_fr: string;
  region_label_en?: string;
  text_fr: string;
  text_en?: string;
  cover_url?: string;
  target_url?: string;

  counter_type?: string;
  counter_unit_fr?: string;
  counter_unit_en?: string;
  period_type?: string;
  period_total?: number;
  period_start_at?: string;
  start_value?: number;
  decimals?: number;

  weather_city_fr?: string;
  weather_city_en?: string;
  weather_country_code?: string;
  last_weather_temp?: number;
  last_weather_condition?: string;
  last_weather_icon?: string;
  last_weather_fetched_at?: string;
}

interface SiteSettings {
  live_spot_enabled: boolean;
  live_spot_position: string;
  live_spot_rotation_duration: number;
}

const POSITION_STYLES: Record<string, string> = {
  sidebar_right: "fixed right-6 top-1/2 -translate-y-1/2 w-56",
  sidebar_left: "fixed left-6 top-1/2 -translate-y-1/2 w-56",
  bottom_bar: "fixed bottom-0 left-0 right-0",
  floating_bottom_right: "fixed bottom-6 right-6 w-56",
  floating_bottom_left: "fixed bottom-6 left-6 w-56",
  top_bar: "fixed top-0 left-0 right-0",
};

export default function LiveSpotWidget() {
  const supabase = createClient();
  const pathname = usePathname();
  const { currentTrack } = useAudio();
  const { lang } = useLanguage();

  const [spots, setSpots] = useState<LiveSpot[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlockingActive, setIsBlockingActive] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isGameRoute =
    pathname?.startsWith("/investigations/") && pathname !== "/investigations";

  const currentSpot = spots[currentIndex];
  const counterConfig =
    currentSpot?.spot_type === "counter"
      ? {
          periodTotal: currentSpot.period_total || 0,
          periodStartAt:
            currentSpot.period_start_at || new Date().toISOString(),
          startValue: currentSpot.start_value || 0,
          periodType: (currentSpot.period_type || "day") as
            | "day"
            | "month"
            | "year",
          decimals: currentSpot.decimals || 0,
        }
      : null;

  const counterValue = useLiveCounter(counterConfig);

  useEffect(() => {
    async function loadData() {
      const { data: announcement } = await supabase
        .from("global_announcements")
        .select("is_blocking")
        .eq("is_active", true)
        .eq("is_blocking", true)
        .maybeSingle();

      if (announcement) {
        setIsBlockingActive(true);
        setIsLoading(false);
        return;
      }

      const { data: settingsData } = await supabase
        .from("site_settings")
        .select(
          "live_spot_enabled, live_spot_position, live_spot_rotation_duration",
        )
        .eq("id", 1)
        .single();

      setSettings(
        settingsData || {
          live_spot_enabled: false,
          live_spot_position: "sidebar_right",
          live_spot_rotation_duration: 6,
        },
      );

      if (!settingsData?.live_spot_enabled) {
        setIsLoading(false);
        return;
      }

      const { data: spotsData } = await supabase
        .from("live_spots")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      setSpots(spotsData || []);
      setIsLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!spots.length || spots.length === 1 || isPaused || isCollapsed) return;

    const duration = (settings?.live_spot_rotation_duration || 6) * 1000;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spots.length);
    }, duration);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [spots.length, isPaused, isCollapsed, settings]);

  useEffect(() => {
    if (!currentSpot || currentSpot.spot_type !== "weather") return;

    const lastFetch = currentSpot.last_weather_fetched_at
      ? new Date(currentSpot.last_weather_fetched_at).getTime()
      : 0;
    const now = Date.now();
    const twentyMinutes = 20 * 60 * 1000;

    if (now - lastFetch > twentyMinutes) {
      fetch("/api/live-spots/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: currentSpot.weather_city_fr,
          countryCode: currentSpot.weather_country_code || "",
          spotId: currentSpot.id,
        }),
      });
    }
  }, [currentSpot]);

  const handleSpotClick = async () => {
    if (!currentSpot?.id) return;

    console.log('🖱️ Clic détecté sur spot:', currentSpot.id);

    // 1. Tracker le clic
    try {
      const res = await fetch('/api/live-spots/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotId: currentSpot.id })
      });
      
      const data = await res.json();
      console.log('📊 Réponse API:', data);
    } catch (err) {
      console.error('❌ Erreur tracking clic:', err);
    }

    // 2. Ouvrir le lien seulement s'il existe
    if (currentSpot.target_url) {
      window.open(currentSpot.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = () => {
    setIsCollapsed(true);
    sessionStorage.setItem("lukeni_live_spot_collapsed", "true");
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    sessionStorage.removeItem("lukeni_live_spot_collapsed");
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + spots.length) % spots.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % spots.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (isLoading) return null;
  if (isBlockingActive) return null;
  if (isGameRoute) return null;
  if (!settings?.live_spot_enabled) return null;
  if (!spots.length) return null;

  const position = settings.live_spot_position;
  const baseStyles =
    POSITION_STYLES[position] || POSITION_STYLES["sidebar_right"];

  let bottomOffset = 0;
  if (
    currentTrack &&
    (position === "bottom_bar" || position.includes("bottom"))
  ) {
    bottomOffset = 76;
  }

  // 👇 CALCUL DE LANGUE GARANTI CHAQUE RENDER
  const badgeLabel =
    lang === "en" && currentSpot?.badge_label_en
      ? currentSpot.badge_label_en
      : currentSpot?.badge_label_fr || "";

  const regionLabel =
    lang === "en" && currentSpot?.region_label_en
      ? currentSpot.region_label_en
      : currentSpot?.region_label_fr || "";

  const textContent =
    lang === "en" && currentSpot?.text_en
      ? currentSpot.text_en
      : currentSpot?.text_fr || "";

  const counterUnit =
    currentSpot?.spot_type === "counter"
      ? lang === "en" && currentSpot?.counter_unit_en
        ? currentSpot.counter_unit_en
        : currentSpot?.counter_unit_fr || ""
      : "";

  const weatherCityLabel =
    lang === "en" && currentSpot?.weather_city_en
      ? currentSpot.weather_city_en
      : currentSpot?.weather_city_fr || "";

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US").format(num);
  };

  const getCounterIcon = () => {
    switch (currentSpot?.counter_type) {
      case "births":
        return <TrendingUp size={12} className="text-green-400" />;
      case "deaths":
        return <TrendingDown size={12} className="text-red-400" />;
      case "economic":
        return <DollarSign size={12} className="text-yellow-400" />;
      default:
        return null;
    }
  };

  // 👇 TIROIR COLLÉ AU BORD DROIT (remplace le bouton rond)
  if (isCollapsed) {
    return (
      <motion.button
        initial={{ x: 100 }}
        animate={{ x: 0 }}
        onClick={handleExpand}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[900] group"
        whileHover={{ x: -5 }}
      >
        <div
          className="relative w-12 h-20 rounded-l-2xl shadow-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
          style={{
            backgroundColor: currentSpot?.badge_color + "30",
            border: `2px solid ${currentSpot?.badge_color}60`,
            borderRight: "none",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Icône du spot */}
          <motion.div
            animate={currentSpot?.badge_pulse ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {currentSpot?.spot_type === "weather" ? (
              <Thermometer
                size={18}
                style={{ color: currentSpot?.badge_color }}
              />
            ) : (
              getCounterIcon()
            )}
          </motion.div>

          {/* Badge label */}
          <span
            className="text-[8px] font-bold uppercase tracking-wider text-center leading-tight px-1"
            style={{ color: currentSpot?.badge_color }}
          >
            {badgeLabel}
          </span>

          {/* Pastille pulsante */}
          <motion.div
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ backgroundColor: currentSpot?.badge_color }}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: position.includes("right")
          ? 50
          : position.includes("left")
            ? -50
            : 0,
        y: position.includes("top")
          ? -50
          : position.includes("bottom")
            ? 50
            : 0,
      }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className={`${baseStyles} z-[900] ${position === "bottom_bar" || position === "top_bar" ? "" : "max-w-xs"}`}
      style={{
        bottom: position.includes("bottom") ? `${bottomOffset}px` : undefined,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-[#020111]/95 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-xl">
        {/* Cover Image - Visible */}
        {currentSpot?.cover_url && (
          <div className="relative h-20 overflow-hidden">
            <img
              src={currentSpot.cover_url}
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#020111]" />
          </div>
        )}

        <div className="relative p-3.5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
              style={{
                backgroundColor: currentSpot?.badge_color + "20",
                color: currentSpot?.badge_color,
                border: `1px solid ${currentSpot?.badge_color}40`,
              }}
              animate={currentSpot?.badge_pulse ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {currentSpot?.spot_type === "weather" ? (
                <Thermometer size={9} />
              ) : (
                getCounterIcon()
              )}
              <span>{badgeLabel}</span>
            </motion.div>

            <button
              onClick={handleClose}
              className="p-1 text-white/40 hover:text-white rounded transition-colors flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>

          {/* Région & Texte */}
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5 leading-none">
              {regionLabel}
            </p>
            <p className="text-white text-xs leading-tight">{textContent}</p>
          </div>

          {/* Contenu dynamique */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSpot?.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white/[0.04] rounded-lg p-3 border border-white/8"
            >
              {currentSpot?.spot_type === "counter" ? (
                <div className="text-center">
                  <motion.p
                    className="text-3xl font-bold mb-1"
                    style={{ color: currentSpot?.badge_color }}
                    key={counterValue}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                  >
                    {formatNumber(counterValue)}
                  </motion.p>
                  {counterUnit && (
                    <p className="text-white/35 text-[9px] uppercase tracking-wider">
                      {counterUnit}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {currentSpot?.last_weather_icon && (
                    <img
                      src={`https://openweathermap.org/img/wn/${currentSpot.last_weather_icon}@2x.png`}
                      alt="Weather"
                      className="w-12 h-12 -my-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-white">
                      {currentSpot?.last_weather_temp}°
                    </p>
                    <p className="text-white/40 text-[9px] capitalize truncate">
                      {currentSpot?.last_weather_condition}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

                   {/* Action button - Toujours visible pour tracker le clic */}
          <button
            onClick={handleSpotClick}
            className="w-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold py-2 rounded-lg transition-colors"
          >
            {currentSpot?.target_url 
              ? (lang === 'fr' ? 'En savoir plus' : 'Learn more') 
              : (lang === 'fr' ? 'Voir les détails' : 'View details')
            }
          </button>

          {/* Navigation */}
          {spots.length > 1 && (
            <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
              <button
                onClick={goToPrevious}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <ChevronLeft size={12} />
              </button>

              <span className="text-white/40 text-[9px] font-mono">
                {currentIndex + 1}/{spots.length}
              </span>

              <button
                onClick={goToNext}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {spots.length > 1 && !isPaused && (
          <div className="h-0.5 bg-white/5">
            <motion.div
              className="h-full"
              style={{ backgroundColor: currentSpot?.badge_color }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: settings?.live_spot_rotation_duration || 6,
                ease: "linear",
              }}
              key={currentIndex}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
