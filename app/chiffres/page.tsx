"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Search, Info, Database, Loader2, X, Share2, Check, Infinity as InfinityIcon,
  Eye, EyeOff,
} from 'lucide-react';
import { AwaleBoard } from '@/components/public/AwaleBoard';
import { ChartCard } from '@/components/public/ChartCard';
import { CompareTray } from '@/components/public/CompareTray';
import { CompareModal } from '@/components/public/CompareModal';
import { MacroChart, MacroSeries, MacroAnnotation } from '@/components/admin/macro/types';

import { useLanguage } from '@/lib/contexts/LanguageContext';
interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  color: string;
  icon: string;
}

// ⬇️ Isolé dans son propre composant : son state local (placeholderIndex)
// ne provoque plus le re-render de toute la page / grille de graphiques.
function AnimatedPlaceholder({ lang }: { lang: 'fr' | 'en' }) {
  const placeholders = useMemo(() => lang === 'fr'
    ? ["Chercher 'Investissements'...", "Taper 'Diaspora'...", "Explorer 'Tech Afrique'...", "Analyser 'PIB'...", "Chercher une source..."]
    : ["Search 'Investments'...", "Type 'Diaspora'...", "Explore 'Africa Tech'...", "Analyze 'GDP'...", "Search for a source..."], [lang]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={placeholderIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute inset-0 flex items-center text-white/30 text-lg pointer-events-none"
      >
        {placeholders[placeholderIndex]}
      </motion.div>
    </AnimatePresence>
  );
}

export default function MacroLibraryPage() {
 const { lang } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [charts, setCharts] = useState<MacroChart[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // MODE COMPARAISON
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<MacroChart[]>([]);
  const [compareResult, setCompareResult] = useState<{ chart1: MacroChart; chart2: MacroChart } | null>(null);

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  const fetchCharts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: catsRes } = await supabase
        .from('categories')
        .select('*')
        .eq('show_macro', true)
        .eq('is_active', true);
      if (catsRes) setCategories(catsRes);

      const { data: chartsRes } = await supabase
        .from('macro_charts')
        .select(`
          id, category_id, slug, title_fr, title_en, description_fr, description_en,
          chart_type, unit_fr, unit_en, secondary_unit_fr, secondary_unit_en,
          source_fr, source_en, source_url, methodology_fr, methodology_en,
          population_scope_fr, population_scope_en, alt_text_fr, alt_text_en,
          data_status, reference_date, has_break_in_series, break_note_fr, break_note_en,
          margin_error, workflow_status, validated_at, published_at,
          category:categories(id, name_fr, name_en, color, icon)
        `)
        .eq('workflow_status', 'published')
        .order('published_at', { ascending: false });

      if (!chartsRes || chartsRes.length === 0) {
        setCharts([]);
        setIsLoading(false);
        return;
      }

      const chartIds = chartsRes.map((c: any) => c.id);

      const [{ data: dataRes }, { data: seriesRes }, { data: annotRes }] = await Promise.all([
        supabase.from('macro_chart_data').select('*').in('chart_id', chartIds).order('sort_order', { ascending: true }),
        supabase.from('macro_chart_series').select('*').in('chart_id', chartIds).order('sort_order', { ascending: true }),
        supabase.from('macro_chart_annotations').select('*').in('chart_id', chartIds),
      ]);

      const formattedCharts: MacroChart[] = chartsRes.map((chart: any) => ({
        ...chart,
        dataPoints: (dataRes || []).filter(dp => dp.chart_id === chart.id),
        macro_chart_series: (seriesRes || []).filter(s => s.chart_id === chart.id),
        macro_chart_annotations: (annotRes || []).filter(a => a.chart_id === chart.id),
      }));

      setCharts(formattedCharts);
    } catch (err) {
      console.error('Erreur fetch:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  // ============================================================================
  // HANDLERS (mémoïsés pour ne pas casser React.memo sur ChartCard)
  // ============================================================================

  const handleShare = useCallback(async (chart: MacroChart) => {
    const title = lang === 'fr' ? chart.title_fr : chart.title_en;
    const text = `${title}\n${lang === 'fr' ? 'Découvert sur LUKENI' : 'Discovered on LUKENI'}`;
    const url = `${window.location.origin}/chiffres/${chart.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedId(chart.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, [lang]);

  const handleOpenChart = useCallback((chart: MacroChart) => {
    router.push(`/chiffres/${chart.slug}`);
  }, [router]);

  const handleToggleCompare = useCallback((id: string) => {
    setSelectedForCompare(prev => {
      const isSelected = prev.some(c => c.id === id);
      if (isSelected) return prev.filter(c => c.id !== id);
      if (prev.length >= 2) return prev;
      const chart = charts.find(c => c.id === id);
      return chart ? [...prev, chart] : prev;
    });
  }, [charts]);

  const handleStartComparison = useCallback(() => {
    setSelectedForCompare(prev => {
      if (prev.length === 2) {
        setCompareResult({ chart1: prev[0], chart2: prev[1] });
      }
      return prev;
    });
  }, []);

  const handleCloseComparison = useCallback(() => {
    setCompareResult(null);
    setSelectedForCompare([]);
    setIsCompareMode(false);
  }, []);

  const handleToggleCompareMode = useCallback(() => {
    setIsCompareMode(prev => {
      if (prev) setSelectedForCompare([]);
      return !prev;
    });
  }, []);

  // ============================================================================
  // FILTRAGE
  // ============================================================================

  const filteredCharts = useMemo(() => {
    return charts.filter(chart => {
      if (selectedCategory !== 'all' && chart.category_id !== selectedCategory) return false;

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const searchPool = [
          chart.title_fr, chart.title_en, chart.description_fr, chart.description_en,
          chart.source_fr, chart.source_en, chart.methodology_fr, chart.methodology_en,
          chart.population_scope_fr, chart.population_scope_en,
          chart.category?.name_fr, chart.category?.name_en,
          ...(chart.dataPoints || []).map(dp => `${dp.label_fr} ${dp.label_en}`),
          ...(chart.macro_chart_series || []).map(s => `${s.name_fr} ${s.name_en}`),
          ...(chart.macro_chart_annotations || []).map(a => `${a.label_fr} ${a.label_en}`),
        ].map(s => (s || '').toLowerCase());

        if (!searchPool.some(text => text.includes(query))) return false;
      }
      return true;
    });
  }, [charts, searchQuery, selectedCategory]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading && charts.length === 0) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <InfinityIcon className="w-16 h-16 text-[#D4AF37] animate-[spin_3s_linear_infinite]" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020111] text-white font-sans selection:bg-[#D4AF37]/30 selection:text-white pb-24">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5 bg-[#020111]/70 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/explore" className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] transition-colors text-sm font-bold uppercase tracking-widest">
            <ArrowLeft size={16} /> {lang === 'fr' ? 'Retour' : 'Back'}
          </Link>
          <div className="flex items-center gap-2">
            <InfinityIcon className="text-[#D4AF37]" size={22} strokeWidth={2} />
            <h1 className="font-serif text-lg tracking-[0.2em] text-white uppercase">
              {lang === 'fr' ? 'Chiffres' : 'Figures'}
            </h1>
          </div>
          <button
            onClick={handleToggleCompareMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              isCompareMode ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isCompareMode ? <EyeOff size={14} /> : <Eye size={14} />}
            {lang === 'fr' ? 'Comparer' : 'Compare'}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 relative z-10 space-y-12">
        {/* HEADER & SEARCH */}
        <section className="text-center space-y-8 max-w-3xl mx-auto relative">
          <div className="flex justify-center mb-6 relative z-10">
            <AwaleBoard className="w-64 md:w-80 text-[#D4AF37]" />
          </div>

          <div className="space-y-4 relative z-10">
            <h2 className="text-4xl md:text-5xl font-serif italic text-white">
              {lang === 'fr' ? 'Intelligence Statistique' : 'Statistical Intelligence'}
            </h2>
            <p className="text-white/50 text-sm md:text-base">
              {lang === 'fr'
                ? 'Découvrez les données sur Notre Monde.'
                : 'Discover the data about Our World.'}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative group mx-auto max-w-2xl z-10">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-[#D4AF37]/20 to-teal-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center bg-[#0a0a1a] border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:border-[#D4AF37]/50 transition-colors">
              <div className="pl-4 pr-3 text-[#D4AF37]">
                <InfinityIcon size={20} strokeWidth={2} />
              </div>

              <div className="relative flex-1 h-12">
                {!searchQuery && <AnimatedPlaceholder lang={lang} />}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="absolute inset-0 w-full h-full bg-transparent text-white text-lg outline-none"
                />
              </div>

              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-3 text-white/30 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              )}
              <div className="bg-[#D4AF37] p-3 rounded-xl text-black ml-1">
                <Search size={18} />
              </div>
            </div>
          </div>

          {/* Filtres catégories */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 relative z-10">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {lang === 'fr' ? 'Tout voir' : 'All Data'}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-white/10 border-white text-white'
                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {lang === 'fr' ? cat.name_fr : cat.name_en}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* RESULTS METRICS */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Database size={16} />
            <span>{filteredCharts.length} {lang === 'fr' ? 'graphiques trouvés' : 'charts found'}</span>
          </div>
          {isCompareMode && selectedForCompare.length > 0 && (
            <span className="text-xs bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full">
              {selectedForCompare.length}/2 {lang === 'fr' ? 'sélectionnés' : 'selected'}
            </span>
          )}
        </div>

        {/* CHARTS GRID */}
        {filteredCharts.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="flex justify-center opacity-30 mb-4">
              <AwaleBoard className="w-48 text-[#D4AF37]" />
            </div>
            <p className="text-white/50 text-lg">
              {lang === 'fr' ? 'Aucune donnée ne correspond à votre recherche.' : 'No data matches your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCharts.map(chart => (
              <ChartCard
                key={chart.id}
                chart={chart}
                lang={lang}
                isCompareMode={isCompareMode}
                isSelected={selectedForCompare.some(c => c.id === chart.id)}
                onSelect={handleToggleCompare}
                onOpenModal={handleOpenChart}
                onShare={handleShare}
                copiedId={copiedId}
              />
            ))}
          </div>
        )}
      </main>

      {/* COMPARE MODAL */}
      <AnimatePresence>
        {compareResult && (
          <CompareModal
            chart1={compareResult.chart1}
            chart2={compareResult.chart2}
            onClose={handleCloseComparison}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* COMPARE TRAY */}
      {isCompareMode && (
        <CompareTray
          selected={selectedForCompare}
          onRemove={id => setSelectedForCompare(prev => prev.filter(c => c.id !== id))}
          onCompare={handleStartComparison}
          lang={lang}
        />
      )}
    </div>
  );
}