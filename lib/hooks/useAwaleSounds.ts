"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type SfxKey = 'win_player' | 'win_ai' | 'seed_sow' | 'capture' | 'click' | 'game_start';

interface SoundConfig { url: string; volume: number; enabled: boolean; }
interface BackgroundConfig extends SoundConfig { fadeDuration: number; }

interface AwaleAudioConfig {
  sfx: Record<SfxKey, SoundConfig>;
  background: Record<string, BackgroundConfig>;
  globalSoundEnabled: boolean;
  globalMusicEnabled: boolean;
  masterVolume: number;
}

const DEFAULT_SOUNDS: Record<SfxKey, string> = {
  win_player: '/sounds/awale/default-win.mp3',
  win_ai: '/sounds/awale/default-lose.mp3',
  seed_sow: '/sounds/awale/default-seed.mp3',
  capture: '/sounds/awale/default-capture.mp3',
  click: '/sounds/awale/default-click.mp3',
  game_start: '/sounds/awale/default-start.mp3',
};

const DEFAULT_BACKGROUND: Record<string, string> = {
  fr: '/sounds/awale/default-bg-fr.mp3',
  en: '/sounds/awale/default-bg-en.mp3',
};

const LS_MUTED_KEY = 'awale_user_muted';
const LS_VOLUME_KEY = 'awale_user_volume';

let cachedConfig: AwaleAudioConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchAwaleAudioConfig(): Promise<AwaleAudioConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) return cachedConfig;

  const sfx: Record<SfxKey, SoundConfig> = {
    win_player: { url: DEFAULT_SOUNDS.win_player, volume: 0.8, enabled: true },
    win_ai: { url: DEFAULT_SOUNDS.win_ai, volume: 0.8, enabled: true },
    seed_sow: { url: DEFAULT_SOUNDS.seed_sow, volume: 0.5, enabled: true },
    capture: { url: DEFAULT_SOUNDS.capture, volume: 0.7, enabled: true },
    click: { url: DEFAULT_SOUNDS.click, volume: 0.4, enabled: true },
    game_start: { url: DEFAULT_SOUNDS.game_start, volume: 0.6, enabled: true },
  };

  const background: Record<string, BackgroundConfig> = {
    fr: { url: DEFAULT_BACKGROUND.fr, volume: 0.25, enabled: true, fadeDuration: 2 },
    en: { url: DEFAULT_BACKGROUND.en, volume: 0.25, enabled: true, fadeDuration: 2 },
  };

  let globalSoundEnabled = true;
  let globalMusicEnabled = true;
  let masterVolume = 0.8;

  try {
    const [{ data: soundRows }, { data: settings }] = await Promise.all([
      supabase.from('awale_sound_settings').select('*'),
      supabase.from('site_settings')
        .select('awale_sound_enabled,awale_music_enabled,awale_master_volume')
        .eq('id', 1).single(),
    ]);

    if (soundRows) {
      soundRows.forEach((row: any) => {
        if (row.sound_key === 'background' && row.language) {
          background[row.language] = {
            url: row.url || DEFAULT_BACKGROUND[row.language] || '',
            volume: row.volume ?? 0.25,
            enabled: row.enabled ?? true,
            fadeDuration: row.fade_duration ?? 2,
          };
        } else if (row.language === '' && row.sound_key in sfx) {
          sfx[row.sound_key as SfxKey] = {
            url: row.url || DEFAULT_SOUNDS[row.sound_key as SfxKey],
            volume: row.volume ?? 0.7,
            enabled: row.enabled ?? true,
          };
        }
      });
    }
    if (settings) {
      globalSoundEnabled = settings.awale_sound_enabled ?? true;
      globalMusicEnabled = settings.awale_music_enabled ?? true;
      masterVolume = settings.awale_master_volume ?? 0.8;
    }
  } catch (err) {
    console.warn('[useAwaleSounds] fallback to defaults', err);
  }

  cachedConfig = { sfx, background, globalSoundEnabled, globalMusicEnabled, masterVolume };
  cacheTimestamp = now;
  return cachedConfig;
}

