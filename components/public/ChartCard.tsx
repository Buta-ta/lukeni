"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Share2, Check, AlertTriangle, CalendarDays } from 'lucide-react';
import RenderChartPublic from '@/lib/charts/renderChartPublic';
import { MacroChart } from '@/components/admin/macro/types';

function ChartCardComponent({
  chart, lang, isCompareMode, isSelected, onSelect, onOpenModal, onShare, copiedId,
}: {
  chart: MacroChart;
  lang: 'fr' | 'en';
  isCompareMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpenModal: (chart: MacroChart) => void;
  onShare: (chart: MacroChart) => void;
  copiedId: string | null;
}) {
  const unit = lang === 'fr' ? chart.unit_fr : chart.unit_en;
  const secondUnit = lang === 'fr' ? chart.secondary_unit_fr : chart.secondary_unit_en;
  const title = lang === 'fr' ? chart.title_fr : chart.title_en;
  const desc = lang === 'fr' ? chart.description_fr : chart.description_en;
  const source = lang === 'fr' ? chart.source_fr : chart.source_en;

  const displayDate = chart.published_at
    ? new Date(chart.published_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' })
    : (chart.reference_date ? new Date(chart.reference_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' }) : '--');

  const handleCardClick = (e: React.MouseEvent) => {
    if (isCompareMode) {
      e.preventDefault();
      onSelect(chart.id);
    } else {
      onOpenModal(chart);
    }
  };

  // Empêche uniquement la navigation intempestive en mode normal
  // (n'est utile qu'en dehors du mode comparaison, voir ci-dessous)
  const handleChartAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className={`relative bg-[#0f0f1a] border rounded-3xl overflow-hidden group transition-all flex flex-col h-[500px] ${
        isCompareMode && isSelected ? 'border-[#D4AF37] bg-[#D4AF37]/5' :
        isCompareMode ? 'border-white/10 cursor-pointer hover:border-white/20' :
        'border-white/10 hover:border-[#D4AF37]/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] cursor-pointer'
      }`}
      style={{ touchAction: 'pan-y' }} // ⬅️ garantit un scroll vertical fluide sur toute la carte
    >
      {/* Checkbox (mode comparaison) */}
      {isCompareMode && (
        <div className="absolute top-4 left-4 z-20">
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/30 bg-transparent'
          }`}>
            {isSelected && (
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-start gap-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex-1">
          <h3 className="text-lg font-serif text-white mb-2 group-hover:text-[#D4AF37] transition-colors line-clamp-2">{title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {chart.category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chart.category.color }} />
                {lang === 'fr' ? chart.category.name_fr : chart.category.name_en}
              </span>
            )}
            {chart.data_status && chart.data_status !== 'final' && (
              <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                chart.data_status === 'provisional' ? 'bg-amber-500/20 text-amber-300' :
                chart.data_status === 'estimated' ? 'bg-blue-500/20 text-blue-300' :
                'bg-purple-500/20 text-purple-300'
              }`}>
                {chart.data_status === 'provisional' ? lang === 'fr' ? 'Provisoire' : 'Provisional' :
                 chart.data_status === 'estimated' ? lang === 'fr' ? 'Estimé' : 'Estimated' :
                 lang === 'fr' ? 'Prévision' : 'Forecast'}
              </span>
            )}
            {chart.has_break_in_series && (
              <div title={lang === 'fr' ? 'Rupture de série' : 'Break in series'} className="p-1.5 bg-amber-500/10 rounded text-amber-400">
                <AlertTriangle size={14} />
              </div>
            )}
          </div>
        </div>
        {!isCompareMode && (
          <div className="p-2 bg-white/5 rounded-full group-hover:bg-[#D4AF37] group-hover:text-black transition-colors text-white/50 flex-shrink-0">
            <Maximize2 size={16} />
          </div>
        )}
      </div>

      {/* GRAPHIQUE */}
      <div
        className={`flex-1 p-6 relative ${isCompareMode ? 'pointer-events-none' : ''}`}
        // ⬇️ FIX CRITIQUE :
        // - Mode normal   : pointer-events actifs → tooltips au survol,
        //                   stopPropagation pour éviter une navigation accidentelle.
        // - Mode comparaison : pointer-events désactivés → le SVG ne capte plus
        //                   aucun événement tactile/souris, ce qui restaure un scroll
        //                   fluide (plus de conflit avec le geste tactile de Recharts)
        //                   et fait qu'un tap sur le graphique redevient un simple
        //                   clic propre sur la carte (sélection fiable, sans reset).
        onClick={!isCompareMode ? handleChartAreaClick : undefined}
      >
        <RenderChartPublic
          chartType={chart.chart_type}
          dataPoints={chart.dataPoints || []}
          series={chart.macro_chart_series || []}
          annotations={chart.macro_chart_annotations || []}
          unit={unit}
          secondaryUnit={secondUnit}
          lang={lang}
          isLarge={false}
        />
      </div>

      {/* Footer */}
      <div className="p-5 bg-[#0a0a1a] border-t border-white/5 flex flex-col">
        {desc && (
          <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-3">{desc}</p>
        )}

        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-white/40 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="truncate max-w-[120px]" title={source}>
              {lang === 'fr' ? 'Src' : 'Src'}: <span className="text-white/70">{source}</span>
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={10} />
              {displayDate}
            </span>
          </div>

          {!isCompareMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(chart);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg transition-colors whitespace-nowrap flex-shrink-0 pointer-events-auto"
            >
              {copiedId === chart.id ? <Check size={12} className="text-green-400" /> : <Share2 size={12} />}
              <span className="hidden sm:inline text-[9px]">
                {copiedId === chart.id ? lang === 'fr' ? 'Copié' : 'Copied' : lang === 'fr' ? 'Partager' : 'Share'}
              </span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ⬇️ Évite de re-render tout le SVG du graphique à chaque tick du placeholder
// de recherche (toutes les 3s) ou tout autre state non lié à cette carte.
export const ChartCard = React.memo(ChartCardComponent);