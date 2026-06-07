"use client";

import React, { useState, useEffect } from 'react';
import {
  Loader2, CalendarDays, PlusCircle, Edit2, Trash2, X,
  Languages, SpellCheck, CheckCircle, MapPin, Bell, BellOff,
  Calendar, Star, Globe // <-- Ajout de Globe pour l'icône Explorer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';
import ImageUploader from '@/components/admin/ImageUploader';

interface Category { id: string; name_fr: string; name_en: string; }
interface EventItem {
  id: string;
  title_fr: string;
  title_en: string;
  desc_fr: string;
  desc_en: string;
  description_fr?: string;
  description_en?: string;
  year: number;
  country: string;
  importance: number;
  category_id: string;
  latitude: number;
  longitude: number;
  image_url: string;
  event_month?: number;
  event_day?: number;
  notify_anniversary?: boolean;
  featured_on_landing?: boolean;
  featured_on_explore?: boolean; // <-- NOUVEAU
  categories: Category;
}

export default function EventsTab({ showMsg }: {
  showMsg: (type: 'success' | 'error', text: string) => void
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [eventMonth, setEventMonth] = useState<string>('');
  const [eventDay, setEventDay] = useState<string>('');
  const [notifyAnniversary, setNotifyAnniversary] = useState(false);
  const [featuredOnLanding, setFeaturedOnLanding] = useState(false);
  const [featuredOnExplore, setFeaturedOnExplore] = useState(false); // <-- NOUVEAU
  const [country, setCountry] = useState('');
  const [importance, setImportance] = useState(3);
  const [catId, setCatId] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name_fr, name_en');
      if (catData) setCategories(catData);

      const { data: evtData } = await supabase
        .from('events')
        .select('*, categories(id, name_fr, name_en)')
        .order('year', { ascending: false });
      if (evtData) setEvents(evtData as unknown as EventItem[]);
      setIsLoading(false);
    }
    fetch();
  }, []);

  const resetForm = () => {
    setEditingId(null); setTitleFr(''); setTitleEn('');
    setDescFr(''); setDescEn(''); setYear(new Date().getFullYear());
    setEventMonth(''); setEventDay(''); setNotifyAnniversary(false);
    setFeaturedOnLanding(false);
    setFeaturedOnExplore(false); // <-- NOUVEAU
    setCountry(''); setImportance(3); setCatId('');
    setLat(0); setLng(0); setImageUrl('');
  };

  const handleEdit = (evt: EventItem) => {
    setEditingId(evt.id);
    setTitleFr(evt.title_fr || '');
    setTitleEn(evt.title_en || '');
    setDescFr(evt.desc_fr || evt.description_fr || '');
    setDescEn(evt.desc_en || evt.description_en || '');
    setYear(evt.year);

    setEventMonth(evt.event_month ? String(evt.event_month) : '');
    setEventDay(evt.event_day ? String(evt.event_day) : '');
    setNotifyAnniversary(evt.notify_anniversary || false);
    setFeaturedOnLanding(evt.featured_on_landing || false);
    setFeaturedOnExplore(evt.featured_on_explore || false); // <-- NOUVEAU
    setCountry(evt.country || '');
    setImportance(evt.importance);
    setCatId(evt.category_id || '');
    setLat(evt.latitude || 0);
    setLng(evt.longitude || 0);
    setImageUrl(evt.image_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLingua = async (action: string) => {
    setIsProcessing(action);
    try {
      if (action === 'translate-en') setTitleEn(await autoTranslate(titleFr, 'fr'));
      if (action === 'translate-fr') setTitleFr(await autoTranslate(titleEn, 'en'));
      if (action === 'correct-fr') setTitleFr(await autoCorrect(titleFr, 'fr'));
      if (action === 'correct-en') setTitleEn(await autoCorrect(titleEn, 'en'));
      if (action === 'translate-desc-en') setDescEn(await autoTranslate(descFr, 'fr'));
      if (action === 'translate-desc-fr') setDescFr(await autoTranslate(descEn, 'en'));
      if (action === 'correct-desc-fr') setDescFr(await autoCorrect(descFr, 'fr'));
      if (action === 'correct-desc-en') setDescEn(await autoCorrect(descEn, 'en'));
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur API');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSave = async () => {
    if (!titleFr.trim() || !titleEn.trim()) return showMsg('error', 'Titres requis.');
    setIsSaving(true);
    try {
      const slug = titleFr.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        + '-' + year;

      const payload = {
        title_fr: titleFr,
        title_en: titleEn,
        description_fr: descFr || null,
        description_en: descEn || null,
        desc_fr: descFr || null,
        desc_en: descEn || null,
        year,
        month: eventMonth ? parseInt(eventMonth) : 1,
        day: eventDay ? parseInt(eventDay) : 1,
        event_month: eventMonth ? parseInt(eventMonth) : null,
        event_day: eventDay ? parseInt(eventDay) : null,
        notify_anniversary: notifyAnniversary,
        featured_on_landing: featuredOnLanding,
        featured_on_explore: featuredOnExplore, // <-- NOUVEAU
        country,
        country_code: country || '🌍',
        importance,
        category_id: catId || null,
        latitude: lat || null,
        longitude: lng || null,
        image_url: imageUrl || null,
        slug,
        status: 'published',
      };

      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId);
        if (error) throw error;
        setEvents(events.map(e => e.id === editingId
          ? { ...e, ...payload, categories: categories.find(c => c.id === catId) as Category }
          : e
        ));
        showMsg('success', 'Événement mis à jour !');
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(payload)
          .select('*, categories(id, name_fr, name_en)')
          .single();
        if (error) throw error;
        setEvents([data as unknown as EventItem, ...events]);
        showMsg('success', 'Événement créé !');
      }
      resetForm();
    } catch (err: any) { 
      console.error('Save error:', err);
      showMsg('error', err.message || 'Erreur inconnue'); 
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      setEvents(events.filter(e => e.id !== id));
      showMsg('success', 'Supprimé.');
    } else showMsg('error', error.message);
  };

  const MONTHS = [
    { v: '1', fr: 'Janvier' }, { v: '2', fr: 'Février' },
    { v: '3', fr: 'Mars' }, { v: '4', fr: 'Avril' },
    { v: '5', fr: 'Mai' }, { v: '6', fr: 'Juin' },
    { v: '7', fr: 'Juillet' }, { v: '8', fr: 'Août' },
    { v: '9', fr: 'Septembre' }, { v: '10', fr: 'Octobre' },
    { v: '11', fr: 'Novembre' }, { v: '12', fr: 'Décembre' },
  ];

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Événements</h2>
          <p className="text-gray-400 text-xs">
            {events.length} événements
            {events.filter(e => e.featured_on_landing).length > 0 && (
              <span className="text-[#D4AF37] ml-2">
                • {events.filter(e => e.featured_on_landing).length} Landing
              </span>
            )}
            {events.filter(e => e.featured_on_explore).length > 0 && (
              <span className="text-blue-400 ml-2">
                • {events.filter(e => e.featured_on_explore).length} Explorer
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-lg border border-white/5 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId
              ? <Edit2 size={18} className="text-[#D4AF37]" />
              : <PlusCircle size={18} className="text-[#D4AF37]" />
            }
            {editingId ? 'Modifier' : 'Nouvel Événement'}
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X size={14} /> Annuler
            </button>
          )}
        </div>

        {/* Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Titre FR</label>
            <input
              type="text" value={titleFr}
              onChange={e => setTitleFr(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleLingua('correct-fr')}
                disabled={isProcessing === 'correct-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <SpellCheck size={10} /> Corriger
              </button>
              <button
                onClick={() => handleLingua('translate-fr')}
                disabled={isProcessing === 'translate-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} /> EN→FR
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Titre EN</label>
            <input
              type="text" value={titleEn}
              onChange={e => setTitleEn(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleLingua('correct-en')}
                disabled={isProcessing === 'correct-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <SpellCheck size={10} /> Correct
              </button>
              <button
                onClick={() => handleLingua('translate-en')}
                disabled={isProcessing === 'translate-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} /> FR→EN
              </button>
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Description FR</label>
            <textarea
              value={descFr} onChange={e => setDescFr(e.target.value)}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] resize-none"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleLingua('correct-desc-fr')}
                disabled={isProcessing === 'correct-desc-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <SpellCheck size={10} /> Corriger
              </button>
              <button
                onClick={() => handleLingua('translate-desc-fr')}
                disabled={isProcessing === 'translate-desc-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} /> EN→FR
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Description EN</label>
            <textarea
              value={descEn} onChange={e => setDescEn(e.target.value)}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] resize-none"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleLingua('correct-desc-en')}
                disabled={isProcessing === 'correct-desc-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <SpellCheck size={10} /> Correct
              </button>
              <button
                onClick={() => handleLingua('translate-desc-en')}
                disabled={isProcessing === 'translate-desc-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} /> FR→EN
              </button>
            </div>
          </div>
        </div>

        {/* Date complète */}
        <div className="p-4 bg-[#1a1a1a] rounded-lg border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-[#D4AF37]" />
            <span className="text-xs font-bold text-gray-300">Date de l'événement</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-mono">📅 Année *</label>
              <input
                type="number" value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-mono">📆 Mois</label>
              <select
                value={eventMonth}
                onChange={e => setEventMonth(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]"
              >
                <option value="">— Inconnu</option>
                {MONTHS.map(m => (
                  <option key={m.v} value={m.v}>{m.fr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-mono">🗓️ Jour</label>
              <input
                type="number" min="1" max="31"
                value={eventDay}
                onChange={e => setEventDay(e.target.value)}
                placeholder="1-31"
                disabled={!eventMonth}
                className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] disabled:opacity-30"
              />
            </div>
          </div>
        </div>

        {/* Boutons de Visibilité (Landing & Explore) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Landing Page */}
          <div className={`p-4 rounded-lg border transition-all ${featuredOnLanding ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30' : 'bg-[#1a1a1a] border-white/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star size={16} className={featuredOnLanding ? 'text-[#D4AF37]' : 'text-gray-600'} fill={featuredOnLanding ? '#D4AF37' : 'none'} />
                <div>
                  <p className={`text-sm font-bold ${featuredOnLanding ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
                    Hero de l'Accueil (Landing)
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Mis en vedette à l'accueil</p>
                </div>
              </div>
              <button
                onClick={() => setFeaturedOnLanding(!featuredOnLanding)}
                className={`relative w-12 h-6 rounded-full transition-all ${featuredOnLanding ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${featuredOnLanding ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Explore Page */}
          <div className={`p-4 rounded-lg border transition-all ${featuredOnExplore ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#1a1a1a] border-white/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe size={16} className={featuredOnExplore ? 'text-blue-400' : 'text-gray-600'} />
                <div>
                  <p className={`text-sm font-bold ${featuredOnExplore ? 'text-blue-400' : 'text-gray-400'}`}>
                    Hero de l'Explorer
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Mis en vedette sur l'explorateur</p>
                </div>
              </div>
              <button
                onClick={() => setFeaturedOnExplore(!featuredOnExplore)}
                className={`relative w-12 h-6 rounded-full transition-all ${featuredOnExplore ? 'bg-blue-500' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${featuredOnExplore ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

        </div>

        {/* Notification anniversaire */}
        <div className={`p-4 rounded-lg border transition-all ${notifyAnniversary ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30' : 'bg-[#1a1a1a] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notifyAnniversary ? <Bell size={16} className="text-[#D4AF37]" /> : <BellOff size={16} className="text-gray-600" />}
              <div>
                <p className={`text-sm font-bold ${notifyAnniversary ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
                  Notification anniversaire
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {eventMonth && eventDay ? `Notifier les utilisateurs chaque ${eventDay}/${eventMonth}` : 'Renseignez le jour et le mois pour activer'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotifyAnniversary(!notifyAnniversary)}
              disabled={!eventMonth || !eventDay}
              className={`relative w-12 h-6 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed ${notifyAnniversary ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifyAnniversary ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🌍 Pays (Drapeau)</label>
            <input
              type="text" value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="🇨🇩"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">⭐ Importance</label>
            <select
              value={importance}
              onChange={e => setImportance(parseInt(e.target.value))}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
            >
              {[1, 2, 3, 4, 5].map(i => (
                <option key={i} value={i}>{'⭐'.repeat(i)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🏷️ Catégorie</label>
            <select
              value={catId}
              onChange={e => setCatId(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
            >
              <option value="">Aucune</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name_fr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* GPS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
              <MapPin size={10} /> Latitude
            </label>
            <input
              type="number" step="any" value={lat}
              onChange={e => setLat(parseFloat(e.target.value))}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
              placeholder="-4.0383"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
              <MapPin size={10} /> Longitude
            </label>
            <input
              type="number" step="any" value={lng}
              onChange={e => setLng(parseFloat(e.target.value))}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
              placeholder="21.7586"
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <ImageUploader
            label="Image de l'événement"
            currentUrl={imageUrl}
            onUpload={setImageUrl}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-white disabled:opacity-50 transition-colors"
          >
            {isSaving
              ? <Loader2 size={16} className="animate-spin" />
              : <CheckCircle size={16} />
            }
            {editingId ? 'Mettre à jour' : 'Créer l\'événement'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {events.map(evt => (
          <div
            key={evt.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3 transition-all ${
                evt.featured_on_landing || evt.featured_on_explore
                ? 'bg-white/[0.04] border-white/20'
                : 'bg-white/[0.02] border-white/10'
              }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[#D4AF37] font-bold text-sm font-mono">{evt.year}</span>
                {evt.event_month && evt.event_day && (
                  <span className="text-gray-600 text-[10px] font-mono">
                    {String(evt.event_day).padStart(2, '0')}/{String(evt.event_month).padStart(2, '0')}
                  </span>
                )}
                <span className="text-xl">{evt.country}</span>
                {evt.categories && (
                  <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {evt.categories.name_fr}
                  </span>
                )}
                
                {/* Badges de statut */}
                {evt.featured_on_landing && (
                  <span className="flex items-center gap-1 text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                    <Star size={9} fill="#D4AF37" /> Landing
                  </span>
                )}
                {evt.featured_on_explore && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    <Globe size={9} /> Explorer
                  </span>
                )}
                {evt.notify_anniversary && (
                  <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                    <Bell size={9} /> Notif
                  </span>
                )}
              </div>
              <p className="text-white text-sm font-medium truncate">{evt.title_fr}</p>
              <p className="text-gray-500 text-xs italic truncate">{evt.title_en}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(evt)}
                className="p-2 bg-white/5 text-gray-400 hover:text-[#D4AF37] rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(evt.id)}
                className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">Aucun événement.</p>
        )}
      </div>
    </div>
  );
}