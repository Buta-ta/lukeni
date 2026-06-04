"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Globe, Loader2, Search, X, Plus, Clock,
  Eye, BookOpen, History, ArrowRight,
  Lightbulb, Flag, Sparkles, Star,
  User as UserIcon, Scroll, Calendar, MapPin
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import FavoriteButton from '@/components/FavoriteButton';
import SubscribeButton from '@/components/SubscribeButton';
import SpaceHeader from '@/components/SpaceHeader';

import { useInternetArchive } from '@/lib/hooks/useInternetArchive';
import { useSemanticScholar } from '@/lib/hooks/useSemanticScholar';
import { useCoreApi } from '@/lib/hooks/useCoreApi';
import { useArxiv } from '@/lib/hooks/useArxiv';
import { ArchiveSection } from '@/components/ArchiveSection';
import { ScholarSection } from '@/components/ScholarSection';
import { CoreSection } from '@/components/CoreSection';
import { ArxivSection } from '@/components/ArxivSection';
import PushSubscribeButton from '@/components/PushSubscribeButton';

// ============================================================================
// CONSTANTS
// ============================================================================

const ARTICLES_PER_PAGE = 12;
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&q=60';

// ============================================================================
// TYPES
// ============================================================================

interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  color: string;
  icon?: string;
}

interface Article {
  id: string;
  title_fr: string;
  title_en: string;
  image_url: string;
  summary_fr: string;
  summary_en: string;
  status: string;
  created_at: string;
  view_count?: number;
  reading_time?: number;
  slug: string;
  categories: Category;
}

interface EncycloEvent {
  id: string;
  title_fr: string;
  title_en: string;
  desc_fr: string;
  desc_en: string;
  year: number;
  event_month?: number;
  event_day?: number;
  country: string;
  importance: number;
  image_url: string;
  categories: Category;
}

interface WikiResult {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  pageid: number;
}

interface ArticleEventLink {
  event_id: string;
  article_id: string;
  articles: { id: string; title_fr: string; title_en: string; slug: string; };  // ← Objet, pas tableau
}

function cleanTitle(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\{#+[0-9A-Fa-f]*\}/gi, '').replace(/\{\/\}/g, '').trim();
}

// ============================================================================
// CAURIS ICON
// ============================================================================

const CaurisIcon = memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
));
CaurisIcon.displayName = 'CaurisIcon';

// ============================================================================
// STAR FIELD
// ============================================================================

