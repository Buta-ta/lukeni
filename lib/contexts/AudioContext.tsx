"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Track {
  id: string;
  title_fr: string;
  title_en: string;
  artist_fr: string;
  artist_en: string;
  artist_type: string;
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
  genre_id?: string;
  contributor_id?: string;
  submitter_display_name?: string;
  likes_count?: number;
  play_count?: number;
  allow_download?: boolean;
  is_liked?: boolean;
  music_genres?: { id: string; nom_fr: string; nom_en: string };
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  playTrack: (track: Track, newQueue: Track[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  closePlayer: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const playTrack = useCallback((track: Track, newQueue: Track[]) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(p => !p);
      return;
    }
    setCurrentTrack(track);
    setQueue(newQueue.filter(t => t.id !== track.id));
    setIsPlaying(true);
  }, [currentTrack]);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }
    const [next, ...rest] = queue;
    setCurrentTrack(next);
    setQueue(rest);
    setIsPlaying(true);
  }, [queue]);

  const closePlayer = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setQueue([]);
  }, []);

  return (
    <AudioContext.Provider value={{ currentTrack, isPlaying, queue, playTrack, togglePlay, playNext, closePlayer }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio doit être utilisé dans un AudioProvider");
  return context;
}