'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Share2, Sparkles, ExternalLink,
  ChevronUp, Calendar, User, Zap, FileText
} from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import { ArxivResult } from '@/lib/types/external-apis';

// ============================================================================
// TYPES
// ============================================================================

interface ArxivDetail extends ArxivResult {}

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
      {lang === 'fr' ? 'Consultation du preprint...' : 'Loading preprint...'}
    </motion.p>
  </motion.div>
));
LoadingScreen.displayName = 'LoadingScreen';

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
      style={{
        backgroundColor: `${color}20`,
        boxShadow: `0 0 20px ${color}30`,
      }}
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

  // ✅ Nettoie la mise en forme
  function stripFormatting(text: string): string {
    return text
      .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
      .replace(/\*([\s\S]+?)\*/g, '$1')
      .replace(/~~([\s\S]+?)~~/g, '$1')
      .replace(/==([\s\S]+?)==/g, '$1')
      .replace(/\{#[^}]+\}([\s\S]+?)\{\/\}/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const cleanTitle = stripFormatting(title);
    
    if (navigator.share) { 
      await navigator.share({ title: cleanTitle, url }); 
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [title]);

  return (
    <motion.button 
      whileHover={{ scale: 1.05 }} 
      whileTap={{ scale: 0.95 }} 
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold">
      {copied
        ? <><Sparkles size={13} className="text-[#D4AF37]" />{lang === 'fr' ? 'Copié !' : 'Copied!'}</>
        : <><Share2 size={13} />{lang === 'fr' ? 'Partager' : 'Share'}</>}
    </motion.button>
  );
});
ShareButton.displayName = 'ShareButton';

// ============================================================================
// CATEGORY BADGE
// ============================================================================

const CATEGORY_LABELS: Record<string, { fr: string; en: string; color: string }> = {
  'astro-ph': { fr: 'Astrophysique', en: 'Astrophysics', color: '#9370DB' },
  'cond-mat': { fr: 'Physique de la matière condensée', en: 'Condensed Matter', color: '#20B2AA' },
  'gr-qc': { fr: 'Relativité générale', en: 'General Relativity', color: '#FF6B9D' },
  'hep-ex': { fr: 'Physique des hautes énergies - Exp.', en: 'HEP - Experimental', color: '#FFD700' },
  'hep-lat': { fr: 'Physique des hautes énergies - Lattice', en: 'HEP - Lattice', color: '#FFD700' },
  'hep-ph': { fr: 'Physique des hautes énergies - Théo.', en: 'HEP - Theory', color: '#FFD700' },
  'hep-th': { fr: 'Physique théorique', en: 'High Energy Theory', color: '#FFD700' },
  'math-ph': { fr: 'Physique mathématique', en: 'Mathematical Physics', color: '#4ADE80' },
  'nlin': { fr: 'Systèmes non-linéaires', en: 'Nonlinear Sciences', color: '#4ADE80' },
  'nucl-ex': { fr: 'Physique nucléaire - Exp.', en: 'Nuclear Physics - Exp.', color: '#FF8C00' },
  'nucl-th': { fr: 'Physique nucléaire - Théo.', en: 'Nuclear Physics - Theory', color: '#FF8C00' },
  'physics': { fr: 'Physique', en: 'Physics', color: '#87CEEB' },
  'quant-ph': { fr: 'Mécanique quantique', en: 'Quantum Physics', color: '#00CED1' },
  'q-bio': { fr: 'Biologie quantitative', en: 'Quantitative Biology', color: '#90EE90' },
  'q-fin': { fr: 'Finance quantitative', en: 'Quantitative Finance', color: '#FFB6C1' },
  'stat': { fr: 'Statistiques', en: 'Statistics', color: '#DDA0DD' },
  'cs': { fr: 'Informatique', en: 'Computer Science', color: '#60A5FA' },
  'econ': { fr: 'Économie', en: 'Economics', color: '#FCA5A5' },
  'eess': { fr: 'Ingénierie', en: 'Electrical Engineering', color: '#A78BFA' },
  'math': { fr: 'Mathématiques', en: 'Mathematics', color: '#34D399' },
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ArxivDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const arxivId = params?.arxivId as string;

  const langFromUrl = searchParams?.get('lang') as 'fr' | 'en' | null;
  const [lang, setLang] = useState<'fr' | 'en'>(langFromUrl ?? 'fr');

  const [paper, setPaper] = useState<ArxivDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const catColor = '#D4AF37';

  useEffect(() => {
    if (langFromUrl && langFromUrl !== lang) {
      setLang(langFromUrl);
    }
  }, [langFromUrl]);

  // Mouse parallax
  useEffect(() => {
    let rafId: number;
    const h = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX / window.innerWidth) - 0.5,
          y: (e.clientY / window.innerHeight) - 0.5,
        });
      });
    };
    window.addEventListener('mousemove', h, { passive: true });
    return () => {
      window.removeEventListener('mousemove', h);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Fetch from arXiv API
  useEffect(() => {
    if (!arxivId) return;

    async function fetchPaper() {
      setIsLoading(true);
      setError(false);

      try {
        // ✅ BON
const res = await fetch(
  `/api/proxy/arxiv?query=${encodeURIComponent(arxivId)}&maxResults=1`
);

        if (!res.ok) throw new Error('Not found');

        const xml = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const entry = doc.querySelector('entry');

        if (!entry) throw new Error('Invalid paper');

        const idNode = entry.querySelector('id')?.textContent || '';
        const arxivIdFromResponse = idNode.split('/abs/')[1] || arxivId;

        setPaper({
          id: arxivIdFromResponse,
          arxivId: arxivIdFromResponse,
          title: entry.querySelector('title')?.textContent?.trim() || '',
          summary: entry.querySelector('summary')?.textContent?.trim() || '',
          authors: Array.from(entry.querySelectorAll('author')).map((a) => ({
            name: a.querySelector('name')?.textContent || '',
          })),
          published: entry.querySelector('published')?.textContent || '',
          updated: entry.querySelector('updated')?.textContent,
          pdfUrl: `https://arxiv.org/pdf/${arxivIdFromResponse}.pdf`,
          category:
            entry.querySelector('arxiv\\:primary_category, primary_category')?.getAttribute('term') || '',
          categories: Array.from(
            entry.querySelectorAll(
              'arxiv\\:primary_category, primary_category, category'
            )
          )
            .map((c) => c.getAttribute('term'))
            .filter(Boolean) as string[],
          doi:
            entry.querySelector('arxiv\\:doi, doi')?.textContent || '',
        } as ArxivDetail);
      } catch (err) {
        console.error('arXiv fetch error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPaper();
  }, [arxivId]);

  if (isLoading) {
    return (
      <AnimatePresence>
        <LoadingScreen lang={lang} />
      </AnimatePresence>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-[#020111] text-white flex flex-col items-center justify-center gap-6 p-4">
        <CaurisIcon className="w-16 h-16 text-gray-700" />
        <div className="text-center max-w-md">
          <p className="text-white font-serif text-xl mb-2">
            {lang === 'fr' ? 'Preprint introuvable.' : 'Preprint not found.'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {lang === 'fr'
              ? `Le preprint avec l'ID ${arxivId} n'existe pas.`
              : `Preprint with ID ${arxivId} does not exist.`}
          </p>
          <Link
            href="/encyclopedie"
            className="inline-flex items-center gap-2 text-[#D4AF37] text-sm font-bold hover:underline"
          >
            <ArrowLeft size={14} />
            {lang === 'fr' ? 'Retour aux Archives' : 'Back to Archives'}
          </Link>
        </div>
      </div>
    );
  }

  const primaryCategory = paper.category
    ? CATEGORY_LABELS[paper.category] || { fr: paper.category, en: paper.category, color: '#888' }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#03032B] to-black text-white overflow-x-hidden">
      <StarField mousePos={mousePos} />

      {/* Header */}
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

      {/* Hero */}
      {/* Hero */}
<div className="relative h-[45vh] md:h-[60vh] overflow-hidden bg-gradient-to-b from-[#D4AF37]/10 to-transparent">
  <div className="absolute inset-0 bg-gradient-to-r from-[#020111]/50 via-transparent to-[#020111]/50" />

  {/* Badge top left */}
  <div className="absolute top-6 left-6">
    <span
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm"
      style={{
        backgroundColor: `${catColor}25`,
        color: catColor,
        border: `1px solid ${catColor}40`,
      }}
    >
      <Zap size={12} /> arXiv {lang === 'fr' ? 'Preprint' : 'Preprint'}
    </span>
  </div>

  {/* ✅ Boutons verticaux top right */}
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.4 }}
    className="absolute top-6 right-6 z-20 flex flex-col gap-2"
  >
    <ShareButton title={paper.title} lang={lang} />

    <a
      href={paper.pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold"
    >
      <FileText size={12} />
      PDF
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

    <FavoriteButton
      itemType="arxiv"
      itemId={paper.arxivId}
      size={16}
    />
  </motion.div>

  {/* Title bottom */}
  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 bg-[#D4AF37] px-2.5 py-1 rounded-full">
          <CaurisIcon className="w-3 h-3 text-black" />
          <span className="text-[9px] font-bold text-black tracking-[0.2em] uppercase">
            Lukeni
          </span>
        </span>
      </div>
      <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
        {paper.title}
      </h1>
    </div>
  </div>
</div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
          {/* Main */}
          <div>
            {/* Authors & Metadata */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 pb-6 border-b border-white/[0.06]"
            >
              {paper.authors && paper.authors.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-600 tracking-[0.2em] uppercase mb-2">
                    {lang === 'fr' ? 'Auteurs' : 'Authors'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {paper.authors.map((author, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300"
                      >
                        {author.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  {new Date(paper.published).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                </span>

                {primaryCategory && (
                  <span
                    className="px-2 py-0.5 rounded-full font-bold text-xs"
                    style={{
                      backgroundColor: `${primaryCategory.color}20`,
                      color: primaryCategory.color,
                    }}
                  >
                    {lang === 'fr'
                      ? primaryCategory.fr
                      : primaryCategory.en}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Summary */}
            {paper.summary && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative mb-8 p-6 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${catColor}08, transparent)`,
                  border: `1px solid ${catColor}15`,
                }}
              >
                <div
                  className="absolute top-0 left-6 right-6 h-px rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${catColor}40, transparent)`,
                  }}
                />
                <p className="text-gray-300 leading-relaxed text-base whitespace-pre-wrap">
                  {paper.summary}
                </p>
              </motion.div>
            )}

            {/* PDF Button */}
            <motion.a
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-white transition-colors mb-8"
            >
              <FileText size={16} />
              {lang === 'fr' ? 'Lire le PDF' : 'Read PDF'}
            </motion.a>

            {/* arXiv Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3"
            >
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <p className="text-orange-400 text-sm font-bold">
                {lang === 'fr'
                  ? '📄 Preprint - Non validé par relecture'
                  : '📄 Preprint - Not peer-reviewed'}
              </p>
            </motion.div>

            {/* Source info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]"
            >
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-sm font-bold mb-1">
                    {lang === 'fr' ? 'Source arXiv' : 'arXiv Source'}
                  </p>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    {lang === 'fr'
                      ? 'Cet article est un preprint disponible sur arXiv. Les preprints ne sont pas passés par une relecture formelle. Le contenu est présenté dans le design Lukeni pour une meilleure expérience.'
                      : 'This is a preprint available on arXiv. Preprints have not undergone formal peer review. Content is presented in Lukeni\'s design for an enhanced experience.'}
                  </p>
                  <a
                    href={`https://arxiv.org/abs/${paper.arxivId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:opacity-80"
                    style={{ color: catColor }}
                  >
                    <ExternalLink size={11} />
                    {lang === 'fr' ? 'Voir sur arXiv' : 'View on arXiv'}
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Navigation bas */}
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
              <ShareButton title={paper.title} lang={lang} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky top-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <CaurisIcon className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500">
                  {lang === 'fr' ? 'À propos' : 'About'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{lang === 'fr' ? 'ID arXiv' : 'arXiv ID'}</span>
                  <span className="text-gray-400 font-mono text-[10px]">
                    {paper.arxivId}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{lang === 'fr' ? 'Soumis' : 'Submitted'}</span>
                  <span className="text-gray-400">
                    {new Date(paper.published).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US',
                      { month: 'short', year: 'numeric' }
                    )}
                  </span>
                </div>

                {paper.updated && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Mis à jour' : 'Updated'}</span>
                    <span className="text-gray-400">
                      {new Date(paper.updated).toLocaleDateString(
                        lang === 'fr' ? 'fr-FR' : 'en-US',
                        { month: 'short', year: 'numeric' }
                      )}
                    </span>
                  </div>
                )}

                {primaryCategory && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Catégorie' : 'Category'}</span>
                    <span
                      className="px-2 py-0.5 rounded-full font-bold text-[9px]"
                      style={{
                        backgroundColor: `${primaryCategory.color}30`,
                        color: primaryCategory.color,
                      }}
                    >
                      {lang === 'fr'
                        ? primaryCategory.fr
                        : primaryCategory.en}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-white/[0.05]">
                  <a
                    href={`https://arxiv.org/abs/${paper.arxivId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-white transition-colors"
                  >
                    <ExternalLink size={11} />
                    arXiv
                    <ExternalLink size={9} className="ml-auto" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <ScrollToTop color={catColor} />
    </div>
  );
}