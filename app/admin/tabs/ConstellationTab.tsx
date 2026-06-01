"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Loader2, Upload, Languages, Star, UserPlus, Palette, Trash2, 
  ToggleLeft, ToggleRight, Edit2, Search, Filter, X, Check, 
  AlertTriangle, Image as ImageIcon, Eye, BookOpen 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// ─── HELPER:  ───
function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    .replace(/\{##[0-9A-Fa-f]*\}/gi, '')
    .replace(/\{\/\}/g, '')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([\s\S]+?)\*/g, '$1');
}

// --- CONSTANTES ---
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_STAR_SIZE = 16;
const MIN_STAR_SIZE = 6;
const MAX_STAR_SIZE = 40;

interface Personality { 
  id: string; 
  name_fr: string; 
  name_en: string; 
  short_bio_fr: string; 
  short_bio_en: string; 
  image_url: string | null; 
  card_color: string; 
  slug: string;
  linked_article_id?: string | null;
}

interface CosmicStar { 
  id: string; 
  personality_id: string; 
  star_color: string; 
  is_active: boolean; 
  is_shooting: boolean; 
  position_x: number; 
  position_y: number; 
  star_size: number; 
  personalities: Personality; 
  created_at: string;
}

interface Article {
  id: string;
  title_fr: string;
  title_en: string;
  slug: string;
}

