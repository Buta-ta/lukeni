"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Music, Volume2, VolumeX, SkipForward, Download, Heart, MapPin } from 'lucide-react';
import { useAudio } from '@/lib/contexts/AudioContext';
import { usePathname } from 'next/navigation';

const GOLD = "#D4AF37";

export default function GlobalAudioPlayer() {
  const { currentTrack, isPlaying, togglePlay, playNext, closePlayer } = useAudio();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const pathname = usePathname();
  
  // 🚨 DÉTECTION DE LA ROUTE ENQUÊTE (Masque et arrête le lecteur)
  const isGameRoute = pathname?.startsWith('/investigations/') && pathname !== '/investigations';

  useEffect(() => {
    if (isGameRoute && currentTrack) {
      closePlayer(); // Coupe la musique immédiatement en entrant dans l'enquête
    }
  }, [isGameRoute, currentTrack, closePlayer]);

  useEffect(() => {
    const stored = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (stored) setLang(stored);
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    
    if (!audioRef.current) audioRef.current = new Audio(currentTrack.audio_url);
    else audioRef.current.src = currentTrack.audio_url;

    const audio = audioRef.current;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => setDuration(audio.duration);
    const onEnded = () => playNext();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrack, playNext]);

  useEffect(() => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.play().catch(() => {}) : audioRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Si on est dans un jeu ou qu'aucune musique ne joue, on n'affiche rien
  if (isGameRoute || !currentTrack) return null;

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    }
  };

  const formatTime = (s: number) => isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-[999] bg-[#020111]/98 backdrop-blur-2xl border-t border-white/8"
      style={{ boxShadow: `0 -10px 40px ${GOLD}15` }}
    >
      <div className="w-full h-1 cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)' }} onClick={seekTo}>
        <div className="h-full transition-none" style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: GOLD }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          {currentTrack.cover_url ? (
            <img src={currentTrack.cover_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <Music size={16} style={{ color: GOLD }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{lang === 'fr' ? currentTrack.title_fr : currentTrack.title_en}</p>
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <span className="truncate">{lang === 'fr' ? currentTrack.artist_fr : currentTrack.artist_en}</span>
            {currentTrack.country_name_fr && (<><span>•</span><span className="flex items-center gap-0.5"><MapPin size={8} /> {lang === 'fr' ? currentTrack.country_name_fr : currentTrack.country_name_en}</span></>)}
          </div>
        </div>

        <span className="hidden sm:block text-[9px] text-white/30 font-mono tabular-nums flex-shrink-0">
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-white/30 hover:text-white transition-colors">
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={togglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center text-black transition-colors"
            style={{ backgroundColor: GOLD, boxShadow: `0 0 16px ${GOLD}50` }}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </motion.button>
          <button onClick={playNext} className="p-2 text-white/30 hover:text-white transition-colors">
            <SkipForward size={16} />
          </button>
        </div>

        <button onClick={closePlayer} className="p-2 text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}