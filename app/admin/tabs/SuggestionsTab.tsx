"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, PlusCircle, Trash2, MessageSquareText, ToggleLeft, ToggleRight, Languages, Edit2, Search, X, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONSTANTES ---
const MAX_CHARS = 80;
const MIN_CHARS = 3;

interface Suggestion { 
  id: string; 
  text_fr: string; 
  text_en: string; 
  target_space: string;
  is_active: boolean;
  created_at: string;
}

export default function SuggestionsTab({ 
  showMsg, 
  translateText 
}: { 
  showMsg: (type: 'success' | 'error', text: string) => void; 
  translateText: (text: string, lang: 'fr' | 'en') => Promise<string>; 
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [newFr, setNewFr] = useState('');
  const [newEn, setNewEn] = useState('');
  const [targetSpace, setTargetSpace] = useState('presse');
  const [isAdding, setIsAdding] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; text: string } | null>(null);

  // Templates rapides
  const templates = [
    { fr: "Qui était [X] ?", en: "Who was [X]?" },
    { fr: "L'origine de [X]", en: "The origin of [X]" },
    { fr: "Comment [X] ?", en: "How to [X]?" },
    { fr: "L'histoire de [X]", en: "The history of [X]" },
    { fr: "[X] et son héritage", en: "[X] and their legacy" },
  ];

  // Fetch suggestions
  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('search_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        showMsg('error', `Erreur de chargement: ${error.message}`);
      } else if (data) {
        setSuggestions(data as unknown as Suggestion[]);
      }
      setIsLoading(false);
    }
    fetch();
  }, [showMsg]);

  // Validation
  const validateInput = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      showMsg('error', `Texte trop court (min ${MIN_CHARS} caractères)`);
      return false;
    }
    if (trimmed.length > MAX_CHARS) {
      showMsg('error', `Texte trop long (max ${MAX_CHARS} caractères)`);
      return false;
    }
    return true;
  }, [showMsg]);

  // Vérifier les doublons
  const checkDuplicates = useCallback(async (textFr: string, excludeId?: string): Promise<boolean> => {
    const { data } = await supabase
      .from('search_suggestions')
      .select('id, text_fr')
      .ilike('text_fr', textFr.trim());
    
    if (data && data.length > 0) {
      const duplicate = data.find(s => s.id !== excludeId);
      if (duplicate) {
        showMsg('error', `Cette suggestion existe déjà : "${duplicate.text_fr}"`);
        return true;
      }
    }
    return false;
  }, [showMsg]);

  // Reset form
  const resetForm = useCallback(() => {
    setNewFr('');
    setNewEn('');
    setTargetSpace('presse');
    setEditingId(null);
  }, []);

  // Traduction automatique
  const handleTranslate = useCallback(async () => {
    if (!newFr.trim()) return;
    
    setIsTranslating(true);
    try {
      const translated = await translateText(newFr.trim(), 'fr');
      setNewEn(translated);
      showMsg('success', 'Traduction appliquée !');
    } catch (err: any) {
      console.error('Translation error:', err);
      showMsg('error', 'Échec de la traduction. Veuillez remplir manuellement.');
    } finally {
      setIsTranslating(false);
    }
  }, [newFr, translateText, showMsg]);

  // Handle Add/Edit
  const handleAdd = async () => {
    const trimmedFr = newFr.trim();
    const trimmedEn = newEn.trim();

    if (!trimmedFr || !trimmedEn) {
      return showMsg('error', 'Veuillez remplir les deux langues.');
    }

    if (!validateInput(trimmedFr) || !validateInput(trimmedEn)) {
      return;
    }

    // Check duplicates
    if (await checkDuplicates(trimmedFr, editingId || undefined)) {
      return;
    }

    setIsAdding(true);
    
    try {
      if (editingId) {
        // UPDATE existing
        const { error } = await supabase
          .from('search_suggestions')
          .update({
            text_fr: trimmedFr,
            text_en: trimmedEn,
            target_space: targetSpace
          })
          .eq('id', editingId);

        if (error) throw error;

        // Update local state (optimistic)
        setSuggestions(suggestions.map(s => 
          s.id === editingId 
            ? { ...s, text_fr: trimmedFr, text_en: trimmedEn, target_space: targetSpace }
            : s
        ));

        showMsg('success', 'Suggestion mise à jour !');
      } else {
        // CREATE new
        const { data, error } = await supabase
          .from('search_suggestions')
          .insert({
            text_fr: trimmedFr,
            text_en: trimmedEn,
            target_space: targetSpace,
            is_active: true
          })
          .select()
          .single();

        if (error || !data) {
          throw new Error(error?.message || 'Erreur création');
        }

        // Update local state (optimistic)
        setSuggestions([data as unknown as Suggestion, ...suggestions]);
        showMsg('success', 'Suggestion ajoutée !');
      }

      resetForm();
    } catch (err: any) {
      console.error('Error:', err);
      showMsg('error', `Erreur: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  // Edit suggestion
  const handleEdit = useCallback((suggestion: Suggestion) => {
    setEditingId(suggestion.id);
    setNewFr(suggestion.text_fr);
    setNewEn(suggestion.text_en);
    setTargetSpace(suggestion.target_space);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Toggle active/inactive
  const toggleActive = useCallback(async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setSuggestions(suggestions.map(s => 
      s.id === id ? { ...s, is_active: !currentStatus } : s
    ));

    const { error } = await supabase
      .from('search_suggestions')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (error) {
      // Rollback on error
      setSuggestions(suggestions.map(s => 
        s.id === id ? { ...s, is_active: currentStatus } : s
      ));
      showMsg('error', error.message);
    } else {
      showMsg('success', !currentStatus ? '✅ Suggestion activée' : '⏸️ Suggestion masquée');
    }
  }, [suggestions, showMsg]);

  // Delete confirmation
  const confirmDelete = useCallback((suggestion: Suggestion) => {
    setDeleteConfirm({
      id: suggestion.id,
      text: suggestion.text_fr
    });
  }, []);

  // Delete suggestion
  const deleteSuggestion = useCallback(async () => {
    if (!deleteConfirm) return;
    
    try {
      const { error } = await supabase
        .from('search_suggestions')
        .delete()
        .eq('id', deleteConfirm.id);
      
      if (error) throw error;

      // Update local state
      setSuggestions(suggestions.filter(s => s.id !== deleteConfirm.id));
      showMsg('success', 'Suggestion supprimée définitivement.');
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showMsg('error', `Erreur suppression: ${err.message}`);
    }
  }, [deleteConfirm, suggestions, showMsg]);

  // Insert template
  const insertTemplate = useCallback((template: { fr: string; en: string }) => {
    setNewFr(template.fr);
    setNewEn(template.en);
    showMsg('success', 'Template inséré. Personnalisez avec votre contenu.');
  }, [showMsg]);

  // Filtered suggestions
  const filteredSuggestions = React.useMemo(() => {
    let result = [...suggestions];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.text_fr.toLowerCase().includes(term) ||
        s.text_en.toLowerCase().includes(term) ||
        s.target_space.toLowerCase().includes(term)
      );
    }

    // Filter status
    if (filterStatus === 'active') {
      result = result.filter(s => s.is_active);
    } else if (filterStatus === 'inactive') {
      result = result.filter(s => !s.is_active);
    }

    return result;
  }, [suggestions, searchTerm, filterStatus]);

  const spaces = [
    { id: 'presse', label: 'Presse' },
    { id: 'landing', label: 'Landing' },
    { id: 'encyclopedie', label: 'Encyclopédie' },
    { id: 'all', label: 'Partout' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
        <p className="text-gray-400 text-sm">Chargement des suggestions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquareText className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Suggestions de Recherche</h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Messages défilants dans la barre de recherche. {suggestions.length} suggestions.
          </p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        {/* Formulaire */}
        <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-lg border border-white/5 mb-6">
          {/* Title */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingId ? <Edit2 size={18} className="text-[#D4AF37]" /> : <PlusCircle size={18} className="text-[#D4AF37]" />}
              {editingId ? 'Modifier la suggestion' : 'Nouvelle suggestion'}
            </h3>
            {editingId && (
              <button 
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <X size={14} /> Annuler
              </button>
            )}
          </div>

          {/* Templates rapides */}
          {!editingId && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2 font-mono">⚡ Templates rapides :</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((template, i) => (
                  <button
                    key={i}
                    onClick={() => insertTemplate(template)}
                    className="text-xs bg-white/5 hover:bg-[#D4AF37]/20 text-gray-300 hover:text-[#D4AF37] px-3 py-1.5 rounded-full border border-white/10 hover:border-[#D4AF37]/40 transition-all"
                  >
                    {template.fr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
                🇫🇷 Français <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={newFr} 
                  onChange={(e) => setNewFr(e.target.value)} 
                  maxLength={MAX_CHARS}
                  className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors ${
                    newFr.length > MAX_CHARS 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-white/20 focus:border-[#D4AF37]'
                  }`}
                  placeholder="Ex: Qui était Patrice Lumumba ?"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${
                  newFr.length > MAX_CHARS ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {newFr.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
                🇬🇧 Anglais <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={newEn} 
                  onChange={(e) => setNewEn(e.target.value)} 
                  maxLength={MAX_CHARS}
                  className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors ${
                    newEn.length > MAX_CHARS 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-white/20 focus:border-[#D4AF37]'
                  }`}
                  placeholder="Ex: Who was Patrice Lumumba?"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${
                  newEn.length > MAX_CHARS ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {newEn.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
            <div className="absolute right-0 md:-right-3 top-1/2 -translate-y-1/2">
              <button 
                onClick={handleTranslate} 
                disabled={isTranslating || !newFr.trim()} 
                className="bg-white/10 p-2 rounded-full hover:bg-[#D4AF37] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Traduire automatiquement"
              >
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
              </button>
            </div>
          </div>

          {/* Space Assignment */}
          <div className="mt-4">
            <label className="block text-xs text-gray-400 mb-2 font-mono">🎯 Assigner à l'espace :</label>
            <div className="flex flex-wrap gap-2">
              {spaces.map(space => (
                <button
                  key={space.id}
                  onClick={() => setTargetSpace(space.id)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${
                    targetSpace === space.id 
                      ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' 
                      : 'bg-white/5 text-white/40 border border-white/10 hover:border-[#D4AF37]/40'
                  }`}
                >
                  {space.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleAdd} 
              disabled={isAdding || !newFr.trim() || !newEn.trim()} 
              className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {editingId ? 'Mise à jour...' : 'Ajout...'}
                </>
              ) : (
                <>
                  {editingId ? <Edit2 size={16} /> : <PlusCircle size={16} />}
                  {editingId ? 'Mettre à jour' : 'Ajouter'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une suggestion..."
              className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37] transition-colors"
          >
            <option value="all">Toutes</option>
            <option value="active">✓ Actives</option>
            <option value="inactive">✗ Masquées</option>
          </select>
        </div>

        {/* Results count */}
        <div className="mb-3 text-xs text-gray-400 flex items-center justify-between">
          <span>
            {filteredSuggestions.length} suggestion{filteredSuggestions.length > 1 ? 's' : ''} affichée{filteredSuggestions.length > 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
          </span>
          {(searchTerm || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
              className="text-[#D4AF37] hover:underline transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence>
            {filteredSuggestions.map((sug: Suggestion) => (
              <motion.div 
                key={sug.id} 
                layout
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3 transition-all ${
                  sug.is_active 
                    ? 'bg-white/5 border-white/10 hover:border-[#D4AF37]/40' 
                    : 'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="flex-1 pr-4 min-w-0">
                  <p className="text-sm text-white truncate">{sug.text_fr}</p>
                  <p className="text-xs text-gray-400 italic mt-0.5 truncate">{sug.text_en}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      sug.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {sug.is_active ? '✓ Active' : '✗ Masquée'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold uppercase">
                      {sug.target_space}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {sug.text_fr.length} chars
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Edit */}
                  <button 
                    onClick={() => handleEdit(sug)} 
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-[#D4AF37] hover:bg-white/10 transition-all"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Toggle active - LE BOUTON DEMANDÉ */}
                  <button 
                    onClick={() => toggleActive(sug.id, sug.is_active)} 
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title={sug.is_active ? 'Masquer' : 'Activer'}
                  >
                    {sug.is_active ? (
                      <ToggleRight size={22} className="text-[#D4AF37]" />
                    ) : (
                      <ToggleLeft size={22} />
                    )}
                  </button>

                  {/* Delete */}
                  <button 
                    onClick={() => confirmDelete(sug)} 
                    className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/20 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredSuggestions.length === 0 && (
            <div className="text-center py-12">
              <MessageSquareText size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">
                {searchTerm 
                  ? `Aucune suggestion trouvée pour "${searchTerm}"`
                  : 'Aucune suggestion pour le moment.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-[#D4AF37] text-xs hover:underline transition-colors"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Delete */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Supprimer définitivement ?</h3>
                  <p className="text-gray-400 text-sm">Cette action est irréversible.</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-white font-medium mb-1 truncate">{deleteConfirm.text}</p>
                <p className="text-gray-500 text-xs">
                  Cette suggestion sera retirée de la barre de recherche.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteSuggestion}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}