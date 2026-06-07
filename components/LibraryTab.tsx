"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Library, PlusCircle, Edit2, Trash2, X, Languages,
  SpellCheck, CheckCircle, Upload, Headphones, FileText, Download,
  BookOpen, Star, AlertCircle, Inbox, Check, XCircle,
  ChevronDown, ChevronUp, Eye, Music, Lightbulb, User, Heart,
  Image, LayoutGrid, ToggleLeft, ToggleRight, RefreshCw, MessageCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteModal from '@/components/admin/shared/DeleteModal';

// ============================================================================
// TYPES
// ============================================================================

interface Category { id: string; name_fr: string; name_en: string; color?: string; }

interface Book {
  id: string; title_fr: string; title_en: string; author_fr: string; author_en: string;
  description_fr: string; description_en: string; cover_url: string; file_url: string;
  audio_url: string; access_type: string; has_audio: boolean; category_id: string;
  status: string; created_at: string; view_count?: number; download_count?: number;
  categories: Category;
}

interface BookSuggestion {
  id: string; title: string; author?: string; description?: string;
  user_email?: string; status: string; created_at: string;
  submission_type?: 'full_book' | 'audio_book' | 'suggestion';
  cover_url?: string; file_url?: string; audio_url?: string; has_audio?: boolean;
}

interface CollageSlot {
  id: string; slot_index: number; url: string | null; label: string; is_active: boolean;
}

