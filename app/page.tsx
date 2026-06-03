// app/page.tsx (Landing Page)
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Globe, X, ArrowRight,
  CalendarDays, Volume2, VolumeX, Clock, Sparkles, Zap, Moon,
  SkipBack, SkipForward, Loader2, BookOpen, Music
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

import { useInternetArchive } from '@/lib/hooks/useInternetArchive';
import { useSemanticScholar } from '@/lib/hooks/useSemanticScholar';
import { useCoreApi } from '@/lib/hooks/useCoreApi';
import { useArxiv } from '@/lib/hooks/useArxiv';
import { ArchiveSection } from '@/components/ArchiveSection';
import { ScholarSection } from '@/components/ScholarSection';
import { CoreSection } from '@/components/CoreSection';
import { ArxivSection } from '@/components/ArxivSection';
import { PWAInstallButton } from '@/components/PWAInstallButton';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Personality {
  id: string;
  name_fr: string;
  name_en: string;
  short_bio_fr: string;
  short_bio_en: string;
  image_url: string | null;
  card_color: string;
  slug: string;
  birth_year?: number;
  death_year?: number;
  domain?: string;
}

interface CosmicStar {
  id: string;
  star_color: string;
  is_shooting: boolean;
  position_x: number;
  position_y: number;
  star_size: number;
  personalities: Personality;
}

interface FeaturedEvent {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  year: number;
  country: string;
  slug: string;
  event_month?: number;
  event_day?: number;
}

interface Suggestion {
  text_fr: string;
  text_en: string;
}

interface Quote {
  id: string;
  text_fr: string;
  text_en: string;
  author_fr: string;
  author_en: string;
}

interface Nebula {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  label_fr: string;
  label_en: string;
}

interface MusicTrack {
  id: string;
  title_fr: string;
  title_en: string;
  artist_fr: string;
  artist_en: string;
  audio_url: string;
  cover_url?: string;
  status: string;
}

interface LukeniSearchResult {
  id: string;
  type: 'article' | 'personality';
  title_fr: string;
  title_en: string;
  summary_fr: string;
  summary_en: string;
  image_url?: string;
  slug: string;
  categories?: { color: string; name_fr: string; name_en: string };
}

