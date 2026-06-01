'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Search, Globe } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface WikiResult {
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
// WIKI SEARCH CONTENT — useSearchParams() isolé ici
// ============================================================================

function WikiSearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') || '';

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [results, setResults] = useState<WikiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cacheRef = useRef<Map<string, WikiResult[]>>(new Map());

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

  // Fetch Wikipedia results
  useEffect(() => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    const cacheKey = `${lang}:${q}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }

    async function searchWiki() {
      setIsLoading(true);
      setError(false);

      try {
        const res = await fetch(
          `https://${lang}.wikipedia.org/w/api.php?` +
          new URLSearchParams({
            action: 'opensearch',
            search: q,
            limit: '20',
            namespace: '0',
            format: 'json',
            origin: '*',
          }),
          { headers: { 'Api-User-Agent': 'Lukeni/1.0 (contact@lukeni.app)' } }
        );

        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];

        if (!titles.length) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        // Fetch details
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

        if (!detailsRes.ok) throw new Error('Details fetch failed');

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

        cacheRef.current.set(cacheKey, mapped);
        setResults(mapped);
      } catch (err) {
        console.error('Wiki search error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    const t = setTimeout(searchWiki, 300);
    return () => clearTimeout(t);
  }, [q, lang]);

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

          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="px-2.5 py-1.5 text-[10px] font-bold bg-white/[0.04] border border-white/10 rounded-lg text-gray-400 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-colors tracking-wider"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
            {lang === 'fr' ? 'Résultats Wikipedia' : 'Wikipedia Results'}
          </h1>
          <p className="text-gray-500 text-lg">
            {lang === 'fr' ? 'Recherche : ' : 'Search: '}
            <span className="text-[#D4AF37]">{q}</span>
          </p>
        </motion.div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={40} className="text-[#D4AF37]" />
            </motion.div>
          </div>
        )}

        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center"
          >
            <p className="text-red-400">
              {lang === 'fr'
                ? 'Erreur lors de la recherche. Veuillez réessayer.'
                : 'Error during search. Please try again.'}
            </p>
          </motion.div>
        )}

        {!isLoading && !error && results.length === 0 && q && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl text-center"
          >
            <Globe size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400">
              {lang === 'fr'
                ? 'Aucun résultat trouvé pour votre recherche.'
                : 'No results found for your search.'}
            </p>
          </motion.div>
        )}

        {!isLoading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {results.map((result, idx) => (
              <motion.div
                key={result.pageid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/encyclopedie/wiki/${result.pageid}?lang=${lang}`} className="group block h-full">
                  <div className="relative h-full bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-400">
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                      <Globe size={10} className="text-gray-400" />
                      <span className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">Wikipedia</span>
                    </div>

                    <div className="relative h-44 overflow-hidden bg-[#0a0a15]">
                      {result.thumbnail?.source ? (
                        <img
                          src={result.thumbnail.source}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Globe size={36} className="text-gray-800" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/50 to-transparent" />
                    </div>

                    <div className="p-5">
                      <h3 className="text-white/90 font-serif text-base mb-2 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                        {result.title}
                      </h3>
                      <p className="text-gray-600 text-xs line-clamp-3 mb-4 leading-relaxed">
                        {result.extract}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-gray-500 text-xs group-hover:text-gray-300 transition-colors">
                        {lang === 'fr' ? 'Lire sur Wikipedia' : 'Read on Wikipedia'}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PAGE EXPORT — Suspense boundary obligatoire pour useSearchParams()
// ============================================================================

export default function WikiSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#03032B] to-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-[#D4AF37] animate-spin" />
            <p className="text-gray-500 text-sm">Chargement...</p>
          </div>
        </div>
      }
    >
      <WikiSearchContent />
    </Suspense>
  );
}