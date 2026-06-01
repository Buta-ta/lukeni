"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdBannerProps {
  position: 'hero' | 'between_sections' | 'trending' | 'footer';
  lang?: 'fr' | 'en';
}

interface Ad {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr?: string;
  description_en?: string;
  image_url: string;
  link_url: string;
  position: string;
  active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
}

async function translateText(text: string, from: string, _to: string): Promise<string> {
  if (!text.trim()) return '';
  try {
    // ✅ Route interne — pas de CSP
    const res = await fetch('/api/lingua', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'translate',
        text,
        lang: from, // langue source
      }),
    });
    const json = await res.json();
    return json.result || '';
  } catch {
    return '';
  }
}

export default function AdBanner({ position, lang = 'fr' }: AdBannerProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedDesc, setTranslatedDesc] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset traduction quand langue change ───────────────────────────────────
  useEffect(() => {
    setTranslatedTitle('');
    setTranslatedDesc('');
  }, [lang]);

  // ── Reset traduction quand slide change ────────────────────────────────────
  useEffect(() => {
    setTranslatedTitle('');
    setTranslatedDesc('');
  }, [currentIdx]);

  // ── Fetch ads ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAds() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.error('[AdBanner] error:', error);
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const filtered = (data || []).filter((ad: Ad) => {
        if (ad.position !== position) return false;
        if (ad.starts_at && new Date(ad.starts_at) > now) return false;
        if (ad.ends_at && new Date(ad.ends_at) < now) return false;
        return true;
      });

      setAds(filtered);

      // Track impressions
      filtered.forEach(async (ad: Ad) => {
        try {
          await supabase
            .from('ads')
            .update({ impressions: (ad.impressions ?? 0) + 1 })
            .eq('id', ad.id);
        } catch {}
      });

      setIsLoading(false);
    }
    fetchAds();
  }, [position]);

  // ── Auto-slide ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIdx(p => (p + 1) % ads.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads.length]);

  // ── Ad courant ─────────────────────────────────────────────────────────────
  const ad = ads[currentIdx] ?? null;

  // ── Display values — réactifs à lang ET à currentIdx ──────────────────────
  const displayTitle = useMemo(() => {
    if (translatedTitle) return translatedTitle;
    if (!ad) return '';
    return lang === 'fr'
      ? (ad.title_fr || ad.title_en || '')
      : (ad.title_en || ad.title_fr || '');
  }, [translatedTitle, lang, ad]);

  const displayDesc = useMemo(() => {
    if (translatedDesc) return translatedDesc;
    if (!ad) return '';
    return lang === 'fr'
      ? (ad.description_fr || ad.description_en || '')
      : (ad.description_en || ad.description_fr || '');
  }, [translatedDesc, lang, ad]);

  // ── Traduction auto ────────────────────────────────────────────────────────
  const autoTranslate = useCallback(async () => {
    if (!ad) return;
    setTranslating(true);
    const sourceLang = lang === 'fr' ? 'en' : 'fr';
    const targetLang = lang;

    const sourceTitle = lang === 'fr' ? (ad.title_en || '') : (ad.title_fr || '');
    const sourceDesc = lang === 'fr'
      ? (ad.description_en || '')
      : (ad.description_fr || '');

    const [tTitle, tDesc] = await Promise.all([
      sourceTitle ? translateText(sourceTitle, sourceLang, targetLang) : Promise.resolve(''),
      sourceDesc ? translateText(sourceDesc, sourceLang, targetLang) : Promise.resolve(''),
    ]);

    if (tTitle) setTranslatedTitle(tTitle);
    if (tDesc) setTranslatedDesc(tDesc);
    setTranslating(false);
  }, [ad, lang]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevSlide = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIdx(p => (p - 1 + ads.length) % ads.length);
  }, [ads.length]);

  const nextSlide = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIdx(p => (p + 1) % ads.length);
  }, [ads.length]);

  // ── Click tracking ─────────────────────────────────────────────────────────
  const handleClick = useCallback(async (ad: Ad) => {
    try {
      await supabase
        .from('ads')
        .update({ clicks: (ad.clicks ?? 0) + 1 })
        .eq('id', ad.id);
    } catch {}
    window.open(ad.link_url, '_blank', 'noopener,noreferrer');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-20 rounded-2xl bg-white/[0.02] border border-white/5 
        animate-pulse flex items-center justify-center">
        <span className="text-white/20 text-xs">
          {lang === 'fr' ? 'Chargement…' : 'Loading…'}
        </span>
      </div>
    );
  }

  if (!ads.length || dismissed || !ad) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 group shadow-lg">

      {/* Background */}
      <div className={`absolute inset-0 ${
        position === 'footer'
          ? 'bg-[#0f0f0f]'
          : 'bg-gradient-to-r from-[#D4AF37]/8 via-[#0a0a1a] to-[#020111]'
      }`} />

      {/* Badge Sponsorisé — réactif à lang */}
      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-black/70 
        backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
        <span className="text-[8px] text-gray-300 uppercase tracking-widest font-bold">
          {lang === 'fr' ? 'Sponsorisé' : 'Sponsored'}
        </span>
      </div>

      {/* Actions top-right */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 
        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={autoTranslate}
          disabled={translating}
          className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md 
            border border-white/10 text-[8px] text-white/60 
            hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all 
            font-bold uppercase tracking-wider disabled:opacity-40"
        >
          {translating ? '⏳' : lang === 'fr' ? '🌐 EN' : '🌐 FR'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 rounded-full bg-black/70 backdrop-blur-md 
            border border-white/10 flex items-center justify-center 
            text-white/60 hover:text-white hover:bg-black/90 transition-all"
        >
          <X size={10} />
        </button>
      </div>

      {/* Slide content — réactif à lang via displayTitle/displayDesc */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${ad.id}-${currentIdx}-${lang}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative z-10"
        >
          <button
            onClick={() => handleClick(ad)}
            className="w-full text-left block hover:opacity-95 transition-opacity"
          >
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 
              px-4 py-5 md:px-6 md:py-5 pt-10 md:pt-5">

              {/* Image */}
              {ad.image_url && (
                <div className="w-full md:w-48 h-28 md:h-28 rounded-xl overflow-hidden 
                  shrink-0 border border-white/10 shadow-xl">
                  <img
                    src={ad.image_url}
                    alt={displayTitle}
                    className="w-full h-full object-cover 
                      hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}

              {/* Texte — réactif à lang */}
              <div className="flex-1 text-center md:text-left min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`text-${lang}-${currentIdx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {displayTitle && (
                      <h3 className="text-base md:text-lg font-serif text-white 
                        mb-1.5 leading-snug line-clamp-2">
                        {displayTitle}
                      </h3>
                    )}
                    {displayDesc && (
                      <p className="text-white/50 text-xs md:text-sm mb-3 
                        leading-relaxed line-clamp-2">
                        {displayDesc}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>

                <span className="inline-flex items-center gap-1.5 text-[#D4AF37] 
                  text-xs font-bold">
                  {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
                  <ArrowRight size={13} />
                </span>
              </div>

              {/* Compteur */}
              {ads.length > 1 && (
                <div className="hidden md:flex items-center shrink-0">
                  <span className="text-[9px] text-white/20 font-mono">
                    {currentIdx + 1}/{ads.length}
                  </span>
                </div>
              )}
            </div>
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {ads.length > 1 && (
        <>
          <button onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 
              rounded-full bg-black/70 backdrop-blur-sm border border-white/10 
              flex items-center justify-center text-white 
              opacity-0 group-hover:opacity-100 transition-opacity 
              hover:border-[#D4AF37]/40 hover:text-[#D4AF37]">
            <ChevronLeft size={13} />
          </button>
          <button onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 
              rounded-full bg-black/70 backdrop-blur-sm border border-white/10 
              flex items-center justify-center text-white 
              opacity-0 group-hover:opacity-100 transition-opacity 
              hover:border-[#D4AF37]/40 hover:text-[#D4AF37]">
            <ChevronRight size={13} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setCurrentIdx(i);
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentIdx
                    ? 'w-5 bg-[#D4AF37]'
                    : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}