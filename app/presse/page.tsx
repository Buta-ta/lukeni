"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  Search, MapPin, Loader2, ArrowRight, ArrowLeft, Bell,
  Share2, Calendar, User, Headphones, BookOpen, ExternalLink,
  Check, Volume2, VolumeX, Play, Pause, Globe, Clock,
  ChevronRight, Zap, LayoutGrid, List, Film, Newspaper,
  Music, ScrollText, BookMarked, Home, ChevronLeft,
  MessageCircle, Filter, Radio, FileAudio, Mic,
  Video, TrendingUp, ImageIcon, X, Upload, PlusCircle,
  Send, ThumbsUp
} from 'lucide-react';
import Link from 'next/link';
import SuggestButton from '@/components/SuggestButton';
import FavoriteButton from '@/components/FavoriteButton';
import SubscribeButton from '@/components/SubscribeButton';
import SubscribeModal from '@/components/SubscribeModal';
import { NotesplitContainer } from '@/components/NotesplitContainer';

// --- CUSTOM ICONS ---
const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

const FacebookIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);

interface Category {
  id: string; name_fr: string; name_en: string; color: string;
}

interface MediaItem {
  type: 'image' | 'video' | 'link'; url: string; caption?: string; alt?: string;
}

interface Source {
  title: string; url: string; author?: string; date?: string;
}

type UnifiedItem = {
  itemType: 'article' | 'archive';
  id: string;
  article_type?: 'written' | 'audio';
  title_fr: string;
  title_en: string;
  summary_fr: string;
  summary_en: string;
  content_fr: string;
  content_en: string;
  cover_url: string;
  audio_url?: string;
  reading_audio_url?: string;
  audio_content_url?: string;
  audio_duration?: string;
  audio_host?: string;
  author_or_source: string;
  date: string;
  published_at?: string;
  scheduled_publish_at?: string;
  category_id: string;
  category_color: string;
  category_name_fr: string;
  category_name_en: string;
  location_city?: string;
  location_country?: string;
  format?: 'image' | 'video' | 'audio';
  source_url?: string;
  media_items?: MediaItem[];
  sources?: Source[];
  reading_time_minutes?: number;
  related_articles_ids?: string[];
  status?: string;
};

interface UserProfile {
  avatar_url: string | null;
  full_name: string | null;
}

interface SocialSettings {
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
  facebook_url: string;
  wa_active: boolean;
  ig_active: boolean;
  fb_active: boolean;
}

interface PressComment {
  id: string;
  article_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  content: string;
  parent_comment_id?: string;
  is_blocked: boolean;
  created_at: string;
}


interface PressAnnouncement {
  id: string;
  title_fr: string;
  title_en?: string;
  description_fr?: string;
  description_en?: string;
  image_url: string;
  legend_fr?: string;
  legend_en?: string;
  link_url?: string;
  status: 'active' | 'draft';
  created_at?: string;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getThumbnailUrl = (url: string, format?: string) => {
  if (format === 'video' && url && url.includes('cloudinary.com')) {
    return url.replace(/\.[^/.]+$/, ".jpg");
  }
  return url;
};

/**
 * Vérifie si un article programmé doit être visible côté utilisateur
 * en comparant avec l'heure locale du navigateur (pas celle de Supabase).
 */
const isArticleVisible = (item: UnifiedItem): boolean => {
  if (item.status === 'published') return true;
  if (item.status === 'scheduled' && item.scheduled_publish_at) {
    const scheduledLocal = new Date(item.scheduled_publish_at);
    const nowLocal = new Date();
    return nowLocal >= scheduledLocal;
  }
  return false;
};

const formatPublishedDate = (dateStr: string | undefined, lang: 'fr' | 'en', withTime = false): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', opts);
};

const renderContentWithMedia = (raw: string, mediaItems?: MediaItem[]): string => {
  if (!raw) return '';
  let html = raw;

  html = html.replace(/^## (.+)$/gm,
    '<h2 class="text-3xl font-serif text-white mt-10 mb-4 pb-2 border-b border-[#0466c8]/20">$1</h2>');
  html = html.replace(/^### (.+)$/gm,
    '<h3 class="text-xl font-bold text-[#90e0ef] mt-6 mb-3">$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-[#90e0ef]">$1</em>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#48cae4] hover:text-[#90e0ef] underline underline-offset-4 transition-colors">$1</a>');
  html = html.replace(/^> (.+)$/gm,
    '<blockquote class="border-l-4 border-[#0466c8] pl-6 py-2 italic text-[#90e0ef]/70 my-6 bg-[#001233]/40 rounded-r-xl">$1</blockquote>');
  html = html.replace(/^- (.+)$/gm,
    '<li class="ml-6 mb-2 list-disc text-[#90e0ef]/70 marker:text-[#0466c8]">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm,
    '<li class="ml-6 mb-2 list-decimal text-[#90e0ef]/70 marker:text-[#0466c8]">$1</li>');

  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    if (trimmed.match(/^\[MEDIA:\d+\]/)) return trimmed;
    return `<p class="mb-4 leading-[1.9] text-lg text-white/75">${trimmed}</p>`;
  }).join('\n\n');

  if (mediaItems && mediaItems.length > 0) {
    mediaItems.forEach((media, idx) => {
      const marker = `[MEDIA:${idx}]`;
      let block = '';
      if (media.type === 'image') {
        block = `<figure class="my-8 rounded-2xl overflow-hidden border border-[#0466c8]/20">
          <img src="${media.url}" alt="${media.alt || media.caption || ''}" class="w-full object-cover" loading="lazy" />
          ${media.caption ? `<figcaption class="px-4 py-3 text-center text-xs text-[#90e0ef]/50 italic bg-[#001233]/40">${media.caption}</figcaption>` : ''}
        </figure>`;
      } else if (media.type === 'video') {
        block = `<figure class="my-8">
          <video controls class="w-full rounded-2xl border border-[#0466c8]/20" preload="metadata">
            <source src="${media.url}" />
          </video>
          ${media.caption ? `<figcaption class="text-center text-xs text-[#90e0ef]/50 mt-3 italic">${media.caption}</figcaption>` : ''}
        </figure>`;
      } else if (media.type === 'link') {
        block = `<a href="${media.url}" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 my-6 p-4 bg-[#001233]/60 border border-[#0466c8]/30 rounded-2xl hover:border-[#0466c8]/60 transition-all group">
          <span>🔗</span>
          <span class="text-[#48cae4] font-medium text-sm group-hover:underline">${media.caption || media.url}</span>
        </a>`;
      }
      html = html.replace(marker, block);
    });
  }
  return html;
};

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

// ─── Reading Progress Bar ─────────────────────────────────────────────────────

const ReadingProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#0466c8] origin-left z-[200]"
      style={{ scaleX, boxShadow: '0 0 10px #0466c8, 0 0 20px #0466c880' }}
    />
  );
};

// ─── View Switcher ────────────────────────────────────────────────────────────

