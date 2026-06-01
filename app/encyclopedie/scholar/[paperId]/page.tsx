'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Share2, Sparkles, ExternalLink,
  ChevronUp, Calendar, User, BookOpen, Quote,Zap, FileText
} from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import { ScholarResult } from '@/lib/types/external-apis';
import { NotesplitContainer } from '@/components/NotesplitContainer';
import { supabase } from '@/lib/supabase';


// ============================================================================
// TYPES
// ============================================================================

interface ScholarDetail extends ScholarResult { }

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
      {lang === 'fr' ? 'Consultation de l\'article...' : 'Loading article...'}
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

// Remplace ShareButton
const ShareButton = memo(({ title, lang }: { title: string; lang: 'fr' | 'en' }) => {
  const [copied, setCopied] = useState(false);

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
// MAIN PAGE
// ============================================================================

export default function ScholarDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paperId = params?.paperId as string;

  const langFromUrl = searchParams?.get('lang') as 'fr' | 'en' | null;
  const [lang, setLang] = useState<'fr' | 'en'>(langFromUrl ?? 'fr');

  const [paper, setPaper] = useState<ScholarDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });


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

  // Fetch from Semantic Scholar
  useEffect(() => {
    if (!paperId) return;

    async function fetchPaper() {
      setIsLoading(true);
      setError(false);

      try {
        // ✅ APRÈS
        const res = await fetch(
          `/api/proxy/semantic-scholar/${paperId}`
        );

        if (!res.ok) throw new Error('Not found');

        const data = await res.json();

        if (!data.paperId) throw new Error('Invalid paper');

        setPaper(data as ScholarDetail);
      } catch (err) {
        console.error('Scholar fetch error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPaper();
  }, [paperId]);

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
            {lang === 'fr' ? 'Article introuvable.' : 'Article not found.'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {lang === 'fr'
              ? `L'article avec l'ID ${paperId} n'existe pas.`
              : `Article with ID ${paperId} does not exist.`}
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

  return (
    
     <NotesplitContainer
      itemId={paperId}
      itemType="scholar"
      userId={user?.id}
      catColor="#D4AF37"
      lang={lang}  
    >
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
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm"
      style={{
        backgroundColor: `${catColor}25`,
        color: catColor,
        border: `1px solid ${catColor}40`,
      }}>
      <Zap size={12} /> Semantic Scholar
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

    {paper.openAccessPdf?.url && (
      <a
        href={paper.openAccessPdf.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-bold"
      >
        <FileText size={12} />
        PDF
      </a>
    )}

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
      itemType="scholar"
      itemId={paper.paperId}
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
                {paper.year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    {paper.year}
                  </span>
                )}
                {paper.venue && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={11} />
                    {paper.venue}
                  </span>
                )}
                {paper.citationCount !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Quote size={11} />
                    {paper.citationCount} {lang === 'fr' ? 'citations' : 'citations'}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Abstract */}
            {paper.abstract && (
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
                <p className="text-gray-300 leading-relaxed text-base">
                  {paper.abstract.slice(0, 500)}{paper.abstract.length > 500 ? '...' : ''}
                </p>
              </motion.div>
            )}

            {/* PDF Link */}
            {paper.openAccessPdf?.url && (
              <motion.a
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                href={paper.openAccessPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-white transition-colors mb-8"
              >
                <ExternalLink size={16} />
                {lang === 'fr' ? 'Lire le PDF' : 'Read PDF'}
              </motion.a>
            )}

            {/* Source info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]"
            >
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-sm font-bold mb-1">
                    {lang === 'fr' ? 'Source Semantic Scholar' : 'Semantic Scholar Source'}
                  </p>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    {lang === 'fr'
                      ? 'Cet article est indexé par Semantic Scholar, une plateforme d\'indexation académique en libre accès. Le contenu est présenté dans le design Lukeni pour une meilleure expérience.'
                      : 'This paper is indexed by Semantic Scholar, an open access academic indexing platform. Content is presented in Lukeni\'s design for an enhanced experience.'}
                  </p>
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:opacity-80"
                      style={{ color: catColor }}
                    >
                      <ExternalLink size={11} />
                      {lang === 'fr' ? 'Voir sur Semantic Scholar' : 'View on Semantic Scholar'}
                    </a>
                  )}
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
                {paper.year && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Année' : 'Year'}</span>
                    <span className="text-gray-400">{paper.year}</span>
                  </div>
                )}

                {paper.venue && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Venue' : 'Venue'}</span>
                    <span className="text-gray-400 truncate">{paper.venue}</span>
                  </div>
                )}

                {paper.citationCount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{lang === 'fr' ? 'Citations' : 'Citations'}</span>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[#D4AF37] bg-[#D4AF37]/20">
                      {paper.citationCount}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-white/[0.05]">
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-white transition-colors"
                    >
                      <ExternalLink size={11} />
                      Semantic Scholar
                      <ExternalLink size={9} className="ml-auto" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <ScrollToTop color={catColor} />
    </NotesplitContainer>  
  );
}