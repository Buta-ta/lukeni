'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Globe, ExternalLink,
  ChevronUp, Hash, Share2, Sparkles,
  BookOpen, ArrowRight, Calendar
} from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import { useWordDefinition } from '@/lib/hooks/useWordDefinition';
import { WordDefinitionPopover } from '@/components/WordDefinitionPopover';
import { NotesplitContainer } from '@/components/NotesplitContainer';

// ============================================================================
// TYPES
// ============================================================================

interface WikiSection {
  title: string;
  content: string;
  level: number;
}

interface WikiArticle {
  title: string;
  extract: string;
  content: string;
  sections: WikiSection[];
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string };
  lang: string;
  dir: string;
  timestamp: string;
  description?: string;
  categories?: string[];
  pageid: number;
  related?: WikiRelated[];
}

interface WikiRelated {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  pageid: number;
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
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.4 + 0.4,
      depth: Math.random() * 10 + 3,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3,
    })), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(ellipse, #D4AF37 0%, transparent 70%)', filter: 'blur(80px)' }} />
      {stars.map(star => (
        <motion.div key={star.id} className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
          animate={{ x: mousePos.x * star.depth, y: mousePos.y * star.depth, opacity: [0.15, 0.6, 0.15] }}
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
// READING PROGRESS
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
      <div className="h-full rounded-full transition-all duration-100"
        style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, #fff)`, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
});
ReadingProgress.displayName = 'ReadingProgress';

// ============================================================================
// SCROLL TO TOP
// ============================================================================

const ScrollToTop = memo(({ color }: { color: string }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const h = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  if (!visible) return null;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-8 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm"
      style={{ backgroundColor: `${color}20`, boxShadow: `0 0 20px ${color}30` }}
    >
      <ChevronUp size={18} style={{ color }} />
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
    if (navigator.share) { await navigator.share({ title, url }); }
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [title]);
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold">
      {copied
        ? <><Sparkles size={13} className="text-[#D4AF37]" />{lang === 'fr' ? 'Copié !' : 'Copied!'}</>
        : <><Share2 size={13} />{lang === 'fr' ? 'Partager' : 'Share'}</>}
    </motion.button>
  );
});
ShareButton.displayName = 'ShareButton';

// ============================================================================
// TOC
// ============================================================================

interface TocItem { id: string; text: string; level: number; }

const TableOfContents = memo(({ items, lang, catColor }: {
  items: TocItem[];
  lang: 'fr' | 'en';
  catColor: string;
}) => {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); }),
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
    <div className="sticky top-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Hash size={13} style={{ color: catColor }} />
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500">
          {lang === 'fr' ? 'Sommaire' : 'Contents'}
        </span>
      </div>
      <nav className="space-y-1">
        {items.map(item => (
          <a key={item.id} href={`#${item.id}`}
            onClick={e => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); }}
            className={`block text-xs py-1.5 transition-all duration-200 ${item.level > 2 ? 'pl-3 border-l border-white/10' : ''} ${activeId === item.id ? 'font-bold' : 'text-gray-600 hover:text-gray-300'}`}
            style={activeId === item.id ? { color: catColor } : {}}>
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
});
TableOfContents.displayName = 'TableOfContents';



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
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const { definition, isLoading, isOpen, lookupWord, closePopover } = useWordDefinition(lang);

    const handleWordClick = useCallback(
      async (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
        if (!enableDefinitions) return;
        setSelectedWord(word);
        await lookupWord(word);
      },
      [enableDefinitions, lookupWord]
    );

    const shouldBeClickable = useCallback((word: string): boolean => {
      if (!enableDefinitions) return false;

      // Enlève les tirets/underscores AVANT de tester la longueur
      const cleanedWord = word.replace(/[-_]/g, '');

      if (cleanedWord.length < 4) return false;

      if (lang === 'fr') {
        // Accepte les caractères français + tirets
        return /^[a-zàâäéèêëïîôùûüÿœæç\-]+$/i.test(cleanedWord);
      }

      // Accepte les tirets pour l'anglais aussi
      return /^[a-z\-]+$/i.test(cleanedWord);
    }, [enableDefinitions, lang]);

   const words = text.split(/(\s+)/);

