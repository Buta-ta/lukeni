// /presse/page.tsx
"use client";


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  Search, MapPin, Loader2, ArrowRight, ArrowLeft, Bell,
  Share2, Calendar, User, Headphones, BookOpen, ExternalLink,
  Check, Volume2, VolumeX, Play, Pause, Globe, Clock,
  ChevronRight, Zap, LayoutGrid, List, Film, Newspaper,
  Music, ScrollText, BookMarked, Home, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import SuggestButton from '@/components/SuggestButton';
import FavoriteButton from '@/components/FavoriteButton';
import SubscribeButton from '@/components/SubscribeButton';
import SubscribeModal from '@/components/SubscribeModal';
import { NotesplitContainer } from '@/components/NotesplitContainer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string; name_fr: string; name_en: string; color: string;
}
interface MediaItem {
  type: 'image' | 'video' | 'link'; url: string; caption?: string; alt?: string;
}
interface Source {
  title: string; url: string; author?: string; date?: string;
}
interface PressArticle {
  id: string; title_fr: string; title_en: string; cover_url: string;
  summary_fr: string; summary_en: string;
  content_fr?: string; content_en?: string;
  author_name: string; published_at?: string;
  categories: Category; category_id: string;
  audio_url?: string; media_items?: MediaItem[];
  sources?: Source[];
  geographic_scope?: 'local' | 'national' | 'regional' | 'international';
  location_city?: string; location_country?: string;
}

// ✅ Profil utilisateur pour la navbar
interface UserProfile {
  avatar_url: string | null;
  full_name: string | null;
}

type ViewMode = 'magazine' | 'list' | 'cinema';

// ─── Icône Cauris ─────────────────────────────────────────────────────────────

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="caurisGlowPress" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path fill="url(#caurisGlowPress)"
      d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
         M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const estimateReadingTime = (text?: string) =>
  Math.max(1, Math.ceil((text?.trim().split(/\s+/).length ?? 0) / 200));

const stripMarkdown = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[MEDIA:\d+\]/g, '').replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '').replace(/^[-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]*>/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, ' ')
    .replace(/\s+/g, ' ').trim();

const renderContentWithMedia = (raw: string, mediaItems?: MediaItem[]): string => {
  if (!raw) return '';
  let html = raw;

  html = html.replace(/^## (.+)$/gm,
    '<h2 class="text-2xl font-serif text-white mt-10 mb-4 pb-2 border-b border-white/10">$1</h2>');
  html = html.replace(/^### (.+)$/gm,
    '<h3 class="text-lg font-bold text-white/90 mt-6 mb-3">$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-white/80">$1</em>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#D4AF37] hover:opacity-70 underline underline-offset-4">$1</a>');
  html = html.replace(/^> (.+)$/gm,
    '<blockquote class="border-l-4 border-[#D4AF37] pl-6 py-2 italic text-white/60 my-6 bg-white/[0.02] rounded-r-xl">$1</blockquote>');
  html = html.replace(/^- (.+)$/gm,
    '<li class="ml-6 mb-2 list-disc text-white/70 marker:text-[#D4AF37]">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm,
    '<li class="ml-6 mb-2 list-decimal text-white/70 marker:text-[#D4AF37]">$1</li>');

  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    if (trimmed.match(/^\[MEDIA:\d+\]/)) return trimmed;
    return `<p class="mb-5 leading-[1.9] text-white/65">${trimmed}</p>`;
  }).join('\n\n');

  if (mediaItems && mediaItems.length > 0) {
    mediaItems.forEach((media, idx) => {
      const marker = `[MEDIA:${idx}]`;
      let block = '';
      if (media.type === 'image') {
        block = `<figure class="my-8 rounded-2xl overflow-hidden border border-white/8">
          <img src="${media.url}" alt="${media.alt || media.caption || ''}" class="w-full object-cover" loading="lazy" />
          ${media.caption ? `<figcaption class="px-4 py-3 text-center text-xs text-white/40 italic bg-white/[0.02]">${media.caption}</figcaption>` : ''}
        </figure>`;
      } else if (media.type === 'video') {
        block = `<figure class="my-8">
          <video controls class="w-full rounded-2xl border border-white/8" preload="metadata">
            <source src="${media.url}" />
          </video>
          ${media.caption ? `<figcaption class="text-center text-xs text-white/40 mt-3 italic">${media.caption}</figcaption>` : ''}
        </figure>`;
      } else if (media.type === 'link') {
        block = `<a href="${media.url}" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 my-6 p-4 bg-[#D4AF37]/8 border border-[#D4AF37]/20 rounded-2xl hover:border-[#D4AF37]/40 transition-all group">
          <span class="text-2xl">🔗</span>
          <span class="text-[#D4AF37] font-medium text-sm group-hover:underline">${media.caption || media.url}</span>
        </a>`;
      }
      html = html
        .replace(`<p class="mb-5 leading-[1.9] text-white/65">${marker}</p>`, block)
        .replace(marker, block);
    });
  }
  return html;
};

