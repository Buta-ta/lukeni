"use client";
import React, { useState } from 'react';
import { Plus, Trash2, Languages, SpellCheck, Loader2 } from 'lucide-react';
import { MacroAnnotation } from './types';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

export default function AnnotationsManager({ annotations, setAnnotations }: { annotations: MacroAnnotation[], setAnnotations: any }) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const add = () => setAnnotations([...annotations, { id: crypto.randomUUID(), period: '', label_fr: '', color: '#D4AF37' }]);

  const update = (id: string, field: string, value: string) => {
    setAnnotations(annotations.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

 const handleTranslate = async (id: string, text: string, direction: 'fr-en' | 'en-fr') => {
  if (!text) return;
  setProcessingId(`${id}-${direction}`);
  try {
    // ⬇️ FIX : langue source, pas cible
    const sourceLang = direction === 'fr-en' ? 'fr' : 'en';
    const res = await autoTranslate(text, sourceLang);
    update(id, direction === 'fr-en' ? 'label_en' : 'label_fr', res);
  } catch {}
  setProcessingId(null);
};

  const handleCorrect = async (id: string, text: string) => {
    if (!text) return;
    setProcessingId(`${id}-correct`);
    try {
      const res = await autoCorrect(text, 'fr');
      update(id, 'label_fr', res);
    } catch {}
    setProcessingId(null);
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-bold text-sm uppercase tracking-wider">Événements & Repères (Optionnel)</h4>
        <button onClick={add} className="flex items-center gap-2 text-xs bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded hover:bg-amber-500/30 transition-colors">
          <Plus size={14} /> Ajouter un repère
        </button>
      </div>

      <div className="space-y-3">
        {annotations.map(a => (
          <div key={a.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-white/5">
            <input type="color" value={a.color} onChange={e => update(a.id, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
            <input type="text" value={a.period} onChange={e => update(a.id, 'period', e.target.value)} placeholder="Position X (ex: 2020)" className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none text-center" />
            
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input type="text" value={a.label_fr} onChange={e => update(a.id, 'label_fr', e.target.value)} placeholder="Texte FR" className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none" />
                <button onClick={() => handleCorrect(a.id, a.label_fr)} disabled={!a.label_fr || processingId === `${a.id}-correct`} className="text-gray-400 hover:text-white">
                  {processingId === `${a.id}-correct` ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
                </button>
                <button onClick={() => handleTranslate(a.id, a.label_fr, 'fr-en')} disabled={!a.label_fr || processingId === `${a.id}-fr-en`} className="text-gray-400 hover:text-white whitespace-nowrap">
                  {processingId === `${a.id}-fr-en` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline"/> FR→EN</span>}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input type="text" value={a.label_en || ''} onChange={e => update(a.id, 'label_en', e.target.value)} placeholder="Texte EN" className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none" />
                <button onClick={() => handleTranslate(a.id, a.label_en || '', 'en-fr')} disabled={!a.label_en || processingId === `${a.id}-en-fr`} className="text-gray-400 hover:text-white whitespace-nowrap">
                  {processingId === `${a.id}-en-fr` ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[9px] font-bold"><Languages size={10} className="inline"/> EN→FR</span>}
                </button>
              </div>
            </div>

            <button onClick={() => setAnnotations(annotations.filter(x => x.id !== a.id))} className="p-2 text-gray-500 hover:text-red-400">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {annotations.length === 0 && <p className="text-xs text-gray-500 text-center py-2">Aucun repère configuré.</p>}
      </div>
    </div>
  );
}