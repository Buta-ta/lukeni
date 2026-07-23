"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { autoTranslate, autoCorrect } from '@/lib/lingua';
import {
  TrendingUp, PlusCircle, Edit2, Trash2, X, Languages, SpellCheck, CheckCircle,
  Loader2, BarChart3, LayoutGrid, Save, Search, Copy, History, Sparkles, AlertTriangle,
} from 'lucide-react';
import SeriesManager from './macro/SeriesManager';
import DataEditor from './macro/DataEditor';
import AnnotationsManager from './macro/AnnotationsManager';
import ChartPreview from './macro/ChartPreview';
import AuditHistoryModal from './macro/AuditHistoryModal';
import { generateAltTextFR, generateAltTextEN } from '@/lib/macroHelpers';
import {
  MacroChart, MacroSeries, MacroDataPoint, MacroAnnotation, Category, ChartType,
  CHART_TYPES, MULTI_SERIES_TYPES, POINT_TYPES, TEMPORAL_TYPES, WORKFLOW_LABELS,
  WorkflowStatus, DataStatus,
} from './macro/types';

import MacroTickerManager from './macro/GlobeConfigManager';

function LinguaButton({ action, label, disabled, isProcessing, onClick }: {
  action: string; label: string; disabled: boolean; isProcessing: string | null; onClick: () => void;
}) {
  const loading = isProcessing === action;
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className="p-1.5 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors">
      {loading ? <Loader2 size={10} className="animate-spin" /> : action.includes('translate') ? <Languages size={10} /> : <SpellCheck size={10} />}
      {label}
    </button>
  );
}

