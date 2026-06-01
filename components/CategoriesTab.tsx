"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, PlusCircle, Trash2, Tag, ToggleLeft, ToggleRight, Languages, Edit2, Search, X, AlertTriangle, Palette, BookOpen, Music, Newspaper, Library } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_OPTIONS = ['Globe', 'Music', 'BookOpen', 'Zap', 'Users', 'Tag', 'Star', 'MapPin', 'Heart', 'Palette'];
const COLOR_PRESETS = ['#D4AF37', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

const SPACES = [
  { key: 'show_encyclopedie', label: 'Encyclopédie', Icon: BookOpen, color: 'text-[#D4AF37]' },
  { key: 'show_voyage_musical', label: 'Voyage Musical', Icon: Music, color: 'text-purple-400' },
  { key: 'show_presse', label: 'Presse', Icon: Newspaper, color: 'text-blue-400' },
  { key: 'show_bibliotheque', label: 'Bibliothèque', Icon: Library, color: 'text-emerald-400' },
];

interface Category { 
  id: string; name_fr: string; name_en: string; slug: string; icon: string; color: string; is_active: boolean; 
  show_encyclopedie: boolean; show_voyage_musical: boolean; show_presse: boolean; show_bibliotheque: boolean; created_at: string;
}

export default function CategoriesTab({ showMsg, translateText }: { showMsg: (type: 'success' | 'error', text: string) => void; translateText: (text: string, lang: 'fr' | 'en') => Promise<string>; }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#D4AF37');
  const [spaces, setSpaces] = useState({ show_encyclopedie: true, show_voyage_musical: true, show_presse: true, show_bibliotheque: true });
  const [isAdding, setIsAdding] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
      if (error) showMsg('error', `Erreur: ${error.message}`);
      else if (data) setCategories(data as unknown as Category[]);
      setIsLoading(false);
    }
    fetch();
  }, [showMsg]);

  useEffect(() => {
    if (!editingId) {
      const generatedSlug = nameFr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  }, [nameFr, editingId]);

  const checkDuplicates = useCallback(async (nameFr: string, excludeId?: string): Promise<boolean> => {
    const { data } = await supabase.from('categories').select('id, name_fr').ilike('name_fr', nameFr.trim());
    if (data && data.length > 0) {
      const duplicate = data.find(c => c.id !== excludeId);
      if (duplicate) { showMsg('error', `Cette catégorie existe déjà (${duplicate.name_fr})`); return true; }
    }
    return false;
  }, [showMsg]);

  const resetForm = useCallback(() => {
    setNameFr(''); setNameEn(''); setSlug(''); setIcon('Tag'); setColor('#D4AF37');
    setSpaces({ show_encyclopedie: true, show_voyage_musical: true, show_presse: true, show_bibliotheque: true });
    setEditingId(null);
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!nameFr.trim()) return;
    setIsTranslating(true);
    try { const t = await translateText(nameFr.trim(), 'fr'); setNameEn(t); showMsg('success', 'Traduction appliquée !'); } 
    catch (err) { showMsg('error', 'Échec de la traduction'); } finally { setIsTranslating(false); }
  }, [nameFr, translateText, showMsg]);

  const handleAdd = async () => {
    const tFr = nameFr.trim(), tEn = nameEn.trim(), tSl = slug.trim();
    if (!tFr || !tEn || !tSl) return showMsg('error', 'Veuillez remplir le nom (FR/EN) et le slug.');
    if (await checkDuplicates(tFr, editingId || undefined)) return;
    setIsAdding(true);
    try {
      const payload = { name_fr: tFr, name_en: tEn, slug: tSl, icon, color, ...spaces };
      if (editingId) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editingId);
        if (error) throw error;
        setCategories(categories.map(c => c.id === editingId ? { ...c, ...payload } : c));
        showMsg('success', 'Catégorie mise à jour !');
      } else {
        const { data, error } = await supabase.from('categories').insert({ ...payload, is_active: true }).select().single();
        if (error || !data) throw new Error(error?.message || 'Erreur création');
        setCategories([data as unknown as Category, ...categories]);
        showMsg('success', 'Catégorie créée avec succès !');
      }
      resetForm();
    } catch (err: any) { showMsg('error', `Erreur: ${err.message}`); } finally { setIsAdding(false); }
  };

  const handleEdit = useCallback((cat: Category) => {
    setEditingId(cat.id); setNameFr(cat.name_fr); setNameEn(cat.name_en); setSlug(cat.slug); setIcon(cat.icon || 'Tag'); setColor(cat.color || '#D4AF37');
    setSpaces({ show_encyclopedie: cat.show_encyclopedie, show_voyage_musical: cat.show_voyage_musical, show_presse: cat.show_presse, show_bibliotheque: cat.show_bibliotheque });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleActive = useCallback(async (id: string, status: boolean) => {
    setCategories(categories.map(c => c.id === id ? { ...c, is_active: !status } : c));
    const { error } = await supabase.from('categories').update({ is_active: !status }).eq('id', id);
    if (error) { setCategories(categories.map(c => c.id === id ? { ...c, is_active: status } : c)); showMsg('error', error.message); }
    else showMsg('success', !status ? 'Catégorie activée' : 'Catégorie masquée');
  }, [categories, showMsg]);

  const deleteCategory = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== deleteConfirm.id));
      showMsg('success', 'Catégorie supprimée.'); setDeleteConfirm(null);
    } catch (err: any) { showMsg('error', `Erreur: ${err.message}`); }
  }, [deleteConfirm, categories, showMsg]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const t = searchTerm.toLowerCase();
    return categories.filter(c => c.name_fr.toLowerCase().includes(t) || c.name_en.toLowerCase().includes(t) || c.slug.toLowerCase().includes(t));
  }, [categories, searchTerm]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-[#D4AF37]" size={40} /><p className="text-gray-400 text-sm">Chargement...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Catégories</h2>
          <p className="text-gray-400 text-xs md:text-sm">Gérez les catégories et leur visibilité. {categories.length} catégories.</p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        {/* Form */}
        <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-lg border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingId ? <Edit2 size={18} className="text-[#D4AF37]" /> : <PlusCircle size={18} className="text-[#D4AF37]" />}
              {editingId ? 'Modifier' : 'Nouvelle catégorie'}
            </h3>
            {editingId && <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><X size={14} /> Annuler</button>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Nom (FR) *</label>
              <input type="text" value={nameFr} onChange={e => setNameFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Nom (EN) *</label>
              <input type="text" value={nameEn} onChange={e => setNameEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]" />
            </div>
            <div className="absolute right-0 md:-right-3 top-1/2 -translate-y-1/2">
              <button onClick={handleTranslate} disabled={isTranslating || !nameFr.trim()} className="bg-white/10 p-2 rounded-full hover:bg-[#D4AF37] hover:text-black disabled:opacity-30">
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">🔗 Slug *</label>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">💎 Icône</label>
              <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]">
                {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1"><Palette size={12} /> Couleur</label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 bg-transparent border border-white/20 rounded-lg cursor-pointer" />
                <div className="flex gap-1">
                  {COLOR_PRESETS.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Spaces Toggles */}
          <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-white/10">
            <p className="text-[10px] text-gray-500 mb-3 font-mono uppercase tracking-wider">🎯 Espaces d'affichage</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SPACES.map(space => (
                <button key={space.key} onClick={() => setSpaces({ ...spaces, [space.key]: !spaces[space.key as keyof typeof spaces] })} className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-xs font-medium ${spaces[space.key as keyof typeof spaces] ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 bg-white/[0.02] text-gray-600 line-through'}`}>
                  <space.Icon size={14} className={spaces[space.key as keyof typeof spaces] ? space.color : ''} />
                  {space.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg border border-white/10">
            <p className="text-[10px] text-gray-500 mb-2 font-mono uppercase">Aperçu :</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>{nameFr || 'Catégorie'}</span>
              <span className="text-gray-500 text-xs font-mono">/{slug || 'slug'}</span>
              <div className="flex gap-1 ml-2">
                {SPACES.map(s => spaces[s.key as keyof typeof spaces] ? <s.Icon key={s.key} size={12} className={s.color} /> : null)}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button onClick={handleAdd} disabled={isAdding || !nameFr.trim() || !nameEn.trim() || !slug.trim()} className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100">
              {isAdding ? <><Loader2 size={16} className="animate-spin" />{editingId ? 'Mise à jour...' : 'Création...'}</> : <>{editingId ? <Edit2 size={16} /> : <PlusCircle size={16} />}{editingId ? 'Mettre à jour' : 'Créer'}</>}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher..." className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X size={14} /></button>}
        </div>

        {/* List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          <AnimatePresence>
            {filteredCategories.map(cat => (
              <motion.div key={cat.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3 transition-all ${cat.is_active ? 'bg-white/5 border-white/10 hover:border-[#D4AF37]/40' : 'bg-white/[0.02] border-white/5 opacity-60'}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.color + '20' }}><Tag size={18} style={{ color: cat.color }} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{cat.name_fr} <span className="text-gray-500">/ {cat.name_en}</span></p>
                    <p className="text-xs text-gray-500 font-mono truncate">/{cat.slug}</p>
                    <div className="flex gap-2 mt-1">
                      {SPACES.map(s => cat[s.key as keyof Category] ? <s.Icon key={s.key} size={11} className={`${s.color} opacity-70`} /> : null)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button onClick={() => handleEdit(cat)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-[#D4AF37] hover:bg-white/10"><Edit2 size={16} /></button>
                  <button onClick={() => toggleActive(cat.id, cat.is_active)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10">{cat.is_active ? <ToggleRight size={22} className="text-[#D4AF37]" /> : <ToggleLeft size={22} />}</button>
                  <button onClick={() => setDeleteConfirm({ id: cat.id, name: cat.name_fr })} className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/20"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredCategories.length === 0 && <div className="text-center py-12"><Tag size={48} className="mx-auto text-gray-600 mb-3" /><p className="text-gray-500 text-sm">Aucune catégorie.</p></div>}
        </div>
      </div>

      {/* Modal Delete */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full"><AlertTriangle size={24} className="text-red-500" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Supprimer ?</h3>
                  <p className="text-gray-400 text-sm">Action irréversible.</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-white font-medium mb-1">{deleteConfirm.name}</p>
                <p className="text-gray-500 text-xs">Les éléments liés perdront leur catégorie.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20">Annuler</button>
                <button onClick={deleteCategory} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 flex items-center justify-center gap-2"><Trash2 size={16} /> Supprimer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}