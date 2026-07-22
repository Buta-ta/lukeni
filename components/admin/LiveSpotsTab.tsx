"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Plus, Edit2, Trash2, X, Check, 
  Upload, Loader2, Eye, EyeOff, ArrowUp, ArrowDown,
  Thermometer, Calculator, Zap, Clock, Globe,
  RefreshCw, TestTube, MapPin, Palette, Save, Languages
} from 'lucide-react';

const COUNTRIES = [
  { code: 'BJ', name_fr: 'Bénin', name_en: 'Benin' },
  { code: 'BF', name_fr: 'Burkina Faso', name_en: 'Burkina Faso' },
  { code: 'CI', name_fr: 'Côte d\'Ivoire', name_en: 'Ivory Coast' },
  { code: 'GH', name_fr: 'Ghana', name_en: 'Ghana' },
  { code: 'GN', name_fr: 'Guinée', name_en: 'Guinea' },
  { code: 'ML', name_fr: 'Mali', name_en: 'Mali' },
  { code: 'NE', name_fr: 'Niger', name_en: 'Niger' },
  { code: 'NG', name_fr: 'Nigeria', name_en: 'Nigeria' },
  { code: 'SN', name_fr: 'Sénégal', name_en: 'Senegal' },
  { code: 'TG', name_fr: 'Togo', name_en: 'Togo' },
  { code: 'MA', name_fr: 'Maroc', name_en: 'Morocco' },
  { code: 'DZ', name_fr: 'Algérie', name_en: 'Algeria' },
  { code: 'TN', name_fr: 'Tunisie', name_en: 'Tunisia' },
  { code: 'EG', name_fr: 'Égypte', name_en: 'Egypt' },
  { code: 'ZA', name_fr: 'Afrique du Sud', name_en: 'South Africa' },
  { code: 'KE', name_fr: 'Kenya', name_en: 'Kenya' },
  { code: 'ET', name_fr: 'Éthiopie', name_en: 'Ethiopia' },
  { code: 'UG', name_fr: 'Ouganda', name_en: 'Uganda' },
  { code: 'CD', name_fr: 'RD Congo', name_en: 'DR Congo' },
  { code: 'CM', name_fr: 'Cameroun', name_en: 'Cameroon' },
  { code: 'FR', name_fr: 'France (Diaspora)', name_en: 'France (Diaspora)' },
  { code: 'US', name_fr: 'États-Unis (Diaspora)', name_en: 'United States (Diaspora)' },
  { code: 'CA', name_fr: 'Canada (Diaspora)', name_en: 'Canada (Diaspora)' },
  { code: 'GB', name_fr: 'Royaume-Uni (Diaspora)', name_en: 'United Kingdom (Diaspora)' },
];

interface LiveSpot {
  id: string;
  created_at: string;
  is_active: boolean;
  priority: number;
  spot_type: 'counter' | 'weather';
  badge_label_fr: string;
  badge_label_en?: string;
  badge_color: string;
  badge_pulse: boolean;
  region_label_fr: string;
  region_label_en?: string;
  text_fr: string;
  text_en?: string;
  cover_url?: string;
  target_url?: string;
  clicks_count: number;
  
  counter_type?: string;
  counter_unit_fr?: string;
  counter_unit_en?: string;
  period_type?: string;
  period_total?: number;
  period_start_at?: string;
  start_value?: number;
  decimals?: number;
  
  weather_city_fr?: string;
  weather_city_en?: string;
  weather_country_code?: string;
  weather_lat?: number;
  weather_lng?: number;
  last_weather_temp?: number;
  last_weather_condition?: string;
  last_weather_icon?: string;
  last_weather_fetched_at?: string;
}

interface SiteSettings {
  live_spot_enabled: boolean;
  live_spot_position: string;
  live_spot_rotation_duration: number;
}

const SPOT_POSITIONS = [
  { value: 'sidebar_right', label: 'Sidebar Droite', icon: '→' },
  { value: 'sidebar_left', label: 'Sidebar Gauche', icon: '←' },
  { value: 'bottom_bar', label: 'Barre du Bas', icon: '↓' },
  { value: 'floating_bottom_right', label: 'Flottant Bas-Droite', icon: '↘' },
  { value: 'floating_bottom_left', label: 'Flottant Bas-Gauche', icon: '↙' },
  { value: 'top_bar', label: 'Barre du Haut', icon: '↑' },
];

