// /app/explore/page.tsx
"use client";



import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-browser';

import {
  Search, Globe, Music, BookOpen, Newspaper, Headphones, Library,
  ArrowRight, Play, Sparkles, MapPin, Calendar, Loader2,
  UserIcon, LogIn, LogOut, Share2, ChevronLeft, ChevronRight,
  Pause, Volume2, Users, Heart, Bookmark, Eye, Flame, Zap,
  Award, Clock, Command, Settings, TrendingUp, Star, X, ChevronDown
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import AdBanner from '@/components/AdBanner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroEvent {
  title_fr: string; title_en: string;
  desc_fr: string; desc_en: string;
  year?: number; image: string;
  category?: string; views?: number;
}

interface TrendingItem {
  title_fr: string; title_en: string;
  type_fr: string; type_en: string;
  color: string; image: string; href: string;
  views?: number; isNew?: boolean; author?: string;
}

// ─── Icône Cauris ─────────────────────────────────────────────────────────────

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="caurisExplore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path fill="url(#caurisExplore)"
      d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
         M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
  </svg>
);

const MusicMap = dynamic(
  () => import('@/components/music/MusicMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#020111] rounded-2xl">
        <div className="text-[#D4AF37] text-sm">Chargement de la carte...</div>
      </div>
    )
  }
);

// ─── Fonction de nettoyage des titres ─────────────────────────────────────────

function cleanTitle(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\{##[A-Fa-f0-9]{6}\}/g, '')  // {##22C55E}
    .replace(/\{\/\}/g, '')                 // {/}
    .replace(/\{[^}]*\}/g, '')              // Toute autre balise {xxx}
    .trim();
}

// ─── Hook debounce ────────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [dv, setDv] = useState<string>(value);
  useEffect(() => {
    const h = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return dv;
}

// ─── Hook localStorage ────────────────────────────────────────────────────────

function getStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : initialValue;
  } catch { return initialValue; }
}

function useStoredState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [val, setVal] = useState<T>(() => getStoredValue(key, initialValue));
  const setValue = useCallback((value: T) => {
    setVal(value);
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { }
  }, [key]);
  return [val, setValue];
}


// ─── Nebulae statiques (pas d'animation lourde) ───────────────────────────────