return (
  <div className="relative">
    <div className="text-gray-300 leading-relaxed text-base md:text-[17px]">
      {words.map((word, idx) => {
        // Nettoie le mot en enlevant la ponctuation SAUF les tirets
        const cleanWord = word
          .replace(/[.,!?;:'"()[\]]/g, '') // Enlève la ponctuation
          .toLowerCase();
        
        const clickable = shouldBeClickable(cleanWord);

        if (!clickable) return <span key={idx}>{word}</span>;

        return (
          <span
            key={idx}
            onClick={(e) => handleWordClick(cleanWord.replace(/^-+|-+$/g, ''), e)} // Enlève les tirets avant/après
            className="cursor-help hover:text-[#D4AF37] transition-colors underline decoration-dotted decoration-[#D4AF37]/30 underline-offset-2"
          >
            {word}
          </span>
        );
      })}
    </div>

    <WordDefinitionPopover
      definition={definition}
      isOpen={selectedWord !== null}
      onClose={closePopover}
      lang={lang}
      word={selectedWord || ''}
    />
  </div>
);
  }
);
EnrichedTextRenderer.displayName = 'EnrichedTextRenderer';

// ============================================================================
// WIKI CONTENT RENDERER
// ============================================================================

const WikiContentRenderer = memo(({ html, catColor }: {
  html: string;
  catColor: string;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !html) return;

    const div = contentRef.current;
    div.innerHTML = html;

    div.querySelectorAll(`
      .reference, .reflist, .mw-editsection, .noprint,
      .navigation-not-searchable, [role="note"], .navbox,
      .metadata, .sistersitebox, .hatnote, .ambox,
      style, script, link, .mw-empty-elt, .stub,
      .thumbcaption .magnify, .mw-kartographer-map,
      .geo-dec, .geo-dms, .coordinates, .plainlinks,
      .collapsible, .autocollapse, .mw-collapsible
    `).forEach(el => el.remove());

    div.querySelectorAll('h2').forEach((el, i) => {
      if (!el.textContent?.trim()) { el.remove(); return; }
      el.id = `wiki-section-${i}-${el.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      el.className = 'text-lg sm:text-xl md:text-2xl font-serif font-bold text-white mt-8 sm:mt-12 mb-4 sm:mb-5 pb-3 flex flex-wrap items-center gap-2 sm:gap-3 scroll-mt-24';
      el.style.borderBottom = `1px solid ${catColor}20`;
      const num = document.createElement('span');
      num.className = 'flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-bold text-black';
      num.style.backgroundColor = catColor;
      num.textContent = String(i + 1);
      el.insertBefore(num, el.firstChild);
    });

    div.querySelectorAll('h3').forEach(el => {
      if (!el.textContent?.trim()) { el.remove(); return; }
      el.id = `wiki-sub-${el.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      el.className = 'text-base sm:text-lg font-serif font-bold mt-6 sm:mt-8 mb-2 sm:mb-3 scroll-mt-24';
      el.style.color = catColor;
    });

    div.querySelectorAll('h4, h5, h6').forEach(el => {
      el.className = 'text-sm sm:text-base font-bold mt-4 sm:mt-6 mb-2 text-gray-300';
    });

    div.querySelectorAll('p').forEach(el => {
      el.className = 'mb-4 sm:mb-5 text-gray-300 leading-relaxed text-sm sm:text-base break-words';
    });

    div.querySelectorAll('a').forEach(el => {
      el.className = 'hover:underline underline-offset-2 transition-colors break-words';
      el.style.color = catColor;
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
      const href = el.getAttribute('href') || '';
      if (href.startsWith('/wiki/')) {
        const title = href.replace('/wiki/', '');
        el.setAttribute('href', `/encyclopedie/wiki-search?q=${encodeURIComponent(title)}`);
        el.removeAttribute('target');
      }
    });

    div.querySelectorAll('table').forEach(table => {
      const rows = table.querySelectorAll('tr');
      if (rows.length <= 2) { table.remove(); return; }
      table.className = 'w-full text-xs border-collapse bg-white/[0.02] rounded-xl overflow-hidden border border-white/10 my-6';
      table.style.display = 'block';
      table.style.overflowX = 'auto';
      table.style.whiteSpace = 'nowrap';
      table.style.maxWidth = '100%';
      table.querySelectorAll('th').forEach(th => {
        th.className = 'text-left px-2 py-2 font-bold text-black text-[10px] uppercase tracking-wider';
        (th as HTMLElement).style.backgroundColor = catColor;
        th.style.minWidth = '80px';
      });
      table.querySelectorAll('td').forEach((td, i) => {
        td.className = 'px-2 py-2 text-gray-300 border-b border-white/5 text-xs leading-relaxed';
        (td as HTMLElement).style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent';
        td.style.minWidth = '80px';
        td.style.whiteSpace = 'normal';
        td.style.wordBreak = 'break-word';
      });
      const scrollHint = document.createElement('div');
      scrollHint.className = 'text-[10px] text-gray-600 text-center mt-2 sm:hidden';
      scrollHint.textContent = '← Faites défiler horizontalement →';
      table.parentNode?.insertBefore(scrollHint, table.nextSibling);
    });

    div.querySelectorAll('.infobox, table.infobox').forEach(infobox => {
      infobox.className = 'bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6 w-full sm:max-w-sm sm:float-right sm:ml-6 sm:mb-4 text-xs';
      infobox.querySelectorAll('th').forEach(th => {
        th.className = 'font-bold text-gray-400 text-xs p-2 border-b border-white/10';
      });
      infobox.querySelectorAll('td').forEach(td => {
        td.className = 'text-gray-300 text-xs p-2 border-b border-white/5';
      });
    });

    div.querySelectorAll('img').forEach(el => {
      el.className = 'w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain mx-auto rounded-xl border border-white/10 my-6';
      el.setAttribute('loading', 'lazy');
      const src = el.getAttribute('src') || '';
      if (src.startsWith('//')) el.setAttribute('src', `https:${src}`);
      el.onerror = () => { el.style.display = 'none'; };
    });

    div.querySelectorAll('ul').forEach(el => { el.className = 'space-y-2 mb-4 sm:mb-5 pl-4'; });
    div.querySelectorAll('ol').forEach(el => { el.className = 'space-y-2 mb-4 sm:mb-5 pl-6 list-decimal'; });
    div.querySelectorAll('li').forEach(el => {
      el.className = 'text-gray-300 text-sm sm:text-base leading-relaxed break-words';
      if (el.parentElement?.tagName === 'UL') {
        el.style.listStyle = 'none';
        el.style.position = 'relative';
        el.style.paddingLeft = '1rem';
        const dot = document.createElement('span');
        dot.className = 'absolute left-0 top-2 w-1.5 h-1.5 rounded-full';
        dot.style.backgroundColor = catColor;
        el.insertBefore(dot, el.firstChild);
      }
    });

    div.querySelectorAll('blockquote').forEach(el => {
      el.className = 'relative my-4 sm:my-6 pl-4 sm:pl-6 py-1 border-l-2';
      el.style.borderColor = catColor;
      el.querySelectorAll('p').forEach(p => {
        p.className = 'text-gray-300 italic text-sm sm:text-base leading-relaxed mb-2';
      });
    });

    div.querySelectorAll('code').forEach(el => {
      el.className = 'bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-xs sm:text-[13px] font-mono break-all';
    });
    div.querySelectorAll('pre').forEach(el => {
      el.className = 'bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4 overflow-x-auto mb-4 sm:mb-5 text-gray-300 text-xs sm:text-sm font-mono';
    });

    div.querySelectorAll('*').forEach(el => {
      const element = el as HTMLElement;
      if (element.style.width && element.style.width.includes('px') && parseInt(element.style.width) > 800) {
        element.style.width = '100%';
      }
      element.style.maxWidth = '100%';
      element.style.boxSizing = 'border-box';
    });

  }, [html, catColor]);

  return (
    <div
      ref={contentRef}
      className="wiki-content max-w-none [&>*]:max-w-full [&>*]:box-border [&_*]:break-words [&_*]:box-border overflow-hidden"
      style={{ wordWrap: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}
    />
  );
});
WikiContentRenderer.displayName = 'WikiContentRenderer';

