"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Edit2, Trash2, Save, X, Calendar, Eye, EyeOff, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelinePeriod {
  id: string;
  name_fr: string;
  name_en: string;
  start_year: number;
  end_year: number;
  color_hex: string;
  icon_emoji: string;
  display_order: number;
  is_visible: boolean;
}

interface TimelinePoint {
  id: string;
  period_id: string;
  title_fr: string;
  title_en: string;
  year: number;
  importance: number;
  is_visible: boolean;
  is_featured: boolean;
}

export default function TimelineTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [activeSection, setActiveSection] = useState<'periods' | 'points'>('periods');
  const [periods, setPeriods] = useState<TimelinePeriod[]>([]);
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPeriod, setEditingPeriod] = useState<TimelinePeriod | null>(null);
  const [editingPoint, setEditingPoint] = useState<TimelinePoint | null>(null);

  // Form states - Period
  const [periodNameFr, setPeriodNameFr] = useState('');
  const [periodNameEn, setPeriodNameEn] = useState('');
  const [periodStart, setPeriodStart] = useState(-5000);
  const [periodEnd, setPeriodEnd] = useState(-1000);
  const [periodColor, setPeriodColor] = useState('#D4AF37');
  const [periodIcon, setPeriodIcon] = useState('📅');

  // Form states - Point
  const [pointTitleFr, setPointTitleFr] = useState('');
  const [pointTitleEn, setPointTitleEn] = useState('');
  const [pointYear, setPointYear] = useState(0);
  const [pointPeriodId, setPointPeriodId] = useState('');
  const [pointImportance, setPointImportance] = useState(3);
  const [pointFeatured, setPointFeatured] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const [periodsRes, pointsRes] = await Promise.all([
      supabase.from('timeline_periods').select('*').order('display_order'),
      supabase.from('timeline_points').select('*').order('year')
    ]);
    
    if (periodsRes.data) setPeriods(periodsRes.data as TimelinePeriod[]);
    if (pointsRes.data) setPoints(pointsRes.data as TimelinePoint[]);
    setIsLoading(false);
  }

  const resetPeriodForm = () => {
    setEditingPeriod(null);
    setPeriodNameFr('');
    setPeriodNameEn('');
    setPeriodStart(-5000);
    setPeriodEnd(-1000);
    setPeriodColor('#D4AF37');
    setPeriodIcon('📅');
  };

  const resetPointForm = () => {
    setEditingPoint(null);
    setPointTitleFr('');
    setPointTitleEn('');
    setPointYear(0);
    setPointPeriodId(periods[0]?.id || '');
    setPointImportance(3);
    setPointFeatured(false);
  };

  const handleSavePeriod = async () => {
    if (!periodNameFr || !periodNameEn) {
      return showMsg('error', 'Remplissez les noms FR et EN');
    }

    const periodData = {
      name_fr: periodNameFr,
      name_en: periodNameEn,
      start_year: periodStart,
      end_year: periodEnd,
      color_hex: periodColor,
      icon_emoji: periodIcon,
      is_visible: true
    };

    let error;
    if (editingPeriod) {
      const res = await supabase.from('timeline_periods').update(periodData).eq('id', editingPeriod.id);
      error = res.error;
    } else {
      const res = await supabase.from('timeline_periods').insert(periodData).select();
      error = res.error;
    }

    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', editingPeriod ? 'Période mise à jour' : 'Période ajoutée');
      resetPeriodForm();
      fetchData();
    }
  };

  const handleSavePoint = async () => {
    if (!pointTitleFr || !pointTitleEn || !pointPeriodId) {
      return showMsg('error', 'Remplissez tous les champs obligatoires');
    }

    const pointData = {
      title_fr: pointTitleFr,
      title_en: pointTitleEn,
      year: pointYear,
      period_id: pointPeriodId,
      importance: pointImportance,
      is_featured: pointFeatured,
      is_visible: true
    };

    let error;
    if (editingPoint) {
      const res = await supabase.from('timeline_points').update(pointData).eq('id', editingPoint.id);
      error = res.error;
    } else {
      const res = await supabase.from('timeline_points').insert(pointData).select();
      error = res.error;
    }

    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', editingPoint ? 'Point mis à jour' : 'Point ajouté');
      resetPointForm();
      fetchData();
    }
  };

  const handleEditPeriod = (period: TimelinePeriod) => {
    setEditingPeriod(period);
    setPeriodNameFr(period.name_fr);
    setPeriodNameEn(period.name_en);
    setPeriodStart(period.start_year);
    setPeriodEnd(period.end_year);
    setPeriodColor(period.color_hex);
    setPeriodIcon(period.icon_emoji);
  };

  const handleEditPoint = (point: TimelinePoint) => {
    setEditingPoint(point);
    setPointTitleFr(point.title_fr);
    setPointTitleEn(point.title_en);
    setPointYear(point.year);
    setPointPeriodId(point.period_id);
    setPointImportance(point.importance);
    setPointFeatured(point.is_featured);
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Supprimer cette période ?')) return;
    const { error } = await supabase.from('timeline_periods').delete().eq('id', id);
    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', 'Période supprimée');
      fetchData();
    }
  };

  const handleDeletePoint = async (id: string) => {
    if (!confirm('Supprimer ce point ?')) return;
    const { error } = await supabase.from('timeline_points').delete().eq('id', id);
    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', 'Point supprimé');
      fetchData();
    }
  };

  const togglePeriodVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from('timeline_periods').update({ is_visible: !current }).eq('id', id);
    if (!error) {
      setPeriods(periods.map(p => p.id === id ? { ...p, is_visible: !current } : p));
      showMsg('success', !current ? 'Période visible' : 'Période masquée');
    }
  };

  const togglePointVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from('timeline_points').update({ is_visible: !current }).eq('id', id);
    if (!error) {
      setPoints(points.map(p => p.id === id ? { ...p, is_visible: !current } : p));
      showMsg('success', !current ? 'Point visible' : 'Point masqué');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Frise Chronologique</h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Gérez les périodes et points d'intérêt. {periods.length} périodes, {points.length} points.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveSection('periods')}
          className={`px-4 py-2 text-sm font-bold transition-all ${
            activeSection === 'periods'
              ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Périodes ({periods.length})
        </button>
        <button
          onClick={() => setActiveSection('points')}
          className={`px-4 py-2 text-sm font-bold transition-all ${
            activeSection === 'points'
              ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Points ({points.length})
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        
        {/* SECTION PÉRIODES */}
        {activeSection === 'periods' && (
          <div className="space-y-6">
            {/* Formulaire */}
            <div className="bg-[#0f0f0f] p-4 rounded-lg border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {editingPeriod ? <Edit2 size={18} className="text-[#D4AF37]" /> : <Plus size={18} className="text-[#D4AF37]" />}
                {editingPeriod ? 'Modifier la période' : 'Nouvelle période'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Nom Français *</label>
                  <input
                    type="text"
                    value={periodNameFr}
                    onChange={(e) => setPeriodNameFr(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                    placeholder="Ex: Antiquité Africaine"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Name English *</label>
                  <input
                    type="text"
                    value={periodNameEn}
                    onChange={(e) => setPeriodNameEn(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                    placeholder="Ex: African Antiquity"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Année Début *</label>
                  <input
                    type="number"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Année Fin *</label>
                  <input
                    type="number"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Couleur</label>
                  <input
                    type="color"
                    value={periodColor}
                    onChange={(e) => setPeriodColor(e.target.value)}
                    className="w-full h-10 bg-transparent border border-white/20 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Emoji</label>
                  <input
                    type="text"
                    value={periodIcon}
                    onChange={(e) => setPeriodIcon(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                    placeholder="📅"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {editingPeriod && (
                  <button
                    onClick={resetPeriodForm}
                    className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/20"
                  >
                    <X size={16} /> Annuler
                  </button>
                )}
                <button
                  onClick={handleSavePeriod}
                  className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2 rounded-lg font-bold text-sm hover:bg-white transition-all"
                >
                  <Save size={16} /> {editingPeriod ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>

            {/* Liste des périodes */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Périodes existantes</h4>
              {periods.map((period) => (
                <motion.div
                  key={period.id}
                  layout
                  className="flex items-center justify-between p-4 rounded-lg border bg-white/5 border-white/10"
                  style={{ borderLeft: `4px solid ${period.color_hex}` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{period.icon_emoji}</span>
                    <div>
                      <p className="text-white font-bold">{period.name_fr}</p>
                      <p className="text-xs text-gray-400">{period.start_year} → {period.end_year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePeriodVisibility(period.id, period.is_visible)}
                      className="p-2 text-gray-400 hover:text-white"
                      title={period.is_visible ? 'Masquer' : 'Afficher'}
                    >
                      {period.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => handleEditPeriod(period)}
                      className="p-2 text-gray-400 hover:text-[#D4AF37]"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePeriod(period.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION POINTS */}
        {activeSection === 'points' && (
          <div className="space-y-6">
            {/* Formulaire */}
            <div className="bg-[#0f0f0f] p-4 rounded-lg border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {editingPoint ? <Edit2 size={18} className="text-[#D4AF37]" /> : <Plus size={18} className="text-[#D4AF37]" />}
                {editingPoint ? 'Modifier le point' : 'Nouveau point d intérêt'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Titre Français *</label>
                  <input
                    type="text"
                    value={pointTitleFr}
                    onChange={(e) => setPointTitleFr(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Title English *</label>
                  <input
                    type="text"
                    value={pointTitleEn}
                    onChange={(e) => setPointTitleEn(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Année *</label>
                  <input
                    type="number"
                    value={pointYear}
                    onChange={(e) => setPointYear(Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                    placeholder="Ex: -3000 ou 1960"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Période *</label>
                  <select
                    value={pointPeriodId}
                    onChange={(e) => setPointPeriodId(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name_fr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">Importance (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => setPointImportance(level)}
                        className={`w-10 h-10 rounded-lg font-bold transition-all ${
                          pointImportance >= level
                            ? 'bg-[#D4AF37] text-black'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={pointFeatured}
                    onChange={(e) => setPointFeatured(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="featured" className="text-sm text-white flex items-center gap-2">
                    <Star size={16} className={pointFeatured ? 'text-[#D4AF37]' : 'text-gray-400'} />
                    Point majeur (toujours visible)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {editingPoint && (
                  <button
                    onClick={resetPointForm}
                    className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/20"
                  >
                    <X size={16} /> Annuler
                  </button>
                )}
                <button
                  onClick={handleSavePoint}
                  className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2 rounded-lg font-bold text-sm hover:bg-white transition-all"
                >
                  <Save size={16} /> {editingPoint ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>

            {/* Liste des points */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-[#1a1a1a] py-2">
                Points existants
              </h4>
              {points.map((point) => {
                const period = periods.find(p => p.id === point.period_id);
                return (
                  <motion.div
                    key={point.id}
                    layout
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      point.is_visible ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {point.is_featured && <Star size={16} className="text-[#D4AF37]" fill="currentColor" />}
                      <div>
                        <p className="text-white font-bold">{point.title_fr}</p>
                        <p className="text-xs text-gray-400">
                          {point.year} - {period?.name_fr || 'Inconnue'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePointVisibility(point.id, point.is_visible)}
                        className="p-2 text-gray-400 hover:text-white"
                      >
                        {point.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => handleEditPoint(point)}
                        className="p-2 text-gray-400 hover:text-[#D4AF37]"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePoint(point.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}