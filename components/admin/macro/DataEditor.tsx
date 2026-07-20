"use client";
import React, { useRef, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Languages, Loader2, Upload, Download, Calculator, SpellCheck } from 'lucide-react';
import { autoTranslate, autoCorrect } from '@/lib/lingua';
import { parseCSV, downloadCSV, computeStats } from '@/lib/macroHelpers';
import { MacroDataPoint, MacroSeries, ChartType, MULTI_SERIES_TYPES, POINT_TYPES } from './types';

export default function DataEditor({
  chartType, series, dataPoints, setDataPoints, onDelete, showMsg,
}: {
  chartType: ChartType;
  series: MacroSeries[];
  dataPoints: MacroDataPoint[];
  setDataPoints: (d: MacroDataPoint[]) => void;
  onDelete: (id: string) => void;
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const isMultiSeries = MULTI_SERIES_TYPES.includes(chartType);
  const isPointMode = POINT_TYPES.includes(chartType);
  const [processing, setProcessing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyPoint = (sortOrder: number, seriesId: string | null = null): MacroDataPoint => ({
    id: crypto.randomUUID(), series_id: seriesId, label_fr: '', label_en: '', period: '',
    value: 0, x_value: 0, y_value: 0, size_value: 0, color: '#14b8a6',
    sort_order: sortOrder, is_total: false, data_status: null, annotation_fr: '', annotation_en: '',
  });

  const rowKeys = isMultiSeries
    ? Array.from(new Set(dataPoints.map(dp => dp.period || dp.label_fr)))
    : [];

  const addRow = () => {
    if (isMultiSeries) {
      const key = `row-${Date.now()}`;
      const newPoints = series.map((s, i) =>
        ({ ...emptyPoint(dataPoints.length + i, s.id), label_fr: '', period: key })
      );
      setDataPoints([...dataPoints, ...newPoints]);
    } else {
      setDataPoints([...dataPoints, emptyPoint(dataPoints.length)]);
    }
  };

  const updateSimplePoint = (idx: number, field: keyof MacroDataPoint, value: any) => {
    const next = dataPoints.map((dp, i) => i === idx ? { ...dp, [field]: value } : dp);
    setDataPoints(next);
  };

  const removeSimplePoint = (idx: number) => {
    const point = dataPoints[idx];
    if (point.id) onDelete(point.id);
    const next = [...dataPoints];
    next.splice(idx, 1);
    setDataPoints(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= dataPoints.length) return;
    const next = [...dataPoints];
    [next[idx], next[target]] = [next[target], next[idx]];
    const withOrder = next.map((p, i) => ({ ...p, sort_order: i }));
    setDataPoints(withOrder);
  };

  const update = (id: string, field: string, value: any) => {
    setDataPoints(dataPoints.map((d: any) => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleTranslate = async (id: string, text: string, fieldToUpdate: string, targetLang: 'fr' | 'en') => {
    if (!text) return;
    setProcessing(`${id}-${fieldToUpdate}`);
    try {
      // ⬇️ FIX : targetLang est la langue de sortie souhaitée,
      // donc la langue SOURCE du texte est l'opposé
      const sourceLang = targetLang === 'en' ? 'fr' : 'en';
      const res = await autoTranslate(text, sourceLang);
      update(id, fieldToUpdate, res);
    } catch { }
    setProcessing(null);
  };

  const handleCorrect = async (id: string, text: string, fieldToUpdate: string) => {
    if (!text) return;
    setProcessing(`${id}-correct-${fieldToUpdate}`);
    try {
      const res = await autoCorrect(text, 'fr');
      update(id, fieldToUpdate, res);
    } catch { }
    setProcessing(null);
  };

  const updateMatrixCell = (rowKey: string, seriesId: string, field: 'value' | 'label_fr' | 'label_en' | 'period', value: any) => {
    const next = dataPoints.map(dp => {
      const dpKey = dp.period || dp.label_fr;
      if (dpKey !== rowKey) return dp;
      if (field === 'value') {
        return dp.series_id === seriesId ? { ...dp, value: Number(value) || 0 } : dp;
      }
      return { ...dp, [field]: value };
    });
    setDataPoints(next);
  };
  const handleMatrixTranslate = async (rowKey: string, text: string, targetLang: 'fr' | 'en') => {
    if (!text) return;
    setProcessing(`matrix-${rowKey}-${targetLang}`);
    try {
      // ⬇️ FIX : idem, langue source = opposé de la langue cible
      const sourceLang = targetLang === 'en' ? 'fr' : 'en';
      const res = await autoTranslate(text, sourceLang);
      updateMatrixCell(rowKey, '', targetLang === 'en' ? 'label_en' : 'label_fr', res);
    } catch { }
    setProcessing(null);
  };

  const handleMatrixCorrect = async (rowKey: string, text: string) => {
    if (!text) return;
    setProcessing(`matrix-${rowKey}-correct`);
    try {
      const res = await autoCorrect(text, 'fr');
      updateMatrixCell(rowKey, '', 'label_fr', res);
    } catch { }
    setProcessing(null);
  };

  const removeRow = (rowKey: string) => {
    const toRemove = dataPoints.filter(dp => (dp.period || dp.label_fr) === rowKey);
    toRemove.forEach(dp => { if (dp.id) onDelete(dp.id); });
    setDataPoints(dataPoints.filter(dp => (dp.period || dp.label_fr) !== rowKey));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const raw = String(evt.target?.result || '');
      const rows = parseCSV(raw);
      const [header, ...body] = rows;

      if (isMultiSeries) {
        const seriesNames = header.slice(1);
        const newPoints: MacroDataPoint[] = [];
        body.forEach((row, ri) => {
          const label = row[0];
          seriesNames.forEach((sName, si) => {
            const matchedSeries = series.find(s => s.name_fr.toLowerCase() === sName.toLowerCase());
            if (!matchedSeries) return;
            newPoints.push({ ...emptyPoint(ri * seriesNames.length + si, matchedSeries.id), label_fr: label, period: label, value: Number(row[si + 1]) || 0 });
          });
        });
        setDataPoints(newPoints);
      } else if (isPointMode) {
        const newPoints = body.map((row, i) => ({
          ...emptyPoint(i), label_fr: row[0] || '', x_value: Number(row[1]) || 0,
          y_value: Number(row[2]) || 0, size_value: Number(row[3]) || 0,
        }));
        setDataPoints(newPoints);
      } else {
        const newPoints = body.map((row, i) => ({
          ...emptyPoint(i), label_fr: row[0] || '', label_en: row[1] || '', value: Number(row[2]) || 0,
        }));
        setDataPoints(newPoints);
      }
      showMsg('success', `${body.length} lignes importées.`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExport = () => {
    let rows: (string | number)[][] = [];
    if (isMultiSeries) {
      rows.push(['Label', ...series.map(s => s.name_fr)]);
      rowKeys.forEach(key => {
        const rowPoints = dataPoints.filter(dp => (dp.period || dp.label_fr) === key);
        rows.push([key, ...series.map(s => rowPoints.find(p => p.series_id === s.id)?.value ?? 0)]);
      });
    } else if (isPointMode) {
      rows.push(['Label', 'X', 'Y', 'Taille']);
      dataPoints.forEach(dp => rows.push([dp.label_fr, dp.x_value ?? 0, dp.y_value ?? 0, dp.size_value ?? 0]));
    } else {
      rows.push(['Label FR', 'Label EN', 'Valeur']);
      dataPoints.forEach(dp => rows.push([dp.label_fr, dp.label_en, dp.value ?? 0]));
    }
    downloadCSV('donnees-graphique.csv', rows);
  };

  const numericValues = isMultiSeries
    ? dataPoints.map(dp => dp.value || 0)
    : isPointMode
      ? dataPoints.map(dp => dp.y_value || 0)
      : dataPoints.map(dp => dp.value || 0);
  const stats = computeStats(numericValues);

  return (
    <div className="bg-[#0f0f0f] p-5 rounded-xl border border-white/10 flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Les Données</h3>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="p-1.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 flex items-center gap-1 text-xs">
            <Upload size={12} /> Importer CSV
          </button>
          <button onClick={handleExport} className="p-1.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 flex items-center gap-1 text-xs">
            <Download size={12} /> Exporter
          </button>
          <button onClick={addRow} className="bg-teal-500/10 text-teal-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-500/20 flex items-center gap-1">
            <Plus size={14} /> Ligne
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        {[
          { label: 'Min', value: stats.min },
          { label: 'Max', value: stats.max },
          { label: 'Moyenne', value: stats.mean.toFixed(1) },
          { label: 'Évolution', value: stats.evolutionPct !== null ? `${stats.evolutionPct.toFixed(1)}%` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 rounded-lg py-1.5">
            <div className="text-[9px] text-gray-500 uppercase flex items-center justify-center gap-1"><Calculator size={9} />{s.label}</div>
            <div className="text-sm font-mono text-teal-400">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2">

        {/* MODE MULTI-SÉRIES */}
        {isMultiSeries && rowKeys.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">Ajoutez une ligne (période/catégorie) et définissez des séries.</div>
        )}
        {isMultiSeries && rowKeys.map(rowKey => {
          const rowPoints = dataPoints.filter(dp => (dp.period || dp.label_fr) === rowKey);
          const stableKey = rowPoints[0]?.id || rowKey; // Fix pour la perte de curseur !
          const labelFr = rowPoints[0]?.label_fr ?? '';
          const labelEn = rowPoints[0]?.label_en ?? '';
          return (
            <div key={stableKey} className="p-3 bg-[#1a1a1a] border border-white/5 rounded-lg space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Label / Période FR (ex: 2024)" value={labelFr}
                    onChange={e => updateMatrixCell(rowKey, '', 'label_fr', e.target.value)}
                    className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-white text-sm outline-none focus:border-teal-500" />
                  <button onClick={() => handleMatrixCorrect(rowKey, labelFr)} className="text-gray-400 hover:text-white">
                    {processing === `matrix-${rowKey}-correct` ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
                  </button>
                  <button onClick={() => handleMatrixTranslate(rowKey, labelFr, 'en')} className="text-gray-400 hover:text-white whitespace-nowrap">
                    {processing === `matrix-${rowKey}-en` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline" /> FR→EN</span>}
                  </button>
                  <button onClick={() => removeRow(rowKey)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
                <div className="flex items-center gap-2 pr-8">
                  <input type="text" placeholder="Label / Période EN" value={labelEn}
                    onChange={e => updateMatrixCell(rowKey, '', 'label_en', e.target.value)}
                    className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-white text-sm outline-none focus:border-teal-500" />
                  <button onClick={() => handleMatrixTranslate(rowKey, labelEn, 'fr')} className="text-gray-400 hover:text-white whitespace-nowrap">
                    {processing === `matrix-${rowKey}-fr` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline" /> EN→FR</span>}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {series.map(s => {
                  const point = rowPoints.find(p => p.series_id === s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-1 bg-white/5 rounded px-2 py-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-[10px] text-gray-400">{s.name_fr || '?'}</span>
                      <input type="number" value={point?.value ?? 0}
                        onChange={e => updateMatrixCell(rowKey, s.id, 'value', e.target.value)}
                        className="w-20 bg-transparent text-white text-sm font-mono outline-none" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* MODE POINT (scatter / bubble) */}
        {isPointMode && dataPoints.map((dp, idx) => (
          <div key={dp.id} className="flex flex-col gap-2 p-2 bg-[#1a1a1a] border border-white/5 rounded-lg">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Label FR" value={dp.label_fr ?? ''} onChange={e => updateSimplePoint(idx, 'label_fr', e.target.value)} className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-white text-sm outline-none" />
                <button onClick={() => handleCorrect(dp.id, dp.label_fr, 'label_fr')} className="text-gray-400 hover:text-white">
                  {processing === `${dp.id}-correct-label_fr` ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
                </button>
                <button onClick={() => handleTranslate(dp.id, dp.label_fr, 'label_en', 'en')} className="text-gray-400 hover:text-white whitespace-nowrap">
                  {processing === `${dp.id}-label_en` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline" /> FR→EN</span>}
                </button>
                <button onClick={() => removeSimplePoint(idx)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
              </div>
              <div className="flex items-center gap-2 pr-8">
                <input type="text" placeholder="Label EN" value={dp.label_en ?? ''} onChange={e => updateSimplePoint(idx, 'label_en', e.target.value)} className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-white text-sm outline-none" />
                <button onClick={() => handleTranslate(dp.id, dp.label_en, 'label_fr', 'fr')} className="text-gray-400 hover:text-white whitespace-nowrap">
                  {processing === `${dp.id}-label_fr` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline" /> EN→FR</span>}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <input type="number" placeholder="X" value={dp.x_value ?? 0} onChange={e => updateSimplePoint(idx, 'x_value', Number(e.target.value))} className="w-16 bg-white/5 rounded px-2 py-1 text-white text-sm font-mono outline-none" />
              <input type="number" placeholder="Y" value={dp.y_value ?? 0} onChange={e => updateSimplePoint(idx, 'y_value', Number(e.target.value))} className="w-16 bg-white/5 rounded px-2 py-1 text-white text-sm font-mono outline-none" />
              {chartType === 'bubble' && (
                <input type="number" placeholder="Taille" value={dp.size_value ?? 0} onChange={e => updateSimplePoint(idx, 'size_value', Number(e.target.value))} className="w-16 bg-white/5 rounded px-2 py-1 text-white text-sm font-mono outline-none" />
              )}
              <input type="color" value={dp.color ?? '#14b8a6'} onChange={e => updateSimplePoint(idx, 'color', e.target.value)} className="w-7 h-7 rounded cursor-pointer" />
            </div>
          </div>
        ))}

        {/* MODE SIMPLE */}
        {!isMultiSeries && !isPointMode && dataPoints.map((dp, idx) => (
          <div key={dp.id} className="flex flex-col gap-2 p-3 bg-[#1a1a1a] border border-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(idx, -1)} className="text-gray-500 hover:text-white"><ArrowUp size={12} /></button>
                <button onClick={() => move(idx, 1)} className="text-gray-500 hover:text-white"><ArrowDown size={12} /></button>
              </div>
              <input type="text" placeholder="Label FR" value={dp.label_fr ?? ''} onChange={e => updateSimplePoint(idx, 'label_fr', e.target.value)}
                className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-white text-sm outline-none focus:border-teal-500" />
              <button onClick={() => handleCorrect(dp.id, dp.label_fr, 'label_fr')} className="text-gray-400 hover:text-white">
                {processing === `${dp.id}-correct-label_fr` ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
              </button>
              <button onClick={() => handleTranslate(dp.id, dp.label_fr, 'label_en', 'en')} className="text-gray-400 hover:text-white whitespace-nowrap">
                {processing === `${dp.id}-label_en` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline" /> FR→EN</span>}
              </button>
            </div>
            <div className="flex items-center gap-2 pl-4">
              <input type="text" placeholder="Label EN" value={dp.label_en ?? ''} onChange={e => updateSimplePoint(idx, 'label_en', e.target.value)}
                className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-white text-sm outline-none focus:border-teal-500" />
              <button onClick={() => handleTranslate(dp.id, dp.label_en, 'label_fr', 'fr')} className="text-gray-400 hover:text-white whitespace-nowrap">
                {processing === `${dp.id}-label_fr` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline" /> EN→FR</span>}
              </button>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
              <input type="number" placeholder="Valeur" value={dp.value ?? 0} onChange={e => updateSimplePoint(idx, 'value', Number(e.target.value))}
                className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm font-mono outline-none focus:border-teal-500" />
              {chartType === 'line' || chartType === 'waterfall' ? (
                <input type="text" placeholder="Période (ex: 2024-Q1)" value={dp.period ?? ''} onChange={e => updateSimplePoint(idx, 'period', e.target.value)}
                  className="w-32 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none" />
              ) : null}
              {chartType === 'waterfall' && (
                <label className="flex items-center gap-1 text-xs text-gray-400">
                  <input type="checkbox" checked={dp.is_total ?? false} onChange={e => updateSimplePoint(idx, 'is_total', e.target.checked)} /> Total
                </label>
              )}
              <input type="color" value={dp.color ?? '#14b8a6'} onChange={e => updateSimplePoint(idx, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <select value={dp.data_status ?? ''} onChange={e => updateSimplePoint(idx, 'data_status', e.target.value || null)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none">
                <option value="">Statut par défaut</option>
                <option value="final">Définitif</option>
                <option value="provisional">Provisoire</option>
                <option value="estimated">Estimé</option>
                <option value="forecast">Prévision</option>
              </select>
              <div className="flex-1" />
              <button onClick={() => removeSimplePoint(idx)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}