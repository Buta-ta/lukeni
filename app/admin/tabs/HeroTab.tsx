"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, LinkIcon, Loader2, ImagePlus, Video, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ImageUploader from '@/components/admin/ImageUploader';

export default function HeroTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Hero media
  const [heroBgUrl, setHeroBgUrl] = useState<string>('');
  const [heroMediaType, setHeroMediaType] = useState<'image' | 'video'>('image');
  
  // Portal images
  const [portalEncyclopedia, setPortalEncyclopedia] = useState<string>('');
  const [portalPress, setPortalPress] = useState<string>('');
  const [portalMusical, setPortalMusical] = useState<string>('');
  const [portalLibrary, setPortalLibrary] = useState<string>('');

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (data) {
        setHeroBgUrl(data.hero_background_url || '');
        setHeroMediaType((data.hero_media_type as 'image' | 'video') || 'image');
        setPortalEncyclopedia(data.portal_img_encyclopedia || '');
        setPortalPress(data.portal_img_press || '');
        setPortalMusical(data.portal_img_musical || '');
        setPortalLibrary(data.portal_img_library || '');
      }
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('site_settings').update({
      hero_background_url: heroBgUrl,
      hero_media_type: heroMediaType,
      portal_img_encyclopedia: portalEncyclopedia,
      portal_img_press: portalPress,
      portal_img_musical: portalMusical,
      portal_img_library: portalLibrary,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    
    if (error) {
      showMsg('error', error.message);
    } else {
      showMsg('success', 'Paramètres sauvegardés !');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ImagePlus className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Apparence Explorer</h2>
          <p className="text-gray-400 text-xs md:text-sm">Hero carousel + images des espaces</p>
        </div>
      </div>

      {/* Section 1 — Hero Media */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="text-[#D4AF37]" size={18} />
          <h3 className="text-lg font-bold text-white">Média Hero (Carousel)</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-mono">Type de média</label>
            <div className="flex gap-2">
              <button
                onClick={() => setHeroMediaType('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  heroMediaType === 'image'
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <ImagePlus size={16} /> Image
              </button>
              <button
                onClick={() => setHeroMediaType('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  heroMediaType === 'video'
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Video size={16} /> Vidéo
              </button>
            </div>
          </div>

          <ImageUploader
            label={heroMediaType === 'image' ? "Image du Hero" : "Vidéo du Hero (MP4)"}
            currentUrl={heroBgUrl}
            onUpload={setHeroBgUrl}
           
          />

          {heroBgUrl && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Aperçu</p>
              <div className="relative w-full h-40 md:h-56 rounded-lg overflow-hidden border border-white/10">
                {heroMediaType === 'video' ? (
                  <video
                    src={heroBgUrl}
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${heroBgUrl})`,
                      filter: 'grayscale(100%) contrast(1.3) brightness(0.5) sepia(0.2)',
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2 — Images des Portails */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="text-[#D4AF37]" size={18} />
          <h3 className="text-lg font-bold text-white">Images des Espaces</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'encyclopedia', label: 'Encyclopédie', state: portalEncyclopedia, setter: setPortalEncyclopedia },
            { key: 'press', label: 'Presse', state: portalPress, setter: setPortalPress },
            { key: 'musical', label: 'Voyage Musical', state: portalMusical, setter: setPortalMusical },
            { key: 'library', label: 'Bibliothèque', state: portalLibrary, setter: setPortalLibrary },
          ].map((portal) => (
            <div key={portal.key} className="space-y-2">
              <label className="block text-xs text-gray-400 font-mono">{portal.label}</label>
              <ImageUploader
                label=""
                currentUrl={portal.state}
                onUpload={portal.setter}
                
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-3 bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-bold hover:bg-white transition-all disabled:opacity-40 text-sm"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}