// ============================================================================
// RELATED WIKI CARD
// ============================================================================

const RelatedWikiCard = memo(({ article, lang, catColor }: {
  article: WikiRelated;
  lang: 'fr' | 'en';
  catColor: string;
}) => (
  <Link href={`/encyclopedie/wiki/${article.pageid}?lang=${lang}`} className="group block">
    <div className="relative bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300">
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: catColor, opacity: 0.5 }} />
      <div className="flex gap-3 p-4 pl-5">
        {article.thumbnail?.source && (
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
            <img src={article.thumbnail.source} alt="" loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-sm font-bold line-clamp-1 mb-1 group-hover:text-[#D4AF37] transition-colors">
            {article.title}
          </h4>
          <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">{article.extract}</p>
        </div>
        <ArrowRight size={14} className="flex-shrink-0 text-gray-700 group-hover:text-[#D4AF37] transition-colors self-center" />
      </div>
    </div>
  </Link>
));
RelatedWikiCard.displayName = 'RelatedWikiCard';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WikiArticlePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageid = params?.pageid as string;

  // ✅ Lit la langue depuis l'URL en priorité
  const langFromUrl = searchParams?.get('lang') as 'fr' | 'en' | null;
  const [lang, setLang] = useState<'fr' | 'en'>(langFromUrl ?? 'fr');

  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [related, setRelated] = useState<WikiRelated[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [heroY, setHeroY] = useState('0%');

  const [enrichmentMode, setEnrichmentMode] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const catColor = '#D4AF37';

  // ✅ Sync lang avec l'URL si elle change (navigation Next.js)
  useEffect(() => {
    if (langFromUrl && langFromUrl !== lang) {
      setLang(langFromUrl);
    }
  }, [langFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse parallax
  useEffect(() => {
    let rafId: number;
    const h = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({ x: (e.clientX / window.innerWidth) - 0.5, y: (e.clientY / window.innerHeight) - 0.5 });
      });
    };
    window.addEventListener('mousemove', h, { passive: true });
    return () => { window.removeEventListener('mousemove', h); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  // Hero parallax
  useEffect(() => {
    const h = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, Math.abs(rect.top / rect.height)));
      setHeroY(`${progress * 30}%`);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // ✅ Fetch Wikipedia — déclenché uniquement quand pageid ou lang change via l'URL
  useEffect(() => {
    if (!pageid) return;

    async function fetchWikiArticle() {
      setIsLoading(true);
      setError(false);
      setArticle(null);

      try {
        // 1. Résoudre le titre depuis le pageid
        const titleRes = await fetch(
          `https://${lang}.wikipedia.org/w/api.php?` +
          new URLSearchParams({
            action: 'query',
            pageids: pageid,
            format: 'json',
            origin: '*',
          }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );

        if (!titleRes.ok) throw new Error('Failed to fetch page metadata');

        const titleData = await titleRes.json();
        const pages = titleData.query?.pages || {};
        const page = Object.values(pages)[0] as any;

        if (!page || page.missing !== undefined || page.invalid !== undefined) {
          throw new Error('Article not found');
        }

        const articleTitle = page.title;

        // 2. Fetch summary + contenu en parallèle
        const [summaryRes, contentRes] = await Promise.all([
          fetch(
            `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`,
            { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
          ),
          fetch(
            `https://${lang}.wikipedia.org/w/api.php?` +
            new URLSearchParams({
              action: 'parse',
              page: articleTitle,
              prop: 'text',
              format: 'json',
              origin: '*',
            }),
            { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
          ),
        ]);

        const [summaryData, contentData] = await Promise.all([
          summaryRes.ok ? summaryRes.json() : null,
          contentRes.ok ? contentRes.json() : null,
        ]);

        // 3. Parse HTML
        let htmlContent = '';
        if (contentData?.parse?.text?.['*']) {
          const rawHtml = contentData.parse.text['*'];
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, 'text/html');
          doc.querySelectorAll('.reference, .reflist, .mw-editsection, .noprint, .navbox, .metadata, .hatnote, .ambox, style, script').forEach(el => el.remove());
          doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.startsWith('//')) img.setAttribute('src', `https:${src}`);
          });
          doc.querySelectorAll('a[href^="/wiki/"]').forEach(a => {
            const href = a.getAttribute('href') || '';
            const title = href.replace('/wiki/', '');
            a.setAttribute('href', `/encyclopedie/wiki-search?q=${encodeURIComponent(title)}`);
          });
          htmlContent = doc.body.innerHTML;
        }

        // 4. Articles connexes
        let relatedArticles: WikiRelated[] = [];
        try {
          const relatedRes = await fetch(
            `https://${lang}.wikipedia.org/w/api.php?` +
            new URLSearchParams({
              action: 'query',
              list: 'search',
              srsearch: `morelike:${articleTitle}`,
              srlimit: '3',
              format: 'json',
              origin: '*',
            }),
            { headers: { 'Api-User-Agent': 'Lukeni/1.0' } }
          );
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            relatedArticles = (relatedData.query?.search || [])
              .filter((r: any) => r.pageid !== parseInt(pageid))
              .map((r: any) => ({
                title: r.title,
                extract: r.snippet?.replace(/<[^>]+>/g, '').slice(0, 120) || '',
                pageid: r.pageid,
              }))
              .slice(0, 3);
          }
        } catch { /* silencieux */ }

        setArticle({
          title: summaryData?.title || articleTitle,
          extract: summaryData?.extract || '',
          content: htmlContent,
          sections: [],
          thumbnail: summaryData?.thumbnail,
          originalimage: summaryData?.originalimage,
          lang: summaryData?.lang || lang,
          dir: summaryData?.dir || 'ltr',
          timestamp: summaryData?.timestamp || new Date().toISOString(),
          description: summaryData?.description || '',
          pageid: parseInt(pageid),
        });

        setRelated(relatedArticles);

      } catch (err) {
        console.error('Wiki fetch error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWikiArticle();
  }, [pageid, lang]);

  // ✅ Fonction centralisée pour changer de langue
  // Ne modifie JAMAIS `lang` directement — navigue toujours vers le bon pageid
  const handleLanguageSwitch = useCallback(async (targetLang: 'fr' | 'en') => {
    if (targetLang === lang || !article?.title) return;

    setIsLoading(true);

    try {
      // Cherche le lien interlangue depuis la langue actuelle
      const interlangRes = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?` +
        new URLSearchParams({
          action: 'query',
          titles: article.title,
          prop: 'langlinks',
          lllang: targetLang,
          format: 'json',
          origin: '*',
        }),
        { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
      );

      const interlangData = await interlangRes.json();
      const pages = interlangData.query?.pages || {};
      const page = Object.values(pages)[0] as any;
      const langlinks = page?.langlinks || [];

      if (langlinks.length > 0) {
        const targetTitle = langlinks[0]['*'];

        // Récupère le pageid dans la langue cible
        const titleRes = await fetch(
          `https://${targetLang}.wikipedia.org/w/api.php?` +
          new URLSearchParams({
            action: 'query',
            titles: targetTitle,
            format: 'json',
            origin: '*',
          }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );

        const titleData = await titleRes.json();
        const newPages = titleData.query?.pages || {};
        const newPage = Object.values(newPages)[0] as any;

        if (newPage?.pageid && newPage.pageid > 0) {
          // ✅ Navigue vers le bon pageid dans la langue cible
          localStorage.setItem('lukeni_lang', targetLang);
          router.push(`/encyclopedie/wiki/${newPage.pageid}?lang=${targetLang}`);
          return;
        }
      }

      // Pas de lien interlangue → message d'erreur sans changer lang
      setIsLoading(false);
      alert(
        targetLang === 'en'
          ? 'This article is not available in English on Wikipedia.'
          : "Cet article n'est pas disponible en français sur Wikipedia."
      );

    } catch (err) {
      console.error('Language switch error:', err);
      setIsLoading(false);
    }
  }, [lang, article?.title, router]);

  // TOC depuis le HTML
  const tocItems = useMemo((): TocItem[] => {
    if (!article?.content) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(article.content, 'text/html');
    const items: TocItem[] = [];
    let h2Count = 0;

    doc.querySelectorAll('h2, h3').forEach(el => {
      const level = parseInt(el.tagName[1]);
      if (level === 2) h2Count++;
      items.push({
        id: `wiki-section-${h2Count - 1}-${el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ''}`,
        text: el.textContent || '',
        level,
      });
    });

    return items.slice(0, 20);
  }, [article?.content]);

  const heroImage = article?.originalimage?.source || article?.thumbnail?.source;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center gap-8">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <CaurisIcon className="w-20 h-20 text-[#D4AF37]" />
        </motion.div>
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#D4AF37] text-xs tracking-[0.4em] font-light uppercase">
          {lang === 'fr' ? 'Consultation des archives Wikipedia...' : 'Consulting Wikipedia archives...'}
        </motion.p>
      </div>
    );
  }

  // ── Error ──
  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#020111] text-white flex flex-col items-center justify-center gap-6 p-4">
        <CaurisIcon className="w-16 h-16 text-gray-700" />
        <div className="text-center max-w-md">
          <p className="text-white font-serif text-xl mb-2">
            {lang === 'fr' ? 'Article introuvable.' : 'Article not found.'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {lang === 'fr'
              ? `L'article avec l'ID ${pageid} n'existe pas en ${lang === 'fr' ? 'français' : 'anglais'}.`
              : `Article with ID ${pageid} does not exist in ${lang === 'en' ? 'English' : 'French'}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/encyclopedie"
              className="flex items-center gap-2 text-[#D4AF37] text-sm font-bold hover:underline">
              <ArrowLeft size={14} />
              {lang === 'fr' ? 'Retour aux Archives' : 'Back to Archives'}
            </Link>
            <button
              onClick={() => {
                const newLang = lang === 'fr' ? 'en' : 'fr';
                router.push(`/encyclopedie/wiki/${pageid}?lang=${newLang}`);
              }}
              className="text-gray-400 text-sm hover:text-white transition-colors">
              {lang === 'fr' ? 'Essayer en anglais' : 'Essayer en français'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (

    <NotesplitContainer
      itemId={pageid}
      itemType="wiki"
      userId={undefined}   // ← ajouter userId si vous avez la session
      catColor={catColor}
      lang={lang}          // ← transmet la langue active
    >
      <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#03032B] to-black text-white overflow-x-hidden">

        <ReadingProgress color={catColor} />
        <StarField mousePos={mousePos} />

        {/* ── Header ── */}
        <header className="sticky top-[2px] z-50 bg-[#020111]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link
              href="/encyclopedie"
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
            >
              <motion.div whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
                <ArrowLeft size={16} />
              </motion.div>
              <span className="hidden sm:inline text-sm font-medium">
                {lang === 'fr' ? 'Archives des Mémoires' : 'Archives of Memories'}
              </span>
            </Link>

            <Link href="/encyclopedie">
              <CaurisIcon className="w-6 h-6 text-[#D4AF37]" />
            </Link>

            <div className="w-20" />
          </div>
        </header>

        {/* ── Hero image ── */}
        {heroImage && (
          <div ref={heroRef} className="relative h-[45vh] md:h-[60vh] overflow-hidden">
            <img src={heroImage} alt={article.title} loading="eager"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: `translateY(${heroY}) scale(1.1)` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020111] via-[#020111]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020111]/30 via-transparent to-[#020111]/30" />

            {/* Badge top left */}
            <div className="absolute top-6 left-6">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm"
                style={{ backgroundColor: `${catColor}25`, color: catColor, border: `1px solid ${catColor}40` }}>
                <Globe size={10} />
                Wikipedia × Lukeni
              </span>
            </div>

            {/* ✅ Boutons verticaux top right - VERSION UNIQUE */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="absolute top-6 right-6 z-20 flex flex-col gap-2"
            >
              <ShareButton title={article.title} lang={lang} />

              <a
                href={`https://${lang}.wikipedia.org/?curid=${article.pageid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold"
              >
                <Globe size={12} />
                Wiki
              </a>

              <button
                onClick={() => {
                  const currentUrl = window.location.href;
                  window.open(
                    `https://translate.google.com/translate?sl=auto&tl=fr&u=${encodeURIComponent(currentUrl)}`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold"
                title="Traduire en français"
              >
                🌐 Traduire
              </button>

              {/* ✅ BOUTON DICT */}
              

              <FavoriteButton
                itemType="wiki"
                itemId={article.pageid.toString()}
                size={16}
              />
            </motion.div>

            {/* Titre en bas */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1.5 bg-[#D4AF37] px-2.5 py-1 rounded-full">
                    <CaurisIcon className="w-3 h-3 text-black" />
                    <span className="text-[9px] font-bold text-black tracking-[0.2em] uppercase">Lukeni</span>
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
                  {article.title}
                </h1>
                {article.description && (
                  <p className="mt-2 text-gray-400 text-sm">{article.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">

            {/* Main */}
            <div>
              {!heroImage && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${catColor}20`, color: catColor, border: `1px solid ${catColor}30` }}>
                      <Globe size={10} /> Wikipedia × Lukeni
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight">
                    {article.title}
                  </h1>
                  {article.description && (
                    <p className="mt-2 text-gray-400 text-sm">{article.description}</p>
                  )}
                </motion.div>
              )}

              {/* Meta */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-white/[0.06]">
                {article.timestamp && (
                  <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Calendar size={11} />
                    {lang === 'fr' ? 'Mis à jour' : 'Updated'} {new Date(article.timestamp).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long' }
                    )}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Globe size={11} />
                  {lang === 'fr' ? 'Source Wikipedia' : 'Wikipedia source'}
                </span>
                <a href={`https://${lang}.wikipedia.org/?curid=${article.pageid}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 text-xs transition-colors ml-auto">
                  <ExternalLink size={9} />
                  {lang === 'fr' ? "Voir l'original" : 'View original'}
                </a>
              </motion.div>

              {/* Extrait */}
              {article.extract && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="relative mb-8 p-5 rounded-2xl"
                  style={{ background: `linear-gradient(135deg, ${catColor}08, transparent)`, border: `1px solid ${catColor}15` }}>
                  <div className="absolute top-0 left-5 right-5 h-px rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${catColor}40, transparent)` }} />
                  <p className="text-gray-300 text-base leading-relaxed italic font-light">
                    {article.extract.slice(0, 400)}{article.extract.length > 400 ? '...' : ''}
                  </p>
                </motion.div>
              )}

              {/* TOC mobile */}
              <div className="lg:hidden mb-6">
                {tocItems.length >= 2 && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={12} style={{ color: catColor }} />
                      <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                        {lang === 'fr' ? 'Sommaire' : 'Contents'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {tocItems.slice(0, 8).map(item => (
                        <a key={item.id} href={`#${item.id}`}
                          onClick={e => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                          className={`block text-xs py-1 text-gray-600 hover:text-gray-300 transition-colors ${item.level > 2 ? 'pl-3' : ''}`}>
                          {item.text}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Article content */}
              <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
                className="relative">
                <div className="absolute -left-5 top-0 bottom-0 w-px hidden md:block"
                  style={{ background: `linear-gradient(to bottom, ${catColor}40, ${catColor}10, transparent)` }} />


                <WikiContentRenderer html={article.content} catColor={catColor} />
              </motion.article>

              {/* Disclaimer */}
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="mt-10 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <Globe size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-sm font-bold mb-1">
                      {lang === 'fr' ? 'Source Wikipedia' : 'Wikipedia Source'}
                    </p>
                    <p className="text-gray-600 text-xs leading-relaxed mb-3">
                      {lang === 'fr'
                        ? 'Cet article est issu de Wikipedia et est disponible sous licence Creative Commons. Le contenu est présenté dans le design Lukeni pour une meilleure expérience de lecture.'
                        : "This article is sourced from Wikipedia and is available under Creative Commons license. Content is presented in Lukeni's design for an enhanced reading experience."}
                    </p>
                    <a href={`https://${lang}.wikipedia.org/?curid=${article.pageid}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:opacity-80"
                      style={{ color: catColor }}>
                      <ExternalLink size={11} />
                      {lang === 'fr' ? "Lire l'article original sur Wikipedia" : 'Read the original article on Wikipedia'}
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Articles connexes */}
              {related.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="mt-12 pt-8 border-t border-white/[0.05]">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-600 flex items-center gap-2">
                      <BookOpen size={11} />
                      {lang === 'fr' ? 'Articles connexes Wikipedia' : 'Related Wikipedia Articles'}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                  </div>
                  <div className="space-y-3">
                    {related.map(rel => (
                      <RelatedWikiCard key={rel.pageid} article={rel} lang={lang} catColor={catColor} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Navigation bas */}
              <div className="mt-12 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                <Link href="/encyclopedie"
                  className="flex items-center gap-2 text-gray-600 hover:text-[#D4AF37] transition-colors text-sm">
                  <motion.div whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
                    <ArrowLeft size={14} />
                  </motion.div>
                  {lang === 'fr' ? 'Retour aux Archives' : 'Back to Archives'}
                </Link>
                <ShareButton title={article.title} lang={lang} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <TableOfContents items={tocItems} lang={lang} catColor={catColor} />

              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                className="mt-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={14} className="text-[#D4AF37]" />
                  <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500">
                    {lang === 'fr' ? 'À propos' : 'About'}
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Source' : 'Source'}</span>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[#D4AF37] bg-[#D4AF37]/20">Wikipedia</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Langue' : 'Language'}</span>
                    <span className="text-gray-400 uppercase">{lang}</span>
                  </div>
                  {article.timestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{lang === 'fr' ? 'Mis à jour' : 'Updated'}</span>
                      <span className="text-gray-400">
                        {new Date(article.timestamp).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' }
                        )}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-white/[0.05]">
                    <a href={`https://${lang}.wikipedia.org/?curid=${article.pageid}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-white transition-colors">
                      <ExternalLink size={11} />
                      {lang === 'fr' ? 'Wikipedia original' : 'Original Wikipedia'}
                      <ExternalLink size={9} className="ml-auto" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* ✅ Toggle langue sidebar — utilise handleLanguageSwitch */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-600 mb-3">
                  {lang === 'fr' ? 'Langue' : 'Language'}
                </p>
                <div className="flex gap-2">
                  {(['fr', 'en'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => handleLanguageSwitch(l)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${lang === l ? 'text-black' : 'bg-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                      style={lang === l ? { backgroundColor: catColor } : {}}
                    >
                      {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <ScrollToTop color={catColor} />
      </div>

    </NotesplitContainer>
  );
}