interface CollageSettings {
  id: string; layout_index: number; collage_enabled: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLACEHOLDERS = {
  title_fr: "Ex: L'Afrique Noire Précoloniale",
  title_en: "Ex: Pre-Colonial Black Africa",
  author_fr: "Ex: Cheikh Anta Diop",
  author_en: "Ex: Cheikh Anta Diop",
  desc_fr: "Ex: Une étude approfondie sur les civilisations africaines...",
  desc_en: "Ex: An in-depth study on African civilizations...",
  cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  published: { label: 'Publié', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  rejected: { label: 'Rejeté', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  draft: { label: 'Brouillon', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
};

const SUBMISSION_TYPE_CONFIG = {
  full_book: { label: 'Livre complet', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  audio_book: { label: 'Livre audio', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  suggestion: { label: 'Suggestion', color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

const LAYOUT_PREVIEWS = [
  {
    name: 'Classique',
    grid: [
      { col: 1, row: 1, colSpan: 2, rowSpan: 2 },
      { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 1, colSpan: 1, rowSpan: 3 },
      { col: 3, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 3, colSpan: 2, rowSpan: 1 },
      { col: 2, row: 4, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 4, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 4, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    name: 'Centrale',
    grid: [
      { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 1, colSpan: 2, rowSpan: 2 },
      { col: 4, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 1, rowSpan: 2 },
      { col: 4, row: 2, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 3, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 1, row: 4, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 4, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    name: 'Bandes',
    grid: [
      { col: 1, row: 1, colSpan: 3, rowSpan: 1 },
      { col: 4, row: 1, colSpan: 1, rowSpan: 2 },
      { col: 1, row: 2, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 3, colSpan: 2, rowSpan: 1 },
      { col: 4, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 1, row: 4, colSpan: 2, rowSpan: 1 },
      { col: 3, row: 4, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    name: 'Mosaïque',
    grid: [
      { col: 1, row: 1, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 1, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 2, colSpan: 2, rowSpan: 2 },
      { col: 1, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 4, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 4, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 4, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    name: 'Colonne',
    grid: [
      { col: 1, row: 1, colSpan: 1, rowSpan: 4 },
      { col: 2, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 1, colSpan: 2, rowSpan: 1 },
      { col: 2, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 2, colSpan: 2, rowSpan: 1 },
      { col: 2, row: 3, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 3, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 3, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 4, colSpan: 2, rowSpan: 1 },
    ],
  },
];

// ============================================================================
// COMPOSANTS UTILITAIRES
// ============================================================================

function UploadField({ field, label, url, resourceType, uploadingField, onUpload, onClear }: {
  field: string; label: string; url: string; resourceType: string;
  uploadingField: string | null;
  onUpload: (field: string, resourceType: string) => void;
  onClear: (field: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => onUpload(field, resourceType)}
        className={`p-4 border-2 rounded-xl text-xs flex flex-col items-center gap-2 transition-all ${url ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/5'}`}>
        {uploadingField === field ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
        <span className="font-medium">{url ? '✅ Uploadé' : label}</span>
      </button>
      {url && (
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 hover:underline flex-1 truncate">Voir ↗</a>
          <button type="button" onClick={() => onClear(field)} className="text-[10px] text-red-400 hover:text-red-300"><X size={12} /></button>
        </div>
      )}
    </div>
  );
}

function LinguaButton({ action, label, disabled, isProcessing, onClick }: {
  action: string; label: string; disabled: boolean; isProcessing: string | null; onClick: () => void;
}) {
  const loading = isProcessing === action;
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className="p-1.5 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors">
      {loading ? <Loader2 size={10} className="animate-spin" /> : action.includes('translate') ? <Languages size={10} /> : <SpellCheck size={10} />}
      {label}
    </button>
  );
}

// ============================================================================
// COLLAGE TAB (VERSION CORRIGÉE)
// ============================================================================

function CollageTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [slots, setSlots] = useState<CollageSlot[]>([]);
  const [settings, setSettings] = useState<CollageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [brokenImages, setBrokenImages] = useState<number[]>([]);

  const fetchCollage = useCallback(async () => {
    setIsLoading(true);
    const [slotsRes, settingsRes] = await Promise.all([
      supabase.from('library_collage').select('*').order('slot_index'),
      supabase.from('library_collage_settings').select('*').limit(1).single(),
    ]);
    if (slotsRes.data) setSlots(slotsRes.data as CollageSlot[]);
    if (settingsRes.data) setSettings(settingsRes.data as CollageSettings);
    setBrokenImages([]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchCollage(); }, [fetchCollage]);

  const handleUploadSlot = useCallback((slotIndex: number) => {
    setUploadingSlot(slotIndex);

    const doUpload = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url', 'camera'],
        resourceType: 'image',
        multiple: false,
        maxFileSize: 10_000_000,
        folder: 'lukeni/library/collage',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      }, async (error: any, result: any) => {
        setUploadingSlot(null);
        if (error) { showMsg('error', 'Erreur upload'); return; }
        if (result.event === 'success') {
          const url = result.info.secure_url;
          const slot = slots.find(s => s.slot_index === slotIndex);
          
          if (slot) {
            const { error: updateError } = await supabase
              .from('library_collage')
              .update({ url, is_active: true })
              .eq('id', slot.id);
            if (!updateError) {
              showMsg('success', `Zone ${slotIndex + 1} mise à jour !`);
              fetchCollage();
            } else showMsg('error', updateError.message);
          } else {
            const { error: insertError } = await supabase
              .from('library_collage')
              .insert({ slot_index: slotIndex, url, is_active: true, label: `Zone ${slotIndex + 1}` });
            if (!insertError) {
              showMsg('success', `Zone ${slotIndex + 1} créée !`);
              fetchCollage();
            } else showMsg('error', insertError.message);
          }
        }
      });
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = doUpload;
      script.onerror = () => { setUploadingSlot(null); showMsg('error', 'Cloudinary indisponible'); };
      document.body.appendChild(script);
    } else { doUpload(); }
  }, [slots, showMsg, fetchCollage]);

  const handleClearSlot = useCallback(async (slotId: string, slotIndex: number) => {
    const { error } = await supabase
      .from('library_collage')
      .update({ url: null, is_active: false })
      .eq('id', slotId);

    if (!error) {
      showMsg('success', `Zone ${slotIndex + 1} vidée.`);
      fetchCollage();
    } else {
      showMsg('error', error.message);
    }
  }, [showMsg, fetchCollage]);

  const handleToggleSlot = useCallback(async (slot: CollageSlot) => {
    if (!slot.url) return;
    const { error } = await supabase
      .from('library_collage')
      .update({ is_active: !slot.is_active })
      .eq('id', slot.id);
    if (!error) {
      showMsg('success', slot.is_active ? 'Zone masquée.' : 'Zone affichée.');
      fetchCollage();
    } else {
      showMsg('error', error.message);
    }
  }, [showMsg, fetchCollage]);

  const handleLayoutChange = useCallback(async (layoutIndex: number) => {
    if (!settings) return;
    setIsSavingLayout(true);
    const { error } = await supabase
      .from('library_collage_settings')
      .update({ layout_index: layoutIndex, updated_at: new Date().toISOString() })
      .eq('id', settings.id);
    if (!error) {
      setSettings(prev => prev ? { ...prev, layout_index: layoutIndex } : prev);
      showMsg('success', `Layout "${LAYOUT_PREVIEWS[layoutIndex].name}" appliqué !`);
    } else {
      showMsg('error', error.message);
    }
    setIsSavingLayout(false);
  }, [settings, showMsg]);

  const handleToggleCollage = useCallback(async () => {
    if (!settings) return;
    const { error } = await supabase
      .from('library_collage_settings')
      .update({ collage_enabled: !settings.collage_enabled, updated_at: new Date().toISOString() })
      .eq('id', settings.id);
    if (!error) {
      setSettings(prev => prev ? { ...prev, collage_enabled: !prev.collage_enabled } : prev);
      showMsg('success', settings.collage_enabled ? 'Collage désactivé.' : 'Collage activé !');
    } else {
      showMsg('error', error.message);
    }
  }, [settings, showMsg]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  const filledCount = slots.filter(s => s.url).length;
  const activeCount = slots.filter(s => s.url && s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Image size={20} className="text-emerald-400" />
            Collage artistique
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            {filledCount}/9 zones remplies • {activeCount} actives
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchCollage}
            className="p-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors" title="Rafraîchir">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleToggleCollage}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${settings?.collage_enabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>
            {settings?.collage_enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {settings?.collage_enabled ? 'Collage activé' : 'Collage désactivé'}
          </button>
        </div>
      </div>

      {/* Layout Preview */}
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <LayoutGrid size={12} />Disposition (layout)
        </p>
        <div className="grid grid-cols-5 gap-3">
          {LAYOUT_PREVIEWS.map((layout, idx) => (
            <button
              key={idx}
              onClick={() => handleLayoutChange(idx)}
              disabled={isSavingLayout}
              className={`relative p-3 rounded-xl border transition-all ${settings?.layout_index === idx ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'}`}
            >
              <div className="w-full aspect-square mb-2 grid gap-0.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' }}>
                {layout.grid.map((cell, cellIdx) => (
                  <div
                    key={cellIdx}
                    className={`rounded-[2px] ${settings?.layout_index === idx ? 'bg-emerald-500/60' : 'bg-white/20'}`}
                    style={{
                      gridColumn: `${cell.col} / span ${cell.colSpan}`,
                      gridRow: `${cell.row} / span ${cell.rowSpan}`,
                    }}
                  />
                ))}
              </div>
              <p className={`text-[10px] font-bold text-center ${settings?.layout_index === idx ? 'text-emerald-400' : 'text-gray-600'}`}>
                {layout.name}
              </p>
              {settings?.layout_index === idx && (
                <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={8} className="text-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Zones d'images */}
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={12} />Zones d'images ({filledCount}/9)
        </p>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, idx) => {
            const slot = slots.find(s => s.slot_index === idx);
            const isUploading = uploadingSlot === idx;
            const hasImage = !!slot?.url;
            const isActive = slot?.is_active ?? false;
            const isBroken = brokenImages.includes(idx);

            return (
              <motion.div
                key={idx}
                layout
                className={`relative rounded-xl overflow-hidden border transition-all ${hasImage ? (isActive ? 'border-emerald-500/40' : 'border-white/10 opacity-60') : 'border-dashed border-white/15'}`}
              >
                <div className="aspect-[4/3] relative bg-[#0a0a18]">
                  {hasImage && !isBroken ? (
                    <img
                      src={slot!.url!}
                      alt={`Zone ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => setBrokenImages(prev => [...prev, idx])}
                    />
                  ) : isBroken ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-red-950/30">
                      <AlertCircle size={24} className="text-red-400" />
                      <span className="text-[10px] text-red-400 font-bold text-center px-2">Image supprimée<br/>Veuillez la vider</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Image size={24} className="text-gray-700" />
                      <span className="text-[10px] text-gray-700">Vide</span>
                    </div>
                  )}

                  {!isBroken && !isActive && hasImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Masquée</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
                    <span className="text-[10px] text-gray-300 font-bold">{idx + 1}</span>
                  </div>

                  {hasImage && !isBroken && (
                    <div className={`absolute top-2 right-2 w-2 h-2 rounded-full z-10 ${isActive ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                  )}
                </div>

                <div className="p-2 bg-[#0f0f0f] flex items-center gap-1.5 z-20 relative">
                  <button 
                    onClick={() => handleUploadSlot(idx)} 
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {hasImage ? 'Remplacer' : 'Uploader'}
                  </button>

                  {hasImage && (
                    <>
                      <button 
                        onClick={() => slot && handleToggleSlot(slot)}
                        className={`p-1.5 rounded-lg text-[10px] transition-all ${isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-white/5 text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                        title={isActive ? 'Masquer' : 'Afficher'}
                      >
                        <Eye size={12} />
                      </button>

                      <button 
                        onClick={() => slot && handleClearSlot(slot.id, idx)}
                        className="p-1.5 rounded-lg bg-white/5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Vider cette zone"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ============================================================================
// BOOK STATS MODAL
// ============================================================================

interface BookStats {
  views: number; downloads: number; likes: number; avg_rating: number; rating_count: number;
  comments: Array<{ id: string; user_email: string; content: string; created_at: string }>;
  ratings_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

function BookDetailsModal({ book, lang, onClose, isOpen }: { book: Book | null; lang: 'fr' | 'en'; onClose: () => void; isOpen: boolean; }) {
  const [stats, setStats] = useState<BookStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !book) return;
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const likesRes = await supabase.from('book_likes').select('id', { count: 'exact', head: true }).eq('book_id', book.id);
        const ratingsRes = await supabase.from('book_ratings').select('rating').eq('book_id', book.id);
        const commentsRes = await supabase.from('book_comments').select('*').eq('book_id', book.id).order('created_at', { ascending: false });

        const ratings = ratingsRes.data || [];
        const avgRating = ratings.length ? ratings.reduce((a: number, b: any) => a + b.rating, 0) / ratings.length : 0;
        const ratingsDist: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach((r: any) => { ratingsDist[r.rating]++; });

        setStats({
          views: book.view_count || 0, downloads: book.download_count || 0,
          likes: likesRes.count || 0, avg_rating: parseFloat(avgRating.toFixed(1)),
          rating_count: ratings.length, comments: commentsRes.data || [],
          ratings_distribution: ratingsDist,
        });
      } catch (err) { console.error('Stats load error:', err); }
      setIsLoadingStats(false);
    };
    loadStats();
  }, [book, isOpen]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setDeletingCommentId(commentId);
    const { error } = await supabase.from('book_comments').delete().eq('id', commentId);
    setDeletingCommentId(null);
    if (!error && stats) {
      setStats(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.id !== commentId) } : prev);
    }
  }, [stats]);

  if (!isOpen || !book) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="relative bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-[0_0_80px_rgba(16,185,129,0.08)]">

          <button onClick={onClose} className="sticky top-4 right-4 z-10 p-2 text-gray-600 hover:text-white transition-colors float-right">
            <X size={20} />
          </button>

          <div className="p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                {book.cover_url ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center"><BookOpen size={24} className="text-gray-600" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-serif text-white mb-1">{book.title_fr}</h2>
                <p className="text-gray-400 text-sm mb-2">{book.author_fr || 'Auteur inconnu'}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_CONFIG[book.status as keyof typeof STATUS_CONFIG]?.bg} ${STATUS_CONFIG[book.status as keyof typeof STATUS_CONFIG]?.color}`}>
                    {STATUS_CONFIG[book.status as keyof typeof STATUS_CONFIG]?.label}
                  </span>
                  {book.has_audio && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1"><Headphones size={9} />Audio</span>}
                </div>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-8">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                    <Eye size={18} className="text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.views.toLocaleString()}</p>
                    <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider">Vues</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                    <Download size={18} className="text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.downloads.toLocaleString()}</p>
                    <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider">DL</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                    <Heart size={18} className="text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.likes.toLocaleString()}</p>
                    <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider">Favoris</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                    <Star size={18} className="text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.avg_rating.toFixed(1)}</p>
                    <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider">({stats.rating_count})</p>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 mb-8">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Star size={14} className="text-[#D4AF37]" />Distribution des notes</h3>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = stats.ratings_distribution[rating as keyof typeof stats.ratings_distribution] || 0;
                      const percent = stats.rating_count > 0 ? (count / stats.rating_count) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500 w-12">{rating} ⭐</span>
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full bg-[#D4AF37]" />
                          </div>
                          <span className="text-xs text-gray-600 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><MessageCircle size={14} className="text-emerald-400" />Commentaires ({stats.comments.length})</h3>
                  {stats.comments.length === 0 ? (
                    <div className="text-center py-6 text-gray-600 text-sm">Aucun commentaire</div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                      {stats.comments.map(comment => (
                        <div key={comment.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="text-white text-xs font-bold">{comment.user_email}</p>
                              <p className="text-gray-600 text-[10px]">{new Date(comment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <button onClick={() => handleDeleteComment(comment.id)} disabled={deletingCommentId === comment.id} className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-all disabled:opacity-50">
                              {deletingCommentId === comment.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                          <p className="text-gray-300 text-xs leading-relaxed">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// SUGGESTION CARD
// ============================================================================

function SuggestionCard({ suggestion, onAccept, onReject, onConvertToBook, onDelete, isProcessing }: {
  suggestion: BookSuggestion;
  onAccept: (s: BookSuggestion) => void;
  onReject: (id: string) => void;
  onConvertToBook: (s: BookSuggestion) => void;
  onDelete: (s: BookSuggestion) => void;
  isProcessing: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = suggestion.submission_type ? SUBMISSION_TYPE_CONFIG[suggestion.submission_type] : null;
  const statusConf = STATUS_CONFIG[suggestion.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConf.bg} ${statusConf.color}`}>{statusConf.label}</span>
              {typeConf && <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConf.bg} ${typeConf.color}`}>{typeConf.label}</span>}
              {suggestion.has_audio && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1"><Headphones size={10} />Audio</span>}
            </div>
            <p className="text-white text-sm font-medium truncate">{suggestion.title}</p>
            {suggestion.author && <p className="text-gray-500 text-xs">{suggestion.author}</p>}
            <div className="flex items-center gap-3 mt-1">
              {suggestion.user_email && <span className="text-[10px] text-gray-600 flex items-center gap-1"><User size={9} />{suggestion.user_email}</span>}
              <span className="text-[10px] text-gray-700">{new Date(suggestion.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onDelete(suggestion)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors" title="Supprimer définitivement">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-600 hover:text-white transition-colors" title="Détails">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-3">
                {suggestion.description && (
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{suggestion.description}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {suggestion.cover_url && <a href={suggestion.cover_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg hover:text-white transition-colors"><Eye size={12} />Couverture</a>}
                  {suggestion.file_url && <a href={suggestion.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"><FileText size={12} />PDF/EPUB</a>}
                  {suggestion.audio_url && <a href={suggestion.audio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"><Music size={12} />Audio</a>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {suggestion.status === 'pending' && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onConvertToBook(suggestion)} disabled={isProcessing === suggestion.id}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30 transition-all disabled:opacity-30">
              {isProcessing === suggestion.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Accepter & créer
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onAccept(suggestion)} className="px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-all" title="Valider sans créer le livre">
              <CheckCircle size={12} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onReject(suggestion.id)} className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
              <XCircle size={12} />
            </motion.button>
          </div>
        )}

        {suggestion.status !== 'pending' && (
          <div className={`mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] ${statusConf.color}`}>
            {suggestion.status === 'published' ? <Check size={12} /> : <XCircle size={12} />}
            {suggestion.status === 'published' ? 'Validée' : 'Rejetée'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// LIBRARY TEASER TAB
// ============================================================================

function LibraryTeaserTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState<'fr' | 'en' | null>(null);

  const [image, setImage] = useState('');
  const [titleFr, setTitleFr] = useState('Manuscrits de Tombouctou');
  const [titleEn, setTitleEn] = useState('Timbuktu Manuscripts');

  const [stat1Value, setStat1Value] = useState('auto');
  const [stat1LabelFr, setStat1LabelFr] = useState('Documents');
  const [stat1LabelEn, setStat1LabelEn] = useState('Documents');
  const [stat2Value, setStat2Value] = useState('15');
  const [stat2LabelFr, setStat2LabelFr] = useState('Langues');
  const [stat2LabelEn, setStat2LabelEn] = useState('Languages');
  const [stat3Value, setStat3Value] = useState('8');
  const [stat3LabelFr, setStat3LabelFr] = useState('Siècles');
  const [stat3LabelEn, setStat3LabelEn] = useState('Centuries');

  const [dbDocCount, setDbDocCount] = useState<number>(0);

  useEffect(() => { fetchSettings(); fetchDbStats(); }, []);

  async function fetchSettings() {
    setIsLoading(true);
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (data) {
      setImage(data.library_teaser_image || '');
      setTitleFr(data.library_teaser_title_fr || 'Manuscrits de Tombouctou');
      setTitleEn(data.library_teaser_title_en || 'Timbuktu Manuscripts');
      setStat1Value(data.library_teaser_stat1_value || 'auto');
      setStat1LabelFr(data.library_teaser_stat1_label_fr || 'Documents');
      setStat1LabelEn(data.library_teaser_stat1_label_en || 'Documents');
      setStat2Value(data.library_teaser_stat2_value || '15');
      setStat2LabelFr(data.library_teaser_stat2_label_fr || 'Langues');
      setStat2LabelEn(data.library_teaser_stat2_label_en || 'Languages');
      setStat3Value(data.library_teaser_stat3_value || '8');
      setStat3LabelFr(data.library_teaser_stat3_label_fr || 'Siècles');
      setStat3LabelEn(data.library_teaser_stat3_label_en || 'Centuries');
    }
    setIsLoading(false);
  }

  async function fetchDbStats() {
    const { count } = await supabase.from('library_books').select('id', { count: 'exact', head: true }).eq('status', 'published');
    setDbDocCount(count || 0);
  }

  const handleAutoTranslate = async (direction: 'fr' | 'en') => {
    setAutoTranslating(direction);
    try {
      const text = direction === 'en' ? titleFr : titleEn;
      if (!text.trim()) { showMsg('error', 'Texte source vide'); setAutoTranslating(null); return; }

      // CORRECTION : L'API s'attend à recevoir la langue SOURCE (ex: si on traduit vers l'anglais, la source est le français)
      const sourceLang = direction === 'en' ? 'fr' : 'en';

      const res = await fetch('/api/lingua', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'translate', text, lang: sourceLang }),
      });
      const json = await res.json();
      if (json.result) {
        if (direction === 'en') setTitleEn(json.result); else setTitleFr(json.result);
        showMsg('success', 'Traduction appliquée !');
      } else showMsg('error', 'Traduction échouée');
    } catch { showMsg('error', 'Erreur de traduction'); }
    setAutoTranslating(null);
  };

  const handleUploadImage = useCallback(() => {
    setIsUploading(true);
    const doUpload = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url', 'camera'], resourceType: 'image', multiple: false, maxFileSize: 10_000_000, folder: 'lukeni/library/teaser',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      }, (error: any, result: any) => {
        setIsUploading(false);
        if (error) { showMsg('error', 'Erreur upload'); return; }
        if (result.event === 'success') { setImage(result.info.secure_url); showMsg('success', 'Image uploadée !'); }
      });
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script'); script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = doUpload; script.onerror = () => { setIsUploading(false); showMsg('error', 'Cloudinary indisponible'); };
      document.body.appendChild(script);
    } else doUpload();
  }, [showMsg]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('site_settings').update({
      library_teaser_image: image || null, library_teaser_title_fr: titleFr, library_teaser_title_en: titleEn,
      library_teaser_stat1_value: stat1Value, library_teaser_stat1_label_fr: stat1LabelFr, library_teaser_stat1_label_en: stat1LabelEn,
      library_teaser_stat2_value: stat2Value, library_teaser_stat2_label_fr: stat2LabelFr, library_teaser_stat2_label_en: stat2LabelEn,
      library_teaser_stat3_value: stat3Value, library_teaser_stat3_label_fr: stat3LabelFr, library_teaser_stat3_label_en: stat3LabelEn,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

    if (error) showMsg('error', error.message); else showMsg('success', 'Section Bibliothèque mise à jour !');
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>;

  const displayStat1 = stat1Value === 'auto' ? (dbDocCount >= 1000 ? `${(dbDocCount / 1000).toFixed(1)}K` : String(dbDocCount)) : stat1Value;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2"><BookOpen size={20} className="text-emerald-400" />Section Explorer — Bibliothèque</h3>
          <p className="text-gray-500 text-xs mt-1">Personnalisez le bloc Bibliothèque visible dans la page Explorer</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-all">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Sauvegarder
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-blue-950/30 to-[#020111] p-6">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 font-bold">Aperçu</p>
        <div className="flex items-center gap-6">
          <div className="w-24 h-32 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-xl">
            {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-black flex items-center justify-center"><BookOpen size={24} className="text-gray-600" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-serif text-sm mb-1 truncate">{titleFr}</p>
            <div className="flex gap-3 mt-2">
              {[{ val: displayStat1, label: stat1LabelFr }, { val: stat2Value, label: stat2LabelFr }, { val: stat3Value, label: stat3LabelFr }].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-[#D4AF37] font-bold text-sm">{s.val}</p>
                  <p className="text-white/40 text-[9px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/8 rounded-xl p-5 space-y-4">
        <h4 className="text-white font-bold text-sm flex items-center gap-2"><Image size={16} className="text-emerald-400" />Image du livre (couverture)</h4>
        <div className="flex items-start gap-4">
          <div className="w-28 h-36 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#0a0a18] flex items-center justify-center">
            {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center gap-2"><BookOpen size={24} className="text-gray-700" /><span className="text-[9px] text-gray-700">Aucune image</span></div>}
          </div>
          <div className="flex-1 space-y-3">
            <button onClick={handleUploadImage} disabled={isUploading} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/15 rounded-xl text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-sm font-bold disabled:opacity-50">
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading ? 'Upload en cours...' : image ? 'Remplacer l\'image' : 'Uploader une image'}
            </button>
            {image && (
              <div className="flex items-center gap-2">
                <a href={image} target="_blank" rel="noopener noreferrer" className="flex-1 text-[10px] text-emerald-400 hover:underline truncate">Voir l'image ↗</a>
                <button onClick={() => setImage('')} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"><X size={10} /> Supprimer</button>
              </div>
            )}
            <p className="text-[10px] text-gray-600">Recommandé : ratio 3/4 (portrait), min 400×530px, JPG/PNG/WEBP</p>
          </div>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/8 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-bold text-sm flex items-center gap-2"><FileText size={16} className="text-emerald-400" />Titre du livre affiché</h4>
          <div className="flex items-center gap-2">
            <button onClick={() => handleAutoTranslate('en')} disabled={!!autoTranslating} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-40 font-bold">
              {autoTranslating === 'en' ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />} FR → EN
            </button>
            <button onClick={() => handleAutoTranslate('fr')} disabled={!!autoTranslating} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-40 font-bold">
              {autoTranslating === 'fr' ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />} EN → FR
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1.5 font-mono uppercase tracking-wider">🇫🇷 Titre français</label>
            <input type="text" value={titleFr} onChange={e => setTitleFr(e.target.value)} placeholder="Ex: Manuscrits de Tombouctou" className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-700" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1.5 font-mono uppercase tracking-wider">🇬🇧 English title</label>
            <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Ex: Timbuktu Manuscripts" className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-700" />
          </div>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/8 rounded-xl p-5 space-y-5">
        <h4 className="text-white font-bold text-sm flex items-center gap-2"><Star size={16} className="text-emerald-400" />Statistiques affichées</h4>
        <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white font-bold">Statistique 1</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${stat1Value === 'auto' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${stat1Value === 'auto' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
              {stat1Value === 'auto' ? `Auto — ${dbDocCount} livres publiés` : 'Valeur manuelle'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Valeur</label>
              <div className="flex gap-2">
                <button onClick={() => setStat1Value('auto')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${stat1Value === 'auto' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#1a1a1a] text-gray-500 border-white/10 hover:border-white/20'}`}>🔄 Auto</button>
                <input type="text" value={stat1Value === 'auto' ? '' : stat1Value} onChange={e => setStat1Value(e.target.value || 'auto')} placeholder={stat1Value === 'auto' ? `${displayStat1}` : 'Ex: 2.4K'} className="flex-1 bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-700" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">🇫🇷 Label</label>
              <input type="text" value={stat1LabelFr} onChange={e => setStat1LabelFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">🇬🇧 Label</label>
              <input type="text" value={stat1LabelEn} onChange={e => setStat1LabelEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl space-y-3">
          <span className="text-xs text-white font-bold block">Statistique 2</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Valeur</label>
              <input type="text" value={stat2Value} onChange={e => setStat2Value(e.target.value)} placeholder="Ex: 15" className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-700" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">🇫🇷 Label</label>
              <input type="text" value={stat2LabelFr} onChange={e => setStat2LabelFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">🇬🇧 Label</label>
              <input type="text" value={stat2LabelEn} onChange={e => setStat2LabelEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl space-y-3">
          <span className="text-xs text-white font-bold block">Statistique 3</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Valeur</label>
              <input type="text" value={stat3Value} onChange={e => setStat3Value(e.target.value)} placeholder="Ex: 8" className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-700" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">🇫🇷 Label</label>
              <input type="text" value={stat3LabelFr} onChange={e => setStat3LabelFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">🇬🇧 Label</label>
              <input type="text" value={stat3LabelEn} onChange={e => setStat3LabelEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-500/[0.06] border border-blue-500/15 rounded-xl">
          <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-300/70 text-[10px] leading-relaxed">
            Le mode <strong className="text-blue-300">Auto</strong> pour la stat 1 compte automatiquement les livres publiés dans la base de données ({dbDocCount} actuellement). Les autres valeurs sont librement éditables.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-all">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Sauvegarder les modifications
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LibraryTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [activeTab, setActiveTab] = useState<'books' | 'suggestions' | 'collage' | 'teaser'>('books');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [authorFr, setAuthorFr] = useState('');
  const [authorEn, setAuthorEn] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [accessType, setAccessType] = useState<'read_only' | 'read_and_download'>('read_only');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('pending');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [suggestionProcessing, setSuggestionProcessing] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSuggStatus, setFilterSuggStatus] = useState<string>('pending');

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleteSuggTarget, setDeleteSuggTarget] = useState<BookSuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedBookForStats, setSelectedBookForStats] = useState<Book | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catResult, bookResult, suggResult] = await Promise.all([
        supabase.from('categories').select('id, name_fr, name_en, color').eq('is_active', true).eq('show_bibliotheque', true),
        supabase.from('library_books').select('*, categories(id, name_fr, name_en, color)').order('created_at', { ascending: false }),
        supabase.from('book_suggestions').select('*').order('created_at', { ascending: false }),
      ]);
      if (catResult.data) setCategories(catResult.data);
      if (bookResult.data) setBooks(bookResult.data as unknown as Book[]);
      if (suggResult.data) setSuggestions(suggResult.data);
    } catch (err) { showMsg('error', 'Erreur lors du chargement'); }
    setIsLoading(false);
  }, [showMsg]);

  const resetForm = useCallback(() => {
    setEditingId(null); setTitleFr(''); setTitleEn(''); setAuthorFr(''); setAuthorEn('');
    setDescFr(''); setDescEn(''); setCoverUrl(''); setFileUrl(''); setAudioUrl('');
    setAccessType('read_only'); setCategoryId(''); setStatus('pending'); setShowForm(false);
  }, []);

  const openNewForm = useCallback(() => {
    resetForm(); setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, [resetForm]);

  const handleEdit = useCallback((b: Book) => {
    setEditingId(b.id); setTitleFr(b.title_fr || ''); setTitleEn(b.title_en || '');
    setAuthorFr(b.author_fr || ''); setAuthorEn(b.author_en || '');
    setDescFr(b.description_fr || ''); setDescEn(b.description_en || '');
    setCoverUrl(b.cover_url || ''); setFileUrl(b.file_url || ''); setAudioUrl(b.audio_url || '');
    setAccessType((b.access_type as any) || 'read_only'); setCategoryId(b.category_id || '');
    setStatus(b.status || 'pending'); setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, []);

  const handleConvertSuggestionToBook = useCallback((s: BookSuggestion) => {
    setEditingId(null); setTitleFr(s.title || ''); setTitleEn('');
    setAuthorFr(s.author || ''); setAuthorEn(''); setDescFr(s.description || ''); setDescEn('');
    setCoverUrl(s.cover_url || ''); setFileUrl(s.file_url || ''); setAudioUrl(s.audio_url || '');
    setAccessType('read_only'); setCategoryId(''); setStatus('published');
    setActiveTab('books'); setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    showMsg('success', 'Formulaire pré-rempli. Complétez et sauvegardez.');
  }, [showMsg]);

  const handleAcceptSuggestion = useCallback(async (s: BookSuggestion) => {
    setSuggestionProcessing(s.id);
    const { error } = await supabase.from('book_suggestions').update({ status: 'published' }).eq('id', s.id);
    if (!error) { showMsg('success', 'Suggestion validée.'); fetchData(); }
    else showMsg('error', error.message);
    setSuggestionProcessing(null);
  }, [fetchData, showMsg]);

  const handleRejectSuggestion = useCallback(async (id: string) => {
    setSuggestionProcessing(id);
    const { error } = await supabase.from('book_suggestions').update({ status: 'rejected' }).eq('id', id);
    if (!error) { showMsg('success', 'Demande rejetée.'); fetchData(); }
    else showMsg('error', error.message);
    setSuggestionProcessing(null);
  }, [fetchData, showMsg]);

  const handleLingua = useCallback(async (action: 'translate-fr' | 'translate-en' | 'correct-fr' | 'correct-en', field: 'title' | 'author' | 'desc') => {
    const key = `${action}-${field}`;
    setIsProcessing(key);
    try {
      const sourceMap: Record<string, string> = {
        'translate-fr-title': titleEn, 'translate-en-title': titleFr,
        'correct-fr-title': titleFr, 'correct-en-title': titleEn,
        'translate-fr-author': authorEn, 'translate-en-author': authorFr,
        'correct-fr-author': authorFr, 'correct-en-author': authorEn,
        'translate-fr-desc': descEn, 'translate-en-desc': descFr,
        'correct-fr-desc': descFr, 'correct-en-desc': descEn,
      };
      const setterMap: Record<string, (v: string) => void> = {
        'translate-fr-title': setTitleFr, 'translate-en-title': setTitleEn,
        'correct-fr-title': setTitleFr, 'correct-en-title': setTitleEn,
        'translate-fr-author': setAuthorFr, 'translate-en-author': setAuthorEn,
        'correct-fr-author': setAuthorFr, 'correct-en-author': setAuthorEn,
        'translate-fr-desc': setDescFr, 'translate-en-desc': setDescEn,
        'correct-fr-desc': setDescFr, 'correct-en-desc': setDescEn,
      };

      const mapKey = `${action}-${field}`;
      const sourceText = sourceMap[mapKey];
      const setter = setterMap[mapKey];

      if (!sourceText?.trim()) { showMsg('error', 'Texte source vide'); return; }

      // CORRECTION DU BUG D'INVERSION ICI
      // L'API /api/lingua (ou autoTranslate) s'attend à recevoir la langue SOURCE dans le paramètre.
      // Donc si on demande de traduire vers l'anglais ('translate-en'), la langue source qu'il faut indiquer à l'API est le français ('fr').
      let sourceLangForApi: 'fr' | 'en' = 'fr';

      if (action === 'translate-en') sourceLangForApi = 'fr';
      if (action === 'translate-fr') sourceLangForApi = 'en';
      if (action === 'correct-en') sourceLangForApi = 'en';
      if (action === 'correct-fr') sourceLangForApi = 'fr';

      const result = action.startsWith('translate')
        ? await autoTranslate(sourceText, sourceLangForApi)
        : await autoCorrect(sourceText, sourceLangForApi);

      setter(result);
      showMsg('success', action.startsWith('translate') ? 'Traduction appliquée !' : 'Correction appliquée !');
    } catch (e) { showMsg('error', 'Erreur Lingua'); }
    setIsProcessing(null);
  }, [titleFr, titleEn, authorFr, authorEn, descFr, descEn, showMsg]);

  const createWidget = useCallback((fieldName: string, resourceType: string) => {
    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget({
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      sources: ['local', 'url', 'camera'], resourceType, multiple: false,
      maxFileSize: 100_000_000, folder: 'lukeni/library',
    }, (error: any, result: any) => {
      setUploadingField(null);
      if (error) { showMsg('error', 'Erreur upload'); return; }
      if (result.event === 'success') {
        const url = result.info.secure_url;
        if (fieldName === 'cover') setCoverUrl(url);
        else if (fieldName === 'file') setFileUrl(url);
        else if (fieldName === 'audio') setAudioUrl(url);
        showMsg('success', 'Fichier uploadé !');
      }
    });
    widget.open();
  }, [showMsg]);

  const openCloudinary = useCallback((fieldName: string, resourceType = 'auto') => {
    setUploadingField(fieldName);
    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = () => createWidget(fieldName, resourceType);
      script.onerror = () => { setUploadingField(null); showMsg('error', 'Cloudinary indisponible'); };
      document.body.appendChild(script);
    } else { createWidget(fieldName, resourceType); }
  }, [createWidget, showMsg]);

  const handleSave = useCallback(async () => {
    if (!titleFr.trim()) return showMsg('error', 'Le titre français est requis.');
    if (!categoryId) return showMsg('error', 'Veuillez sélectionner une catégorie.');
    setIsSaving(true);
    const payload = {
      title_fr: titleFr.trim(), title_en: titleEn.trim() || null,
      author_fr: authorFr.trim() || null, author_en: authorEn.trim() || null,
      description_fr: descFr.trim() || null, description_en: descEn.trim() || null,
      cover_url: coverUrl || null, file_url: fileUrl || null, audio_url: audioUrl || null,
      has_audio: !!audioUrl, access_type: accessType, category_id: categoryId || null, status,
    };
    try {
      let error;
      if (editingId) ({ error } = await supabase.from('library_books').update(payload).eq('id', editingId));
      else ({ error } = await supabase.from('library_books').insert(payload));
      if (error) throw error;
      showMsg('success', editingId ? 'Livre mis à jour !' : 'Livre créé !');
      resetForm(); fetchData();
    } catch (err: any) { showMsg('error', err.message || 'Erreur sauvegarde'); }
    setIsSaving(false);
  }, [titleFr, titleEn, authorFr, authorEn, descFr, descEn, coverUrl, fileUrl, audioUrl, accessType, categoryId, status, editingId, resetForm, fetchData, showMsg]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const { data, error } = await supabase
      .from('library_books')
      .delete()
      .eq('id', deleteTarget.id)
      .select();

    if (error) {
      showMsg('error', error.message);
    } else if (!data || data.length === 0) {
      showMsg('error', 'Suppression bloquée par les permissions Supabase (RLS).');
    } else {
      setBooks(prev => prev.filter(b => b.id !== deleteTarget.id));
      showMsg('success', 'Livre supprimé.');
    }

    setIsDeleting(false);
    setDeleteTarget(null);
  }, [deleteTarget, showMsg]);

  const handleConfirmDeleteSuggestion = useCallback(async () => {
    if (!deleteSuggTarget) return;
    setIsDeleting(true);

    const { data, error } = await supabase
      .from('book_suggestions')
      .delete()
      .eq('id', deleteSuggTarget.id)
      .select();

    if (error) {
      showMsg('error', error.message);
    } else if (!data || data.length === 0) {
      showMsg('error', 'Suppression bloquée par les permissions Supabase (RLS).');
    } else {
      setSuggestions(prev => prev.filter(s => s.id !== deleteSuggTarget.id));
      showMsg('success', 'Demande supprimée définitivement.');
    }

    setIsDeleting(false);
    setDeleteSuggTarget(null);
  }, [deleteSuggTarget, showMsg]);

  const filteredBooks = filterStatus === 'all' ? books : books.filter(b => b.status === filterStatus);
  const filteredSuggestions = filterSuggStatus === 'all' ? suggestions : suggestions.filter(s => s.status === filterSuggStatus);
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-400" size={40} />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl"><Library className="text-emerald-400" size={24} /></div>
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white">Bibliothèque</h2>
            <p className="text-gray-400 text-xs">
              {books.length} livres • {books.filter(b => b.status === 'published').length} publiés
              {pendingCount > 0 && <span className="ml-2 text-amber-400">• {pendingCount} en attente</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'books' && (
            <>
              <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="p-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors">
                {viewMode === 'grid' ? <FileText size={18} /> : <BookOpen size={18} />}
              </button>
              <button onClick={openNewForm} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all">
                <PlusCircle size={16} /><span className="hidden sm:inline">Nouveau Livre</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
        <button onClick={() => setActiveTab('books')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'books' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Library size={14} />Livres ({books.length})
        </button>
        <button onClick={() => setActiveTab('suggestions')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'suggestions' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Inbox size={14} /> Demandes
          {pendingCount > 0 && <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{pendingCount}</span>}
        </button>
        <button onClick={() => setActiveTab('collage')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'collage' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Image size={14} />Collage
        </button>
        <button onClick={() => setActiveTab('teaser')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'teaser' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Star size={14} /> Explorer
        </button>
      </div>

      <AnimatePresence>
        {showForm && activeTab === 'books' && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
            <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-emerald-500/20 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {editingId ? <><Edit2 size={18} className="text-emerald-400" />Modifier</> : <><PlusCircle size={18} className="text-emerald-400" />Nouveau Livre</>}
                </h3>
                <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><X size={14} />Annuler</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">📊 Statut</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🏷️ Catégorie</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors">
                    <option value="">Aucune catégorie</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 font-mono">☁️ Fichiers</label>
                <div className="grid grid-cols-3 gap-3">
                  <UploadField field="cover" label="🖼️ Couverture" url={coverUrl} resourceType="image" uploadingField={uploadingField} onUpload={openCloudinary} onClear={(f) => { if (f === 'cover') setCoverUrl(''); }} />
                  <UploadField field="file" label="📄 PDF/EPUB" url={fileUrl} resourceType="auto" uploadingField={uploadingField} onUpload={openCloudinary} onClear={(f) => { if (f === 'file') setFileUrl(''); }} />
                  <UploadField field="audio" label="🎧 Audio" url={audioUrl} resourceType="video" uploadingField={uploadingField} onUpload={openCloudinary} onClear={(f) => { if (f === 'audio') setAudioUrl(''); }} />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <input type="checkbox" checked={accessType === 'read_and_download'} onChange={e => setAccessType(e.target.checked ? 'read_and_download' : 'read_only')} className="w-5 h-5 accent-emerald-500" />
                <Download size={16} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">Autoriser le téléchargement</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Titre *</label>
                  <input type="text" value={titleFr} onChange={e => setTitleFr(e.target.value)} placeholder={PLACEHOLDERS.title_fr} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 placeholder:text-gray-600 transition-colors" />
                  <div className="flex gap-1 mt-1.5">
                    <LinguaButton action="correct-fr-title" label="Corriger" disabled={!titleFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'title')} />
                    <LinguaButton action="translate-en-title" label="FR→EN" disabled={!titleFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'title')} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Title</label>
                  <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder={PLACEHOLDERS.title_en} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 placeholder:text-gray-600 transition-colors" />
                  <div className="flex gap-1 mt-1.5">
                    <LinguaButton action="correct-en-title" label="Correct" disabled={!titleEn} isProcessing={isProcessing} onClick={() => handleLingua('correct-en', 'title')} />
                    <LinguaButton action="translate-fr-title" label="EN→FR" disabled={!titleEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'title')} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Auteur</label>
                  <input type="text" value={authorFr} onChange={e => setAuthorFr(e.target.value)} placeholder={PLACEHOLDERS.author_fr} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 placeholder:text-gray-600 transition-colors" />
                  <div className="flex gap-1 mt-1.5">
                    <LinguaButton action="correct-fr-author" label="Corriger" disabled={!authorFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'author')} />
                    <LinguaButton action="translate-en-author" label="FR→EN" disabled={!authorFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'author')} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Author</label>
                  <input type="text" value={authorEn} onChange={e => setAuthorEn(e.target.value)} placeholder={PLACEHOLDERS.author_en} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 placeholder:text-gray-600 transition-colors" />
                  <div className="flex gap-1 mt-1.5">
                    <LinguaButton action="correct-en-author" label="Correct" disabled={!authorEn} isProcessing={isProcessing} onClick={() => handleLingua('correct-en', 'author')} />
                    <LinguaButton action="translate-fr-author" label="EN→FR" disabled={!authorEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'author')} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Description</label>
                  <textarea value={descFr} onChange={e => setDescFr(e.target.value)} rows={4} placeholder={PLACEHOLDERS.desc_fr} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 resize-none placeholder:text-gray-600 transition-colors" />
                  <div className="flex gap-1 mt-1.5">
                    <LinguaButton action="correct-fr-desc" label="Corriger" disabled={!descFr} isProcessing={isProcessing} onClick={() => handleLingua('correct-fr', 'desc')} />
                    <LinguaButton action="translate-en-desc" label="FR→EN" disabled={!descFr} isProcessing={isProcessing} onClick={() => handleLingua('translate-en', 'desc')} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Description</label>
                  <textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={4} placeholder={PLACEHOLDERS.desc_en} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 resize-none placeholder:text-gray-600 transition-colors" />
                  <div className="flex gap-1 mt-1.5">
                    <LinguaButton action="correct-en-desc" label="Correct" disabled={!descEn} isProcessing={isProcessing} onClick={() => handleLingua('correct-en', 'desc')} />
                    <LinguaButton action="translate-fr-desc" label="EN→FR" disabled={!descEn} isProcessing={isProcessing} onClick={() => handleLingua('translate-fr', 'desc')} />
                  </div>
                </div>
              </div>

              {coverUrl && (
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                  <img src={coverUrl} alt="" className="w-16 h-20 object-cover rounded-lg border border-white/10" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Aperçu couverture</p>
                    <p className="text-[10px] text-gray-600 truncate max-w-xs">{coverUrl}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={resetForm} className="px-6 py-3 bg-white/5 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition-colors">Annuler</button>
                <button type="button" onClick={handleSave} disabled={isSaving || !titleFr.trim()}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {isSaving ? <><Loader2 size={16} className="animate-spin" />Enregistrement...</> : <><CheckCircle size={16} />{editingId ? 'Mettre à jour' : 'Créer le livre'}</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'books' && (
        <>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterStatus === 'all' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              Tous ({books.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button key={key} onClick={() => setFilterStatus(key)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterStatus === key ? `${config.bg} ${config.color} border ${config.border}` : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {config.label} ({books.filter(b => b.status === key).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredBooks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <Library size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500 text-sm">
                  {filterStatus === 'all' ? 'Aucun livre — créez-en un ci-dessus' : `Aucun livre "${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}"`}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              filteredBooks.map(b => {
                const statusConf = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                return (
                  <motion.div key={b.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0f0f0f] border border-white/10 rounded-xl gap-4 hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt="" className="w-12 h-16 object-cover rounded-lg border border-white/10 group-hover:border-emerald-500/50 transition-colors flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-16 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 flex-shrink-0">
                          <BookOpen size={20} className="text-gray-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConf.bg} ${statusConf.color}`}>{statusConf.label}</span>
                          {b.has_audio && <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full"><Headphones size={10} />Audio</span>}
                          {b.access_type === 'read_and_download' && <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full"><Download size={10} />DL</span>}
                          {b.categories && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${b.categories.color}20`, color: b.categories.color }}>{b.categories.name_fr}</span>}
                        </div>
                        <p className="text-white text-sm font-medium truncate">{b.title_fr}</p>
                        <p className="text-gray-500 text-xs truncate">{b.author_fr || 'Auteur inconnu'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setSelectedBookForStats(b)} className="p-2.5 bg-white/5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Statistiques du livre"><Eye size={16} /></button>
                      <button onClick={() => handleEdit(b)} className="p-2.5 bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteTarget(b)} className="p-2.5 bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBooks.map(b => {
                  const statusConf = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  return (
                    <motion.div key={b.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-all group">
                      <div className="relative h-48 overflow-hidden">
                        {b.cover_url ? <img src={b.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-emerald-900/50 to-black flex items-center justify-center"><BookOpen size={48} className="text-gray-700" /></div>}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConf.bg} ${statusConf.color}`}>{statusConf.label}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-white text-sm font-medium line-clamp-2 mb-1">{b.title_fr}</h4>
                        <p className="text-gray-500 text-xs mb-3">{b.author_fr || 'Auteur inconnu'}</p>
                        <div className="flex items-center justify-between">
                          {b.categories ? <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${b.categories.color}20`, color: b.categories.color }}>{b.categories.name_fr}</span> : <span />}
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(b)} className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => setDeleteTarget(b)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/70 text-xs leading-relaxed">
              Les utilisateurs peuvent soumettre des livres ou des suggestions. Accepter & créer pré-remplit le formulaire automatiquement.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {[
              { key: 'all', label: `Toutes (${suggestions.length})` },
              { key: 'pending', label: `En attente (${suggestions.filter(s => s.status === 'pending').length})` },
              { key: 'published', label: `Validées (${suggestions.filter(s => s.status === 'published').length})` },
              { key: 'rejected', label: `Rejetées (${suggestions.filter(s => s.status === 'rejected').length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilterSuggStatus(tab.key)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterSuggStatus === tab.key ? 'bg-amber-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <Inbox size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500 text-sm">{filterSuggStatus === 'pending' ? 'Aucune demande en attente 🎉' : 'Aucune demande'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuggestions.map(s => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  onConvertToBook={handleConvertSuggestionToBook}
                  onDelete={setDeleteSuggTarget}
                  isProcessing={suggestionProcessing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'collage' && <CollageTab showMsg={showMsg} />}
      {activeTab === 'teaser' && <LibraryTeaserTab showMsg={showMsg} />}

      <DeleteModal
        isOpen={!!deleteTarget}
        title="Supprimer ce livre"
        description="Ce livre sera définitivement supprimé. Action irréversible."
        itemName={deleteTarget ? `${deleteTarget.title_fr}${deleteTarget.author_fr ? ` — ${deleteTarget.author_fr}` : ''}` : undefined}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
        confirmText="Supprimer le livre"
      />

      <DeleteModal
        isOpen={!!deleteSuggTarget}
        title="Supprimer cette demande"
        description="Cette demande (suggestion) sera définitivement supprimée. Action irréversible."
        itemName={deleteSuggTarget ? deleteSuggTarget.title : undefined}
        onConfirm={handleConfirmDeleteSuggestion}
        onCancel={() => setDeleteSuggTarget(null)}
        isDeleting={isDeleting}
        confirmText="Supprimer la demande"
      />

      <BookDetailsModal
        book={selectedBookForStats}
        lang="fr"
        isOpen={!!selectedBookForStats}
        onClose={() => setSelectedBookForStats(null)}
      />
    </div>
  );
}