export function useAwaleSounds(lang: string) {
  const [config, setConfig] = useState<AwaleAudioConfig | null>(null);
  const [muted, setMutedState] = useState(false);
  const [userVolume, setUserVolumeState] = useState(0.7);
  const [musicStarted, setMusicStarted] = useState(false);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLangRef = useRef(lang);

  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_MUTED_KEY);
      const v = localStorage.getItem(LS_VOLUME_KEY);
      if (m !== null) setMutedState(m === 'true');
      if (v !== null) setUserVolumeState(parseFloat(v));
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    fetchAwaleAudioConfig().then((cfg) => { if (active) setConfig(cfg); });
    return () => { active = false; };
  }, []);

  const effectiveVolume = useCallback((base: number) => {
    if (!config || muted || !config.globalSoundEnabled) return 0;
    return Math.max(0, Math.min(1, base * userVolume * config.masterVolume));
  }, [muted, userVolume, config]);

  const playSfx = useCallback((key: SfxKey) => {
    if (!config) return;
    const sound = config.sfx[key];
    if (!sound?.enabled || !sound.url) return;
    const vol = effectiveVolume(sound.volume);
    if (vol <= 0) return;
    const audio = new Audio(sound.url);
    audio.volume = vol;
    audio.play().catch(() => {});
  }, [config, effectiveVolume]);

  const playWin = useCallback(() => playSfx('win_player'), [playSfx]);
  const playLose = useCallback(() => playSfx('win_ai'), [playSfx]);
  const playSeedSow = useCallback(() => playSfx('seed_sow'), [playSfx]);
  const playCapture = useCallback(() => playSfx('capture'), [playSfx]);
  const playClick = useCallback(() => playSfx('click'), [playSfx]);
  const playGameStart = useCallback(() => playSfx('game_start'), [playSfx]);

  const clearFade = () => {
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
  };

  const fadeAudio = (audio: HTMLAudioElement, from: number, to: number, duration: number, onDone?: () => void) => {
    clearFade();
    if (duration <= 0) { audio.volume = to; onDone?.(); return; }
    const steps = 20;
    const stepTime = (duration * 1000) / steps;
    let step = 0;
    audio.volume = from;
    fadeIntervalRef.current = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * (step / steps)));
      if (step >= steps) { clearFade(); onDone?.(); }
    }, stepTime);
  };

  const startBackgroundMusic = useCallback(() => {
    if (!config || !config.globalMusicEnabled || muted) return;
    const track = config.background[lang] || Object.values(config.background)[0];
    if (!track?.enabled || !track.url) return;
    if (bgAudioRef.current) { bgAudioRef.current.pause(); bgAudioRef.current.src = ''; }
    const audio = new Audio(track.url);
    audio.loop = true;
    audio.volume = 0;
    bgAudioRef.current = audio;
    audio.play()
      .then(() => { setMusicStarted(true); fadeAudio(audio, 0, effectiveVolume(track.volume), track.fadeDuration); })
      .catch(() => setMusicStarted(false));
  }, [config, lang, muted, effectiveVolume]);

  const stopBackgroundMusic = useCallback((immediate = false) => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    const track = config?.background[lang];
    const dur = immediate ? 0 : track?.fadeDuration ?? 1;
    fadeAudio(audio, audio.volume, 0, dur, () => {
      audio.pause(); audio.src = ''; bgAudioRef.current = null; setMusicStarted(false);
    });
  }, [config, lang]);

  // Changement de langue → transition douce
  useEffect(() => {
    if (!config) return;
    if (prevLangRef.current !== lang && musicStarted && bgAudioRef.current) {
      const old = bgAudioRef.current;
      fadeAudio(old, old.volume, 0, 1, () => { old.pause(); old.src = ''; bgAudioRef.current = null; startBackgroundMusic(); });
    }
    prevLangRef.current = lang;
  }, [lang, config]);

  // Volume/mute live
  useEffect(() => {
    if (bgAudioRef.current && config) {
      const track = config.background[lang];
      if (track) bgAudioRef.current.volume = muted ? 0 : effectiveVolume(track.volume);
    }
    try {
      localStorage.setItem(LS_MUTED_KEY, String(muted));
      localStorage.setItem(LS_VOLUME_KEY, String(userVolume));
    } catch {}
  }, [muted, userVolume, config, lang, effectiveVolume]);

  useEffect(() => {
    return () => {
      clearFade();
      if (bgAudioRef.current) { bgAudioRef.current.pause(); bgAudioRef.current.src = ''; bgAudioRef.current = null; }
    };
  }, []);

  const toggleMute = useCallback(() => setMutedState((m) => !m), []);
  const setVolume = useCallback((v: number) => setUserVolumeState(Math.max(0, Math.min(1, v))), []);

  return {
    ready: !!config,
    muted, userVolume, toggleMute, setVolume,
    playWin, playLose, playSeedSow, playCapture, playClick, playGameStart,
    startBackgroundMusic, stopBackgroundMusic, musicStarted,
  };
}