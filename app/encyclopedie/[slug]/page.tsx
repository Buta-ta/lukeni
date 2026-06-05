'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Loader2, Calendar, Tag, Clock,
  Eye, BookOpen, Globe, ExternalLink,
  Flag, Star, ArrowRight, Share2,
  ChevronUp, Hash, Sparkles, Link2
} from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import { useWordDefinition } from '@/lib/hooks/useWordDefinition';
import { WordDefinitionPopover } from '@/components/WordDefinitionPopover';
import { NotesplitContainer } from '@/components/NotesplitContainer';

// ============================================================================
// TYPES
// ============================================================================

interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  color: string;
}

interface LinkedEvent {
  id: string;
  title_fr: string;
  title_en: string;
  year: number;
  country: string;
  importance: number;
  event_month?: number;
  event_day?: number;
  desc_fr?: string;
  desc_en?: string;
}

interface RelatedArticle {
  id: string;
  title_fr: string;
  title_en: string;
  image_url: string;
  summary_fr: string;
  summary_en: string;
  slug: string;
  categories: Category;
}

interface Article {
  id: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  summary_fr: string;
  summary_en: string;
  image_url: string;
  category_id: string;
  created_at: string;
  slug: string;
  view_count?: number;
  reading_time?: number;
  wikipedia_url?: string;
  categories: Category;
  linked_events?: LinkedEvent[];
  sources?: string[];
  timeline?: Array<{  // ✅ AJOUT
    year: string;
    title_fr: string;
    title_en: string;
    description_fr?: string;
    description_en?: string;
  }>;
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
  const stars = useMemo(() =>
    Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.4 + 0.4,
      depth: Math.random() * 10 + 3,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3,
    })), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(ellipse, #D4AF37 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #9370DB 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            x: mousePos.x * star.depth,
            y: mousePos.y * star.depth,
            opacity: [0.15, 0.6, 0.15],
          }}
          transition={{
            opacity: { duration: star.duration, repeat: Infinity, delay: star.delay, ease: 'easeInOut' },
            x: { type: 'spring', stiffness: 25, damping: 20 },
            y: { type: 'spring', stiffness: 25, damping: 20 },
          }}
        />
      ))}
    </div>
  );
});
StarField.displayName = 'StarField';

// ============================================================================
// LOADING SCREEN
// ============================================================================

const LoadingScreen = memo(({ lang }: { lang: 'fr' | 'en' }) => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
    className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center gap-8"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    >
      <CaurisIcon className="w-20 h-20 text-[#D4AF37]" />
    </motion.div>
    <motion.p
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="text-[#D4AF37] text-xs tracking-[0.4em] font-light uppercase"
    >
      {lang === 'fr' ? 'Ouverture du codex...' : 'Opening the codex...'}
    </motion.p>
  </motion.div>
));
LoadingScreen.displayName = 'LoadingScreen';

// ============================================================================
// READING PROGRESS BAR
// ============================================================================

