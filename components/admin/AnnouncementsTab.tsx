"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Megaphone, Plus, Trash2, Power, 
  AlertTriangle, Info, ArrowUpCircle, Settings, Globe,
  Languages, SpellCheck, Palette, FastForward
} from 'lucide-react';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

// --- PRESET COLORS ---
const PRESET_COLORS = [
  { hex: '#2563eb', label: 'Bleu' },
  { hex: '#059669', label: 'Émeraude' },
  { hex: '#dc2626', label: 'Rouge' },
  { hex: '#d97706', label: 'Ambre' },
  { hex: '#9333ea', label: 'Violet' },
  { hex: '#d4af37', label: 'Doré' },
  { hex: '#171717', label: 'Noir' },
];

interface Announcement {
  id: string;
  type: 'info' | 'update' | 'maintenance';
  message_fr: string;
  message_en: string;
  is_active: boolean;
  is_blocking: boolean;
  bg_color: string;
  is_scrolling: boolean;
  created_at: string;
}

function LinguaButton({ action, label, disabled, isProcessing, onClick }: {
  action: string; label: string; disabled: boolean; isProcessing: string | null; onClick: () => void;
}) {
  const loading = isProcessing === action;
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className="p-1.5 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 disabled:opacity-30 flex items-center gap-1 transition-colors">
      {loading ? <Loader2 size={10} className="animate-spin" /> : action.includes('translate') ? <Languages size={10} /> : <SpellCheck size={10} />}
      {label}
    </button>
  );
}