export default function MacroAdminTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [charts, setCharts] = useState<MacroChart[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');

  const [adminView, setAdminView] = useState<'charts' | 'globe'>('charts');
  // Filtres liste
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<WorkflowStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [auditModalChartId, setAuditModalChartId] = useState<string | null>(null);

  // Form: Chart
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFr, setTitleFr] = useState(''); const [titleEn, setTitleEn] = useState('');
  const [descFr, setDescFr] = useState(''); const [descEn, setDescEn] = useState('');
  const [unitFr, setUnitFr] = useState(''); const [unitEn, setUnitEn] = useState('');
  const [secUnitFr, setSecUnitFr] = useState(''); const [secUnitEn, setSecUnitEn] = useState('');
  const [sourceFr, setSourceFr] = useState(''); const [sourceEn, setSourceEn] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [methodologyFr, setMethodologyFr] = useState(''); const [methodologyEn, setMethodologyEn] = useState('');
  const [popScopeFr, setPopScopeFr] = useState(''); const [popScopeEn, setPopScopeEn] = useState('');
  const [altTextFr, setAltTextFr] = useState(''); const [altTextEn, setAltTextEn] = useState('');
  const [dataStatus, setDataStatus] = useState<DataStatus>('final');
  const [referenceDate, setReferenceDate] = useState('');
  const [hasBreak, setHasBreak] = useState(false);
  const [breakNoteFr, setBreakNoteFr] = useState(''); const [breakNoteEn, setBreakNoteEn] = useState('');
  const [marginError, setMarginError] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [categoryId, setCategoryId] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('draft');

  // Form: Series & Data
  const [series, setSeries] = useState<MacroSeries[]>([]);
  const [dataPoints, setDataPoints] = useState<MacroDataPoint[]>([]);
  const [annotations, setAnnotations] = useState<MacroAnnotation[]>([]);
  const [deletedDataIds, setDeletedDataIds] = useState<string[]>([]);
  const [deletedSeriesIds, setDeletedSeriesIds] = useState<string[]>([]);
  const [deletedAnnotationIds, setDeletedAnnotationIds] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const isMultiSeries = MULTI_SERIES_TYPES.includes(chartType);

  // ============================================================================
  // FETCH
  // ============================================================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [catsRes, chartsRes] = await Promise.all([
      supabase.from('categories').select('*').eq('show_macro', true).eq('is_active', true),
      supabase.from('macro_charts').select(`*, category:categories(id, name_fr, name_en, color)`).order('created_at', { ascending: false }),
    ]);
    if (catsRes.data) setCategories(catsRes.data);
    if (chartsRes.data) setCharts(chartsRes.data as any);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============================================================================
  // FORM HELPERS
  // ============================================================================

  const resetForm = useCallback(() => {
    setEditingId(null); setTitleFr(''); setTitleEn(''); setDescFr(''); setDescEn('');
    setUnitFr(''); setUnitEn(''); setSecUnitFr(''); setSecUnitEn('');
    setSourceFr(''); setSourceEn(''); setSourceUrl('');
    setMethodologyFr(''); setMethodologyEn(''); setPopScopeFr(''); setPopScopeEn('');
    setAltTextFr(''); setAltTextEn(''); setDataStatus('final'); setReferenceDate('');
    setHasBreak(false); setBreakNoteFr(''); setBreakNoteEn(''); setMarginError('');
    setChartType('bar'); setCategoryId(''); setWorkflowStatus('draft');
    setSeries([]); setDataPoints([]); setAnnotations([]);
    setDeletedDataIds([]); setDeletedSeriesIds([]); setDeletedAnnotationIds([]);
    setView('list');
  }, []);

  const openForm = useCallback(async (chart?: MacroChart) => {
    if (chart) {
      setEditingId(chart.id); setTitleFr(chart.title_fr); setTitleEn(chart.title_en);
      setDescFr(chart.description_fr || ''); setDescEn(chart.description_en || '');
      setUnitFr(chart.unit_fr || ''); setUnitEn(chart.unit_en || '');
      setSecUnitFr(chart.secondary_unit_fr || ''); setSecUnitEn(chart.secondary_unit_en || '');
      setSourceFr(chart.source_fr || ''); setSourceEn(chart.source_en || ''); setSourceUrl(chart.source_url || '');
      setMethodologyFr(chart.methodology_fr || ''); setMethodologyEn(chart.methodology_en || '');
      setPopScopeFr(chart.population_scope_fr || ''); setPopScopeEn(chart.population_scope_en || '');
      setAltTextFr(chart.alt_text_fr || ''); setAltTextEn(chart.alt_text_en || '');
      setDataStatus(chart.data_status || 'final'); setReferenceDate(chart.reference_date || '');
      setHasBreak(chart.has_break_in_series || false);
      setBreakNoteFr(chart.break_note_fr || ''); setBreakNoteEn(chart.break_note_en || '');
      setMarginError(chart.margin_error?.toString() || '');
      setChartType(chart.chart_type); setCategoryId(chart.category_id || '');
      setWorkflowStatus(chart.workflow_status || 'draft');

      const [seriesRes, dataRes, annotRes] = await Promise.all([
        supabase.from('macro_chart_series').select('*').eq('chart_id', chart.id).order('sort_order'),
        supabase.from('macro_chart_data').select('*').eq('chart_id', chart.id).order('sort_order'),
        supabase.from('macro_chart_annotations').select('*').eq('chart_id', chart.id),
      ]);
      setSeries(seriesRes.data || []);
      setDataPoints(dataRes.data || []);
      setAnnotations(annotRes.data || []);
    } else {
      resetForm();
    }
    setView('form');
  }, [resetForm]);

  // ============================================================================
  // LINGUA
  // ============================================================================

  const handleLingua = useCallback(async (action: string, field: string) => {
    const key = `${action}-${field}`;
    setIsProcessing(key);
    try {
      const sourceMap: Record<string, string> = {
        'translate-fr-title': titleEn, 'translate-en-title': titleFr, 'correct-fr-title': titleFr,
        'translate-fr-desc': descEn, 'translate-en-desc': descFr, 'correct-fr-desc': descFr,
        'translate-fr-unit': unitEn, 'translate-en-unit': unitFr, 'correct-fr-unit': unitFr,
        'translate-fr-secunit': secUnitEn, 'translate-en-secunit': secUnitFr, 'correct-fr-secunit': secUnitFr,
        'translate-fr-source': sourceEn, 'translate-en-source': sourceFr, 'correct-fr-source': sourceFr,
        'translate-fr-methodology': methodologyEn, 'translate-en-methodology': methodologyFr, 'correct-fr-methodology': methodologyFr,
        'translate-fr-popscope': popScopeEn, 'translate-en-popscope': popScopeFr, 'correct-fr-popscope': popScopeFr,
        'translate-fr-breaknote': breakNoteEn, 'translate-en-breaknote': breakNoteFr, 'correct-fr-breaknote': breakNoteFr,
        'translate-fr-alttext': altTextEn, 'translate-en-alttext': altTextFr, 'correct-fr-alttext': altTextFr,
      };
      const setterMap: Record<string, (v: string) => void> = {
        'translate-fr-title': setTitleFr, 'translate-en-title': setTitleEn, 'correct-fr-title': setTitleFr,
        'translate-fr-desc': setDescFr, 'translate-en-desc': setDescEn, 'correct-fr-desc': setDescFr,
        'translate-fr-unit': setUnitFr, 'translate-en-unit': setUnitEn, 'correct-fr-unit': setUnitFr,
        'translate-fr-secunit': setSecUnitFr, 'translate-en-secunit': setSecUnitEn, 'correct-fr-secunit': setSecUnitFr,
        'translate-fr-source': setSourceFr, 'translate-en-source': setSourceEn, 'correct-fr-source': setSourceFr,
        'translate-fr-methodology': setMethodologyFr, 'translate-en-methodology': setMethodologyEn, 'correct-fr-methodology': setMethodologyFr,
        'translate-fr-popscope': setPopScopeFr, 'translate-en-popscope': setPopScopeEn, 'correct-fr-popscope': setPopScopeFr,
        'translate-fr-breaknote': setBreakNoteFr, 'translate-en-breaknote': setBreakNoteEn, 'correct-fr-breaknote': setBreakNoteFr,
        'translate-fr-alttext': setAltTextFr, 'translate-en-alttext': setAltTextEn, 'correct-fr-alttext': setAltTextFr,
      };
      const sourceText = sourceMap[key];
      const setter = setterMap[key];
      if (!sourceText?.trim()) { showMsg('error', 'Texte source vide'); setIsProcessing(null); return; }

      let sourceLang: 'fr' | 'en' = action.includes('translate-en') ? 'fr' : 'en';
      const result = action.startsWith('translate') ? await autoTranslate(sourceText, sourceLang) : await autoCorrect(sourceText, 'fr');
      setter(result);
      showMsg('success', 'Action linguistique appliquée !');
    } catch { showMsg('error', 'Erreur Lingua'); }
    setIsProcessing(null);
  }, [titleFr, titleEn, descFr, descEn, unitFr, unitEn, secUnitFr, secUnitEn, sourceFr, sourceEn, methodologyFr, methodologyEn, popScopeFr, popScopeEn, breakNoteFr, breakNoteEn, altTextFr, altTextEn, showMsg]);

  // ============================================================================
  // ALT TEXT AUTO
  // ============================================================================

  const autoGenerateAltText = () => {
    const points = dataPoints.map(dp => ({ label: dp.label_fr, value: dp.value || 0 }));
    setAltTextFr(generateAltTextFR(titleFr, chartType, points));
    setAltTextEn(generateAltTextEN(titleEn || titleFr, chartType, points));
    showMsg('success', 'Texte alternatif généré. Vérifiez et ajustez si besoin.');
  };

  // ============================================================================
  // VALIDATION DE COHÉRENCE
  // ============================================================================

  const coherenceWarnings = useMemo(() => {
    const warnings: string[] = [];
    if ((chartType === 'pie' || chartType === 'donut') && dataPoints.length > 0) {
      const total = dataPoints.reduce((s, dp) => s + (dp.value || 0), 0);
      if (Math.abs(total) < 0.01) warnings.push('La somme des valeurs est nulle.');
    }
    if (isMultiSeries && series.length < 2) warnings.push('Ce type de graphique nécessite au moins 2 séries.');
    if (dataPoints.some(dp => (dp.value ?? 0) < 0) && ['pie', 'donut', 'stacked_bar_100'].includes(chartType)) {
      warnings.push('Des valeurs négatives ont été détectées sur un graphique qui ne devrait pas en contenir.');
    }
    if (hasBreak && !breakNoteFr.trim()) warnings.push('Une rupture de série est signalée mais aucune note explicative n\'est renseignée.');
    if (!sourceUrl.trim() && sourceFr.trim()) warnings.push('Source renseignée sans URL vérifiable.');
    return warnings;
  }, [chartType, dataPoints, series, isMultiSeries, hasBreak, breakNoteFr, sourceUrl, sourceFr]);

  // ============================================================================
  // SAVE
  // ============================================================================

  const handleSave = async () => {
    if (!titleFr.trim()) return showMsg('error', 'Le titre FR est requis.');
    if (!categoryId) return showMsg('error', 'Veuillez choisir une catégorie.');
    if (dataPoints.length === 0) return showMsg('error', 'Ajoutez au moins une ligne de données.');

    setIsSaving(true);
    let chartId = editingId;

    const chartPayload = {
      category_id: categoryId, title_fr: titleFr, title_en: titleEn,
      description_fr: descFr, description_en: descEn, chart_type: chartType,
      unit_fr: unitFr, unit_en: unitEn, secondary_unit_fr: secUnitFr, secondary_unit_en: secUnitEn,
      source_fr: sourceFr, source_en: sourceEn, source_url: sourceUrl,
      methodology_fr: methodologyFr, methodology_en: methodologyEn,
      population_scope_fr: popScopeFr, population_scope_en: popScopeEn,
      alt_text_fr: altTextFr, alt_text_en: altTextEn,
      data_status: dataStatus, reference_date: referenceDate || null,
      has_break_in_series: hasBreak, break_note_fr: breakNoteFr, break_note_en: breakNoteEn,
      margin_error: marginError ? Number(marginError) : null,
      workflow_status: workflowStatus,
      // Date automatique lors de la publication
      ...(workflowStatus === 'published' ? { published_at: new Date().toISOString() } : {}),
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('macro_charts').update(chartPayload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('macro_charts').insert(chartPayload).select().single();
        if (error) throw error;
        chartId = data.id;
      }

      // Séries
      if (deletedSeriesIds.length > 0) await supabase.from('macro_chart_series').delete().in('id', deletedSeriesIds);
      if (series.length > 0) {
        const seriesPayloads = series.map((s, idx) => ({
          id: s.id, chart_id: chartId, name_fr: s.name_fr, name_en: s.name_en || s.name_fr,
          color: s.color, render_as: s.render_as, axis: s.axis, sort_order: idx,
        }));
        const { error } = await supabase.from('macro_chart_series').upsert(seriesPayloads);
        if (error) throw error;
      }

      // Données
      if (deletedDataIds.length > 0) await supabase.from('macro_chart_data').delete().in('id', deletedDataIds);
      const dataPayloads = dataPoints.map((dp, idx) => ({
        id: dp.id || crypto.randomUUID(), chart_id: chartId, series_id: dp.series_id,
        label_fr: dp.label_fr, label_en: dp.label_en || dp.label_fr, period: dp.period || null,
        value: dp.value !== undefined ? Number(dp.value) : null,
        x_value: dp.x_value !== undefined ? Number(dp.x_value) : null,
        y_value: dp.y_value !== undefined ? Number(dp.y_value) : null,
        size_value: dp.size_value !== undefined ? Number(dp.size_value) : null,
        color: dp.color, sort_order: idx, is_total: dp.is_total || false,
        data_status: dp.data_status || null, annotation_fr: dp.annotation_fr || null, annotation_en: dp.annotation_en || null,
      }));
      if (dataPayloads.length > 0) {
        const { error } = await supabase.from('macro_chart_data').upsert(dataPayloads);
        if (error) throw error;
      }

      // Annotations
      if (deletedAnnotationIds.length > 0) await supabase.from('macro_chart_annotations').delete().in('id', deletedAnnotationIds);
      if (annotations.length > 0) {
        const annotPayloads = annotations.map(a => ({
          id: a.id, chart_id: chartId, period: a.period, label_fr: a.label_fr, label_en: a.label_en || a.label_fr, color: a.color,
        }));
        const { error } = await supabase.from('macro_chart_annotations').upsert(annotPayloads);
        if (error) throw error;
      }

      showMsg('success', editingId ? 'Graphique mis à jour !' : 'Graphique créé avec succès !');
      fetchData();
      resetForm();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la sauvegarde');
    }
    setIsSaving(false);
  };

  const handleDeleteChart = async (id: string) => {
    if (!confirm('Supprimer définitivement ce graphique ?')) return;
    const { error } = await supabase.from('macro_charts').delete().eq('id', id);
    if (error) showMsg('error', error.message);
    else { showMsg('success', 'Graphique supprimé.'); fetchData(); }
  };

  const handleDuplicate = async (chart: MacroChart) => {
    const { data: seriesData } = await supabase.from('macro_chart_series').select('*').eq('chart_id', chart.id);
    const { data: dataData } = await supabase.from('macro_chart_data').select('*').eq('chart_id', chart.id);

    const { data: newChart, error } = await supabase.from('macro_charts').insert({
      ...Object.fromEntries(Object.entries(chart).filter(([k]) => !['id', 'category', 'slug', 'created_at', 'updated_at', 'published_at', 'validated_at'].includes(k))),
      title_fr: `${chart.title_fr} (copie)`, workflow_status: 'draft',
    }).select().single();
    if (error) return showMsg('error', error.message);

    const seriesIdMap: Record<string, string> = {};
    if (seriesData && seriesData.length > 0) {
      const newSeries = seriesData.map(s => {
        const newId = crypto.randomUUID();
        seriesIdMap[s.id] = newId;
        return { ...s, id: newId, chart_id: newChart.id };
      });
      await supabase.from('macro_chart_series').insert(newSeries);
    }
    if (dataData && dataData.length > 0) {
      const newData = dataData.map(d => ({ ...d, id: crypto.randomUUID(), chart_id: newChart.id, series_id: d.series_id ? seriesIdMap[d.series_id] : null }));
      await supabase.from('macro_chart_data').insert(newData);
    }
    showMsg('success', 'Graphique dupliqué en brouillon.');
    fetchData();
  };

  const filteredCharts = useMemo(() => {
    return charts.filter(c => {
      if (search && !c.title_fr.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && c.workflow_status !== filterStatus) return false;
      if (filterCategory !== 'all' && c.category_id !== filterCategory) return false;
      return true;
    });
  }, [charts, search, filterStatus, filterCategory]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-400" size={40} /></div>;

  return (
    <div className="space-y-6">

      <button
        onClick={() => setAdminView('globe')}
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminView === 'globe' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
      >
        📢 Ticker Stats
      </button>
      {adminView === 'charts' && (
        <>
          {/* VUE LISTE */}
          {view === 'list' && (
            <>
              {/* Filtres originaux */}
              <div className="flex flex-wrap gap-3 items-center bg-[#0f0f0f] p-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white/5 rounded-lg px-3 py-2">
                  <Search size={14} className="text-gray-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un graphique..."
                    className="bg-transparent text-white text-sm outline-none flex-1" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none">
                  <option value="all">Tous statuts</option>
                  {Object.entries(WORKFLOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none">
                  <option value="all">Toutes catégories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCharts.length === 0 && <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500">Aucun graphique trouvé.</div>}

                {filteredCharts.map(chart => {
                  const wf = WORKFLOW_LABELS[chart.workflow_status] || WORKFLOW_LABELS.draft;
                  return (
                    <motion.div key={chart.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 hover:border-teal-500/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${wf.color}20`, color: wf.color }}>{wf.label}</span>
                        <div className="flex gap-2 text-gray-400">
                          <button onClick={() => setAuditModalChartId(chart.id)} className="hover:text-blue-400" title="Historique"><History size={15} /></button>
                          <button onClick={() => handleDuplicate(chart)} className="hover:text-amber-400" title="Dupliquer"><Copy size={15} /></button>
                          <button onClick={() => openForm(chart)} className="hover:text-teal-400"><Edit2 size={15} /></button>
                          <button onClick={() => handleDeleteChart(chart.id)} className="hover:text-red-400"><Trash2 size={15} /></button>
                        </div>
                      </div>
                      <h3 className="text-white font-bold mb-1 truncate">{chart.title_fr}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                        <BarChart3 size={12} />
                        <span className="uppercase">{CHART_TYPES.find(t => t.id === chart.chart_type)?.label || chart.chart_type}</span>
                        <span>•</span>
                        <span style={{ color: chart.category?.color }}>{chart.category?.name_fr || 'Sans catégorie'}</span>
                      </div>
                      {/* Badges restaurés */}
                      {chart.data_status !== 'final' && (
                        <span className="inline-block text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded mb-2">
                          {chart.data_status === 'provisional' ? 'Provisoire' : chart.data_status === 'estimated' ? 'Estimé' : 'Prévision'}
                        </span>
                      )}
                      <p className="text-gray-400 text-xs line-clamp-2">{chart.description_fr}</p>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* VUE FORMULAIRE */}
          <AnimatePresence>
            {view === 'form' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">

                {coherenceWarnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><AlertTriangle size={16} /> Points de vigilance</div>
                    {coherenceWarnings.map((w, i) => <p key={i} className="text-amber-300/80 text-xs pl-6">• {w}</p>)}
                  </div>
                )}

                <div className="bg-[#0f0f0f] p-6 rounded-xl border border-teal-500/20 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><LayoutGrid size={18} className="text-teal-400" /> Structure du Graphique</h3>
                    <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><X size={14} />Fermer</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1 font-mono">📊 Type de Graphique</label>
                      {/* Select groupé original */}
                      <select value={chartType} onChange={e => setChartType(e.target.value as ChartType)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500">
                        {['Composition', 'Évolution', 'Comparaison', 'Distribution', 'Démographie'].map(group => (
                          <optgroup key={group} label={group}>
                            {CHART_TYPES.filter(t => t.group === group).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-mono">🏷️ Catégorie</label>
                      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500">
                        <option value="">Sélectionner...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-mono">⚙️ Statut éditorial</label>
                      <select value={workflowStatus} onChange={e => setWorkflowStatus(e.target.value as WorkflowStatus)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500">
                        {Object.entries(WORKFLOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Titre *</label>
                      <input type="text" value={titleFr} onChange={e => setTitleFr(e.target.value)} placeholder="Ex: Investissements de la diaspora" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="correct-fr-title" label="Corriger" disabled={!titleFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'title')} />
                        <LinguaButton action="translate-en-title" label="FR→EN" disabled={!titleFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'title')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Title</label>
                      <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="translate-fr-title" label="EN→FR" disabled={!titleEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'title')} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Note Éditoriale</label>
                      <textarea value={descFr} onChange={e => setDescFr(e.target.value)} rows={3} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500 resize-none" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="correct-fr-desc" label="Corriger" disabled={!descFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'desc')} />
                        <LinguaButton action="translate-en-desc" label="FR→EN" disabled={!descFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'desc')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Editorial Note</label>
                      <textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={3} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500 resize-none" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="translate-fr-desc" label="EN→FR" disabled={!descEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'desc')} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-2">🔬 Rigueur méthodologique</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Statut des données</label>
                        <select value={dataStatus} onChange={e => setDataStatus(e.target.value as DataStatus)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-2 py-2 text-white text-xs outline-none">
                          <option value="final">Définitif</option>
                          <option value="provisional">Provisoire</option>
                          <option value="estimated">Estimé</option>
                          <option value="forecast">Prévision</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Date de référence</label>
                        <input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-2 py-2 text-white text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Marge d'erreur (%)</label>
                        <input type="number" value={marginError} onChange={e => setMarginError(e.target.value)} placeholder="Optionnel" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-2 py-2 text-white text-xs outline-none" />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-xs text-gray-300">
                          <input type="checkbox" checked={hasBreak} onChange={e => setHasBreak(e.target.checked)} /> Rupture de série
                        </label>
                      </div>
                    </div>

                    {hasBreak && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                        <div>
                          <label className="block text-[10px] text-amber-400 mb-1 uppercase">Note de rupture FR</label>
                          <textarea value={breakNoteFr} onChange={e => setBreakNoteFr(e.target.value)} rows={2} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                          <div className="flex gap-1 mt-1.5">
                            <LinguaButton action="correct-fr-breaknote" label="Corriger" disabled={!breakNoteFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'breaknote')} />
                            <LinguaButton action="translate-en-breaknote" label="FR→EN" disabled={!breakNoteFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'breaknote')} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-amber-400 mb-1 uppercase">Note de rupture EN</label>
                          <textarea value={breakNoteEn} onChange={e => setBreakNoteEn(e.target.value)} rows={2} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                          <div className="flex gap-1 mt-1.5">
                            <LinguaButton action="translate-fr-breaknote" label="EN→FR" disabled={!breakNoteEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'breaknote')} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Méthodologie FR</label>
                        <textarea value={methodologyFr} onChange={e => setMethodologyFr(e.target.value)} rows={2} placeholder="Enquête, données administratives..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                        <div className="flex gap-1 mt-1.5">
                          <LinguaButton action="correct-fr-methodology" label="Corriger" disabled={!methodologyFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'methodology')} />
                          <LinguaButton action="translate-en-methodology" label="FR→EN" disabled={!methodologyFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'methodology')} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Méthodologie EN</label>
                        <textarea value={methodologyEn} onChange={e => setMethodologyEn(e.target.value)} rows={2} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                        <div className="flex gap-1 mt-1.5">
                          <LinguaButton action="translate-fr-methodology" label="EN→FR" disabled={!methodologyEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'methodology')} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Champ / Population couverte FR</label>
                        <input type="text" value={popScopeFr} onChange={e => setPopScopeFr(e.target.value)} placeholder="Ex: Diaspora congolaise" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                        <div className="flex gap-1 mt-1.5">
                          <LinguaButton action="correct-fr-popscope" label="Corriger" disabled={!popScopeFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'popscope')} />
                          <LinguaButton action="translate-en-popscope" label="FR→EN" disabled={!popScopeFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'popscope')} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase">Champ / Population couverte EN</label>
                        <input type="text" value={popScopeEn} onChange={e => setPopScopeEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                        <div className="flex gap-1 mt-1.5">
                          <LinguaButton action="translate-fr-popscope" label="EN→FR" disabled={!popScopeEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'popscope')} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">Unité FR</label>
                      <input type="text" value={unitFr} onChange={e => setUnitFr(e.target.value)} placeholder="Milliards $" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="correct-fr-unit" label="Corriger" disabled={!unitFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'unit')} />
                        <LinguaButton action="translate-en-unit" label="FR→EN" disabled={!unitFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'unit')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">Unité EN</label>
                      <input type="text" value={unitEn} onChange={e => setUnitEn(e.target.value)} placeholder="Billions $" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="translate-fr-unit" label="EN→FR" disabled={!unitEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'unit')} />
                      </div>
                    </div>
                    {chartType === 'combo' && (
                      <>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase">Unité sec. FR</label>
                          <input type="text" value={secUnitFr} onChange={e => setSecUnitFr(e.target.value)} placeholder="%" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                          <div className="flex gap-1 mt-1.5">
                            <LinguaButton action="correct-fr-secunit" label="Corriger" disabled={!secUnitFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'secunit')} />
                            <LinguaButton action="translate-en-secunit" label="FR→EN" disabled={!secUnitFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'secunit')} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase">Unité sec. EN</label>
                          <input type="text" value={secUnitEn} onChange={e => setSecUnitEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                          <div className="flex gap-1 mt-1.5">
                            <LinguaButton action="translate-fr-secunit" label="EN→FR" disabled={!secUnitEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'secunit')} />
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">Source FR</label>
                      <input type="text" value={sourceFr} onChange={e => setSourceFr(e.target.value)} placeholder="BAD, 2024" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="correct-fr-source" label="Corriger" disabled={!sourceFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'source')} />
                        <LinguaButton action="translate-en-source" label="FR→EN" disabled={!sourceFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'source')} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">Source EN</label>
                      <input type="text" value={sourceEn} onChange={e => setSourceEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                      <div className="flex gap-1 mt-1.5">
                        <LinguaButton action="translate-fr-source" label="EN→FR" disabled={!sourceEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'source')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">🔗 URL Source vérifiable</label>
                      <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-teal-400 flex items-center gap-2"><Sparkles size={14} /> Accessibilité (texte alternatif)</h4>
                      <button onClick={autoGenerateAltText} className="text-xs bg-teal-500/10 text-teal-400 px-3 py-1 rounded-lg hover:bg-teal-500/20">Générer automatiquement</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <textarea value={altTextFr} onChange={e => setAltTextFr(e.target.value)} rows={2} placeholder="Description du graphique pour lecteurs d'écran" className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                        <div className="flex gap-1 mt-1.5">
                          <LinguaButton action="correct-fr-alttext" label="Corriger" disabled={!altTextFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'alttext')} />
                          <LinguaButton action="translate-en-alttext" label="FR→EN" disabled={!altTextFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'alttext')} />
                        </div>
                      </div>
                      <div>
                        <textarea value={altTextEn} onChange={e => setAltTextEn(e.target.value)} rows={2} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                        <div className="flex gap-1 mt-1.5">
                          <LinguaButton action="translate-fr-alttext" label="EN→FR" disabled={!altTextEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'alttext')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gestionnaires TOUJOURS visibles */}
                <SeriesManager series={series} setSeries={setSeries} chartType={chartType} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DataEditor
                    chartType={chartType}
                    series={series}
                    dataPoints={dataPoints}
                    setDataPoints={setDataPoints}
                    onDelete={(id) => setDeletedDataIds(prev => [...prev, id])}
                    showMsg={showMsg}
                  />
                  <div className="bg-[#020111] p-5 rounded-xl border border-white/10 h-[500px] flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent pointer-events-none" />
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-2 relative z-10">Aperçu en direct</h3>
                    <p className="text-xs text-gray-500 mb-4 relative z-10">{titleFr || 'Titre du graphique'}</p>
                    <div className="flex-1 relative z-10">
                      <ChartPreview chartType={chartType} series={series} dataPoints={dataPoints} annotations={annotations} />
                    </div>
                  </div>
                </div>

                <AnnotationsManager annotations={annotations} setAnnotations={setAnnotations} />

                <div className="flex justify-end gap-3 pt-6">
                  <button onClick={resetForm} className="px-6 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all">Annuler</button>
                  <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-500 transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {editingId ? 'Mettre à jour' : 'Publier le graphique'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {auditModalChartId && <AuditHistoryModal chartId={auditModalChartId} onClose={() => setAuditModalChartId(null)} />}
        </>
      )}

      {adminView === 'globe' && (
        <MacroTickerManager showMsg={showMsg} />
      )}
    </div>
  );
}