const ReadingProgress = memo(({ color }: { color: string }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-white/5">
      <motion.div
        className="h-full rounded-full"
        style={{
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${color}, #ffffff)`,
          boxShadow: `0 0 8px ${color}`,
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
});
ReadingProgress.displayName = 'ReadingProgress';

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

interface TocItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

const TableOfContents = memo(({ items, lang, catColor }: {
  items: TocItem[];
  lang: 'fr' | 'en';
  catColor: string;
}) => {
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-20% 0% -70% 0%' }
    );

    items.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl mb-4 text-gray-400 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Hash size={14} style={{ color: catColor }} />
          {lang === 'fr' ? 'Sommaire' : 'Contents'}
        </div>
        <ChevronUp
          size={16}
          className={`transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
        />
      </button>

      <AnimatePresence>
        {(isOpen || true) && (
          <motion.div
            initial={false}
            className="hidden lg:block sticky top-24"
          >
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={13} style={{ color: catColor }} />
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500">
                  {lang === 'fr' ? 'Sommaire' : 'Contents'}
                </span>
              </div>
              <nav className="space-y-1">
                {items.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={e => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`block text-xs py-1.5 transition-all duration-200 ${item.level === 'h3' ? 'pl-3 border-l border-white/10' : ''
                      } ${activeId === item.id
                        ? 'font-bold'
                        : 'text-gray-600 hover:text-gray-300'
                      }`}
                    style={activeId === item.id ? { color: catColor } : {}}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden mb-6"
          >
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-1">
              {items.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={e => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    setIsOpen(false);
                  }}
                  className={`block text-xs py-1.5 transition-colors ${item.level === 'h3' ? 'pl-3 border-l border-white/10' : ''
                    } ${activeId === item.id ? 'font-bold' : 'text-gray-600'}`}
                  style={activeId === item.id ? { color: catColor } : {}}
                >
                  {item.text}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
TableOfContents.displayName = 'TableOfContents';

// ============================================================================
// STRIP FORMATTING — pour les IDs et le sommaire
// ============================================================================

function stripFormatting(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([\s\S]+?)\*/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/==([\s\S]+?)==/g, '$1')
    .replace(/\{#[^}]+\}([\s\S]+?)\{\/\}/g, '$1')
    .replace(/\{\+[^}]+\}([\s\S]+?)\{\/\+\}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// ============================================================================
// INLINE PARSER
// ============================================================================

function parseInline(text: string, catColor: string): React.ReactNode[] {
  if (!text) return [];

  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/);
    const italicMatch = remaining.match(/^([\s\S]*?)\*(?!\*)([\s\S]+?)\*(?!\*)/);
    const strikeMatch = remaining.match(/^([\s\S]*?)~~([\s\S]+?)~~/);
    const highlightMatch = remaining.match(/^([\s\S]*?)==([\s\S]+?)==/);
    const colorMatch = remaining.match(/^([\s\S]*?)\{#([^}]+)\}([\s\S]+?)\{\/\}/);
    const sizeMatch = remaining.match(/^([\s\S]*?)\{\+([^}]+)\}([\s\S]+?)\{\/\+\}/);
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)/);
    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`/);

    const candidates = [
      { type: 'bold', match: boldMatch, before: boldMatch?.[1] },
      { type: 'italic', match: italicMatch, before: italicMatch?.[1] },
      { type: 'strike', match: strikeMatch, before: strikeMatch?.[1] },
      { type: 'highlight', match: highlightMatch, before: highlightMatch?.[1] },
      { type: 'color', match: colorMatch, before: colorMatch?.[1] },
      { type: 'size', match: sizeMatch, before: sizeMatch?.[1] },
      { type: 'link', match: linkMatch, before: linkMatch?.[1] },
      { type: 'code', match: codeMatch, before: codeMatch?.[1] },
    ].filter(c => c.match !== null && c.before !== undefined) as {
      type: string;
      match: RegExpMatchArray;
      before: string;
    }[];

    if (candidates.length === 0) {
      result.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const best = candidates.reduce((a, b) =>
      a.before.length <= b.before.length ? a : b
    );

    if (best.before.length > 0) {
      result.push(<span key={key++}>{best.before}</span>);
    }

    const m = best.match;

    switch (best.type) {
      case 'bold':
        result.push(<strong key={key++} className="text-white font-bold">{parseInline(m[2], catColor)}</strong>);
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 2);
        break;
      case 'italic':
        result.push(<em key={key++} className="text-gray-200 italic">{parseInline(m[2], catColor)}</em>);
        remaining = remaining.slice(best.before.length + 1 + m[2].length + 1);
        break;
      case 'strike':
        result.push(<s key={key++} className="text-gray-500 line-through">{parseInline(m[2], catColor)}</s>);
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 2);
        break;
      case 'highlight':
        result.push(
          <mark key={key++} className="rounded px-1.5 py-0.5"
            style={{ backgroundColor: `${catColor}30`, color: catColor }}>
            {parseInline(m[2], catColor)}
          </mark>
        );
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 2);
        break;
      case 'color':
        result.push(<span key={key++} style={{ color: m[2] }}>{parseInline(m[3], catColor)}</span>);
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 1 + m[3].length + 3);
        break;
      case 'size': {
        const sizeMap: Record<string, string> = {
          xs: 'text-[11px]', sm: 'text-sm', base: 'text-base',
          lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl',
          '3xl': 'text-3xl', '4xl': 'text-4xl',
        };
        result.push(
          <span key={key++} className={sizeMap[m[2]] || 'text-base'}>
            {parseInline(m[3], catColor)}
          </span>
        );
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 1 + m[3].length + 4);
        break;
      }
      case 'link':
        result.push(
          <a key={key++} href={m[3]} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: catColor }}>
            {m[2]}
          </a>
        );
        remaining = remaining.slice(best.before.length + 1 + m[2].length + 2 + m[3].length + 1);
        break;
      case 'code':
        result.push(
          <code key={key++} className="bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[13px] font-mono">
            {m[2]}
          </code>
        );
        remaining = remaining.slice(best.before.length + 1 + m[2].length + 1);
        break;
      default:
        result.push(<span key={key++}>{remaining}</span>);
        remaining = '';
    }
  }

  return result;
}


// ============================================================================
// ENRICHED TEXT RENDERER WITH WORD DEFINITIONS
// ============================================================================

interface EnrichedTextProps {
  text: string;
  lang: 'fr' | 'en';
  catColor: string;
  enableDefinitions: boolean;
}

