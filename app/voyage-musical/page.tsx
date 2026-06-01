// app/voyage-musical/page.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Play, Pause, X, Music, Upload, Info, Heart,
  Clock, MapPin, Headphones, Moon, Sun,
  Globe, Volume2, VolumeX, SkipForward,
  ChevronLeft, RefreshCw, Check,
  AlertCircle, Loader2, ArrowRight,
  CheckCircle, Download, ExternalLink,
} from 'lucide-react';
import ContributeModal from '@/components/ContributeModal';

const MusicMap = dynamic(
  () => import('@/components/music/MusicMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#020111]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <CaurisIcon className="w-12 h-12 text-[#D4AF37]" />
        </motion.div>
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  title_fr: string;
  title_en: string;
  artist_fr: string;
  artist_en: string;
  artist_type: 'solo' | 'group' | 'instrument' | 'ceremony' | 'anonymous';
  instrument_name?: string;
  audio_url: string;
  youtube_url?: string;
  audio_source?: string;
  cover_url?: string;
  description_fr?: string;
  description_en?: string;
  era_decade: number;
  era_label_fr?: string;
  era_label_en?: string;
  country_code: string;
  country_name_fr?: string;
  country_name_en?: string;
  city?: string;
  genre_id: string;
  contributor_id?: string;
  submitter_display_name?: string;
  likes_count?: number;
  play_count?: number;
  allow_download?: boolean;
  is_liked?: boolean;
  music_genres?: { id: string; nom_fr: string; nom_en: string };
}

interface CountryMusicData {
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  city: string | null;
  lat: number;
  lng: number;
  track_count: number;
  is_cluster: boolean;
  cluster_name: string;
  track_ids?: string[];
  dominant_color: string;
  genres: string[];
  eras: number[];
  region?: 'africa' | 'americas' | 'europe' | 'caribbean' | 'indian_ocean' | 'asia' | 'diaspora';
}

interface MusicEra {
  id: string;
  value: number;
  label_fr: string;
  label_en: string;
  description_fr: string | null;
  description_en: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
}

// ─── Icône Cauris ─────────────────────────────────────────────────────────────

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="caurisMusicGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path fill="url(#caurisMusicGlow)"
      d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
         M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
  </svg>
);


// ─── Coordonnées de référence par pays (ISO 3166-1 alpha-3) ─────────────────

const COUNTRY_COORDS: Record<string, [number, number]> = {
  DZA: [28.0339, 1.6596], AGO: [-11.2027, 17.8739], BEN: [9.3077, 2.3158],
  BWA: [-22.3285, 24.6849], BFA: [12.3641, -1.5196], BDI: [-3.3731, 29.9189],
  CMR: [3.8480, 11.5021], CPV: [16.5388, -23.0418], CAF: [6.6111, 20.9394],
  TCD: [15.4542, 18.7322], COM: [-11.6455, 43.3333], COD: [-4.0383, 21.7587],
  COG: [-0.2280, 15.8277], CIV: [7.5400, -5.5471], DJI: [11.8251, 42.5903],
  EGY: [26.8206, 30.8025], GNQ: [1.6508, 10.2679], ERI: [15.1794, 39.7823],
  SWZ: [-26.5225, 31.4659], ETH: [9.1450, 40.4897], GAB: [-0.8037, 11.6094],
  GMB: [13.4432, -15.3101], GHA: [7.9465, -1.0232], GIN: [9.9456, -11.3247],
  GNB: [11.8037, -15.1804], KEN: [-0.0236, 37.9062], LSO: [-29.6100, 28.2336],
  LBR: [6.4281, -9.4295], LBY: [26.3351, 17.2283], MDG: [-18.7669, 46.8691],
  MWI: [-13.2543, 34.3015], MLI: [17.5707, -3.9962], MRT: [21.0079, -10.9408],
  MUS: [-20.3484, 57.5522], MAR: [31.7917, -7.0926], MOZ: [-18.6657, 35.5296],
  NAM: [-22.9576, 18.4904], NER: [17.6078, 8.0817], NGA: [9.0820, 8.6753],
  RWA: [-1.9403, 29.8739], STP: [0.1864, 6.6131], SEN: [14.4974, -14.4524],
  SLE: [8.4606, -11.7799], SOM: [5.1521, 46.1996], ZAF: [-30.5595, 22.9375],
  SSD: [4.8594, 31.5713], SDN: [12.8628, 30.2176], TZA: [-6.3690, 34.8888],
  TGO: [8.6195, 0.8248], TUN: [33.8869, 9.5375], UGA: [1.3733, 32.2903],
  ZMB: [-13.1339, 27.8493], ZWE: [-19.0154, 29.1549],
  BRA: [-14.2350, -51.9253], USA: [37.0902, -95.7129], CAN: [56.1304, -106.3468],
  JAM: [18.1096, -77.2975], CUB: [21.5218, -77.7812], HTI: [18.9712, -72.2852],
  TTO: [10.6918, -61.2225], COL: [4.5709, -74.2973], ARG: [-38.4161, -63.6167],
  PER: [-9.1900, -75.0152], VEN: [6.4238, -66.5897], MEX: [23.6345, -102.5528],
  FRA: [46.2276, 2.2137], GBR: [55.3781, -3.4360], PRT: [39.3999, -8.2245],
  ESP: [40.4637, -3.7492], DEU: [51.1657, 10.4515], BEL: [50.5039, 4.4699],
  ITA: [41.8719, 12.5674], NLD: [52.1326, 5.2913],
  IND: [20.5937, 78.9629], CHN: [35.8617, 104.1954], JPN: [36.2048, 138.2529],
  IDN: [-0.7893, 113.9213], AUS: [-25.2744, 133.7751],
};

function getCountryCoords(countryCodes: string[]): [number, number] | null {
  for (const code of countryCodes) {
    if (COUNTRY_COORDS[code]) return COUNTRY_COORDS[code];
  }
  return null;
}

const GOLD = "#D4AF37";

// ─── Helper YouTube ───────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isYouTubeTrack(track: Track | null): boolean {
  if (!track) return false;  // ✅ AJOUTE CETTE VÉRIFICATION
  return !!(track.youtube_url && (
    track.audio_source === 'youtube' ||
    track.audio_source === 'YouTube' ||
    !track.audio_url ||
    track.audio_url === '' ||
    track.audio_url === 'null'
  ));
}

