"use client";

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Volume2, VolumeX, Music, Sparkles, RotateCcw, Play, Pause } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AudioUploader from '@/components/admin/AudioUploader';

type SfxKey = 'win_player' | 'win_ai' | 'seed_sow' | 'capture' | 'click' | 'game_start';

interface SfxState {
  url: string;
  volume: number;
  enabled: boolean;
}

interface BgState {
  url: string;
  volume: number;
  enabled: boolean;
  fadeDuration: number;
}

const SFX_DEFS: { key: SfxKey; label: string; description: string; defaultVolume: number }[] = [
  { key: 'win_player', label: '🏆 Victoire du joueur', description: "Joué quand l'utilisateur remporte la partie", defaultVolume: 0.8 },
  { key: 'win_ai', label: "🤖 Victoire de l'IA (défaite)", description: "Joué quand l'IA gagne — le joueur perd", defaultVolume: 0.8 },
  { key: 'seed_sow', label: '🌱 Semis des graines', description: 'Joué à chaque coup, pendant la distribution des graines', defaultVolume: 0.5 },
  { key: 'capture', label: '💰 Capture de graines', description: "Joué lors d'une capture réussie", defaultVolume: 0.7 },
  { key: 'click', label: '🖱️ Clic sur un trou', description: 'Retour sonore au clic du joueur', defaultVolume: 0.4 },
  { key: 'game_start', label: '🎬 Début de partie', description: 'Joué au lancement ou au reset de la partie', defaultVolume: 0.6 },
];

const LANGUAGES = [
  { code: 'fr', label: 'Français 🇫🇷' },
  { code: 'en', label: 'English 🇬🇧' },
];

const DEFAULT_SFX_STATE: Record<SfxKey, SfxState> = SFX_DEFS.reduce((acc, def) => {
  acc[def.key] = { url: '', volume: def.defaultVolume, enabled: true };
  return acc;
}, {} as Record<SfxKey, SfxState>);

const DEFAULT_BG_STATE: Record<string, BgState> = LANGUAGES.reduce((acc, l) => {
  acc[l.code] = { url: '', volume: 0.25, enabled: true, fadeDuration: 2 };
  return acc;
}, {} as Record<string, BgState>);