const EnrichedTextRenderer = memo(
  ({ text, lang, catColor, enableDefinitions }: EnrichedTextProps) => {
    // ✅ Utilise directement le hook
    const { definition, isLoading, isOpen, currentWord, lookupWord, closePopover } = useWordDefinition(lang);

    const handleWordClick = useCallback(
      async (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
        if (!enableDefinitions) return;
        e.stopPropagation();
        // ✅ Appelle lookupWord (qui gère tout : ouverture, chargement, etc.)
        await lookupWord(word);
      },
      [enableDefinitions, lookupWord]
    );

    // ✅ Adapte le filtre selon la langue
    const shouldBeClickable = useCallback((word: string): boolean => {
      if (!enableDefinitions) return false;
      const clean = word.replace(/[-_]/g, '').toLowerCase();
      if (clean.length < 4) return false;
      if (lang === 'fr') {
        return /^[a-zàâäéèêëïîôùûüÿœæç]+$/i.test(clean);
      }
      return /^[a-z]+$/.test(clean);
    }, [enableDefinitions, lang]);

    const words = text.split(/(\s+)/);

    return (
      <div className="relative">
        <div className="text-gray-300 leading-relaxed text-base md:text-[17px]">
          {words.map((word, idx) => {
            const cleanWord = word.replace(/[-_.,!?;:'"()[\]]/g, '').toLowerCase();
            const clickable = shouldBeClickable(cleanWord);

            if (!clickable) return <span key={idx}>{word}</span>;

            return (
              <span
                key={idx}
                onClick={(e) => handleWordClick(cleanWord, e)}
                className="cursor-help hover:text-[#D4AF37] transition-colors underline decoration-dotted decoration-[#D4AF37]/30 underline-offset-2"
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* ✅ Un seul popover, utilise isOpen et currentWord du hook */}
        <WordDefinitionPopover
          definition={definition}
          isOpen={isOpen}
          onClose={closePopover}
          lang={lang}
          word={currentWord}
        />
      </div>
    );
  }
);
EnrichedTextRenderer.displayName = 'EnrichedTextRenderer';


// ============================================================================
// CONTENT RENDERER
// ============================================================================

const ContentRenderer = memo(({ text, lang, catColor }: {
  text: string;
  lang: 'fr' | 'en';
  catColor: string;
}) => {
  if (!text?.trim()) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CaurisIcon className="w-12 h-12 text-gray-800" />
        <p className="text-gray-600 text-sm italic">
          {lang === 'fr'
            ? "Ce contenu n'est pas encore disponible dans cette langue."
            : 'This content is not yet available in this language.'}
        </p>
      </div>
    );
  }

  let h2Count = 0;

  const isMarkdownImage = (line: string) => /!\[[^\]]*\]\([^)]+\)/.test(line);
  const isRawImageUrl = (line: string) =>
    /^https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif|svg)(\?[^\s]*)?$/i.test(line.trim());

  const parseMarkdownImage = (line: string) => {
    const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (!match) return null;
    return { alt: match[1] || '', url: match[2] };
  };

  const renderImage = (url: string, alt: string, key: number) => (
    <motion.figure key={key}
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5 }}
      className="my-8">
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/30">
        <img src={url} alt={alt || 'Image'} loading="lazy"
          className="w-full max-h-[600px] object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      {alt && (
        <figcaption className="mt-2 text-center text-gray-500 text-xs italic">{alt}</figcaption>
      )}
    </motion.figure>
  );

  return (
    <>
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Séparateur ---
        if (trimmed === '---' || trimmed === '***') {
          return (
            <div key={i} className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${catColor}40, transparent)` }} />
              <span style={{ color: `${catColor}60` }}><CaurisIcon className="w-4 h-4" /></span>
              <div className="flex-1 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${catColor}40, transparent)` }} />
            </div>
          );
        }

        // ## H2
        if (trimmed.startsWith('## ')) {
          const headingText = trimmed.slice(3);
          const cleanText = stripFormatting(headingText);
          const id = `section-${cleanText.toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
          h2Count++;
          return (
            <motion.h2 key={i} id={id}
              initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4 }}
              className="flex items-center gap-3 text-xl md:text-2xl font-serif font-bold text-white mt-12 mb-5 pb-3 scroll-mt-24"
              style={{ borderBottom: `1px solid ${catColor}20` }}>
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-black"
                style={{ backgroundColor: catColor }}>
                {h2Count}
              </span>
              <span>{parseInline(headingText, catColor)}</span>
            </motion.h2>
          );
        }

        // # H3
        if (trimmed.startsWith('# ')) {
          const headingText = trimmed.slice(2);
          const cleanText = stripFormatting(headingText);
          const id = `subsection-${cleanText.toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
          return (
            <h3 key={i} id={id}
              className="text-lg font-serif font-bold mt-8 mb-3 scroll-mt-24"
              style={{ color: catColor }}>
              {parseInline(headingText, catColor)}
            </h3>
          );
        }

        // > Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <motion.blockquote key={i}
              initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} className="relative my-6 pl-6 py-1">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                style={{ backgroundColor: catColor }} />
              <p className="text-gray-300 italic text-base leading-relaxed">
                {parseInline(trimmed.slice(2), catColor)}
              </p>
            </motion.blockquote>
          );
        }

        // - Liste
        if (trimmed.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-3 mb-3 ml-2">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2.5"
                style={{ backgroundColor: catColor }} />
              <p className="text-gray-300 leading-[1.9] text-base md:text-[17px] flex-1">
                {parseInline(trimmed.slice(2), catColor)}
              </p>
            </div>
          );
        }

        // Image Markdown
        if (isMarkdownImage(trimmed)) {
          const parsed = parseMarkdownImage(trimmed);
          if (parsed) return renderImage(parsed.url, parsed.alt, i);
        }

        // URL brute image
        if (isRawImageUrl(trimmed)) return renderImage(trimmed, '', i);

        // Texte normal
        return (
          <p key={i} className="mb-5 text-gray-300 leading-[1.9] text-base md:text-[17px]">
            {parseInline(trimmed, catColor)}
          </p>
        );
      })}
    </>
  );
});
ContentRenderer.displayName = 'ContentRenderer';


// ============================================================================
// ARTICLE TIMELINE ENTRY
// ============================================================================

