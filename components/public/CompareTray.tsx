"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { MacroChart } from '@/components/admin/macro/types';

export function CompareTray({
  selected, onRemove, onCompare, lang,
}: {
  selected: MacroChart[];
  onRemove: (id: string) => void;
  onCompare: () => void;
  lang: 'fr' | 'en';
}) {
  if (selected.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#020111] via-[#0a0a1a] to-transparent backdrop-blur-xl border-t border-white/10 p-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {selected.map((chart, idx) => (
              <div key={chart.id} className="flex items-center gap-2">
                {idx > 0 && <ArrowRight size={16} className="text-[#D4AF37] flex-shrink-0" />}
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2 max-w-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chart.category?.color || '#14b8a6' }} />
                  <span className="text-xs text-white/70 truncate">{lang === 'fr' ? chart.title_fr : chart.title_en}</span>
                  <button onClick={() => onRemove(chart.id)} className="text-white/40 hover:text-white/80 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => selected.forEach(c => onRemove(c.id))} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors">
              {lang === 'fr' ? 'Effacer' : 'Clear'}
            </button>
            <button
              onClick={onCompare}
              disabled={selected.length < 2}
              className="px-4 py-2 text-xs font-bold bg-[#D4AF37] text-black rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {lang === 'fr' ? 'Comparer' : 'Compare'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}