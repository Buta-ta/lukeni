"use client";

import React, { useState, useRef } from 'react';
import { Upload, Loader2, Play, Pause, Trash2, Music } from 'lucide-react';

interface AudioUploaderProps {
  label: string;
  currentUrl: string;
  onUpload: (url: string) => void;
  accept?: string;
}

// ⚠️ Adapte ces noms de variables d'environnement à ceux utilisés
// dans ton composant ImageUploader existant si différents.
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

export default function AudioUploader({
  label,
  currentUrl,
  onUpload,
  accept = 'audio/*',
}: AudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      // Cloudinary traite l'audio comme une ressource "video"
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();

      if (data.secure_url) {
        onUpload(data.secure_url);
      } else {
        setError("Échec de l'upload");
      }
    } catch (err) {
      setError("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs text-gray-400 font-mono">{label}</label>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-all disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isUploading ? 'Envoi…' : 'Uploader un son'}
        </button>

        {currentUrl && (
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] transition-all"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}

        {currentUrl && (
          <button
            type="button"
            onClick={() => onUpload('')}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-all"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        type="text"
        placeholder="…ou coller une URL audio directement"
        value={currentUrl}
        onChange={(e) => onUpload(e.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-gray-300 font-mono focus:border-[#D4AF37]/50 focus:outline-none"
      />

      {error && <p className="text-red-400 text-[10px]">{error}</p>}

      {currentUrl && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-black/20 rounded-lg border border-white/5">
          <Music size={12} className="text-[#D4AF37]/60 shrink-0" />
          <span className="text-[10px] text-gray-500 truncate">{currentUrl}</span>
          <audio
            ref={audioRef}
            src={currentUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}