interface WikiResult {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  pageid: number;
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useLang() {
  const [lang, setLangState] = useState<'fr' | 'en'>('fr');
  useEffect(() => {
    const stored = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (stored === 'fr' || stored === 'en') setLangState(stored);
  }, []);
  const setLang = useCallback((l: 'fr' | 'en') => {
    setLangState(l);
    localStorage.setItem('lukeni_lang', l);
  }, []);
  return [lang, setLang] as const;
}

function getMoonPhase(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let c = 365.25 * year;
  let e = 30.6 * month;
  let jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  let b = Math.floor(jd);
  jd -= b;
  b = Math.round(jd * 8);
  if (b >= 8) b = 0;
  const illumination = (1 - Math.cos(jd * 2 * Math.PI)) / 2;
  const phases = [
    { phase: 'new', name_fr: 'Nouvelle Lune', name_en: 'New Moon' },
    { phase: 'waxing_crescent', name_fr: 'Premier Croissant', name_en: 'Waxing Crescent' },
    { phase: 'first_quarter', name_fr: 'Premier Quartier', name_en: 'First Quarter' },
    { phase: 'waxing_gibbous', name_fr: 'Gibbeuse Croissante', name_en: 'Waxing Gibbous' },
    { phase: 'full', name_fr: 'Pleine Lune', name_en: 'Full Moon' },
    { phase: 'waning_gibbous', name_fr: 'Gibbeuse Décroissante', name_en: 'Waning Gibbous' },
    { phase: 'last_quarter', name_fr: 'Dernier Quartier', name_en: 'Last Quarter' },
    { phase: 'waning_crescent', name_fr: 'Dernier Croissant', name_en: 'Waning Crescent' },
  ];
  return { ...phases[b], illumination: Math.round(illumination * 100) };
}

function useWikipediaSearch(query: string, lang: 'fr' | 'en', enabled: boolean) {
  const [results, setResults] = useState<WikiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, WikiResult[]>>(new Map());

  useEffect(() => {
    if (!enabled || query.length < 3) { setResults([]); return; }
    const key = `${lang}:${query}`;
    if (cacheRef.current.has(key)) { setResults(cacheRef.current.get(key)!); return; }
    const t = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://${lang}.wikipedia.org/w/api.php?` +
          new URLSearchParams({ action: 'opensearch', search: query, limit: '3', namespace: '0', format: 'json', origin: '*' }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );
        if (!res.ok) { setResults([]); setIsLoading(false); return; }
        const data = await res.json();
        const titles: string[] = data[1] || [];
        const descriptions: string[] = data[2] || [];
        if (!titles.length) { setResults([]); setIsLoading(false); return; }
        const detailsRes = await fetch(
          `https://${lang}.wikipedia.org/w/api.php?` +
          new URLSearchParams({ action: 'query', titles: titles.join('|'), prop: 'pageimages|extracts', piprop: 'thumbnail', pithumbsize: '200', exintro: 'true', exchars: '150', explaintext: 'true', format: 'json', origin: '*' }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );
        if (!detailsRes.ok) { setResults([]); setIsLoading(false); return; }
        const detailsData = await detailsRes.json();
        const pages = detailsData.query?.pages || {};
        const mapped: WikiResult[] = titles
          .map((title: string, idx: number) => {
            const page = Object.values(pages).find((p: any) => p.title === title) as any;
            return { title, extract: descriptions[idx] || page?.extract || '', thumbnail: page?.thumbnail ? { source: page.thumbnail.source } : undefined, pageid: page?.pageid || 0 };
          })
          .filter((r: WikiResult) => r.pageid > 0);
        cacheRef.current.set(key, mapped);
        setResults(mapped);
      } catch { setResults([]); }
      finally { setIsLoading(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [query, lang, enabled]);

  return { results, isLoading };
}

function useLukeniSearch(query: string, lang: 'fr' | 'en', geoCountry: string | null, enabled: boolean) {
  const [results, setResults] = useState<LukeniSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, LukeniSearchResult[]>>(new Map());

  useEffect(() => {
    if (!enabled || query.length < 2) { setResults([]); return; }
    const key = `${lang}:${query}:${geoCountry || 'all'}`;
    if (cacheRef.current.has(key)) { setResults(cacheRef.current.get(key)!); return; }
    const t = setTimeout(async () => {
      setIsLoading(true);
      try {
        const q = query.toLowerCase();
        let artQuery = supabase
          .from('articles')
          .select('id, title_fr, title_en, summary_fr, summary_en, image_url, slug, categories(color, name_fr, name_en)')
          .eq('status', 'published')
          .or(`title_fr.ilike.%${q}%,title_en.ilike.%${q}%,summary_fr.ilike.%${q}%`)
          .limit(4);
        let persQuery = supabase
          .from('personalities')
          .select('id, name_fr, name_en, short_bio_fr, short_bio_en, image_url, slug')
          .or(`name_fr.ilike.%${q}%,name_en.ilike.%${q}%`)
          .limit(3);
        if (geoCountry) artQuery = artQuery.ilike('summary_fr', `%${geoCountry}%`);
        const [artResult, persResult] = await Promise.all([artQuery, persQuery]);
        const articles = (artResult.data || []).map((a: any) => ({
          id: a.id, type: 'article' as const,
          title_fr: a.title_fr, title_en: a.title_en,
          summary_fr: a.summary_fr, summary_en: a.summary_en,
          image_url: a.image_url, slug: a.slug, categories: a.categories,
        }));
        const personalities = (persResult.data || []).map((p: any) => ({
          id: p.id, type: 'personality' as const,
          title_fr: p.name_fr, title_en: p.name_en,
          summary_fr: p.short_bio_fr, summary_en: p.short_bio_en,
          image_url: p.image_url, slug: p.slug,
        }));
        const all: LukeniSearchResult[] = [...articles, ...personalities];
        cacheRef.current.set(key, all);
        setResults(all);
      } catch { setResults([]); }
      finally { setIsLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query, lang, geoCountry, enabled]);

  return { results, isLoading };
}

// ─── ICÔNE CAURIS ─────────────────────────────────────────────────────────────

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="caurisGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path fill="url(#caurisGlow)" d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── NÉBULEUSES ───────────────────────────────────────────────────────────────

const NEBULAE: Nebula[] = [
  { id: 1, x: 20, y: 25, size: 280, color: '#9370DB', label_fr: 'Artistes & Créateurs', label_en: 'Artists & Creators' },
  { id: 2, x: 65, y: 45, size: 250, color: '#FF6B9D', label_fr: 'Révolutionnaires', label_en: 'Revolutionaries' },
  { id: 3, x: 40, y: 70, size: 220, color: '#20B2AA', label_fr: 'Penseurs & Érudits', label_en: 'Thinkers & Scholars' },
];

// ─── HELPER ───────────────────────────────────────────────────────────────────

function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    .replace(/\{##[0-9A-Fa-f]*\}/gi, '')
    .replace(/\{\/\}/g, '')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([\s\S]+?)\*/g, '$1');
}

// ─── COMPOSANT LUNE ───────────────────────────────────────────────────────────

const MoonComponent = ({
  lang, isOrganic, secretMode, isMobile,
}: {
  lang: 'fr' | 'en'; isOrganic: boolean; secretMode: boolean; isMobile: boolean;
}) => {
  const [moonPhase] = useState(getMoonPhase());
  const [moonMousePos, setMoonMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMoonMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  const moonBaseColor = secretMode ? '#2a0a0a' : isOrganic ? '#f5deb3' : '#e8e8e8';
  const moonHighlight = secretMode ? '#5a1a1a' : isOrganic ? '#ffe4b5' : '#ffffff';
  const moonShadow = secretMode ? '#0a0000' : isOrganic ? '#d4a574' : '#a8a8a8';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -100 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: isMobile ? 0 : moonMousePos.x,
        y: isMobile ? 0 : moonMousePos.y,
      }}
      transition={{
        opacity: { duration: 1.5, delay: 2 },
        scale: { duration: 1.5, delay: 2, ease: 'easeOut' },
        x: { type: 'spring', stiffness: 30, damping: 25 },
        y: { type: 'spring', stiffness: 30, damping: 25 },
      }}
      className="fixed z-20 group
        bottom-4 right-4
        md:bottom-auto md:top-24 md:right-12 md:z-40"
    >
      {/* Glow externe */}
      <motion.div
        className="absolute rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: isMobile ? 0.15 : [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: isMobile ? '100px' : '200px',
          height: isMobile ? '100px' : '200px',
          left: isMobile ? '-15px' : '-35px',
          top: isMobile ? '-15px' : '-35px',
          background: secretMode
            ? 'radial-gradient(circle, rgba(139,0,0,0.3) 0%, transparent 70%)'
            : isOrganic
              ? 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Corps lunaire */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        className="relative rounded-full overflow-hidden cursor-default
          w-12 h-12
          md:w-28 md:h-28"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${moonHighlight} 0%, ${moonBaseColor} 45%, ${moonShadow} 100%)`,
          boxShadow: isMobile
            ? `0 0 20px rgba(255,255,255,0.1), inset -8px -8px 20px rgba(0,0,0,0.3)`
            : secretMode
              ? '0 0 40px rgba(139,0,0,0.6), 0 0 80px rgba(139,0,0,0.3), inset -15px -15px 50px rgba(0,0,0,0.6)'
              : isOrganic
                ? '0 0 40px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.2), inset -15px -15px 50px rgba(0,0,0,0.3)'
                : '0 0 50px rgba(255,255,255,0.3), 0 0 100px rgba(255,255,255,0.15), inset -20px -20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Cratères */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <defs>
            <radialGradient id="c1"><stop offset="0%" stopColor="rgba(0,0,0,0.5)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
            <radialGradient id="c2"><stop offset="0%" stopColor="rgba(0,0,0,0.35)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
          </defs>
          <circle cx="28" cy="22" r="10" fill="url(#c1)" opacity="0.6" />
          <circle cx="68" cy="38" r="14" fill="url(#c1)" opacity="0.7" />
          <circle cx="42" cy="68" r="8" fill="url(#c2)" opacity="0.5" />
          <circle cx="78" cy="70" r="11" fill="url(#c1)" opacity="0.6" />
          <circle cx="18" cy="58" r="6" fill="url(#c2)" opacity="0.5" />
          <ellipse cx="40" cy="50" rx="18" ry="22" fill="rgba(0,0,0,0.15)" opacity="0.4" />
        </svg>
        {/* Phase */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: moonPhase.phase.includes('waning')
              ? `linear-gradient(90deg, rgba(0,0,0,0.85) ${100 - moonPhase.illumination}%, transparent ${Math.max(100 - moonPhase.illumination - 10, 0)}%)`
              : `linear-gradient(270deg, rgba(0,0,0,0.85) ${100 - moonPhase.illumination}%, transparent ${Math.max(100 - moonPhase.illumination - 10, 0)}%)`,
            borderRadius: '50%',
          }}
          animate={{ opacity: [0.95, 1, 0.95] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Tooltip hover — masqué sur mobile */}
      {!isMobile && (
        <div className="absolute pointer-events-none bg-black/95 border border-[#D4AF37]/30 rounded-xl px-3 py-2.5 backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap
        top-full mt-5 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 mb-1.5">
            <Moon size={13} className="text-[#D4AF37] flex-shrink-0" />
            <p className="text-[#D4AF37] text-xs font-bold">
              {lang === 'fr' ? moonPhase.name_fr : moonPhase.name_en}
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#D4AF37] rounded-full transition-all" style={{ width: `${moonPhase.illumination}%` }} />
            </div>
            <span className="text-[#D4AF37] font-bold text-xs">{moonPhase.illumination}%</span>
          </div>
          <p className="text-white/40 text-[9px] mt-1.5 italic text-center">
            {lang === 'fr' ? '🌙 Témoin de l\'histoire' : '🌙 Witness of history'}
          </p>
        </div>
      )}

      {/* Étoiles autour — desktop uniquement */}
      {!isMobile && [...Array(6)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-white rounded-full pointer-events-none"
          style={{ left: `${10 + i * 18}%`, top: `${i % 2 === 0 ? -15 : 110}%`, boxShadow: '0 0 4px rgba(255,255,255,0.8)' }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  );
};

// ─── COMPOSANT : DROPDOWN RECHERCHE ───────────────────────────────────────────

const SearchDropdown = ({
  searchValue, lang, isFocused,
  lukeniResults, lukeniLoading, geoCountry,
  wikiResults, wikiLoading,
  onClose,
}: {
  searchValue: string; lang: 'fr' | 'en'; isFocused: boolean;
  lukeniResults: LukeniSearchResult[]; lukeniLoading: boolean; geoCountry: string | null;
  wikiResults: WikiResult[]; wikiLoading: boolean;
  onClose: () => void;
}) => {
  const showExternalApis = searchValue.length >= 3;
  const { results: archiveResults, isLoading: archiveLoading } = useInternetArchive(searchValue, showExternalApis);
  const { results: scholarResults, isLoading: scholarLoading } = useSemanticScholar(searchValue, showExternalApis);
  const { results: coreResults, isLoading: coreLoading } = useCoreApi(searchValue, showExternalApis);
  const { results: arxivResults, isLoading: arxivLoading } = useArxiv(searchValue, undefined, showExternalApis);

  const hasLukeni = lukeniResults.length > 0;
  const hasWiki = wikiResults.length > 0;
  const hasArchive = Object.values(archiveResults).some((arr) => arr.length > 0);
  const hasScholar = scholarResults.length > 0;
  const hasCore = coreResults.length > 0;
  const hasArxiv = arxivResults.length > 0;
  const anyLoading = lukeniLoading || wikiLoading || archiveLoading || scholarLoading || coreLoading || arxivLoading;

  const isVisible =
    isFocused &&
    searchValue.length >= 2 &&
    (hasLukeni || hasWiki || hasArchive || hasScholar || hasCore || hasArxiv || anyLoading);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full mt-3 left-0 right-0 bg-[#0d0d1a]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[110] max-h-[60vh] overflow-y-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {anyLoading && !hasLukeni && !hasWiki && !hasArchive && !hasScholar && !hasCore && !hasArxiv && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-500 text-sm">
              <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
              <span>{lang === 'fr' ? 'Recherche en cours...' : 'Searching...'}</span>
            </div>
          )}

          {hasLukeni && (
            <div>
              <div className="px-4 py-2.5 bg-[#D4AF37]/5 border-b border-white/5 flex items-center gap-2 sticky top-0 z-10">
                <CaurisIcon className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase">
                  {lang === 'fr' ? 'Lukeni — Notre encyclopédie' : 'Lukeni — Our encyclopedia'}
                </span>
                {lukeniLoading && <Loader2 size={10} className="animate-spin text-[#D4AF37] ml-auto" />}
              </div>
              {lukeniResults.map((result) => {
                const title = lang === 'fr' ? result.title_fr : result.title_en;
                const summary = lang === 'fr' ? result.summary_fr : result.summary_en;
                const href = result.type === 'article' ? `/encyclopedie/${result.slug}` : `/personnalites/${result.slug}`;
                return (
                  <Link key={`${result.type}-${result.id}`} href={href} onClick={onClose}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#D4AF37]/10 transition-colors group border-b border-white/[0.03]">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                      {result.image_url
                        ? <img src={result.image_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                          {result.type === 'article' ? <BookOpen size={14} className="text-[#D4AF37]" /> : <span className="text-[#D4AF37] text-xs">★</span>}
                        </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold leading-tight mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-2">{stripFormatting(title)}</p>
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{stripFormatting(summary)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {result.type === 'article'
                          ? <span className="text-[8px] text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded font-mono uppercase">Article</span>
                          : <span className="text-[8px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded font-mono uppercase">Personnalité</span>}
                        {result.type === 'article' && result.categories && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${result.categories.color}20`, color: result.categories.color }}>
                            {lang === 'fr' ? result.categories.name_fr : result.categories.name_en}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-700 group-hover:text-[#D4AF37] transition-colors flex-shrink-0 mt-1" />
                  </Link>
                );
              })}
            </div>
          )}

          {hasWiki && (
            <div>
              <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] border-t border-white/[0.06] flex items-center gap-2 sticky top-0 z-10">
                <Globe size={11} className="text-gray-500" />
                <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">Wikipedia</span>
                {wikiLoading && <Loader2 size={10} className="animate-spin text-gray-600 ml-auto" />}
              </div>
              {wikiResults.map((w) => (
                <Link key={`wiki-${w.pageid}`} href={`/encyclopedie/wiki/${w.pageid}?lang=${lang}`} onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group border-b border-white/[0.03] last:border-0">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {w.thumbnail?.source
                      ? <img src={w.thumbnail.source} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Globe size={14} className="text-gray-700" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium truncate group-hover:text-white transition-colors">{w.title}</p>
                    <p className="text-gray-700 text-xs truncate">{w.extract}</p>
                  </div>
                  <span className="text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono flex-shrink-0">Wiki</span>
                </Link>
              ))}
            </div>
          )}

          <ArchiveSection type="texts" items={archiveResults.texts} lang={lang} />
          <ArchiveSection type="image" items={archiveResults.image} lang={lang} />
          <ArchiveSection type="audio" items={archiveResults.audio} lang={lang} />
          <ArchiveSection type="movies" items={archiveResults.movies} lang={lang} />
          <ScholarSection items={scholarResults} lang={lang} />
          <CoreSection items={coreResults} lang={lang} />
          <ArxivSection items={arxivResults} lang={lang} />

          <div className="px-4 py-2 border-t border-white/[0.05] bg-[#0d0d1a] sticky bottom-0">
            <p className="text-[9px] text-gray-700 text-center">
              {lang === 'fr' ? '✨ Les résultats Lukeni apparaissent en premier' : '✨ Lukeni results appear first'}
            </p>
            {geoCountry && (
              <p className="text-[9px] text-[#D4AF37]/60 text-center mt-1">
                📍 {lang === 'fr' ? 'Filtré par' : 'Filtered by'}: {geoCountry}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── COMPOSANT : ÉVÉNEMENTS FEATURED ─────────────────────────────────────────

const FeaturedEventsBar = ({
  events, lang, onEventClick,
}: {
  events: FeaturedEvent[]; lang: 'fr' | 'en';
  onEventClick: (e: FeaturedEvent) => void;
}) => {
  if (!events.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1 }}
      className="mt-4 flex flex-wrap justify-center gap-2"
    >
      {events.map((event, i) => {
        const yearsAgo = new Date().getFullYear() - event.year;
        return (
          <motion.button
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 + i * 0.08 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onEventClick(event)}
            className="flex items-center gap-2.5 bg-white/[0.04] border border-white/10 hover:border-[#D4AF37]/40 hover:bg-white/[0.07] px-3 md:px-4 py-2 md:py-2.5 rounded-full backdrop-blur-md group transition-all"
          >
            <CalendarDays size={12} className="text-[#D4AF37] flex-shrink-0" />
            <span className="text-white/60 text-xs font-light">
              {yearsAgo > 0 ? (lang === 'fr' ? `Il y a ${yearsAgo} ans` : `${yearsAgo} years ago`) : event.year.toString()}
            </span>
            <span className="text-white/30 text-xs">—</span>
            <span className="text-white group-hover:text-[#D4AF37] transition-colors text-xs font-medium max-w-[140px] md:max-w-[200px] truncate">
              {lang === 'fr' ? event.title_fr : event.title_en}
            </span>
            <ArrowRight size={11} className="text-white/30 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </motion.button>
        );
      })}
    </motion.div>
  );
};

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function LandingPage() {
  const [lang, setLang] = useLang();
  const router = useRouter();
  const [isOrganic, setIsOrganic] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [activeStar, setActiveStar] = useState<Personality | null>(null);
  const [activeFeaturedEvent, setActiveFeaturedEvent] = useState<FeaturedEvent | null>(null);

  const [rawSuggestions, setRawSuggestions] = useState<Suggestion[]>([]);
  const [cosmicStars, setCosmicStars] = useState<CosmicStar[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [musicQueue, setMusicQueue] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [secretMode, setSecretMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [geoCountry, setGeoCountry] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUserSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const debouncedSearch = useDebounce(searchValue, 300);
  const suggestions = useMemo(
    () => rawSuggestions.map(item => (lang === 'fr' ? item.text_fr : item.text_en)),
    [rawSuggestions, lang]
  );
  const currentTrack = musicQueue[currentTrackIndex] || null;

  const { results: lukeniResults, isLoading: lukeniLoading } =
    useLukeniSearch(debouncedSearch, lang, geoCountry, isFocused && debouncedSearch.length >= 2);
  const { results: wikiResults, isLoading: wikiLoading } =
    useWikipediaSearch(debouncedSearch, lang, isFocused && debouncedSearch.length >= 3);

  useEffect(() => {
    setIsMounted(true);
    setIsMobile(window.matchMedia('(pointer: coarse)').matches);

    async function loadData() {
      setIsLoading(true);
      const [sugResult, starsResult, featuredResult, quotesResult, musicResult] = await Promise.all([
        supabase.from('search_suggestions').select('text_fr, text_en').eq('is_active', true),
        supabase.from('cosmic_stars').select('*, personalities(*)').eq('is_active', true),
        supabase
          .from('events')
          .select('id, title_fr, title_en, description_fr, description_en, year, country, slug, event_month, event_day')
          .eq('featured_on_landing', true)
          .eq('status', 'published')
          .order('year', { ascending: false })
          .limit(5),
        supabase.from('quotes').select('*').eq('is_active', true).limit(5),
        supabase.from('music_tracks').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(50),
      ]);
      if (sugResult.data) setRawSuggestions(sugResult.data as Suggestion[]);
      if (starsResult.data) setCosmicStars(starsResult.data as unknown as CosmicStar[]);
      if (featuredResult.data) setFeaturedEvents(featuredResult.data as unknown as FeaturedEvent[]);
      if (quotesResult.data) setQuotes(quotesResult.data as Quote[]);
      if (musicResult.data) {
        setMusicQueue(musicResult.data as MusicTrack[]);
        if (musicResult.data.length > 0) setCurrentTrackIndex(Math.floor(Math.random() * musicResult.data.length));
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (isMobile) {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
        const y = Math.max(-1, Math.min(1, (e.beta || 0) / 90));
        setMousePos({ x: x * 0.5, y: y * 0.3 });
      };
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const req = () => {
          (DeviceOrientationEvent as any).requestPermission()
            .then((s: string) => { if (s === 'granted') window.addEventListener('deviceorientation', handleOrientation); })
            .catch(console.error);
          window.removeEventListener('touchstart', req);
        };
        window.addEventListener('touchstart', req, { once: true });
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
      const handleTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        setMousePos({ x: (t.clientX / window.innerWidth - 0.5) * 0.8, y: (t.clientY / window.innerHeight - 0.5) * 0.8 });
      };
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('touchmove', handleTouchMove);
      };
    } else {
      let rafId: number;
      const handleMouseMove = (e: MouseEvent) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
        });
      };
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => { window.removeEventListener('mousemove', handleMouseMove); if (rafId) cancelAnimationFrame(rafId); };
    }
  }, [isMounted, isMobile]);

  useEffect(() => {
    if (!audioRef.current || musicQueue.length === 0 || !currentTrack) return;
    audioRef.current.src = currentTrack.audio_url;
    audioRef.current.volume = 0.12;
    if (soundEnabled) { audioRef.current.play().catch(() => { }); setIsPlayingMusic(true); }
    else { audioRef.current.pause(); setIsPlayingMusic(false); }
  }, [soundEnabled, currentTrack, musicQueue.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => handleNextTrack();
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentTrackIndex, musicQueue.length]);

  useEffect(() => {
    if (isFocused || searchValue) return;
    const interval = setInterval(() => setPlaceholderIndex(prev => (prev + 1) % (suggestions.length || 1)), 3500);
    return () => clearInterval(interval);
  }, [isFocused, searchValue, suggestions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
      }
      if (e.key === 'Escape') { setActiveStar(null); setActiveFeaturedEvent(null); setIsFocused(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let idx = 0;
    const handler = (e: KeyboardEvent) => {
      if (e.key === konamiCode[idx]) { idx++; if (idx === konamiCode.length) { setSecretMode(true); setTimeout(() => setSecretMode(false), 5000); idx = 0; } }
      else idx = 0;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) router.push(`/encyclopedie?q=${encodeURIComponent(searchValue.trim())}`);
  }, [searchValue, router]);

  const trackStarClick = useCallback((p: Personality) => setActiveStar(p), []);

  const handleGeoLocation = useCallback(async () => {
    setGeoLoading(true);
    if (!navigator.geolocation) { alert(lang === 'fr' ? 'Géolocalisation non supportée' : 'Geolocation not supported'); setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'User-Agent': 'Lukeni/1.0' } });
          const geo = await res.json();
          const country = geo.address?.country;
          if (country) { setGeoCountry(country); setSearchValue(country); }
        } catch (err) { console.error('Reverse geocoding failed:', err); }
        finally { setGeoLoading(false); }
      },
      (err) => { console.error('Geolocation error:', err); setGeoLoading(false); },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }, [lang]);

  const handleNextTrack = useCallback(() => setCurrentTrackIndex(prev => (prev + 1) % musicQueue.length), [musicQueue.length]);
  const handlePreviousTrack = useCallback(() => setCurrentTrackIndex(prev => (prev - 1 + musicQueue.length) % musicQueue.length), [musicQueue.length]);
  const handleTogglePlayMusic = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlayingMusic) { audioRef.current.pause(); setIsPlayingMusic(false); }
    else { audioRef.current.play().catch(() => { }); setIsPlayingMusic(true); }
  }, [isPlayingMusic]);
  const handleToggleSound = useCallback(() => setSoundEnabled(s => !s), []);

  const yearsAgo = activeFeaturedEvent ? new Date().getFullYear() - activeFeaturedEvent.year : 0;

  return (
    <main className={`relative min-h-screen w-full transition-all duration-1000 overflow-hidden flex flex-col items-center justify-center ${isOrganic ? 'bg-gradient-to-br from-[#1a120b] via-[#2d1e13] to-[#1a120b]' : 'bg-gradient-to-b from-[#020111] via-[#03032B] to-[#000000]'}`}>

      {/* ── LOADING SCREEN ── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center px-6"
          >
            {/* Halo de fond */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.25, 0.1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 'min(320px, 80vw)',
                height: 'min(320px, 80vw)',
                background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)',
              }}
            />

            {/* Icône */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="relative z-10 mb-6 md:mb-8"
            >
              <CaurisIcon className="w-16 h-16 md:w-24 md:h-24 text-[#D4AF37]" />
            </motion.div>

            {/* Nom */}
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 text-[#D4AF37] font-serif text-2xl md:text-3xl tracking-[0.3em] md:tracking-[0.5em] mb-3 md:mb-4"
            >
              LUKENI
            </motion.h2>

            {/* Texte animé */}
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="relative z-10 text-[#D4AF37]/70 text-[10px] md:text-xs tracking-[0.25em] md:tracking-[0.4em] font-light text-center leading-relaxed"
            >
              {lang === 'fr'
                ? 'CHARGEMENT DE LA CONSTELLATION...'
                : 'LOADING CONSTELLATION...'}
            </motion.p>

            {/* Barre de progression simulée */}
            <div className="relative z-10 mt-8 md:mt-10 w-32 md:w-48 h-px bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-full"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '60%' }}
              />
            </div>

            {/* Étoiles décoratives — masquées sur très petits écrans */}
            <div className="absolute inset-0 pointer-events-none hidden sm:block">
              {[
                { x: '15%', y: '20%', d: 1.8, delay: 0 },
                { x: '82%', y: '15%', d: 2.2, delay: 0.4 },
                { x: '8%', y: '72%', d: 1.5, delay: 0.8 },
                { x: '90%', y: '68%', d: 2.0, delay: 0.6 },
                { x: '50%', y: '88%', d: 1.6, delay: 1.0 },
                { x: '25%', y: '55%', d: 1.9, delay: 0.2 },
                { x: '75%', y: '42%', d: 1.4, delay: 1.2 },
              ].map((star, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#D4AF37]"
                  style={{
                    left: star.x,
                    top: star.y,
                    boxShadow: '0 0 6px 2px rgba(212,175,55,0.6)',
                  }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.4, 0.8] }}
                  transition={{
                    duration: star.d,
                    repeat: Infinity,
                    delay: star.delay,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODE SECRET ── */}
      <AnimatePresence>
        {secretMode && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center">
            <div className="text-center">
              <motion.div animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Sparkles size={80} className="text-[#D4AF37] mx-auto mb-4" />
              </motion.div>
              <p className="text-[#D4AF37] text-3xl font-serif tracking-wider">
                {lang === 'fr' ? '🎉 Mode Secret Activé !' : '🎉 Secret Mode Activated!'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LA LUNE ── */}
      {isMounted && !isOrganic && (
        <MoonComponent lang={lang} isOrganic={isOrganic} secretMode={secretMode} isMobile={isMobile} />
      )}

      {/* ── CONTRÔLES TOP ── */}
      <div className="absolute top-4 md:top-6 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={handleToggleSound}
            className={`p-2.5 md:p-3 border rounded-full text-white transition-all backdrop-blur-sm ${soundEnabled ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#D4AF37]/40'}`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </motion.button>

          {isPlayingMusic && (
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          )}

          {soundEnabled && currentTrack && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className="ml-2 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-2 md:px-2.5 py-1.5 flex items-center gap-1.5 md:gap-2 shadow-lg"
            >
              <div className="w-5 h-5 md:w-6 md:h-6 rounded overflow-hidden bg-[#D4AF37]/20 flex-shrink-0">
                {currentTrack.cover_url
                  ? <img src={currentTrack.cover_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music size={8} className="text-[#D4AF37]" /></div>}
              </div>
              <span className="text-white text-[9px] font-medium truncate max-w-[60px] md:max-w-[80px]">
                {lang === 'fr' ? currentTrack.title_fr : currentTrack.title_en}
              </span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <motion.button whileHover={{ scale: 1.15 }} onClick={handlePreviousTrack} className="p-0.5 text-white/60 hover:text-[#D4AF37] transition-colors"><SkipBack size={9} /></motion.button>
                <motion.button whileHover={{ scale: 1.15 }} onClick={handleTogglePlayMusic} className="p-0.5 text-white/60 hover:text-[#D4AF37] transition-colors">
                  {isPlayingMusic
                    ? <span className="w-2 h-2 flex gap-0.5"><span className="w-0.5 h-2 bg-current rounded-sm" /><span className="w-0.5 h-2 bg-current rounded-sm" /></span>
                    : <span className="w-0 h-0 border-t-2 border-b-2 border-l-[4px] border-transparent border-l-current" />}
                </motion.button>
                <motion.button whileHover={{ scale: 1.15 }} onClick={handleNextTrack} className="p-0.5 text-white/60 hover:text-[#D4AF37] transition-colors"><SkipForward size={9} /></motion.button>
              </div>
            </motion.div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-white hover:bg-[#D4AF37] hover:text-black transition-all font-bold text-xs backdrop-blur-sm"
        >
          <Globe size={13} /> {lang.toUpperCase()}
        </motion.button>
      </div>

      {/* ── NÉBULEUSES ── */}
      {isMounted && !isOrganic && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {NEBULAE.map(nebula => (
            <motion.div key={nebula.id} className="absolute rounded-full"
              style={{ left: `${nebula.x}%`, top: `${nebula.y}%`, width: nebula.size, height: nebula.size, background: `radial-gradient(circle, ${nebula.color}22 0%, transparent 70%)`, filter: 'blur(50px)' }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 10 + nebula.id * 2, repeat: Infinity, ease: 'easeInOut' }} />
          ))}
        </div>
      )}

      {/* ── ÉTOILES ── */}
      {isMounted && !isOrganic && (
        <StarField mousePos={mousePos} starsData={cosmicStars} lang={lang} onStarClick={trackStarClick} secretMode={secretMode} isMobile={isMobile} />
      )}

      {/* ── CITATIONS FLOTTANTES ── */}
      {isMounted && !isOrganic && !isMobile && quotes.length > 0 && (
        <div className="absolute inset-0 z-[5] pointer-events-none">
          {quotes.map((quote, i) => (
            <motion.div key={quote.id} className="absolute max-w-xs text-center px-4"
              style={{ left: `${15 + i * 18}%`, top: `${25 + i * 12}%` }}
              animate={{ y: [0, -25, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 12 + i * 2, repeat: Infinity, delay: i * 2.5, ease: 'easeInOut' }}>
              <p className="text-white/30 text-[11px] italic leading-relaxed">
                "{lang === 'fr' ? quote.text_fr : quote.text_en}"
              </p>
              <p className="text-[#D4AF37]/40 text-[9px] mt-1.5 font-bold tracking-wider">
                — {lang === 'fr' ? quote.author_fr : quote.author_en}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── LOGO ── */}
      <motion.div
        initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="absolute top-16 md:top-20 text-center z-10 flex flex-col items-center gap-2 md:gap-3"
      >
        <motion.div animate={{ scale: [1, 1.05, 1], opacity: isMobile ? 0.8 : 1 }} transition={{ duration: 3, repeat: Infinity }}>
          <CaurisIcon className="w-10 h-10 md:w-20 md:h-20 text-[#D4AF37]" />
        </motion.div>
        <h1 className="text-2xl md:text-4xl font-serif tracking-[0.4em] md:tracking-[0.5em] text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">
          LUKENI
        </h1>
        <p className="text-white/40 text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase">
          {lang === 'fr' ? 'Mémoire • Musique • Genèse' : 'Memory • Music • Genesis'}
        </p>
      </motion.div>

      {/* ── BARRE DE RECHERCHE ── */}
      <div className="z-20 w-full max-w-3xl px-4 md:px-6 relative">
        <motion.form
          onSubmit={handleSearch}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
          className={`relative flex items-center backdrop-blur-3xl border p-1.5 md:p-3 transition-all duration-500 group ${isOrganic ? 'bg-[#2d1e13]/90 border-[#D4AF37]/40 rounded-2xl shadow-[0_10px_60px_rgba(212,175,55,0.15)]' : 'bg-white/[0.03] border-white/10 rounded-full shadow-[0_0_40px_rgba(212,175,55,0.1)]'} ${isFocused ? 'ring-2 ring-[#D4AF37]/50 scale-105 shadow-[0_0_80px_rgba(212,175,55,0.3)]' : ''}`}
        >
          <div className={`pl-4 md:pl-5 transition-all duration-300 ${isFocused ? 'text-[#D4AF37] scale-110' : 'text-[#D4AF37]/70'}`}>
            <Search size={20} strokeWidth={1.5} />
          </div>

          <div className="flex-1 relative h-12 md:h-16 flex items-center px-3 md:px-5">
            {!searchValue && !isFocused && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${lang}-${placeholderIndex}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="absolute text-white pointer-events-none text-sm md:text-lg font-light truncate w-full"
                >
                  {suggestions[placeholderIndex] || (lang === 'fr' ? 'Rechercher...' : 'Search...')}
                </motion.span>
              </AnimatePresence>
            )}
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              className="w-full bg-transparent border-none focus:ring-0 text-white outline-none text-base md:text-xl font-light relative z-10"
              aria-label="Rechercher dans Lukeni"
            />
          </div>

          <div className="flex items-center gap-1 md:gap-2 pr-2 md:pr-4">
            <motion.button
              whileHover={{ scale: 1.1 }} type="button"
              onClick={handleGeoLocation} disabled={geoLoading}
              className={`p-2 transition-all hidden md:block ${geoLoading ? 'text-yellow-500 animate-pulse' : geoCountry ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-[#D4AF37]'}`}
              title={lang === 'fr' ? 'Recherche par localisation' : 'Location-based search'}
            >
              {geoLoading ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} strokeWidth={1.5} />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              type="submit"
              className={`ml-1 md:ml-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 md:gap-2 ${isOrganic ? 'bg-[#D4AF37] text-[#1a120b] hover:bg-[#E5C158]' : 'bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30'}`}
            >
              <Search size={14} />
              <span className="hidden md:inline">{lang === 'fr' ? 'Chercher' : 'Search'}</span>
            </motion.button>

            <div className="hidden xl:flex items-center gap-1 ml-3 text-gray-500 text-xs">
              <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[10px]">⌘K</kbd>
            </div>
          </div>

          <AnimatePresence>
            {geoCountry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-4 top-full mt-2 flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-3 py-1.5 text-[#D4AF37] text-xs font-bold z-10"
              >
                <MapPin size={12} />{geoCountry}
                <button onClick={() => { setGeoCountry(null); setSearchValue(''); }} className="ml-1 text-[#D4AF37]/70 hover:text-[#D4AF37]"><X size={12} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <SearchDropdown
            searchValue={debouncedSearch} lang={lang} isFocused={isFocused}
            lukeniResults={lukeniResults} lukeniLoading={lukeniLoading} geoCountry={geoCountry}
            wikiResults={wikiResults} wikiLoading={wikiLoading}
            onClose={() => { setIsFocused(false); setSearchValue(''); }}
          />
        </motion.form>

        <FeaturedEventsBar events={featuredEvents} lang={lang} onEventClick={setActiveFeaturedEvent} />
      </div>

      {/* ── POP-UP ÉTOILE ── */}
      <AnimatePresence>
        {activeStar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setActiveStar(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1A1A]/95 border-2 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.2)] w-full max-w-md"
              style={{ borderColor: activeStar.card_color || '#D4AF37' }}
              onClick={e => e.stopPropagation()}>
              <div className="relative h-44 md:h-52 bg-gradient-to-br from-gray-900 to-black">
                <img src={activeStar.image_url || 'https://images.unsplash.com/photo-1501854140801-50d01674aa3e?q=80&w=600&h=400&auto=format&fit=crop'}
                  alt={activeStar.name_fr} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={() => setActiveStar(null)}
                  className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-all">
                  <X size={16} />
                </motion.button>
                {activeStar.birth_year && (
                  <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white/80 text-xs">
                    <Clock size={12} />
                    <span>{activeStar.birth_year} - {activeStar.death_year || (lang === 'fr' ? 'Présent' : 'Present')}</span>
                  </div>
                )}
              </div>
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[#D4AF37] text-xl md:text-2xl font-serif mb-1">{lang === 'fr' ? activeStar.name_fr : activeStar.name_en}</h3>
                    {activeStar.domain && <span className="text-white/50 text-xs uppercase tracking-wider">{activeStar.domain}</span>}
                  </div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                    <Zap size={18} className="text-[#D4AF37]" />
                  </motion.div>
                </div>
                <p className="text-gray-400 text-sm line-clamp-4 mb-5 font-light leading-relaxed">
                  {lang === 'fr' ? activeStar.short_bio_fr : activeStar.short_bio_en}
                </p>
                <div className="flex flex-col gap-2.5">
                  <Link href={`/personnalites/${activeStar.slug}`}
                    className="flex items-center justify-between w-full px-5 py-3 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black rounded-xl font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all group">
                    <span>{lang === 'fr' ? 'Découvrir son histoire' : 'Explore their story'}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href={`/encyclopedie?q=${encodeURIComponent(lang === 'fr' ? activeStar.name_fr : activeStar.name_en)}`}
                    className="flex items-center justify-between w-full px-5 py-3 bg-white/5 border border-white/10 hover:border-[#D4AF37]/40 text-white/70 hover:text-[#D4AF37] rounded-xl font-medium text-sm transition-all group">
                    <span className="flex items-center gap-2"><BookOpen size={13} />{lang === 'fr' ? 'Voir dans l\'encyclopédie' : 'View in encyclopedia'}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── POP-UP ÉVÉNEMENT FEATURED ── */}
      <AnimatePresence>
        {activeFeaturedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setActiveFeaturedEvent(null)}>
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-[#0A0A1A]/95 border border-[#D4AF37]/20 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(212,175,55,0.15)] relative backdrop-blur-xl"
              onClick={e => e.stopPropagation()}>
              <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={() => setActiveFeaturedEvent(null)}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </motion.button>
              <div className="flex items-center gap-4 mb-5">
                <span className="text-4xl md:text-5xl">{activeFeaturedEvent.country}</span>
                <div>
                  <p className="text-[#D4AF37] text-lg font-bold uppercase tracking-widest">{activeFeaturedEvent.year}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1.5">
                    <Clock size={12} />{lang === 'fr' ? `Il y a ${yearsAgo} ans` : `${yearsAgo} years ago`}
                  </p>
                </div>
              </div>
              <h3 className="text-white text-xl md:text-2xl font-serif mb-4 leading-snug">
                {lang === 'fr' ? activeFeaturedEvent.title_fr : activeFeaturedEvent.title_en}
              </h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-6 md:mb-8">
                {lang === 'fr' ? activeFeaturedEvent.description_fr : activeFeaturedEvent.description_en}
              </p>
              <Link href={`/evenements/${activeFeaturedEvent.slug}`}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black rounded-xl font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all text-sm group">
                <span>{lang === 'fr' ? 'Lire l\'histoire complète' : 'Read full story'}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOUTONS BAS ── */}
      <div className={`absolute bottom-8 md:bottom-12 flex flex-col items-center gap-4 md:gap-6 z-30 transition-opacity duration-300 ${isFocused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Link href={userSession ? '/explore' : '/auth?redirect=/explore'}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 md:px-8 py-3 md:py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black rounded-full font-bold text-sm hover:shadow-lg transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)]"
          >
            {lang === 'fr' ? 'Entrer dans l\'Encyclopédie' : 'Enter the Encyclopedia'}
          </motion.button>
        </Link>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }}
          onClick={() => setIsOrganic(!isOrganic)}
          className="flex flex-col items-center gap-2 md:gap-3 group"
        >
          <motion.div
            animate={isMobile ? { opacity: isOrganic ? 1 : 0.7 } : { boxShadow: isOrganic ? ['0 0 20px rgba(212,175,55,0.4)', '0 0 40px rgba(212,175,55,0.7)', '0 0 20px rgba(212,175,55,0.4)'] : ['0 0 10px rgba(212,175,55,0.2)', '0 0 20px rgba(212,175,55,0.4)', '0 0 10px rgba(212,175,55,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${isOrganic ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-transparent text-[#D4AF37] border-[#D4AF37]/40 hover:bg-[#D4AF37]/10'}`}
          >
            <CaurisIcon className="w-6 h-6 md:w-7 md:h-7" />
          </motion.div>
          <span className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em] font-bold opacity-50 group-hover:opacity-100 transition-opacity">
            {isOrganic ? (lang === 'fr' ? 'Cosmos' : 'Cosmos') : (lang === 'fr' ? 'Héritage' : 'Heritage')}
          </span>
        </motion.button>
      </div>

      <audio ref={audioRef} />

      {/* ── PWA INSTALL ── */}
      <PWAInstallButton lang={lang} delayMs={5000} />
    </main>
  );
}

// ─── STARFIELD ────────────────────────────────────────────────────────────────

interface StarFieldProps {
  mousePos: { x: number; y: number };
  starsData: CosmicStar[];
  lang: 'fr' | 'en';
  onStarClick: (p: Personality) => void;
  secretMode: boolean;
  isMobile: boolean;
}

function StarField({ mousePos, starsData, lang, onStarClick, secretMode, isMobile }: StarFieldProps) {
  const backgroundStars = useMemo(() =>
    Array.from({ length: 200 }).map((_, i) => ({
      id: i, x: (i * 37 % 100), y: ((i * 67 + 13) % 100),
      size: Math.random() * 1.5 + 0.5, depth: Math.random() * 15 + 5,
      duration: Math.random() * 3 + 2, delay: Math.random() * 2,
    })), []);

  const foregroundStars = useMemo(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      id: i, x: ((i + 43) * 53 % 100), y: ((i * 79 + 29) % 100),
      size: Math.random() * 2 + 1.5, depth: Math.random() * 25 + 15,
      duration: Math.random() * 4 + 3,
    })), []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Étoiles de fond */}
      {backgroundStars.map((star) => (
        <motion.div key={`bg-${star.id}`}
          animate={{
            x: mousePos.x * (isMobile ? star.depth * 0.3 : star.depth),
            y: mousePos.y * (isMobile ? star.depth * 0.3 : star.depth),
            opacity: [0.2, 0.8, 0.2]
          }}
          transition={{
            opacity: { duration: star.duration, repeat: Infinity, delay: star.delay, ease: 'easeInOut' },
            x: { type: 'spring', stiffness: 30, damping: 20 },
            y: { type: 'spring', stiffness: 30, damping: 20 },
          }}
          className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }} />
      ))}

      {/* Étoiles premier plan */}
      {foregroundStars.map((star) => (
        <motion.div key={`fg-${star.id}`}
          animate={{
            x: mousePos.x * (isMobile ? star.depth * 0.3 : star.depth),
            y: mousePos.y * (isMobile ? star.depth * 0.3 : star.depth),
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.2, 1]
          }}
          transition={{
            opacity: { duration: star.duration, repeat: Infinity },
            scale: { duration: star.duration, repeat: Infinity },
            x: { type: 'spring', stiffness: 25, damping: 20 },
            y: { type: 'spring', stiffness: 25, damping: 20 },
          }}
          className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, boxShadow: '0 0 8px 2px rgba(255,255,255,0.6)' }} />
      ))}

      {/* ── ÉTOILES CLIQUABLES ── */}
      {starsData.map((s, i) => {
        const x = s.position_x ?? ((i + 1) * 17 % 85 + 5);
        const y = s.position_y ?? ((i + 1) * 31 % 75 + 10);
        const size = s.star_size || 16;

        return (
          <motion.div
            key={`cosmic-${s.id}`}
            animate={{
              x: mousePos.x * (isMobile ? 35 * 0.4 : 35),
              y: mousePos.y * (isMobile ? 35 * 0.4 : 35),
              scale: secretMode ? [1, 1.5, 1] : 1
            }}
            transition={{
              scale: { duration: 0.5, repeat: secretMode ? Infinity : 0 },
              x: { type: 'spring', stiffness: 30, damping: 20 },
              y: { type: 'spring', stiffness: 30, damping: 20 },
            }}
            whileHover={{ scale: 2 }}
            onClick={() => onStarClick(s.personalities)}
            className="absolute cursor-pointer group flex flex-col items-center z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="relative">
              <motion.div
                className="rounded-full relative z-10"
                style={{
                  width: `${size}px`, height: `${size}px`,
                  backgroundColor: s.star_color,
                  boxShadow: `0 0 ${size * 1.25}px ${size / 3}px ${s.star_color}`,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  boxShadow: [
                    `0 0 ${size * 1.25}px ${size / 3}px ${s.star_color}`,
                    `0 0 ${size * 1.5}px ${size / 2}px ${s.star_color}`,
                    `0 0 ${size * 1.25}px ${size / 3}px ${s.star_color}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Étoile filante */}
              {s.is_shooting && (
                <motion.div
                  className="absolute top-1/2 right-full -translate-y-1/2 h-[3px] rounded-full"
                  style={{ background: `linear-gradient(to left, ${s.star_color}, transparent)` }}
                  animate={{ opacity: [0, 1, 0], width: ['0px', '60px', '0px'], x: [0, -20, -40] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeOut' }}
                />
              )}
            </div>

            {/* Nom au hover */}
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="mt-3 text-[11px] text-white opacity-0 group-hover:opacity-100 uppercase tracking-[0.2em] font-bold drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] transition-all duration-300 pointer-events-none whitespace-nowrap bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              {lang === 'fr' ? s.personalities?.name_fr : s.personalities?.name_en}
            </motion.span>

            {/* Années au hover */}
            {s.personalities?.birth_year && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                className="absolute top-full mt-8 bg-black/90 border border-white/20 rounded-lg px-3 py-2 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <p className="text-[#D4AF37] text-xs font-bold">
                  {s.personalities.birth_year} - {s.personalities.death_year || (lang === 'fr' ? 'Présent' : 'Present')}
                </p>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}