// ─── Cosmos background ────────────────────────────────────────────────────────

const CosmosBackground = ({ mousePos, intensity = 1 }: {
  mousePos: { x: number; y: number }; intensity?: number;
}) => {
  const bgStars = useMemo(() =>
    Array.from({ length: 180 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.4,
      depth: Math.random() * 12 + 3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 3,
    })), []);

  const nebulae = [
    { id: 1, x: 15, y: 20, size: 320, color: '#9370DB' },
    { id: 2, x: 70, y: 55, size: 260, color: '#D4AF37' },
    { id: 3, x: 45, y: 75, size: 200, color: '#20B2AA' },
  ];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {nebulae.map(n => (
        <motion.div key={n.id} className="absolute rounded-full"
          style={{
            left: `${n.x}%`, top: `${n.y}%`,
            width: n.size, height: n.size,
            background: `radial-gradient(circle, ${n.color}18 0%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 12 + n.id * 3, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      {bgStars.map(star => (
        <motion.div key={star.id} className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
          animate={{
            x: mousePos.x * star.depth * intensity,
            y: mousePos.y * star.depth * intensity,
            opacity: [0.15, 0.7, 0.15],
          }}
          transition={{
            opacity: { duration: star.duration, repeat: Infinity, delay: star.delay },
            x: { type: 'spring', stiffness: 30, damping: 20 },
            y: { type: 'spring', stiffness: 30, damping: 20 },
          }} />
      ))}
    </div>
  );
};

// ─── Barre de progression ─────────────────────────────────────────────────────

const ReadingProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#D4AF37] origin-left z-[200]"
      style={{ scaleX }}
    />
  );
};

// ─── View Switcher ────────────────────────────────────────────────────────────

const ViewSwitcher = ({ current, onChange, lang }: {
  current: ViewMode; onChange: (v: ViewMode) => void; lang: 'fr' | 'en';
}) => {
  const views = [
    { key: 'magazine' as ViewMode, Icon: LayoutGrid, label_fr: 'Magazine', label_en: 'Magazine' },
    { key: 'list'     as ViewMode, Icon: List,       label_fr: 'Liste',    label_en: 'List' },
    { key: 'cinema'   as ViewMode, Icon: Film,       label_fr: 'Cinéma',   label_en: 'Cinema' },
  ];
  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-sm">
      {views.map(({ key, Icon, label_fr, label_en }) => (
        <motion.button key={key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${
            current === key
              ? 'bg-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]'
              : 'text-white/40 hover:text-white/70'
          }`}>
          <Icon size={11} />
          <span className="hidden sm:block">{lang === 'fr' ? label_fr : label_en}</span>
        </motion.button>
      ))}
    </div>
  );
};

// ─── Article Card ─────────────────────────────────────────────────────────────