export default function LiveSpotsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [spots, setSpots] = useState<LiveSpot[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    live_spot_enabled: false,
    live_spot_position: 'sidebar_right',
    live_spot_rotation_duration: 6
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<LiveSpot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [weatherPreview, setWeatherPreview] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    spot_type: 'counter' as 'counter' | 'weather',
    badge_label_fr: '',
    badge_label_en: '',
    badge_color: '#D4AF37',
    badge_pulse: false,
    region_label_fr: '',
    region_label_en: '',
    text_fr: '',
    text_en: '',
    target_url: '',
    cover_url: '',
    is_active: true,
    priority: 0,
    
    counter_type: 'births',
    counter_unit_fr: 'naissances',
    counter_unit_en: 'births',
    period_type: 'day',
    period_total: 1000,
    start_value: 0,
    decimals: 0,
    
    weather_city_fr: '',
    weather_city_en: '',
    weather_country_code: ''
  });

  useEffect(() => {
    fetchSpots();
    fetchSettings();
  }, []);

  const fetchSpots = async () => {
    const { data, error } = await supabase
      .from('live_spots')
      .select('*')
      .order('priority', { ascending: false });
    
    if (error) {
      showMsg('error', 'Erreur lors du chargement');
    } else {
      setSpots(data || []);
    }
    setIsLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('live_spot_enabled, live_spot_position, live_spot_rotation_duration')
      .eq('id', 1)
      .single();
    
    if (data) {
      setSettings({
        live_spot_enabled: data.live_spot_enabled || false,
        live_spot_position: data.live_spot_position || 'sidebar_right',
        live_spot_rotation_duration: data.live_spot_rotation_duration || 6
      });
    }
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    const { error } = await supabase
      .from('site_settings')
      .update(newSettings)
      .eq('id', 1);
    
    if (error) {
      showMsg('error', 'Erreur mise à jour');
    } else {
      setSettings(prev => ({ ...prev, ...newSettings }));
      showMsg('success', 'Configuration sauvegardée');
    }
  };

  const resetForm = () => {
    setFormData({
      spot_type: 'counter',
      badge_label_fr: '',
      badge_label_en: '',
      badge_color: '#D4AF37',
      badge_pulse: false,
      region_label_fr: '',
      region_label_en: '',
      text_fr: '',
      text_en: '',
      target_url: '',
      cover_url: '',
      is_active: true,
      priority: spots.length,
      counter_type: 'births',
      counter_unit_fr: 'naissances',
      counter_unit_en: 'births',
      period_type: 'day',
      period_total: 1000,
      start_value: 0,
      decimals: 0,
      weather_city_fr: '',
      weather_city_en: '',
      weather_country_code: ''
    });
    setEditingSpot(null);
    setWeatherPreview(null);
  };

  const openModal = (spot?: LiveSpot) => {
    if (spot) {
      setEditingSpot(spot);
      setFormData({
        spot_type: spot.spot_type,
        badge_label_fr: spot.badge_label_fr,
        badge_label_en: spot.badge_label_en || '',
        badge_color: spot.badge_color,
        badge_pulse: spot.badge_pulse,
        region_label_fr: spot.region_label_fr,
        region_label_en: spot.region_label_en || '',
        text_fr: spot.text_fr,
        text_en: spot.text_en || '',
        target_url: spot.target_url || '',
        cover_url: spot.cover_url || '',
        is_active: spot.is_active,
        priority: spot.priority,
        counter_type: spot.counter_type || 'births',
        counter_unit_fr: spot.counter_unit_fr || '',
        counter_unit_en: spot.counter_unit_en || '',
        period_type: spot.period_type || 'day',
        period_total: spot.period_total || 1000,
        start_value: spot.start_value || 0,
        decimals: spot.decimals || 0,
        weather_city_fr: spot.weather_city_fr || '',
        weather_city_en: spot.weather_city_en || '',
        weather_country_code: spot.weather_country_code || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleAutoTranslate = async (
    fieldKey: string,
    sourceText: string,
    targetLang: 'fr' | 'en'
  ) => {
    if (!sourceText.trim()) {
      showMsg('error', 'Texte vide');
      return;
    }

    setIsTranslating(fieldKey);
    try {
      const res = await fetch('/api/proxy/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: sourceText,
          text: sourceText,
          source: 'auto',
          target: targetLang,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = data.translated || data.translatedText || '';

      if (!translated) {
        window.open(
          `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(sourceText.slice(0, 500))}&op=translate`,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }

      // Mettre à jour le formData selon le champ
      const [fieldType, fieldName] = fieldKey.split('-');
      
      if (fieldType === 'badge') {
        setFormData(prev => ({
          ...prev,
          badge_label_en: targetLang === 'en' ? translated : prev.badge_label_en,
          badge_label_fr: targetLang === 'fr' ? translated : prev.badge_label_fr,
        }));
      } else if (fieldType === 'region') {
        setFormData(prev => ({
          ...prev,
          region_label_en: targetLang === 'en' ? translated : prev.region_label_en,
          region_label_fr: targetLang === 'fr' ? translated : prev.region_label_fr,
        }));
      } else if (fieldType === 'text') {
        setFormData(prev => ({
          ...prev,
          text_en: targetLang === 'en' ? translated : prev.text_en,
          text_fr: targetLang === 'fr' ? translated : prev.text_fr,
        }));
      } else if (fieldType === 'unit') {
        setFormData(prev => ({
          ...prev,
          counter_unit_en: targetLang === 'en' ? translated : prev.counter_unit_en,
          counter_unit_fr: targetLang === 'fr' ? translated : prev.counter_unit_fr,
        }));
      } else if (fieldType === 'city') {
        setFormData(prev => ({
          ...prev,
          weather_city_en: targetLang === 'en' ? translated : prev.weather_city_en,
          weather_city_fr: targetLang === 'fr' ? translated : prev.weather_city_fr,
        }));
      }

      showMsg('success', '✨ Traduction complétée');
    } catch (err) {
      console.error('Translation error:', err);
      showMsg('error', 'Erreur de traduction');
    } finally {
      setIsTranslating(null);
    }
  };

  const testWeather = async () => {
    if (!formData.weather_city_fr || !formData.weather_country_code) {
      showMsg('error', 'Ville et pays requis');
      return;
    }

    setIsTesting(true);
    setWeatherPreview(null);
    
    try {
      const response = await fetch('/api/live-spots/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.weather_city_fr,
          countryCode: formData.weather_country_code
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        showMsg('error', data.error || 'Erreur test météo');
      } else {
        setWeatherPreview(data);
        showMsg('success', 'Localisation vérifiée');
      }
    } catch (error) {
      showMsg('error', 'Erreur test météo');
    } finally {
      setIsTesting(false);
    }
  };

  const uploadCover = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showMsg('error', 'Seules les images sont autorisées');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showMsg('error', 'Image trop volumineuse (max 2MB)');
      return;
    }

    setIsUploading(true);
    const fileName = `cover-${Date.now()}-${file.name}`;
    
    try {
      const { data, error } = await supabase.storage
        .from('live-spots-covers')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('live-spots-covers')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, cover_url: publicUrl }));
      showMsg('success', 'Image uploadée');
    } catch (error) {
      showMsg('error', 'Erreur upload');
    } finally {
      setIsUploading(false);
    }
  };

  const resetCounterPeriod = async (spotId: string) => {
    const now = new Date();
    let periodStart: Date;
    
    const spot = spots.find(s => s.id === spotId);
    const periodType = spot?.period_type || formData.period_type;
    
    if (periodType === 'day') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodType === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1);
    }

    const { error } = await supabase
      .from('live_spots')
      .update({ 
        period_start_at: periodStart.toISOString(),
        start_value: spot?.start_value || formData.start_value 
      })
      .eq('id', spotId);

    if (error) {
      showMsg('error', 'Erreur reset');
    } else {
      showMsg('success', 'Période réinitialisée');
      fetchSpots();
    }
  };

  const submitSpot = async () => {
    if (!formData.badge_label_fr || !formData.region_label_fr || !formData.text_fr) {
      showMsg('error', 'Champs FR obligatoires');
      return;
    }

    setIsSubmitting(true);

    try {
      let spotData: any = {
        spot_type: formData.spot_type,
        badge_label_fr: formData.badge_label_fr,
        badge_label_en: formData.badge_label_en || null,
        badge_color: formData.badge_color,
        badge_pulse: formData.badge_pulse,
        region_label_fr: formData.region_label_fr,
        region_label_en: formData.region_label_en || null,
        text_fr: formData.text_fr,
        text_en: formData.text_en || null,
        target_url: formData.target_url || null,
        is_active: formData.is_active,
        priority: formData.priority,
        cover_url: formData.cover_url || null
      };

      if (formData.spot_type === 'counter') {
        let periodStart = new Date();
        if (formData.period_type === 'day') {
          periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
        } else if (formData.period_type === 'month') {
          periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
        } else {
          periodStart = new Date(periodStart.getFullYear(), 0, 1);
        }

        spotData = {
          ...spotData,
          counter_type: formData.counter_type,
          counter_unit_fr: formData.counter_unit_fr,
          counter_unit_en: formData.counter_unit_en || null,
          period_type: formData.period_type,
          period_total: formData.period_total,
          period_start_at: editingSpot?.period_start_at || periodStart.toISOString(),
          start_value: formData.start_value,
          decimals: formData.decimals
        };
      } else {
        spotData = {
          ...spotData,
          weather_city_fr: formData.weather_city_fr,
          weather_city_en: formData.weather_city_en || null,
          weather_country_code: formData.weather_country_code,
          weather_lat: weatherPreview?.lat || null,
          weather_lng: weatherPreview?.lng || null
        };
      }

      const { error } = editingSpot
        ? await supabase.from('live_spots').update(spotData).eq('id', editingSpot.id)
        : await supabase.from('live_spots').insert([spotData]);

      if (error) throw error;

      showMsg('success', editingSpot ? 'Spot modifié' : 'Spot créé');
      setShowModal(false);
      resetForm();
      fetchSpots();
    } catch (error) {
      showMsg('error', 'Erreur sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSpot = async (id: string) => {
    if (!confirm('Supprimer ce spot ?')) return;

    const { error } = await supabase
      .from('live_spots')
      .delete()
      .eq('id', id);

    if (error) {
      showMsg('error', 'Erreur suppression');
    } else {
      showMsg('success', 'Spot supprimé');
      fetchSpots();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from('live_spots')
      .update({ is_active: !is_active })
      .eq('id', id);

    if (error) {
      showMsg('error', 'Erreur modification');
    } else {
      fetchSpots();
    }
  };

  const updatePriority = async (id: string, delta: number) => {
    const spot = spots.find(s => s.id === id);
    if (!spot) return;
    
    const newPriority = spot.priority + delta;
    
    const { error } = await supabase
      .from('live_spots')
      .update({ priority: newPriority })
      .eq('id', id);

    if (error) {
      showMsg('error', 'Erreur modification');
    } else {
      fetchSpots();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-red-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <Activity className="text-red-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white">Live Spots</h2>
            <p className="text-gray-400 text-xs">{spots.length} spot{spots.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500 transition-all"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nouveau Spot</span>
        </button>
      </div>

      {/* Configuration globale */}
      <div className="bg-[#0f0f0f] p-6 rounded-xl border border-white/5 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe size={18} className="text-blue-400" />
          Configuration Globale
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Activation */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-white text-sm font-medium">Widget Actif</p>
                <p className="text-gray-500 text-xs mt-1">Afficher le Live Spot</p>
              </div>
              <button
                onClick={() => updateSettings({ live_spot_enabled: !settings.live_spot_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.live_spot_enabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.live_spot_enabled ? 'translate-x-6' : ''
                }`} />
              </button>
            </label>
          </div>

          {/* Position */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <label className="block text-white text-sm font-medium mb-2">Position</label>
            <select
              value={settings.live_spot_position}
              onChange={(e) => updateSettings({ live_spot_position: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
            >
              {SPOT_POSITIONS.map(pos => (
                <option key={pos.value} value={pos.value}>
                  {pos.icon} {pos.label}
                </option>
              ))}
            </select>
          </div>

          {/* Durée */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <label className="block text-white text-sm font-medium mb-2">Rotation (secondes)</label>
            <input
              type="number"
              min="3"
              max="15"
              value={settings.live_spot_rotation_duration}
              onChange={(e) => updateSettings({ live_spot_rotation_duration: parseInt(e.target.value) || 6 })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Liste des spots */}
      <div className="space-y-3">
        {spots.map((spot, index) => (
          <motion.div
            key={spot.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              {/* Cover */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                {spot.cover_url ? (
                  <img src={spot.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {spot.spot_type === 'weather' ? <Thermometer size={24} className="text-gray-600" /> : <Calculator size={24} className="text-gray-600" />}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ 
                      backgroundColor: `${spot.badge_color}20`,
                      color: spot.badge_color 
                    }}
                  >
                    {spot.badge_label_fr}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {spot.spot_type === 'counter' ? '📊 Compteur' : '🌤️ Météo'}
                  </span>
                  {spot.badge_pulse && (
                    <Zap size={10} className="text-yellow-400" />
                  )}
                </div>
                <p className="text-white text-sm font-medium truncate">{spot.region_label_fr}</p>
                <p className="text-gray-500 text-xs truncate">{spot.text_fr}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                  <span>👁 {spot.clicks_count} clics</span>
                  <span>• #{spot.priority}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {spot.spot_type === 'counter' && (
                  <button
                    onClick={() => resetCounterPeriod(spot.id)}
                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    title="Réinitialiser la période"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                
                <button
                  onClick={() => updatePriority(spot.id, 1)}
                  className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowUp size={14} />
                </button>
                
                <button
                  onClick={() => updatePriority(spot.id, -1)}
                  className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowDown size={14} />
                </button>
                
                <button
                  onClick={() => toggleActive(spot.id, spot.is_active)}
                  className={`p-2 rounded-lg transition-colors ${
                    spot.is_active 
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                      : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                  }`}
                >
                  {spot.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                
                <button
                  onClick={() => openModal(spot)}
                  className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                
                <button
                  onClick={() => deleteSpot(spot.id)}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {spots.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Activity size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Aucun spot configuré</p>
          </div>
        )}
      </div>

      {/* Modal Création/Édition */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
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
                    {editingSpot ? 'Modifier le Spot' : 'Nouveau Live Spot'}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Type de spot */}
                <div>
                  <label className="block text-xs text-gray-400 mb-3 font-mono uppercase tracking-wider">TYPE DE SPOT</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'counter', label: 'Compteur Dynamique', icon: Calculator },
                      { value: 'weather', label: 'Météo', icon: Thermometer }
                    ].map(type => (
                      <button
                        key={type.value}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, spot_type: type.value as any }));
                          setWeatherPreview(null);
                        }}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          formData.spot_type === type.value
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <type.icon size={20} />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Badge Label */}
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider">BADGE LABEL</label>
                  <div className="flex gap-2">
                    {/* Français */}
                    <div className="flex-1">
                      <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇫🇷 Français</label>
                      <input
                        type="text"
                        value={formData.badge_label_fr}
                        onChange={(e) => setFormData(prev => ({ ...prev, badge_label_fr: e.target.value }))}
                        placeholder="EN DIRECT"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>

                    {/* Bouton Auto */}
                    <div className="flex flex-col justify-end pb-0.5">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAutoTranslate('badge', formData.badge_label_fr, 'en')}
                        disabled={isTranslating === 'badge' || !formData.badge_label_fr.trim()}
                        className="px-3 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-1.5 h-10"
                      >
                        {isTranslating === 'badge' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Languages size={12} />
                        )}
                        Auto
                      </motion.button>
                    </div>

                    {/* Anglais */}
                    <div className="flex-1">
                      <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇬🇧 English</label>
                      <input
                        type="text"
                        value={formData.badge_label_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, badge_label_en: e.target.value }))}
                        placeholder="LIVE"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Couleur + Pulse */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">COULEUR BADGE</label>
                    <input
                      type="color"
                      value={formData.badge_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, badge_color: e.target.value }))}
                      className="w-full h-10 rounded-lg cursor-pointer border border-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">ANIMATION</label>
                    <label className="flex items-center justify-between h-10 px-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors border border-white/10">
                      <span className="text-xs text-white font-medium">Clignotant</span>
                      <input
                        type="checkbox"
                        checked={formData.badge_pulse}
                        onChange={(e) => setFormData(prev => ({ ...prev, badge_pulse: e.target.checked }))}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Région Label */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider">RÉGION / LOCALISATION</label>
                  <div className="flex gap-2">
                    {/* Français */}
                    <div className="flex-1">
                      <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇫🇷 Français</label>
                      <input
                        type="text"
                        value={formData.region_label_fr}
                        onChange={(e) => setFormData(prev => ({ ...prev, region_label_fr: e.target.value }))}
                        placeholder="Bénin"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>

                    {/* Bouton Auto */}
                    <div className="flex flex-col justify-end pb-0.5">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAutoTranslate('region', formData.region_label_fr, 'en')}
                        disabled={isTranslating === 'region' || !formData.region_label_fr.trim()}
                        className="px-3 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-1.5 h-10"
                      >
                        {isTranslating === 'region' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Languages size={12} />
                        )}
                        Auto
                      </motion.button>
                    </div>

                    {/* Anglais */}
                    <div className="flex-1">
                      <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇬🇧 English</label>
                      <input
                        type="text"
                        value={formData.region_label_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, region_label_en: e.target.value }))}
                        placeholder="Benin"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Texte descriptif */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider">TEXTE DESCRIPTIF</label>
                  <div className="flex gap-2">
                    {/* Français */}
                    <div className="flex-1">
                      <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇫🇷 Français</label>
                      <textarea
                        value={formData.text_fr}
                        onChange={(e) => setFormData(prev => ({ ...prev, text_fr: e.target.value }))}
                        placeholder="Naissances en temps réel au Bénin"
                        rows={3}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 resize-none transition-colors"
                      />
                    </div>

                    {/* Bouton Auto */}
                    <div className="flex flex-col justify-start pt-7">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAutoTranslate('text', formData.text_fr, 'en')}
                        disabled={isTranslating === 'text' || !formData.text_fr.trim()}
                        className="px-3 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-1.5"
                      >
                        {isTranslating === 'text' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Languages size={12} />
                        )}
                        Auto
                      </motion.button>
                    </div>

                    {/* Anglais */}
                    <div className="flex-1">
                      <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇬🇧 English</label>
                      <textarea
                        value={formData.text_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, text_en: e.target.value }))}
                        placeholder="Real-time births in Benin"
                        rows={3}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 resize-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover image */}
                <div className="pt-2">
                  <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-3">IMAGE DE COUVERTURE (optionnel)</label>
                  
                  {formData.cover_url && (
                    <div className="mb-3 relative">
                      <img 
                        src={formData.cover_url} 
                        alt="Cover" 
                        className="w-full h-32 object-cover rounded-lg border border-white/10"
                      />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, cover_url: '' }))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <label className="block w-full p-6 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-red-500/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 size={24} className="animate-spin text-red-400 mb-2" />
                        <p className="text-xs text-gray-500">Upload en cours...</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={24} className="mx-auto mb-2 text-gray-500" />
                        <p className="text-xs text-gray-500">Cliquer pour uploader (max 2MB)</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Lien de redirection */}
                <div className="pt-2">
                  <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">LIEN DE REDIRECTION</label>
                  <input
                    type="url"
                    value={formData.target_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_url: e.target.value }))}
                    placeholder="https://lukeni.app/..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>

                {/* SECTION COMPTEUR */}
                {formData.spot_type === 'counter' && (
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calculator size={16} className="text-blue-400" />
                      Configuration du Compteur
                    </h4>

                    {/* Type de compteur */}
                    <div>
                      <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">TYPE</label>
                      <select
                        value={formData.counter_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, counter_type: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
                      >
                        <option value="births">Naissances</option>
                        <option value="deaths">Décès</option>
                        <option value="economic">Économique</option>
                        <option value="custom">Personnalisé</option>
                      </select>
                    </div>

                    {/* Unité */}
                    <div className="space-y-3">
                      <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider">UNITÉ</label>
                      <div className="flex gap-2">
                        {/* Français */}
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇫🇷 Français</label>
                          <input
                            type="text"
                            value={formData.counter_unit_fr}
                            onChange={(e) => setFormData(prev => ({ ...prev, counter_unit_fr: e.target.value }))}
                            placeholder="naissances"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                          />
                        </div>

                        {/* Bouton Auto */}
                        <div className="flex flex-col justify-end pb-0.5">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAutoTranslate('unit', formData.counter_unit_fr, 'en')}
                            disabled={isTranslating === 'unit' || !formData.counter_unit_fr.trim()}
                            className="px-3 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-1.5 h-10"
                          >
                            {isTranslating === 'unit' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Languages size={12} />
                            )}
                            Auto
                          </motion.button>
                        </div>

                        {/* Anglais */}
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇬🇧 English</label>
                          <input
                            type="text"
                            value={formData.counter_unit_en}
                            onChange={(e) => setFormData(prev => ({ ...prev, counter_unit_en: e.target.value }))}
                            placeholder="births"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Période */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">PÉRIODE</label>
                        <select
                          value={formData.period_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, period_type: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
                        >
                          <option value="day">Jour</option>
                          <option value="month">Mois</option>
                          <option value="year">Année</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">TOTAL ESTIMÉ</label>
                        <input
                          type="number"
                          value={formData.period_total}
                          onChange={(e) => setFormData(prev => ({ ...prev, period_total: parseFloat(e.target.value) || 0 }))}
                          placeholder="1000"
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">DÉCIMALES</label>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          value={formData.decimals}
                          onChange={(e) => setFormData(prev => ({ ...prev, decimals: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Valeur de départ */}
                    <div>
                      <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">VALEUR DE DÉPART</label>
                      <input
                        type="number"
                        value={formData.start_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_value: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* SECTION MÉTÉO */}
                {formData.spot_type === 'weather' && (
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Thermometer size={16} className="text-blue-400" />
                      Configuration Météo
                    </h4>

                    {/* Ville */}
                    <div className="space-y-3">
                      <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider">VILLE</label>
                      <div className="flex gap-2">
                        {/* Français */}
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇫🇷 Français</label>
                          <input
                            type="text"
                            value={formData.weather_city_fr}
                            onChange={(e) => setFormData(prev => ({ ...prev, weather_city_fr: e.target.value }))}
                            placeholder="Cotonou"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                          />
                        </div>

                        {/* Bouton Auto */}
                        <div className="flex flex-col justify-end pb-0.5">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAutoTranslate('city', formData.weather_city_fr, 'en')}
                            disabled={isTranslating === 'city' || !formData.weather_city_fr.trim()}
                            className="px-3 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-1.5 h-10"
                          >
                            {isTranslating === 'city' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Languages size={12} />
                            )}
                            Auto
                          </motion.button>
                        </div>

                        {/* Anglais */}
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 mb-1.5 font-mono">🇬🇧 English</label>
                          <input
                            type="text"
                            value={formData.weather_city_en}
                            onChange={(e) => setFormData(prev => ({ ...prev, weather_city_en: e.target.value }))}
                            placeholder="Cotonou"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pays */}
                    <div>
                      <label className="block text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">PAYS</label>
                      <select
                        value={formData.weather_country_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, weather_country_code: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
                      >
                        <option value="">-- Sélectionner un pays --</option>
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name_fr} ({country.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Test météo */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={testWeather}
                      disabled={isTesting || !formData.weather_city_fr || !formData.weather_country_code}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg font-bold hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTesting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <TestTube size={16} />
                      )}
                      Vérifier la localisation
                    </motion.button>

                    {/* Preview météo */}
                    {weatherPreview && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={`http://openweathermap.org/img/wn/${weatherPreview.icon}@2x.png`}
                            alt="Weather"
                            className="w-12 h-12"
                          />
                          <div>
                            <p className="text-white font-bold">{weatherPreview.cityName}</p>
                            <p className="text-sm text-gray-400">{weatherPreview.temp}°C - {weatherPreview.condition}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              📍 {weatherPreview.lat.toFixed(4)}, {weatherPreview.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-[#0f0f0f] border-t border-white/10 p-6">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors font-bold"
                  >
                    Annuler
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitSpot}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {editingSpot ? 'Modifier' : 'Créer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}