// ─── Panneau pays ─────────────────────────────────────────────────────────────

// Dans voyage-musical/page.tsx, remplace le CountryPanel existant par :

const CountryPanel = ({
  countryCode, tracks, lang, onClose,
  onPlayTrack, currentTrack, isPlaying,
  activeEra, onEraChange, onContribute,
  likedTracks, onToggleLike,
}: {
  countryCode: string;
  tracks: Track[];
  lang: 'fr' | 'en';
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  activeEra: number | null;
  onEraChange: (era: number | null) => void;
  onContribute: (countryCode: string) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
}) => {
  const countryName = tracks.length > 0 && tracks[0].country_name_fr
    ? (lang === 'fr' ? tracks[0].country_name_fr : tracks[0].country_name_en)
    : countryCode;

  const availableEras = useMemo(() => {
    const eras = new Set(tracks.map(t => t.era_decade).filter(Boolean));
    return Array.from(eras).sort();
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    if (!activeEra) return tracks;
    return tracks.filter(t => t.era_decade === activeEra);
  }, [tracks, activeEra]);

  const artistLabel = (t: Track) => {
    if (t.artist_type === 'instrument' && t.instrument_name) return t.instrument_name;
    if (t.artist_type === 'anonymous') return lang === 'fr' ? 'Artiste inconnu' : 'Unknown artist';
    if (t.artist_type === 'ceremony') return lang === 'fr' ? 'Cérémonie / Rituel' : 'Ceremony / Ritual';
    return lang === 'fr' ? t.artist_fr : t.artist_en;
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-[#020111]/98 backdrop-blur-2xl border-l border-white/8 z-20 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-white/8 flex-shrink-0">
        <div>
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] mb-1">
            {lang === 'fr' ? 'Voyage Musical' : 'Musical Journey'}
          </p>
          <h2 className="text-2xl font-serif italic text-white">{countryName}</h2>
          <p className="text-white/40 text-xs mt-1">
            {tracks.length} {tracks.length > 1 ? (lang === 'fr' ? 'morceaux' : 'tracks') : (lang === 'fr' ? 'morceau' : 'track')}
          </p>
        </div>
        <button onClick={onClose} className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Frise temporelle */}
      {availableEras.length > 0 && (
        <div className="px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => onEraChange(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${activeEra === null ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/70'
                }`}>
              {lang === 'fr' ? 'Tout' : 'All'}
            </button>
            {availableEras.map((era, i) => {
              const eraCount = tracks.filter(t => t.era_decade === era).length;
              const isActive = activeEra === era;
              return (
                <React.Fragment key={era}>
                  {i > 0 && <div className="w-4 h-px bg-white/10 flex-shrink-0" />}
                  <button onClick={() => onEraChange(era)} className="flex flex-col items-center gap-1 flex-shrink-0 group">
                    <motion.div
                      className={`rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/20 bg-transparent hover:border-[#D4AF37]/50'
                        }`}
                      style={{ width: Math.min(16 + eraCount * 2, 28), height: Math.min(16 + eraCount * 2, 28) }}
                    >
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </motion.div>
                    <span className={`text-[8px] font-mono transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-white/30 group-hover:text-white/60'}`}>
                      {era}s
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste morceaux */}
      <div className="flex-1 overflow-y-auto">
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <Music size={32} className="text-white/10" />
            <p className="text-white/30 text-sm text-center">
              {lang === 'fr' ? 'Aucun morceau pour cette époque' : 'No tracks for this era'}
            </p>
            <button
              onClick={() => onContribute(countryCode)}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all"
              style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}33` }}
            >
              <Upload size={12} />
              {lang === 'fr' ? 'Contribuer' : 'Contribute'}
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredTracks.map((track, i) => {

              if (!track) return null;

               console.log("🎵 Track:", track.title_fr, "allow_download:", track.allow_download);  // ✅ DEBUG


              const isCurrentTrack = currentTrack?.id === track.id;
              const isLiked = likedTracks.has(track.id);
              const isYT = isYouTubeTrack(track);
              const genreColor = GOLD;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${isCurrentTrack
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                >
                  {/* Cover / Play */}
                  <div
                    className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 cursor-pointer group"
                    onClick={() => onPlayTrack(track)}
                  >
                    {track.cover_url ? (
                      <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: `${genreColor}20` }}>
                        {isYT ? (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: '#FF0000' }} fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                        ) : (
                          <Music size={16} style={{ color: genreColor }} />
                        )}
                      </div>
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${isCurrentTrack && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                      {isCurrentTrack && isPlaying && !isYT ? (
                        <span className="flex items-end gap-0.5 h-5">
                          {[...Array(4)].map((_, j) => (
                            <motion.span key={j} className="w-0.5 rounded-full" style={{ backgroundColor: genreColor }}
                              animate={{ height: ['4px', '14px', '4px'] }}
                              transition={{ duration: 0.6, delay: j * 0.12, repeat: Infinity }} />
                          ))}
                        </span>
                      ) : (
                        <Play size={14} className="text-white ml-0.5" fill="white" />
                      )}
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate transition-colors ${isCurrentTrack ? 'text-[#D4AF37]' : 'text-white group-hover:text-[#D4AF37]'}`}>
                      {lang === 'fr' ? track.title_fr : track.title_en}
                    </p>
                    <p className="text-white/40 text-xs truncate">{artistLabel(track)}</p>
                    {track.submitter_display_name && (
                      <p className="text-[8px] text-white/20 mt-0.5">
                        {lang === 'fr' ? 'Soumis par' : 'Submitted by'} @{track.submitter_display_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {track.era_decade && <span className="text-[8px] text-white/25 font-mono">{track.era_decade}s</span>}
                      {track.city && (
                        <span className="flex items-center gap-0.5 text-[8px] text-white/25">
                          <MapPin size={7} />{track.city}
                        </span>
                      )}
                      {isYT && (
                        <span className="flex items-center gap-0.5 text-[8px] text-red-400/60">
                          <svg viewBox="0 0 24 24" className="w-2 h-2" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                          YouTube
                        </span>
                      )}

                      {/* ✅ STATS : Likes + Plays */}
                      <div className="flex items-center gap-2">
                        {/* Likes */}
                        <div
                          onClick={(e) => { e.stopPropagation(); onToggleLike(track.id); }}
                          className={`flex items-center gap-0.5 text-[8px] transition-colors cursor-pointer ${isLiked ? 'text-red-400' : 'text-white/20 hover:text-red-400'
                            }`}
                        >
                          <Heart size={8} fill={isLiked ? 'currentColor' : 'none'} />
                          {track.likes_count ?? 0}
                        </div>

                        {/* Plays */}
                        <div className="flex items-center gap-0.5 text-[8px] text-white/20">
                          <Headphones size={8} />
                          {track.play_count ?? 0}
                        </div>
                      </div>


                      {/* Download — SEULEMENT si allow_download = true */}
                      {!isYT && track.audio_url && track.allow_download === true && (
                        <a
                          href={track.audio_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-0.5 text-[8px] text-white/20 hover:text-green-400 transition-colors"
                          title={lang === 'fr' ? 'Télécharger' : 'Download'}
                        >
                          <Download size={8} />
                          {lang === 'fr' ? 'DL' : 'DL'}
                        </a>
                      )}

                      {/* Download button in AudioPlayer */}
                      
                      
                    </div>
                  </div>

                  {/* Genre badge */}
                  {track.music_genres && (
                    <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full flex-shrink-0"
                      style={{ color: genreColor, backgroundColor: `${genreColor}20` }}>
                      {lang === 'fr' ? track.music_genres.nom_fr : track.music_genres.nom_en}
                    </span>
                  )}
                </motion.div>
              );
            })}

            <div className="pt-4 pb-2">
              <button
                onClick={() => onContribute(countryCode)}
                className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/15 rounded-2xl text-white/30 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all text-xs font-bold uppercase tracking-widest"
              >
                <Upload size={12} />
                {lang === 'fr' ? 'Ajouter un morceau pour ce pays' : 'Add a track for this country'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Lecteur audio (fichiers uploadés) ────────────────────────────────────────

const AudioPlayer = ({
  track, lang, isPlaying, onTogglePlay, onNext, onClose,
  isLiked, onToggleLike,
}: {
  track: Track;
  lang: 'fr' | 'en';
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onClose: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const description = lang === 'fr'
    ? (track.description_fr || track.description_en)
    : (track.description_en || track.description_fr);

  const countryName = lang === 'fr'
    ? (track.country_name_fr || track.country_code)
    : (track.country_name_en || track.country_code);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audio_url);
    } else {
      audioRef.current.src = track.audio_url;
    }
    const audio = audioRef.current;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => setDuration(audio.duration);
    const onEnded = () => onNext();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [track.audio_url, onNext]);

  useEffect(() => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.play().catch(() => { }) : audioRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const formatTime = (s: number) =>
    isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    }
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-[#020111]/98 backdrop-blur-2xl border-t border-white/8"
      style={{ boxShadow: `0 -10px 40px ${GOLD}15` }}
    >
      {/* Progress bar */}
      <div className="w-full h-1 cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)' }} onClick={seekTo}>
        <div className="h-full transition-none" style={{
          width: `${duration ? (progress / duration) * 100 : 0}%`,
          background: GOLD,
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Cover */}
        <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          {track.cover_url ? (
            <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <Music size={16} style={{ color: GOLD }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {lang === 'fr' ? track.title_fr : track.title_en}
          </p>
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <span className="truncate">{lang === 'fr' ? track.artist_fr : track.artist_en}</span>
            {track.era_decade && (<><span>•</span><span className="font-mono">{track.era_decade}s</span></>)}
            {countryName && (<><span>•</span><span className="flex items-center gap-0.5 flex-shrink-0"><MapPin size={8} /> {countryName}</span></>)}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {description && (
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="text-[10px] text-[#D4AF37] hover:text-white transition-colors flex items-center gap-1"
              >
                <Info size={10} />
                {lang === 'fr' ? 'Description' : 'Description'}
              </button>
            )}
            <div
              onClick={onToggleLike}
              className={`text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${isLiked ? 'text-red-400' : 'text-white/30 hover:text-red-400'
                }`}
            >
              <Heart size={10} fill={isLiked ? 'currentColor' : 'none'} />
              {track.likes_count ?? 0}
            </div>
            {track.allow_download === true && (
  <a
    href={track.audio_url}
    download
    target="_blank"
    rel="noopener noreferrer"
    className="text-[10px] text-white/30 hover:text-green-400 transition-colors flex items-center gap-1"
  >
    <Download size={10} />
    {lang === 'fr' ? 'Télécharger' : 'Download'}
  </a>
)}
          </div>
        </div>

        {/* Duration */}
        <span className="hidden sm:block text-[9px] text-white/30 font-mono tabular-nums flex-shrink-0">
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-white/30 hover:text-white transition-colors">
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center text-black transition-colors"
            style={{ backgroundColor: GOLD, boxShadow: `0 0 16px ${GOLD}50` }}
          >
            {isPlaying
              ? <Pause size={16} fill="currentColor" />
              : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </motion.button>
          <button onClick={onNext} className="p-2 text-white/30 hover:text-white transition-colors">
            <SkipForward size={16} />
          </button>
        </div>

        <button onClick={onClose} className="p-2 text-white/20 hover:text-white/60 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Description */}
      <AnimatePresence>
        {showDescription && description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 pb-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white/70 text-sm">{description}</p>
                  <button onClick={() => setShowDescription(false)} className="text-white/30 hover:text-white ml-2 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Lecteur YouTube (iframe) ────────────────────────────────────────────────

const YouTubePlayer = ({
  track, lang, onClose, onNext,
  isLiked, onToggleLike,
}: {
  track: Track;
  lang: 'fr' | 'en';
  onClose: () => void;
  onNext: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
}) => {
  const ytId = getYouTubeId(track.youtube_url || '');
  const description = lang === 'fr'
    ? (track.description_fr || track.description_en)
    : (track.description_en || track.description_fr);
  const countryName = lang === 'fr'
    ? (track.country_name_fr || track.country_code)
    : (track.country_name_en || track.country_code);

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-[#020111]/98 backdrop-blur-2xl border-t border-white/8"
      style={{ boxShadow: `0 -10px 40px rgba(255,0,0,0.1)` }}
    >
      {/* YouTube iframe */}
      {ytId ? (
        <div className="w-full" style={{ aspectRatio: '16/9', maxHeight: '40vh' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
            title={track.title_fr}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            style={{ border: 'none' }}
          />
        </div>
      ) : (
        <div className="p-4 text-center text-red-400 text-sm">
          <AlertCircle size={20} className="mx-auto mb-2" />
          {lang === 'fr' ? 'Lien YouTube invalide' : 'Invalid YouTube link'}
        </div>
      )}

      {/* Infos */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {lang === 'fr' ? track.title_fr : track.title_en}
          </p>
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <span className="truncate">{lang === 'fr' ? track.artist_fr : track.artist_en}</span>
            {track.era_decade && (<><span>•</span><span className="font-mono">{track.era_decade}s</span></>)}
            {countryName && (<><span>•</span><span className="flex items-center gap-0.5 flex-shrink-0"><MapPin size={8} /> {countryName}</span></>)}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {track.youtube_url && (
              <a
                href={track.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <ExternalLink size={10} />
                YouTube
              </a>
            )}
            <div
              onClick={onToggleLike}
              className={`text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${isLiked ? 'text-red-400' : 'text-white/30 hover:text-red-400'
                }`}
            >
              <Heart size={10} fill={isLiked ? 'currentColor' : 'none'} />
              {track.likes_count ?? 0}
            </div>
          </div>
        </div>

        <button onClick={onNext} className="p-2 text-white/30 hover:text-white transition-colors">
          <SkipForward size={16} />
        </button>
        <button onClick={onClose} className="p-2 text-white/20 hover:text-white/60 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

export default function VoyageMusicalPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [countriesData, setCountriesData] = useState<CountryMusicData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryTracks, setCountryTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [activeEra, setActiveEra] = useState<number | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const [viewMode, setViewMode] = useState<'africa' | 'world'>('africa');
  const [showContribute, setShowContribute] = useState(false);
  const [contributeCountry, setContributeCountry] = useState<string | undefined>(undefined);

  const [user, setUser] = useState<any>(null);
  const [genres, setGenres] = useState<any[]>([]);
  const [eras, setEras] = useState<MusicEra[]>([]);
  const [genreRelations, setGenreRelations] = useState<any[]>([]);

  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lukeni_liked_tracks');
      if (saved) setLikedTracks(new Set(JSON.parse(saved)));
      const themeSaved = localStorage.getItem('lukeni_map_theme');
      if (themeSaved === 'light' || themeSaved === 'dark') setMapTheme(themeSaved);
    }
  }, []);

  const saveLikedTracks = useCallback((tracks: Set<string>) => {
    localStorage.setItem('lukeni_liked_tracks', JSON.stringify(Array.from(tracks)));
  }, []);

  const handleToggleMapTheme = useCallback(() => {
    const n = mapTheme === 'dark' ? 'light' : 'dark';
    setMapTheme(n);
    localStorage.setItem('lukeni_map_theme', n);
  }, [mapTheme]);

  const handleToggleLike = useCallback(async (trackId: string) => {
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) newSet.delete(trackId); else newSet.add(trackId);
      saveLikedTracks(newSet);
      return newSet;
    });

    if (user) {
      try {
        const isLiked = likedTracks.has(trackId);
        if (isLiked) {
          // Unlike
          await supabase.from('music_track_likes').delete().eq('track_id', trackId).eq('user_id', user.id);
          // ✅ Décrémenter likes_count
          await supabase.rpc('decrement_likes_count', { track_id: trackId });
        } else {
          // Like
          await supabase.from('music_track_likes').insert({ track_id: trackId, user_id: user.id });
          // ✅ Incrémenter likes_count
          await supabase.rpc('increment_likes_count', { track_id: trackId });
        }
      } catch (error) { console.error('Like error:', error); }
    }
  }, [user, saveLikedTracks, likedTracks]);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (saved) setLang(saved);
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    supabase.from('music_genres').select('id, nom_fr, nom_en, color').eq('status', 'published')
      .then(({ data }) => setGenres(data || []));
    supabase.from('music_eras').select('*').eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setEras((data as MusicEra[]) || []));

    // ✅ AJOUTE CECI : Fetch des relations genres
    // ✅ Fetch des relations genres avec fallback coords
    supabase
      .from('music_genre_relations')
      .select(`
        *,
        origin_genre:genre_id_origin (nom_fr, nom_en, country_codes),
        derived_genre:genre_id_derived (nom_fr, nom_en, country_codes)
      `)
      .then(({ data }) => {
        console.log("🔗 Genre relations fetched:", data?.length || 0);
        if (!data) return;

        const enriched = data.map((rel: any) => {
          let origin_lat = rel.origin_lat;
          let origin_lng = rel.origin_lng;
          let derived_lat = rel.derived_lat;
          let derived_lng = rel.derived_lng;

          if ((origin_lat == null || origin_lng == null) && rel.origin_genre?.country_codes?.length) {
            const coords = getCountryCoords(rel.origin_genre.country_codes);
            if (coords) { origin_lat = coords[0]; origin_lng = coords[1]; }
          }

          if ((derived_lat == null || derived_lng == null) && rel.derived_genre?.country_codes?.length) {
            const coords = getCountryCoords(rel.derived_genre.country_codes);
            if (coords) { derived_lat = coords[0]; derived_lng = coords[1]; }
          }

          // ← AJOUTER CE LOG pour voir si les coords sont trouvées :
          console.log("📍 Relation enrichie:", {
            origin: rel.origin_genre?.nom_fr,
            derived: rel.derived_genre?.nom_fr,
            origin_lat, origin_lng,
            derived_lat, derived_lng,
            origin_country_codes: rel.origin_genre?.country_codes,
            derived_country_codes: rel.derived_genre?.country_codes,
          });

          return { ...rel, origin_lat, origin_lng, derived_lat, derived_lng };
        });

        console.log("✅ Relations enrichies:", enriched.length);
        setGenreRelations(enriched);
      });


    // ← AJOUTER après le fetch de music_genre_relations :
    supabase
      .from('music_migrations')
      .select(`
        *,
        genre:genre_id (nom_fr, nom_en)
      `)
      .then(({ data: migrations }) => {
        console.log("🚀 Migrations fetched:", migrations?.length || 0);
        if (!migrations?.length) return;

        // Convertir les migrations en format GenreRelation compatible
        const migrationRelations = migrations
          .filter((m: any) => m.lat_depart != null && m.lng_depart != null && m.lat_arrivee != null && m.lng_arrivee != null)
          .map((m: any) => ({
            id: m.id,
            origin_lat: m.lat_depart,
            origin_lng: m.lng_depart,
            derived_lat: m.lat_arrivee,
            derived_lng: m.lng_arrivee,
            relation_type: 'migration',
            origin_genre: { nom_fr: m.genre?.nom_fr || m.territoire_depart, nom_en: m.genre?.nom_en || m.territoire_depart },
            derived_genre: { nom_fr: m.territoire_arrivee, nom_en: m.territoire_arrivee },
            description_fr: m.description_fr,
            description_en: m.description_en,
          }));

        console.log("✅ Migrations valides:", migrationRelations.length);

        // Fusionner avec les relations existantes
        setGenreRelations(prev => [...prev, ...migrationRelations]);
      });

    fetchCountriesData();
  }, []);

  async function fetchCountriesData() {
    setIsLoading(true);
    const { data: tracks, error } = await supabase
      .from('music_tracks')
      .select(`
        id, country_code, country_name_fr, country_name_en, 
        era_decade, lat, lng, city, status, audio_source,
        submitter_display_name, likes_count, play_count,allow_download,
        music_genres (id, nom_fr, nom_en)
      `)
      .eq('status', 'published')
      .not('country_code', 'is', null)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    console.log("📦 Tracks fetched:", tracks?.length, "Error:", error);

    if (!tracks || tracks.length === 0) { setIsLoading(false); return; }

    const byLocation = new Map<string, {
      tracks: any[]; genres: Map<string, string>; eras: Set<number>;
      lats: number[]; lngs: number[];
      name_fr: string; name_en: string; city: string | null; country_code: string;
    }>();

    tracks.forEach(t => {
      const code = t.country_code;
      const city = t.city || null;
      const locationKey = city ? `${code}::${city}` : `${code}::`;
      if (!byLocation.has(locationKey)) {
        byLocation.set(locationKey, {
          tracks: [], genres: new Map(), eras: new Set(),
          lats: [], lngs: [],
          name_fr: t.country_name_fr || code, name_en: t.country_name_en || code,
          city, country_code: code,
        });
      }
      const entry = byLocation.get(locationKey)!;
      entry.tracks.push(t);
      if (t.era_decade) entry.eras.add(t.era_decade);
      if (t.lat) entry.lats.push(t.lat);
      if (t.lng) entry.lngs.push(t.lng);
      if (t.music_genres) { const g = t.music_genres as any; entry.genres.set(g.id, g.nom_fr); }
    });

    const result: CountryMusicData[] = [];
    byLocation.forEach((entry) => {
      const avgLat = entry.lats.length > 0 ? entry.lats.reduce((s, v) => s + v, 0) / entry.lats.length : 0;
      const avgLng = entry.lngs.length > 0 ? entry.lngs.reduce((s, v) => s + v, 0) / entry.lngs.length : 0;
      result.push({
        country_code: entry.country_code,
        country_name_fr: entry.name_fr, country_name_en: entry.name_en,
        city: entry.city, lat: avgLat, lng: avgLng,
        track_count: entry.tracks.length,
        is_cluster: entry.tracks.length > 1,
        cluster_name: entry.city ? `${entry.city}, ${entry.name_fr}` : entry.name_fr,
        dominant_color: "#D4AF37",
        genres: Array.from(entry.genres.values()),
        eras: Array.from(entry.eras).sort(),
        region: 'africa',
        track_ids: entry.tracks.map(t => t.id),
      });
    });

    console.log("✅ Clusters built:", result.length);
    setCountriesData(result);
    setIsLoading(false);
  }

  const handleCountrySelect = useCallback(async (clusterId: string) => {
    console.log("🖱️ Location clicked:", clusterId);
    setSelectedCountry(clusterId);
    setIsLoadingTracks(true);

    const cluster = countriesData.find(c => {
      const key = c.city ? `${c.country_code}::${c.city}` : c.country_code;
      return key === clusterId;
    });

    if (!cluster) { console.error("❌ Cluster non trouvé pour", clusterId); setIsLoadingTracks(false); return; }

    let query = supabase
      .from('music_tracks')
      .select('*, music_genres (id, nom_fr, nom_en)')
      .eq('status', 'published')
      .eq('country_code', cluster.country_code);

    if (cluster.city) query = query.eq('city', cluster.city);

    const { data, error } = await query.order('era_decade', { ascending: true });
    console.log("📦 Tracks for", cluster.city || cluster.country_code, ":", data?.length, error);
    setCountryTracks((data as unknown as Track[]) || []);
    setIsLoadingTracks(false);
  }, [countriesData]);


  const trackPlayCount = useCallback(async (trackId: string) => {
    try {
      const { data: current } = await supabase
        .from('music_tracks')
        .select('play_count')
        .eq('id', trackId)
        .single();

      if (current) {
        await supabase
          .from('music_tracks')
          .update({ play_count: (current.play_count || 0) + 1 })
          .eq('id', trackId);
      }
    } catch (error) {
      console.error('Erreur tracking play:', error);
    }
  }, []);

  // ── Modify handlePlayTrack pour tracker l'écoute ──
  const handlePlayTrack = useCallback((track: Track) => {

    console.log("🎵 Playing track:", {
      id: track.id, title: track.title_fr,
      audio_source: track.audio_source,
      audio_url: track.audio_url,
      youtube_url: track.youtube_url,
      isYT: isYouTubeTrack(track),
    });

    // ✅ Tracker l'écoute
    trackPlayCount(track.id);

    if (currentTrack?.id === track.id) { setIsPlaying(p => !p); return; }
    setCurrentTrack(track);
    setIsPlaying(true);
    setQueue(countryTracks.filter(t => t.id !== track.id));
  }, [currentTrack, countryTracks, trackPlayCount]);


  const handleNext = useCallback(() => {
    if (queue.length === 0) { setIsPlaying(false); return; }
    const [next, ...rest] = queue;
    setCurrentTrack(next);
    setQueue(rest);
    setIsPlaying(true);
  }, [queue]);

  const handleClosePlayer = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setQueue([]);
  }, []);

  const handleOpenContribute = useCallback((countryCode?: string) => {
    setContributeCountry(countryCode);
    setShowContribute(true);
  }, []);

  const totalTracks = countriesData.reduce((s, c) => s + c.track_count, 0);
  const totalCountries = countriesData.length;

  if (!isMounted) return (
    <div className="min-h-screen bg-[#020111] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
        <CaurisIcon className="w-16 h-16 text-[#D4AF37]" />
      </motion.div>
    </div>
  );




  const currentIsYT = currentTrack ? isYouTubeTrack(currentTrack) : false;

  return (
    <div className="h-screen bg-[#020111] text-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5 bg-[#020111]/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <CaurisIcon className="w-8 h-8 text-[#D4AF37] flex-shrink-0" />
          <Link href="/explore" className="flex items-center gap-2 text-white/40 hover:text-[#D4AF37] transition-colors group">
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
              {lang === 'fr' ? 'Explorer' : 'Explore'}
            </span>
          </Link>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ boxShadow: ['0 0 8px rgba(168,85,247,0.3)', '0 0 20px rgba(168,85,247,0.6)', '0 0 8px rgba(168,85,247,0.3)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="rounded-full"
            >
              <Headphones size={18} className="text-purple-400" />
            </motion.div>
            <span className="font-serif italic text-white text-base hidden sm:block">
              {lang === 'fr' ? 'Voyage Musical' : 'Musical Journey'}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-white/30 text-[9px] uppercase font-black tracking-wider">
          <span className="flex items-center gap-1.5"><Music size={10} className="text-[#D4AF37]" />{totalTracks} {lang === 'fr' ? 'morceaux' : 'tracks'}</span>
          <span className="flex items-center gap-1.5"><Globe size={10} className="text-[#D4AF37]" />{totalCountries} {lang === 'fr' ? 'pays' : 'countries'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => fetchCountriesData()} className="p-2 text-white/30 hover:text-[#D4AF37] transition-colors">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => handleOpenContribute(selectedCountry ?? undefined)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full text-[#D4AF37] text-[9px] font-black uppercase tracking-wider hover:bg-[#D4AF37] hover:text-black transition-all"
          >
            <Upload size={10} />
            <span className="hidden sm:block">{lang === 'fr' ? 'Contribuer' : 'Contribute'}</span>
          </button>
          <button
            onClick={() => { const nl: 'fr' | 'en' = lang === 'fr' ? 'en' : 'fr'; setLang(nl); localStorage.setItem('lukeni_lang', nl); }}
            className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full text-white text-[9px] font-black uppercase hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all"
          >
            <Globe size={9} /> {lang}
          </button>
          <button onClick={handleToggleMapTheme} className="p-2 text-white/30 hover:text-white transition-colors" title={mapTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
            {mapTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </nav>

      {/* Filtre époque */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#020111]/60 overflow-x-auto scrollbar-hide">
        <Clock size={11} className="text-white/30 flex-shrink-0" />
        <span className="text-white/30 text-[8px] font-black uppercase tracking-widest flex-shrink-0 mr-2">
          {lang === 'fr' ? 'Époque' : 'Era'}
        </span>
        <button
          onClick={() => setActiveEra(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all ${activeEra === null ? 'bg-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'bg-white/4 text-white/30 border border-white/8 hover:text-white/60'
            }`}
        >
          {lang === 'fr' ? 'Toutes' : 'All'}
        </button>
        {eras.map((era) => (
          <button
            key={era.id}
            onClick={() => setActiveEra(era.value)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border"
            style={{
              backgroundColor: activeEra === era.value ? (era.color || "#D4AF37") : "rgba(255,255,255,0.04)",
              borderColor: activeEra === era.value ? (era.color || "#D4AF37") : "rgba(255,255,255,0.08)",
              color: activeEra === era.value ? "black" : "rgba(255,255,255,0.3)",
            }}
          >
            {lang === 'fr' ? era.label_fr : era.label_en}
          </button>
        ))}
      </div>

      {/* Zone carte + panneau */}
      <div className="flex-1 relative overflow-hidden" style={{ paddingBottom: currentTrack ? (currentIsYT ? '0' : '68px') : '0' }}>
        <div className="absolute inset-0">
          {isMounted && (
            <MusicMap
              countries={countriesData}
              selectedCountry={selectedCountry}
              activeEra={activeEra}
              lang={lang}
              onCountrySelect={handleCountrySelect}
              playingCountry={currentTrack?.country_code || null}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              theme={mapTheme}
              genreRelations={genreRelations}

            />
          )}
        </div>

        <AnimatePresence>
          {!selectedCountry && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#020111]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-center pointer-events-none shadow-[0_0_40px_rgba(212,175,55,0.1)] z-10"
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mx-auto mb-3"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <p className="text-white/60 text-xs">
                {lang === 'fr' ? 'Cliquez sur un pays pour découvrir sa musique' : 'Click on a country to discover its music'}
              </p>
              {isLoading && (
                <p className="text-white/30 text-[9px] mt-1">{lang === 'fr' ? 'Chargement des données…' : 'Loading data…'}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedCountry && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/30 sm:hidden z-10"
                onClick={() => setSelectedCountry(null)}
              />
              {isLoadingTracks ? (
                <motion.div
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-[#020111]/98 border-l border-white/8 z-20 flex items-center justify-center"
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <CaurisIcon className="w-10 h-10 text-[#D4AF37]" />
                  </motion.div>
                </motion.div>
              ) : (
                <CountryPanel
                  countryCode={selectedCountry}
                  tracks={countryTracks}
                  lang={lang}
                  onClose={() => setSelectedCountry(null)}
                  onPlayTrack={handlePlayTrack}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  activeEra={activeEra}
                  onEraChange={setActiveEra}
                  onContribute={handleOpenContribute}
                  likedTracks={likedTracks}
                  onToggleLike={handleToggleLike}
                />
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Lecteur */}
      <AnimatePresence>
        {currentTrack && currentIsYT && (
          <YouTubePlayer
            track={currentTrack}
            lang={lang}
            onClose={handleClosePlayer}
            onNext={handleNext}
            isLiked={likedTracks.has(currentTrack.id)}
            onToggleLike={() => handleToggleLike(currentTrack.id)}
          />
        )}
        {currentTrack && !currentIsYT && (
          <AudioPlayer
            track={currentTrack}
            lang={lang}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(p => !p)}
            onNext={handleNext}
            onClose={handleClosePlayer}
            isLiked={likedTracks.has(currentTrack.id)}
            onToggleLike={() => handleToggleLike(currentTrack.id)}
          />
        )}
      </AnimatePresence>

      {/* Modal Contribution */}
      <AnimatePresence>
        {showContribute && (
          <ContributeModal
            onClose={() => setShowContribute(false)}
            lang={lang}
            initialCountry={contributeCountry}
            user={user}
            genres={genres}
            eras={eras}
          />
        )}
      </AnimatePresence>
    </div>
  );
}