export default function AwaleSoundsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [sfx, setSfx] = useState<Record<SfxKey, SfxState>>(DEFAULT_SFX_STATE);
  const [background, setBackground] = useState<Record<string, BgState>>(DEFAULT_BG_STATE);

  const [globalSoundEnabled, setGlobalSoundEnabled] = useState(true);
  const [globalMusicEnabled, setGlobalMusicEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(0.8);

  const [playingKey, setPlayingKey] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [{ data: soundRows }, { data: settings }] = await Promise.all([
        supabase.from('awale_sound_settings').select('*'),
        supabase
          .from('site_settings')
          .select('awale_sound_enabled, awale_music_enabled, awale_master_volume')
          .eq('id', 1)
          .single(),
      ]);

      if (soundRows) {
        const newSfx = { ...DEFAULT_SFX_STATE };
        const newBg = { ...DEFAULT_BG_STATE };

        soundRows.forEach((row: any) => {
          if (row.sound_key === 'background' && row.language) {
            newBg[row.language] = {
              url: row.url || '',
              volume: row.volume ?? 0.25,
              enabled: row.enabled ?? true,
              fadeDuration: row.fade_duration ?? 2,
            };
          } else if (row.sound_key in newSfx) {
            newSfx[row.sound_key as SfxKey] = {
              url: row.url || '',
              volume: row.volume ?? 0.7,
              enabled: row.enabled ?? true,
            };
          }
        });

        setSfx(newSfx);
        setBackground(newBg);
      }

      if (settings) {
        setGlobalSoundEnabled(settings.awale_sound_enabled ?? true);
        setGlobalMusicEnabled(settings.awale_music_enabled ?? true);
        setMasterVolume(settings.awale_master_volume ?? 0.8);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  const handlePreview = (key: string, url: string) => {
    if (!url) return;
    const audio = new Audio(url);
    setPlayingKey(key);
    audio.play().catch(() => setPlayingKey(null));
    audio.onended = () => setPlayingKey(null);
  };

  const handleResetSfx = (key: SfxKey) => {
    const def = SFX_DEFS.find((d) => d.key === key);
    setSfx((prev) => ({
      ...prev,
      [key]: { url: '', volume: def?.defaultVolume || 0.7, enabled: true },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rows: any[] = [];

      SFX_DEFS.forEach((def) => {
        const s = sfx[def.key];
        rows.push({
          sound_key: def.key,
          language: '',
          url: s.url,
          volume: s.volume,
          enabled: s.enabled,
          loop: false,
          fade_duration: 0,
          updated_at: new Date().toISOString(),
        });
      });

      LANGUAGES.forEach((l) => {
        const b = background[l.code];
        rows.push({
          sound_key: 'background',
          language: l.code,
          url: b.url,
          volume: b.volume,
          enabled: b.enabled,
          loop: true,
          fade_duration: b.fadeDuration,
          updated_at: new Date().toISOString(),
        });
      });

      const { error: soundError } = await supabase
        .from('awale_sound_settings')
        .upsert(rows, { onConflict: 'sound_key,language' });

      if (soundError) throw soundError;

      const { error: settingsError } = await supabase
        .from('site_settings')
        .update({
          awale_sound_enabled: globalSoundEnabled,
          awale_music_enabled: globalMusicEnabled,
          awale_master_volume: masterVolume,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (settingsError) throw settingsError;

      showMsg('success', 'Configuration audio sauvegardée !');
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Volume2 className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Sons du jeu Awalé</h2>
          <p className="text-gray-400 text-xs md:text-sm">Effets sonores, musique d'ambiance & réglages globaux</p>
        </div>
      </div>

      {/* Réglages globaux */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-[#D4AF37]" size={18} />
          <h3 className="text-lg font-bold text-white">Réglages globaux</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setGlobalSoundEnabled((v) => !v)}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              globalSoundEnabled
                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-white/5 border-white/10 text-gray-500'
            }`}
          >
            <span className="text-xs font-bold">Effets sonores</span>
            {globalSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={() => setGlobalMusicEnabled((v) => !v)}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              globalMusicEnabled
                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-white/5 border-white/10 text-gray-500'
            }`}
          >
            <span className="text-xs font-bold">Musique d'ambiance</span>
            {globalMusicEnabled ? <Music size={16} /> : <VolumeX size={16} />}
          </button>

          <div className="px-4 py-3 rounded-lg border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-300">Volume maître</span>
              <span className="text-xs text-[#D4AF37] font-mono">{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>
        </div>
      </div>

      {/* Effets sonores */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="text-[#D4AF37]" size={18} />
          <h3 className="text-lg font-bold text-white">Effets sonores (SFX)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SFX_DEFS.map((def) => {
            const s = sfx[def.key];
            return (
              <div key={def.key} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">{def.label}</p>
                    <p className="text-[10px] text-gray-500">{def.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      setSfx((prev) => ({
                        ...prev,
                        [def.key]: { ...prev[def.key], enabled: !prev[def.key].enabled },
                      }))
                    }
                    className={`shrink-0 w-9 h-5 rounded-full transition-all relative ${
                      s.enabled ? 'bg-[#D4AF37]' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        s.enabled ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <AudioUploader
                  label=""
                  currentUrl={s.url}
                  onUpload={(url) => setSfx((prev) => ({ ...prev, [def.key]: { ...prev[def.key], url } }))}
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14 shrink-0">Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={s.volume}
                    onChange={(e) =>
                      setSfx((prev) => ({
                        ...prev,
                        [def.key]: { ...prev[def.key], volume: parseFloat(e.target.value) },
                      }))
                    }
                    className="flex-1 accent-[#D4AF37]"
                  />
                  <span className="text-[10px] text-[#D4AF37] font-mono w-9 text-right">
                    {Math.round(s.volume * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(def.key, s.url)}
                    disabled={!s.url}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-300 disabled:opacity-30 transition-all"
                  >
                    {playingKey === def.key ? <Pause size={12} /> : <Play size={12} />}
                    Tester
                  </button>
                  <button
                    onClick={() => handleResetSfx(def.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-400 transition-all"
                  >
                    <RotateCcw size={12} />
                    Réinitialiser
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Musique d'ambiance par langue */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Music className="text-[#D4AF37]" size={18} />
          <h3 className="text-lg font-bold text-white">Musique d'ambiance (par langue)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LANGUAGES.map((l) => {
            const b = background[l.code];
            return (
              <div key={l.code} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{l.label}</p>
                  <button
                    onClick={() =>
                      setBackground((prev) => ({
                        ...prev,
                        [l.code]: { ...prev[l.code], enabled: !prev[l.code].enabled },
                      }))
                    }
                    className={`w-9 h-5 rounded-full transition-all relative ${
                      b.enabled ? 'bg-[#D4AF37]' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        b.enabled ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <AudioUploader
                  label=""
                  currentUrl={b.url}
                  onUpload={(url) => setBackground((prev) => ({ ...prev, [l.code]: { ...prev[l.code], url } }))}
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14 shrink-0">Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={b.volume}
                    onChange={(e) =>
                      setBackground((prev) => ({
                        ...prev,
                        [l.code]: { ...prev[l.code], volume: parseFloat(e.target.value) },
                      }))
                    }
                    className="flex-1 accent-[#D4AF37]"
                  />
                  <span className="text-[10px] text-[#D4AF37] font-mono w-9 text-right">
                    {Math.round(b.volume * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14 shrink-0">Fondu</span>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={b.fadeDuration}
                    onChange={(e) =>
                      setBackground((prev) => ({
                        ...prev,
                        [l.code]: { ...prev[l.code], fadeDuration: parseFloat(e.target.value) },
                      }))
                    }
                    className="flex-1 accent-[#D4AF37]"
                  />
                  <span className="text-[10px] text-[#D4AF37] font-mono w-12 text-right">{b.fadeDuration}s</span>
                </div>

                <button
                  onClick={() => handlePreview(`bg_${l.code}`, b.url)}
                  disabled={!b.url}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-300 disabled:opacity-30 transition-all"
                >
                  {playingKey === `bg_${l.code}` ? <Pause size={12} /> : <Play size={12} />}
                  Tester
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
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