export default function ConstellationTab({ 
  showMsg, 
  translateText 
}: { 
  showMsg: (type: 'success' | 'error', text: string) => void; 
  translateText: (text: string, lang: 'fr' | 'en') => Promise<string>; 
}) {
  const [stars, setStars] = useState<CosmicStar[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [bioFr, setBioFr] = useState('');
  const [bioEn, setBioEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [cardColor, setCardColor] = useState('#D4AF37');
  const [starColor, setStarColor] = useState('#FFFFFF');
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [starSize, setStarSize] = useState(16);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleSearch, setArticleSearch] = useState('');
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterShooting, setFilterShooting] = useState<'all' | 'shooting' | 'static'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'position'>('date');

  // Confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ starId: string; persId: string; name: string } | null>(null);

  // Fetch stars & articles
  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      
      const { data: starsData } = await supabase
        .from('cosmic_stars')
        .select('*, personalities(*)')
        .order('created_at', { ascending: false });
      
      if (starsData) setStars(starsData as unknown as CosmicStar[]);
      
      const { data: articlesData } = await supabase
        .from('articles')
        .select('id, title_fr, title_en, slug')
        .eq('status', 'published')
        .order('title_fr');
      
      if (articlesData) setArticles(articlesData);
      
      setIsLoading(false);
    }
    fetch();
  }, []);

  // Validation upload image
  const validateFile = useCallback((file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showMsg('error', 'Type de fichier non autorisé (JPEG, PNG, WebP, GIF uniquement)');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showMsg('error', 'Fichier trop volumineux (max 5MB)');
      return false;
    }
    return true;
  }, [showMsg]);

  // Upload image
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cloudName || !uploadPreset) return;
    
    if (!validateFile(file)) return;
    
    setIsUploadingImg(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'lukeni/personalities');
    
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        const optimizedUrl = data.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/');
        setImageUrl(optimizedUrl);
        showMsg('success', 'Photo uploadée avec succès !');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      showMsg('error', `Échec de l'upload: ${err.message}`);
    } finally {
      setIsUploadingImg(false);
    }
  };

  // Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleUploadImage(fakeEvent);
    }
  }, [validateFile]);

  // ─── CHECK DUPLICATES (CORRIGÉ) ───
  const checkDuplicates = useCallback(async (nameFr: string, nameEn: string, excludeId?: string): Promise<boolean> => {
    const { data } = await supabase
      .from('personalities')
      .select('id, name_fr, name_en')
      .or(`name_fr.eq.${nameFr},name_en.eq.${nameEn}`);  // ← Exact match, pas ilike
    
    if (data && data.length > 0) {
      const duplicate = data.find(p => p.id !== excludeId);  // ← Exclure ID en édition
      if (duplicate) {
        showMsg('error', `Cette personnalité existe déjà (${duplicate.name_fr})`);
        return true;
      }
    }
    return false;
  }, [showMsg]);

  // Reset form
  const resetForm = useCallback(() => {
    setNameFr('');
    setNameEn('');
    setBioFr('');
    setBioEn('');
    setImageUrl('');
    setCardColor('#D4AF37');
    setStarColor('#FFFFFF');
    setPosX(50);
    setPosY(50);
    setStarSize(16);
    setSelectedArticleId(null);
    setArticleSearch('');
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Handle Add/Edit
  const handleAdd = async () => {
    if (!nameFr.trim() || !nameEn.trim() || !bioFr.trim() || !bioEn.trim()) {
      return showMsg('error', 'Veuillez remplir tous les champs obligatoires.');
    }

    // ← PASSER editingId ici pour exclure de la vérification
    if (await checkDuplicates(nameFr, nameEn, editingId || undefined)) {
      return;
    }

    setIsAdding(true);
    const slug = nameFr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      if (editingId) {
        // UPDATE
        const { error: persError } = await supabase
          .from('personalities')
          .update({
            name_fr: nameFr,
            name_en: nameEn,
            short_bio_fr: bioFr,
            short_bio_en: bioEn,
            image_url: imageUrl || null,
            card_color: cardColor,
            slug,
            linked_article_id: selectedArticleId || null,
          })
          .eq('id', editingId);

        if (persError) throw persError;

        const { error: starError } = await supabase
          .from('cosmic_stars')
          .update({
            star_color: starColor,
            position_x: posX,
            position_y: posY,
            star_size: starSize
          })
          .eq('id', editingId);

        if (starError) throw starError;

        setStars(stars.map(s => {
          if (s.id === editingId) {
            return {
              ...s,
              star_color: starColor,
              position_x: posX,
              position_y: posY,
              star_size: starSize,
              personalities: {
                ...s.personalities,
                name_fr: nameFr,
                name_en: nameEn,
                short_bio_fr: bioFr,
                short_bio_en: bioEn,
                image_url: imageUrl || null,
                card_color: cardColor,
                slug,
                linked_article_id: selectedArticleId,
              }
            };
          }
          return s;
        }));

        showMsg('success', 'Étoile mise à jour avec succès !');
      } else {
        // CREATE
        const { data: persData, error: persError } = await supabase
          .from('personalities')
          .insert({
            name_fr: nameFr,
            name_en: nameEn,
            short_bio_fr: bioFr,
            short_bio_en: bioEn,
            image_url: imageUrl || null,
            card_color: cardColor,
            slug,
            linked_article_id: selectedArticleId || null,
          })
          .select()
          .single();

        if (persError || !persData) {
          throw new Error(persError?.message || 'Erreur création personnalité');
        }

        const { data: starData, error: starError } = await supabase
          .from('cosmic_stars')
          .insert({
            personality_id: persData.id,
            star_color: starColor,
            is_active: true,
            is_shooting: false,
            position_x: posX,
            position_y: posY,
            star_size: starSize
          })
          .select('*, personalities(*)')
          .single();

        if (starError || !starData) {
          throw new Error(starError?.message || 'Erreur création étoile');
        }

        setStars([starData as unknown as CosmicStar, ...stars]);
        showMsg('success', 'Étoile créée avec succès !');
      }

      resetForm();
    } catch (err: any) {
      console.error('Error:', err);
      showMsg('error', `Erreur: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  // Edit star
  const handleEdit = useCallback((star: CosmicStar) => {
    setEditingId(star.id);
    setNameFr(star.personalities?.name_fr || '');
    setNameEn(star.personalities?.name_en || '');
    setBioFr(star.personalities?.short_bio_fr || '');
    setBioEn(star.personalities?.short_bio_en || '');
    setImageUrl(star.personalities?.image_url || '');
    setCardColor(star.personalities?.card_color || '#D4AF37');
    setStarColor(star.star_color || '#FFFFFF');
    setPosX(star.position_x || 50);
    setPosY(star.position_y || 50);
    setStarSize(star.star_size || 16);
    setSelectedArticleId((star.personalities as any)?.linked_article_id || null);
    
    const linkedArticle = articles.find(a => a.id === (star.personalities as any)?.linked_article_id);
    if (linkedArticle) {
      setArticleSearch(stripFormatting(linkedArticle.title_fr));  // ← Strip formatting
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [articles]);

  // Toggle active
  const toggleActive = async (id: string, status: boolean) => {
    const { error } = await supabase
      .from('cosmic_stars')
      .update({ is_active: !status })
      .eq('id', id);
    
    if (!error) {
      setStars(stars.map(s => s.id === id ? { ...s, is_active: !status } : s));
      showMsg('success', !status ? 'Étoile activée' : 'Étoile masquée');
    } else {
      showMsg('error', error.message);
    }
  };

  // Toggle shooting
  const toggleShooting = async (id: string, status: boolean) => {
    const { error } = await supabase
      .from('cosmic_stars')
      .update({ is_shooting: !status })
      .eq('id', id);
    
    if (!error) {
      setStars(stars.map(s => s.id === id ? { ...s, is_shooting: !status } : s));
      showMsg('success', !status ? 'Mode étoile filante activé ✨' : 'Mode étoile filante désactivé');
    } else {
      showMsg('error', error.message);
    }
  };

  // Delete confirmation
  const confirmDelete = (star: CosmicStar) => {
    setDeleteConfirm({
      starId: star.id,
      persId: star.personality_id,
      name: star.personalities?.name_fr || 'Inconnu'
    });
  };

  // Delete star
  const deleteStar = async () => {
    if (!deleteConfirm) return;
    
    try {
      const { error: starError } = await supabase
        .from('cosmic_stars')
        .delete()
        .eq('id', deleteConfirm.starId);
      
      if (starError) throw starError;

      const { error: persError } = await supabase
        .from('personalities')
        .delete()
        .eq('id', deleteConfirm.persId);
      
      if (persError) throw persError;

      setStars(stars.filter(s => s.id !== deleteConfirm.starId));
      showMsg('success', 'Étoile supprimée définitivement.');
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showMsg('error', `Erreur suppression: ${err.message}`);
    }
  };

  // Filtered & sorted stars
  const filteredStars = useMemo(() => {
    let result = [...stars];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.personalities?.name_fr.toLowerCase().includes(term) ||
        s.personalities?.name_en.toLowerCase().includes(term)
      );
    }

    if (filterActive === 'active') {
      result = result.filter(s => s.is_active);
    } else if (filterActive === 'inactive') {
      result = result.filter(s => !s.is_active);
    }

    if (filterShooting === 'shooting') {
      result = result.filter(s => s.is_shooting);
    } else if (filterShooting === 'static') {
      result = result.filter(s => !s.is_shooting);
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.personalities?.name_fr.localeCompare(b.personalities?.name_fr));
    } else if (sortBy === 'position') {
      result.sort((a, b) => a.position_x - b.position_x);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [stars, searchTerm, filterActive, filterShooting, sortBy]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
        <p className="text-gray-400 text-sm">Chargement de la constellation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Star className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Constellation</h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Gérez les personnalités et leurs étoiles. {stars.length} étoiles créées.
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6">
        <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-lg border border-white/5 mb-6 space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingId ? <Edit2 size={18} className="text-[#D4AF37]" /> : <UserPlus size={18} className="text-[#D4AF37]" />}
              {editingId ? 'Modifier l\'étoile' : 'Créer une nouvelle étoile'}
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

          {/* Noms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
                🇫🇷 Nom <span className="text-red-400">*</span>
              </label>
              <input 
                type="text" 
                value={nameFr} 
                onChange={(e) => setNameFr(e.target.value)} 
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] transition-colors"
                placeholder="Ex: Patrice Lumumba"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
                🇬🇧 Name <span className="text-red-400">*</span>
              </label>
              <input 
                type="text" 
                value={nameEn} 
                onChange={(e) => setNameEn(e.target.value)} 
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] transition-colors"
                placeholder="Ex: Patrice Lumumba"
              />
            </div>
            <div className="absolute right-0 md:-right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button 
                onClick={async () => { 
                  if (!nameFr) return; 
                  try { 
                    const translated = await translateText(nameFr, 'fr');
                    setNameEn(translated); 
                    showMsg('success', 'Traduction automatique appliquée');
                  } catch (err) {
                    showMsg('error', 'Échec de la traduction');
                  }
                }} 
                className="bg-white/10 p-2 rounded-full hover:bg-[#D4AF37] hover:text-black transition-all"
              >
                <Languages size={14} />
              </button>
            </div>
          </div>

          {/* Bios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
                🇫🇷 Bio courte <span className="text-red-400">*</span>
              </label>
              <textarea 
                value={bioFr} 
                onChange={(e) => setBioFr(e.target.value)} 
                rows={3} 
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] transition-colors resize-none"
                placeholder="Brève description de la personnalité..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1">
                🇬🇧 Short Bio <span className="text-red-400">*</span>
              </label>
              <textarea 
                value={bioEn} 
                onChange={(e) => setBioEn(e.target.value)} 
                rows={3} 
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] transition-colors resize-none"
                placeholder="Brief description of the personality..."
              />
            </div>
            <div className="absolute right-0 md:-right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button 
                onClick={async () => { 
                  if (!bioFr) return; 
                  try { 
                    const translated = await translateText(bioFr, 'fr');
                    setBioEn(translated); 
                    showMsg('success', 'Traduction automatique appliquée');
                  } catch (err) {
                    showMsg('error', 'Échec de la traduction');
                  }
                }} 
                className="bg-white/10 p-2 rounded-full hover:bg-[#D4AF37] hover:text-black transition-all"
              >
                <Languages size={14} />
              </button>
            </div>
          </div>

          {/* Image Upload */}
          <div 
            className={`border-2 border-dashed rounded-lg p-4 transition-all ${
              isDragging 
                ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                : 'border-white/20 hover:border-white/40'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
              <ImageIcon size={12} /> Photo <span className="text-gray-500">(max 5MB)</span>
            </label>
            
            <div className="flex items-center gap-4">
              {imageUrl && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#D4AF37]"
                >
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setImageUrl('')}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </motion.div>
              )}
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploadingImg}
                className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {isUploadingImg ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    {imageUrl ? 'Changer' : 'Uploader'}
                  </>
                )}
              </button>
              
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleUploadImage} 
                className="hidden" 
              />

              {isDragging && (
                <span className="text-[#D4AF37] text-sm font-bold animate-pulse">
                  📥 Déposez l'image ici
                </span>
              )}
            </div>

            <p className="text-gray-500 text-xs mt-2">
              Ou glissez-déposez une image ici • JPEG, PNG, WebP, GIF
            </p>
          </div>

          {/* ─── LIEN VERS ARTICLE LUKENI (CORRIGÉ) ─── */}
          <div className="pt-4 border-t border-white/5">
            <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
              <BookOpen size={12} /> Lier à un article Lukeni (optionnel)
            </label>
            
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
              />
              {selectedArticleId && (
                <button
                  onClick={() => { setSelectedArticleId(null); setArticleSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto border border-white/10 rounded-lg bg-[#0f0f0f]">
              {articles
                .filter(a => 
                  stripFormatting(a.title_fr).toLowerCase().includes(articleSearch.toLowerCase()) ||
                  stripFormatting(a.title_en).toLowerCase().includes(articleSearch.toLowerCase())
                )
                .slice(0, 8)
                .map(article => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticleId(article.id);
                      setArticleSearch(stripFormatting(article.title_fr));  // ← Strip formatting
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${
                      selectedArticleId === article.id ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-gray-400'
                    }`}
                  >
                    {selectedArticleId === article.id && <Check size={12} />}
                    <span className="truncate flex-1">
                      {stripFormatting(article.title_fr)}  // ← Strip formatting
                    </span>
                  </button>
                ))}
              
              {articles.length === 0 && (
                <p className="px-3 py-4 text-gray-600 text-xs text-center">
                  Aucun article disponible
                </p>
              )}
            </div>

            {selectedArticleId && (
              <p className="text-[10px] text-[#D4AF37] mt-1.5 flex items-center gap-1">
                <Check size={10} /> Article lié : {stripFormatting(articles.find(a => a.id === selectedArticleId)?.title_fr || '')}
              </p>
            )}
          </div>

          {/* Couleurs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
                <Palette size={12} /> Couleur Fiche
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={cardColor} 
                  onChange={(e) => setCardColor(e.target.value)} 
                  className="w-12 h-10 bg-transparent border border-white/20 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded">
                  {cardColor}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
                <Star size={12} /> Couleur Étoile
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={starColor} 
                  onChange={(e) => setStarColor(e.target.value)} 
                  className="w-12 h-10 bg-transparent border border-white/20 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded">
                  {starColor}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
                <Eye size={12} /> Preview
              </label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-full border-2"
                  style={{ 
                    borderColor: cardColor,
                    background: `radial-gradient(circle at 30% 30%, ${starColor}, transparent)`
                  }}
                />
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ 
                    backgroundColor: starColor,
                    boxShadow: `0 0 10px ${starColor}`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Positionnement & Taille */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono">
                ↔ Position X ({posX}%)
              </label>
              <input 
                type="range" 
                min="5" 
                max="95" 
                value={posX} 
                onChange={(e) => setPosX(Number(e.target.value))} 
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono">
                ↕ Position Y ({posY}%)
              </label>
              <input 
                type="range" 
                min="10" 
                max="90" 
                value={posY} 
                onChange={(e) => setPosY(Number(e.target.value))} 
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
                <Star size={12} /> Taille ({starSize}px)
              </label>
              <input 
                type="range" 
                min={MIN_STAR_SIZE} 
                max={MAX_STAR_SIZE} 
                value={starSize} 
                onChange={(e) => setStarSize(Number(e.target.value))} 
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>
          </div>

          {/* Preview Grid Position */}
          <div className="pt-4 border-t border-white/5">
            <label className="block text-xs text-gray-400 mb-2 font-mono">
              📍 Aperçu de position
            </label>
            <div className="relative w-full h-32 bg-[#0a0a1a] rounded-lg border border-white/10 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
              
              <motion.div
                className="absolute"
                animate={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div 
                  className="rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{ 
                    width: `${Math.max(starSize, 20)}px`, 
                    height: `${Math.max(starSize, 20)}px`,
                    backgroundColor: starColor,
                    boxShadow: `0 0 ${starSize}px ${starColor}`
                  }}
                />
              </motion.div>

              <div className="absolute bottom-2 right-2 text-xs font-mono text-gray-500 bg-black/50 px-2 py-1 rounded">
                X: {posX}% • Y: {posY}%
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-white/5">
            <button 
              onClick={handleAdd} 
              disabled={isAdding} 
              className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isAdding ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {editingId ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  {editingId ? <Edit2 size={16} /> : <UserPlus size={16} />}
                  {editingId ? 'Mettre à jour' : 'Créer & Assigner'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une personnalité..."
              className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
            >
              <option value="all">Tous</option>
              <option value="active">Actives</option>
              <option value="inactive">Masquées</option>
            </select>

            <select
              value={filterShooting}
              onChange={(e) => setFilterShooting(e.target.value as any)}
              className="bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
            >
              <option value="all">Toutes</option>
              <option value="shooting">🌠 Filantes</option>
              <option value="static">⭐ Fixes</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
            >
              <option value="date">📅 Date</option>
              <option value="name">🔤 Nom</option>
              <option value="position">📍 Position</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-3 text-xs text-gray-400 flex items-center justify-between">
          <span>
            {filteredStars.length} étoile{filteredStars.length > 1 ? 's' : ''} affichée{filteredStars.length > 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
          </span>
          {filteredStars.length !== stars.length && (
            <button
              onClick={() => { setSearchTerm(''); setFilterActive('all'); setFilterShooting('all'); }}
              className="text-[#D4AF37] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Liste des étoiles */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          <AnimatePresence>
            {filteredStars.map((star: CosmicStar) => (
              <motion.div 
                key={star.id} 
                layout
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border transition-all ${
                  !star.is_active 
                    ? 'bg-white/[0.02] border-white/5 opacity-60' 
                    : 'bg-white/5 border-white/10 hover:border-[#D4AF37]/40'
                }`}
              >
                {/* Avatar & Star Preview */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <div 
                    className="w-14 h-14 rounded-full overflow-hidden border-2"
                    style={{ borderColor: star.personalities?.card_color || '#D4AF37' }}
                  >
                    <img 
                      src={star.personalities?.image_url || 'https://via.placeholder.com/100'} 
                      alt={star.personalities?.name_fr} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  
                  <motion.div 
                    className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#0f0f0f]"
                    style={{ 
                      backgroundColor: star.star_color, 
                      width: `${Math.max(star.star_size / 3, 8)}px`, 
                      height: `${Math.max(star.star_size / 3, 8)}px`,
                      boxShadow: `0 0 8px ${star.star_color}`
                    }}
                    animate={star.is_shooting ? {
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />

                  {star.is_shooting && (
                    <div className="absolute -top-1 -left-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full p-1">
                      <Star size={8} className="text-yellow-400" fill="currentColor" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {star.personalities?.name_fr}
                    <span className="text-gray-400 font-normal ml-2">/ {star.personalities?.name_en}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-mono">X:{star.position_x}% Y:{star.position_y}%</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Star size={10} /> {star.star_size}px
                    </span>
                    <span>•</span>
                    <span className={star.is_active ? 'text-green-400' : 'text-red-400'}>
                      {star.is_active ? '✓ Active' : '✗ Masquée'}
                    </span>
                    {(star.personalities as any)?.linked_article_id && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#D4AF37]">
                          <BookOpen size={10} /> Lié
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => toggleShooting(star.id, star.is_shooting)} 
                      className={`p-2 rounded-lg transition-all ${
                        star.is_shooting 
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                          : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Star size={18} fill={star.is_shooting ? "currentColor" : "none"} />
                    </button>
                    <span className="text-[8px] text-gray-500 whitespace-nowrap">Filante</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => toggleActive(star.id, star.is_active)} 
                      className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {star.is_active ? (
                        <ToggleRight size={22} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={22} />
                      )}
                    </button>
                    <span className="text-[8px] text-gray-500 whitespace-nowrap">
                      {star.is_active ? 'Active' : 'Cachée'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => handleEdit(star)} 
                      className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-[#D4AF37] hover:bg-white/10 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <span className="text-[8px] text-gray-500 whitespace-nowrap">Éditer</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => confirmDelete(star)} 
                      className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="text-[8px] text-gray-500 whitespace-nowrap">Suppr.</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredStars.length === 0 && (
            <div className="text-center py-12">
              <Star size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">
                {searchTerm 
                  ? `Aucune étoile trouvée pour "${searchTerm}"`
                  : 'Aucune étoile créée pour le moment.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-[#D4AF37] text-xs hover:underline"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Delete */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Supprimer définitivement ?</h3>
                  <p className="text-gray-400 text-sm">Cette action est irréversible.</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-white font-medium mb-1">{deleteConfirm.name}</p>
                <p className="text-gray-500 text-xs">
                  L'étoile et la personnalité associée seront supprimées de la base de données.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteStar}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}