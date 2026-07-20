"use client";
import React, { useState } from 'react';
import { Plus, Trash2, Layers, Languages, SpellCheck, Loader2 } from 'lucide-react';
import { MacroSeries, ChartType } from './types';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

export default function SeriesManager({
  series, setSeries, chartType,
}: {
  series: MacroSeries[];
  setSeries: (s: MacroSeries[]) => void;
  chartType: ChartType;
}) {
  const isCombo = chartType === 'combo';
  const [processingId, setProcessingId] = useState<string | null>(null);

  const addSeries = () => {
    setSeries([...series, {
      id: crypto.randomUUID(), name_fr: '', name_en: '', color: '#14b8a6',
      render_as: 'bar', axis: 'primary', sort_order: series.length,
    }]);
  };

  const update = (idx: number, field: keyof MacroSeries, value: any) => {
    const next = series.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setSeries(next);
  };

  const remove = (idx: number) => {
    const next = [...series];
    next.splice(idx, 1);
    setSeries(next);
  };

  const handleTranslate = async (idx: number, text: string, direction: 'fr-en' | 'en-fr') => {
  if (!text) return;
  setProcessingId(`s-${idx}-${direction}`);
  try {
    // ⬇️ FIX : on passe la langue SOURCE du texte, pas la cible
    const sourceLang = direction === 'fr-en' ? 'fr' : 'en';
    const res = await autoTranslate(text, sourceLang);
    update(idx, direction === 'fr-en' ? 'name_en' : 'name_fr', res);
  } catch {}
  setProcessingId(null);
};

  const handleCorrect = async (idx: number, text: string) => {
    if (!text) return;
    setProcessingId(`s-${idx}-correct`);
    try {
      const res = await autoCorrect(text, 'fr');
      update(idx, 'name_fr', res);
    } catch {}
    setProcessingId(null);
  };

  return (
    <div className="bg-[#0f0f0f] p-5 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-teal-400" /> Séries de données
        </h3>
        <button onClick={addSeries} className="bg-teal-500/10 text-teal-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-500/20 flex items-center gap-1">
          <Plus size={14} /> Série
        </button>
      </div>

      {series.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          Ce type de graphique nécessite au moins 2 séries (ex: "Hommes" / "Femmes", ou "RDC" / "Rwanda").
        </p>
      )}

      <div className="space-y-2">
        {series.map((s, idx) => (
          <div key={s.id} className="flex flex-col gap-2 bg-[#1a1a1a] border border-white/5 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <input type="color" value={s.color} onChange={e => update(idx, 'color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none shrink-0" />
              
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Nom FR" value={s.name_fr} onChange={e => update(idx, 'name_fr', e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-teal-500" />
                  <button onClick={() => handleCorrect(idx, s.name_fr)} disabled={!s.name_fr || processingId === `s-${idx}-correct`} className="text-gray-400 hover:text-white">
                    {processingId === `s-${idx}-correct` ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
                  </button>
                  <button onClick={() => handleTranslate(idx, s.name_fr, 'fr-en')} disabled={!s.name_fr || processingId === `s-${idx}-fr-en`} className="text-gray-400 hover:text-white whitespace-nowrap">
                    {processingId === `s-${idx}-fr-en` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline"/> FR→EN</span>}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Name EN" value={s.name_en || ''} onChange={e => update(idx, 'name_en', e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-teal-500" />
                  <button onClick={() => handleTranslate(idx, s.name_en || '', 'en-fr')} disabled={!s.name_en || processingId === `s-${idx}-en-fr`} className="text-gray-400 hover:text-white whitespace-nowrap">
                    {processingId === `s-${idx}-en-fr` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline"/> EN→FR</span>}
                  </button>
                </div>
              </div>
              <button onClick={() => remove(idx)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
            </div>

            {isCombo && (
              <div className="flex gap-2 pl-10 border-t border-white/5 pt-2">
                <select value={s.render_as} onChange={e => update(idx, 'render_as', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none">
                  <option value="bar">Barre</option>
                  <option value="line">Ligne</option>
                </select>
                <select value={s.axis} onChange={e => update(idx, 'axis', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none">
                  <option value="primary">Axe principal</option>
                  <option value="secondary">Axe secondaire</option>
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}