export default function AnnouncementsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Form States
  const [newMessageFr, setNewMessageFr] = useState('');
  const [newMessageEn, setNewMessageEn] = useState('');
  const [newType, setNewType] = useState<'info' | 'update' | 'maintenance'>('info');
  const [isBlocking, setIsBlocking] = useState(false);
  const [newBgColor, setNewBgColor] = useState('#2563eb');
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => { fetchAnnouncements(); }, []);

  async function fetchAnnouncements() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('global_announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) showMsg('error', "Erreur de chargement.");
    else setAnnouncements(data || []);
    setIsLoading(false);
  }

  const handleLingua = useCallback(async (action: 'translate-fr' | 'translate-en' | 'correct-fr' | 'correct-en') => {
    setIsProcessing(action);
    try {
      let sourceText = '';
      let setter: (val: string) => void = () => {};
      
      if (action === 'translate-en') { sourceText = newMessageFr; setter = setNewMessageEn; }
      if (action === 'translate-fr') { sourceText = newMessageEn; setter = setNewMessageFr; }
      if (action === 'correct-fr')   { sourceText = newMessageFr; setter = setNewMessageFr; }
      if (action === 'correct-en')   { sourceText = newMessageEn; setter = setNewMessageEn; }

      if (!sourceText.trim()) { showMsg('error', 'Texte source vide'); setIsProcessing(null); return; }

      let sourceLangForApi: 'fr' | 'en' = 'fr';
      if (action === 'translate-en') sourceLangForApi = 'fr';
      if (action === 'translate-fr') sourceLangForApi = 'en';
      if (action === 'correct-en') sourceLangForApi = 'en';
      if (action === 'correct-fr') sourceLangForApi = 'fr';

      const result = action.startsWith('translate')
        ? await autoTranslate(sourceText, sourceLangForApi)
        : await autoCorrect(sourceText, sourceLangForApi);

      setter(result);
      showMsg('success', action.startsWith('translate') ? 'Traduction appliquée !' : 'Correction appliquée !');
    } catch (e) { showMsg('error', 'Erreur Lingua'); }
    setIsProcessing(null);
  }, [newMessageFr, newMessageEn, showMsg]);

  async function createAnnouncement() {
    if (!newMessageFr) return showMsg('error', 'Le message en français est requis.');
    
    setIsSaving(true);
    const { error } = await supabase.from('global_announcements').insert([{
      type: newType,
      message_fr: newMessageFr,
      message_en: newMessageEn || newMessageFr,
      is_active: false,
      is_blocking: newType === 'maintenance' ? isBlocking : false,
      bg_color: newBgColor,
      is_scrolling: isScrolling
    }]);

    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', 'Annonce créée avec succès !');
      setNewMessageFr(''); setNewMessageEn(''); setNewType('info');
      setIsBlocking(false); setIsScrolling(false); setNewBgColor('#2563eb');
      fetchAnnouncements();
    }
    setIsSaving(false);
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    if (!currentStatus) await supabase.from('global_announcements').update({ is_active: false }).not('id', 'is', null);
    const { error } = await supabase.from('global_announcements').update({ is_active: !currentStatus }).eq('id', id);
    if (error) showMsg('error', error.message);
    else { showMsg('success', !currentStatus ? 'Diffusé en direct !' : 'Retiré.'); fetchAnnouncements(); }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Supprimer définitivement cette annonce ?')) return;
    const { error } = await supabase.from('global_announcements').delete().eq('id', id);
    if (error) showMsg('error', error.message);
    else { showMsg('success', 'Supprimée.'); fetchAnnouncements(); }
  }

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-[#D4AF37]" size={40} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/20">
          <Megaphone className="text-indigo-400" size={28} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-white">Annonces Globales</h2>
          <p className="text-gray-400 text-sm mt-1">Gérez vos bannières et écrans de maintenance.</p>
        </div>
      </div>

      {/* CREATE FORM */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50" />
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><Plus size={18} className="text-indigo-400" /> Rédiger une nouvelle annonce</h3>
        
        <div className="space-y-6">
          <div>
            <label className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3 block">Type d'événement</label>
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'info', icon: <Info size={16}/>, label: 'Information', color: 'blue' },
                { id: 'update', icon: <ArrowUpCircle size={16}/>, label: 'Mise à jour', color: 'emerald' },
                { id: 'maintenance', icon: <Settings size={16}/>, label: 'Maintenance', color: 'red' }
              ].map((t) => (
                <button key={t.id} onClick={() => setNewType(t.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${newType === t.id ? `bg-${t.color}-500/20 border-${t.color}-500/50 text-${t.color}-400` : 'bg-[#141414] border-white/5 text-gray-500'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-mono text-gray-400 mb-1.5 block">🇫🇷 Message (Français)</label>
              <textarea value={newMessageFr} onChange={(e) => setNewMessageFr(e.target.value)} className="w-full bg-[#141414] text-white p-4 rounded-xl border border-white/10 focus:border-indigo-500/50 outline-none resize-none" rows={3} placeholder="Ex: Une maintenance est prévue..." />
              <div className="flex gap-1 mt-1.5">
                <LinguaButton action="correct-fr" label="Corriger" disabled={!newMessageFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr')} />
                <LinguaButton action="translate-en" label="FR→EN" disabled={!newMessageFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en')} />
              </div>
            </div>
            <div>
              <label className="text-xs font-mono text-gray-400 mb-1.5 block">🇬🇧 Message (Anglais)</label>
              <textarea value={newMessageEn} onChange={(e) => setNewMessageEn(e.target.value)} className="w-full bg-[#141414] text-white p-4 rounded-xl border border-white/10 focus:border-indigo-500/50 outline-none resize-none" rows={3} placeholder="Ex: Maintenance is scheduled..." />
              <div className="flex gap-1 mt-1.5">
                <LinguaButton action="correct-en" label="Correct" disabled={!newMessageEn} isProcessing={isProcessing} onClick={() => handleLingua('correct-en')} />
                <LinguaButton action="translate-fr" label="EN→FR" disabled={!newMessageEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr')} />
              </div>
            </div>
          </div>

          {/* OPTIONS DE DESIGN (COULEUR ET DÉFILANT) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#141414] rounded-xl border border-white/5">
            
            {/* COULEUR DE FOND */}
            <div>
              <label className="text-xs font-mono text-gray-400 mb-3 flex items-center gap-2"><Palette size={14}/> Couleur de la bannière</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c.hex} onClick={() => setNewBgColor(c.hex)} className={`w-8 h-8 rounded-full border-2 transition-all ${newBgColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.hex }} title={c.label} />
                ))}
                <div className="h-6 w-px bg-white/10 mx-1" />
                <input type="color" value={newBgColor} onChange={(e) => setNewBgColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0" title="Couleur personnalisée" />
              </div>
            </div>

            {/* TEXTE DÉFILANT */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1 flex items-center gap-2"><FastForward size={14}/> Texte défilant (Marquee)</label>
                <p className="text-[10px] text-gray-500">Idéal pour les messages très longs.</p>
              </div>
              <button onClick={() => setIsScrolling(!isScrolling)} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isScrolling ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                <motion.div layout className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" animate={{ left: isScrolling ? "26px" : "4px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </button>
            </div>
          </div>

          {/* MAINTENANCE BLOQUANTE */}
          <AnimatePresence>
            {newType === 'maintenance' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl mt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-400">Maintenance Bloquante (Jeu Awalé)</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Si activé, les utilisateurs verront le mini-jeu Awalé à la place du site. (La couleur et le défilement seront ignorés).</p>
                    </div>
                  </div>
                  <button onClick={() => setIsBlocking(!isBlocking)} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isBlocking ? 'bg-red-500' : 'bg-gray-700'}`}>
                    <motion.div layout className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" animate={{ left: isBlocking ? "26px" : "4px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button onClick={createAnnouncement} disabled={isSaving || !newMessageFr} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Créer et ajouter à la liste
            </button>
          </div>
        </div>
      </motion.div>

      {/* LISTE DES ANNONCES */}
      <div className="space-y-4">
        <h3 className="text-lg font-serif text-white flex items-center gap-2"><Globe size={18} className="text-gray-400" /> Annonces enregistrées</h3>
        {announcements.map((ann) => (
          <motion.div key={ann.id} layout className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row justify-between gap-6 ${ann.is_active ? 'bg-[#141414] border-[#D4AF37]/50 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'bg-[#0a0a0a] border-white/5'}`}>
            {ann.is_active && <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />}
            
            <div className="flex-1 space-y-3 z-10">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] uppercase px-2.5 py-1 rounded-md font-bold bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                  {ann.type === 'maintenance' ? <Settings size={12}/> : ann.type === 'update' ? <ArrowUpCircle size={12}/> : <Info size={12}/>}
                  {ann.type}
                </span>
                {/* Pastille de couleur */}
                {!ann.is_blocking && <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: ann.bg_color || '#2563eb' }} />Couleur</span>}
                {/* Badge défilant */}
                {ann.is_scrolling && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><FastForward size={10}/> Défilant</span>}
                {/* Badge bloquant */}
                {ann.is_blocking && <span className="text-[10px] uppercase px-2.5 py-1 rounded-md font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5"><AlertTriangle size={12} /> Écran Bloqué</span>}
                
                {ann.is_active && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#D4AF37] px-2 py-1 rounded-md bg-[#D4AF37]/10 ml-auto md:ml-2">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span></span> EN DIRECT
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-1">
                <div><p className="text-gray-200 text-sm leading-relaxed">{ann.message_fr}</p></div>
                {ann.message_en && <div><p className="text-gray-400 text-sm leading-relaxed">{ann.message_en}</p></div>}
              </div>
            </div>

            <div className="flex items-center gap-3 z-10 md:pl-6 md:border-l border-white/10 shrink-0">
              <button onClick={() => toggleActive(ann.id, ann.is_active)} className={`flex flex-col items-center justify-center w-20 h-16 rounded-xl transition-all border ${ann.is_active ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                <Power size={20} className="mb-1" />
                <span className="text-[10px] font-bold uppercase">{ann.is_active ? 'Arrêter' : 'Diffuser'}</span>
              </button>
              <button onClick={() => deleteAnnouncement(ann.id)} className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={18} /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}