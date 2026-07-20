"use client";
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Info, TrendingUp, Download } from 'lucide-react';
import RenderChartPublic from '@/lib/charts/renderChartPublic';
import { MacroChart } from '@/components/admin/macro/types';
import { toCSV, downloadCSV } from '@/lib/macroHelpers';

interface ComparisionAnalysis {
  sameUnit: boolean;
  deltaPercent: number | null;
  hint: string;
}

function analyzeComparison(chart1: MacroChart, chart2: MacroChart, lang: 'fr' | 'en'): ComparisionAnalysis {
  const unit1 = lang === 'fr' ? chart1.unit_fr : chart1.unit_en;
  const unit2 = lang === 'fr' ? chart2.unit_fr : chart2.unit_en;
  const sameUnit = unit1 === unit2;

  let deltaPercent: number | null = null;
  let hint = '';

  if (sameUnit && chart1.dataPoints.length > 0 && chart2.dataPoints.length > 0) {
    const val1 = chart1.dataPoints[0].value || 0;
    const val2 = chart2.dataPoints[0].value || 0;
    if (val1 !== 0) {
      deltaPercent = ((val2 - val1) / Math.abs(val1)) * 100;
      if (lang === 'fr') {
        hint = deltaPercent > 0
          ? `${chart2.title_fr} est supérieur de ${Math.abs(deltaPercent).toFixed(1)}% à ${chart1.title_fr}`
          : `${chart2.title_fr} est inférieur de ${Math.abs(deltaPercent).toFixed(1)}% à ${chart1.title_fr}`;
      } else {
        hint = deltaPercent > 0
          ? `${chart2.title_en} is ${Math.abs(deltaPercent).toFixed(1)}% higher than ${chart1.title_en}`
          : `${chart2.title_en} is ${Math.abs(deltaPercent).toFixed(1)}% lower than ${chart1.title_en}`;
      }
    }
  }

  return { sameUnit, deltaPercent, hint };
}

export function CompareModal({
  chart1, chart2, onClose, lang,
}: {
  chart1: MacroChart;
  chart2: MacroChart;
  onClose: () => void;
  lang: 'fr' | 'en';
}) {
  const analysis = useMemo(() => analyzeComparison(chart1, chart2, lang), [chart1, chart2, lang]);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleExportCSV = (chart: MacroChart, label: string) => {
    const rows: (string | number)[][] = [
      [label, ...chart.dataPoints.map(dp => lang === 'fr' ? dp.label_fr : dp.label_en)],
      ['Valeur', ...chart.dataPoints.map(dp => dp.value ?? 0)],
    ];
    downloadCSV(`comparaison-${label.toLowerCase().replace(/\s+/g, '-')}.csv`, rows);
  };

  const ChartPanel = ({ chart, position }: { chart: MacroChart; position: 'left' | 'right' }) => {
    const unit = lang === 'fr' ? chart.unit_fr : chart.unit_en;
    const secondUnit = lang === 'fr' ? chart.secondary_unit_fr : chart.secondary_unit_en;
    const desc = lang === 'fr' ? chart.description_fr : chart.description_en;
    const methodol = lang === 'fr' ? chart.methodology_fr : chart.methodology_en;
    const popScope = lang === 'fr' ? chart.population_scope_fr : chart.population_scope_en;

    return (
      <motion.div
        initial={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl p-6 overflow-y-auto"
      >
        {/* Header */}
        <div className="pb-4 border-b border-white/5 mb-4">
          <h3 className="text-lg md:text-xl font-serif text-white mb-2">{lang === 'fr' ? chart.title_fr : chart.title_en}</h3>
          {chart.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-white/70">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chart.category.color }} />
              {lang === 'fr' ? chart.category.name_fr : chart.category.name_en}
            </span>
          )}

          {/* Statut donnée */}
          {chart.data_status !== 'final' && (
            <div className={`mt-2 inline-block px-2 py-1 rounded text-[9px] font-bold uppercase ${
              chart.data_status === 'provisional' ? 'bg-amber-500/20 text-amber-300' :
              chart.data_status === 'estimated' ? 'bg-blue-500/20 text-blue-300' :
              'bg-purple-500/20 text-purple-300'
            }`}>
              {chart.data_status === 'provisional' ? lang === 'fr' ? 'Provisoire' : 'Provisional' :
               chart.data_status === 'estimated' ? lang === 'fr' ? 'Estimé' : 'Estimated' :
               lang === 'fr' ? 'Prévision' : 'Forecast'}
            </div>
          )}
        </div>

        {/* Graphique */}
        <div className="flex-1 min-h-[200px] mb-4">
          <RenderChartPublic
            chartType={chart.chart_type}
            dataPoints={chart.dataPoints}
            series={chart.macro_chart_series || []}
            annotations={chart.macro_chart_annotations || []}
            unit={unit}
            secondaryUnit={secondUnit}
            lang={lang}
            isLarge={true}
          />
        </div>

        {/* Métadonnées */}
        <div className="space-y-3 text-xs text-white/60 border-t border-white/5 pt-4">
          {chart.reference_date && (
            <div>
              <span className="text-white/40">{lang === 'fr' ? 'Référence' : 'Reference'}</span>
              <p className="text-white/80">{new Date(chart.reference_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
            </div>
          )}
          {chart.population_scope_fr && (
            <div>
              <span className="text-white/40">{lang === 'fr' ? 'Champ' : 'Scope'}</span>
              <p className="text-white/80">{popScope}</p>
            </div>
          )}
          {chart.source_url && (
            <div>
              <a href={chart.source_url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                {lang === 'fr' ? 'Source' : 'Source'}: {lang === 'fr' ? chart.source_fr : chart.source_en}
              </a>
            </div>
          )}
          {chart.has_break_in_series && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
              <p className="text-amber-300 text-[9px] font-bold uppercase mb-1">{lang === 'fr' ? 'Rupture de série' : 'Break in series'}</p>
              <p className="text-amber-200/80">{lang === 'fr' ? chart.break_note_fr : chart.break_note_en}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {desc && (
          <div className="mt-4 p-3 bg-white/[0.03] border border-white/5 rounded">
            <p className="text-white/70 text-xs leading-relaxed">{desc}</p>
          </div>
        )}

        {/* Méthodologie */}
        {methodol && (
          <details className="mt-3 text-white/70 text-xs">
            <summary className="cursor-pointer font-bold text-white/80 hover:text-white">{lang === 'fr' ? 'Méthodologie' : 'Methodology'}</summary>
            <p className="mt-2 text-white/60">{methodol}</p>
          </details>
        )}

        {/* Téléchargement */}
        <button
          onClick={() => handleExportCSV(chart, lang === 'fr' ? chart.title_fr : chart.title_en)}
          className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Download size={14} /> {lang === 'fr' ? 'Télécharger CSV' : 'Download CSV'}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020111]/90 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-[#0a0a1a] to-[#020111] border border-white/10 rounded-3xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-2xl font-serif text-white flex items-center gap-2">
            <TrendingUp size={24} className="text-[#D4AF37]" />
            {lang === 'fr' ? 'Comparaison' : 'Comparison'}
          </h2>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Analysis */}
        {analysis.sameUnit && analysis.hint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-4 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 flex items-start gap-3"
          >
            <TrendingUp size={18} className="text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <p className="text-[#D4AF37] text-sm">{analysis.hint}</p>
          </motion.div>
        )}

        {/* Charts */}
        <div className={`flex-1 overflow-y-auto p-6 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <ChartPanel chart={chart1} position="left" />
          <ChartPanel chart={chart2} position="right" />
        </div>
      </motion.div>
    </div>
  );
}