const TimelineEntry = memo(({ entry, lang, catColor }: {
  entry: {
    year: string;
    title_fr: string;
    title_en: string;
    description_fr?: string;
    description_en?: string;
  };
  lang: 'fr' | 'en';
  catColor: string;
}) => {
  const title = lang === 'fr' ? entry.title_fr : entry.title_en;
  const description = lang === 'fr' ? entry.description_fr : entry.description_en;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="relative flex gap-4 group"
    >
      {/* Point timeline */}
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full border-2 border-black flex-shrink-0"
          style={{ backgroundColor: catColor, boxShadow: `0 0 10px ${catColor}` }}
        />
        <div
          className="flex-1 w-px mt-2"
          style={{ backgroundColor: `${catColor}30` }}
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="font-mono font-bold text-sm"
            style={{ color: catColor }}
          >
            {entry.year}
          </span>
        </div>
        <h4 className="text-white font-bold text-sm mb-1 group-hover:text-[color:var(--cat)] transition-colors"
          style={{ '--cat': catColor } as React.CSSProperties}>
          {title}
        </h4>
        {description && (
          <p className="text-gray-500 text-xs leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
});
TimelineEntry.displayName = 'TimelineEntry';

// ============================================================================
// LINKED EVENT CARD
// ============================================================================

const LinkedEventCard = memo(({ event, lang, catColor }: {
  event: LinkedEvent;
  lang: 'fr' | 'en';
  catColor: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '-40px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const title = lang === 'fr' ? event.title_fr : event.title_en;
  const desc = lang === 'fr' ? event.desc_fr : event.desc_en;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      className="group relative flex gap-0 bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300"
      style={{ '--cat': catColor } as React.CSSProperties}
    >
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center px-4 py-4 min-w-[64px]"
        style={{ borderRight: `1px solid ${catColor}20` }}
      >
        <span
          className="font-mono font-bold text-base leading-none"
          style={{ color: catColor }}
        >
          {Math.abs(event.year)}
        </span>
        {event.year < 0 && (
          <span className="text-gray-700 text-[8px] font-mono mt-0.5">av. J-C</span>
        )}
        {event.event_day && event.event_month && (
          <span className="text-gray-600 text-[9px] font-mono mt-1">
            {String(event.event_day).padStart(2, '0')}/{String(event.event_month).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 p-4">
        <h4
          className="text-white font-bold text-sm mb-1 line-clamp-1 group-hover:transition-colors duration-300"
          style={{ '--hover': catColor } as React.CSSProperties}
        >
          <span className="group-hover:text-[var(--hover)] transition-colors duration-300">
            {title}
          </span>
        </h4>
        {desc && (
          <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed mb-2">
            {desc}
          </p>
        )}
        <div className="flex items-center gap-2">
          {event.country && (
            <span className="text-gray-700 text-[10px] font-mono">{event.country}</span>
          )}
          <span className="ml-auto text-[10px]" style={{ color: `${catColor}70` }}>
            {'★'.repeat(event.importance)}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
LinkedEventCard.displayName = 'LinkedEventCard';

// ============================================================================
// RELATED ARTICLE CARD
// ============================================================================

const RelatedArticleCard = memo(({ article, lang }: {
  article: RelatedArticle;
  lang: 'fr' | 'en';
}) => {
  const title = lang === 'fr' ? article.title_fr : article.title_en;
  const summary = lang === 'fr' ? article.summary_fr : article.summary_en;
  const catColor = article.categories?.color || '#D4AF37';

  return (
    <Link href={`/encyclopedie/${article.slug}`} className="group block">
      <div className="relative bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300">
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: catColor, opacity: 0.5 }}
        />

        <div className="flex gap-3 p-4 pl-5">
          {article.image_url && (
            <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
              <img
                src={article.image_url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-white text-sm font-bold line-clamp-1 mb-1 group-hover:text-[#D4AF37] transition-colors duration-300">
              {title}
            </h4>
            <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">
              {summary}
            </p>
          </div>

          <ArrowRight
            size={14}
            className="flex-shrink-0 text-gray-700 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all duration-300 self-center"
          />
        </div>
      </div>
    </Link>
  );
});
RelatedArticleCard.displayName = 'RelatedArticleCard';

// ============================================================================
// SCROLL TO TOP
// ============================================================================

const ScrollToTop = memo(({ catColor }: { catColor: string }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-8 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm transition-all"
      style={{
        backgroundColor: `${catColor}20`,
        boxShadow: `0 0 20px ${catColor}30`,
      }}
    >
      <ChevronUp size={18} style={{ color: catColor }} />
    </motion.button>
  );
});
ScrollToTop.displayName = 'ScrollToTop';

// ============================================================================
// SHARE BUTTON
// ============================================================================

const ShareButton = memo(({ title, lang }: { title: string; lang: 'fr' | 'en' }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    
    // ✅ Nettoie la mise en forme du titre
    const cleanTitle = stripFormatting(title);
    
    if (navigator.share) {
      await navigator.share({ title: cleanTitle, url });
    } else {
      // ✅ Copie le titre + URL (format lisible)
      const shareText = `${cleanTitle}\n${url}`;
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [title]);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold"
    >
      {copied
        ? <><Sparkles size={13} className="text-[#D4AF37]" />{lang === 'fr' ? 'Copié !' : 'Copied!'}</>
        : <><Share2 size={13} />{lang === 'fr' ? 'Partager' : 'Share'}</>
      }
    </motion.button>
  );
});
ShareButton.displayName = 'ShareButton';

// ============================================================================
// EXTRACT TOC FROM CONTENT
// ============================================================================

function extractToc(content: string): TocItem[] {
  if (!content) return [];
  const items: TocItem[] = [];
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      const raw = trimmed.slice(3);
      const clean = stripFormatting(raw);
      items.push({
        id: `section-${clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
        text: clean,
        level: 'h2',
      });
    } else if (trimmed.startsWith('# ')) {
      const raw = trimmed.slice(2);
      const clean = stripFormatting(raw);
      items.push({
        id: `subsection-${clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
        text: clean,
        level: 'h3',
      });
    }
  });
  return items;
}

// ============================================================================
// HELPER: Extract domain from URL
// ============================================================================

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}


// ============================================================================
// AUDIO PLAYER - VERSION COMPLÈTE CORRIGÉE
// ============================================================================

const AudioPlayer = memo(({ text, lang, catColor }: {
  text: string;
  lang: 'fr' | 'en';
  catColor: string;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const totalCharsRef = useRef(0);

  // ✅ Nettoie TOUT le markdown du texte
  const cleanText = useMemo(() => {
    if (!text) return '';
    
    return text
      // Enlève les balises de formatage
      .replace(/\*\*([^\*]+)\*\*/g, '$1')
      .replace(/\*([^\*]+)\*/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/==([^=]+)==/g, '$1')
      .replace(/\{#[^}]+\}([^{]+)\{\/\}/g, '$1')
      .replace(/\{\+[^}]+\}([^{]+)\{\/\+\}/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Enlève les titres markdown
      .replace(/^#{1,6}\s+/gm, '')
      // Enlève les listes
      .replace(/^\s*[-*+]\s+/gm, '')
      // Enlève les blockquotes
      .replace(/^\s*>\s+/gm, '')
      // Enlève les images
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      // Enlève les URLs seules
      .replace(/https?:\/\/[^\s]+/g, '')
      // Nettoie les espaces multiples
      .replace(/\s+/g, ' ')
      .trim();
  }, [text]);

  useEffect(() => {
    const isBrowser = typeof window !== 'undefined';
    const hasSupport = isBrowser && 'speechSynthesis' in window;
    
    setIsSupported(hasSupport);

    if (!hasSupport) {
      console.warn('❌ Speech Synthesis non supporté par le navigateur');
      setError('Speech Synthesis non supporté');
      return;
    }

    // Charge les voix
    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        console.log(`🎤 ${voices.length} voix disponibles`);
        
        if (voices.length > 0) {
          setVoicesLoaded(true);
          setError(null);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des voix:', err);
      }
    };

    loadVoices();
    
    // Écoute l'événement de chargement des voix
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch (err) {
        console.error('Erreur cancel:', err);
      }
    };
  }, []);

  // ✅ Reset quand la langue change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      window.speechSynthesis?.cancel();
    } catch (err) {
      console.error('Erreur cancel:', err);
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    utteranceRef.current = null;
  }, [lang]);

  // ✅ Fonction pour obtenir la meilleure voix
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    try {
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        console.warn('❌ Aucune voix disponible');
        return null;
      }

      const langCode = lang === 'fr' ? 'fr' : 'en';
      
      console.log(`🔍 Cherchant voix pour ${langCode}`);
      console.log('Voix disponibles:', voices.map(v => `${v.name} (${v.lang})`).join(', '));

      // Essaie de trouver une voix premium dans l'ordre de préférence
      const priorities = [
        (v: SpeechSynthesisVoice) => v.lang.startsWith(langCode) && v.name.includes('Google'),
        (v: SpeechSynthesisVoice) => v.lang.startsWith(langCode) && v.name.includes('Premium'),
        (v: SpeechSynthesisVoice) => v.lang.startsWith(langCode) && !v.localService,
        (v: SpeechSynthesisVoice) => v.lang.startsWith(langCode),
      ];

      for (const priority of priorities) {
        const voice = voices.find(priority);
        if (voice) {
          console.log(`✅ Voix sélectionnée: ${voice.name} (${voice.lang})`);
          return voice;
        }
      }

      // Fallback : première voix
      const fallback = voices[0];
      console.log(`⚠️ Fallback: ${fallback.name} (${fallback.lang})`);
      return fallback;

    } catch (err) {
      console.error('❌ Erreur getVoice:', err);
      return null;
    }
  }, [lang]);

  const handlePlay = useCallback(() => {
    if (!isSupported) {
      setError('Speech Synthesis non supporté');
      console.error('❌ Speech Synthesis non supporté');
      return;
    }

    if (!voicesLoaded) {
      setError('Voix en cours de chargement...');
      console.warn('⚠️ Voix pas encore chargées');
      return;
    }

    if (!cleanText || cleanText.trim().length === 0) {
      setError('Texte vide');
      console.error('❌ Texte vide');
      return;
    }

    try {
      // ✅ Si en pause, reprendre
      if (isPaused) {
        console.log('▶️ Reprise de la lecture');
        window.speechSynthesis.resume();
        setIsPlaying(true);
        setIsPaused(false);
        return;
      }

      // ✅ Arrête toute lecture en cours
      window.speechSynthesis.cancel();
      
      console.log(`🎤 Démarrage de la lecture (${cleanText.length} chars, ${lang})`);
      
      totalCharsRef.current = cleanText.length;
      setProgress(0);
      setError(null);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // ✅ Configuration optimale
      utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // ✅ Applique la voix AVANT de parler
      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
      } else {
        console.warn('⚠️ Pas de voix trouvée, utilisation de la voix par défaut');
      }

      // ✅ Gestion des événements
      utterance.onstart = () => {
        console.log('🔊 Lecture démarrée');
        setIsPlaying(true);
        setIsPaused(false);
      };

      utterance.onboundary = (e) => {
        if (totalCharsRef.current > 0) {
          const newProgress = Math.min((e.charIndex / totalCharsRef.current) * 100, 100);
          setProgress(newProgress);
        }
      };

      utterance.onend = () => {
        console.log('✅ Lecture terminée');
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        setTimeout(() => setProgress(0), 2000);
      };

      utterance.onpause = () => {
        console.log('⏸️ Lecture mise en pause');
        setIsPlaying(false);
        setIsPaused(true);
      };

      utterance.onresume = () => {
        console.log('▶️ Lecture reprise');
        setIsPlaying(true);
        setIsPaused(false);
      };

      utterance.onerror = (e) => {
        console.error('❌ Erreur TTS:', e.error);
        setError(`Erreur: ${e.error}`);
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
      };

      utteranceRef.current = utterance;
      
      // ✅ Lance la lecture
      window.speechSynthesis.speak(utterance);

    } catch (err: any) {
      console.error('❌ Erreur handlePlay:', err);
      setError(err.message);
      setIsPlaying(false);
      setIsPaused(false);
    }

  }, [isSupported, voicesLoaded, isPaused, cleanText, lang, getVoice]);

  const handlePause = useCallback(() => {
    if (!isSupported) return;
    try {
      console.log('⏸️ Pause');
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } catch (err) {
      console.error('❌ Erreur pause:', err);
    }
  }, [isSupported]);

  const handleStop = useCallback(() => {
    if (!isSupported) return;
    try {
      console.log('⛔ Stop');
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      utteranceRef.current = null;
    } catch (err) {
      console.error('❌ Erreur stop:', err);
    }
  }, [isSupported]);

  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border"
        style={{
          backgroundColor: `${catColor}08`,
          borderColor: `${catColor}25`,
        }}
      >
        <div className="text-xs text-gray-500">
          🔇 {lang === 'fr' ? 'Lecture vocale non supportée' : 'Speech not supported'}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border"
      style={{
        backgroundColor: `${catColor}08`,
        borderColor: `${catColor}25`,
      }}
    >
      {/* Bouton Play / Pause */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={isPlaying ? handlePause : handlePlay}
        disabled={!voicesLoaded || !cleanText}
        title={
          !voicesLoaded
            ? 'Chargement des voix...'
            : isPlaying
              ? (lang === 'fr' ? 'Pause' : 'Pause')
              : isPaused
                ? (lang === 'fr' ? 'Reprendre' : 'Resume')
                : (lang === 'fr' ? 'Écouter l\'article' : 'Listen to article')
        }
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: catColor,
          boxShadow: isPlaying ? `0 0 14px ${catColor}60` : 'none',
        }}
      >
        {!voicesLoaded ? (
          <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
        ) : isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-black">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-black ml-0.5">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </motion.button>

      {/* Label */}
      <div className="flex flex-col min-w-0">
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase leading-none"
          style={{ color: catColor }}
        >
          {!voicesLoaded
            ? 'Chargement...'
            : isPlaying
              ? (lang === 'fr' ? 'Lecture en cours...' : 'Playing...')
              : isPaused
                ? (lang === 'fr' ? 'En pause' : 'Paused')
                : (lang === 'fr' ? 'Écouter l\'article' : 'Listen to article')}
        </span>
        <span className="text-[9px] text-gray-600 mt-0.5">
          {error ? error : `${lang === 'fr' ? 'Français' : 'English'} · TTS`}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="flex-1 relative h-1 rounded-full overflow-hidden bg-white/10 mx-1">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: catColor }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
        {isPlaying && (
          <motion.div
            className="absolute inset-y-0 rounded-full opacity-40"
            style={{
              left: `${Math.max(progress - 8, 0)}%`,
              width: '8%',
              backgroundColor: catColor,
              filter: 'blur(4px)',
            }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
      </div>

      {/* Bouton Stop */}
      <AnimatePresence>
        {(isPlaying || isPaused) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleStop}
            title={lang === 'fr' ? 'Arrêter' : 'Stop'}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-gray-400">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
AudioPlayer.displayName = 'AudioPlayer';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const [mounted, setMounted] = useState(false);
  const [heroY, setHeroY] = useState('0%');
  const [heroOpacity, setHeroOpacity] = useState(1);


  const hasIncrementedView = useRef(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [enrichmentMode, setEnrichmentMode] = useState(false);

  

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!mounted || !heroRef.current) return;
    const handleScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, Math.abs(rect.top / rect.height)));
      setHeroY(`${progress * 30}%`);
      setHeroOpacity(1 - Math.min(progress / 0.6, 1));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX / window.innerWidth) - 0.5,
          y: (e.clientY / window.innerHeight) - 0.5,
        });
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => { window.removeEventListener('mousemove', handleMouseMove); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);

    async function fetchArticle() {
      if (!slug) return;
      setIsLoading(true);

     const { data, error } = await supabase
  .from('articles')
  .select(`
    id, title_fr, title_en, content_fr, content_en,
    summary_fr, summary_en, image_url, category_id,
    created_at, slug, view_count, reading_time, wikipedia_url,
    sources, timeline,
    categories(id, name_fr, name_en, color)
  `)
  .eq('slug', slug)
  .eq('status', 'published')
  .single();

      if (!error && data) {
        setArticle(data as unknown as Article);

        if (!hasIncrementedView.current) {
          hasIncrementedView.current = true;
          supabase
            .from('articles')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', data.id)
            .then(() => { });
        }

        const { data: linkedEventIds } = await supabase
          .from('article_events')
          .select('event_id')
          .eq('article_id', data.id);

        if (linkedEventIds && linkedEventIds.length > 0) {
          const eventIds = linkedEventIds.map(l => l.event_id);
          const { data: linkedEvents } = await supabase
            .from('events')
            .select('id, title_fr, title_en, desc_fr, desc_en, year, event_month, event_day, country, importance, categories(id, name_fr, name_en, color)')
            .in('id', eventIds)
            .order('year', { ascending: false });

          if (linkedEvents) {
            (data as any).linked_events = linkedEvents;
          }
        }

        setArticle(data as unknown as Article);

        if (data.category_id) {
          const { data: related } = await supabase
            .from('articles')
            .select('id, title_fr, title_en, image_url, summary_fr, summary_en, slug, categories(id, name_fr, name_en, color)')
            .eq('status', 'published')
            .eq('category_id', data.category_id)
            .neq('id', data.id)
            .limit(3);

          if (related) setRelatedArticles(related as unknown as RelatedArticle[]);
        }
      }

      setIsLoading(false);
    }

    fetchArticle();
  }, [slug]);


  

  const handleLangToggle = useCallback(() => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    localStorage.setItem('lukeni_lang', newLang);
  }, [lang]);

  const catColor = article?.categories?.color || '#D4AF37';
  const title = article ? (lang === 'fr' ? article.title_fr : article.title_en) : '';
  const content = article ? (lang === 'fr' ? article.content_fr : article.content_en) : '';
  const categoryName = article?.categories
    ? (lang === 'fr' ? article.categories.name_fr : article.categories.name_en)
    : '';
  const tocItems = useMemo(() => extractToc(content), [content]);

  if (isLoading) {
    return (
      <AnimatePresence>
        <LoadingScreen lang={lang} />
      </AnimatePresence>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#03032B] to-black text-white flex flex-col items-center justify-center gap-6 p-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CaurisIcon className="w-16 h-16 text-gray-700" />
        </motion.div>
        <div className="text-center">
          <p className="text-white font-serif text-xl mb-2">
            {lang === 'fr' ? 'Ce codex est introuvable.' : 'This codex cannot be found.'}
          </p>
          <p className="text-gray-600 text-sm mb-6">
            {lang === 'fr' ? 'Il a peut-être voyagé vers d\'autres étoiles.' : 'It may have traveled to other stars.'}
          </p>
        </div>
        <Link
          href="/encyclopedie"
          className="flex items-center gap-2 text-[#D4AF37] text-sm font-bold hover:underline"
        >
          <ArrowLeft size={14} />
          {lang === 'fr' ? 'Retour aux Archives' : 'Back to Archives'}
        </Link>
      </div>
    );
  }

  return (

    <NotesplitContainer
      itemId={article.slug}
      itemType="article"
      userId={user?.id}
      catColor={catColor}
      lang={lang}
    >


      <ReadingProgress color={catColor} />

      <StarField mousePos={mousePos} />


      <header className="sticky top-[2px] z-50 bg-[#020111]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 grid grid-cols-3 items-center gap-4">

          {/* Gauche : Retour */}
          <div>
            <Link href="/encyclopedie"
              className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors group">
              <motion.div whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
                <ArrowLeft size={16} />
              </motion.div>
              <span className="hidden md:inline text-sm font-medium">
                {lang === 'fr' ? 'Archives' : 'Archives'}
              </span>
            </Link>
          </div>

          {/* Centre : Logo parfaitement centré */}
          <div className="flex justify-center">
            <Link href="/encyclopedie">
              <motion.div
                animate={{ boxShadow: ['0 0 10px rgba(212,175,55,0.2)', '0 0 20px rgba(212,175,55,0.4)', '0 0 10px rgba(212,175,55,0.2)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <CaurisIcon className="w-6 h-6 text-[#D4AF37]" />
              </motion.div>
            </Link>
          </div>

          {/* Droite : Bouton de traduction uniquement */}
          <div className="flex justify-end">
            <button
              onClick={handleLangToggle}
              className="px-4 py-1.5 text-xs font-bold bg-white/[0.04] border border-white/10 rounded-xl text-gray-400 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all tracking-wider"
            >
              {lang.toUpperCase()}
            </button>
          </div>

        </div>
      </header>

      {article.image_url && (
  <div ref={heroRef} className="relative h-[50vh] md:h-[65vh] overflow-hidden">
    <img
      src={article.image_url}
      alt={title}
      loading="eager"
      className="absolute inset-0 w-full h-full object-cover"
      style={{ transform: `translateY(${heroY}) scale(1.1)` }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/50 to-transparent" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#020111]/30 via-transparent to-[#020111]/30" />

    {/* Catégorie */}
    {article.categories && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-6 left-6 z-20"
      >
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm"
          style={{
            backgroundColor: `${catColor}25`,
            color: catColor,
            border: `1px solid ${catColor}40`,
          }}
        >
          <Tag size={10} />
          {categoryName}
        </span>
      </motion.div>
    )}

    {/* Boutons verticaux sur la photo (haut droite) */}
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="absolute top-6 right-6 z-20 flex flex-col gap-2"
    >
      <ShareButton title={title} lang={lang} />

      <button
        onClick={() => setEnrichmentMode(!enrichmentMode)}
        className={`px-4 py-2 text-xs font-bold rounded-xl backdrop-blur-md transition-all ${
          enrichmentMode
            ? 'bg-[#D4AF37] text-black border border-[#D4AF37]'
            : 'bg-white/[0.06] border border-white/10 text-gray-300 hover:border-[#D4AF37]/50'
        }`}
        title={lang === 'fr' ? 'Mode dictionnaire — cliquez sur les mots' : 'Dictionary mode — click on words'}
      >
        Dict
      </button>

      <FavoriteButton itemType="article" itemId={article.id} size={17} />
    </motion.div>

    {/* Titre en bas */}
    <div
      style={{ opacity: heroOpacity }}
      className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1.5 bg-[#D4AF37] px-2.5 py-1 rounded-full">
            <CaurisIcon className="w-3 h-3 text-black" />
            <span className="text-[9px] font-bold text-black tracking-[0.2em] uppercase">Lukeni</span>
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
          {parseInline(title, catColor)}
        </h1>
      </div>
    </div>
  </div>
)}

      <div className="relative z-10 mx-auto px-4 sm:px-6 py-10" style={{ maxWidth: '1400px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-12">

          <div>

            {!article.image_url && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                {article.categories && (
                  <span
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold w-fit mb-4"
                    style={{
                      backgroundColor: `${catColor}20`,
                      color: catColor,
                      border: `1px solid ${catColor}30`,
                    }}
                  >
                    <Tag size={10} />
                    {categoryName}
                  </span>
                )}
                {/* Title sans image */}
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight">
                  {parseInline(title, catColor)}
                </h1>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-white/[0.06]"
            >
              <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                <Calendar size={11} />
                {new Date(article.created_at).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </span>

              {article.reading_time && (
                <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Clock size={11} />
                  {article.reading_time} min
                </span>
              )}

              {article.view_count !== undefined && (
                <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Eye size={11} />
                  {article.view_count} {lang === 'fr' ? 'lectures' : 'reads'}
                </span>
              )}

              {article.wikipedia_url && (
                <a
                  href={article.wikipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 text-xs transition-colors ml-auto"
                >
                  <Globe size={11} />
                  Wikipedia
                  <ExternalLink size={9} />
                </a>
              )}
            </motion.div>

            {/* ── Audio Player ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mb-6"
            >
              <AudioPlayer
                text={`${stripFormatting(title)}. ${stripFormatting(
                  lang === 'fr' ? article.summary_fr : article.summary_en
                )}. ${stripFormatting(content)}`}
                lang={lang}
                catColor={catColor}
              />
            </motion.div>

            {(lang === 'fr' ? article.summary_fr : article.summary_en) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative mb-8 p-5 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${catColor}08, transparent)`,
                  border: `1px solid ${catColor}15`,
                }}
              >
                <div
                  className="absolute top-0 left-5 right-5 h-px rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${catColor}40, transparent)` }}
                />
                {/* Résumé */}
                <p className="text-gray-300 text-base leading-relaxed italic font-light">
                  {parseInline(lang === 'fr' ? article.summary_fr : article.summary_en, catColor)}
                </p>
              </motion.div>
            )}

            <div className="lg:hidden mb-6">
              <TableOfContents items={tocItems} lang={lang} catColor={catColor} />
            </div>

            <motion.article
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative"
            >
              <div
                className="absolute -left-5 top-0 bottom-0 w-px hidden md:block"
                style={{
                  background: `linear-gradient(to bottom, ${catColor}40, ${catColor}10, transparent)`,
                }}
              />
              {enrichmentMode ? (
                <EnrichedTextRenderer
                  text={stripFormatting(content)}
                  lang={lang}
                  catColor={catColor}
                  enableDefinitions={true}
                />
              ) : (
                <ContentRenderer text={content} lang={lang} catColor={catColor} />
              )}
            </motion.article>


                        {/* ── Chronologie de l'article ── */}
            {article.timeline && article.timeline.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 pt-8 border-t border-white/[0.06]"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-600 flex items-center gap-2">
                    <Calendar size={11} />
                    {lang === 'fr' ? 'Chronologie' : 'Timeline'}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>

                <div className="space-y-0">
                  {article.timeline.map((entry, i) => (
                    <TimelineEntry
                      key={i}
                      entry={entry}
                      lang={lang}
                      catColor={catColor}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Sources & Références ── */}
            {article.sources && article.sources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 pt-8 border-t border-white/[0.06]"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-600 flex items-center gap-2">
                    <Link2 size={11} />
                    {lang === 'fr' ? 'Sources & Références' : 'Sources & References'}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>

                <div className="space-y-2">
                  {article.sources.map((source, i) => (
                    <motion.a
                      key={i}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl hover:border-[#D4AF37]/40 hover:bg-white/[0.04] transition-all group"
                    >
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-black"
                        style={{ backgroundColor: catColor }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-400 text-xs group-hover:text-white transition-colors truncate block">
                          {source}
                        </span>
                        <span className="text-gray-600 text-[10px] font-mono">
                          {getDomain(source)}
                        </span>
                      </div>
                      <ExternalLink
                        size={12}
                        className="text-gray-600 group-hover:text-[#D4AF37] transition-colors flex-shrink-0"
                      />
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Événements Liés ── */}
            {article.linked_events && article.linked_events.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 pt-8 border-t border-white/[0.06]"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-600 flex items-center gap-2">
                    <Flag size={11} />
                    {lang === 'fr' ? 'Événements Liés' : 'Related Events'}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
                <div className="space-y-3">
                  {article.linked_events.map((event) => (
                    <LinkedEventCard key={event.id} event={event} lang={lang} catColor={catColor} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Wikipedia ── */}
            {article.wikipedia_url && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-10 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <Globe size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">
                      {lang === 'fr' ? 'Approfondir sur Wikipedia' : 'Go deeper on Wikipedia'}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {lang === 'fr' ? 'Source de référence encyclopédique' : 'Encyclopedic reference source'}
                    </p>
                  </div>
                </div>
                <a
                  href={article.wikipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <motion.div
                    whileHover={{ scale: 1.05, x: 3 }}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    <ArrowRight size={14} />
                  </motion.div>
                </a>
              </motion.div>
            )}

            {/* ── Articles connexes ── */}
            {relatedArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 pt-8 border-t border-white/[0.05]"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-600 flex items-center gap-2">
                    <BookOpen size={11} />
                    {lang === 'fr' ? 'Dans les Archives' : 'In the Archives'}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
                <div className="space-y-3">
                  {relatedArticles.map(rel => (
                    <RelatedArticleCard key={rel.id} article={rel} lang={lang} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Bottom nav ── */}
            <div className="mt-12 pt-6 border-t border-white/[0.05] flex items-center justify-between">
              <Link
                href="/encyclopedie"
                className="flex items-center gap-2 text-gray-600 hover:text-[#D4AF37] transition-colors text-sm group"
              >
                <motion.div whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <ArrowLeft size={14} />
                </motion.div>
                {lang === 'fr' ? 'Retour aux Archives' : 'Back to Archives'}
              </Link>

              <div className="flex items-center gap-2">
                <ShareButton title={title} lang={lang} />
                <FavoriteButton itemType="article" itemId={article.id} size={15} />
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:flex lg:flex-col lg:w-[300px]">
            <TableOfContents items={tocItems} lang={lang} catColor={catColor} />

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <CaurisIcon className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500">
                  {lang === 'fr' ? 'À propos' : 'About'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {article.categories && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Catégorie' : 'Category'}</span>
                    <span
                      className="px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: `${catColor}20`, color: catColor }}
                    >
                      {categoryName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{lang === 'fr' ? 'Publié' : 'Published'}</span>
                  <span className="text-gray-400">
                    {new Date(article.created_at).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US',
                      { month: 'short', year: 'numeric' }
                    )}
                  </span>
                </div>

                {article.reading_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Lecture' : 'Reading'}</span>
                    <span className="text-gray-400">{article.reading_time} min</span>
                  </div>
                )}

                {article.view_count !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Lectures' : 'Reads'}</span>
                    <span className="text-gray-400">{article.view_count}</span>
                  </div>
                )}

                {article.sources && article.sources.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Sources' : 'Sources'}</span>
                    <span className="text-gray-400">{article.sources.length}</span>
                  </div>
                )}

                {article.wikipedia_url && (
                  <div className="pt-3 border-t border-white/[0.05]">
                    <a
                      href={article.wikipedia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-white transition-colors"
                    >
                      <Globe size={11} />
                      Wikipedia
                      <ExternalLink size={9} className="ml-auto" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4"
            >
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-600 mb-3">
                {lang === 'fr' ? 'Langue' : 'Language'}
              </p>
              <div className="flex gap-2">
                {(['fr', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      localStorage.setItem('lukeni_lang', l);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${lang === l
                      ? 'text-black'
                      : 'bg-white/5 text-gray-500 hover:text-gray-300'
                      }`}
                    style={lang === l ? { backgroundColor: catColor } : {}}
                  >
                    {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
            </motion.div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        <ScrollToTop catColor={catColor} />
      </AnimatePresence>
    </NotesplitContainer>
  );
}