const CosmosBackground = memo(({ mousePos }: { mousePos: { x: number; y: number } }) => {
  const nebulae = useMemo(() => [
    { id: 1, x: 8, y: 12, size: 320, color: '#9370DB' },
    { id: 2, x: 70, y: 55, size: 260, color: '#D4AF37' },
    { id: 3, x: 38, y: 78, size: 220, color: '#20B2AA' },
  ], []);

  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: (i * 37 % 100),
      y: ((i * 67 + 13) % 100),
      size: 0.5 + (i % 3) * 0.4,
      depth: 3 + (i % 10),
    })), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {nebulae.map(n => (
        <div
          key={n.id}
          className="absolute rounded-full"
          style={{
            left: `${n.x}%`, top: `${n.y}%`,
            width: n.size, height: n.size,
            background: `radial-gradient(circle, ${n.color}14 0%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: `lukeni-pulse ${8 + n.id * 2}s ease-in-out infinite`,
          }}
        />
      ))}
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            opacity: 0.15 + (s.id % 4) * 0.1,
            transform: `translate(${mousePos.x * s.depth * 5}px, ${mousePos.y * s.depth * 5}px)`,
            transition: 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        />
      ))}
      <style>{`
        @keyframes lukeni-pulse {
          0%,100% { opacity:.12; }
          50% { opacity:.28; }
        }
      `}</style>
    </div>
  );
});
CosmosBackground.displayName = 'CosmosBackground';

// ─── Scroll Progress ──────────────────────────────────────────────────────────

const ScrollProgress = memo(() => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf: number;
    const h = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.documentElement;
        setProgress((window.scrollY / (el.scrollHeight - el.clientHeight)) * 100);
      });
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => { window.removeEventListener('scroll', h); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      className="fixed top-0 left-0 h-0.5 bg-[#D4AF37] z-[200]"
      style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
    />
  );
});
ScrollProgress.displayName = 'ScrollProgress';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`rounded-2xl bg-white/[0.04] border border-white/5 ${className}`}
    style={{ animation: 'lukeni-skeleton 1.8s ease-in-out infinite' }}>
    <style>{`
      @keyframes lukeni-skeleton {
        0%,100% { opacity:.6; }
        50% { opacity:1; }
      }
    `}</style>
  </div>
);

// ─── User Menu ────────────────────────────────────────────────────────────────

const UserMenu = memo(({
  user, profile, lang, onLogout
}: {
  user: User | null; profile: any; lang: 'fr' | 'en'; onLogout: () => void;
}) => {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (!user) return (
    <Link href="/auth?redirect=/explore"
      className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black
        rounded-full font-bold text-[9px] uppercase tracking-widest
        hover:bg-white transition-colors">
      <LogIn size={12} />
      <span className="hidden sm:block">{lang === 'fr' ? 'Connexion' : 'Sign in'}</span>
    </Link>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center
          justify-center overflow-hidden border-2 border-white/20
          hover:border-[#D4AF37] transition-all"
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : <UserIcon size={14} className="text-black" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-56 bg-[#020111]/95
                border border-white/10 rounded-2xl overflow-hidden
                shadow-2xl z-50 backdrop-blur-2xl"
            >
              <div className="p-4 border-b border-white/8">
                <p className="text-white text-sm font-bold truncate">
                  {profile?.full_name || (lang === 'fr' ? 'Utilisateur' : 'User')}
                </p>
                <p className="text-white/40 text-xs truncate mt-0.5">{user.email}</p>
              </div>
              <div className="p-2">
                {[
                  { href: '/profil', icon: UserIcon, label_fr: 'Mon Profil', label_en: 'My Profile' },
                  { href: '/profil#favorites', icon: Heart, label_fr: 'Mes Favoris', label_en: 'Favorites' },
                  { href: '/profil#settings', icon: Settings, label_fr: 'Préférences', label_en: 'Settings' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-white/70
                      hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors">
                    <item.icon size={14} />
                    {lang === 'fr' ? item.label_fr : item.label_en}
                  </Link>
                ))}
              </div>
              <div className="p-2 border-t border-white/8">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5
                    text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors">
                  <LogOut size={14} />
                  {lang === 'fr' ? 'Déconnexion' : 'Sign out'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
UserMenu.displayName = 'UserMenu';

// ─── Search Bar ───────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title_fr: string;
  title_en: string;
  type: 'article' | 'press' | 'book' | 'music' | 'event' | 'game';
  image?: string;
  href: string;
  subtitle?: string;
}

const TYPE_CONFIG = {
  article: { label_fr: 'Encyclopédie', label_en: 'Encyclopedia', color: '#D4AF37', href: '/encyclopedie', emoji: '🌍' },
  press: { label_fr: 'Presse', label_en: 'Press', color: '#E8E8E8', href: '/presse', emoji: '📰' },
  book: { label_fr: 'Bibliothèque', label_en: 'Library', color: '#67E8F9', href: '/bibliotheque', emoji: '📚' },
  music: { label_fr: 'Musique', label_en: 'Music', color: '#C084FC', href: '/voyage-musical', emoji: '🎵' },
  event: { label_fr: 'Événement', label_en: 'Event', color: '#F472B6', href: '/encyclopedie', emoji: '✨' },
  game: { label_fr: 'Enquête', label_en: 'Investigation', color: '#06b6d4', href: '/investigations', emoji: '🎮' },
};

const SearchBar = memo(({ lang }: { lang: 'fr' | 'en' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recent, setRecent] = useStoredState<string[]>('lukeni_searches', []);

  const placeholders = useMemo(() => [
    lang === 'fr' ? 'Soundiata Keïta…' : 'Sundiata Keita…',
    lang === 'fr' ? 'Empire du Mali…' : 'Mali Empire…',
    lang === 'fr' ? 'Miriam Makeba…' : 'Miriam Makeba…',
  ], [lang]);

  const [phIdx, setPhIdx] = useState(0);
  const debouncedQ = useDebounce(query, 350);
  const ref = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (query || isFocused) return;
    const t = setTimeout(() => setPhIdx(p => (p + 1) % placeholders.length), 4000);
    return () => clearTimeout(t);
  }, [query, isFocused, placeholders.length]);

  const [dbSuggestions, setDbSuggestions] = useState<{
    text_fr: string;
    text_en: string;
    target_space: string;
    space_description_fr?: string;
    space_description_en?: string;
  }[]>([]);

  useEffect(() => {
    supabase
      .from('search_suggestions')
      .select('text_fr, text_en, target_space, space_description_fr, space_description_en')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setDbSuggestions(data);
      });
  }, []);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const q = `%${debouncedQ}%`;

    Promise.all([
      supabase
        .from('articles')
        .select('id, title_fr, title_en, image_url, summary_fr, summary_en')
        .eq('status', 'published')
        .or(`title_fr.ilike.${q},title_en.ilike.${q},summary_fr.ilike.${q}`)
        .limit(3),

      supabase
        .from('press_articles')
        .select('id, title_fr, title_en, cover_url, summary_fr, summary_en')
        .eq('status', 'published')
        .or(`title_fr.ilike.${q},title_en.ilike.${q}`)
        .limit(3),

      supabase
        .from('library_books')
        .select('id, title_fr, title_en, cover_url, author_fr, author_en')
        .eq('status', 'published')
        .or(`title_fr.ilike.${q},title_en.ilike.${q},author_fr.ilike.${q}`)
        .limit(3),

      supabase
        .from('music_tracks')
        .select('id, title_fr, title_en, cover_url, artist_fr, artist_en')
        .eq('status', 'published')
        .or(`title_fr.ilike.${q},title_en.ilike.${q},artist_fr.ilike.${q}`)
        .limit(3),

      supabase
        .from('events')
        .select('id, title_fr, title_en, image_url, year')
        .eq('status', 'published')
        .or(`title_fr.ilike.${q},title_en.ilike.${q}`)
        .limit(2),

      supabase
        .from('investigations')
        .select('id, title_fr, title_en, cover_url, description_fr, description_en')
        .or(`title_fr.ilike.${q},title_en.ilike.${q},description_fr.ilike.${q}`)
        .limit(2),
    ]).then(([arts, press, books, tracks, events, games]) => {
      const combined: SearchResult[] = [];

      arts.data?.forEach(a => combined.push({
        id: a.id, type: 'article',
        title_fr: a.title_fr, title_en: a.title_en,
        image: a.image_url || '',
        href: '/encyclopedie',
        subtitle: cleanTitle(lang === 'fr' ? (a.summary_fr || '') : (a.summary_en || '')),
      }));

      press.data?.forEach(p => combined.push({
        id: p.id, type: 'press',
        title_fr: p.title_fr, title_en: p.title_en,
        image: p.cover_url || '',
        href: '/presse',
        subtitle: cleanTitle(lang === 'fr' ? (p.summary_fr || '') : (p.summary_en || '')),
      }));

      books.data?.forEach(b => combined.push({
        id: b.id, type: 'book',
        title_fr: b.title_fr, title_en: b.title_en,
        image: b.cover_url || '',
        href: '/bibliotheque',
        subtitle: cleanTitle(lang === 'fr' ? (b.author_fr || '') : (b.author_en || '')),
      }));

      tracks.data?.forEach(t => combined.push({
        id: t.id, type: 'music',
        title_fr: t.title_fr, title_en: t.title_en,
        image: t.cover_url || '',
        href: '/voyage-musical',
        subtitle: cleanTitle(lang === 'fr' ? (t.artist_fr || '') : (t.artist_en || '')),
      }));


      games.data?.forEach(g => combined.push({
        id: g.id, type: 'game',
        title_fr: g.title_fr, title_en: g.title_en,
        image: g.cover_url || '',
        href: `/investigations/${g.id}`,
        subtitle: cleanTitle(lang === 'fr' ? (g.description_fr || '') : (g.description_en || '')),
      }));

      events.data?.forEach(e => combined.push({
        id: e.id, type: 'event',
        title_fr: e.title_fr, title_en: e.title_en,
        image: e.image_url || '',
        href: '/encyclopedie',
        subtitle: String(e.year),
      }));

      setResults(combined);
      setIsSearching(false);
    }).catch(() => setIsSearching(false));
  }, [debouncedQ, lang]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addRecent = (s: string) => {
    const cleaned = cleanTitle(s);
    if (!recent.includes(cleaned)) setRecent([cleaned, ...recent].slice(0, 5));
  };

  const handleSelect = (result: SearchResult) => {
    const title = cleanTitle(lang === 'fr' ? result.title_fr : result.title_en);
    addRecent(title);
    setQuery('');
    setIsOpen(false);
    window.location.href = result.href;
  };

  const showDropdown = isOpen && (query.length >= 2 || (!query && (dbSuggestions.length > 0 || recent.length > 0)));

  return (
    <div ref={ref} className="relative max-w-xl w-full">
      <div className={`flex items-center bg-white/[0.03] border rounded-full px-3 py-2
        backdrop-blur-xl transition-all duration-300 ${isFocused
          ? 'border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.15)]'
          : 'border-white/10'
        }`}>
        {isSearching
          ? <Loader2 size={16} className="shrink-0 ml-1 text-[#D4AF37] animate-spin" />
          : <Search size={16} strokeWidth={1.5}
            className={`shrink-0 transition-colors ml-1 ${isFocused ? 'text-[#D4AF37]' : 'text-[#D4AF37]/50'
              }`} />
        }
        <div className="flex-1 relative h-9 flex items-center px-3">
          <AnimatePresence mode="wait">
            {!query && !isFocused && (
              <motion.span
                key={phIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.35, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="absolute text-white text-sm italic pointer-events-none"
              >
                {placeholders[phIdx]}
              </motion.span>
            )}
          </AnimatePresence>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { setFocused(true); setIsOpen(true); }}
            onBlur={() => setFocused(false)}
            placeholder=""
            className="w-full bg-transparent border-none outline-none text-white text-sm relative z-10"
          />
        </div>
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="shrink-0 mr-1 text-white/30 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-2
              bg-[#020111]/98 border border-white/10 rounded-2xl
              overflow-hidden shadow-2xl z-50 backdrop-blur-2xl"
          >
            {query.length >= 2 && (
              <>
                {results.length > 0 ? (
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {(['game', 'article', 'press', 'book', 'music', 'event'] as const).map(type => {
                      const typeResults = results.filter(r => r.type === type);
                      if (!typeResults.length) return null;
                      const conf = TYPE_CONFIG[type];
                      return (
                        <div key={type} className="mb-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                            <span className="text-base">{conf.emoji}</span>
                            <span
                              className="text-[9px] font-black uppercase tracking-widest"
                              style={{ color: conf.color }}
                            >
                              {lang === 'fr' ? conf.label_fr : conf.label_en}
                            </span>
                          </div>
                          {typeResults.map(result => (
                            <button
                              key={result.id}
                              onMouseDown={() => handleSelect(result)}
                              className="w-full text-left px-3 py-2 hover:bg-white/5
                                rounded-xl transition-colors flex items-center gap-3 group"
                            >
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0
                                bg-white/5 border border-white/10">
                                {result.image ? (
                                  <img
                                    src={result.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: `${conf.color}20` }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: conf.color }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-medium truncate
                                  group-hover:text-[#D4AF37] transition-colors">
                                  {cleanTitle(lang === 'fr' ? result.title_fr : result.title_en)}
                                </p>
                                {result.subtitle && (
                                  <p className="text-white/35 text-[10px] truncate">
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>
                              <ArrowRight
                                size={11}
                                className="text-white/20 group-hover:text-[#D4AF37]
                                  transition-colors shrink-0"
                              />
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : !isSearching ? (
                  <div className="p-6 text-center">
                    <p className="text-white/30 text-sm">
                      {lang === 'fr'
                        ? `Aucun résultat pour "${query}"`
                        : `No results for "${query}"`}
                    </p>
                  </div>
                ) : (
                  <div className="p-6 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                    <span className="text-white/30 text-sm">
                      {lang === 'fr' ? 'Recherche…' : 'Searching…'}
                    </span>
                  </div>
                )}
              </>
            )}

            {!query && (
              <div className="p-2">
                {dbSuggestions.length > 0 && (
                  <>
                    {dbSuggestions.filter(s => ['encyclopedia', 'press', 'musical', 'library'].includes(s.target_space)).length > 0 && (
                      <>
                        <div className="px-3 py-1.5 mb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60">
                            {lang === 'fr' ? '🌟 Espaces' : '🌟 Spaces'}
                          </span>
                        </div>
                        {dbSuggestions
                          .filter(s => ['encyclopedia', 'press', 'musical', 'library'].includes(s.target_space))
                          .map((s, i) => {
                            const text = cleanTitle(lang === 'fr' ? s.text_fr : s.text_en);
                            const desc = cleanTitle(lang === 'fr' ? (s.space_description_fr || '') : (s.space_description_en || ''));

                            const emojiMap: Record<string, string> = {
                              'encyclopedia': '🌍',
                              'press': '📰',
                              'musical': '🎵',
                              'library': '📚',
                            };

                            return (
                              <button
                                key={`space-${i}`}
                                onMouseDown={() => {
                                  window.location.href = `/${s.target_space === 'musical' ? 'voyage-musical' : s.target_space}`;
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-white/5 rounded-xl 
                                  transition-colors group"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-lg shrink-0 mt-0.5">{emojiMap[s.target_space] || '🌟'}</span>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium mb-0.5 
                                      group-hover:text-[#D4AF37] transition-colors">
                                      {text}
                                    </p>
                                    {desc && (
                                      <p className="text-white/40 text-[10px] leading-relaxed line-clamp-1">
                                        {desc}
                                      </p>
                                    )}
                                  </div>

                                  <ArrowRight size={12} className="text-white/20 group-hover:text-[#D4AF37] 
                                    transition-colors shrink-0 mt-1" />
                                </div>
                              </button>
                            );
                          })}
                      </>
                    )}

                    {dbSuggestions.filter(s => !['encyclopedia', 'press', 'musical', 'library'].includes(s.target_space)).length > 0 && (
                      <>
                        <div className="px-3 py-1.5 mb-1 mt-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60">
                            {lang === 'fr' ? 'Suggestions' : 'Suggestions'}
                          </span>
                        </div>
                        {dbSuggestions
                          .filter(s => !['encyclopedia', 'press', 'musical', 'library'].includes(s.target_space))
                          .slice(0, 6)
                          .map((s, i) => {
                            const text = cleanTitle(lang === 'fr' ? s.text_fr : s.text_en);
                            return (
                              <button
                                key={`sug-${i}`}
                                onMouseDown={() => { setQuery(text); setIsOpen(true); }}
                                className="w-full text-left px-3 py-2 text-white/60 text-sm
                                  hover:bg-white/5 hover:text-white rounded-xl transition-colors
                                  flex items-center gap-2"
                              >
                                <Search size={11} className="text-[#D4AF37]/40 shrink-0" />
                                <span className="flex-1 truncate">{text}</span>
                                {s.target_space && s.target_space !== 'all' && (
                                  <span className="text-[8px] text-white/20 uppercase tracking-wider shrink-0">
                                    {s.target_space}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </>
                    )}
                  </>
                )}

                {recent.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 mb-1 mt-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/25">
                        {lang === 'fr' ? 'Récentes' : 'Recent'}
                      </span>
                    </div>
                    {recent.map((s, i) => (
                      <button
                        key={`rec-${i}`}
                        onMouseDown={() => { setQuery(s); setIsOpen(true); }}
                        className="w-full text-left px-3 py-2 text-white/50 text-sm
                          hover:bg-white/5 hover:text-white rounded-xl transition-colors
                          flex items-center gap-2"
                      >
                        <Clock size={11} className="text-white/25 shrink-0" />
                        {s}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
SearchBar.displayName = 'SearchBar';

// ─── Hero Carousel ────────────────────────────────────────────────────────────

// ─── Hero Carousel ────────────────────────────────────────────────────────────

const HeroCarousel = memo(({ events, lang, isLoading }: {
  events: HeroEvent[]; lang: 'fr' | 'en'; isLoading: boolean;
}) => {
  const [idx, setIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [heroAds, setHeroAds] = useState<any[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    async function fetchHeroAds() {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (!data) return;

      const now = new Date();
      const filtered = data.filter((ad: any) => {
        if (ad.position !== 'hero') return false;
        if (ad.starts_at && new Date(ad.starts_at) > now) return false;
        if (ad.ends_at && new Date(ad.ends_at) < now) return false;
        return true;
      });

      setHeroAds(filtered);

      filtered.forEach(async (ad: any) => {
        try {
          await supabase
            .from('ads')
            .update({ impressions: (ad.impressions ?? 0) + 1 })
            .eq('id', ad.id);
        } catch { }
      });
    }
    fetchHeroAds();
  }, []);

  const slides = useMemo(() => {
    const result: Array<
      | { type: 'event'; data: HeroEvent }
      | { type: 'ad'; data: any }
    > = [];

    let adIdx = 0;
    events.forEach((ev, i) => {
      result.push({ type: 'event', data: ev });
      if ((i + 1) % 2 === 0 && adIdx < heroAds.length) {
        result.push({ type: 'ad', data: heroAds[adIdx++] });
      }
    });

    while (adIdx < heroAds.length) {
      result.push({ type: 'ad', data: heroAds[adIdx++] });
    }

    return result;
  }, [events, heroAds]);

  const next = useCallback(() => {
    setImgLoaded(false);
    setIdx(p => (p + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setImgLoaded(false);
    setIdx(p => (p - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = window.setInterval(next, 7000);
    return () => clearInterval(timerRef.current!);
  }, [next, slides.length]);

  if (isLoading) return <Skeleton className="h-[60vh]" />;
  if (!slides.length) return null;

  const current = slides[idx];

  if (current.type === 'ad') {
    const ad = current.data;
    const displayTitle = cleanTitle(lang === 'fr'
      ? (ad.title_fr || ad.title_en || '')
      : (ad.title_en || ad.title_fr || ''));
    const displayDesc = cleanTitle(lang === 'fr'
      ? (ad.description_fr || ad.description_en || '')
      : (ad.description_en || ad.description_fr || ''));

    const handleAdClick = async () => {
      try {
        await supabase
          .from('ads')
          .update({ clicks: (ad.clicks ?? 0) + 1 })
          .eq('id', ad.id);
      } catch { }
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="relative h-[60vh] min-h-[440px] rounded-3xl overflow-hidden group">
        {ad.image_url && (
          <>
            {/* 1. Fond flouté qui remplit tout (Mobile + Desktop) */}
            <img
              src={ad.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110 z-0"
            />
            {/* 2. Gradients d'assombrissement (Sous l'image sur Desktop, sur l'image sur Mobile) */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/60 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020111]/80 via-transparent to-transparent pointer-events-none z-10" />

            {/* 3. Image Nette : Centrée sur mobile, Cadre à droite sur Desktop */}
            <img
              key={`ad-${idx}`}
              src={ad.image_url}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className={`absolute inset-0 w-full h-full object-contain 
                lg:top-8 lg:bottom-8 lg:right-8 lg:left-auto lg:w-[42%] lg:h-auto lg:object-cover 
                lg:rounded-2xl lg:border lg:border-white/10 lg:shadow-[0_0_40px_rgba(0,0,0,0.6)] lg:z-20
                transition-opacity duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        )}
        {!ad.image_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-[#020111] to-[#020111] z-0" />
        )}

        {slides.length > 1 && (
          <>
            <button
              onClick={() => { prev(); clearInterval(timerRef.current!); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full
                bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center
                text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => { next(); clearInterval(timerRef.current!); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full
                bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center
                text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.25em]
            border border-[#D4AF37]/40 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
            <Star size={8} />
            {lang === 'fr' ? 'Sponsorisé' : 'Sponsored'}
          </div>
        </div>

        {/* Conteneur de Texte : En bas sur mobile, Centré verticalement à gauche sur Desktop */}
        <div className="absolute bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:right-auto lg:w-[58%] lg:flex lg:flex-col lg:justify-center p-8 md:p-10 z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={`ad-content-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                <span className="text-[#D4AF37]/70 text-[9px] uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Publicité' : 'Advertisement'}
                </span>
              </div>

              {displayTitle && (
                <h2 className="text-3xl md:text-5xl font-serif italic text-white leading-tight mb-4 max-w-2xl lg:max-w-xl">
                  {displayTitle}
                </h2>
              )}

              {displayDesc && (
                <p className="text-white/55 text-sm max-w-lg mb-6 leading-relaxed line-clamp-2">
                  {displayDesc}
                </p>
              )}

              <button
                onClick={handleAdClick}
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black
                  px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white transition-colors"
              >
                {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-8 right-8 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto flex gap-1.5 z-30">
            {slides.map((slide, i) => (
              <button
                key={i}
                onClick={() => { setIdx(i); clearInterval(timerRef.current!); }}
                className={`h-1 rounded-full transition-all duration-300 ${i === idx
                  ? 'w-6 bg-[#D4AF37]'
                  : slide.type === 'ad'
                    ? 'w-1.5 bg-[#D4AF37]/30 hover:bg-[#D4AF37]/60'
                    : 'w-1.5 bg-white/25 hover:bg-white/50'
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const ev = current.data as HeroEvent;

  return (
    <div className="relative h-[60vh] min-h-[440px] rounded-3xl overflow-hidden group">

      {/* 1. Fond flouté */}
      <img
        src={ev.image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110 pointer-events-none z-0"
      />

      {/* 2. Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/60 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020111]/80 via-transparent to-transparent pointer-events-none z-10" />

      {/* 3. Image Nette : Mobile = Centré classique, Desktop = Cadre Premium sur la droite */}
      <img
        key={`ev-${idx}`}
        src={ev.image} alt=""
        loading="lazy" decoding="async"
        onLoad={() => setImgLoaded(true)}
        className={`absolute inset-0 w-full h-full object-contain 
          lg:top-8 lg:bottom-8 lg:right-8 lg:left-auto lg:w-[42%] lg:h-auto lg:object-cover 
          lg:rounded-2xl lg:border lg:border-white/10 lg:shadow-[0_0_40px_rgba(0,0,0,0.6)] lg:z-20
          transition-opacity duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {slides.length > 1 && (
        <>
          <button
            onClick={() => { prev(); clearInterval(timerRef.current!); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full
              bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center
              text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => { next(); clearInterval(timerRef.current!); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full
              bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center
              text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      <div className="absolute top-6 left-6 z-30">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.25em]
          border border-[#D4AF37]/40 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
          <Sparkles size={8} />
          {lang === 'fr' ? 'Événement du Jour' : 'Event of the Day'}
        </div>
      </div>

      {/* Conteneur de Texte : Desktop = Poussé à gauche (58% de l'écran) */}
      <div className="absolute bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:right-auto lg:w-[58%] lg:flex lg:flex-col lg:justify-center p-8 md:p-10 z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={`ev-content-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
          >
            {ev.year && (
              <p className="flex items-center gap-1.5 text-white/40 text-[10px] mb-3">
                <Calendar size={9} /> {ev.year}
              </p>
            )}
            <h2 className="text-3xl md:text-5xl font-serif italic text-white leading-tight mb-4 max-w-2xl lg:max-w-xl">
              {lang === 'fr' ? ev.title_fr : ev.title_en}
            </h2>
            <p className="text-white/55 text-sm max-w-lg mb-6 leading-relaxed line-clamp-2">
              {lang === 'fr' ? ev.desc_fr : ev.desc_en}
            </p>
            <Link href="/encyclopedie"
              className="inline-flex items-center gap-2 bg-[#D4AF37] text-black
                px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white transition-colors">
              {lang === 'fr' ? "Lire l'histoire" : 'Read the story'}
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-8 right-8 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto flex gap-1.5 z-30">
          {slides.map((slide, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); clearInterval(timerRef.current!); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === idx
                ? 'w-6 bg-[#D4AF37]'
                : slide.type === 'ad'
                  ? 'w-1.5 bg-[#D4AF37]/30 hover:bg-[#D4AF37]/60'
                  : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
});
HeroCarousel.displayName = 'HeroCarousel';

// ─── Bouton Découvrez nos Espaces ────────────────────────────────────────────

const DiscoverSpacesButton = memo(({ lang }: { lang: 'fr' | 'en' }) => {
  const scrollToPortals = () => {
    document.getElementById('portals-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <motion.button
      onClick={scrollToPortals}
      className="mx-auto flex flex-col items-center gap-3 group"
      whileHover={{ y: 5 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30
          flex items-center justify-center group-hover:bg-[#D4AF37]/20 
          group-hover:border-[#D4AF37]/50 transition-all">
          <CaurisIcon className="w-8 h-8 text-[#D4AF37]" />
        </div>

        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/40"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <div className="text-center">
        <p className="text-white font-serif text-sm mb-1 group-hover:text-[#D4AF37] transition-colors">
          {lang === 'fr' ? 'Découvrez nos Espaces' : 'Discover our Spaces'}
        </p>
        <p className="text-white/40 text-[10px] uppercase tracking-widest">
          {lang === 'fr' ? 'Faites défiler' : 'Scroll down'}
        </p>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown size={20} className="text-[#D4AF37]/60" />
      </motion.div>
    </motion.button>
  );
});
DiscoverSpacesButton.displayName = 'DiscoverSpacesButton';

// ─── Portals Grid ─────────────────────────────────────────────────────────────

const PortalsGrid = memo(({ lang, stats, portalImages }: {
  lang: 'fr' | 'en';
  stats: Record<string, number>;
  portalImages: Record<string, string>;
}) => {
  const portals = [
    {
      id: 'encyclopedia', icon: Globe,
      title_fr: 'Encyclopédie', title_en: 'Encyclopedia',
      desc_fr: "L'Histoire et les Racines", desc_en: 'History and Roots',
      href: '/encyclopedie', color: '#D4AF37',
      bgImage: portalImages['encyclopedia'] || 'https://images.unsplash.com/photo-1590059390239-0d2949e6630d?w=600&q=75',
    },
    {
      id: 'press', icon: Newspaper,
      title_fr: 'Presse', title_en: 'Press',
      desc_fr: "Les Voix d'Aujourd'hui", desc_en: "Today's Voices",
      href: '/presse', color: '#E8E8E8',
      bgImage: portalImages['press'] || 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&q=75',
    },
    {
      id: 'musical', icon: Headphones,
      title_fr: 'Voyage Musical', title_en: 'Musical Journey',
      desc_fr: 'Carte interactive & sons du monde', desc_en: 'Interactive map & world sounds',
      href: '/voyage-musical', color: '#C084FC',
      bgImage: portalImages['musical'] || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=75',
    },
    {
      id: 'library', icon: Library,
      title_fr: 'Bibliothèque', title_en: 'Library',
      desc_fr: 'Manuscrits & Archives', desc_en: 'Manuscripts & Archives',
      href: '/bibliotheque', color: '#67E8F9',
      bgImage: portalImages['library'] || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=75',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {portals.map((portal, i) => (
        <motion.div key={portal.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: i * 0.07, duration: 0.45 }}>
          <Link href={portal.href}
            className="block relative h-48 md:h-60 rounded-2xl overflow-hidden
              border border-white/6 hover:border-white/15 transition-all duration-400
              hover:-translate-y-1 group">
            <img
              src={portal.bgImage} alt={portal.title_en}
              loading="lazy" decoding="async"
              className="absolute inset-0 w-full h-full object-cover
                group-hover:scale-105 transition-transform duration-500"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=75';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/25 to-transparent" />

            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                  <portal.icon size={16} style={{ color: portal.color }} />
                </div>
                {stats[portal.id] !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: portal.color }} />
                    <span className="text-[9px] font-black text-white/70">{stats[portal.id]}</span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-serif text-white text-sm md:text-base mb-0.5
                  group-hover:text-[#D4AF37] transition-colors duration-300">
                  {lang === 'fr' ? portal.title_fr : portal.title_en}
                </h4>
                <p className="text-white/40 text-[9px] md:text-[10px]">
                  {lang === 'fr' ? portal.desc_fr : portal.desc_en}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
});
PortalsGrid.displayName = 'PortalsGrid';

// ─── Trending Carousel ────────────────────────────────────────────────────────

const TrendingCarousel = memo(({ items, lang, isLoading }: {
  items: TrendingItem[]; lang: 'fr' | 'en'; isLoading: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);

  const check = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanL(scrollLeft > 0);
    setCanR(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    check();
    const ro = new ResizeObserver(check);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [check, items]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  const fallbackByType: Record<string, string> = {
    'Encyclopédie': 'https://images.unsplash.com/photo-1590059390239-0d2949e6630d?w=400&q=75',
    'Encyclopedia': 'https://images.unsplash.com/photo-1590059390239-0d2949e6630d?w=400&q=75',
    'Presse': 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&q=75',
    'Press': 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&q=75',
    'Bibliothèque': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=75',
    'Library': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=75',
    'Musique': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=75',
    'Music': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=75',
  };

  if (isLoading) return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="shrink-0 w-52 h-64" />
      ))}
    </div>
  );

  if (!items.length) return null;

  return (
    <div className="relative group/car">
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10
        bg-gradient-to-r from-[#020111] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10
        bg-gradient-to-l from-[#020111] to-transparent pointer-events-none" />

      <AnimatePresence>
        {canL && (
          <motion.button
            key="trending-nav-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full
              bg-black/80 backdrop-blur-sm border border-white/15 flex items-center justify-center
              text-white opacity-0 group-hover/car:opacity-100 transition-opacity
              hover:border-[#D4AF37]/40"
          >
            <ChevronLeft size={15} />
          </motion.button>
        )}
        {canR && (
          <motion.button
            key="trending-nav-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full
              bg-black/80 backdrop-blur-sm border border-white/15 flex items-center justify-center
              text-white opacity-0 group-hover/car:opacity-100 transition-opacity
              hover:border-[#D4AF37]/40"
          >
            <ChevronRight size={15} />
          </motion.button>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        onScroll={check}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x pb-2"
      >
        {items.slice(0, 8).map((item, i) => {
          const typeKey = lang === 'fr' ? item.type_fr : item.type_en;
          const fallback = fallbackByType[typeKey]
            || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=75';
          const imgSrc = item.image || fallback;

          const rawTitle = lang === 'fr' ? item.title_fr : (item.title_en || item.title_fr);
          const displayTitle = cleanTitle(rawTitle || (lang === 'fr' ? 'Sans titre' : 'Untitled'));

          const displayAuthor = cleanTitle(item.author || '');

          return (
            <div
              key={`trending-${item.type_fr}-${i}`}
              className="shrink-0 w-52 snap-start group/card"
            >
              <Link href={item.href || '#'} className="block">
                <div className="relative h-64 rounded-2xl overflow-hidden mb-3
                  border border-white/6 hover:border-white/20 transition-all
                  duration-300 hover:-translate-y-1 shadow-lg">

                  <img
                    src={imgSrc}
                    alt={displayTitle}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover
                      group-hover/card:scale-105 transition-transform duration-500"
                    onError={e => {
                      (e.target as HTMLImageElement).src = fallback;
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t
                    from-[#020111] via-[#020111]/30 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5
                    px-2 py-1 bg-black/65 backdrop-blur-md border border-white/10 rounded-full">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="text-[8px] font-black uppercase tracking-wider"
                      style={{ color: item.color }}
                    >
                      {typeKey}
                    </span>
                  </div>

                  {item.isNew && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5
                      px-1.5 py-0.5 bg-green-500/85 backdrop-blur-md rounded-full">
                      <Zap size={7} className="text-white" />
                      <span className="text-[7px] font-black text-white uppercase">New</span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-white text-[13px] font-serif font-medium
                      leading-snug line-clamp-2 drop-shadow-lg
                      group-hover/card:text-[#D4AF37] transition-colors duration-300">
                      {displayTitle}
                    </p>
                    {displayAuthor && (
                      <p className="text-white/45 text-[10px] mt-1 flex items-center gap-1.5 truncate">
                        <span className="w-3 h-px bg-white/30 inline-block shrink-0" />
                        <span className="truncate">{displayAuthor}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
});
TrendingCarousel.displayName = 'TrendingCarousel';

// ─── Musical Teaser ───────────────────────────────────────────────────────────

const MusicalTeaser = memo(({ lang }: { lang: 'fr' | 'en' }) => (
  <div className="relative rounded-3xl overflow-hidden p-7 md:p-10
    bg-gradient-to-br from-purple-950/30 to-[#020111]
    border border-purple-500/10">

    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full
      bg-purple-600/8 blur-3xl pointer-events-none" />

    <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-10">

      <div className="relative w-full md:w-80 h-56 rounded-2xl overflow-hidden
        bg-black/40 border border-white/8 shadow-2xl shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />

        {[
          { x: '22%', y: '42%', color: '#D4AF37', delay: 0 },
          { x: '55%', y: '48%', color: '#C084FC', delay: 0.3 },
          { x: '65%', y: '62%', color: '#67E8F9', delay: 0.6 },
          { x: '35%', y: '58%', color: '#F472B6', delay: 0.9 },
          { x: '75%', y: '35%', color: '#D4AF37', delay: 0.2 },
          { x: '18%', y: '30%', color: '#C084FC', delay: 0.5 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: dot.x, top: dot.y }}
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: dot.delay }}
          >
            <div className="relative">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/70"
                style={{ backgroundColor: dot.color, boxShadow: `0 0 12px ${dot.color}80` }} />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: dot.color }}
                animate={{ scale: [1, 3], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: dot.delay }}
              />
            </div>
          </motion.div>
        ))}

        <div className="absolute bottom-3 right-3 flex items-center gap-1.5
          px-2.5 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
          <Music size={14} className="text-[#D4AF37]" />
          <span className="text-white/70 text-[9px] font-bold">
            {lang === 'fr' ? 'Carte Interactive' : 'Interactive Map'}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/8 via-transparent to-transparent" />
      </div>

      <div className="flex-1 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-purple-400"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-purple-400 text-[9px] font-black uppercase tracking-widest">
            {lang === 'fr' ? 'Voyage Musical' : 'Musical Journey'}
          </span>
        </div>

        <h3 className="text-2xl md:text-3xl font-serif italic text-white mb-3 leading-snug">
          {lang === 'fr'
            ? 'Explorez la Carte Musicale du Monde'
            : 'Explore the World Music Map'}
        </h3>

        <p className="text-white/45 text-sm mb-5 max-w-sm leading-relaxed">
          {lang === 'fr'
            ? 'Naviguez sur la carte interactive, découvrez les genres, les artistes et les morceaux de chaque pays.'
            : 'Navigate the interactive map, discover genres, artists and tracks from each country.'}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5 max-w-xs mx-auto md:mx-0">
          {[
            { val: '54+', label_fr: 'Pays', label_en: 'Countries' },
            { val: '20+', label_fr: 'Genres', label_en: 'Genres' },
            { val: '∞', label_fr: 'Connexions', label_en: 'Connections' },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-2.5 bg-white/[0.03] border border-white/8 rounded-xl text-center">
              <p className="text-base font-bold text-[#D4AF37] mb-0.5">{s.val}</p>
              <p className="text-white/35 text-[8px] uppercase tracking-wider">
                {lang === 'fr' ? s.label_fr : s.label_en}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          <Link href="/voyage-musical"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black
              px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white transition-colors
              shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            <Globe size={14} />
            {lang === 'fr' ? "Entrer dans l'espace sonore" : 'Enter Sound Space'}
            <ArrowRight size={14} />
          </Link>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10
            text-white/50 px-4 py-2.5 rounded-full text-sm">
            <Users size={13} />
            <span className="text-xs">143 {lang === 'fr' ? 'en ligne' : 'listening'}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));
MusicalTeaser.displayName = 'MusicalTeaser';

// ─── Library Teaser ───────────────────────────────────────────────────────────

const LibraryTeaser = memo(({ lang, teaserData }: {
  lang: 'fr' | 'en';
  teaserData: {
    image: string;
    titleFr: string; titleEn: string;
    stat1Value: string; stat1LabelFr: string; stat1LabelEn: string;
    stat2Value: string; stat2LabelFr: string; stat2LabelEn: string;
    stat3Value: string; stat3LabelFr: string; stat3LabelEn: string;
  };
}) => {
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const bookRef = useRef<HTMLDivElement>(null);

  const displayTitle = cleanTitle(lang === 'fr' ? teaserData.titleFr : teaserData.titleEn);

  const stats = [
    {
      val: teaserData.stat1Value,
      label: lang === 'fr' ? teaserData.stat1LabelFr : teaserData.stat1LabelEn,
    },
    {
      val: teaserData.stat2Value,
      label: lang === 'fr' ? teaserData.stat2LabelFr : teaserData.stat2LabelEn,
    },
    {
      val: teaserData.stat3Value,
      label: lang === 'fr' ? teaserData.stat3LabelFr : teaserData.stat3LabelEn,
    },
  ];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bookRef.current) return;
    const r = bookRef.current.getBoundingClientRect();
    setRot({
      x: -((e.clientY - r.top - r.height / 2) / 18),
      y: ((e.clientX - r.left - r.width / 2) / 18),
    });
  };

  return (
    <div className="relative rounded-3xl overflow-hidden p-7 md:p-10
      bg-gradient-to-br from-blue-950/30 to-[#020111] border border-blue-500/10">

      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full
        bg-blue-600/8 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row-reverse items-center gap-8 md:gap-10">

        <div
          ref={bookRef}
          onMouseMove={onMove}
          onMouseLeave={() => setRot({ x: 0, y: 0 })}
          className="relative w-40 h-56 cursor-pointer shrink-0"
          style={{ perspective: '700px' }}
        >
          <div
            className="relative w-full h-full rounded-xl shadow-2xl overflow-hidden"
            style={{
              transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
              transformStyle: 'preserve-3d',
              transition: 'transform 0.12s ease-out',
            }}
          >
            <img
              src={teaserData.image ||
                'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80'}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1507842217121-9e9f1479fb46?w=400&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020111]/80 via-[#020111]/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-serif text-xs leading-snug">{displayTitle}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-blue-400 text-[9px] font-black uppercase tracking-widest">
              {lang === 'fr' ? 'Bibliothèque' : 'Library'}
            </span>
          </div>

          <h3 className="text-2xl md:text-3xl font-serif italic text-white mb-3 leading-snug">
            {lang === 'fr' ? 'Manuscrits & Archives' : 'Manuscripts & Archives'}
          </h3>
          <p className="text-white/45 text-sm mb-5 max-w-sm leading-relaxed">
            {lang === 'fr'
              ? 'Accédez aux manuscrits numérisés, ouvrages rares et archives sauvegardés.'
              : 'Access digitized manuscripts, rare books and historical archives.'}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-5 max-w-xs mx-auto md:mx-0">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-2.5 bg-white/[0.03] border border-white/8 rounded-xl text-center"
              >
                <p className="text-base font-bold text-white mb-0.5">{s.val}</p>
                <p className="text-white/35 text-[8px] uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <Link href="/bibliotheque"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black
              px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white transition-colors">
            {lang === 'fr' ? 'Découvrir les archives' : 'Discover archives'}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
});
LibraryTeaser.displayName = 'LibraryTeaser';

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = memo(({ icon: Icon, title, href, hrefLabel }: {
  icon: any; title: string; href?: string; hrefLabel?: string;
}) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/15">
        <Icon size={15} className="text-[#D4AF37]" />
      </div>
      <h3 className="text-xl font-serif text-white">{title}</h3>
    </div>
    {href && hrefLabel && (
      <Link href={href}
        className="flex items-center gap-1 text-[#D4AF37] text-[10px] font-bold
          hover:opacity-70 transition-opacity uppercase tracking-wider">
        {hrefLabel}<ArrowRight size={12} />
      </Link>
    )}
  </div>
));
SectionHeader.displayName = 'SectionHeader';


// ─── Composant Jeux Disponibles ───────────────────────────

const AvailableGamesSection = memo(({ games, lang }: {
  games: any[];
  lang: 'fr' | 'en';
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);

  const check = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanL(scrollLeft > 0);
    setCanR(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    check();
    const ro = new ResizeObserver(check);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [check, games]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (!games.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/15">
            <Play size={15} className="text-[#06b6d4]" />
          </div>
          <h3 className="text-xl font-serif text-white">
            {lang === 'fr' ? '🎮 Enquêtes Disponibles' : '🎮 Available Investigations'}
          </h3>
        </div>
        <Link href="/investigations"
          className="flex items-center gap-1 text-[#06b6d4] text-[10px] font-bold
            hover:opacity-70 transition-opacity uppercase tracking-wider">
          {lang === 'fr' ? 'Voir toutes' : 'View all'}<ArrowRight size={12} />
        </Link>
      </div>

      <div className="relative group/car">
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-r from-[#020111] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-l from-[#020111] to-transparent pointer-events-none" />

        <AnimatePresence>
          {canL && (
            <motion.button
              key="games-nav-left"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full
                bg-black/80 backdrop-blur-sm border border-white/15 flex items-center justify-center
                text-white opacity-0 group-hover/car:opacity-100 transition-opacity
                hover:border-[#06b6d4]/40"
            >
              <ChevronLeft size={15} />
            </motion.button>
          )}
          {canR && (
            <motion.button
              key="games-nav-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full
                bg-black/80 backdrop-blur-sm border border-white/15 flex items-center justify-center
                text-white opacity-0 group-hover/car:opacity-100 transition-opacity
                hover:border-[#06b6d4]/40"
            >
              <ChevronRight size={15} />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onScroll={check}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x pb-2"
        >
          {games.map((game, i) => (
            <motion.div
              key={`game-${game.id}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 w-64 snap-start group/card"
            >
              <Link href="/investigations" className="block">
                <div className="relative h-72 rounded-2xl overflow-hidden mb-3
                  border border-white/6 hover:border-[#06b6d4]/30 transition-all
                  duration-300 hover:-translate-y-1 shadow-lg group/img">

                  <img
                    src={game.cover}
                    alt={lang === 'fr' ? game.title_fr : game.title_en}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover
                      group-hover/img:scale-105 transition-transform duration-500"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=75';
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t
                    from-[#020111] via-[#020111]/30 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5
                    px-2.5 py-1 bg-black/65 backdrop-blur-md border border-white/10 rounded-full">
                    <span className="text-base">🎮</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#06b6d4]">
                      {lang === 'fr' ? 'Enquête' : 'Investigation'}
                    </span>
                  </div>



                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white text-sm font-serif font-bold
                      leading-snug line-clamp-2 drop-shadow-lg
                      group-hover/card:text-[#06b6d4] transition-colors duration-300 mb-2">
                      {lang === 'fr' ? game.title_fr : game.title_en}
                    </p>

                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-[#D4AF37]">
                        <CaurisIcon className="w-3 h-3" />
                        <span className="font-bold">+{game.reward}</span>
                      </div>
                      <button className="px-2.5 py-1 bg-[#06b6d4]/20 hover:bg-[#06b6d4]/40
                        border border-[#06b6d4]/30 text-[#06b6d4] rounded-full
                        font-bold transition-colors">
                        {lang === 'fr' ? 'Jouer' : 'Play'}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});
AvailableGamesSection.displayName = 'AvailableGamesSection';

// ─── Divider décoratif ────────────────────────────────────────────────────────

const GoldDivider = () => (
  <div className="flex items-center gap-4 my-2">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
    <CaurisIcon className="w-4 h-4 text-[#D4AF37]/30" />
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
  </div>
);

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useStoredState<'fr' | 'en'>('lukeni_lang', 'fr');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [heroEvents, setHeroEvents] = useState<HeroEvent[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [countriesData, setCountriesData] = useState<any[]>([]);
  const [portalImages, setPortalImages] = useState<Record<string, string>>({});
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [libraryTeaserData, setLibraryTeaserData] = useState({
    image: '',
    titleFr: 'Manuscrits de Tombouctou',
    titleEn: 'Timbuktu Manuscripts',
    stat1Value: '0',
    stat1LabelFr: 'Documents',
    stat1LabelEn: 'Documents',
    stat2Value: '15',
    stat2LabelFr: 'Langues',
    stat2LabelEn: 'Languages',
    stat3Value: '8',
    stat3LabelFr: 'Siècles',
    stat3LabelEn: 'Centuries',
  });

  useEffect(() => {
    let raf: number;
    let last = { x: 0, y: 0 };
    const h = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      if (Math.abs(nx - last.x) > 0.015 || Math.abs(ny - last.y) > 0.015) {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { setMousePos({ x: nx, y: ny }); last = { x: nx, y: ny }; });
      }
    };
    window.addEventListener('mousemove', h, { passive: true });
    return () => { window.removeEventListener('mousemove', h); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    setMounted(true);

    const initAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error('❌ getSession error:', error.message);

      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      const [artCount, pressCount, trackCount, bookCount] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('press_articles').select('id', { count: 'exact', head: true }),
        supabase.from('music_tracks').select('id', { count: 'exact', head: true }),
        supabase.from('library_books').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        encyclopedia: artCount.count || 0,
        press: pressCount.count || 0,
        musical: trackCount.count || 0,
        library: bookCount.count || 0,
      });

      const { data: settings } = await supabase
        .from('site_settings')
        .select('portal_img_encyclopedia, portal_img_press, portal_img_musical, portal_img_library')
        .eq('id', 1)
        .single();

      if (settings) {
        setPortalImages({
          encyclopedia: settings.portal_img_encyclopedia || '',
          press: settings.portal_img_press || '',
          musical: settings.portal_img_musical || '',
          library: settings.portal_img_library || '',
        });
      }

      let { data: featuredEvents } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('featured_on_explore', true) // <-- NOUVEAU FILTRE DÉDIÉ
        .order('importance', { ascending: false })
        .limit(10); // <-- Augmente la limite pour le carrousel Explorer (ex: 10)

      if (!featuredEvents || featuredEvents.length === 0) {
        const { data: recentEvents } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .order('year', { ascending: false })
          .limit(3);
        featuredEvents = recentEvents;
      }

      setHeroEvents(featuredEvents?.length
        ? featuredEvents.map(e => ({
          title_fr: cleanTitle(e.title_fr),
          title_en: cleanTitle(e.title_en),
          desc_fr: cleanTitle(e.description_fr || e.desc_fr || ''),
          desc_en: cleanTitle(e.description_en || e.desc_en || ''),
          year: e.year,
          image: e.image_url ||
            'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=75',
        }))
        : [{
          title_fr: "L'histoire des civilisations africaines",
          title_en: "History of African Civilizations",
          desc_fr: "Découvrez les grands empires et royaumes qui ont façonné le continent.",
          desc_en: "Discover the great empires and kingdoms that shaped the continent.",
          year: 2024,
          image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=75',
        }]
      );

      const [arts, press, books, tracks] = await Promise.all([
        supabase.from('articles')
          .select('title_fr,title_en,image_url,created_at,author_name')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(2),
        supabase.from('press_articles')
          .select('title_fr,title_en,cover_url,created_at,author_name')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(2),
        supabase.from('library_books')
          .select('title_fr,title_en,cover_url,created_at,author_fr,author_en')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(2),
        supabase.from('music_tracks')
          .select('title_fr,title_en,cover_url,created_at,artist_fr,artist_en')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(2),
      ]);

      const week = Date.now() - 7 * 86400000;
      let ctr = 150;
      const items: TrendingItem[] = [];

      arts.data?.forEach(a => items.push({
        title_fr: a.title_fr,
        title_en: a.title_en || a.title_fr,
        type_fr: 'Encyclopédie', type_en: 'Encyclopedia', color: '#D4AF37',
        image: a.image_url ||
          'https://images.unsplash.com/photo-1590059390239-0d2949e6630d?w=400&q=75',
        href: '/encyclopedie',
        views: ctr++,
        isNew: new Date(a.created_at).getTime() > week,
        author: a.author_name || '',
      }));

      press.data?.forEach(p => items.push({
        title_fr: p.title_fr,
        title_en: p.title_en || p.title_fr,
        type_fr: 'Presse', type_en: 'Press', color: '#E8E8E8',
        image: p.cover_url ||
          'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&q=75',
        href: '/presse',
        views: ctr++,
        isNew: new Date(p.created_at).getTime() > week,
        author: p.author_name || '',
      }));

      books.data?.forEach(b => items.push({
        title_fr: b.title_fr,
        title_en: b.title_en || b.title_fr,
        type_fr: 'Bibliothèque', type_en: 'Library', color: '#67E8F9',
        image: b.cover_url ||
          'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=75',
        href: '/bibliotheque',
        views: ctr++,
        isNew: new Date(b.created_at).getTime() > week,
        author: b.author_fr || b.author_en || '',
      }));

      tracks.data?.forEach(t => items.push({
        title_fr: t.title_fr,
        title_en: t.title_en || t.title_fr,
        type_fr: 'Musique', type_en: 'Music', color: '#C084FC',
        image: t.cover_url ||
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=75',
        href: '/voyage-musical',
        views: ctr++,
        isNew: new Date(t.created_at).getTime() > week,
        author: t.artist_fr || t.artist_en || '',
      }));

      const seen = new Set<string>();
      const uniqueItems = items.filter(item => {
        const key = `${item.type_fr}-${item.title_fr}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setTrending(uniqueItems);

      const { data: mapTracks } = await supabase
        .from('music_tracks')
        .select(`
          id, country_code, country_name_fr, country_name_en,
          era_decade, lat, lng, city, status,
          music_genres (nom_fr)
        `)
        .eq('status', 'published')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (mapTracks && mapTracks.length > 0) {
        const byCountry = new Map<string, any>();

        mapTracks.forEach((t: any) => {
          if (!byCountry.has(t.country_code)) {
            byCountry.set(t.country_code, {
              country_code: t.country_code,
              country_name_fr: t.country_name_fr || t.country_code,
              country_name_en: t.country_name_en || t.country_code,
              city: null,
              lat: t.lat,
              lng: t.lng,
              track_count: 0,
              is_cluster: false,
              cluster_name: t.country_name_fr || t.country_code,
              dominant_color: '#D4AF37',
              genres: [] as string[],
              eras: [] as number[],
              region: 'africa' as const,
            });
          }
          const c = byCountry.get(t.country_code);
          c.track_count++;
          if (t.era_decade) c.eras.push(t.era_decade);
          if (t.music_genres) c.genres.push(t.music_genres.nom_fr);
        });

        setCountriesData(Array.from(byCountry.values()));
      }

      const { data: teaserSettings } = await supabase
        .from('site_settings')
        .select(`
          library_teaser_image,
          library_teaser_title_fr,
          library_teaser_title_en,
          library_teaser_stat1_value,
          library_teaser_stat1_label_fr,
          library_teaser_stat1_label_en,
          library_teaser_stat2_value,
          library_teaser_stat2_label_fr,
          library_teaser_stat2_label_en,
          library_teaser_stat3_value,
          library_teaser_stat3_label_fr,
          library_teaser_stat3_label_en
        `)
        .eq('id', 1)
        .single();

      let stat1Display = teaserSettings?.library_teaser_stat1_value || 'auto';
      if (stat1Display === 'auto') {
        const { count } = await supabase
          .from('library_books')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published');
        const n = count || 0;
        stat1Display = n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
      }

      if (teaserSettings) {
        setLibraryTeaserData({
          image: teaserSettings.library_teaser_image || '',
          titleFr: teaserSettings.library_teaser_title_fr || 'Manuscrits de Tombouctou',
          titleEn: teaserSettings.library_teaser_title_en || 'Timbuktu Manuscripts',
          stat1Value: stat1Display,
          stat1LabelFr: teaserSettings.library_teaser_stat1_label_fr || 'Documents',
          stat1LabelEn: teaserSettings.library_teaser_stat1_label_en || 'Documents',
          stat2Value: teaserSettings.library_teaser_stat2_value || '15',
          stat2LabelFr: teaserSettings.library_teaser_stat2_label_fr || 'Langues',
          stat2LabelEn: teaserSettings.library_teaser_stat2_label_en || 'Languages',
          stat3Value: teaserSettings.library_teaser_stat3_value || '8',
          stat3LabelFr: teaserSettings.library_teaser_stat3_label_fr || 'Siècles',
          stat3LabelEn: teaserSettings.library_teaser_stat3_label_en || 'Centuries',
        });
      }

      // ✅ Charger les jeux disponibles
      const { data: investigations } = await supabase
        .from('investigations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (investigations && investigations.length > 0) {
        setAvailableGames(investigations.map(inv => ({
          id: inv.id,
          title_fr: cleanTitle(inv.title_fr),
          title_en: cleanTitle(inv.title_en),
          desc_fr: cleanTitle(inv.description_fr || ''),
          desc_en: cleanTitle(inv.description_en || ''),
          cover: inv.cover_url || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=75',
          difficulty: inv.difficulty || 'NORMAL',
          reward: inv.reward_cauris || 0,
        })));
      }
      setTimeout(() => setIsLoading(false), 300);
    }
    load();
  }, []);

  if (!mounted) return (
    <div className="min-h-screen bg-[#020111] flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
        <CaurisIcon className="w-14 h-14 text-[#D4AF37]" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#030330]/60 to-[#000000]
      text-white selection:bg-[#D4AF37]/30 overflow-x-hidden">

      <ScrollProgress />

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center gap-6">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <CaurisIcon className="w-16 h-16 text-[#D4AF37]" />
            </motion.div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[#D4AF37] text-[10px] tracking-[0.4em] uppercase font-light">
              {lang === 'fr' ? 'Chargement…' : 'Loading…'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <CosmosBackground mousePos={mousePos} />

      <nav className="sticky top-0 z-[100] backdrop-blur-2xl border-b border-white/5
        px-4 md:px-6 py-3 bg-[#020111]/50">
        <div className="max-w-7xl mx-auto flex items-center gap-4">

          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <CaurisIcon className="w-7 h-7 text-[#D4AF37]" />
            <div className="hidden sm:block">
              <p className="font-serif tracking-[0.4em] text-xs text-[#D4AF37] leading-none">LUKENI</p>
              <p className="text-white/25 text-[7px] tracking-[0.2em] uppercase">
                {lang === 'fr' ? 'Explorer' : 'Explore'}
              </p>
            </div>
          </Link>

          <div className="w-px h-5 bg-white/10 hidden sm:block" />

          <div className="flex-1 flex justify-center max-w-xl mx-auto">
            <SearchBar lang={lang} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1 bg-white/5 border border-white/10
                px-2.5 py-1.5 rounded-full text-white text-[9px] font-black uppercase
                hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all">
              <Globe size={9} /> {lang}
            </button>
            <UserMenu
              user={user}
              profile={profile}
              lang={lang}
              onLogout={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
            />
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-20">

        <section>
          <HeroCarousel events={heroEvents} lang={lang} isLoading={isLoading} />
        </section>

        <section className="flex justify-center">
          <DiscoverSpacesButton lang={lang} />
        </section>

        <GoldDivider />

        <section id="portals-section">
          <SectionHeader
            icon={Globe}
            title={lang === 'fr' ? 'Explorer les Espaces' : 'Explore Spaces'}
          />
          <PortalsGrid lang={lang} stats={stats} portalImages={portalImages} />
        </section>

        <GoldDivider />

        <AvailableGamesSection games={availableGames} lang={lang} />

        <GoldDivider />

        <section>
          <SectionHeader
            icon={Flame}
            title={lang === 'fr' ? 'Tendances' : 'Trending'}
          />
          <TrendingCarousel items={trending} lang={lang} isLoading={isLoading} />
        </section>

        <GoldDivider />

        <section>
          <AdBanner position="between_sections" lang={lang} />
        </section>

        <GoldDivider />

        <section className="relative rounded-3xl overflow-hidden border border-purple-500/10 bg-gradient-to-br from-purple-950/30 to-[#020111]">
          <div className="absolute top-0 left-0 right-0 z-10 p-6 md:p-8 pointer-events-none">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                className="w-2 h-2 rounded-full bg-purple-400"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-purple-400 text-[9px] font-black uppercase tracking-widest">
                {lang === 'fr' ? 'Voyage Musical' : 'Musical Journey'}
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-serif italic text-white mb-2">
              {lang === 'fr' ? 'Explorez la Carte Musicale du Monde' : 'Explore the World Music Map'}
            </h3>
            <p className="text-white/50 text-sm max-w-md">
              {lang === 'fr'
                ? 'Cliquez sur les pays pour découvrir leur musique'
                : 'Click on countries to discover their music'}
            </p>
          </div>

          <div className="h-[500px] md:h-[600px] w-full">
            {mounted && countriesData.length > 0 && (
              <MusicMap
                countries={countriesData}
                selectedCountry={null}
                activeEra={null}
                lang={lang}
                onCountrySelect={(code) => {
                  window.location.href = `/voyage-musical?country=${code}`;
                }}
                playingCountry={null}
                viewMode="africa"
                onViewModeChange={() => { }}
                theme="dark"
                genreRelations={[]}
              />
            )}
            {mounted && countriesData.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                Aucune donnée cartographique disponible
              </div>
            )}
          </div>

          <div className="absolute bottom-6 right-6 z-10">
            <Link href="/voyage-musical"
              className="inline-flex items-center gap-2 bg-[#D4AF37] text-black
                px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white transition-colors
                shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Globe size={14} />
              {lang === 'fr' ? "Entrer dans l'espace sonore" : 'Enter Sound Space'}
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        <section>
          <LibraryTeaser lang={lang} teaserData={libraryTeaserData} />
        </section>

        <section className="mt-12">
          <AdBanner position="footer" lang={lang} />
        </section>
      </div>

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full
          bg-[#D4AF37] text-black flex items-center justify-center
          hover:bg-white transition-colors shadow-lg">
        <ArrowRight size={16} className="-rotate-90" />
      </motion.button>
    </div>
  );
}