"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Lightbulb, Trash2, Edit2, CheckCircle, XCircle, X, AlertTriangle, Languages, SpellCheck, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';
import { motion, AnimatePresence } from 'framer-motion';

interface Category { id: string; name_fr: string; name_en: string; }
interface TopicSuggestion { 
  id: string; 
  title_fr: string | null; 
  title_en: string | null; 
  description_fr: string | null; 
  description_en: string | null; 
  user_email: string; 
  category_id: string | null; 
  status: string; 
  admin_note: string | null; 
  created_at: string; 
  categories: Category | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  approved: { label: 'Approuvé', color: 'text-green-400', bg: 'bg-green-500/20' },
  rejected: { label: 'Rejeté', color: 'text-red-400', bg: 'bg-red-500/20' },
  completed: { label: 'Terminé', color: 'text-blue-400', bg: 'bg-blue-500/20' },
};

export default function TopicSuggestionsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // Modal States
  const [editingSuggestion, setEditingSuggestion] = useState<TopicSuggestion | null>(null);
  const [editTitleFr, setEditTitleFr] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editDescFr, setEditDescFr] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // 'translate-fr' | 'correct-en' etc...

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Fetch
  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('topic_suggestions')
        .select('*, categories(id, name_fr, name_en)')
        .order('created_at', { ascending: false });
      
      if (error) showMsg('error', error.message);
      else if (data) setSuggestions(data as unknown as TopicSuggestion[]);
      setIsLoading(false);
    }
    fetch();
  }, [showMsg]);

  // Filtered
  const filtered = useMemo(() => {
    if (filter === 'all') return suggestions;
    return suggestions.filter(s => s.status === filter);
  }, [suggestions, filter]);

  // Open Edit Modal
  const openEdit = (s: TopicSuggestion) => {
    setEditingSuggestion(s);
    setEditTitleFr(s.title_fr || '');
    setEditTitleEn(s.title_en || '');
    setEditDescFr(s.description_fr || '');
    setEditDescEn(s.description_en || '');
    setEditNote(s.admin_note || '');
  };

  // Close Modal
  const closeEdit = () => setEditingSuggestion(null);

  // Handle Lingua Actions inside Modal
  const handleLingua = async (action: string) => {
    setIsProcessing(action);
    try {
      if (action === 'translate-fr') setEditTitleFr(await autoTranslate(editTitleEn, 'en'));
      if (action === 'translate-en') setEditTitleEn(await autoTranslate(editTitleFr, 'fr'));
      if (action === 'correct-fr') setEditTitleFr(await autoCorrect(editTitleFr, 'fr'));
      if (action === 'correct-en') setEditTitleEn(await autoCorrect(editTitleEn, 'en'));
      if (action === 'translate-desc-fr') setEditDescFr(await autoTranslate(editDescEn, 'en'));
      if (action === 'translate-desc-en') setEditDescEn(await autoTranslate(editDescFr, 'fr'));
      if (action === 'correct-desc-fr') setEditDescFr(await autoCorrect(editDescFr, 'fr'));
      if (action === 'correct-desc-en') setEditDescEn(await autoCorrect(editDescEn, 'en'));
    } catch (err) {
      showMsg('error', 'Erreur API');
    }
    setIsProcessing(null);
  };

  // Save Changes
  const handleSave = async () => {
    if (!editingSuggestion) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('topic_suggestions')
      .update({
        title_fr: editTitleFr,
        title_en: editTitleEn,
        description_fr: editDescFr,
        description_en: editDescEn,
        admin_note: editNote
      })
      .eq('id', editingSuggestion.id);

    if (!error) {
      setSuggestions(suggestions.map(s => s.id === editingSuggestion.id ? { ...s, title_fr: editTitleFr, title_en: editTitleEn, description_fr: editDescFr, description_en: editDescEn, admin_note: editNote } : s));
      showMsg('success', 'Modifications sauvegardées !');
      closeEdit();
    } else showMsg('error', error.message);
    setIsSaving(false);
  };

  // Change Status
  const changeStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('topic_suggestions').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: newStatus } : s));
      showMsg('success', `Statut changé en "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
    } else showMsg('error', error.message);
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase.from('topic_suggestions').delete().eq('id', deleteConfirm.id);
    if (!error) {
      setSuggestions(suggestions.filter(s => s.id !== deleteConfirm.id));
      showMsg('success', 'Suggestion supprimée.');
      setDeleteConfirm(null);
    } else showMsg('error', error.message);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#D4AF37]" size={40} /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lightbulb className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Sujets Suggérés</h2>
          <p className="text-gray-400 text-xs md:text-sm">{suggestions.length} suggestions reçues</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {['all', 'pending', 'approved', 'rejected', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${filter === f ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30'}`}>
            {f === 'all' ? 'Tous' : STATUS_CONFIG[f]?.label || f}
            {f !== 'all' && <span className="ml-1 text-[10px] opacity-70">({suggestions.filter(s => s.status === f).length})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map(s => {
            const statusConf = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
            return (
              <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConf.bg} ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                    {s.categories && <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{s.categories.name_fr}</span>}
                  </div>
                  <p className="text-white font-medium text-sm truncate">{s.title_fr || 'Sans titre FR'}</p>
                  <p className="text-gray-500 text-xs italic truncate">{s.title_en || 'No EN title'}</p>
                  <p className="text-gray-600 text-[10px] mt-1 font-mono">{s.user_email} • {new Date(s.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {s.status === 'pending' && (
                    <>
                      <button onClick={() => changeStatus(s.id, 'approved')} className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-all" title="Approuver"><CheckCircle size={16} /></button>
                      <button onClick={() => changeStatus(s.id, 'rejected')} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all" title="Rejeter"><XCircle size={16} /></button>
                    </>
                  )}
                  <button onClick={() => openEdit(s)} className="p-2 bg-white/5 text-gray-400 hover:text-[#D4AF37] rounded-lg transition-all" title="Éditer/Traduire"><Edit2 size={16} /></button>
                  <button onClick={() => setDeleteConfirm({ id: s.id, title: s.title_fr || '' })} className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-all" title="Supprimer"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-8">Aucune suggestion trouvée.</p>}
      </div>

      {/* ============================================ */}
      {/* 📝 MODAL D'ÉDITION / TRADUCTION */}
      {/* ============================================ */}
      <AnimatePresence>
        {editingSuggestion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeEdit}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-6">
              
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-serif flex items-center gap-2"><Edit2 size={18} className="text-[#D4AF37]" /> Éditer la suggestion</h3>
                <button onClick={closeEdit} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>

              {/* TITRES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Titre FR</label>
                  <input type="text" value={editTitleFr} onChange={e => setEditTitleFr(e.target.value)} className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleLingua('correct-fr')} disabled={isProcessing === 'correct-fr'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><SpellCheck size={10} /> Corriger</button>
                    <button onClick={() => handleLingua('translate-fr')} disabled={isProcessing === 'translate-fr'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> Traduire EN→FR</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Titre EN</label>
                  <input type="text" value={editTitleEn} onChange={e => setEditTitleEn(e.target.value)} className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleLingua('correct-en')} disabled={isProcessing === 'correct-en'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><SpellCheck size={10} /> Correct</button>
                    <button onClick={() => handleLingua('translate-en')} disabled={isProcessing === 'translate-en'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> Translate FR→EN</button>
                  </div>
                </div>
              </div>

              {/* DESCRIPTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Description FR</label>
                  <textarea value={editDescFr} onChange={e => setEditDescFr(e.target.value)} rows={3} className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] resize-none" />
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleLingua('correct-desc-fr')} disabled={isProcessing === 'correct-desc-fr'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><SpellCheck size={10} /> Corriger</button>
                    <button onClick={() => handleLingua('translate-desc-fr')} disabled={isProcessing === 'translate-desc-fr'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> Traduire EN→FR</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Description EN</label>
                  <textarea value={editDescEn} onChange={e => setEditDescEn(e.target.value)} rows={3} className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] resize-none" />
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleLingua('correct-desc-en')} disabled={isProcessing === 'correct-desc-en'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><SpellCheck size={10} /> Correct</button>
                    <button onClick={() => handleLingua('translate-desc-en')} disabled={isProcessing === 'translate-desc-en'} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> Translate FR→EN</button>
                  </div>
                </div>
              </div>

              {/* ADMIN NOTE */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono">📝 Note Admin (interne)</label>
                <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" placeholder="Pourquoi rejeté, ou notes pour plus tard..." />
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
                <button onClick={closeEdit} className="px-4 py-2 bg-white/5 text-white rounded-lg text-sm hover:bg-white/10">Annuler</button>
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-[#D4AF37] text-black rounded-lg font-bold text-sm hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Sauvegarder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DELETE */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full"><AlertTriangle size={24} className="text-red-500" /></div>
                <h3 className="text-lg font-bold text-white">Supprimer ?</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">Supprimer définitivement la suggestion : "<span className="text-white">{deleteConfirm.title}</span>" ?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20">Annuler</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 flex items-center justify-center gap-2"><Trash2 size={16} /> Supprimer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}