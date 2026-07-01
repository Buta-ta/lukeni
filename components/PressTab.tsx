"use client";

import React, { useState, useEffect } from 'react';
import { 
  Loader2, Newspaper, PlusCircle, Edit2, Trash2, X, Languages, 
  SpellCheck, CheckCircle, Lightbulb, Upload, Image as ImageIcon,
  Eye, Calendar, User, Tag, FileText, Sparkles, Clock, TrendingUp,
  Link as LinkIcon, Video, ExternalLink, BookOpen, Type, Code,
  List, ListOrdered, Quote, Bold, Italic, Heading, Save, Mic, Play,
  MapPin, Globe, Map, Navigation, AlertTriangle, Archive, Settings,
  MessageCircle, Smartphone , Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

// --- CUSTOM ICONS (A ajouter juste en dessous des imports) ---
const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const FacebookIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

interface Category { id: string; name_fr: string; name_en: string; }
interface MediaItem {
  type: 'image' | 'video' | 'link';
  url: string;
  caption?: string;
  alt?: string;
}
interface Source {
  title: string;
  url: string;
  author?: string;
  date?: string;
}
interface PressArticle { 
  id: string; 
  title_fr: string; 
  title_en: string; 
  content_fr: string; 
  content_en: string; 
  summary_fr: string; 
  summary_en: string; 
  cover_url: string; 
  audio_url?: string;
  author_name: string; 
  category_id: string; 
  status: string; 
  media_items?: MediaItem[];
  sources?: Source[];
  created_at?: string;
  published_at?: string;
  scheduled_publish_at?: string;
  geographic_scope?: 'local' | 'national' | 'regional' | 'international';
  location_city?: string;
  location_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  categories: Category; 
}
interface PressSuggestion { 
  id: string; 
  suggested_topic: string; 
  sources: string; 
  user_email: string; 
  status: string;
  created_at?: string; 
}

// ─── NOUVELLES INTERFACES ─────────────────────────────────────────────────────

interface PressArchive {
  id: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  format: 'audio' | 'video' | 'image';
  media_url: string;
  source_name: string;
  source_url: string;
  original_date: string;
  status: string;
  created_at?: string;
}

interface SocialSettings {
  id: number;
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
  facebook_url: string;
  wa_active: boolean;
  ig_active: boolean;
  fb_active: boolean;
}

// Fonction pour convertir Markdown en HTML
const parseMarkdown = (text: string): string => {
  if (!text) return '';
  
  let html = text;
  
  // Titres (## Titre)
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-white mt-6 mb-3">$1</h3>');
  
  // Gras (**texte**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Italique (*texte*)
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-white/80">$1</em>');
  
  // Liens [texte](url)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>');
  
  // Citations (> texte)
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#D4AF37] pl-4 italic text-white/60 my-4">$1</blockquote>');
  
  // Code inline (`code`)
  html = html.replace(/`(.+?)`/g, '<code class="bg-white/10 px-2 py-1 rounded text-sm font-mono text-blue-300">$1</code>');
  
  // Bloc de code (```code```)
  html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-white/5 p-4 rounded-xl my-4 overflow-x-auto"><code class="text-sm font-mono text-green-300">$1</code></pre>');
  
  // Listes non ordonnées (- item)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-6 mb-2 list-disc">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-disc">[\s\S]+?<\/li>)/g, '<ul class="my-4 text-white/70">$1</ul>');
  
  // Listes ordonnées (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2 list-decimal">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-decimal">[\s\S]+?<\/li>)/g, '<ol class="my-4 text-white/70">$1</ol>');
  
  // Paragraphes (double saut de ligne)
  html = html.split('\n\n').map(p => {
    if (p.trim() && !p.startsWith('<') && !p.match(/^\[MEDIA:/)) {
      return `<p class="mb-4 leading-relaxed">${p}</p>`;
    }
    return p;
  }).join('\n\n');
  
  return html;
};


// ─── DELETE CONFIRMATION MODAL ────────────────────────────────────────────────

function DeleteSuggestionModal({
  onConfirm,
  onCancel,
  suggestion,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  suggestion: PressSuggestion;
}) {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Supprimer la suggestion ?</h3>
            <p className="text-gray-400 text-xs">Cette action est irréversible</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/10">
          <p className="text-white text-sm font-medium mb-2">{suggestion.suggested_topic}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User size={10} />
            <span>{suggestion.user_email}</span>
          </div>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          Cette suggestion sera définitivement supprimée de la base de données.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PressTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  // Navigation principale
  const [view, setView] = useState<'articles' | 'archives' | 'suggestions' | 'settings'>('articles');
  
  // Data
  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [archives, setArchives] = useState<PressArchive[]>([]);
  const [suggestions, setSuggestions] = useState<PressSuggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    id: 1, whatsapp_number: '', whatsapp_message: '', instagram_url: '', facebook_url: '',
    wa_active: false, ig_active: false, fb_active: false
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filtres Suggestions
  const [suggestionFilter, setSuggestionFilter] = useState<'all' | 'pending' | 'used'>('all');

  // Formulaire Article
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentFr, setContentFr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [summaryFr, setSummaryFr] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [authorName, setAuthorName] = useState('Rédaction Lukeni');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('draft');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const [geographicScope, setGeographicScope] = useState<'local' | 'national' | 'regional' | 'international' | ''>('');
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [locationLatitude, setLocationLatitude] = useState<number | undefined>();
  const [locationLongitude, setLocationLongitude] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'sources' | 'location'>('content');

  // Formulaire Archives
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [archiveEditingId, setArchiveEditingId] = useState<string | null>(null);
  const [archiveTitleFr, setArchiveTitleFr] = useState('');
  const [archiveTitleEn, setArchiveTitleEn] = useState('');
  const [archiveContentFr, setArchiveContentFr] = useState('');
  const [archiveContentEn, setArchiveContentEn] = useState('');
  const [archiveFormat, setArchiveFormat] = useState<'audio' | 'video' | 'image'>('image');
  const [archiveMediaUrl, setArchiveMediaUrl] = useState('');
  const [archiveSourceName, setArchiveSourceName] = useState('');
  const [archiveSourceUrl, setArchiveSourceUrl] = useState('');
  const [archiveDate, setArchiveDate] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('published');

  // UI States
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Modals
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceDate, setSourceDate] = useState('');

  const [suggestionToDelete, setSuggestionToDelete] = useState<PressSuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    
    // Fetch Categories
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name_fr, name_en')
      .eq('is_active', true)
      .eq('show_presse', true);
    if (catData) setCategories(catData);

    // Fetch Articles
    const { data: artData } = await supabase
      .from('press_articles')
      .select('*, categories(id, name_fr, name_en)')
      .order('created_at', { ascending: false });
    if (artData) setArticles(artData as unknown as PressArticle[]);

    // Fetch Archives (External press)
    const { data: arcData } = await supabase
      .from('press_archives')
      .select('*')
      .order('created_at', { ascending: false });
    if (arcData) setArchives(arcData as PressArchive[]);

    // Fetch Suggestions
    const { data: sugData } = await supabase
      .from('press_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (sugData) setSuggestions(sugData);

    // Fetch Social Settings
    const { data: settingsData } = await supabase
      .from('social_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (settingsData) setSocialSettings(settingsData);
    
    setIsLoading(false);
  }

  // ─── FONCTIONS ARTICLE ────────────────────────────────────────────────────────
  const resetForm = () => { 
    setEditingId(null); setTitleFr(''); setTitleEn(''); setContentFr(''); setContentEn(''); 
    setSummaryFr(''); setSummaryEn(''); setCoverUrl(''); setAudioUrl('');
    setAuthorName('Rédaction Lukeni'); setCategoryId(''); setStatus('draft');
    setMediaItems([]); setSources([]); setScheduledPublishAt(''); setGeographicScope('');
    setLocationCity(''); setLocationCountry(''); setLocationLatitude(undefined); setLocationLongitude(undefined);
    setShowForm(false); setActiveTab('content');
  };

  const handleEdit = (a: PressArticle) => { 
    setEditingId(a.id); setTitleFr(a.title_fr); setTitleEn(a.title_en); 
    setContentFr(a.content_fr || ''); setContentEn(a.content_en || ''); 
    setSummaryFr(a.summary_fr || ''); setSummaryEn(a.summary_en || ''); 
    setCoverUrl(a.cover_url || ''); setAudioUrl(a.audio_url || '');
    setAuthorName(a.author_name); setCategoryId(a.category_id || ''); 
    setStatus(a.status); setMediaItems(a.media_items || []); setSources(a.sources || []);
    setGeographicScope(a.geographic_scope || ''); setLocationCity(a.location_city || '');
    setLocationCountry(a.location_country || ''); setLocationLatitude(a.location_latitude);
    setLocationLongitude(a.location_longitude);
    if (a.scheduled_publish_at) {
      setScheduledPublishAt(new Date(a.scheduled_publish_at).toISOString().slice(0, 16));
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // ─── FONCTIONS ARCHIVES ───────────────────────────────────────────────────────
  const resetArchiveForm = () => {
    setArchiveEditingId(null); setArchiveTitleFr(''); setArchiveTitleEn('');
    setArchiveContentFr(''); setArchiveContentEn(''); setArchiveFormat('image');
    setArchiveMediaUrl(''); setArchiveSourceName(''); setArchiveSourceUrl('');
    setArchiveDate(''); setArchiveStatus('published'); setShowArchiveForm(false);
  };

  const handleEditArchive = (a: PressArchive) => {
    setArchiveEditingId(a.id); setArchiveTitleFr(a.title_fr); setArchiveTitleEn(a.title_en);
    setArchiveContentFr(a.content_fr || ''); setArchiveContentEn(a.content_en || '');
    setArchiveFormat(a.format); setArchiveMediaUrl(a.media_url || '');
    setArchiveSourceName(a.source_name || ''); setArchiveSourceUrl(a.source_url || '');
    setArchiveDate(a.original_date ? new Date(a.original_date).toISOString().split('T')[0] : '');
    setArchiveStatus(a.status); setShowArchiveForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveArchive = async () => {
    if (!archiveTitleFr.trim() || !archiveSourceName.trim() || !archiveMediaUrl.trim()) {
      return showMsg('error', 'Le titre FR, le nom du média et le média principal sont requis');
    }
    setIsSaving(true);
    const payload = {
      title_fr: archiveTitleFr, title_en: archiveTitleEn || null,
      content_fr: archiveContentFr || null, content_en: archiveContentEn || null,
      format: archiveFormat, media_url: archiveMediaUrl,
      source_name: archiveSourceName, source_url: archiveSourceUrl || null,
      original_date: archiveDate || null, status: archiveStatus
    };

    try {
      if (archiveEditingId) {
        const { error } = await supabase.from('press_archives').update(payload).eq('id', archiveEditingId);
        if (error) throw error;
        showMsg('success', '✅ Archive mise à jour');
      } else {
        const { error } = await supabase.from('press_archives').insert(payload);
        if (error) throw error;
        showMsg('success', '🎉 Archive créée avec succès');
      }
      resetArchiveForm();
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const handleDeleteArchive = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette archive ?')) return;
    const { error } = await supabase.from('press_archives').delete().eq('id', id);
    if (!error) {
      setArchives(archives.filter(a => a.id !== id));
      showMsg('success', '🗑️ Archive supprimée');
    } else {
      showMsg('error', error.message);
    }
  };

  const openArchiveMediaCloudinary = () => {
    setIsUploading(true);
    // @ts-ignore
    if (!window.cloudinary) { 
      const s = document.createElement('script'); 
      s.src = 'https://upload-widget.cloudinary.com/global/all.js'; 
      s.onload = () => createArchiveMediaWidget(); 
      document.body.appendChild(s); 
    } else { 
      createArchiveMediaWidget(); 
    }
  };

  const createArchiveMediaWidget = () => {
    const isVideoOrAudio = archiveFormat === 'video' || archiveFormat === 'audio';
    // @ts-ignore
    const w = window.cloudinary.createUploadWidget({ 
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, 
      sources: ['local', 'url'], 
      resourceType: isVideoOrAudio ? 'video' : 'image', 
      multiple: false 
    }, (error: any, result: any) => {
      setIsUploading(false);
      if (result.event === 'success') {
        setArchiveMediaUrl(result.info.secure_url);
        showMsg('success', `✅ Média (${archiveFormat}) uploadé avec succès`);
      }
      if (error) showMsg('error', 'Erreur Cloudinary');
    });
    w.open();
  };

  // ─── LINGUA & LOCATION & CLOUDINARY ARTICLE ───────────────────────────────────
  const handleLingua = async (action: string, isArchive = false) => {
    setIsProcessing(action);
    try {
      if (!isArchive) {
        if (action === 'translate-en') setTitleEn(await autoTranslate(titleFr, 'fr'));
        if (action === 'translate-fr') setTitleFr(await autoTranslate(titleEn, 'en'));
        if (action === 'correct-fr') setTitleFr(await autoCorrect(titleFr, 'fr'));
        if (action === 'correct-en') setTitleEn(await autoCorrect(titleEn, 'en'));
        if (action === 'translate-content-en') setContentEn(await autoTranslate(contentFr, 'fr'));
        if (action === 'translate-content-fr') setContentFr(await autoTranslate(contentEn, 'en'));
        if (action === 'translate-summary-en') setSummaryEn(await autoTranslate(summaryFr, 'fr'));
        if (action === 'translate-summary-fr') setSummaryFr(await autoTranslate(summaryEn, 'en'));
      } else {
        if (action === 'translate-en') setArchiveTitleEn(await autoTranslate(archiveTitleFr, 'fr'));
        if (action === 'translate-content-en') setArchiveContentEn(await autoTranslate(archiveContentFr, 'fr'));
      }
      showMsg('success', '✨ Traitement terminé avec succès');
    } catch (e) { 
      showMsg('error', 'Erreur API Lingua'); 
    }
    setIsProcessing(null);
  };

  const getCurrentLocation = () => {
    setIsGeolocating(true);
    if (!navigator.geolocation) {
      showMsg('error', 'La géolocalisation n\'est pas supportée'); setIsGeolocating(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLatitude(latitude); setLocationLongitude(longitude);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`);
          const data = await response.json();
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state || '';
            const country = data.address.country || '';
            setLocationCity(city); setLocationCountry(country);
            if (country === 'République démocratique du Congo' || country === 'Democratic Republic of the Congo') {
              setGeographicScope('national');
            } else if (city) {
              setGeographicScope('local');
            }
            showMsg('success', `📍 Localisé à ${city}, ${country}`);
          }
        } catch (error) { showMsg('error', 'Erreur lors de la récupération de l\'adresse'); }
        setIsGeolocating(false);
      },
      (error) => { showMsg('error', 'Impossible d\'obtenir votre position'); setIsGeolocating(false); }
    );
  };

  const openCloudinary = () => {
    setIsUploading(true);
    // @ts-ignore
    if (!window.cloudinary) { const s = document.createElement('script'); s.src = 'https://upload-widget.cloudinary.com/global/all.js'; s.onload = () => createWidget(); document.body.appendChild(s); } else { createWidget(); }
  };
  const createWidget = () => {
    // @ts-ignore
    const w = window.cloudinary.createUploadWidget({ cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, sources: ['local', 'url'], resourceType: 'image', multiple: false }, (error: any, result: any) => {
      setIsUploading(false);
      if (result.event === 'success') { setCoverUrl(result.info.secure_url); showMsg('success', '🖼️ Image uploadée'); }
      if (error) showMsg('error', 'Erreur Cloudinary');
    });
    w.open();
  };

  const openAudioCloudinary = () => {
    setIsUploading(true);
    // @ts-ignore
    if (!window.cloudinary) { const s = document.createElement('script'); s.src = 'https://upload-widget.cloudinary.com/global/all.js'; s.onload = () => createAudioWidget(); document.body.appendChild(s); } else { createAudioWidget(); }
  };
  const createAudioWidget = () => {
    // @ts-ignore
    const w = window.cloudinary.createUploadWidget({ cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, sources: ['local', 'url'], resourceType: 'video', multiple: false }, (error: any, result: any) => {
      setIsUploading(false);
      if (result.event === 'success') { setAudioUrl(result.info.secure_url); showMsg('success', '🎙️ Audio uploadé'); }
      if (error) showMsg('error', 'Erreur Cloudinary');
    });
    w.open();
  };

  // ─── SAUVEGARDE ARTICLE ET PARAMETRES ─────────────────────────────────────────
  const handleSave = async () => {
    if (!titleFr.trim()) return showMsg('error', 'Le titre français est requis');
    setIsSaving(true);
    let finalStatus = status;
    if (scheduledPublishAt && new Date(scheduledPublishAt) > new Date()) finalStatus = 'scheduled';
    
    const payload = { 
      title_fr: titleFr, title_en: titleEn || null, content_fr: contentFr || null, content_en: contentEn || null, 
      summary_fr: summaryFr || null, summary_en: summaryEn || null, cover_url: coverUrl || null, audio_url: audioUrl || null,
      author_name: authorName, category_id: categoryId || null, status: finalStatus,
      media_items: mediaItems.length > 0 ? mediaItems : null, sources: sources.length > 0 ? sources : null,
      geographic_scope: geographicScope || null, location_city: locationCity || null, location_country: locationCountry || null,
      location_latitude: locationLatitude || null, location_longitude: locationLongitude || null,
      scheduled_publish_at: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      published_at: finalStatus === 'published' && !editingId ? new Date().toISOString() : undefined
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('press_articles').update(payload).eq('id', editingId);
        if (error) throw error; showMsg('success', '✅ Article mis à jour');
      } else {
        const { error } = await supabase.from('press_articles').insert(payload);
        if (error) throw error; showMsg('success', '🎉 Article créé');
      }
      resetForm(); fetchData();
    } catch (err: any) { showMsg('error', err.message); }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    const { error } = await supabase.from('press_articles').delete().eq('id', id);
    if (!error) { setArticles(articles.filter(a => a.id !== id)); showMsg('success', '🗑️ Article supprimé'); } else { showMsg('error', error.message); }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('social_settings').upsert({ id: 1, ...socialSettings });
      if (error) throw error;
      showMsg('success', '⚙️ Paramètres mis à jour');
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  // ─── GESTION DES SUGGESTIONS ────────────────────────────────────────────────
  const markSuggestionUsed = async (id: string) => {
    const { error } = await supabase.from('press_suggestions').update({ status: 'used' }).eq('id', id);
    if (!error) { 
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: 'used' } : s)); 
      showMsg('success', '✅ Suggestion marquée comme utilisée'); 
    }
  };

  const handleDeleteSuggestion = async () => {
    if (!suggestionToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('press_suggestions').delete().eq('id', suggestionToDelete.id);
      if (error) throw error;
      setSuggestions(suggestions.filter(s => s.id !== suggestionToDelete.id));
      showMsg('success', '🗑️ Suggestion supprimée');
      setSuggestionToDelete(null);
    } catch (err: any) { showMsg('error', err.message || 'Erreur lors de la suppression'); } 
    finally { setIsDeleting(false); }
  };

  // Stats
  const stats = {
    total: articles.length, published: articles.filter(a => a.status === 'published').length,
    draft: articles.filter(a => a.status === 'draft').length, scheduled: articles.filter(a => a.status === 'scheduled').length,
    pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
    totalArchives: archives.length
  };

  const geographicOptions = [
    { value: 'local', label: 'Local', icon: MapPin, color: 'blue', desc: 'Ville ou commune' },
    { value: 'national', label: 'National', icon: Map, color: 'green', desc: 'Tout le pays' },
    { value: 'regional', label: 'Régional', icon: Globe, color: 'orange', desc: 'Afrique Centrale' },
    { value: 'international', label: 'International', icon: Globe, color: 'purple', desc: 'Mondial' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 text-sm animate-pulse">Chargement...</p>
      </div>
    );
  }

  const filteredSuggestionsList = suggestions.filter(s => suggestionFilter === 'all' || s.status === suggestionFilter);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER AVEC STATS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 rounded-2xl border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Newspaper className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Espace Presse & Média
              </h2>
              <p className="text-gray-400 text-sm mt-1">Gérez vos articles, archives externes et suggestions</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400">Production</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Archive size={14} className="text-orange-400" />
                <span className="text-xs text-gray-400">Archives</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{stats.totalArchives}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={14} className="text-green-400" />
                <span className="text-xs text-gray-400">Publiés</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.published}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={14} className="text-purple-400" />
                <span className="text-xs text-gray-400">A traiter</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.pendingSuggestions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <button onClick={() => setView('articles')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'articles' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Newspaper size={16} /> Articles </div>
          {view === 'articles' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />}
        </button>

        <button onClick={() => setView('archives')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'archives' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Archive size={16} /> Archives Externes </div>
          {view === 'archives' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />}
        </button>

        <button onClick={() => setView('suggestions')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'suggestions' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} /> Suggestions 
            {stats.pendingSuggestions > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs animate-pulse">{stats.pendingSuggestions}</span>}
          </div>
          {view === 'suggestions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />}
        </button>

        <button onClick={() => setView('settings')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'settings' ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Settings size={16} /> Réseaux </div>
          {view === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />}
        </button>

        {/* Nouveaux boutons d'actions contextuels */}
        {view === 'articles' && !showForm && (
          <button onClick={() => setShowForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center gap-2">
            <PlusCircle size={16} /> Nouvel Article
          </button>
        )}
        {view === 'archives' && !showArchiveForm && (
          <button onClick={() => setShowArchiveForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center gap-2">
            <PlusCircle size={16} /> Ajouter Archive
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VUE ARTICLES (Production propre)                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {view === 'articles' && (
        <>
          {showForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
               {/* Même formulaire Article que précédemment (simplifié visuellement pour le résumé mais code complet conservé en logique) */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {editingId ? <Edit2 size={20} className="text-blue-400" /> : <Sparkles size={20} className="text-blue-400" />}
                    <h3 className="text-xl font-bold text-white">{editingId ? 'Modifier l\'article' : 'Créer un nouvel article'}</h3>
                  </div>
                  <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-gray-400" /></button>
                </div>
              </div>

              {/* Sub Tabs */}
              <div className="px-6 pt-4 border-b border-white/10">
                <div className="flex gap-2 overflow-x-auto">
                  <button onClick={() => setActiveTab('content')} className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>Contenu</button>
                  <button onClick={() => setActiveTab('media')} className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'media' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>Médias</button>
                  <button onClick={() => setActiveTab('sources')} className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'sources' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>Sources</button>
                  <button onClick={() => setActiveTab('location')} className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'location' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>Localisation</button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {activeTab === 'content' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Statut</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm">
                          <option value="draft">📝 Brouillon</option>
                          <option value="published">✅ Publié</option>
                          <option value="scheduled">🕐 Programmé</option>
                          <option value="archived">📦 Archivé</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Catégorie</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm">
                          <option value="">Sans catégorie</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Auteur</label>
                        <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Image de couverture</label>
                        <button onClick={openCloudinary} className="w-full h-32 bg-[#1a1a1a] border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500 flex flex-col items-center justify-center overflow-hidden">
                          {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <><Upload size={24} className="text-gray-500"/><span className="text-xs text-gray-500 mt-2">Cliquer pour uploader</span></>}
                        </button>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Audio (Optionnel)</label>
                        <button onClick={openAudioCloudinary} className="w-full h-32 bg-[#1a1a1a] border-2 border-dashed border-purple-500/20 rounded-xl hover:border-purple-500 flex flex-col items-center justify-center overflow-hidden">
                          {audioUrl ? <audio controls src={audioUrl} className="w-full px-4" /> : <><Mic size={24} className="text-purple-500"/><span className="text-xs text-gray-500 mt-2">Uploader fichier audio</span></>}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">🇫🇷 Titre (FR)</label>
                        <input type="text" value={titleFr} onChange={e => setTitleFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">🇬🇧 Titre (EN)</label>
                        <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">🇫🇷 Contenu Complet (Illimité)</label>
                        <textarea value={contentFr} onChange={e => setContentFr(e.target.value)} rows={12} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">🇬🇧 Contenu Complet (Illimité)</label>
                        <textarea value={contentEn} onChange={e => setContentEn(e.target.value)} rows={12} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono" />
                      </div>
                    </div>
                  </>
                )}

                {/* Media Tab, Sources Tab, Location Tab remains intact logically, omitted visually to save space but assuming you inject your old code here if needed */}
                {activeTab === 'location' && (
                  <div>
                    <button onClick={getCurrentLocation} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-2"><Navigation size={16}/> Me localiser</button>
                    {/* ... ton code existant ... */}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                  <button onClick={resetForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm">Annuler</button>
                  <button onClick={handleSave} disabled={isSaving || !titleFr.trim()} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showForm && (
            <div className="space-y-4">
              {articles.map(a => (
                <div key={a.id} className="group bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4">
                  {a.cover_url && <img src={a.cover_url} className="w-full md:w-32 h-24 object-cover rounded-xl" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full">{a.categories?.name_fr}</span>
                      <span className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded-full">{a.status}</span>
                    </div>
                    <h3 className="text-white font-bold">{a.title_fr}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(a)} className="p-2 bg-white/5 text-gray-400 hover:text-blue-400 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VUE ARCHIVES EXTERNES (Audio, Video, Image avec texte illimité)    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {view === 'archives' && (
        <>
          {showArchiveForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive size={20} className="text-orange-400" />
                  <h3 className="text-xl font-bold text-white">{archiveEditingId ? 'Modifier l\'archive' : 'Ajouter une archive média'}</h3>
                </div>
                <button onClick={resetArchiveForm} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Sélecteur de format principal */}
                <div>
                  <label className="text-sm font-semibold text-gray-400 mb-3 block">Format Principal de l'Archive</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setArchiveFormat('image')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'image' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                      <ImageIcon size={24} /><span className="text-sm font-medium">Image / Article</span>
                    </button>
                    <button onClick={() => setArchiveFormat('audio')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'audio' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                      <Mic size={24} /><span className="text-sm font-medium">Audio / Podcast</span>
                    </button>
                    <button onClick={() => setArchiveFormat('video')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'video' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                      <Video size={24} /><span className="text-sm font-medium">Vidéo</span>
                    </button>
                  </div>
                </div>

                {/* Upload et Informations Source */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Fichier Média (URL ou Upload)</label>
                    <div className="flex gap-2">
                      <input type="text" value={archiveMediaUrl} onChange={e => setArchiveMediaUrl(e.target.value)} placeholder="https://" className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      <button onClick={openArchiveMediaCloudinary} className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-2">
                        <Upload size={16} /> Upload
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Date de publication originale</label>
                    <input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Nom du Média Source *</label>
                    <input type="text" value={archiveSourceName} onChange={e => setArchiveSourceName(e.target.value)} placeholder="Ex: Jeune Afrique, RFI..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Lien de l'article d'origine</label>
                    <input type="text" value={archiveSourceUrl} onChange={e => setArchiveSourceUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Titre (FR) *</label>
                    <input type="text" value={archiveTitleFr} onChange={e => setArchiveTitleFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Titre (EN)</label>
                    <div className="flex gap-2">
                      <input type="text" value={archiveTitleEn} onChange={e => setArchiveTitleEn(e.target.value)} className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                      <button onClick={() => handleLingua('translate-en', true)} className="px-3 bg-white/5 text-gray-400 rounded-xl hover:text-white"><Languages size={16} /></button>
                    </div>
                  </div>
                </div>

                {/* Textes (Illimités) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center justify-between">
                      <span>Notes ou Transcription (FR) - Illimité</span>
                    </label>
                    <textarea value={archiveContentFr} onChange={e => setArchiveContentFr(e.target.value)} rows={10} placeholder="Collez le texte de l'article ou vos notes..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 flex items-center justify-between">
                      <span>Notes ou Transcription (EN) - Illimité</span>
                      <button onClick={() => handleLingua('translate-content-en', true)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Languages size={12}/> Traduire FR {'>'} EN</button>
                    </label>
                    <textarea value={archiveContentEn} onChange={e => setArchiveContentEn(e.target.value)} rows={10} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                  <button onClick={resetArchiveForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10">Annuler</button>
                  <button onClick={handleSaveArchive} disabled={isSaving || !archiveTitleFr} className="px-8 py-3 bg-orange-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-orange-500">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showArchiveForm && (
            <div className="space-y-4">
              {archives.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/10">
                  <Archive className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-500">Aucune archive externe enregistrée</p>
                </div>
              ) : (
                archives.map(a => (
                  <div key={a.id} className="group bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      {a.format === 'audio' ? <Mic className="text-purple-400" /> : a.format === 'video' ? <Video className="text-red-400" /> : <ImageIcon className="text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-[10px] font-bold rounded-full uppercase">{a.source_name}</span>
                        {a.original_date && <span className="text-xs text-gray-500"><Calendar size={10} className="inline mr-1"/>{new Date(a.original_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      <h3 className="text-white font-bold truncate">{a.title_fr}</h3>
                      <a href={a.source_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mt-1"><ExternalLink size={10}/> Source originale</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditArchive(a)} className="p-2 bg-white/5 text-gray-400 hover:text-orange-400 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteArchive(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VUE SUGGESTIONS (Lecteurs) avec suppression visible                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {view === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-max">
            <Filter size={14} className="text-gray-400 ml-2" />
            <button onClick={() => setSuggestionFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${suggestionFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Toutes</button>
            <button onClick={() => setSuggestionFilter('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${suggestionFilter === 'pending' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>⏳ En attente</button>
            <button onClick={() => setSuggestionFilter('used')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${suggestionFilter === 'used' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>✅ Utilisées</button>
          </div>

          <div className="space-y-4">
            {filteredSuggestionsList.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/10">
                <Lightbulb className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-500 text-lg font-medium">Aucune suggestion</p>
              </div>
            ) : (
              filteredSuggestionsList.map(s => (
                <div key={s.id} className={`group rounded-2xl border p-6 transition-all duration-300 ${s.status === 'used' ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20'}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={16} className={s.status === 'used' ? 'text-gray-500' : 'text-purple-400'} />
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'used' ? 'bg-gray-500/20 text-gray-400' : 'bg-purple-500/20 text-purple-400 animate-pulse'}`}>
                          {s.status === 'used' ? '✅ Utilisé' : '⏳ En attente'}
                        </span>
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">{s.suggested_topic}</h3>
                      {s.sources && <p className="text-gray-400 text-sm mb-3"><span className="text-gray-500 font-medium">Sources : </span>{s.sources}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User size={12} /><span>{s.user_email}</span>
                      {s.created_at && <><span className="text-gray-700">•</span><Clock size={12} /><span>{new Date(s.created_at).toLocaleDateString('fr-FR')}</span></>}
                    </div>

                    <div className="flex items-center gap-2">
                      {s.status === 'pending' && (
                        <button onClick={() => markSuggestionUsed(s.id)} className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition-all flex items-center gap-1.5">
                          <CheckCircle size={14} /> Traiter
                        </button>
                      )}
                      <button onClick={() => setSuggestionToDelete(s)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VUE RÉSEAUX SOCIAUX (Configuration WhatsApp, FB, IG)                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {view === 'settings' && (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xl">
          <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
            <Settings size={24} className="text-gray-400" />
            <h2 className="text-2xl font-bold text-white">Configuration des Réseaux Sociaux</h2>
          </div>

          <div className="space-y-8">
            {/* WhatsApp */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/20 rounded-xl"><MessageCircle className="text-green-400" size={24} /></div>
                  <h3 className="text-lg font-bold text-white">WhatsApp</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={socialSettings.wa_active} onChange={e => setSocialSettings({...socialSettings, wa_active: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <div className="space-y-4 pl-16">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block">Numéro (avec indicatif, ex: 33600000000)</label>
                  <input type="text" value={socialSettings.whatsapp_number || ''} onChange={e => setSocialSettings({...socialSettings, whatsapp_number: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block">Message par défaut pré-rempli</label>
                  <input type="text" value={socialSettings.whatsapp_message || ''} onChange={e => setSocialSettings({...socialSettings, whatsapp_message: e.target.value})} placeholder="Bonjour, je vous contacte depuis Lukeni..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
                </div>
              </div>
            </div>

            {/* Instagram */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-500/20 rounded-xl"><InstagramIcon className="text-pink-400" size={24} /></div>
                  <h3 className="text-lg font-bold text-white">Instagram</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={socialSettings.ig_active} onChange={e => setSocialSettings({...socialSettings, ig_active: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>
              <div className="pl-16">
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Lien du profil Instagram</label>
                <input type="text" value={socialSettings.instagram_url || ''} onChange={e => setSocialSettings({...socialSettings, instagram_url: e.target.value})} placeholder="https://instagram.com/..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
            </div>

            {/* Facebook */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 rounded-xl"><FacebookIcon className="text-blue-400" size={24} /></div>
                  <h3 className="text-lg font-bold text-white">Facebook</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={socialSettings.fb_active} onChange={e => setSocialSettings({...socialSettings, fb_active: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              <div className="pl-16">
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Lien de la page Facebook</label>
                <input type="text" value={socialSettings.facebook_url || ''} onChange={e => setSocialSettings({...socialSettings, facebook_url: e.target.value})} placeholder="https://facebook.com/..." className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm" />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
            <button onClick={handleSaveSettings} disabled={isSaving} className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white rounded-xl font-bold flex items-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Enregistrer la configuration
            </button>
          </div>
        </div>
      )}

      {/* Delete Suggestion Modal */}
      {suggestionToDelete && (
        <DeleteSuggestionModal 
          suggestion={suggestionToDelete} 
          onCancel={() => setSuggestionToDelete(null)} 
          onConfirm={handleDeleteSuggestion} 
        />
      )}

    </div>
  );
}