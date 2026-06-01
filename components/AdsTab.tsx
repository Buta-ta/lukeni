"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, PlusCircle, Edit2, Trash2, X, CheckCircle,
  Star, Eye, MousePointerClick, Languages, Wand2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ImageUploader from '@/components/admin/ImageUploader';

interface Ad {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  image_url: string;
  link_url: string;
  position: 'hero' | 'between_sections' | 'trending' | 'footer';
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  impressions: number;
  clicks: number;
  created_at: string;
}

const POSITIONS = [
  { id: 'hero', label: 'Hero Carousel', desc: 'Intégré au carousel principal' },
  { id: 'between_sections', label: 'Entre sections', desc: 'Entre Tendances et Carte Musicale' },
  { id: 'trending', label: 'Trending', desc: 'Carte sponsorisée dans le carousel' },
  { id: 'footer', label: 'Footer', desc: 'Bannière avant le footer' },
] as const;

// Traducteur auto via MyMemory (gratuit)
async function translateText(text: string, from: string, _to: string): Promise<string> {
  if (!text.trim()) return '';
  try {
    const res = await fetch('/api/lingua', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'translate',
        text,
        lang: from,
      }),
    });
    const json = await res.json();
    return json.result || '';
  } catch {
    return '';
  }
}

export default function AdsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState<'fr' | 'en' | null>(null);

  // Form fields
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [position, setPosition] = useState<Ad['position']>('between_sections');
  const [active, setActive] = useState(true);
  const [priority, setPriority] = useState(1);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => { fetchAds(); }, []);

  async function fetchAds() {
    setIsLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setAds(data as unknown as Ad[]);
    setIsLoading(false);
  }

  const resetForm = () => {
    setEditingId(null);
    setTitleFr(''); setTitleEn('');
    setDescFr(''); setDescEn('');
    setImageUrl(''); setLinkUrl('');
    setPosition('between_sections');
    setActive(true); setPriority(1);
    setStartsAt(''); setEndsAt('');
  };

  const handleEdit = (ad: Ad) => {
    setEditingId(ad.id);
    setTitleFr(ad.title_fr || '');
    setTitleEn(ad.title_en || '');
    setDescFr(ad.description_fr || '');
    setDescEn(ad.description_en || '');
    setImageUrl(ad.image_url || '');
    setLinkUrl(ad.link_url);
    setPosition(ad.position);
    setActive(ad.active);
    setPriority(ad.priority);
    setStartsAt(ad.starts_at ? ad.starts_at.slice(0, 16) : '');
    setEndsAt(ad.ends_at ? ad.ends_at.slice(0, 16) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Traduire FR → EN
  const translateFrToEn = async () => {
    if (!titleFr && !descFr) return showMsg('error', 'Rien à traduire (champs FR vides)');
    setIsTranslating('en');
    const [tTitle, tDesc] = await Promise.all([
      titleFr ? translateText(titleFr, 'fr', 'en') : Promise.resolve(''),
      descFr ? translateText(descFr, 'fr', 'en') : Promise.resolve(''),
    ]);
    if (tTitle) setTitleEn(tTitle);
    if (tDesc) setDescEn(tDesc);
    setIsTranslating(null);
    showMsg('success', 'Traduction FR→EN effectuée !');
  };

  // Traduire EN → FR
  const translateEnToFr = async () => {
    if (!titleEn && !descEn) return showMsg('error', 'Rien à traduire (champs EN vides)');
    setIsTranslating('fr');
    const [tTitle, tDesc] = await Promise.all([
      titleEn ? translateText(titleEn, 'en', 'fr') : Promise.resolve(''),
      descEn ? translateText(descEn, 'en', 'fr') : Promise.resolve(''),
    ]);
    if (tTitle) setTitleFr(tTitle);
    if (tDesc) setDescFr(tDesc);
    setIsTranslating(null);
    showMsg('success', 'Traduction EN→FR effectuée !');
  };

  const handleSave = async () => {
    if (!linkUrl.trim()) return showMsg('error', 'URL de lien requise.');
    setIsSaving(true);
    try {
      const payload = {
        title_fr: titleFr || null,
        title_en: titleEn || null,
        description_fr: descFr || null,
        description_en: descEn || null,
        image_url: imageUrl || null,
        link_url: linkUrl,
        position, active, priority,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      };

      if (editingId) {
        const { error } = await supabase.from('ads').update(payload).eq('id', editingId);
        if (error) throw error;
        setAds(ads.map(a => a.id === editingId ? { ...a, ...payload } as Ad : a));
        showMsg('success', 'Publicité mise à jour !');
      } else {
        const { data, error } = await supabase.from('ads').insert(payload).select().single();
        if (error) throw error;
        setAds([data as unknown as Ad, ...ads]);
        showMsg('success', 'Publicité créée !');
      }
      resetForm();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette publicité ?')) return;
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (!error) {
      setAds(ads.filter(a => a.id !== id));
      showMsg('success', 'Supprimée.');
    } else showMsg('error', error.message);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('ads').update({ active: !current }).eq('id', id);
    if (!error) {
      setAds(ads.map(a => a.id === id ? { ...a, active: !current } as Ad : a));
      showMsg('success', `Publicité ${!current ? 'activée' : 'désactivée'}.`);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Star className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Publicités</h2>
          <p className="text-gray-400 text-xs">
            {ads.length} publicités · {ads.filter(a => a.active).length} actives
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/8 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId
              ? <Edit2 size={18} className="text-[#D4AF37]" />
              : <PlusCircle size={18} className="text-[#D4AF37]" />}
            {editingId ? 'Modifier la publicité' : 'Nouvelle Publicité'}
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <X size={14} /> Annuler
            </button>
          )}
        </div>

        {/* Titres + Traducteur */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">
              Titres & Descriptions
            </label>
            {/* Boutons traduction */}
            <div className="flex items-center gap-2">
              <button
                onClick={translateFrToEn}
                disabled={!!isTranslating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border 
                  border-blue-500/20 rounded-lg text-[10px] text-blue-400 
                  hover:bg-blue-500/20 transition-all disabled:opacity-40 font-bold"
              >
                {isTranslating === 'en'
                  ? <Loader2 size={10} className="animate-spin" />
                  : <Wand2 size={10} />}
                FR → EN
              </button>
              <button
                onClick={translateEnToFr}
                disabled={!!isTranslating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border 
                  border-purple-500/20 rounded-lg text-[10px] text-purple-400 
                  hover:bg-purple-500/20 transition-all disabled:opacity-40 font-bold"
              >
                {isTranslating === 'fr'
                  ? <Loader2 size={10} className="animate-spin" />
                  : <Wand2 size={10} />}
                EN → FR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Colonne FR */}
            <div className="space-y-3 p-4 bg-[#1a1a1a] rounded-xl border border-white/8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🇫🇷</span>
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Français</span>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Titre</label>
                <input
                  type="text"
                  value={titleFr}
                  onChange={e => setTitleFr(e.target.value)}
                  placeholder="Titre en français..."
                  className="w-full bg-[#111] border border-white/15 rounded-lg px-3 py-2 
                    text-white text-sm outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Description</label>
                <textarea
                  value={descFr}
                  onChange={e => setDescFr(e.target.value)}
                  placeholder="Description courte en français..."
                  rows={3}
                  className="w-full bg-[#111] border border-white/15 rounded-lg px-3 py-2 
                    text-white text-sm outline-none focus:border-[#D4AF37] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Colonne EN */}
            <div className="space-y-3 p-4 bg-[#1a1a1a] rounded-xl border border-white/8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🇬🇧</span>
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">English</span>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={e => setTitleEn(e.target.value)}
                  placeholder="Title in English..."
                  className="w-full bg-[#111] border border-white/15 rounded-lg px-3 py-2 
                    text-white text-sm outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Description</label>
                <textarea
                  value={descEn}
                  onChange={e => setDescEn(e.target.value)}
                  placeholder="Short description in English..."
                  rows={3}
                  className="w-full bg-[#111] border border-white/15 rounded-lg px-3 py-2 
                    text-white text-sm outline-none focus:border-[#D4AF37] transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Link URL */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 font-mono">🔗 URL de destination *</label>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-2.5 
              text-white text-sm outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>

        {/* Image */}
        <ImageUploader
          label="Image de la publicité"
          currentUrl={imageUrl}
          onUpload={setImageUrl}
        />

        {/* Position */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-mono">📍 Emplacement</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {POSITIONS.map(pos => (
              <button
                key={pos.id}
                onClick={() => setPosition(pos.id as Ad['position'])}
                className={`p-3 rounded-lg border text-left transition-all ${
                  position === pos.id
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white'
                    : 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <p className="text-sm font-bold">{pos.label}</p>
                <p className="text-[10px] text-gray-500">{pos.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Priority & Active */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">⭐ Priorité</label>
            <select
              value={priority}
              onChange={e => setPriority(parseInt(e.target.value))}
              className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-2.5 
                text-white text-sm outline-none focus:border-[#D4AF37]"
            >
              {[1, 2, 3, 4, 5].map(p => (
                <option key={p} value={p}>{p} — {'⭐'.repeat(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">📊 Statut</label>
            <button
              onClick={() => setActive(!active)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all ${
                active
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-[#1a1a1a] border-white/10 text-gray-400'
              }`}
            >
              <span className="text-sm font-bold">{active ? 'Actif' : 'Inactif'}</span>
              <div className={`w-10 h-5 rounded-full transition-all ${active ? 'bg-green-500' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-all mt-0.5 ${
                  active ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </button>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">📅 Début (optionnel)</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-2.5 
                text-white text-sm outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">📅 Fin (optionnel)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-2.5 
                text-white text-sm outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Avertissement dates */}
{(startsAt || endsAt) && (
  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
    <p className="text-amber-400 text-xs flex items-start gap-2">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <span>
        {startsAt && new Date(startsAt) > new Date()
          ? `La pub ne s'affichera qu'à partir du ${new Date(startsAt).toLocaleString('fr-FR')}.`
          : ''}
        {endsAt && new Date(endsAt) < new Date()
          ? ` La pub a expiré le ${new Date(endsAt).toLocaleString('fr-FR')} et ne s'affiche plus.`
          : ''}
        {endsAt && new Date(endsAt) > new Date() && startsAt && new Date(startsAt) <= new Date()
          ? ` La pub est active jusqu'au ${new Date(endsAt).toLocaleString('fr-FR')}.`
          : ''}
        {'\n'}Laissez les dates vides pour une diffusion permanente.
      </span>
    </p>
  </div>
)}
        </div>

        {/* Save */}
        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 
              rounded-lg font-bold text-sm hover:bg-white disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {editingId ? 'Mettre à jour' : 'Créer la publicité'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {ads.map(ad => (
          <div
            key={ad.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 
              border rounded-xl gap-3 transition-all ${
              ad.active
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-white/[0.02] border-white/10'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {ad.image_url && (
                <div className="shrink-0 w-16 h-10 rounded-lg overflow-hidden border border-white/10">
                  <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    ad.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>{ad.active ? 'Actif' : 'Inactif'}</span>
                  <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {POSITIONS.find(p => p.id === ad.position)?.label}
                  </span>
                  <span className="text-[10px] text-[#D4AF37]">{'⭐'.repeat(ad.priority)}</span>
                </div>
                <p className="text-white text-sm font-medium truncate">
                  {ad.title_fr || ad.link_url}
                </p>
                {ad.description_fr && (
                  <p className="text-white/30 text-[10px] truncate mt-0.5">{ad.description_fr}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><Eye size={8} /> {ad.impressions || 0} vues</span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick size={8} /> {ad.clicks || 0} clics
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(ad.id, ad.active)}
                className={`p-2 rounded-lg transition-colors ${
                  ad.active
                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
                title={ad.active ? 'Désactiver' : 'Activer'}
              >
                <Star size={16} fill={ad.active ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => handleEdit(ad)}
                className="p-2 bg-white/5 text-gray-400 hover:text-[#D4AF37] rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(ad.id)}
                className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {ads.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">Aucune publicité.</p>
        )}
      </div>
    </div>
  );
}