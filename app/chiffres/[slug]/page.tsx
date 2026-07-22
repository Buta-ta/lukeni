"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Share2, Check, Loader2, Info, Download, Database, AlertTriangle, Table2, BarChart2, CalendarDays } from 'lucide-react';
import RenderChartPublic from '@/lib/charts/renderChartPublic';
import { MacroChart } from '@/components/admin/macro/types';

import { toCSV, downloadCSV } from '@/lib/macroHelpers';
import { useLanguage } from '@/lib/contexts/LanguageContext';


export default function ChartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const slug = params.slug as string;

  const [chart, setChart] = useState<MacroChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    const fetchChart = async () => {
      setIsLoading(true);
      const decodedSlug = decodeURIComponent(slug);
      
      try {
        let { data: chartData, error: chartError } = await supabase
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
          .eq('slug', decodedSlug)
          .eq('workflow_status', 'published')
          .single();

        if (chartError || !chartData) {
          const normalizedSlug = decodedSlug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const result = await supabase
            .from('macro_charts')
            .select(`*, category:categories(id, name_fr, name_en, color, icon)`)
            .eq('workflow_status', 'published')
            .ilike('slug', `%${normalizedSlug}%`)
            .single();
          
          chartData = result.data;
          chartError = result.error;
        }

        if (chartError || !chartData) {
          router.push('/chiffres');
          return;
        }

        const [{ data: dataRes }, { data: seriesRes }, { data: annotRes }] = await Promise.all([
          supabase.from('macro_chart_data').select('*').eq('chart_id', chartData.id).order('sort_order'),
          supabase.from('macro_chart_series').select('*').eq('chart_id', chartData.id).order('sort_order'),
          supabase.from('macro_chart_annotations').select('*').eq('chart_id', chartData.id),
        ]);

        setChart({
          ...chartData,
          dataPoints: dataRes || [],
          macro_chart_series: seriesRes || [],
          macro_chart_annotations: annotRes || [],
        } as any);
      } catch (err) {
        router.push('/chiffres');
      }
      setIsLoading(false);
    };

    if (slug) fetchChart();
  }, [slug, router]);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!chart) return;
    const title = lang === 'fr' ? chart.title_fr : chart.title_en;
    const text = `${title}\n${lang === 'fr' ? 'Découvert sur LUKENI' : 'Discovered on LUKENI'}`;
    const url = window.location.href;

    if (navigator.share) {
      try { await navigator.share({ title: title ?? '', url }); } catch (err) {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedId(chart.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleExportCSV = () => {
    if (!chart) return;
    const rows: (string | number)[][] = [
      ['Label', lang === 'fr' ? 'Valeur' : 'Value'],
      ...(chart.dataPoints || []).map(dp => [
        lang === 'fr' ? dp.label_fr : dp.label_en || dp.label_fr,
        dp.value ?? 0
      ])
    ];
    downloadCSV(`lukeni-data-${chart.slug}.csv`, rows);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!chart) return null;

  const unit = lang === 'fr' ? chart.unit_fr : chart.unit_en;
  const secondUnit = lang === 'fr' ? chart.secondary_unit_fr : chart.secondary_unit_en;
  const title = lang === 'fr' ? chart.title_fr : chart.title_en;
  const desc = lang === 'fr' ? chart.description_fr : chart.description_en;
  const method = lang === 'fr' ? chart.methodology_fr : chart.methodology_en;
  const scope = lang === 'fr' ? chart.population_scope_fr : chart.population_scope_en;
  const source = lang === 'fr' ? chart.source_fr : chart.source_en;
  
  // Format Date (Published or Reference)
  const publishedDate = chart.published_at ? new Date(chart.published_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '--';

  return (
    <div className="min-h-screen bg-[#020111] text-white font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-900/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5 bg-[#020111]/70 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/chiffres" className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] transition-colors text-sm font-bold uppercase tracking-widest">
            <ArrowLeft size={16} /> {lang === 'fr' ? 'Retour' : 'Back'}
          </Link>
          <div className="flex gap-3">
            <button onClick={handleShare} className="text-white/60 hover:text-white transition-colors" title={lang === 'fr' ? 'Partager' : 'Share'}>
              {copiedId === chart.id ? <Check size={18} className="text-green-400" /> : <Share2 size={18} />}
            </button>
            <button onClick={handleExportCSV} className="text-white/60 hover:text-white transition-colors" title="Export CSV">
              <Download size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
        
        {/* EN-TÊTE : Pédigrée de la donnée */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 border-b border-white/10 pb-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {chart.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chart.category.color }} />
                {lang === 'fr' ? chart.category.name_fr : chart.category.name_en}
              </span>
            )}
            {chart.data_status !== 'final' && (
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                chart.data_status === 'provisional' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                chart.data_status === 'estimated' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {chart.data_status === 'provisional' ? (lang === 'fr' ? 'Provisoire' : 'Provisional') :
                 chart.data_status === 'estimated' ? (lang === 'fr' ? 'Estimé' : 'Estimated') :
                 (lang === 'fr' ? 'Prévision' : 'Forecast')}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs text-white/50 font-mono tracking-wide">
            <span className="flex items-center gap-1.5">
              <Database size={14} className="text-[#D4AF37]" />
              {lang === 'fr' ? 'Source:' : 'Source:'} <strong className="text-white/80 font-sans">{source}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-[#D4AF37]" />
              {lang === 'fr' ? 'Publié le:' : 'Published on:'} <strong className="text-white/80 font-sans">{publishedDate}</strong>
            </span>
          </div>
        </motion.div>

        {/* CORPS PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne Gauche : Data Viz (70%) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Barre de contrôle du Graphique */}
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-2xl backdrop-blur-md">
              <div className="flex gap-1 bg-[#020111] p-1 rounded-xl">
                <button 
                  onClick={() => setViewMode('chart')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'chart' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                >
                  <BarChart2 size={14} /> {lang === 'fr' ? 'Visualisation' : 'Chart'}
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white/10 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                >
                  <Table2 size={14} /> {lang === 'fr' ? 'Données Brutes' : 'Raw Data'}
                </button>
              </div>

              <div className="pr-3 text-xs text-white/50 font-mono">
                {lang === 'fr' ? 'Unité :' : 'Unit :'} <span className="text-[#D4AF37]">{unit}</span>
              </div>
            </div>

            {/* Zone d'affichage (Graphique ou Tableau) */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0a0a1a] border border-white/10 rounded-3xl p-6 md:p-8 h-[550px] relative overflow-hidden group">
              {viewMode === 'chart' ? (
                <RenderChartPublic
                  chartType={chart.chart_type as any}
                  dataPoints={chart.dataPoints || []}
                  series={chart.macro_chart_series || []}
                  annotations={chart.macro_chart_annotations || []}
                  unit={unit}
                  secondaryUnit={secondUnit}
                  lang={lang}
                  isLarge={true}
                />
              ) : (
                <div className="h-full overflow-auto pr-2 custom-scrollbar">
                  <table className="w-full text-left text-sm text-white/80">
                    <thead className="sticky top-0 bg-[#0a0a1a] z-10 text-xs text-white/40 uppercase tracking-wider font-mono border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">{lang === 'fr' ? 'Période / Catégorie' : 'Period / Category'}</th>
                        <th className="py-3 px-4 text-right">{lang === 'fr' ? 'Valeur' : 'Value'} ({unit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {chart.dataPoints?.map((dp, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">{lang === 'fr' ? dp.label_fr : (dp.label_en || dp.label_fr)}</td>
                          <td className="py-3 px-4 text-right font-mono text-[#D4AF37]">{dp.value !== null ? dp.value.toLocaleString() : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Description Contexte */}
            {desc && (
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-4">
                <h3 className="text-lg font-serif text-white flex items-center gap-2">
                  <Info className="text-[#D4AF37]" size={20} />
                  {lang === 'fr' ? 'Analyse & Contexte' : 'Context & Analysis'}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{desc}</p>
              </div>
            )}
          </div>

          {/* Colonne Droite : Métadonnées (30%) */}
          <div className="space-y-6">
            <div className="bg-[#0a0a1a] border border-white/10 rounded-3xl p-6 space-y-6 sticky top-24">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-4">
                {lang === 'fr' ? 'Fiche Technique' : 'Fact Sheet'}
              </h3>

              {scope && (
                <div>
                  <h4 className="text-[10px] text-white/40 uppercase mb-1 font-mono">{lang === 'fr' ? 'Champ Couvert' : 'Covered Scope'}</h4>
                  <p className="text-sm text-white/90">{scope}</p>
                </div>
              )}

              {method && (
                <div>
                  <h4 className="text-[10px] text-white/40 uppercase mb-1 font-mono">{lang === 'fr' ? 'Méthodologie' : 'Methodology'}</h4>
                  <p className="text-sm text-white/70 leading-relaxed">{method}</p>
                </div>
              )}

              {chart.margin_error && (
                <div>
                  <h4 className="text-[10px] text-white/40 uppercase mb-1 font-mono">{lang === 'fr' ? 'Marge d\'erreur' : 'Margin of Error'}</h4>
                  <span className="px-2 py-1 bg-white/5 rounded text-sm text-[#D4AF37]">± {chart.margin_error}%</span>
                </div>
              )}

              {chart.source_url && (
                <div className="pt-4 border-t border-white/10">
                  <a href={chart.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 hover:bg-[#D4AF37] hover:text-black rounded-xl transition-all group text-sm text-white/80">
                    <span className="font-bold">{lang === 'fr' ? 'Consulter la source' : 'View Source'}</span>
                    <ArrowLeft size={16} className="rotate-135 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            {/* Alerte Rupture */}
            {chart.has_break_in_series && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                <h4 className="text-amber-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} /> {lang === 'fr' ? 'Rupture de série' : 'Break in series'}
                </h4>
                <p className="text-amber-200/80 text-xs leading-relaxed">
                  {lang === 'fr' ? chart.break_note_fr : chart.break_note_en}
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}