const ArticleCard = ({ article, lang, index, onClick, variant = 'standard' }: {
  article: PressArticle; lang: 'fr' | 'en'; index: number;
  onClick: () => void; variant?: 'hero' | 'featured' | 'standard' | 'list' | 'cinema';
}) => {
  const title = lang === 'fr' ? article.title_fr : article.title_en;
  const summary = lang === 'fr' ? article.summary_fr : article.summary_en;
  const cat = lang === 'fr' ? article.categories?.name_fr : article.categories?.name_en;
  const starColor = article.categories?.color || '#D4AF37';
  const readTime = estimateReadingTime(lang === 'fr' ? article.content_fr : article.content_en);
  const dateStr = article.published_at
    ? new Date(article.published_at).toLocaleDateString(
        lang === 'fr' ? 'fr-FR' : 'en-US',
        { day: 'numeric', month: 'short', year: 'numeric' }
      )
    : '';

  if (variant === 'list') {
    return (
      <motion.article
        initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ delay: index * 0.05, duration: 0.5 }}
        onClick={onClick}
        className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-white/6 bg-white/[0.01] cursor-pointer hover:border-[#D4AF37]/30 hover:bg-white/[0.03] transition-all"
      >
        <div className="relative w-full sm:w-24 sm:h-24 h-40 rounded-xl overflow-hidden flex-shrink-0 border border-white/8 order-first sm:order-none">
          <motion.img src={article.cover_url} alt={title} className="w-full h-full object-cover"
            whileHover={{ scale: 1.08 }} transition={{ duration: 0.5 }} />
          {article.audio_url && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
              <Headphones size={9} className="text-black" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1.5">
            <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: starColor, boxShadow: `0 0 5px 1px ${starColor}60` }}
              animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: starColor }}>{cat}</span>
          </div>
          <h3 className="font-serif text-white text-base sm:text-base leading-snug group-hover:text-[#D4AF37] transition-colors line-clamp-2 sm:line-clamp-2 mb-2">{title}</h3>
          <p className="text-white/40 text-xs line-clamp-2 mb-3 block sm:hidden">{summary}</p>
          <p className="text-white/40 text-xs line-clamp-1 mb-2 hidden sm:block">{summary}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white/25 text-[9px]">
            <span className="flex items-center gap-1"><Clock size={8} /> {readTime} min</span>
            {dateStr && <span className="flex items-center gap-1 hidden md:flex"><Calendar size={8} /> {dateStr}</span>}
            {article.location_city && <span className="flex items-center gap-1"><MapPin size={8} /> {article.location_city}</span>}
          </div>
        </div>
        <ChevronRight size={16} className="flex-shrink-0 text-white/20 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all hidden sm:block" />
      </motion.article>
    );
  }

  if (variant === 'cinema') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ delay: index * 0.07, duration: 0.6 }}
        onClick={onClick} className="group relative cursor-pointer"
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/6 hover:border-[#D4AF37]/30 transition-all duration-500 hover:-translate-y-1">
          <motion.img src={article.cover_url} alt={title} className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }} transition={{ duration: 0.7 }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/20 to-transparent" />
          <motion.div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37] bg-[#D4AF37]/20 backdrop-blur-sm flex items-center justify-center"
              style={{ boxShadow: `0 0 30px ${starColor}50` }}>
              <Play size={20} className="text-[#D4AF37] ml-1" />
            </div>
          </motion.div>
          {article.audio_url && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-[#D4AF37]/30 rounded-full">
              <motion.div className="w-1 h-1 bg-[#D4AF37] rounded-full"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <Headphones size={9} className="text-[#D4AF37]" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: starColor }}
                animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: starColor }}>{cat}</span>
              <span className="ml-auto flex items-center gap-1 text-white/30 text-[8px]"><Clock size={8} /> {readTime} min</span>
            </div>
            <h3 className="font-serif text-white text-sm leading-snug group-hover:text-[#D4AF37] transition-colors line-clamp-2">{title}</h3>
          </div>
        </div>
      </motion.article>
    );
  }

  const aspectClass = {
    hero: 'aspect-[16/9] md:aspect-[21/9]',
    featured: 'aspect-[4/3]',
    standard: 'aspect-[3/4]',
  }[variant as 'hero' | 'featured' | 'standard'] ?? 'aspect-[3/4]';

  return (
    <motion.article
      initial={{ opacity: 0, y: 30, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: (index % 6) * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick} className="group relative cursor-pointer"
    >
      <motion.div className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${starColor}30 0%, transparent 70%)` }} />
      <div className={`relative ${aspectClass} rounded-2xl overflow-hidden border border-white/6 bg-white/[0.02] hover:border-[#D4AF37]/30 transition-all duration-500 hover:-translate-y-1`}>
        <motion.img src={article.cover_url} alt={title} className="w-full h-full object-cover"
          whileHover={{ scale: 1.06 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/30 to-transparent" />
        {article.audio_url && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#D4AF37]/30 rounded-full">
            <motion.div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <Headphones size={10} className="text-[#D4AF37]" />
            <span className="text-[8px] font-black text-[#D4AF37] uppercase tracking-wider">Audio</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: starColor, boxShadow: `0 0 5px 1px ${starColor}60` }}
              animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: starColor }}>{cat}</span>
            <span className="flex items-center gap-1 text-white/30 text-[8px] ml-auto"><Clock size={8} /> {readTime} min</span>
          </div>
          <h3 className={`font-serif text-white leading-snug group-hover:text-[#D4AF37] transition-colors duration-300 ${
            variant === 'hero' ? 'text-2xl md:text-4xl' : variant === 'featured' ? 'text-lg md:text-xl' : 'text-sm line-clamp-3'
          }`}>{title}</h3>
          {variant === 'hero' && (
            <>
              <p className="text-white/50 text-sm mt-3 line-clamp-2 max-w-2xl">{summary}</p>
              <motion.div className="flex items-center gap-2 mt-5 text-[#D4AF37] text-sm font-bold" whileHover={{ x: 6 }}>
                <span>{lang === 'fr' ? 'Lire le récit' : 'Read the story'}</span>
                <ChevronRight size={16} />
              </motion.div>
            </>
          )}
          {article.location_city && (
            <div className="flex items-center gap-1 text-white/30 text-[8px] mt-2">
              <MapPin size={8} /> <span>{article.location_city}</span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
};

// ─── News Ticker ──────────────────────────────────────────────────────────────

const NewsTicker = ({ articles, lang, onSelect }: {
  articles: PressArticle[]; lang: 'fr' | 'en'; onSelect: (a: PressArticle) => void;
}) => {
  const items = [...articles.slice(0, 8), ...articles.slice(0, 8)];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-[#D4AF37]/4 backdrop-blur-sm py-3 mb-16">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#020111] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#020111] to-transparent pointer-events-none" />
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-[#020111] pr-4">
        <motion.div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"
          animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
        <Zap size={10} className="text-[#D4AF37]" />
        <span className="text-[#D4AF37] text-[8px] font-black uppercase tracking-widest">
          {lang === 'fr' ? 'Récits' : 'Stories'}
        </span>
      </div>
      <motion.div className="flex items-center gap-10 pl-40"
        animate={{ x: ['0%', '-50%'] }} transition={{ duration: 35, ease: 'linear', repeat: Infinity }}>
        {items.map((article, i) => {
          const title = lang === 'fr' ? article.title_fr : article.title_en;
          const color = article.categories?.color || '#D4AF37';
          return (
            <button key={`${article.id}-${i}`} onClick={() => onSelect(article)}
              className="flex items-center gap-3 shrink-0 group">
              <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 6px 2px ${color}60` }}
                animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <img src={article.cover_url} className="w-7 h-7 rounded-full object-cover border border-white/10" alt="" />
                            <span className="text-white/40 text-[10px] sm:text-xs font-medium group-hover:text-[#D4AF37] transition-colors whitespace-nowrap">
                {title?.slice(0, window.innerWidth < 640 ? 25 : 45)}{(title?.length ?? 0) > (window.innerWidth < 640 ? 25 : 45) ? '…' : ''}
              </span>
              <ChevronRight size={10} className="text-[#D4AF37]/30 flex-shrink-0" />
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

// ─── Article View ─────────────────────────────────────────────────────────────

const ArticleView = ({ article, lang, onClose, mousePos }: {
  article: PressArticle; lang: 'fr' | 'en'; onClose: () => void;
  mousePos: { x: number; y: number };
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const title = lang === 'fr' ? article.title_fr : article.title_en;
  const summary = lang === 'fr' ? article.summary_fr : article.summary_en;
  const content = lang === 'fr' ? article.content_fr : article.content_en;
  const cat = lang === 'fr' ? article.categories?.name_fr : article.categories?.name_en;
  const starColor = article.categories?.color || '#D4AF37';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (!article.audio_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(article.audio_url);
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
          setAudioDuration(audioRef.current.duration || 0);
        }
      });
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(p => !p);
  }, [article.audio_url, isPlaying]);

  const toggleTTS = useCallback(() => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const raw = [title, summary, content].filter(Boolean).join('. ');
    const clean = stripMarkdown(raw);
    if (clean.length < 5) return;
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    const chunks: string[] = [];
    let cur = '';
    for (const s of sentences) {
      if ((cur + s).length > 180) { if (cur) chunks.push(cur.trim()); cur = s; }
      else cur += s;
    }
    if (cur.trim()) chunks.push(cur.trim());
    let i = 0;
    const next = () => {
      if (i >= chunks.length) { setIsSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
      u.rate = 0.9;
      u.onend = () => { i++; next(); };
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    };
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    next();
  }, [isSpeaking, title, summary, content, lang]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: title ?? '', url: window.location.href }); } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [title]);

  const formatTime = (s: number) =>
    !s || isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <ReadingProgressBar />

      {/* Cover */}
      <div className="relative h-[75vh] min-h-[520px] overflow-hidden -mx-4 md:-mx-6">
        <motion.img src={article.cover_url} alt={title} onLoad={() => setImgLoaded(true)}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: imgLoaded ? 1 : 1.1, opacity: imgLoaded ? 1 : 0, x: mousePos.x * 20, y: mousePos.y * 10 }}
          transition={{
            scale: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 1.2 },
            x: { type: 'spring', stiffness: 20, damping: 30 },
            y: { type: 'spring', stiffness: 20, damping: 30 },
          }}
          className="w-full h-full object-cover" style={{ scale: 1.1 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/50 to-[#020111]/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020111]/20 to-transparent" />
        <motion.div className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(ellipse at 50% 100%, ${starColor}40 0%, transparent 60%)` }}
          animate={{ opacity: [0.15, 0.30, 0.15] }} transition={{ duration: 4, repeat: Infinity }} />

        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-10">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <motion.span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] border px-4 py-2 rounded-full backdrop-blur-sm"
              style={{ color: starColor, borderColor: `${starColor}50`, backgroundColor: `${starColor}15` }}
              animate={{ boxShadow: [`0 0 10px ${starColor}20`, `0 0 20px ${starColor}40`, `0 0 10px ${starColor}20`] }}
              transition={{ duration: 3, repeat: Infinity }}>
              <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: starColor }}
                animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              {cat}
            </motion.span>
            <span className="flex items-center gap-1.5 text-white/40 text-[9px]">
              <Clock size={9} /> {estimateReadingTime(content)} min{lang === 'fr' ? ' de lecture' : ' read'}
            </span>
          </div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl md:text-5xl lg:text-6xl font-serif italic text-white leading-tight max-w-3xl mb-5 drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
            {title}
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-4 text-white/40 text-[9px] uppercase font-bold tracking-widest">
            <span className="flex items-center gap-1.5"><User size={9} className="text-[#D4AF37]" /> {article.author_name}</span>
            {article.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar size={9} className="text-[#D4AF37]" />
                {new Date(article.published_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {article.location_city && (
              <span className="flex items-center gap-1.5">
                <MapPin size={9} className="text-[#D4AF37]" />
                {article.location_city}{article.location_country ? `, ${article.location_country}` : ''}
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Corps */}
      <div className="max-w-2xl mx-auto px-4 md:px-0 mt-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center gap-3 mb-10 pb-8 border-b border-white/8">
          {article.audio_url && (
            <div className="flex items-center gap-3 flex-1 min-w-[280px] p-3 bg-[#D4AF37]/8 border border-[#D4AF37]/20 rounded-2xl">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleAudio}
                className="flex-shrink-0 w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center text-black hover:bg-white transition-colors"
                style={{ boxShadow: '0 0 20px rgba(212,175,55,0.4)' }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </motion.button>
              <div className="flex-1 min-w-0">
                <p className="text-[#D4AF37] text-[8px] font-black uppercase tracking-wider mb-1.5">
                  {lang === 'fr' ? 'Version audio' : 'Audio version'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-white/40 font-mono tabular-nums">{formatTime(audioProgress)}</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                    onClick={e => {
                      if (!audioRef.current || !audioDuration) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioDuration;
                    }}>
                    <div className="h-full bg-[#D4AF37] rounded-full transition-all"
                      style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[8px] text-white/40 font-mono tabular-nums">{formatTime(audioDuration)}</span>
                </div>
              </div>
            </div>
          )}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTTS}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
              isSpeaking ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/4 border-white/8 text-white/50 hover:text-[#D4AF37] hover:border-[#D4AF37]/30'
            }`}>
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isSpeaking ? (lang === 'fr' ? 'Arrêter' : 'Stop') : (lang === 'fr' ? 'Lire' : 'Read')}</span>
            {isSpeaking && (
              <span className="flex items-end gap-0.5 h-4">
                {[...Array(3)].map((_, i) => (
                  <motion.span key={i} className="w-0.5 bg-black rounded-full"
                    animate={{ height: ['4px', '14px', '4px'] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                ))}
              </span>
            )}
          </motion.button>
          <FavoriteButton itemType="press" itemId={article.id} size={16} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/4 border border-white/8 rounded-xl text-white/50 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all text-xs font-medium">
            {shareCopied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
            {shareCopied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Partager' : 'Share')}
          </motion.button>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-xl font-serif italic mb-10 leading-relaxed pl-6 border-l-2"
          style={{ color: starColor, borderColor: `${starColor}50` }}>
          {summary}
        </motion.p>

        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-white/8" />
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]/40" />
          </motion.div>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="prose prose-invert max-w-none mb-16"
          dangerouslySetInnerHTML={{ __html: renderContentWithMedia(content || '', article.media_items) }} />

        {article.sources && article.sources.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} className="mb-12 pt-8 border-t border-white/8">
            <h3 className="flex items-center gap-2 text-base font-bold text-white mb-5">
              <BookOpen size={15} className="text-[#D4AF37]" />
              {lang === 'fr' ? 'Sources & Références' : 'Sources & References'}
            </h3>
            <div className="space-y-3">
              {article.sources.map((source, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="p-4 bg-white/[0.02] border border-white/8 rounded-2xl hover:border-[#D4AF37]/30 transition-all group">
                  <a href={source.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#D4AF37] group-hover:opacity-70 font-medium text-sm mb-2">
                    {source.title}<ExternalLink size={11} className="opacity-60" />
                  </a>
                  <div className="flex items-center gap-4 text-[9px] text-white/30">
                    {source.author && <span className="flex items-center gap-1"><User size={8} /> {source.author}</span>}
                    {source.date && <span className="flex items-center gap-1"><Calendar size={8} /> {source.date}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <div className="pt-8 border-t border-white/8 flex items-center justify-between mb-20">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            className="flex items-center gap-2 px-5 py-3 bg-white/4 border border-white/8 rounded-xl text-white/50 hover:text-white hover:border-white/20 transition-all text-sm font-medium group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            {lang === 'fr' ? 'Tous les récits' : 'All stories'}
          </motion.button>
          <FavoriteButton itemType="press" itemId={article.id} size={15} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── ✅ Composant Avatar Profil ───────────────────────────────────────────────

const NavUserAvatar = ({ user, profile, lang }: {
  user: any;
  profile: UserProfile | null;
  lang: 'fr' | 'en';
}) => {
  if (!user) {
    return (
      <Link href="/auth"
        className="bg-[#D4AF37] text-black px-4 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-widest hover:bg-white transition-colors">
        {lang === 'fr' ? 'Rejoindre' : 'Join'}
      </Link>
    );
  }

  return (
    <Link href="/profil">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all shadow-[0_0_12px_rgba(212,175,55,0.2)] cursor-pointer">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name || user.email}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#D4AF37] flex items-center justify-center text-black font-black text-xs">
            {(profile?.full_name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
          </div>
        )}
        {/* Indicateur en ligne */}
        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-[#020111]" />
      </motion.div>
    </Link>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PressePage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<any>(null);
  // ✅ Ajout état profil
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<PressArticle | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('magazine');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ✅ Fetch profil utilisateur
  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', userId)
      .maybeSingle();
    if (data) setUserProfile(data);
  }, []);

  useEffect(() => {
    let raf: number;
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (saved) setLang(saved);

    // ✅ Init session + profil
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await fetchUserProfile(currentUser.id);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, s) => {
      const currentUser = s?.user ?? null;
      setUser(currentUser);
      if (currentUser) await fetchUserProfile(currentUser.id);
      else setUserProfile(null);
    });

    const tick = () => setCurrentTime(
      new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    );
    tick();
    const timer = setInterval(tick, 1000);

    fetchData();

    return () => { subscription.unsubscribe(); clearInterval(timer); };
  }, [fetchUserProfile]);

  useEffect(() => {
    if (searchTerm || isFocused || !smartSuggestions.length) return;
    const id = setInterval(() => setPlaceholderIdx(p => (p + 1) % smartSuggestions.length), 3500);
    return () => clearInterval(id);
  }, [searchTerm, isFocused, smartSuggestions.length]);

  async function fetchData() {
    setIsLoading(true);
    const [artRes, catRes, sugRes] = await Promise.all([
      supabase.from('press_articles').select('*, categories(*)').eq('status', 'published').order('published_at', { ascending: false }),
      supabase.from('categories').select('*').eq('show_presse', true).eq('is_active', true),
      supabase.from('search_suggestions').select('*').eq('is_active', true).or('target_space.eq.all,target_space.eq.presse'),
    ]);
    if (artRes.data) setArticles(artRes.data as any);
    if (catRes.data) setCategories(catRes.data as any);
    if (sugRes.data) setSmartSuggestions(sugRes.data);
    setTimeout(() => setIsLoading(false), 800);
  }

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const title = (lang === 'fr' ? a.title_fr : a.title_en) ?? '';
      const city = a.location_city ?? '';
      const country = a.location_country ?? '';
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || title.toLowerCase().includes(term) || city.toLowerCase().includes(term) || country.toLowerCase().includes(term);
      const matchCat = activeCategory === 'all' || a.category_id === activeCategory;
      return matchSearch && matchCat;
    });
  }, [articles, searchTerm, activeCategory, lang]);

  const [heroArticle, ...gridArticles] = filteredArticles;

  const switchLang = () => {
    const nl: 'fr' | 'en' = lang === 'fr' ? 'en' : 'fr';
    setLang(nl);
    localStorage.setItem('lukeni_lang', nl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#03032B] to-[#000000] text-white selection:bg-[#D4AF37]/30 overflow-x-hidden">

      {/* Splash */}
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center gap-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <CaurisIcon className="w-20 h-20 text-[#D4AF37]" />
            </motion.div>
            <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[#D4AF37] text-[11px] tracking-[0.4em] font-light uppercase">
              {lang === 'fr' ? 'Extraction des mémoires…' : 'Extracting memories…'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {isMounted && !isLoading && (
        <CosmosBackground mousePos={mousePos} intensity={selectedArticle ? 0.3 : 0.7} />
      )}

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-[100] backdrop-blur-2xl border-b border-white/5 px-4 md:px-8 py-3 bg-[#020111]/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Gauche */}
          <div className="flex items-center gap-3">
            <Link href="/explore">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all cursor-pointer">
                <ArrowLeft size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                  {lang === 'fr' ? 'Retour' : 'Back'}
                </span>
              </motion.div>
            </Link>

            <AnimatePresence mode="wait">
              {selectedArticle ? (
                <motion.button key="back-article"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] transition-colors group">
                  <ChevronLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                    {lang === 'fr' ? 'Tous les récits' : 'All stories'}
                  </span>
                </motion.button>
              ) : (
                <motion.div key="logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Link href="/" className="flex items-center gap-2.5 group">
                    <motion.div animate={{ boxShadow: ['0 0 10px rgba(212,175,55,0.2)', '0 0 25px rgba(212,175,55,0.5)', '0 0 10px rgba(212,175,55,0.2)'] }}
                      transition={{ duration: 3, repeat: Infinity }} className="rounded-full">
                      <CaurisIcon className="w-7 h-7 text-[#D4AF37] group-hover:rotate-12 transition-transform duration-500" />
                    </motion.div>
                    <span className="font-serif tracking-[0.4em] text-base text-[#D4AF37] hidden sm:block">LUKENI</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Centre : horloge */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="text-[9px] font-mono text-[#D4AF37] tracking-[0.3em] bg-[#D4AF37]/8 px-3 py-1.5 rounded-full border border-[#D4AF37]/15">
              {currentTime}
            </div>
          </div>

          {/* ✅ Droite : langue + avatar profil */}
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={switchLang}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white hover:bg-[#D4AF37] hover:text-black transition-all font-bold text-[9px] backdrop-blur-sm uppercase">
              <Globe size={11} /> {lang}
            </motion.button>

            {/* ✅ Avatar avec photo de profil */}
            <NavUserAvatar user={user} profile={userProfile} lang={lang} />
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VUE LISTE                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {!selectedArticle ? (
          // ✅ Clé explicite + fragment propre
          <motion.div key="press-list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
          >
            <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 lg:py-20">

              {/* Hero textuel */}
              <header className="text-center mb-16">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                  <p className="text-[#D4AF37] text-[9px] tracking-[0.6em] uppercase font-black mb-6 opacity-60">
                    {lang === 'fr' ? "Chroniques de l'Héritage" : 'Heritage Chronicles'}
                  </p>
                                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[90px] xl:text-[110px] font-serif italic text-white tracking-tighter mb-3 leading-none drop-shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                    {lang === 'fr' ? 'Presse' : 'Press'}
                  </h1>
                  <p className="text-white/20 text-sm tracking-[0.3em] uppercase mb-12">
                    {lang === 'fr' ? 'Mémoire • Récits • Archives' : 'Memory • Stories • Archives'}
                  </p>
                </motion.div>

                {/* Barre de recherche */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.7 }} className="max-w-2xl mx-auto relative">
                  <div className={`relative flex items-center bg-white/[0.03] border border-white/10 rounded-full p-2.5 backdrop-blur-3xl shadow-[0_0_40px_rgba(212,175,55,0.08)] transition-all duration-500 ${
                    isFocused ? 'ring-2 ring-[#D4AF37]/50 scale-[1.02] border-[#D4AF37]/30 shadow-[0_0_80px_rgba(212,175,55,0.25)]' : ''
                  }`}>
                    <Search className={`ml-3 flex-shrink-0 transition-all duration-300 ${isFocused ? 'text-[#D4AF37] scale-110' : 'text-[#D4AF37]/70'}`}
                      size={20} strokeWidth={1.5} />
                    <div className="flex-1 relative h-12 flex items-center px-4">
                      <AnimatePresence mode="wait">
                        {!searchTerm && !isFocused && smartSuggestions.length > 0 && (
                          <motion.span key={`sug-${placeholderIdx}`}
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 0.45, y: 0 }} exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.4 }}
                            className="absolute text-white text-base font-light italic pointer-events-none">
                            {lang === 'fr' ? smartSuggestions[placeholderIdx]?.text_fr : smartSuggestions[placeholderIdx]?.text_en}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                        placeholder={isFocused ? (lang === 'fr' ? 'Titre, ville ou pays…' : 'Title, city or country…') : ''}
                        className="w-full bg-transparent border-none outline-none text-white text-base font-light relative z-10 placeholder:text-white/25" />
                    </div>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')}
                        className="mr-2 p-1.5 rounded-full text-white/30 hover:text-white hover:bg-white/5 transition-all">
                        <span className="text-sm leading-none">×</span>
                      </button>
                    )}
                  </div>
                  {searchTerm && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center text-white/30 text-[9px] mt-3 uppercase tracking-widest">
                      {filteredArticles.length} {lang === 'fr'
                        ? `récit${filteredArticles.length > 1 ? 's' : ''} trouvé${filteredArticles.length > 1 ? 's' : ''}`
                        : `stor${filteredArticles.length > 1 ? 'ies' : 'y'} found`}
                    </motion.p>
                  )}
                  <div className="mt-6 flex justify-center">
                    <SuggestButton space="presse" lang={lang} />
                  </div>
                </motion.div>
              </header>

              {/* Filtres */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="flex flex-col gap-5 mb-12">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
                    {lang === 'fr' ? 'Filtrer par univers' : 'Filter by universe'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <ViewSwitcher current={viewMode} onChange={setViewMode} lang={lang} />
                    <motion.button whileHover={{ scale: 1.05 }} onClick={() => setIsNewsletterOpen(true)}
                      className="flex items-center gap-2 text-[#D4AF37] text-[9px] font-black uppercase tracking-widest hover:opacity-60 transition-opacity">
                      <Bell size={11} />
                      <span className="hidden sm:block">{lang === 'fr' ? 'Rappel' : 'Reminder'}</span>
                    </motion.button>
                  </div>
                </div>

                              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory('all')}
                    className={`flex-shrink-0 px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                      activeCategory === 'all' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
                    }`}>
                    {lang === 'fr' ? 'Tout' : 'All'}
                  </motion.button>
                  {categories.map(cat => (
                    <div key={cat.id} className="flex-shrink-0 flex items-center bg-white/5 border border-white/8 rounded-full overflow-hidden hover:border-[#D4AF37]/20 transition-colors">
                      <div className="w-2 h-2 rounded-full mx-2.5 md:mx-3 flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#D4AF37', boxShadow: `0 0 6px 2px ${cat.color || '#D4AF37'}50` }} />
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveCategory(cat.id)}
                        className={`pr-2 md:pr-3 py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                          activeCategory === cat.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                        }`}>
                        {lang === 'fr' ? cat.name_fr : cat.name_en}
                      </motion.button>
                      <SubscribeButton categoryId={cat.id} label={lang === 'fr' ? 'Suivre' : 'Follow'} />
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Contenu */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <CaurisIcon className="w-12 h-12 text-[#D4AF37]" />
                  </motion.div>
                </div>
              ) : filteredArticles.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32">
                  <MapPin size={32} className="text-white/10 mx-auto mb-4" />
                  <p className="text-white/20 text-base mb-2">{lang === 'fr' ? 'Aucun récit trouvé' : 'No stories found'}</p>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')}
                      className="text-[#D4AF37] text-xs underline underline-offset-4 hover:opacity-70 transition-opacity mt-2">
                      {lang === 'fr' ? 'Effacer le filtre' : 'Clear filter'}
                    </button>
                  )}
                </motion.div>
              ) : (
                <>
                  {articles.length > 3 && <NewsTicker articles={articles} lang={lang} onSelect={setSelectedArticle} />}

                  {viewMode === 'magazine' && (
                    <>
                      {heroArticle && (
                        <div className="mb-8">
                          <ArticleCard article={heroArticle} lang={lang} index={0}
                            onClick={() => setSelectedArticle(heroArticle)} variant="hero" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        {gridArticles.map((article, i) => (
                          <ArticleCard key={article.id} article={article} lang={lang} index={i}
                            onClick={() => setSelectedArticle(article)}
                            variant={i === 1 || i === 6 ? 'featured' : 'standard'} />
                        ))}
                      </div>
                    </>
                  )}

                  {viewMode === 'list' && (
                    <div className="flex flex-col gap-3">
                      {filteredArticles.map((article, i) => (
                        <ArticleCard key={article.id} article={article} lang={lang} index={i}
                          onClick={() => setSelectedArticle(article)} variant="list" />
                      ))}
                    </div>
                  )}

                  {viewMode === 'cinema' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                      {filteredArticles.map((article, i) => (
                        <ArticleCard key={article.id} article={article} lang={lang} index={i}
                          onClick={() => setSelectedArticle(article)} variant="cinema" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>

            <footer className="py-20 border-t border-white/5 text-center relative z-10">
              <p className="text-[#D4AF37] text-[9px] font-black uppercase tracking-[0.5em] opacity-25 mb-6">
                {lang === 'fr' ? 'Lukeni Presse • Archives du Monde' : 'Lukeni Press • World Archives'}
              </p>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-10 h-10 rounded-full border border-white/8 flex items-center justify-center mx-auto hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all duration-300 group">
                <ArrowRight size={16} className="-rotate-90 group-hover:-translate-y-0.5 transition-transform" />
              </motion.button>
            </footer>
          </motion.div>
        ) : (
          // ✅ VUE ARTICLE — clé explicite, structure propre
          <motion.div key={`article-${selectedArticle.id}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
          >
            <NotesplitContainer
              itemId={selectedArticle.id}
              itemType="press"
              userId={user?.id}
              catColor="#D4AF37"
              lang={lang}
            >
              <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
                <ArticleView
                  article={selectedArticle}
                  lang={lang}
                  onClose={() => setSelectedArticle(null)}
                  mousePos={mousePos}
                />
              </div>
            </NotesplitContainer>
          </motion.div>
        )}
      </AnimatePresence>

      <SubscribeModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
        isOrganic={false}
      />
    </div>
  );
}