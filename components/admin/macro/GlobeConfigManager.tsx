"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Plus, Edit2, Trash2, X, Loader2, Save,
  TrendingDown, Minus, Star,
} from 'lucide-react';

interface TickerItem {
  id: string;
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  category_id: string;
  indicator_fr: string;
  indicator_en: string;
  period_type: string;
  period_value: string;
  value: number;
  unit_fr?: string;
  unit_en?: string;
  trend?: 'up' | 'down' | 'stable';
  source?: string;
  source_url?: string;
  is_featured: boolean;
  category?: {
    id: string;
    name_fr: string;
    name_en: string;
    color: string;
  };
}

export default function MacroTickerManager({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tickerEnabled, setTickerEnabled] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TickerItem>>({
    country_code: '',
    country_name_fr: '',
    country_name_en: '',
    category_id: '',
    indicator_fr: '',
    indicator_en: '',
    period_type: 'year',
    period_value: new Date().getFullYear().toString(),
    value: 0,
    unit_fr: '',
    unit_en: '',
    trend: 'stable',
    source: '',
    source_url: '',
    is_featured: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, catsRes, settingsRes] = await Promise.all([
        supabase.from('macro_globe_data').select('*, category:categories(id, name_fr, name_en, color)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('show_macro', true).eq('is_active', true),
        supabase.from('site_settings').select('macro_ticker_enabled').eq('id', 1).single(),
      ]);

      if (itemsRes.data) setItems(itemsRes.data as any);
      if (catsRes.data) setCategories(catsRes.data);
      if (settingsRes.data) setTickerEnabled(settingsRes.data.macro_ticker_enabled ?? true);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setIsLoading(false);
  };

  const handleToggleTicker = async () => {
    const newValue = !tickerEnabled;
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ macro_ticker_enabled: newValue })
        .eq('id', 1);

      if (error) throw error;
      setTickerEnabled(newValue);
      showMsg('success', newValue ? 'Ticker activé' : 'Ticker désactivé');
    } catch (err: any) {
      showMsg('error', err.message);
    }
  };

  const handleSave = async () => {
    if (!formData.country_code || !formData.indicator_fr || !formData.value) {
      showMsg('error', 'Champs requis manquants');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('macro_globe_data')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('macro_globe_data')
          .insert(formData);
        if (error) throw error;
      }

      showMsg('success', editingId ? 'Donnée mise à jour !' : 'Donnée ajoutée !');
      fetchData();
      resetForm();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette donnée ?')) return;

    const { error } = await supabase
      .from('macro_globe_data')
      .delete()
      .eq('id', id);

    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', 'Donnée supprimée');
      fetchData();
    }
  };

  const openForm = (item?: TickerItem) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      country_code: '',
      country_name_fr: '',
      country_name_en: '',
      category_id: '',
      indicator_fr: '',
      indicator_en: '',
      period_type: 'year',
      period_value: new Date().getFullYear().toString(),
      value: 0,
      unit_fr: '',
      unit_en: '',
      trend: 'stable',
      source: '',
      source_url: '',
      is_featured: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-teal-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-[#0f0f0f] p-4 rounded-xl border border-white/10">
        <div>
          <h3 className="text-white font-bold text-sm">Ticker Macro Stats</h3>
          <p className="text-gray-500 text-xs">Bannière défilante affichée sur toutes les pages</p>
        </div>
        <button
          onClick={handleToggleTicker}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            tickerEnabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            tickerEnabled ? 'translate-x-7' : ''
          }`} />
        </button>
      </div>

      {/* Liste des items */}
      <div className="flex justify-end">
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-500 transition-all"
        >
          <Plus size={16} /> Nouvelle Donnée
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500">
            Aucune donnée configurée
          </div>
        )}

        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 hover:border-teal-500/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="px-2 py-1 rounded-md text-[10px] font-bold"
                style={{
                  backgroundColor: `${item.category?.color}20`,
                  color: item.category?.color,
                }}
              >
                {item.category?.name_fr || 'Sans catégorie'}
              </span>
              <div className="flex gap-2 text-gray-400">
                <button onClick={() => openForm(item)} className="hover:text-teal-400">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <h3 className="text-white font-bold mb-1">{item.country_name_fr}</h3>
            <p className="text-gray-400 text-xs mb-2">{item.indicator_fr}</p>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-teal-400">
                {item.value.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">{item.unit_fr}</span>
              {item.trend === 'up' && <TrendingUp size={14} className="text-green-400" />}
              {item.trend === 'down' && <TrendingDown size={14} className="text-red-400" />}
              {item.trend === 'stable' && <Minus size={14} className="text-gray-400" />}
            </div>

            {item.source_url && (
              <p className="text-xs text-gray-600 truncate">
                🔗 {item.source_url}
              </p>
            )}

            <div className="mt-2 text-xs text-gray-600">
              {item.period_value}
            </div>

            {item.is_featured && (
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                ⭐ Mis en avant
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/10 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    {editingId ? 'Modifier la donnée' : 'Nouvelle donnée ticker'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Pays */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Code Pays *</label>
                    <input
                      type="text"
                      value={formData.country_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                      placeholder="ex: BJ, NG"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Nom FR *</label>
                    <input
                      type="text"
                      value={formData.country_name_fr}
                      onChange={(e) => setFormData(prev => ({ ...prev, country_name_fr: e.target.value }))}
                      placeholder="ex: Bénin"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Nom EN</label>
                    <input
                      type="text"
                      value={formData.country_name_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, country_name_en: e.target.value }))}
                      placeholder="ex: Benin"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Catégorie</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                  >
                    <option value="">Sélectionner...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name_fr}</option>
                    ))}
                  </select>
                </div>

                {/* Indicateur */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Indicateur FR *</label>
                    <input
                      type="text"
                      value={formData.indicator_fr}
                      onChange={(e) => setFormData(prev => ({ ...prev, indicator_fr: e.target.value }))}
                      placeholder="ex: PIB, Inflation"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Indicateur EN</label>
                    <input
                      type="text"
                      value={formData.indicator_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, indicator_en: e.target.value }))}
                      placeholder="ex: GDP, Inflation"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                {/* Période */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Type Période</label>
                    <select
                      value={formData.period_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, period_type: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    >
                      <option value="year">Annuel</option>
                      <option value="quarter">Trimestriel</option>
                      <option value="month">Mensuel</option>
                      <option value="week">Hebdomadaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Valeur Période</label>
                    <input
                      type="text"
                      value={formData.period_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, period_value: e.target.value }))}
                      placeholder="2024, 2024-Q1"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                {/* Valeur + Tendance */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Valeur *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Unité FR</label>
                    <input
                      type="text"
                      value={formData.unit_fr}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_fr: e.target.value }))}
                      placeholder="Milliards USD"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Unité EN</label>
                    <input
                      type="text"
                      value={formData.unit_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_en: e.target.value }))}
                      placeholder="Billions USD"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Tendance</label>
                    <select
                      value={formData.trend}
                      onChange={(e) => setFormData(prev => ({ ...prev, trend: e.target.value as any }))}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    >
                      <option value="up">↑ Hausse</option>
                      <option value="down">↓ Baisse</option>
                      <option value="stable">→ Stable</option>
                    </select>
                  </div>
                </div>

                {/* Source */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Source</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="Banque Mondiale, 2024"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">URL Source (clic)</label>
                    <input
                      type="url"
                      value={formData.source_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                      placeholder="https://... ou /chiffres"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                {/* Featured */}
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  ⭐ Mettre en avant
                </label>
              </div>

              <div className="sticky bottom-0 bg-[#0f0f0f] border-t border-white/10 p-6">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-500 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingId ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}