const StarField = memo(({ mousePos }: { mousePos: { x: number; y: number } }) => {
  const bgStars = useMemo(() =>
    Array.from({ length: 180 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.4,
      depth: Math.random() * 12 + 4,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    })), []);

  const fgStars = useMemo(() =>
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1.5,
      depth: Math.random() * 22 + 14,
      duration: Math.random() * 4 + 3,
    })), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div className="absolute rounded-full"
        style={{ left: '15%', top: '20%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute rounded-full"
        style={{ right: '10%', top: '40%', width: 280, height: 280, background: 'radial-gradient(circle, rgba(147,112,219,0.05) 0%, transparent 70%)', filter: 'blur(70px)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
      {bgStars.map(star => (
        <motion.div key={`bg-${star.id}`} className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
          animate={{ x: mousePos.x * star.depth, y: mousePos.y * star.depth, opacity: [0.2, 0.7, 0.2] }}
          transition={{
            opacity: { duration: star.duration, repeat: Infinity, delay: star.delay, ease: 'easeInOut' },
            x: { type: 'spring', stiffness: 30, damping: 20 },
            y: { type: 'spring', stiffness: 30, damping: 20 },
          }} />
      ))}
      {fgStars.map(star => (
        <motion.div key={`fg-${star.id}`} className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, boxShadow: '0 0 6px 1px rgba(255,255,255,0.5)' }}
          animate={{ x: mousePos.x * star.depth, y: mousePos.y * star.depth, opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
          transition={{
            opacity: { duration: star.duration, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: star.duration, repeat: Infinity, ease: 'easeInOut' },
            x: { type: 'spring', stiffness: 25, damping: 20 },
            y: { type: 'spring', stiffness: 25, damping: 20 },
          }} />
      ))}
    </div>
  );
});
StarField.displayName = 'StarField';

// ============================================================================
// LOADING SCREEN
// ============================================================================

const LoadingScreen = memo(({ lang }: { lang: 'fr' | 'en' }) => (
  <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
    className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center gap-8">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
      <CaurisIcon className="w-20 h-20 text-[#D4AF37]" />
    </motion.div>
    <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      className="text-[#D4AF37] text-xs tracking-[0.4em] font-light uppercase">
      {lang === 'fr' ? 'Chargement de la bibliothèque...' : 'Loading the library...'}
    </motion.p>
  </motion.div>
));
LoadingScreen.displayName = 'LoadingScreen';

// ============================================================================
// WIKIPEDIA HOOK
// ============================================================================

// ============================================================================
// WIKIPEDIA HOOK
// ============================================================================

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
          new URLSearchParams({
            action: 'opensearch',
            search: query,
            limit: '4',
            namespace: '0',
            format: 'json',
            origin: '*',
          }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );

        if (!res.ok) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];

        if (!titles.length) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const detailsRes = await fetch(
          `https://${lang}.wikipedia.org/w/api.php?` +
          new URLSearchParams({
            action: 'query',
            titles: titles.join('|'),
            prop: 'pageimages|extracts',
            piprop: 'thumbnail',
            pithumbsize: '200',
            exintro: 'true',
            exchars: '200',
            explaintext: 'true',
            format: 'json',
            origin: '*',
          }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );

        if (!detailsRes.ok) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const detailsData = await detailsRes.json();
        const pages = detailsData.query?.pages || {};

        const mapped: WikiResult[] = titles
          .map((title: string, idx: number) => {
            const page = Object.values(pages).find((p: any) => p.title === title) as any;
            return {
              title,
              extract: descriptions[idx] || page?.extract || '',
              thumbnail: page?.thumbnail ? { source: page.thumbnail.source } : undefined,
              pageid: page?.pageid || 0,
            };
          })
          .filter((r: WikiResult) => r.pageid > 0);

        cacheRef.current.set(key, mapped);
        setResults(mapped);

      } catch (err) {
        console.error('Wikipedia search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [query, lang, enabled]);

  return { results, isLoading };
}



function parseInline(text: string, catColor: string = '#D4AF37'): React.ReactNode[] {
  if (!text) return [];

  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const colorMatch = remaining.match(/^([\s\S]*?)\{\#\#([^}]+)\}([\s\S]+?)\{\/\}/);
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/);
    const italicMatch = remaining.match(/^([\s\S]*?)\*(?!\*)([\s\S]+?)\*(?!\*)/);

    const candidates = [
      { type: 'color', match: colorMatch },
      { type: 'bold', match: boldMatch },
      { type: 'italic', match: italicMatch },
    ].filter(c => c.match !== null) as { type: string; match: RegExpMatchArray }[];

    if (candidates.length === 0) {
      result.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const best = candidates.reduce((a, b) =>
      a.match.index! <= b.match.index! ? a : b
    );

    const m = best.match;
    const before = m[1];

    if (before) {
      result.push(<span key={key++}>{before}</span>);
    }

    switch (best.type) {
      case 'color':
        result.push(
          <span key={key++} style={{ color: `#${m[2]}` }}>
            {parseInline(m[3], catColor)}
          </span>
        );
        break;

      case 'bold':
        result.push(
          <strong key={key++} className="font-bold text-white">
            {parseInline(m[2], catColor)}
          </strong>
        );
        break;

      case 'italic':
        result.push(
          <em key={key++} className="italic">
            {parseInline(m[2], catColor)}
          </em>
        );
        break;
    }

    remaining = remaining.slice(m[0].length);
  }

  return result;
}
// ============================================================================
// SUGGESTION MODAL
// ============================================================================

const SuggestionModal = memo(({ isOpen, onClose, lang, user }: {
  isOpen: boolean; onClose: () => void; lang: 'fr' | 'en'; user: User | null;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user || !title) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('topic_suggestions').insert({
      title_fr: lang === 'fr' ? title : '',
      title_en: lang === 'en' ? title : '',
      description_fr: lang === 'fr' ? description : '',
      description_en: lang === 'en' ? description : '',
      user_email: user.email,
      status: 'pending',
    });
    if (!error) {
      setSuccess(true);
      setTimeout(() => { onClose(); setTitle(''); setDescription(''); setSuccess(false); }, 2000);
    }
    setIsSubmitting(false);
  }, [user, title, description, lang, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }} onClick={e => e.stopPropagation()}
          className="relative bg-gradient-to-br from-[#0d0d1a] via-[#0a0a14] to-black border border-[#D4AF37]/20 rounded-3xl p-8 w-full max-w-lg shadow-[0_0_80px_rgba(212,175,55,0.1)]">
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent rounded-full" />
          {success ? (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                <CaurisIcon className="w-16 h-16 mx-auto text-[#D4AF37] mb-4" />
              </motion.div>
              <h3 className="text-2xl font-serif text-white mb-2">{lang === 'fr' ? 'Merci !' : 'Thank you!'}</h3>
              <p className="text-gray-400 text-sm">{lang === 'fr' ? 'Votre suggestion voyage vers les étoiles.' : 'Your suggestion travels to the stars.'}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl">
                  <Lightbulb size={24} className="text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-xl font-serif text-white">{lang === 'fr' ? 'Suggérer un sujet' : 'Suggest a topic'}</h2>
                  <p className="text-gray-600 text-xs tracking-wider">{lang === 'fr' ? 'PARTAGEZ VOTRE IDÉE' : 'SHARE YOUR IDEA'}</p>
                </div>
                <button onClick={onClose} className="ml-auto text-gray-600 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              {!user ? (
                <div className="text-center py-8">
                  <UserIcon size={40} className="mx-auto text-gray-700 mb-4" />
                  <p className="text-gray-400 mb-6 text-sm">{lang === 'fr' ? 'Connectez-vous pour contribuer.' : 'Sign in to contribute.'}</p>
                  <Link href="/auth" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors">
                    {lang === 'fr' ? 'Se connecter' : 'Sign in'}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">{lang === 'fr' ? 'Titre du sujet' : 'Topic title'}</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                      placeholder={lang === 'fr' ? 'Ex: La bataille d\'Adwa (1896)' : 'Ex: The Battle of Adwa (1896)'}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">{lang === 'fr' ? 'Description (optionnel)' : 'Description (optional)'}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 transition-colors resize-none placeholder:text-gray-600"
                      placeholder={lang === 'fr' ? 'Pourquoi ce sujet mérite sa place...' : 'Why this topic deserves its place...'} />
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit} disabled={!title || isSubmitting}
                    className="w-full py-3.5 bg-[#D4AF37] text-black rounded-xl font-bold text-sm hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting
                      ? <><Loader2 size={16} className="animate-spin" />{lang === 'fr' ? 'Envoi...' : 'Sending...'}</>
                      : <><Sparkles size={16} />{lang === 'fr' ? 'Envoyer dans le cosmos' : 'Send to the cosmos'}</>}
                  </motion.button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
SuggestionModal.displayName = 'SuggestionModal';

// ============================================================================
// HELPERS
// ============================================================================

function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/\*([\s\S]+?)\*/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1').replace(/==([\s\S]+?)==/g, '$1')
    .replace(/\{#[^}]+\}([\s\S]+?)\{\/\}/g, '$1').replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// ============================================================================
// CATEGORY FILTER BAR
// ============================================================================
const CategoryFilterBar = memo(({ categories, activeCategory, onSelect, lang, activeView }: {
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
  lang: 'fr' | 'en';
  activeView: 'articles' | 'events' | 'timeline';
}) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 0.4 }}
    className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-2 mb-8 -mx-4 px-4 md:mx-0 md:px-0"
    style={{ scrollbarWidth: 'none' }}>

    {/* Tout */}
    <button onClick={() => onSelect('all')}
      className={`flex-shrink-0 flex items-center gap-1 px-2.5 md:px-3.5 py-2 rounded-lg md:rounded-xl text-[11px] md:text-xs font-bold transition-all duration-200 border whitespace-nowrap ${activeCategory === 'all'
          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
          : 'bg-white/[0.03] text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300'
        }`}>
      <Globe size={11} className="md:w-3 md:h-3" />
      {lang === 'fr' ? 'Tout' : 'All'}
    </button>

    {categories.map(cat => (
      <div key={cat.id} className="flex items-center gap-0.5 flex-shrink-0">
        <motion.button
          onClick={() => onSelect(cat.id)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className={`px-2.5 md:px-3.5 py-2 rounded-lg md:rounded-xl text-[11px] md:text-xs font-bold transition-all duration-200 border whitespace-nowrap ${activeCategory === cat.id
              ? 'text-black border-transparent'
              : 'bg-white/[0.03] text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300'
            }`}
          style={activeCategory === cat.id ? { backgroundColor: cat.color, boxShadow: `0 0 15px ${cat.color}50` } : {}}>
          {lang === 'fr' ? cat.name_fr : cat.name_en}
        </motion.button>

      </div>
    ))}
  </motion.div>
));
CategoryFilterBar.displayName = 'CategoryFilterBar';

// ============================================================================
// ARTICLE CARD
// ============================================================================

const ArticleCard = memo(({ article, index, lang, isWiki = false }: {
  article: Article | WikiResult; index: number; lang: 'fr' | 'en'; isWiki?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: '-40px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (isWiki) {
    const wiki = article as WikiResult;
    return (
      <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: Math.min(index * 0.07, 0.35), duration: 0.45 }} className="group relative">
        <a href={`/encyclopedie/wiki/${wiki.pageid}?lang=${lang}`} className="block">
          <div className="relative h-full bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-400">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
              <Globe size={10} className="text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">Wikipedia</span>
            </div>
            <div className="relative h-44 overflow-hidden bg-[#0a0a15]">
              {wiki.thumbnail?.source ? (
                <img src={wiki.thumbnail.source} alt="" loading="lazy"
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Globe size={36} className="text-gray-800" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/50 to-transparent" />
            </div>
            <div className="p-5">
              <h3 className="text-white/90 font-serif text-base mb-2 line-clamp-2 group-hover:text-white transition-colors leading-snug">{wiki.title}</h3>
              <p className="text-gray-600 text-xs line-clamp-3 mb-4 leading-relaxed">{wiki.extract}</p>
              <span className="inline-flex items-center gap-1.5 text-gray-500 text-xs group-hover:text-gray-300 transition-colors">
                {lang === 'fr' ? 'Lire sur Wikipedia' : 'Read on Wikipedia'}<ArrowRight size={12} />
              </span>
            </div>
          </div>
        </a>
      </motion.div>
    );
  }

  const art = article as Article;
  const title = lang === 'fr' ? art.title_fr : art.title_en;
  const summary = lang === 'fr' ? art.summary_fr : art.summary_en;
  const catColor = art.categories?.color || '#D4AF37';

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.07, 0.35), duration: 0.45 }} className="group relative">
      <Link href={`/encyclopedie/${art.slug}`} className="block h-full">
        <div className="relative h-full bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-400">
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: `inset 0 0 0 1px ${catColor}40, 0 0 40px ${catColor}10` }} />
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl" style={{ backgroundColor: catColor, opacity: 0.6 }} />
          <div className="absolute top-3 left-4 right-3 z-10 flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1 bg-[#D4AF37] px-2 py-0.5 rounded-full w-fit">
                <CaurisIcon className="w-2.5 h-2.5 text-black" />
                <span className="text-[9px] font-bold text-black tracking-[0.15em] uppercase">Lukeni</span>
              </span>
              {art.categories && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider w-fit"
                  style={{ backgroundColor: `${catColor}20`, color: catColor }}>
                  {lang === 'fr' ? art.categories.name_fr : art.categories.name_en}
                </span>
              )}
            </div>
            <FavoriteButton itemType="article" itemId={art.id} size={14} />
          </div>
          <div className="relative h-52 overflow-hidden">
            <img src={art.image_url || FALLBACK_IMG} alt="" loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/40 to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              {art.view_count !== undefined && (
                <span className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-white/70 text-[10px]">
                  <Eye size={9} />{art.view_count}
                </span>
              )}
              {art.reading_time && (
                <span className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-white/70 text-[10px]">
                  <Clock size={9} />{art.reading_time} min
                </span>
              )}
            </div>
          </div>
          <div className="p-5 pl-6">
            <h3 className="text-white font-serif text-lg mb-2 line-clamp-2 group-hover:text-[#D4AF37] transition-colors duration-300 leading-snug">
              {parseInline(title, catColor)}
            </h3>
            <p className="text-gray-500 text-sm line-clamp-3 mb-4 leading-relaxed">
              {parseInline(summary, catColor)}
            </p>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold transition-all duration-200 group-hover:gap-2.5" style={{ color: catColor }}>
                {lang === 'fr' ? "Lire l'article" : 'Read article'}<ArrowRight size={14} />
              </span>
              <span className="text-gray-700 text-[10px] font-mono">
                {new Date(art.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
ArticleCard.displayName = 'ArticleCard';

// ============================================================================
// EVENT CARD
// ============================================================================

const EventCard = memo(({ event, index, lang, linkedArticles }: {
  event: EncycloEvent; index: number; lang: 'fr' | 'en';
  linkedArticles?: ArticleEventLink[];
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: '-30px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const title = lang === 'fr' ? event.title_fr : event.title_en;
  const desc = lang === 'fr' ? event.desc_fr : event.desc_en;
  const catColor = event.categories?.color || '#D4AF37';

  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.4 }} className="group relative">
      <div className="relative flex gap-0 bg-gradient-to-r from-[#0d0d1a] to-[#080810] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300">
        <div className="flex-shrink-0 flex flex-col items-center justify-center px-4 py-4 min-w-[72px]"
          style={{ borderRight: `1px solid ${catColor}20` }}>
          <div className="font-mono font-bold text-lg leading-none" style={{ color: catColor }}>{Math.abs(event.year)}</div>
          {event.year < 0 && <div className="text-gray-700 text-[8px] font-mono mt-0.5 text-center">av. J-C</div>}
          {event.event_day && event.event_month && (
            <div className="text-gray-600 text-[9px] font-mono mt-1.5">
              {String(event.event_day).padStart(2, '0')}/{String(event.event_month).padStart(2, '0')}
            </div>
          )}
        </div>
        {event.image_url && (
          <div className="flex-shrink-0 w-20 h-20 self-center ml-3 rounded-xl overflow-hidden border border-white/[0.06]">
            <img src={event.image_url} alt="" loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
          </div>
        )}
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="text-white font-bold text-sm line-clamp-1 group-hover:text-[color:var(--cat)] transition-colors duration-300"
              style={{ '--cat': catColor } as React.CSSProperties}>{title}</h4>
            <FavoriteButton itemType="event" itemId={event.id} size={13} />
          </div>
          <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">{desc}</p>
          <div className="flex flex-wrap items-center gap-2">
            {event.country && <span className="text-gray-600 text-[10px] font-mono">{event.country}</span>}
            {event.categories && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                {lang === 'fr' ? event.categories.name_fr : event.categories.name_en}
              </span>
            )}
          </div>
          {linkedArticles && linkedArticles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.05]">
              {linkedArticles.map(link => (
                <Link key={link.article_id} href={`/encyclopedie/${link.articles?.slug}`}
                  className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1 border border-white/[0.06]">
                  <BookOpen size={8} />
                  {cleanTitle(lang === 'fr' ? link.articles?.title_fr : link.articles?.title_en)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
EventCard.displayName = 'EventCard';

// ============================================================================
// TIMELINE VIEW
// ============================================================================
const TimelineView = memo(({ events, lang, eventLinksMap }: {
  events: EncycloEvent[]; lang: 'fr' | 'en';
  eventLinksMap: Record<string, ArticleEventLink[]>;
}) => {
  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; events: EncycloEvent[]; color: string }> = {};
    events.forEach(evt => {
      let period: string, color: string;
      if (evt.year < 0) { period = `${Math.abs(Math.floor(evt.year / 500)) * 500}+ av. J-C`; color = '#9370DB'; }
      else if (evt.year < 1500) { period = `${Math.floor(evt.year / 100) + 1}e siècle`; color = '#20B2AA'; }
      else if (evt.year < 1800) { period = evt.year < 1700 ? '1500–1699' : '1700–1799'; color = '#D4AF37'; }
      else if (evt.year < 1900) { period = '1800–1899'; color = '#FF6B9D'; }
      else if (evt.year < 2000) { period = `${Math.floor(evt.year / 10) * 10}s`; color = '#4ADE80'; }
      else { period = `${Math.floor(evt.year / 10) * 10}s`; color = '#60A5FA'; }
      if (!groups[period]) groups[period] = { label: period, events: [], color };
      groups[period].events.push(evt);
    });
    return Object.values(groups).sort((a, b) => (b.events[0]?.year ?? 0) - (a.events[0]?.year ?? 0));
  }, [events]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-6 text-gray-600 text-xs">
        <motion.div animate={{ x: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}><ArrowRight size={14} /></motion.div>
        <span className="tracking-wider uppercase text-[9px] md:text-[10px]">{lang === 'fr' ? 'Naviguez dans le temps' : 'Navigate through time'}</span>
      </div>
      <div className="overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-0 min-w-max relative">

          <div className="absolute top-[52px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
          {grouped.map((group, gi) => (
            <div key={group.label} className="flex flex-col items-center" style={{ minWidth: 200 }}>
              <div className="relative flex flex-col items-center mb-4 z-10">
                <motion.div className="w-4 h-4 rounded-full border-2 border-black"
                  style={{ backgroundColor: group.color, boxShadow: `0 0 12px ${group.color}` }}
                  animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity, delay: gi * 0.5 }} />
                <span className="mt-2 text-[9px] font-bold tracking-[0.15em] uppercase text-center px-2" style={{ color: group.color }}>{group.label}</span>
              </div>
              <div className="flex flex-col gap-2 px-2 w-full">
                {group.events.slice(0, 4).map((evt, ei) => {
                  const evtTitle = lang === 'fr' ? evt.title_fr : evt.title_en;
                  const evtLinks = eventLinksMap[evt.id] || [];
                  return (
                    <motion.div key={evt.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: ei * 0.08 }} whileHover={{ scale: 1.02, x: 2 }}>
                      <div className="p-2.5 rounded-xl border transition-all duration-300"
                        style={{ backgroundColor: `${group.color}08`, borderColor: `${group.color}20` }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[9px] font-bold" style={{ color: group.color }}>{Math.abs(evt.year)}</span>
                          {evt.country && <span className="text-[9px] text-gray-600">{evt.country}</span>}
                        </div>
                        <p className="text-white/80 text-[10px] line-clamp-2 leading-snug">{evtTitle}</p>
                        {evtLinks.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <BookOpen size={7} style={{ color: group.color }} />
                            <span className="text-[8px] text-gray-500">{evtLinks.length} {lang === 'fr' ? 'article(s)' : 'article(s)'}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {group.events.length > 4 && (
                  <div className="text-center text-[9px] text-gray-600 py-1">+{group.events.length - 4} {lang === 'fr' ? 'autres' : 'more'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 pt-8 border-t border-white/[0.05]">
        <h3 className="text-gray-600 text-[10px] tracking-[0.3em] uppercase mb-6 flex items-center gap-2">
          <History size={12} />{lang === 'fr' ? 'Tous les événements' : 'All events'}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {events.map((evt, i) => <EventCard key={evt.id} event={evt} index={i} lang={lang} linkedArticles={eventLinksMap[evt.id]} />)}
        </div>
      </div>
    </div>
  );
});
TimelineView.displayName = 'TimelineView';

// ============================================================================
// HERO SECTION
// ============================================================================

const HeroSection = memo(({ lang, articleCount, eventCount }: {
  lang: 'fr' | 'en'; articleCount: number; eventCount: number;
}) => {
  const titleChars = (lang === 'fr' ? 'Archives des Mémoires' : 'Archives of Memories').split('');
  return (
    <div className="relative text-center py-16 md:py-24 overflow-hidden">
      <motion.div className="flex justify-center mb-8" initial={{ opacity: 0, scale: 0.5, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, ease: 'easeOut' }}>
        <div className="relative">
          <motion.div className="absolute inset-0 rounded-full"
            animate={{ boxShadow: ['0 0 20px rgba(212,175,55,0.3)', '0 0 50px rgba(212,175,55,0.6)', '0 0 20px rgba(212,175,55,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity }} />
          <CaurisIcon className="w-16 h-16 md:w-20 md:h-20 text-[#D4AF37] relative z-10" />
        </div>
      </motion.div>
      <div className="flex flex-wrap justify-center gap-0 mb-4 overflow-hidden">
        {titleChars.map((char, i) => (
          <motion.span key={i} className={`font-serif text-3xl sm:text-4xl md:text-6xl ${char === ' ' ? 'w-4' : ''}`}
            style={{ background: i < 12 ? 'linear-gradient(135deg, #ffffff, #D4AF37)' : 'linear-gradient(135deg, #D4AF37, #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.04, duration: 0.4, ease: 'easeOut' }}>
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8, duration: 0.6 }}
        className="text-gray-500 text-sm md:text-base max-w-lg mx-auto tracking-wide mb-10">
        {lang === 'fr' ? 'La mémoire africaine et diaspora, encodée dans les étoiles.' : 'African and diaspora memory, encoded in the stars.'}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.5 }}
        className="flex items-center justify-center gap-8">
        {[
          { value: articleCount, label_fr: 'Articles', label_en: 'Articles', icon: BookOpen },
          { value: eventCount, label_fr: 'Événements', label_en: 'Events', icon: Calendar },
        ].map(({ value, label_fr, label_en, icon: Icon }) => (
          <div key={label_fr} className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <Icon size={14} className="text-[#D4AF37]/60" />
              <span className="text-2xl font-serif font-bold text-[#D4AF37]">{value}</span>
            </div>
            <span className="text-gray-600 text-[10px] tracking-[0.25em] uppercase">{lang === 'fr' ? label_fr : label_en}</span>
          </div>
        ))}
        <div className="w-px h-8 bg-white/10" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2"><Globe size={14} className="text-[#D4AF37]/60" /><span className="text-2xl font-serif font-bold text-[#D4AF37]">2</span></div>
          <span className="text-gray-600 text-[10px] tracking-[0.25em] uppercase">{lang === 'fr' ? 'Langues' : 'Languages'}</span>
        </div>
      </motion.div>
    </div>
  );
});
HeroSection.displayName = 'HeroSection';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function EncyclopediePage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [articles, setArticles] = useState<Article[]>([]);
  const [events, setEvents] = useState<EncycloEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [activeView, setActiveView] = useState<'articles' | 'events' | 'timeline'>('articles');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [page, setPage] = useState(1);
  const [eventArticleLinks, setEventArticleLinks] = useState<ArticleEventLink[]>([]);

  const showWiki = activeView === 'articles' && searchTerm.length >= 3;
  const { results: wikiResults, isLoading: wikiLoading } = useWikipediaSearch(searchTerm, lang, showWiki);

  // Mouse parallax
  useEffect(() => {
    let rafId: number;
    const h = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setMousePos({ x: (e.clientX / window.innerWidth) - 0.5, y: (e.clientY / window.innerHeight) - 0.5 }));
    };
    window.addEventListener('mousemove', h, { passive: true });
    return () => { window.removeEventListener('mousemove', h); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Initial fetch
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setPage(1);
      const [catResult, artResult, evtResult, linkResult] = await Promise.all([
        supabase.from('categories').select('id, name_fr, name_en, color, icon').eq('is_active', true).eq('show_encyclopedie', true).order('name_fr'),
        supabase.from('articles').select('id, title_fr, title_en, image_url, summary_fr, summary_en, status, created_at, view_count, reading_time, slug, categories(id, name_fr, name_en, color)').eq('status', 'published').order('created_at', { ascending: false }).limit(ARTICLES_PER_PAGE * 3),
        supabase.from('events').select('id, title_fr, title_en, desc_fr, desc_en, year, event_month, event_day, country, importance, image_url, categories(id, name_fr, name_en, color)').eq('status', 'published').order('year', { ascending: false }).limit(60),
        supabase.from('article_events').select('event_id, article_id, articles(id, title_fr, title_en, slug)'),
      ]);
      if (catResult.data) setCategories(catResult.data as Category[]);
      if (artResult.data) setArticles(artResult.data as unknown as Article[]);
      if (evtResult.data) setEvents(evtResult.data as unknown as EncycloEvent[]);
      if (linkResult.data) setEventArticleLinks(linkResult.data as unknown as ArticleEventLink[]);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  // Refetch on category change
  useEffect(() => {
    if (!mounted) return;
    async function refetch() {
      setIsLoading(true);
      setPage(1);
      let artQ = supabase.from('articles').select('id, title_fr, title_en, image_url, summary_fr, summary_en, status, created_at, view_count, reading_time, slug, categories(id, name_fr, name_en, color)').eq('status', 'published').order('created_at', { ascending: false }).limit(ARTICLES_PER_PAGE * 3);
      let evtQ = supabase.from('events').select('id, title_fr, title_en, desc_fr, desc_en, year, event_month, event_day, country, importance, image_url, categories(id, name_fr, name_en, color)').eq('status', 'published').order('year', { ascending: false }).limit(60);
      if (activeCategory !== 'all') { artQ = artQ.eq('category_id', activeCategory); evtQ = evtQ.eq('category_id', activeCategory); }
      const [artResult, evtResult] = await Promise.all([artQ, evtQ]);
      if (artResult.data) setArticles(artResult.data as unknown as Article[]);
      if (evtResult.data) setEvents(evtResult.data as unknown as EncycloEvent[]);
      setIsLoading(false);
    }
    refetch();
  }, [activeCategory, mounted]);

  const filteredArticles = useMemo(() => {
    if (!searchTerm) return articles;
    const q = searchTerm.toLowerCase();
    return articles.filter(a => a.title_fr?.toLowerCase().includes(q) || a.title_en?.toLowerCase().includes(q));
  }, [articles, searchTerm]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm) return events;
    const q = searchTerm.toLowerCase();
    return events.filter(e => e.title_fr?.toLowerCase().includes(q) || e.title_en?.toLowerCase().includes(q));
  }, [events, searchTerm]);

  const paginatedArticles = useMemo(() => filteredArticles.slice(0, page * ARTICLES_PER_PAGE), [filteredArticles, page]);
  const eventLinksMap = useMemo(() => {
    const map: Record<string, ArticleEventLink[]> = {};
    eventArticleLinks.forEach(link => {
      if (!map[link.event_id]) map[link.event_id] = [];
      map[link.event_id].push(link);
    });
    return map;
  }, [eventArticleLinks]);

  const handleLangChange = useCallback((newLang: 'fr' | 'en') => {
    setLang(newLang);
    localStorage.setItem('lukeni_lang', newLang);
  }, []);

  const handleCategorySelect = useCallback((id: string) => {
    setActiveCategory(id);
    setPage(1);
  }, []);

  useEffect(() => { setPage(1); }, [searchTerm, activeView]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#03032B] to-[#000000] text-white overflow-x-hidden">
      <AnimatePresence>{isLoading && <LoadingScreen lang={lang} />}</AnimatePresence>
      <StarField mousePos={mousePos} />

      <div className="relative z-40">
        <SpaceHeader
          title={lang === 'fr' ? 'Encyclopédie' : 'Encyclopedia'}
          icon={<CaurisIcon className="w-5 h-5" />}
          accentColor="#D4AF37"
          lang={lang}
          onLangChange={handleLangChange}
        />
      </div>

            {/* Boutons flottants en bas à droite */}
      <div className="fixed bottom-8 right-6 z-30 flex flex-col gap-3 items-end">
        
        {/* NOUVEAU : LE BOUTON PUSH */}
        <PushSubscribeButton isOrganic={false} />

        {/* ANCIEN : Bouton Suggérer un sujet */}
        <motion.button onClick={() => setShowSuggestionModal(true)}
  className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-3 rounded-full font-bold text-sm shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:bg-white transition-colors"
  whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(212,175,55,0.6)' }}
  whileTap={{ scale: 0.95 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}>
  <Plus size={18} />
  {/* ✅ SUPPRESSION DU hidden sm:inline */}
  <span className="text-sm">
    {lang === 'fr' ? 'Suggérer un sujet' : 'Suggest a topic'}
  </span>
</motion.button>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <HeroSection lang={lang} articleCount={articles.length} eventCount={events.length} />

        {/* SEARCH */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.5 }}
          className="relative max-w-2xl mx-auto mb-10">
          <div className="relative group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder={lang === 'fr' ? 'Rechercher dans la bibliothèque...' : 'Search the library...'}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white text-base outline-none focus:border-[#D4AF37]/40 focus:bg-white/[0.05] transition-all placeholder:text-gray-700" />
            <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300"
              style={{ boxShadow: '0 0 0 1px rgba(212,175,55,0.2), 0 0 30px rgba(212,175,55,0.05)' }} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

            <DropdownSearch
  searchTerm={searchTerm}
  lang={lang}
  onSelect={() => setSearchTerm('')}
  articles={articles}
/>
        </motion.div>

                {/* VIEW TABS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.4 }}
          className="flex items-center justify-center mb-8 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-1.5 min-w-max md:min-w-0">
            {[
              { key: 'articles', icon: BookOpen, label_fr: 'Articles', label_en: 'Articles', count: articles.length },
              { key: 'events', icon: Flag, label_fr: 'Événements', label_en: 'Events', count: events.length },
              { key: 'timeline', icon: History, label_fr: 'Chronologie', label_en: 'Timeline', count: null },
            ].map(({ key, icon: Icon, label_fr, label_en, count }) => (
              <motion.button key={key} onClick={() => setActiveView(key as typeof activeView)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeView === key ? 'text-black' : 'text-gray-500 hover:text-gray-300'}`}>
                {activeView === key && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl bg-[#D4AF37]"
                    style={{ boxShadow: '0 0 20px rgba(212,175,55,0.4)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={14} className="md:w-[15px] md:h-[15px]" />
                  {lang === 'fr' ? label_fr : label_en}
                  {count !== null && (
                    <span className={`text-[7px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded-full font-mono ${activeView === key ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-500'}`}>{count}</span>
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ✅ CATEGORY FILTER BAR */}
        <CategoryFilterBar
          categories={categories}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
          lang={lang}
          activeView={activeView}
        />

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          {activeView === 'articles' && (
            <motion.div key="articles" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
              {paginatedArticles.length === 0 && !searchTerm && !isLoading ? (
                <div className="text-center py-24">
                  <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Scroll size={56} className="mx-auto text-gray-800 mb-4" />
                  </motion.div>
                  <p className="text-gray-600 text-sm tracking-wider">{lang === 'fr' ? 'La bibliothèque se remplit...' : 'The library is filling up...'}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {paginatedArticles.map((article, i) => <ArticleCard key={article.id} article={article} index={i} lang={lang} />)}
                  </div>
                  {paginatedArticles.length < filteredArticles.length && (
                    <div className="flex justify-center mb-10">
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setPage(p => p + 1)}
                        className="px-8 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-sm font-bold text-gray-400 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all">
                        {lang === 'fr' ? 'Explorer davantage' : 'Explore more'}
                        <span className="ml-2 text-[10px] text-gray-600">({filteredArticles.length - paginatedArticles.length} {lang === 'fr' ? 'restants' : 'remaining'})</span>
                      </motion.button>
                    </div>
                  )}
                  {showWiki && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10 pt-8 border-t border-white/[0.05]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <div className="flex items-center gap-2 text-gray-600">
                          <Globe size={14} />
                          <span className="text-[10px] tracking-[0.3em] uppercase font-bold">{lang === 'fr' ? 'Également sur Wikipedia' : 'Also on Wikipedia'}</span>
                          {wikiLoading && <Loader2 size={12} className="animate-spin" />}
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                      </div>
                      {wikiResults.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {wikiResults.map((result, i) => <ArticleCard key={result.pageid} article={result} index={i} lang={lang} isWiki />)}
                        </div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeView === 'events' && (
            <motion.div key="events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
              {filteredEvents.length === 0 && !isLoading ? (
                <div className="text-center py-24">
                  <Calendar size={56} className="mx-auto text-gray-800 mb-4" />
                  <p className="text-gray-600 text-sm tracking-wider">{lang === 'fr' ? 'Aucun événement trouvé.' : 'No events found.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredEvents.map((evt, i) => <EventCard key={evt.id} event={evt} index={i} lang={lang} linkedArticles={eventLinksMap[evt.id]} />)}
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'timeline' && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
              {filteredEvents.length === 0 && !isLoading ? (
                <div className="text-center py-24">
                  <History size={56} className="mx-auto text-gray-800 mb-4" />
                  <p className="text-gray-600 text-sm tracking-wider">{lang === 'fr' ? 'Aucun événement à afficher.' : 'No events to display.'}</p>
                </div>
              ) : (
                <TimelineView events={filteredEvents} lang={lang} eventLinksMap={eventLinksMap} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-24" />
      </div>


      
      
          
      <SuggestionModal isOpen={showSuggestionModal} onClose={() => setShowSuggestionModal(false)} lang={lang} user={user} />


    </div>
  );
}

// ============================================================================
// DROPDOWN SEARCH COMPONENT
// ============================================================================

interface DropdownSearchProps {
  searchTerm: string;
  lang: 'fr' | 'en';
  onSelect: () => void;
   articles: Article[]; 
}

function DropdownSearch({ searchTerm, lang, onSelect, articles }: DropdownSearchProps) {
  const showExternalApis = searchTerm.length >= 3;

  // Lukeni + Wikipedia
  const filteredArticles = useMemo(() => {
    if (!searchTerm) return [];
    const q = searchTerm.toLowerCase();
    return articles.filter(
      (a) =>
        a.title_fr?.toLowerCase().includes(q) ||
        a.title_en?.toLowerCase().includes(q)
    );
  }, [articles, searchTerm]);

  const showWiki = searchTerm.length >= 3;
  const { results: wikiResults, isLoading: wikiLoading } =
    useWikipediaSearch(searchTerm, lang, showWiki);

  // External APIs
  const { results: archiveResults, isLoading: archiveLoading } =
    useInternetArchive(searchTerm, showExternalApis);
  const { results: scholarResults, isLoading: scholarLoading } =
    useSemanticScholar(searchTerm, showExternalApis);
  const { results: coreResults, isLoading: coreLoading } = useCoreApi(
    searchTerm,
    showExternalApis
  );
  const { results: arxivResults, isLoading: arxivLoading } = useArxiv(
    searchTerm,
    undefined,
    showExternalApis
  );

  if (searchTerm.length < 3) return null;

  const hasResults =
    filteredArticles.length > 0 ||
    wikiResults.length > 0 ||
    Object.values(archiveResults).some((arr) => arr.length > 0) ||
    scholarResults.length > 0 ||
    coreResults.length > 0 ||
    arxivResults.length > 0;

  if (
    !hasResults &&
    !wikiLoading &&
    !archiveLoading &&
    !scholarLoading &&
    !coreLoading &&
    !arxivLoading
  ) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full left-0 right-0 mt-2 bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[80vh] overflow-y-auto scrollbar-hide"
      >
        {/* ── LUKENI ARTICLES ── */}
        {filteredArticles.length > 0 && (
          <>
            <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0d0d1a] z-10">
              <CaurisIcon className="w-3 h-3 text-[#D4AF37]" />
              <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase">
                {lang === 'fr' ? 'Articles Lukeni' : 'Lukeni Articles'}
              </span>
              <span className="text-[9px] text-gray-600 ml-auto">
                {filteredArticles.length}{' '}
                {lang === 'fr' ? 'résultat(s)' : 'result(s)'}
              </span>
            </div>
            {filteredArticles.slice(0, 4).map((article) => (
              <Link
                key={article.id}
                href={`/encyclopedie/${article.slug}`}
                onClick={onSelect}
                className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors group border-b border-white/[0.03]"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/5">
                  <img
                    src={article.image_url || FALLBACK_IMG}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate group-hover:text-[#D4AF37] transition-colors">
                    {stripFormatting(
                      lang === 'fr' ? article.title_fr : article.title_en
                    )}
                  </p>
                  <p className="text-gray-600 text-xs truncate">
                    {stripFormatting(
                      lang === 'fr'
                        ? article.summary_fr
                        : article.summary_en
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {article.categories && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: `${article.categories.color}20`,
                        color: article.categories.color,
                      }}
                    >
                      {lang === 'fr'
                        ? article.categories.name_fr
                        : article.categories.name_en}
                    </span>
                  )}
                  <ArrowRight size={12} className="text-gray-700" />
                </div>
              </Link>
            ))}
            {filteredArticles.length > 4 && (
              <div className="px-3 py-2 text-center border-b border-white/[0.03]">
                <span className="text-[9px] text-gray-600">
                  +{filteredArticles.length - 4}{' '}
                  {lang === 'fr'
                    ? 'autres articles Lukeni'
                    : 'more Lukeni articles'}
                </span>
              </div>
            )}
          </>
        )}

        {/* ── WIKIPEDIA ── */}
        {wikiResults.length > 0 && (
          <>
            <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0d0d1a] z-10">
              <Globe size={12} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">
                {lang === 'fr'
                  ? 'Résultats Wikipedia'
                  : 'Wikipedia Results'}
              </span>
              {wikiLoading && (
                <Loader2 size={10} className="animate-spin text-gray-600 ml-auto" />
              )}
            </div>
            {wikiResults.map((result) => (
              <Link
                key={`wiki-${result.pageid}`}
                href={`/encyclopedie/wiki/${result.pageid}?lang=${lang}`}
                onClick={onSelect}
                className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors group border-b border-white/[0.03] last:border-0"
              >
                {result.thumbnail?.source ? (
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden">
                    <img
                      src={result.thumbnail.source}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Globe size={14} className="text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate group-hover:text-[#D4AF37] transition-colors">
                    {result.title}
                  </p>
                  <p className="text-gray-600 text-xs truncate">
                    {result.extract}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                    Wiki
                  </span>
                  <ArrowRight size={12} className="text-gray-700" />
                </div>
              </Link>
            ))}
          </>
        )}

        {/* ── ARCHIVE.ORG ── */}
        <ArchiveSection
          type="texts"
          items={archiveResults.texts}
          lang={lang}
        />
        <ArchiveSection
          type="image"
          items={archiveResults.image}
          lang={lang}
        />
        <ArchiveSection
          type="audio"
          items={archiveResults.audio}
          lang={lang}
        />
        <ArchiveSection
          type="movies"
          items={archiveResults.movies}
          lang={lang}
        />

        {/* ── SEMANTIC SCHOLAR ── */}
        <ScholarSection items={scholarResults} lang={lang} />

        {/* ── CORE API ── */}
        <CoreSection items={coreResults} lang={lang} />

        {/* ── arXiv ── */}
        <ArxivSection items={arxivResults} lang={lang} />

        {/* Footer */}
        <div className="p-2 text-center border-t border-white/[0.03] sticky bottom-0 bg-[#0d0d1a]">
          <span className="text-[9px] text-gray-700">
            {lang === 'fr'
              ? 'Cliquez pour lire dans le design Lukeni'
              : 'Click to read in Lukeni design'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