const ViewSwitcher = ({ current, onChange, lang }: {
  current: 'magazine' | 'list' | 'cinema'; onChange: (v: 'magazine' | 'list' | 'cinema') => void; lang: 'fr' | 'en';
}) => {
  const views = [
    { key: 'list' as const, Icon: List, label_fr: 'Liste', label_en: 'List' },
    { key: 'magazine' as const, Icon: LayoutGrid, label_fr: 'Magazine', label_en: 'Magazine' },
    { key: 'cinema' as const, Icon: Film, label_fr: 'Cinéma', label_en: 'Cinema' },
  ];
  return (
    <div className="flex items-center gap-1 bg-[#000d1a] border border-[#0466c8]/20 rounded-full p-1 backdrop-blur-sm">
      {views.map(({ key, Icon, label_fr, label_en }) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${current === key
              ? 'bg-[#0466c8] text-white shadow-[0_0_20px_rgba(4,102,200,0.4)]'
              : 'text-[#90e0ef]/50 hover:text-[#90e0ef]'
            }`}
        >
          <Icon size={11} />
          <span className="hidden sm:block">{lang === 'fr' ? label_fr : label_en}</span>
        </motion.button>
      ))}
    </div>
  );
};

// ─── Article Card ─────────────────────────────────────────────────────────────

const ArticleCard = ({ article, lang, index, onClick, variant = 'standard' }: {
  article: UnifiedItem; lang: 'fr' | 'en'; index: number;
  onClick: () => void; variant?: 'hero' | 'featured' | 'standard' | 'list' | 'cinema';
}) => {
  const title = lang === 'fr' ? article.title_fr : article.title_en;
  const summary = lang === 'fr' ? article.summary_fr : article.summary_en;
  const cat = lang === 'fr' ? article.category_name_fr : article.category_name_en;
  const starColor = article.category_color || '#0466c8';
  const readTime = article.reading_time_minutes || estimateReadingTime(lang === 'fr' ? article.content_fr : article.content_en);
  const dateStr = formatPublishedDate(article.published_at || article.date, lang);
  const isArchive = article.itemType === 'archive';
  const isAudio = article.article_type === 'audio' || (isArchive && article.format === 'audio');
  const displayCover = getThumbnailUrl(article.cover_url, article.format);

  if (variant === 'list') {
    return (
      <motion.article
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ delay: index * 0.04, duration: 0.45 }}
        onClick={onClick}
        className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-[#0466c8]/10 bg-gradient-to-r from-[#001233]/40 to-transparent cursor-pointer hover:border-[#0466c8]/30 hover:bg-[#001233]/60 transition-all"
      >
        <div className="relative w-full sm:w-24 sm:h-24 h-40 rounded-xl overflow-hidden flex-shrink-0 border border-[#0466c8]/20 order-first sm:order-none">
          {displayCover ? (
            <motion.img src={displayCover} alt={title} className="w-full h-full object-cover"
              whileHover={{ scale: 1.08 }} transition={{ duration: 0.5 }} />
          ) : (
            <div className="w-full h-full bg-[#001233] flex items-center justify-center">
              <Newspaper size={20} className="text-[#0466c8]" />
            </div>
          )}
          {isAudio && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#0466c8] rounded-full flex items-center justify-center">
              <Mic size={10} className="text-white" />
            </div>
          )}
          {article.reading_audio_url && !isAudio && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#0353a4] rounded-full flex items-center justify-center">
              <Headphones size={10} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: starColor, boxShadow: `0 0 8px ${starColor}` }}
              animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[8px] font-black uppercase tracking-[0.1em]" style={{ color: starColor }}>{cat}</span>
            {isArchive && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] uppercase tracking-wider rounded-full border border-orange-500/30">
                {isAudio ? 'Audio externe' : 'Média externe'}
              </span>
            )}
            {isAudio && !isArchive && (
              <span className="px-2 py-0.5 bg-[#001233] text-[#90e0ef] text-[8px] uppercase tracking-wider rounded-full border border-[#0466c8]/30 flex items-center gap-1">
                <Radio size={8} /> Podcast
              </span>
            )}
          </div>
          <h3 className="font-serif text-white text-base leading-snug group-hover:text-[#90e0ef] transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-[#90e0ef]/30 text-xs line-clamp-2 mb-3 sm:hidden">{summary}</p>
          <p className="text-[#90e0ef]/30 text-xs line-clamp-1 mb-2 hidden sm:block">{summary}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[#90e0ef]/25 text-[9px]">
            {!isArchive && (
              <span className="flex items-center gap-1">
                <Clock size={8} /> {readTime} min
              </span>
            )}
            {dateStr && (
              <span className="flex items-center gap-1">
                <Calendar size={8} /> {dateStr}
              </span>
            )}
            {article.location_city && (
              <span className="flex items-center gap-1">
                <MapPin size={8} /> {article.location_city}
              </span>
            )}
            {!isArchive && (
              <span className="flex items-center gap-1">
                <User size={8} /> {article.author_or_source}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="flex-shrink-0 text-[#0466c8]/20 group-hover:text-[#0466c8] group-hover:translate-x-1 transition-all hidden sm:block" />
      </motion.article>
    );
  }

  if (variant === 'cinema') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.07, duration: 0.6 }}
        onClick={onClick}
        className="group relative cursor-pointer"
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#0466c8]/20 hover:border-[#0466c8]/50 transition-all duration-500 hover:-translate-y-1">
          {displayCover ? (
            <motion.img src={displayCover} alt={title} className="w-full h-full object-cover"
              whileHover={{ scale: 1.05 }} transition={{ duration: 0.7 }} />
          ) : (
            <div className="w-full h-full bg-[#000d1a] flex items-center justify-center">
              <Newspaper size={48} className="text-[#0466c8]/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000814] via-transparent to-transparent" />
          <motion.div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full border-2 border-[#90e0ef] bg-[#0466c8]/20 backdrop-blur-sm flex items-center justify-center"
              style={{ boxShadow: `0 0 30px ${starColor}50` }}>
              <Play size={20} className="text-[#90e0ef] ml-1" />
            </div>
          </motion.div>
          {isAudio && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-[#0466c8]/30 rounded-full">
              <motion.div className="w-1 h-1 bg-[#0466c8] rounded-full"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <Mic size={9} className="text-[#90e0ef]" />
            </div>
          )}
          {isArchive && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-orange-500/80 backdrop-blur-md text-white font-bold text-[8px] uppercase tracking-wider rounded border border-orange-400/30">
              {article.author_or_source}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: starColor }}
                animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: starColor }}>{cat}</span>
              {!isArchive && (
                <span className="ml-auto flex items-center gap-1 text-[#90e0ef]/30 text-[8px]">
                  <Clock size={8} /> {readTime} min
                </span>
              )}
            </div>
            <h3 className="font-serif text-white text-sm leading-snug group-hover:text-[#90e0ef] transition-colors line-clamp-2">
              {title}
            </h3>
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
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: (index % 6) * 0.08, duration: 0.7 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <motion.div
        className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${starColor}20 0%, transparent 70%)` }}
      />
      <div className={`relative ${aspectClass} rounded-2xl overflow-hidden border border-[#0466c8]/10 bg-[#000d1a] hover:border-[#0466c8]/40 transition-all duration-500 hover:-translate-y-1`}>
        {displayCover ? (
          <motion.img src={displayCover} alt={title} className="w-full h-full object-cover"
            whileHover={{ scale: 1.06 }} transition={{ duration: 0.8 }} />
        ) : (
          <div className="w-full h-full bg-[#001233] flex items-center justify-center">
            <Newspaper size={56} className="text-[#0466c8]/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000814] via-[#000814]/30 to-transparent" />

        {isAudio && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#0466c8]/30 rounded-full">
            <motion.div className="w-1.5 h-1.5 bg-[#0466c8] rounded-full"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <Mic size={10} className="text-[#90e0ef]" />
            <span className="text-[8px] font-black text-[#90e0ef] uppercase tracking-wider">Audio</span>
          </div>
        )}
        {article.reading_audio_url && !isAudio && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#0353a4]/30 rounded-full">
            <Headphones size={10} className="text-[#90e0ef] animate-pulse" />
            <span className="text-[8px] font-black text-[#90e0ef] uppercase tracking-wider">Lecture</span>
          </div>
        )}
        {isArchive && article.format === 'video' && !isAudio && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#0466c8]/30 rounded-full">
            <Video size={10} className="text-[#90e0ef]" />
            <span className="text-[8px] font-black text-[#90e0ef] uppercase tracking-wider">Vidéo</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: starColor, boxShadow: `0 0 8px ${starColor}` }}
              animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: starColor }}>{cat}</span>
            {isArchive && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] uppercase tracking-wider rounded-full border border-orange-500/30 ml-auto">
                {article.author_or_source}
              </span>
            )}
            {!isArchive && (
              <span className="flex items-center gap-1 text-[#90e0ef]/30 text-[8px] ml-auto">
                <Clock size={8} /> {readTime} min
              </span>
            )}
          </div>
          <h3 className={`font-serif text-white leading-snug group-hover:text-[#90e0ef] transition-colors duration-300 ${variant === 'hero' ? 'text-2xl md:text-4xl' : variant === 'featured' ? 'text-lg md:text-xl' : 'text-sm line-clamp-3'
            }`}>{title}</h3>
          {variant === 'hero' && (
            <>
              <p className="text-[#90e0ef]/40 text-sm mt-3 line-clamp-2 max-w-2xl">{summary}</p>
              <motion.div className="flex items-center gap-2 mt-5 text-[#90e0ef] text-sm font-bold" whileHover={{ x: 6 }}>
                <span>{lang === 'fr' ? 'Lire le récit' : 'Read the story'}</span>
                <ChevronRight size={16} />
              </motion.div>
            </>
          )}
          {article.location_city && !isArchive && (
            <div className="flex items-center gap-1 text-[#90e0ef]/30 text-[8px] mt-2">
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
  articles: UnifiedItem[]; lang: 'fr' | 'en'; onSelect: (a: UnifiedItem) => void;
}) => {
  const items = [...articles.slice(0, 8), ...articles.slice(0, 8)];
  return (
    <div className="relative overflow-hidden border-y border-[#0466c8]/20 bg-gradient-to-r from-[#000814] via-[#001233]/50 to-[#000814] backdrop-blur-sm py-3 mb-16">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#000814] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#000814] to-transparent pointer-events-none" />
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-[#000814] pr-4">
        <motion.div className="w-1.5 h-1.5 bg-[#0466c8] rounded-full"
          animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
        <Zap size={10} className="text-[#0466c8]" />
        <span className="text-[#90e0ef] text-[8px] font-black uppercase tracking-widest">
          {lang === 'fr' ? 'Récits & Archives' : 'Stories & Archives'}
        </span>
      </div>
      <motion.div className="flex items-center gap-10 pl-40"
        animate={{ x: ['0%', '-50%'] }} transition={{ duration: 35, ease: 'linear', repeat: Infinity }}>
        {items.map((article, i) => {
          const title = lang === 'fr' ? article.title_fr : article.title_en;
          const color = article.category_color || '#0466c8';
          const displayThumb = getThumbnailUrl(article.cover_url, article.format);
          const maxLen = 45;
          return (
            <button key={`${article.id}-${i}`} onClick={() => onSelect(article)} className="flex items-center gap-3 shrink-0 group/ticker">
              <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              {displayThumb && (
                <img src={displayThumb} className="w-7 h-7 rounded-full object-cover border border-[#0466c8]/30" alt="" />
              )}
              <span className="text-[#90e0ef]/40 text-xs font-medium group-hover/ticker:text-[#90e0ef] transition-colors whitespace-nowrap">
                {(title?.length ?? 0) > maxLen ? `${title?.slice(0, maxLen)}…` : title}
              </span>
              <ChevronRight size={10} className="text-[#0466c8]/30 flex-shrink-0" />
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

// ─── Comments Section ─────────────────────────────────────────────────────────

const CommentsSection = ({ articleId, lang, user, userProfile }: {
  articleId: string;
  lang: 'fr' | 'en';
  user: any;
  userProfile: UserProfile | null;
}) => {
  const [comments, setComments] = useState<PressComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const t = {
    title: lang === 'fr' ? 'Commentaires' : 'Comments',
    placeholder: lang === 'fr' ? 'Partagez votre avis...' : 'Share your thoughts...',
    submit: lang === 'fr' ? 'Publier' : 'Post',
    login: lang === 'fr' ? '🔒 Connectez-vous pour commenter' : '🔒 Log in to comment',
    blocked: lang === 'fr' ? '⛔ Vous êtes bloqué et ne pouvez pas commenter' : '⛔ You are blocked from commenting',
    empty: lang === 'fr' ? '💬 Soyez le premier à commenter cet article.' : '💬 Be the first to comment on this article.',
    ago: lang === 'fr' ? 'il y a' : '',
    justNow: lang === 'fr' ? "À l'instant" : 'Just now',
    writing: lang === 'fr' ? 'Vous commentez en tant que' : 'Commenting as',
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return t.justNow;
    if (lang === 'fr') {
      if (mins < 60) return `il y a ${mins} min`;
      if (hrs < 24) return `il y a ${hrs}h`;
      return `il y a ${days}j`;
    } else {
      if (mins < 60) return `${mins}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      return `${days}d ago`;
    }
  };

  useEffect(() => {
    fetchComments();
    if (user) checkIfBlocked();
  }, [articleId, user]);

  const fetchComments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('press_comments')
      .select('*')
      .eq('article_id', articleId)
      .eq('is_blocked', false)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
    setIsLoading(false);
  };

  const checkIfBlocked = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    setIsBlocked(!!data);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user || isBlocked) return;
    setIsSubmitting(true);
    const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'Utilisateur';
    const { data, error } = await supabase.from('press_comments').insert({
      article_id: articleId,
      user_id: user.id,
      user_email: user.email,
      user_name: displayName,
      content: newComment.trim(),
      is_blocked: false,
    }).select().single();

    if (!error && data) {
      setComments(prev => [data, ...prev]);
      setNewComment('');
    }
    setIsSubmitting(false);
  };

  const avatarLetter = (userProfile?.full_name?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="pt-8 border-t border-[#0466c8]/20"
    >
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle size={18} className="text-[#0466c8]" />
        <h3 className="text-base font-bold text-white">
          {t.title} ({comments.length})
        </h3>
      </div>

      {/* Zone de saisie */}
      {!user ? (
        <div className="p-4 bg-[#001233]/60 border border-[#0466c8]/20 rounded-2xl text-[#90e0ef]/60 text-sm mb-6">
          {t.login}
        </div>
      ) : isBlocked ? (
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-300 text-sm mb-6">
          {t.blocked}
        </div>
      ) : (
        <div className="mb-8">
          {/* Info utilisateur connecté */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#0466c8]/40 flex-shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#0466c8] flex items-center justify-center text-white text-[9px] font-black">
                  {avatarLetter}
                </div>
              )}
            </div>
            <span className="text-[#90e0ef]/40 text-[10px]">
              {t.writing} <strong className="text-[#90e0ef]/70">{userProfile?.full_name || user.email}</strong>
            </span>
          </div>

          <div className="relative">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={t.placeholder}
              rows={3}
              className="w-full bg-[#000d1a] border border-[#0466c8]/20 rounded-2xl px-5 py-4 text-white text-sm placeholder:text-[#90e0ef]/20 focus:outline-none focus:border-[#0466c8]/50 resize-none transition-all"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting || !newComment.trim()}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-[#0466c8] hover:bg-[#0353a4] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all"
              style={{ boxShadow: newComment.trim() ? '0 0 15px rgba(4,102,200,0.3)' : 'none' }}
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {t.submit}
            </motion.button>
          </div>
          <p className="text-[#90e0ef]/20 text-[9px] mt-2 ml-1">Ctrl+Enter {lang === 'fr' ? 'pour publier' : 'to post'}</p>
        </div>
      )}

      {/* Liste des commentaires */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <CaurisIcon className="w-8 h-8 text-[#0466c8]/40" />
          </motion.div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-[#90e0ef]/30 text-sm">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment, i) => {
            const isOwn = user && comment.user_id === user.id;
            const initials = (comment.user_name?.charAt(0) || '?').toUpperCase();
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex gap-3 p-4 rounded-2xl border transition-all ${isOwn
                    ? 'bg-[#001233]/80 border-[#0466c8]/30'
                    : 'bg-[#000d1a]/60 border-[#0466c8]/10'
                  }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#0466c8]/30 flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-[#0466c8] to-[#023e8a] flex items-center justify-center text-white text-xs font-black">
                    {initials}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-white text-xs font-bold">{comment.user_name}</span>
                    {isOwn && (
                      <span className="px-2 py-0.5 bg-[#0466c8]/20 text-[#90e0ef] text-[8px] font-bold rounded-full border border-[#0466c8]/30">
                        {lang === 'fr' ? 'Vous' : 'You'}
                      </span>
                    )}
                    <span className="text-[#90e0ef]/25 text-[9px] ml-auto">{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-[#90e0ef]/60 text-sm leading-relaxed">{comment.content}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
};




// ─── Announcements Carousel ───────────────────────────────────────────

// ─── Announcements Carousel ───────────────────────────────────────────

const AnnouncementsCarousel = ({ announcements, lang }: {
  announcements: PressAnnouncement[];
  lang: 'fr' | 'en';
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const current = announcements[currentIndex];
  const title = lang === 'fr' ? current.title_fr : (current.title_en || current.title_fr);
  const description = lang === 'fr' ? current.description_fr : (current.description_en || current.description_fr);
  const legend = lang === 'fr' ? current.legend_fr : (current.legend_en || current.legend_fr);

  // Auto-play toutes les 30 secondes
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 30000); // 30 secondes

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [announcements.length]);

  const goToPrevious = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setCurrentIndex(prev => (prev - 1 + announcements.length) % announcements.length);
    // Redémarrer l'autoplay
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 30000);
  };

  const goToNext = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setCurrentIndex(prev => (prev + 1) % announcements.length);
    // Redémarrer l'autoplay
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 30000);
  };

  if (!announcements || announcements.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="my-12 mx-auto max-w-2xl"
    >
      {/* Légende */}
      {legend && (
        <p className="text-center text-[#0466c8] text-xs font-black uppercase tracking-[0.3em] mb-4">
          {legend}
        </p>
      )}

      {/* Carousel Container — VERSION COMPACTE */}
      <div className="relative group">
        {/* Image petite + Content */}
        <div className="relative rounded-2xl overflow-hidden border border-[#0466c8]/20 bg-[#000d1a]"
          style={{ boxShadow: '0 0 30px rgba(4,102,200,0.08)' }}>
          
          <div className="flex flex-col md:flex-row gap-4 p-4 md:p-5">
            
            {/* Image — RÉDUITE */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-full md:w-40 h-32 md:h-40 flex-shrink-0 rounded-lg overflow-hidden"
            >
              <img
                src={current.image_url}
                alt={title}
                className="w-full h-full object-cover"
              />
              {/* Overlay subtil */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#000814]/40 to-transparent" />
            </motion.div>

            {/* Contenu texte — À CÔTÉ DE L'IMAGE */}
            <motion.div
              key={`text-${currentIndex}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-1 flex flex-col justify-between py-1"
            >
              <div>
                <h3 className="text-white text-base md:text-lg font-serif font-bold mb-2 leading-snug line-clamp-2">
                  {title}
                </h3>
                {description && (
                  <p className="text-[#90e0ef]/60 text-xs md:text-sm leading-relaxed mb-3 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>

              {/* Bouton CTA */}
              {current.link_url && (
                <motion.a
                  href={current.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-fit inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0466c8] hover:bg-[#0353a4] text-white rounded-lg font-bold text-xs transition-all"
                  style={{ boxShadow: '0 0 12px rgba(4,102,200,0.35)' }}
                >
                  {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
                  <ChevronRight size={12} />
                </motion.a>
              )}
            </motion.div>

            {/* Flèches — Alignées à droite */}
            <div className="flex md:flex-col gap-2 items-center justify-end">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPrevious}
                className="w-8 h-8 rounded-full bg-[#0466c8] hover:bg-[#0353a4] text-white flex items-center justify-center shadow-lg transition-all opacity-70 hover:opacity-100"
                style={{ boxShadow: '0 0 15px rgba(4,102,200,0.4)' }}
              >
                <ChevronLeft size={16} />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNext}
                className="w-8 h-8 rounded-full bg-[#0466c8] hover:bg-[#0353a4] text-white flex items-center justify-center shadow-lg transition-all opacity-70 hover:opacity-100"
                style={{ boxShadow: '0 0 15px rgba(4,102,200,0.4)' }}
              >
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </div>

          {/* Indicateurs (points) — EN BAS */}
          <div className="flex items-center justify-center gap-1.5 pb-3 px-4">
            {announcements.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  if (autoPlayRef.current) clearInterval(autoPlayRef.current);
                  setCurrentIndex(index);
                  autoPlayRef.current = setInterval(() => {
                    setCurrentIndex(prev => (prev + 1) % announcements.length);
                  }, 30000);
                }}
                className={`rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-6 h-1.5 bg-[#0466c8]'
                    : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                }`}
                whileHover={{ scale: 1.15 }}
              />
            ))}
          </div>

          {/* Badge "En rotation" */}
          <div className="absolute top-3 right-4 z-10 flex items-center gap-1 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full border border-[#0466c8]/30">
            <motion.div
              className="w-1 h-1 bg-[#0466c8] rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[#90e0ef] text-[9px] font-bold uppercase tracking-wider">
              30s
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Article View ─────────────────────────────────────────────────────────────

const ArticleView = ({ article, lang, onClose, mousePos, feedItems, user, userProfile, announcements }: {
  article: UnifiedItem; lang: 'fr' | 'en'; onClose: () => void;
  mousePos: { x: number; y: number }; feedItems: UnifiedItem[];
  user: any; userProfile: UserProfile | null; announcements: PressAnnouncement[];
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
  const cat = lang === 'fr' ? article.category_name_fr : article.category_name_en;
  const starColor = article.category_color || '#0466c8';
  const isArchive = article.itemType === 'archive';
  const isAudio = article.article_type === 'audio' || (isArchive && article.format === 'audio');
  const readTime = article.reading_time_minutes || estimateReadingTime(content);
  const publishedDate = formatPublishedDate(article.published_at || article.date, lang, true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, [article.id]);

  const toggleAudio = useCallback(() => {
    const audioUrl = isAudio ? article.audio_content_url : article.reading_audio_url;
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
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
  }, [isAudio, article.audio_content_url, article.reading_audio_url, isPlaying]);

  const toggleTTS = useCallback(() => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const raw = [title, summary, content].filter(Boolean).join('. ');
    const clean = stripMarkdown(raw);
    if (clean.length < 5) return;
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    const chunks: string[] = [];
    let cur = '';
    for (const s of sentences) {
      if ((cur + s).length > 180) { if (cur) chunks.push(cur.trim()); cur = s; } else cur += s;
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
      try { await navigator.share({ title: title ?? '', url: window.location.href }); } catch (e) { }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [title]);

  const formatTime = (s: number) => !s || isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <ReadingProgressBar />

      {/* COVER */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden -mx-4 md:-mx-6 bg-[#000814]">
        {article.cover_url ? (
          <motion.img
            src={getThumbnailUrl(article.cover_url, article.format)}
            alt={title}
            onLoad={() => setImgLoaded(true)}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: imgLoaded ? 1 : 1.1, opacity: imgLoaded ? 1 : 0, x: mousePos.x * 20, y: mousePos.y * 10 }}
            transition={{ scale: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 1.2 }, x: { type: 'spring', stiffness: 20, damping: 30 }, y: { type: 'spring', stiffness: 20, damping: 30 } }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#001233] to-[#000814] flex items-center justify-center">
            {isAudio ? <Radio size={80} className="text-[#0466c8]/20" /> : <Newspaper size={80} className="text-[#0466c8]/20" />}
          </div>
        )}
        {/* Overlay profond bleu nuit */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000814] via-[#000814]/60 to-[#000814]/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#000814]/20 to-transparent" />

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-10 pointer-events-none">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <motion.span
              className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] border px-4 py-2 rounded-full backdrop-blur-sm"
              style={{ color: starColor, borderColor: `${starColor}50`, backgroundColor: `${starColor}15` }}
              animate={{ boxShadow: [`0 0 10px ${starColor}20`, `0 0 20px ${starColor}40`, `0 0 10px ${starColor}20`] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: starColor }}
                animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              {cat}
            </motion.span>
            {isAudio && (
              <span className="px-3 py-1.5 bg-[#001233]/80 text-[#90e0ef] text-[8px] font-bold uppercase rounded-full border border-[#0466c8]/30 flex items-center gap-1">
                <Radio size={8} /> {lang === 'fr' ? 'Podcast' : 'Podcast'}
              </span>
            )}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl md:text-5xl lg:text-6xl font-serif italic text-white leading-tight max-w-3xl mb-5 drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)] pointer-events-auto"
            style={{ textShadow: '0 0 60px #0466c820' }}
          >
            {title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-4 text-[#90e0ef]/40 text-[9px] uppercase font-bold tracking-widest pointer-events-auto"
          >
            {article.author_or_source && (
              <span className="flex items-center gap-1.5"><User size={9} className="text-[#0466c8]" /> {article.author_or_source}</span>
            )}
            {article.location_city && (
              <span className="flex items-center gap-1.5"><MapPin size={9} className="text-[#0466c8]" /> {article.location_city}{article.location_country ? `, ${article.location_country}` : ''}</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-2xl mx-auto px-4 md:px-0 mt-10 mb-20">

        {/* META : temps de lecture + date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-4 mb-8 py-4 border-b border-[#0466c8]/10 text-[#90e0ef]/40 text-xs"
        >
          {!isArchive && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-[#0466c8]" />
              {readTime} {lang === 'fr' ? 'min de lecture' : 'min read'}
            </span>
          )}
          {publishedDate && (
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="text-[#0466c8]" />
              {publishedDate}
            </span>
          )}
        </motion.div>

        {/* ACTION BUTTONS — sans bouton retour */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center gap-3 mb-10 pb-8 border-b border-[#0466c8]/20"
        >
          {(article.reading_audio_url || isAudio) && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleAudio}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${isPlaying
                  ? 'bg-[#0466c8] text-white border-[#0466c8]'
                  : 'bg-[#001233] text-[#90e0ef] border-[#0466c8]/30 hover:bg-[#0466c8] hover:text-white'
                }`}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isAudio
                ? (lang === 'fr' ? 'Écouter' : 'Listen')
                : (lang === 'fr' ? 'Lecture vocale' : 'Voice reading')}
            </motion.button>
          )}

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTTS}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${isSpeaking
                ? 'bg-[#023e8a] text-[#90e0ef] border-[#0466c8]'
                : 'bg-[#000d1a] border-[#0466c8]/20 text-[#90e0ef]/40 hover:text-[#90e0ef] hover:border-[#0466c8]/40'
              }`}>
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {lang === 'fr' ? 'Lire' : 'Read'}
            {isSpeaking && (
              <span className="flex items-end gap-0.5 h-4">
                <span className="w-0.5 h-1 bg-[#90e0ef] rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-[#90e0ef] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-0.5 h-2 bg-[#90e0ef] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </span>
            )}
          </motion.button>

          <FavoriteButton itemType="press" itemId={article.id} size={14} />

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleShare}
            className="flex items-center gap-1.5 px-5 py-3 bg-[#000d1a] border border-[#0466c8]/20 rounded-xl text-[#90e0ef]/40 hover:text-[#90e0ef] hover:border-[#0466c8]/40 transition-all text-xs font-bold uppercase tracking-wider">
            {shareCopied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
            {shareCopied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Partager' : 'Share')}
          </motion.button>
        </motion.div>

        {/* AUDIO PLAYER (Article audio principal) */}
        {isAudio && article.audio_content_url && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="mb-8 p-5 bg-gradient-to-r from-[#001233] to-[#000d1a] border border-[#0466c8]/30 rounded-2xl"
            style={{ boxShadow: '0 0 30px rgba(4,102,200,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#0466c8]/20 rounded-lg"><Radio size={20} className="text-[#90e0ef]" /></div>
              <div>
                <p className="text-[#90e0ef] font-bold text-sm">{lang === 'fr' ? 'Article Audio (Podcast)' : 'Audio Article (Podcast)'}</p>
                <p className="text-xs text-[#90e0ef]/40">{article.audio_duration || (lang === 'fr' ? 'Durée non disponible' : 'Duration unavailable')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#000814] rounded-xl border border-[#0466c8]/20">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleAudio}
                className="flex-shrink-0 w-12 h-12 bg-[#0466c8] rounded-full flex items-center justify-center text-white hover:bg-[#0353a4] transition-all"
                style={{ boxShadow: '0 0 20px rgba(4,102,200,0.4)' }}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </motion.button>
              <div className="flex-1">
                <p className="text-[#90e0ef]/40 text-[10px] font-black uppercase tracking-wider mb-1.5">
                  {lang === 'fr' ? 'Podcast Audio' : 'Audio Podcast'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#90e0ef]/30 font-mono">{formatTime(audioProgress)}</span>
                  <div className="flex-1 h-1.5 bg-[#0466c8]/10 rounded-full overflow-hidden cursor-pointer"
                    onClick={e => {
                      if (!audioRef.current || !audioDuration) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioDuration;
                    }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%`, background: 'linear-gradient(90deg, #0466c8, #90e0ef)' }} />
                  </div>
                  <span className="text-[10px] text-[#90e0ef]/30 font-mono">{formatTime(audioDuration)}</span>
                </div>
              </div>
            </div>
            {article.audio_host && (
              <div className="flex items-center gap-2 text-sm text-[#90e0ef]/50 mt-3">
                <Mic size={14} className="text-[#0466c8]" />
                <span>{lang === 'fr' ? 'Présenté par' : 'Hosted by'} <strong className="text-[#90e0ef]/80">{article.audio_host}</strong></span>
              </div>
            )}
          </motion.div>
        )}

        {/* RÉSUMÉ */}
        {summary && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-2xl font-serif italic mb-10 leading-relaxed pl-6 border-l-2 border-[#0466c8]"
            style={{ color: `${starColor}90` }}
          >
            {summary}
          </motion.p>
        )}


         

        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-[#0466c8]/15" />
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
            <CaurisIcon className="w-5 h-5 text-[#0466c8]/30" />
          </motion.div>
          <div className="flex-1 h-px bg-[#0466c8]/15" />
        </div>

                {/* MAIN CONTENT — PREMIÈRE MOITIÉ */}
                {/* MAIN CONTENT — AVEC ANNONCE AU MILIEU D'UN PARAGRAPHE */}
        {content && announcements.length > 0 ? (
          <>
            {/* Découper le contenu par paragraphes */}
            {(() => {
              // Diviser le contenu par "\n\n" (paragraphes)
              const paragraphs = (content || '').split('\n\n').filter(p => p.trim());
              const midPoint = Math.ceil(paragraphs.length / 2);
              const firstHalf = paragraphs.slice(0, midPoint).join('\n\n');
              const secondHalf = paragraphs.slice(midPoint).join('\n\n');

              return (
                <>
                  {/* Première moitié (paragraphes complets) */}
                  {firstHalf && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      transition={{ delay: 0.6 }} 
                      className="prose prose-invert max-w-none mb-12"
                      dangerouslySetInnerHTML={{ 
                        __html: renderContentWithMedia(firstHalf, article.media_items) 
                      }} 
                    />
                  )}

                  {/* CAROUSEL D'ANNONCES — AU MILIEU */}
                  <AnnouncementsCarousel announcements={announcements} lang={lang} />

                  {/* Deuxième moitié (paragraphes complets) */}
                  {secondHalf && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      transition={{ delay: 0.8 }} 
                      className="prose prose-invert max-w-none mb-16"
                      dangerouslySetInnerHTML={{ 
                        __html: renderContentWithMedia(secondHalf, article.media_items) 
                      }} 
                    />
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.6 }} 
            className="prose prose-invert max-w-none mb-16"
            dangerouslySetInnerHTML={{ __html: renderContentWithMedia(content || '', article.media_items) }} 
          />
        )}

        {/* SOURCES */}
        {article.sources && article.sources.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-12 pt-8 border-t border-[#0466c8]/20"
          >
            <h3 className="flex items-center gap-2 text-base font-bold text-white mb-5">
              <BookOpen size={15} className="text-[#0466c8]" />
              {lang === 'fr' ? 'Sources & Références' : 'Sources & References'}
            </h3>
            <div className="space-y-3">
              {article.sources.map((source, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="p-4 bg-[#000d1a] border border-[#0466c8]/15 rounded-2xl hover:border-[#0466c8]/35 transition-all group"
                >
                  <a href={source.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#48cae4] group-hover:text-[#90e0ef] font-medium text-sm mb-2 transition-colors">
                    {source.title} <ExternalLink size={11} className="opacity-60" />
                  </a>
                  <div className="flex items-center gap-4 text-[9px] text-[#90e0ef]/25">
                    {source.author && <span className="flex items-center gap-1"><User size={8} /> {source.author}</span>}
                    {source.date && <span className="flex items-center gap-1"><Calendar size={8} /> {source.date}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ARTICLES CONNEXES */}
        {article.related_articles_ids && article.related_articles_ids.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-12 pt-8 border-t border-[#0466c8]/20"
          >
            <h3 className="flex items-center gap-2 text-base font-bold text-white mb-6">
              <TrendingUp size={16} className="text-[#0466c8]" />
              {lang === 'fr' ? 'Articles Connexes' : 'Related Articles'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedItems
                .filter(a => article.related_articles_ids?.includes(a.id))
                .slice(0, 2)
                .map((a, i) => {
                  const relTitle = lang === 'fr' ? a.title_fr : a.title_en;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="p-4 bg-[#000d1a] border border-[#0466c8]/15 rounded-xl hover:border-[#0466c8]/35 transition-all group cursor-pointer"
                    >
                      <p className="text-[#48cae4] font-medium text-sm group-hover:text-[#90e0ef] line-clamp-2 transition-colors">{relTitle}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-[#90e0ef]/25">
                        <Calendar size={10} /> {formatPublishedDate(a.published_at || a.date, lang)}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </motion.section>
        )}

        {/* COMMENTAIRES */}
        <CommentsSection
          articleId={article.id}
          lang={lang}
          user={user}
          userProfile={userProfile}
        />
      </div>
    </motion.div>
  );
};

// ─── Avatar Profil Nav ────────────────────────────────────────────────────────

const NavUserAvatar = ({ user, profile, lang }: {
  user: any; profile: UserProfile | null; lang: 'fr' | 'en';
}) => {
  if (!user) {
    return (
      <Link href="/auth" className="bg-[#0466c8] text-white px-4 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-widest hover:bg-[#0353a4] transition-colors">
        {lang === 'fr' ? 'Rejoindre' : 'Join'}
      </Link>
    );
  }
  return (
    <Link href="/profil">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#0466c8]/40 hover:border-[#0466c8] transition-all shadow-[0_0_12px_rgba(4,102,200,0.3)] cursor-pointer">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name || user.email} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#0466c8] flex items-center justify-center text-white font-black text-xs">
            {(profile?.full_name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-[#000814]" />
      </motion.div>
    </Link>
  );
};

// ─── Floating Socials ─────────────────────────────────────────────────────────

const FloatingSocials = ({ settings }: { settings: SocialSettings | null }) => {
  if (!settings) return null;
  const showWA = settings.wa_active && settings.whatsapp_number;
  const showIG = settings.ig_active && settings.instagram_url;
  const showFB = settings.fb_active && settings.facebook_url;
  if (!showWA && !showIG && !showFB) return null;

  return (
    <div className="fixed bottom-28 right-6 z-[300] flex flex-col gap-3">
      {showWA && (
        <a href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(settings.whatsapp_message || '')}`}
          target="_blank" rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#001233] border border-green-500/40 backdrop-blur-md flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white transition-all shadow-lg hover:scale-110"
          style={{ boxShadow: '0 0 15px rgba(4,102,200,0.15)' }}>
          <MessageCircle size={22} />
        </a>
      )}
      {showIG && (
        <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#001233] border border-pink-500/40 backdrop-blur-md flex items-center justify-center text-pink-400 hover:bg-pink-500 hover:text-white transition-all shadow-lg hover:scale-110">
          <InstagramIcon size={22} />
        </a>
      )}
      {showFB && (
        <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#001233] border border-[#0466c8]/40 backdrop-blur-md flex items-center justify-center text-[#90e0ef] hover:bg-[#0466c8] hover:text-white transition-all shadow-lg hover:scale-110">
          <FacebookIcon size={22} />
        </a>
      )}
    </div>
  );
};

// ─── Page Principale ──────────────────────────────────────────────────────────

export default function PressePage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [feedItems, setFeedItems] = useState<UnifiedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [announcements, setAnnouncements] = useState<PressAnnouncement[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<UnifiedItem | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'magazine' | 'list' | 'cinema'>('list');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', userId).maybeSingle();
    if (data) setUserProfile(data);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedMode = localStorage.getItem('lukeni_press_view') as 'magazine' | 'list' | 'cinema' | null;
    if (savedMode && ['magazine', 'list', 'cinema'].includes(savedMode)) setViewMode(savedMode);
    else { setViewMode('list'); localStorage.setItem('lukeni_press_view', 'list'); }
  }, []);

  useEffect(() => {
    let raf: number;
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 }));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (saved) setLang(saved);

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

    const tick = () => setCurrentTime(new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
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
  const [artRes, arcRes, catRes, sugRes, socRes, annRes] = await Promise.all([
    supabase.from('press_articles').select('*, categories(*)').in('status', ['published', 'scheduled']),
    supabase.from('press_archives').select('*').eq('status', 'published'),
    supabase.from('categories').select('*').eq('show_presse', true).eq('is_active', true),
    supabase.from('search_suggestions').select('*').eq('is_active', true).or('target_space.eq.all,target_space.eq.presse'),
    supabase.from('social_settings').select('*').eq('id', 1).single(),
    supabase.from('press_announcements').select('*').eq('status', 'active').order('created_at', { ascending: false })
  ]);

    const items: UnifiedItem[] = [];

    if (artRes.data) {
      artRes.data.forEach((a: any) => {
        const item: UnifiedItem = {
          itemType: 'article',
          id: a.id,
          article_type: a.article_type || 'written',
          title_fr: a.title_fr,
          title_en: a.title_en || '',
          summary_fr: a.summary_fr || '',
          summary_en: a.summary_en || '',
          content_fr: a.content_fr || '',
          content_en: a.content_en || '',
          cover_url: a.cover_url || '',
          audio_url: a.audio_url,
          reading_audio_url: a.reading_audio_url,
          audio_content_url: a.audio_content_url,
          audio_duration: a.audio_duration,
          audio_host: a.audio_host,
          author_or_source: a.author_name || 'Rédaction',
          date: a.published_at || a.created_at,
          published_at: a.published_at,
          scheduled_publish_at: a.scheduled_publish_at,
          category_id: a.category_id || '',
          category_color: a.categories?.color || '#0466c8',
          category_name_fr: a.categories?.name_fr || 'Presse',
          category_name_en: a.categories?.name_en || 'Press',
          location_city: a.location_city,
          location_country: a.location_country,
          media_items: a.media_items,
          sources: a.sources,
          reading_time_minutes: a.reading_time_minutes,
          related_articles_ids: a.related_articles_ids,
          status: a.status,
        };
        // Filtrer selon l'heure locale du navigateur
        if (isArticleVisible(item)) items.push(item);
      });
    }

    if (arcRes.data) {
      arcRes.data.forEach((a: any) => items.push({
        itemType: 'archive',
        id: a.id,
        article_type: a.format === 'audio' ? 'audio' : undefined,
        title_fr: a.title_fr,
        title_en: a.title_en || '',
        summary_fr: a.content_fr ? a.content_fr.substring(0, 150) + '...' : '',
        summary_en: a.content_en ? a.content_en.substring(0, 150) + '...' : '',
        content_fr: a.content_fr || '',
        content_en: a.content_en || '',
        cover_url: a.media_url || '',
        audio_url: a.format === 'audio' ? a.media_url : undefined,
        audio_content_url: a.format === 'audio' ? a.media_url : undefined,
        author_or_source: a.source_name,
        date: a.original_date || a.created_at,
        published_at: a.original_date || a.created_at,
        category_id: 'archive',
        category_color: '#F97316',
        category_name_fr: 'Revue de presse',
        category_name_en: 'Press Review',
        format: a.format,
        source_url: a.source_url,
        status: 'published',
      }));
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFeedItems(items);
    if (catRes.data) setCategories(catRes.data as any);
    if (sugRes.data) setSmartSuggestions(sugRes.data);
        if (socRes.data) setSocialSettings(socRes.data);
        if (annRes.data) {
      const activeAnnouncements = annRes.data.filter((a: any) => a.status === 'active');
      setAnnouncements(activeAnnouncements as PressAnnouncement[]);
    }

    setTimeout(() => setIsLoading(false), 800);
  }

  const filteredArticles = useMemo(() => {
    return feedItems.filter(a => {
      const title = (lang === 'fr' ? a.title_fr : a.title_en) ?? '';
      const city = a.location_city ?? '';
      const country = a.location_country ?? '';
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || title.toLowerCase().includes(term) || city.toLowerCase().includes(term) || country.toLowerCase().includes(term);
      const matchCat = activeCategory === 'all' || (activeCategory === 'archive' ? a.itemType === 'archive' : a.category_id === activeCategory);
      return matchSearch && matchCat;
    });
  }, [feedItems, searchTerm, activeCategory, lang]);

  const [heroArticle, ...gridArticles] = filteredArticles;

  const switchLang = () => {
    const nl: 'fr' | 'en' = lang === 'fr' ? 'en' : 'fr';
    setLang(nl);
    localStorage.setItem('lukeni_lang', nl);
  };

  const handleViewChange = (v: 'magazine' | 'list' | 'cinema') => {
    setViewMode(v);
    localStorage.setItem('lukeni_press_view', v);
  };

  return (
    <div className="min-h-screen text-white selection:bg-[#0466c8]/30 overflow-x-hidden relative"
      style={{ background: '#000000' }}>

      {/* Fond noir avec accents bleu minimal aux coins */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"
          style={{ background: 'radial-gradient(circle, #0466c808 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[160px] translate-y-1/3 -translate-x-1/4"
          style={{ background: 'radial-gradient(circle, #0353a408 0%, transparent 70%)' }} />
      </div>


      <FloatingSocials settings={socialSettings} />

      {/* Loading screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8"
            style={{ background: '#000000' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <CaurisIcon className="w-20 h-20 text-[#0466c8]" />
            </motion.div>
            <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[#90e0ef] text-[11px] tracking-[0.4em] font-light uppercase">
              {lang === 'fr' ? 'Chaque génération doit...' : 'Each generation must…'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAV */}
      <nav className="sticky top-0 z-[100] backdrop-blur-2xl border-b border-[#0466c8]/15 px-4 md:px-8 py-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/explore">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 border border-[#0466c8]/20 rounded-xl text-[#90e0ef]/50 hover:text-[#90e0ef] hover:border-[#0466c8]/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(13,13,13,0.8)' }}>
                <ArrowLeft size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{lang === 'fr' ? 'Retour' : 'Back'}</span>
              </motion.div>
            </Link>

            <AnimatePresence mode="wait">
              {selectedArticle ? (
                <motion.button key="back-article"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-2 text-[#90e0ef]/50 hover:text-[#90e0ef] transition-colors group">
                  <ChevronLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                    {lang === 'fr' ? 'Tous nos articles' : 'All articles'}
                  </span>
                </motion.button>
              ) : (
                <motion.div key="logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Link href="/" className="flex items-center gap-2.5 group">
                    <motion.div
                      animate={{ boxShadow: ['0 0 10px rgba(4,102,200,0.2)', '0 0 25px rgba(4,102,200,0.4)', '0 0 10px rgba(4,102,200,0.2)'] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="rounded-full">
                      <CaurisIcon className="w-7 h-7 text-[#0466c8] group-hover:rotate-12 transition-transform duration-500" />
                    </motion.div>
                    <span className="font-serif tracking-[0.4em] text-base text-[#90e0ef] hidden sm:block">LUKENI</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="text-[9px] font-mono text-[#90e0ef] tracking-[0.3em] px-3 py-1.5 rounded-full border border-[#0466c8]/15"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
              {currentTime}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={switchLang}
              className="flex items-center gap-1.5 border border-[#0466c8]/20 px-3 py-1.5 rounded-full text-[#90e0ef] hover:bg-[#0466c8] hover:text-white transition-all font-bold text-[9px] backdrop-blur-sm uppercase"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <Globe size={11} /> {lang}
            </motion.button>
            <NavUserAvatar user={user} profile={userProfile} lang={lang} />
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {!selectedArticle ? (
          <motion.div key="press-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 lg:py-20">

              {/* HEADER */}
              <header className="text-center mb-16">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                  <p className="text-[#0466c8] text-[9px] tracking-[0.6em] uppercase font-black mb-6 opacity-60">
                    {lang === 'fr' ? "Chroniques de l'Héritage" : 'Heritage Chronicles'}
                  </p>
                  <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[90px] xl:text-[110px] font-serif italic text-white tracking-tighter mb-3 leading-none"
                    style={{ textShadow: '0 0 60px #0466c820' }}>
                    {lang === 'fr' ? 'Presse' : 'Press'}
                  </h1>
                  {/* Ligne lumineuse sous le titre */}
                  <div className="mx-auto w-24 h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, #0466c8, transparent)', boxShadow: '0 0 8px #0466c8' }} />
                  <p className="text-[#90e0ef]/20 text-sm tracking-[0.3em] uppercase mb-12">
                    {lang === 'fr' ? 'Mémoire • Récits • Archives' : 'Memory • Stories • Archives'}
                  </p>
                </motion.div>

                {/* SEARCH */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="max-w-2xl mx-auto relative">
                  <div className={`relative flex items-center border rounded-full p-2.5 backdrop-blur-3xl transition-all duration-500 ${isFocused
                      ? 'ring-2 ring-[#0466c8]/50 scale-[1.02] border-[#0466c8]/40 shadow-[0_0_80px_rgba(4,102,200,0.2)]'
                      : 'border-[#0466c8]/15 shadow-[0_0_30px_rgba(4,102,200,0.03)]'
                    }`} style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>


                    <Search className={`ml-3 flex-shrink-0 transition-all duration-300 ${isFocused ? 'text-[#0466c8] scale-110' : 'text-[#0466c8]/60'}`} size={20} strokeWidth={1.5} />
                    <div className="flex-1 relative h-12 flex items-center px-4">
                      <AnimatePresence mode="wait">
                        {!searchTerm && !isFocused && smartSuggestions.length > 0 && (
                          <motion.span key={`sug-${placeholderIdx}`}
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 0.35, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }}
                            className="absolute text-white text-base font-light italic pointer-events-none">
                            {lang === 'fr' ? smartSuggestions[placeholderIdx]?.text_fr : smartSuggestions[placeholderIdx]?.text_en}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                        placeholder={isFocused ? (lang === 'fr' ? 'Titre, source ou ville…' : 'Title, source or city…') : ''}
                        className="w-full bg-transparent border-none outline-none text-white text-base font-light relative z-10 placeholder:text-[#90e0ef]/20" />
                    </div>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="mr-2 p-1.5 rounded-full text-[#90e0ef]/30 hover:text-white hover:bg-white/5 transition-all">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {searchTerm && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center text-[#90e0ef]/25 text-[9px] mt-3 uppercase tracking-widest">
                      {filteredArticles.length} {lang === 'fr' ? `récit${filteredArticles.length > 1 ? 's' : ''} trouvé${filteredArticles.length > 1 ? 's' : ''}` : `stor${filteredArticles.length > 1 ? 'ies' : 'y'} found`}
                    </motion.p>
                  )}
                  <div className="mt-6 flex justify-center">
                    <SuggestButton space="presse" lang={lang} />
                  </div>
                </motion.div>

                <div className="mt-8 flex justify-center">
                  <ViewSwitcher current={viewMode} onChange={handleViewChange} lang={lang} />
                </div>
              </header>

              {/* FILTRES */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col gap-5 mb-12">
                <div className="flex items-center justify-between border-b border-[#0466c8]/15 pb-4">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#90e0ef]/25">
                    {lang === 'fr' ? 'Filtrer par univers' : 'Filter by universe'}
                  </h3>
                  <motion.button whileHover={{ scale: 1.05 }} onClick={() => setIsNewsletterOpen(true)}
                    className="flex items-center gap-2 text-[#0466c8] text-[9px] font-black uppercase tracking-widest hover:opacity-60 transition-opacity">
                    <Bell size={11} /><span className="hidden sm:block">{lang === 'fr' ? 'Rappel' : 'Reminder'}</span>
                  </motion.button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory('all')}
                    className={`flex-shrink-0 px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeCategory === 'all'
                        ? 'bg-[#0466c8] text-white shadow-[0_0_20px_rgba(4,102,200,0.3)]'
                        : 'border border-[#0466c8]/15 text-[#90e0ef]/40 hover:text-[#90e0ef]'
                      }`} style={{ backgroundColor: activeCategory === 'all' ? undefined : 'rgba(0,0,0,0.5)' }}>
                    {lang === 'fr' ? 'Tout' : 'All'}
                  </motion.button>

                  {categories.map(cat => (
                    <div key={cat.id} className="flex-shrink-0 flex items-center border border-[#0466c8]/10 rounded-full overflow-hidden hover:border-[#0466c8]/30 transition-colors"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <div className="w-2 h-2 rounded-full mx-2.5 md:mx-3 flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#0466c8', boxShadow: `0 0 6px 2px ${cat.color || '#0466c8'}50` }} />
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveCategory(cat.id)}
                        className={`pr-2 md:pr-3 py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat.id ? 'text-white' : 'text-[#90e0ef]/40 hover:text-[#90e0ef]'
                          }`}>
                        {lang === 'fr' ? cat.name_fr : cat.name_en}
                      </motion.button>
                      <SubscribeButton categoryId={cat.id} label={lang === 'fr' ? 'Suivre' : 'Follow'} />
                    </div>
                  ))}

                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory('archive')}
                    className={`flex-shrink-0 px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap border border-orange-500/30 ${activeCategory === 'archive' ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-orange-500/10 text-orange-400 hover:text-white'
                      }`}>
                    {lang === 'fr' ? 'Revue de presse' : 'Press Review'}
                  </motion.button>
                </div>
              </motion.div>

              {/* CONTENU */}
              {filteredArticles.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32">
                  <MapPin size={32} className="text-[#0466c8]/10 mx-auto mb-4" />
                  <p className="text-[#90e0ef]/20 text-base mb-2">{lang === 'fr' ? 'Aucun récit trouvé' : 'No stories found'}</p>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-[#0466c8] text-xs underline underline-offset-4 hover:opacity-70 transition-opacity mt-2">
                      {lang === 'fr' ? 'Effacer le filtre' : 'Clear filter'}
                    </button>
                  )}
                </motion.div>
              ) : (
                <>
                  {feedItems.length > 3 && <NewsTicker articles={feedItems} lang={lang} onSelect={setSelectedArticle} />}

                  {viewMode === 'list' && (
                    <div className="flex flex-col gap-3">
                      {filteredArticles.map((article, i) => (
                        <ArticleCard key={article.id} article={article} lang={lang} index={i} onClick={() => setSelectedArticle(article)} variant="list" />
                      ))}
                    </div>
                  )}

                  {viewMode === 'magazine' && (
                    <>
                      {heroArticle && (
                        <div className="mb-8">
                          <ArticleCard article={heroArticle} lang={lang} index={0} onClick={() => setSelectedArticle(heroArticle)} variant="hero" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        {gridArticles.map((article, i) => (
                          <ArticleCard key={article.id} article={article} lang={lang} index={i} onClick={() => setSelectedArticle(article)} variant={i === 1 || i === 6 ? 'featured' : 'standard'} />
                        ))}
                      </div>
                    </>
                  )}

                  {viewMode === 'cinema' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                      {filteredArticles.map((article, i) => (
                        <ArticleCard key={article.id} article={article} lang={lang} index={i} onClick={() => setSelectedArticle(article)} variant="cinema" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>

            <footer className="py-20 border-t border-[#0466c8]/10 text-center relative z-10">
              <p className="text-[#0466c8] text-[9px] font-black uppercase tracking-[0.5em] opacity-20 mb-6">
                {lang === 'fr' ? 'Lukeni Presse • Archives du Monde' : 'Lukeni Press • World Archives'}
              </p>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-10 h-10 rounded-full border border-[#0466c8]/15 flex items-center justify-center mx-auto hover:bg-[#0466c8] hover:text-white hover:border-[#0466c8] transition-all duration-300 group"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <ArrowRight size={16} className="-rotate-90 group-hover:-translate-y-0.5 transition-transform text-[#90e0ef]" />
              </motion.button>
            </footer>
          </motion.div>
        ) : (
          <motion.div key={`article-${selectedArticle.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <NotesplitContainer itemId={selectedArticle.id} itemType="press" userId={user?.id} catColor={selectedArticle.category_color} lang={lang}>
              <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
                                <ArticleView
                  article={selectedArticle}
                  lang={lang}
                  onClose={() => setSelectedArticle(null)}
                  mousePos={mousePos}
                  feedItems={feedItems}
                  user={user}
                  userProfile={userProfile}
                  announcements={announcements}
                />
              </div>
            </NotesplitContainer>
          </motion.div>
        )}
      </AnimatePresence>

      <SubscribeModal isOpen={isNewsletterOpen} onClose={() => setIsNewsletterOpen(false)} isOrganic={false} />
    </div>
  );
}