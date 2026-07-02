"use client";

import React, { useState, useEffect } from 'react';
import {
  Loader2, Newspaper, PlusCircle, Edit2, Trash2, X, Languages,
  SpellCheck, CheckCircle, Lightbulb, Upload, Image as ImageIcon,
  Eye, Calendar, User, Tag, FileText, Sparkles, Clock, TrendingUp,
  Link as LinkIcon, Video, ExternalLink, BookOpen, Type, Code,
  List, ListOrdered, Quote, Bold, Italic, Heading, Save, Mic, Play,
  MapPin, Globe, Map, Navigation, AlertTriangle, Archive, Settings,
  MessageCircle, Filter, Radio, FileAudio, Headphones, AlignLeft,
  Info, ChevronDown, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

// --- CUSTOM ICONS ---
const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

const FacebookIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);

// --- TYPES ---
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

/**
 * ARTICLE TYPE
 * 
 * IMPORTANT — Deux types d'articles distincts :
 * 
 * 1. ARTICLE ÉCRIT (type = 'written')
 *    → Contenu textuel complet en FR + EN
 *    → Peut avoir une image de couverture
 *    → Peut avoir une galerie média embarquée
 *    → reading_audio_url = fichier audio de LECTURE VOCALE (aide à la lecture, généré ou enregistré)
 *      → Ce fichier audio s'affiche comme player dans la page article
 *      → Il LIT l'article écrit à voix haute (accessibilité)
 * 
 * 2. ARTICLE AUDIO (type = 'audio')  
 *    → Le CONTENU PRINCIPAL EST un fichier audio (podcast, interview, reportage sonore...)
 *    → audio_content_url = le fichier audio principal du contenu
 *    → Peut avoir une description / transcript en FR + EN
 *    → L'audio est l'œuvre elle-même, pas une aide à la lecture
 */
interface PressArticle {
  id: string;
  article_type: 'written' | 'audio'; // ← TYPE D'ARTICLE
  title_fr: string;
  title_en: string;
  content_fr: string;    // Texte pour article écrit / Transcript pour article audio
  content_en: string;
  summary_fr: string;
  summary_en: string;
  cover_url: string;
  audio_url?: string;
  // ARTICLE ÉCRIT — audio de lecture vocale (accessibilité)
  reading_audio_url?: string;
  // ARTICLE AUDIO — fichier audio principal (le contenu lui-même)
  audio_content_url?: string;
  audio_duration?: string;  // Ex: "12:34"
  audio_host?: string;      // Présentateur / journaliste audio
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

// --- MARKDOWN PARSER ---
const parseMarkdown = (text: string): string => {
  if (!text) return '';
  let html = text;
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-white mt-6 mb-3">$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-white/80">$1</em>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>');
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#D4AF37] pl-4 italic text-white/60 my-4">$1</blockquote>');
  html = html.replace(/`(.+?)`/g, '<code class="bg-white/10 px-2 py-1 rounded text-sm font-mono text-blue-300">$1</code>');
  html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-white/5 p-4 rounded-xl my-4 overflow-x-auto"><code class="text-sm font-mono text-green-300">$1</code></pre>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-6 mb-2 list-disc">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-disc">[\s\S]+?<\/li>)/g, '<ul class="my-4 text-white/70">$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2 list-decimal">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-decimal">[\s\S]+?<\/li>)/g, '<ol class="my-4 text-white/70">$1</ol>');
  html = html.split('\n\n').map(p => {
    if (p.trim() && !p.startsWith('<') && !p.match(/^\[MEDIA:/)) {
      return `<p class="mb-4 leading-relaxed">${p}</p>`;
    }
    return p;
  }).join('\n\n');
  return html;
};

// --- DELETE SUGGESTION MODAL ---
function DeleteSuggestionModal({ onConfirm, onCancel, suggestion }: { onConfirm: () => void; onCancel: () => void; suggestion: PressSuggestion; }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" /></div>
          <div>
            <h3 className="text-white font-bold text-lg">Supprimer la suggestion ?</h3>
            <p className="text-gray-400 text-xs">Cette action est irréversible</p>
          </div>
        </div>
        <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/10">
          <p className="text-white text-sm font-medium mb-2">{suggestion.suggested_topic}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500"><User size={10} /><span>{suggestion.user_email}</span></div>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-6">Cette suggestion sera définitivement supprimée de la base de données.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all">Annuler</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Trash2 size={16} />Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// --- INFO BADGE COMPONENT ---
function InfoBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
      <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

// --- ARTICLE TYPE SELECTOR ---
function ArticleTypeSelector({ value, onChange }: { value: 'written' | 'audio'; onChange: (v: 'written' | 'audio') => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onChange('written')}
        className={`relative p-5 rounded-2xl border-2 transition-all text-left group ${value === 'written'
            ? 'border-blue-500 bg-gradient-to-br from-blue-500/15 to-blue-600/5 shadow-lg shadow-blue-500/10'
            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
          }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${value === 'written' ? 'bg-blue-500/30' : 'bg-white/10'}`}>
            <AlignLeft size={20} className={value === 'written' ? 'text-blue-300' : 'text-gray-500'} />
          </div>
          <div>
            <p className={`font-bold text-sm ${value === 'written' ? 'text-white' : 'text-gray-400'}`}>Article Écrit</p>
            {value === 'written' && <span className="text-[10px] text-blue-400 font-medium">✓ Sélectionné</span>}
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">Contenu textuel complet. Peut inclure un <span className="text-blue-400 font-medium">player de lecture vocale</span> (accessibilité) pour aider les personnes ayant des difficultés de lecture.</p>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-600">
          <FileText size={10} /> Texte FR + EN
          <span>·</span>
          <Headphones size={10} /> Player lecture optionnel
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('audio')}
        className={`relative p-5 rounded-2xl border-2 transition-all text-left group ${value === 'audio'
            ? 'border-purple-500 bg-gradient-to-br from-purple-500/15 to-purple-600/5 shadow-lg shadow-purple-500/10'
            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
          }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${value === 'audio' ? 'bg-purple-500/30' : 'bg-white/10'}`}>
            <Radio size={20} className={value === 'audio' ? 'text-purple-300' : 'text-gray-500'} />
          </div>
          <div>
            <p className={`font-bold text-sm ${value === 'audio' ? 'text-white' : 'text-gray-400'}`}>Article Audio</p>
            {value === 'audio' && <span className="text-[10px] text-purple-400 font-medium">✓ Sélectionné</span>}
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">Le <span className="text-purple-400 font-medium">fichier audio EST le contenu principal</span>. Podcast, interview, reportage sonore, émission radio...</p>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-600">
          <Mic size={10} /> Audio principal
          <span>·</span>
          <AlignLeft size={10} /> Transcript optionnel
        </div>
      </button>
    </div>
  );
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================
export default function PressTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [view, setView] = useState<'articles' | 'archives' | 'suggestions' | 'settings'>('articles');

  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [archives, setArchives] = useState<PressArchive[]>([]);
  const [suggestions, setSuggestions] = useState<PressSuggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    id: 1, whatsapp_number: '', whatsapp_message: '', instagram_url: '', facebook_url: '',
    wa_active: false, ig_active: false, fb_active: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [suggestionFilter, setSuggestionFilter] = useState<'all' | 'pending' | 'used'>('all');
  const [articleTypeFilter, setArticleTypeFilter] = useState<'all' | 'written' | 'audio'>('all');

  // --- STATES ARTICLE ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [articleType, setArticleType] = useState<'written' | 'audio'>('written');
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentFr, setContentFr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [summaryFr, setSummaryFr] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  // Article ÉCRIT → lecture vocale (accessibilité)
  const [readingAudioUrl, setReadingAudioUrl] = useState('');
  // Article AUDIO → contenu audio principal
  const [audioContentUrl, setAudioContentUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState('');
  const [audioHost, setAudioHost] = useState('');
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

  // --- STATES ARCHIVES ---
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

  // --- UI STATES ---
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null); // track which upload is in progress
  const [showPreview, setShowPreview] = useState(false);

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

  const [showTypeInfo, setShowTypeInfo] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: catData } = await supabase.from('categories').select('id, name_fr, name_en').eq('is_active', true).eq('show_presse', true);
    if (catData) setCategories(catData);

    const { data: artData } = await supabase.from('press_articles').select('*, categories(id, name_fr, name_en)').order('created_at', { ascending: false });
    if (artData) setArticles(artData as unknown as PressArticle[]);

    const { data: arcData } = await supabase.from('press_archives').select('*').order('created_at', { ascending: false });
    if (arcData) setArchives(arcData as PressArchive[]);

    const { data: sugData } = await supabase.from('press_suggestions').select('*').order('created_at', { ascending: false });
    if (sugData) setSuggestions(sugData);

    const { data: settingsData } = await supabase.from('social_settings').select('*').eq('id', 1).single();
    if (settingsData) setSocialSettings(settingsData);

    setIsLoading(false);
  }

  // --- FONCTIONS ARTICLE ---
  const resetForm = () => {
    setEditingId(null);
    setArticleType('written');
    setTitleFr(''); setTitleEn('');
    setContentFr(''); setContentEn('');
    setSummaryFr(''); setSummaryEn('');
    setCoverUrl('');
    setReadingAudioUrl('');
    setAudioContentUrl('');
    setAudioDuration('');
    setAudioHost('');
    setAuthorName('Rédaction Lukeni');
    setCategoryId(''); setStatus('draft');
    setMediaItems([]); setSources([]);
    setScheduledPublishAt('');
    setGeographicScope('');
    setLocationCity(''); setLocationCountry('');
    setLocationLatitude(undefined); setLocationLongitude(undefined);
    setShowForm(false); setActiveTab('content');
  };

  const handleEdit = (a: PressArticle) => {
    setEditingId(a.id);
    setArticleType(a.article_type || 'written');
    setTitleFr(a.title_fr); setTitleEn(a.title_en || '');
    setContentFr(a.content_fr || ''); setContentEn(a.content_en || '');
    setSummaryFr(a.summary_fr || ''); setSummaryEn(a.summary_en || '');
    setCoverUrl(a.cover_url || '');
    setReadingAudioUrl(a.reading_audio_url || a.audio_url || '');
    setAudioContentUrl(a.audio_content_url || '');
    setAudioDuration(a.audio_duration || '');
    setAudioHost(a.audio_host || '');
    setAuthorName(a.author_name || 'Rédaction Lukeni');
    setCategoryId(a.category_id || '');
    setStatus(a.status);
    setMediaItems(a.media_items || []);
    setSources(a.sources || []);
    setGeographicScope(a.geographic_scope || '');
    setLocationCity(a.location_city || '');
    setLocationCountry(a.location_country || '');
    setLocationLatitude(a.location_latitude);
    setLocationLongitude(a.location_longitude);
    if (a.scheduled_publish_at) {
      setScheduledPublishAt(new Date(a.scheduled_publish_at).toISOString().slice(0, 16));
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!titleFr.trim()) return showMsg('error', 'Le titre français est requis');
    if (articleType === 'audio' && !audioContentUrl.trim()) return showMsg('error', 'Un article audio nécessite un fichier audio principal');
    setIsSaving(true);

    let finalStatus = status;
    if (scheduledPublishAt && new Date(scheduledPublishAt) > new Date()) finalStatus = 'scheduled';

    const payload = {
      article_type: articleType,
      title_fr: titleFr,
      title_en: titleEn || null,
      content_fr: contentFr || null,
      content_en: contentEn || null,
      summary_fr: summaryFr || null,
      summary_en: summaryEn || null,
      cover_url: coverUrl || null,
      // Article écrit → lecture vocale
      reading_audio_url: articleType === 'written' ? (readingAudioUrl || null) : null,
      // Article audio → contenu principal
      audio_content_url: articleType === 'audio' ? (audioContentUrl || null) : null,
      audio_duration: articleType === 'audio' ? (audioDuration || null) : null,
      audio_host: articleType === 'audio' ? (audioHost || null) : null,
      author_name: authorName,
      category_id: categoryId || null,
      status: finalStatus,
      media_items: mediaItems.length > 0 ? mediaItems : null,
      sources: sources.length > 0 ? sources : null,
      geographic_scope: geographicScope || null,
      location_city: locationCity || null,
      location_country: locationCountry || null,
      location_latitude: locationLatitude || null,
      location_longitude: locationLongitude || null,
      scheduled_publish_at: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      published_at: finalStatus === 'published' && !editingId ? new Date().toISOString() : undefined
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('press_articles').update(payload).eq('id', editingId);
        if (error) throw error;
        showMsg('success', '✅ Article mis à jour avec succès');
      } else {
        const { error } = await supabase.from('press_articles').insert(payload);
        if (error) throw error;
        showMsg('success', articleType === 'audio' ? '🎙️ Article audio créé !' : '🎉 Article écrit créé !');
      }
      resetForm(); fetchData();
    } catch (err: any) { showMsg('error', err.message); }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    const { error } = await supabase.from('press_articles').delete().eq('id', id);
    if (!error) { setArticles(articles.filter(a => a.id !== id)); showMsg('success', '🗑️ Article supprimé'); }
    else { showMsg('error', error.message); }
  };

  // --- FONCTIONS ARCHIVE ---
  const resetArchiveForm = () => {
    setArchiveEditingId(null); setArchiveTitleFr(''); setArchiveTitleEn('');
    setArchiveContentFr(''); setArchiveContentEn(''); setArchiveFormat('image');
    setArchiveMediaUrl(''); setArchiveSourceName(''); setArchiveSourceUrl('');
    setArchiveDate(''); setArchiveStatus('published'); setShowArchiveForm(false);
  };

  const handleEditArchive = (a: PressArchive) => {
    setArchiveEditingId(a.id); setArchiveTitleFr(a.title_fr); setArchiveTitleEn(a.title_en || '');
    setArchiveContentFr(a.content_fr || ''); setArchiveContentEn(a.content_en || '');
    setArchiveFormat(a.format); setArchiveMediaUrl(a.media_url || '');
    setArchiveSourceName(a.source_name || ''); setArchiveSourceUrl(a.source_url || '');
    setArchiveDate(a.original_date ? new Date(a.original_date).toISOString().split('T')[0] : '');
    setArchiveStatus(a.status); setShowArchiveForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveArchive = async () => {
    if (!archiveTitleFr.trim() || !archiveSourceName.trim() || !archiveMediaUrl.trim()) {
      return showMsg('error', 'Le titre FR, le nom du média et le fichier média sont requis');
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
        if (error) throw error; showMsg('success', '✅ Archive mise à jour');
      } else {
        const { error } = await supabase.from('press_archives').insert(payload);
        if (error) throw error; showMsg('success', '🎉 Archive créée');
      }
      resetArchiveForm(); fetchData();
    } catch (err: any) { showMsg('error', err.message); }
    setIsSaving(false);
  };

  const handleDeleteArchive = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette archive ?')) return;
    const { error } = await supabase.from('press_archives').delete().eq('id', id);
    if (!error) { setArchives(archives.filter(a => a.id !== id)); showMsg('success', '🗑️ Archive supprimée'); }
    else { showMsg('error', error.message); }
  };

  // --- CLOUDINARY HELPERS ---
  const loadCloudinaryScript = (callback: () => void) => {
    // @ts-ignore
    if (!window.cloudinary) {
      const s = document.createElement('script');
      s.src = 'https://upload-widget.cloudinary.com/global/all.js';
      s.onload = callback;
      document.body.appendChild(s);
    } else {
      callback();
    }
  };

  const openCloudinary = (resourceType: 'image' | 'video', onSuccess: (url: string) => void, uploadKey: string) => {
    setIsUploading(uploadKey);
    loadCloudinaryScript(() => {
      // @ts-ignore
      const w = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        resourceType,
        multiple: false,
      }, (error: any, result: any) => {
        setIsUploading(null);
        if (result?.event === 'success') {
          onSuccess(result.info.secure_url);
        }
        if (error) showMsg('error', 'Erreur lors de l\'upload Cloudinary');
      });
      w.open();
    });
  };

  // --- LINGUA ---
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
      showMsg('success', '✨ Traitement Lingua terminé');
    } catch (e) { showMsg('error', 'Erreur API Lingua'); }
    setIsProcessing(null);
  };

  // --- GÉOLOCALISATION ---
  const getCurrentLocation = () => {
    setIsGeolocating(true);
    if (!navigator.geolocation) {
      showMsg('error', 'La géolocalisation n\'est pas supportée par votre navigateur');
      setIsGeolocating(false); return;
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
            showMsg('success', `📍 Localisé : ${city}, ${country}`);
          }
        } catch (error) { showMsg('error', 'Impossible de récupérer l\'adresse depuis les coordonnées'); }
        setIsGeolocating(false);
      },
      () => { showMsg('error', 'Impossible d\'obtenir votre position GPS'); setIsGeolocating(false); }
    );
  };

  // --- MEDIA GALLERY ---
  const openMediaCloudinary = () => {
    loadCloudinaryScript(() => {
      // @ts-ignore
      const w = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        resourceType: mediaType === 'video' ? 'video' : 'image',
        multiple: false,
      }, (error: any, result: any) => {
        if (result?.event === 'success') setMediaUrl(result.info.secure_url);
        if (error) showMsg('error', 'Erreur Cloudinary');
      });
      w.open();
    });
  };

  const addMediaItem = () => {
    if (!mediaUrl.trim()) return showMsg('error', 'URL du média requise');
    const newItem: MediaItem = { type: mediaType, url: mediaUrl, caption: mediaCaption || undefined, alt: mediaAlt || undefined };
    setMediaItems([...mediaItems, newItem]);
    setMediaUrl(''); setMediaCaption(''); setMediaAlt('');
    setShowMediaModal(false);
    showMsg('success', '✅ Média ajouté à la galerie');
  };

  const removeMediaItem = (index: number) => { setMediaItems(mediaItems.filter((_, i) => i !== index)); };

  const insertMediaIntoContent = (index: number, lang: 'fr' | 'en') => {
    const marker = `\n\n[MEDIA:${index}]\n\n`;
    const setter = lang === 'fr' ? setContentFr : setContentEn;
    const content = lang === 'fr' ? contentFr : contentEn;
    const textarea = document.getElementById(`content-${lang}`) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + marker + content.substring(end);
      setter(newContent);
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + marker.length, start + marker.length); }, 0);
    } else {
      setter(content + marker);
    }
    showMsg('success', `📌 Marqueur [MEDIA:${index}] inséré dans le texte ${lang.toUpperCase()}`);
  };

  const addSource = () => {
    if (!sourceTitle.trim() || !sourceUrl.trim()) return showMsg('error', 'Titre et URL de la source requis');
    const newSource: Source = { title: sourceTitle, url: sourceUrl, author: sourceAuthor || undefined, date: sourceDate || undefined };
    setSources([...sources, newSource]);
    setSourceTitle(''); setSourceUrl(''); setSourceAuthor(''); setSourceDate('');
    setShowSourceModal(false);
    showMsg('success', '✅ Source ajoutée');
  };

  const removeSource = (index: number) => { setSources(sources.filter((_, i) => i !== index)); };

  // --- MARKDOWN TOOLBAR ---
  const insertMarkdown = (syntax: string, cursorField: 'fr' | 'en') => {
    const textareaId = cursorField === 'fr' ? 'content-fr' : 'content-en';
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    const field = cursorField === 'fr' ? contentFr : contentEn;
    const setter = cursorField === 'fr' ? setContentFr : setContentEn;
    if (!textarea) { setter(field + syntax); return; }
    const start = textarea.selectionStart; const end = textarea.selectionEnd;
    const selectedText = field.substring(start, end);
    let newText = ''; let cursorOffset = 0;
    if (syntax.includes('**texte gras**') || syntax.includes('**bold text**')) {
      if (selectedText) { newText = field.substring(0, start) + '**' + selectedText + '**' + field.substring(end); cursorOffset = end + 4; }
      else { const ph = syntax.includes('gras') ? 'texte gras' : 'bold text'; newText = field.substring(0, start) + '**' + ph + '**' + field.substring(end); cursorOffset = start + 2 + ph.length + 2; }
    } else if (syntax.includes('*texte italique*') || syntax.includes('*italic text*')) {
      if (selectedText) { newText = field.substring(0, start) + '*' + selectedText + '*' + field.substring(end); cursorOffset = end + 2; }
      else { const ph = syntax.includes('italique') ? 'texte italique' : 'italic text'; newText = field.substring(0, start) + '*' + ph + '*' + field.substring(end); cursorOffset = start + 1 + ph.length + 1; }
    } else if (syntax.includes('[texte') || syntax.includes('[link')) {
      const lt = syntax.includes('texte') ? 'texte du lien' : 'link text';
      if (selectedText) { newText = field.substring(0, start) + '[' + selectedText + '](url)' + field.substring(end); cursorOffset = start + selectedText.length + 3; }
      else { newText = field.substring(0, start) + '[' + lt + '](url)' + field.substring(end); cursorOffset = start + 1 + lt.length + 2; }
    } else { newText = field.substring(0, start) + syntax + field.substring(end); cursorOffset = start + syntax.length; }
    setter(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(cursorOffset, cursorOffset); }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: 'fr' | 'en') => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b': e.preventDefault(); insertMarkdown(field === 'fr' ? '**texte gras**' : '**bold text**', field); break;
        case 'i': e.preventDefault(); insertMarkdown(field === 'fr' ? '*texte italique*' : '*italic text*', field); break;
        case 'k': e.preventDefault(); insertMarkdown(field === 'fr' ? '[texte du lien](url)' : '[link text](url)', field); break;
      }
    }
  };

  // --- SAVE SETTINGS ---
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('social_settings').upsert({ id: 1, ...socialSettings });
      if (error) throw error;
      showMsg('success', '⚙️ Configuration des réseaux sociaux mise à jour');
    } catch (err: any) { showMsg('error', err.message); }
    setIsSaving(false);
  };

  // --- SUGGESTIONS ACTIONS ---
  const markSuggestionUsed = async (id: string) => {
    const { error } = await supabase.from('press_suggestions').update({ status: 'used' }).eq('id', id);
    if (!error) { setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: 'used' } : s)); showMsg('success', '✅ Suggestion marquée comme utilisée'); }
  };

  const handleDeleteSuggestion = async () => {
    if (!suggestionToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('press_suggestions').delete().eq('id', suggestionToDelete.id);
      if (error) throw error;
      setSuggestions(suggestions.filter(s => s.id !== suggestionToDelete.id));
      showMsg('success', '🗑️ Suggestion supprimée'); setSuggestionToDelete(null);
    } catch (err: any) { showMsg('error', err.message || 'Erreur lors de la suppression'); }
    finally { setIsDeleting(false); }
  };

  // --- RENDER CONTENT WITH MEDIA ---
  const renderContentWithMedia = (content: string, items: MediaItem[]) => {
    let processed = parseMarkdown(content);
    items.forEach((media, index) => {
      const marker = `[MEDIA:${index}]`;
      let mediaHTML = '';
      if (media.type === 'image') {
        mediaHTML = `<div class="my-6"><img src="${media.url}" alt="${media.alt || 'Image'}" class="w-full rounded-xl shadow-lg" />${media.caption ? `<p class="text-center text-sm text-white/50 mt-3 italic">${media.caption}</p>` : ''}</div>`;
      } else if (media.type === 'video') {
        mediaHTML = `<div class="my-6"><video controls class="w-full rounded-xl shadow-lg"><source src="${media.url}" /></video>${media.caption ? `<p class="text-center text-sm text-white/50 mt-3 italic">${media.caption}</p>` : ''}</div>`;
      } else if (media.type === 'link') {
        mediaHTML = `<div class="my-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"><a href="${media.url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 flex items-center gap-2">🔗 ${media.caption || media.url}</a></div>`;
      }
      processed = processed.replace(marker, mediaHTML);
    });
    return processed;
  };

  // --- STATS ---
  const stats = {
    totalWritten: articles.filter(a => a.article_type === 'written' || !a.article_type).length,
    totalAudio: articles.filter(a => a.article_type === 'audio').length,
    published: articles.filter(a => a.status === 'published').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
    pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
    totalArchives: archives.length
  };

  const geographicOptions = [
    { value: 'local', label: 'Local', icon: MapPin, color: 'blue', desc: 'Ville ou commune' },
    { value: 'national', label: 'National', icon: Map, color: 'green', desc: 'Tout le pays' },
    { value: 'regional', label: 'Régional', icon: Globe, color: 'orange', desc: 'Afrique Centrale' },
    { value: 'international', label: 'International', icon: Globe, color: 'purple', desc: 'Mondial' }
  ];

  const filteredSuggestionsList = suggestions.filter(s => suggestionFilter === 'all' || s.status === suggestionFilter);

  const filteredArticles = articles.filter(a => {
    if (articleTypeFilter === 'all') return true;
    if (articleTypeFilter === 'written') return a.article_type === 'written' || !a.article_type;
    return a.article_type === articleTypeFilter;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 text-sm animate-pulse">Chargement de l'espace presse...</p>
      </div>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── HEADER AVEC STATS ── */}
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
              <p className="text-gray-400 text-sm mt-1">Gérez vos articles écrits, contenus audio, archives et suggestions</p>
            </div>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><AlignLeft size={12} className="text-blue-400" /><span className="text-[10px] text-gray-400">Écrits</span></div>
              <p className="text-xl font-bold text-white">{stats.totalWritten}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Radio size={12} className="text-purple-400" /><span className="text-[10px] text-gray-400">Audio</span></div>
              <p className="text-xl font-bold text-purple-400">{stats.totalAudio}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Archive size={12} className="text-orange-400" /><span className="text-[10px] text-gray-400">Archives</span></div>
              <p className="text-xl font-bold text-orange-400">{stats.totalArchives}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Eye size={12} className="text-green-400" /><span className="text-[10px] text-gray-400">Publiés</span></div>
              <p className="text-xl font-bold text-green-400">{stats.published}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Clock size={12} className="text-yellow-400" /><span className="text-[10px] text-gray-400">Programmés</span></div>
              <p className="text-xl font-bold text-yellow-400">{stats.scheduled}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1 mb-1"><Lightbulb size={12} className="text-pink-400" /><span className="text-[10px] text-gray-400">Suggestions</span></div>
              <p className="text-xl font-bold text-pink-400">{stats.pendingSuggestions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <button onClick={() => setView('articles')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'articles' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Newspaper size={16} /> Articles de Production</div>
        </button>
        <button onClick={() => setView('archives')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'archives' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Archive size={16} /> Archives Externes</div>
        </button>
        <button onClick={() => setView('suggestions')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'suggestions' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} /> Suggestions
            {stats.pendingSuggestions > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{stats.pendingSuggestions}</span>}
          </div>
        </button>
        <button onClick={() => setView('settings')} className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${view === 'settings' ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
          <div className="flex items-center gap-2"><Settings size={16} /> Réseaux Sociaux</div>
        </button>

        {view === 'articles' && !showForm && (
          <button onClick={() => setShowForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all flex items-center gap-2">
            <PlusCircle size={16} /> Nouvel Article
          </button>
        )}
        {view === 'archives' && !showArchiveForm && (
          <button onClick={() => setShowArchiveForm(true)} className="ml-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center gap-2">
            <PlusCircle size={16} /> Ajouter Archive
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VUE ARTICLES
      ══════════════════════════════════════════════════════════════════ */}
      {view === 'articles' && (
        <>
          {/* ── FORMULAIRE ── */}
          {showForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

              {/* Header formulaire */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingId ? <Edit2 size={20} className="text-blue-400" /> : <Sparkles size={20} className="text-blue-400" />}
                  <h3 className="text-xl font-bold text-white">
                    {editingId ? 'Modifier l\'article' : 'Créer un nouvel article'}
                  </h3>
                  {!editingId && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${articleType === 'audio'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                      {articleType === 'audio' ? '🎙️ Article Audio' : '📝 Article Écrit'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPreview(true)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 text-sm font-medium">
                    <Eye size={16} /> Aperçu
                  </button>
                  <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* ─────────────────────────────────────────────
                    STEP 1 — CHOIX DU TYPE D'ARTICLE
                ───────────────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">1</span>
                      Type d'article
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTypeInfo(!showTypeInfo)}
                      className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                    >
                      <Info size={12} />
                      {showTypeInfo ? 'Masquer les infos' : 'Quelle différence ?'}
                      {showTypeInfo ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  </div>

                  {showTypeInfo && (
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <p className="text-blue-400 font-bold text-sm flex items-center gap-2 mb-2">
                          <AlignLeft size={14} /> Article Écrit
                        </p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li>→ Le contenu principal est du <strong className="text-white">texte</strong></li>
                          <li>→ Peut inclure images et médias dans le corps</li>
                          <li>→ Le <span className="text-blue-300 font-medium">player de lecture vocale</span> est une aide à l'accessibilité qui lit l'article à voix haute</li>
                          <li>→ Ce player de lecture est <em>facultatif</em></li>
                        </ul>
                      </div>
                      <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                        <p className="text-purple-400 font-bold text-sm flex items-center gap-2 mb-2">
                          <Radio size={14} /> Article Audio
                        </p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li>→ Le contenu principal <strong className="text-white">EST l'audio</strong> (podcast, interview, reportage...)</li>
                          <li>→ L'audio s'affiche comme player principal en haut de page</li>
                          <li>→ Le texte est un <span className="text-purple-300 font-medium">transcript / description</span> facultatif</li>
                          <li>→ Ex: émission radio, interview exclusive, chronique audio</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <ArticleTypeSelector value={articleType} onChange={setArticleType} />
                </div>

                {/* ─────────────────────────────────────────────
                    STEP 2 — MÉTADONNÉES
                ───────────────────────────────────────────── */}
                <div>
                  <label className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">2</span>
                    Informations générales
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Tag size={14} /> Statut de publication</label>
                      <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors">
                        <option value="draft">📝 Brouillon</option>
                        <option value="published">✅ Publié immédiatement</option>
                        <option value="scheduled">🕐 Programmé (voir ci-dessous)</option>
                        <option value="archived">📦 Archivé</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Tag size={14} /> Catégorie</label>
                      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors">
                        <option value="">— Sans catégorie —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><User size={14} /> Auteur / Rédacteur</label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={e => setAuthorName(e.target.value)}
                        placeholder="Ex: Rédaction Lukeni, Jean Mbeki..."
                        className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Programmation */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><Clock size={14} /> Programmer la publication (optionnel)</label>
                    <input
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={e => setScheduledPublishAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full md:w-80 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    {scheduledPublishAt && (
                      <div className="mt-2 flex items-center gap-3">
                        <p className="text-xs text-orange-400 flex items-center gap-1">
                          <Clock size={10} /> Publication prévue : {new Date(scheduledPublishAt).toLocaleString('fr-FR')}
                        </p>
                        <button type="button" onClick={() => setScheduledPublishAt('')} className="text-xs text-red-400 hover:text-red-300 underline">Annuler la programmation</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────
                    ONGLETS CONTENU
                ───────────────────────────────────────────── */}
                <div className="border-t border-white/10 pt-6">
                  <label className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">3</span>
                    Contenu de l'article
                  </label>

                  {/* Tabs */}
                  <div className="px-0 border-b border-white/10 mb-6">
                    <div className="flex gap-1 overflow-x-auto">
                      <button onClick={() => setActiveTab('content')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
                        <div className="flex items-center gap-2"><Type size={14} /> Texte & Médias principaux</div>
                      </button>
                      <button onClick={() => setActiveTab('media')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'media' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
                        <div className="flex items-center gap-2">
                          <ImageIcon size={14} /> Galerie Médias
                          {mediaItems.length > 0 && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{mediaItems.length}</span>}
                        </div>
                      </button>
                      <button onClick={() => setActiveTab('sources')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'sources' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} /> Sources
                          {sources.length > 0 && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{sources.length}</span>}
                        </div>
                      </button>
                      <button onClick={() => setActiveTab('location')} className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'location' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} /> Localisation
                          {(locationCity || geographicScope) && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ── TAB CONTENT ── */}
                  {activeTab === 'content' && (
                    <div className="space-y-6">

                      {/* IMAGE DE COUVERTURE */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2"><ImageIcon size={14} /> Image de couverture</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => openCloudinary('image', setCoverUrl, 'cover')}
                            disabled={isUploading === 'cover'}
                            className="relative w-full sm:w-48 h-32 bg-[#1a1a1a] border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500 flex flex-col items-center justify-center overflow-hidden transition-colors group"
                          >
                            {coverUrl
                              ? <img src={coverUrl} className="w-full h-full object-cover" alt="Couverture" />
                              : isUploading === 'cover'
                                ? <><Loader2 size={24} className="animate-spin text-blue-400" /><span className="text-xs text-gray-400 mt-2">Upload...</span></>
                                : <><Upload size={24} className="text-gray-500 group-hover:text-blue-400 transition-colors" /><span className="text-xs text-gray-500 mt-2">Cliquer pour uploader</span><span className="text-[10px] text-gray-600 mt-1">JPG, PNG, WebP</span></>
                            }
                          </button>
                          <div className="flex-1 flex flex-col justify-between">
                            {coverUrl
                              ? <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2"><CheckCircle size={14} /> Image uploadée avec succès</div>
                              : <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-gray-500">Recommandé : 1200×630px, format paysage, moins de 5MB</div>
                            }
                            {coverUrl && <button onClick={() => setCoverUrl('')} className="mt-2 text-xs text-red-400 hover:underline self-start">🗑️ Supprimer l'image</button>}
                          </div>
                        </div>
                      </div>

                      {/* ════════════════════════════════════════════════════════
                          SECTION AUDIO — SÉPARATION CLAIRE SELON LE TYPE
                      ════════════════════════════════════════════════════════ */}

                      {articleType === 'written' && (
                        /* ARTICLE ÉCRIT → Audio de lecture vocale (accessibilité) */
                        <div className="p-5 bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                              <Headphones size={18} className="text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-bold text-sm">Player de lecture vocale</h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Aide à l'accessibilité — Ce fichier audio <strong className="text-blue-300">lit l'article à voix haute</strong> pour les personnes ayant des difficultés de lecture. Il s'affiche comme un petit player discret dans la page article.
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20">OPTIONNEL</span>
                          </div>

                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">URL du fichier audio de lecture (MP3, WAV, M4A...)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={readingAudioUrl}
                                  onChange={e => setReadingAudioUrl(e.target.value)}
                                  placeholder="https://... ou uploader ci-dessous"
                                  className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                                />
                                <button
                                  onClick={() => openCloudinary('video', setReadingAudioUrl, 'reading-audio')}
                                  disabled={isUploading === 'reading-audio'}
                                  className="px-4 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl flex items-center gap-2 text-sm font-medium border border-blue-500/20 transition-colors disabled:opacity-50"
                                >
                                  {isUploading === 'reading-audio' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                  Upload
                                </button>
                              </div>
                            </div>
                          </div>

                          {readingAudioUrl && (
                            <div className="mt-3">
                              <audio controls src={readingAudioUrl} className="w-full h-10 rounded-lg" />
                              <button onClick={() => setReadingAudioUrl('')} className="mt-2 text-xs text-red-400 hover:underline">🗑️ Supprimer l'audio de lecture</button>
                            </div>
                          )}
                        </div>
                      )}

                      {articleType === 'audio' && (
                        /* ARTICLE AUDIO → Fichier audio principal (le contenu lui-même) */
                        <div className="p-5 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-2 border-purple-500/30 rounded-2xl">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-purple-500/30 rounded-xl">
                              <Radio size={18} className="text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-bold text-sm">🎙️ Fichier audio principal — Contenu de l'article</h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Ce fichier audio <strong className="text-purple-300">EST l'article lui-même</strong>. Il s'affichera en grand player en haut de la page (podcast, interview, reportage sonore, émission...). <strong className="text-white">Obligatoire.</strong>
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">REQUIS</span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-gray-400 font-semibold mb-1 block">Fichier audio (MP3, WAV, M4A, OGG...)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={audioContentUrl}
                                  onChange={e => setAudioContentUrl(e.target.value)}
                                  placeholder="https://res.cloudinary.com/... ou collez une URL directe"
                                  className="flex-1 bg-[#1a1a1a] border border-purple-500/30 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                />
                                <button
                                  onClick={() => openCloudinary('video', setAudioContentUrl, 'audio-content')}
                                  disabled={isUploading === 'audio-content'}
                                  className="px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50"
                                >
                                  {isUploading === 'audio-content' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                  Upload
                                </button>
                              </div>
                            </div>

                            {audioContentUrl && (
                              <div className="p-3 bg-black/30 rounded-xl">
                                <p className="text-xs text-purple-400 font-semibold mb-2">🎧 Aperçu de l'audio :</p>
                                <audio controls src={audioContentUrl} className="w-full rounded-lg" />
                                <button onClick={() => setAudioContentUrl('')} className="mt-2 text-xs text-red-400 hover:underline">🗑️ Supprimer l'audio</button>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1 block flex items-center gap-1"><Clock size={12} /> Durée de l'épisode (optionnel)</label>
                                <input
                                  type="text"
                                  value={audioDuration}
                                  onChange={e => setAudioDuration(e.target.value)}
                                  placeholder="Ex: 24:30 ou 1h 05min"
                                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1 block flex items-center gap-1"><Mic size={12} /> Présentateur / Journaliste (optionnel)</label>
                                <input
                                  type="text"
                                  value={audioHost}
                                  onChange={e => setAudioHost(e.target.value)}
                                  placeholder="Ex: Christelle Nzuzi, Jean Mbeki..."
                                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TITRES */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇫🇷 Titre principal (Français) *</label>
                          <input
                            type="text"
                            value={titleFr}
                            onChange={e => setTitleFr(e.target.value)}
                            placeholder={articleType === 'audio' ? 'Ex: Interview exclusive avec... | Épisode 12 : Les défis de...' : 'Ex: La musique congolaise rayonne sur la scène internationale'}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleLingua('correct-fr')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'correct-fr' ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />} Corriger FR
                            </button>
                            <button onClick={() => handleLingua('translate-fr')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'translate-fr' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} EN → FR
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">🇬🇧 Titre principal (Anglais)</label>
                          <input
                            type="text"
                            value={titleEn}
                            onChange={e => setTitleEn(e.target.value)}
                            placeholder={articleType === 'audio' ? 'Ex: Exclusive interview with... | Episode 12: The challenges of...' : 'Ex: Congolese music shines on the international stage'}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleLingua('correct-en')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'correct-en' ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />} Correct EN
                            </button>
                            <button onClick={() => handleLingua('translate-en')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'translate-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} FR → EN
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RÉSUMÉS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">
                            🇫🇷 {articleType === 'audio' ? 'Description de l\'épisode (FR)' : 'Résumé / Chapeau (FR)'}
                          </label>
                          <textarea
                            value={summaryFr}
                            onChange={e => setSummaryFr(e.target.value)}
                            rows={3}
                            placeholder={articleType === 'audio'
                              ? 'Ex: Dans cet épisode, nous recevons... Nous aborderons les thèmes suivants...'
                              : 'Ex: Un bref résumé accrocheur de 2-3 lignes pour donner envie de lire l\'article...'}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors resize-y"
                          />
                          <button onClick={() => handleLingua('translate-summary-en')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 w-max transition-colors">
                            {isProcessing === 'translate-summary-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} Traduire → EN
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 block">
                            🇬🇧 {articleType === 'audio' ? 'Episode Description (EN)' : 'Summary / Introduction (EN)'}
                          </label>
                          <textarea
                            value={summaryEn}
                            onChange={e => setSummaryEn(e.target.value)}
                            rows={3}
                            placeholder={articleType === 'audio'
                              ? 'Ex: In this episode, we welcome... Topics covered include...'
                              : 'Ex: A brief, compelling 2-3 sentence summary to entice readers...'}
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors resize-y"
                          />
                          <button onClick={() => handleLingua('translate-summary-fr')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 w-max transition-colors">
                            {isProcessing === 'translate-summary-fr' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} Traduire → FR
                          </button>
                        </div>
                      </div>

                      {/* CONTENU PRINCIPAL */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* FR */}
                        <div className="space-y-0">
                          <label className="text-xs font-semibold text-gray-400 block mb-2">
                            🇫🇷 {articleType === 'audio' ? 'Transcript / Notes (FR) — Optionnel, illimité' : 'Contenu complet (FR) — Illimité'}
                            <span className="ml-2 text-[10px] text-gray-600">Ctrl+B: Gras · Ctrl+I: Italique · Ctrl+K: Lien</span>
                          </label>
                          {/* Toolbar markdown */}
                          <div className="flex flex-wrap gap-0.5 p-2 bg-[#1a1a1a] border border-white/20 border-b-0 rounded-t-xl">
                            <button type="button" onClick={() => insertMarkdown('\n## Titre de section\n', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Titre H2"><Heading size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('**texte gras**', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Gras (Ctrl+B)"><Bold size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('*texte italique*', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Italique (Ctrl+I)"><Italic size={14} /></button>
                            <div className="w-px h-5 bg-white/10 mx-1 self-center" />
                            <button type="button" onClick={() => insertMarkdown('\n- Élément 1\n- Élément 2\n', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Liste à puces"><List size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('\n1. Premier point\n2. Deuxième point\n', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Liste numérotée"><ListOrdered size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('\n> Citation importante\n', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Bloc citation"><Quote size={14} /></button>
                            <div className="w-px h-5 bg-white/10 mx-1 self-center" />
                            <button type="button" onClick={() => insertMarkdown('\n```\nbloc de code\n```\n', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Bloc code"><Code size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('[texte du lien](https://...)', 'fr')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Lien (Ctrl+K)"><LinkIcon size={14} /></button>
                          </div>
                          <textarea
                            id="content-fr"
                            value={contentFr}
                            onChange={e => setContentFr(e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'fr')}
                            rows={18}
                            placeholder={articleType === 'audio'
                              ? '— TRANSCRIPT (optionnel) —\n\nSi vous souhaitez ajouter la transcription de l\'épisode audio, collez-la ici.\n\nEx:\n[00:00] Introduction\nBonjour et bienvenue dans ce nouvel épisode...\n\n[05:30] Première partie\n...'
                              : '— CONTENU COMPLET DE L\'ARTICLE —\n\nCommencez à rédiger votre article ici. Utilisez le Markdown pour la mise en forme :\n\n## Titre de section\n\nVotre texte **en gras** ou *en italique*.\n\n> Citation ou extrait important\n\n- Point clé 1\n- Point clé 2\n\nInsérez un média avec la balise [MEDIA:0] (après l\'avoir ajouté dans l\'onglet Galerie Médias).'
                            }
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-b-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors resize-y"
                          />
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-gray-600">{contentFr.length} caractères</span>
                            <button onClick={() => handleLingua('translate-content-en')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'translate-content-en' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} Traduire → EN
                            </button>
                          </div>
                        </div>

                        {/* EN */}
                        <div className="space-y-0">
                          <label className="text-xs font-semibold text-gray-400 block mb-2">
                            🇬🇧 {articleType === 'audio' ? 'Transcript / Notes (EN) — Optional, unlimited' : 'Full content (EN) — Unlimited'}
                            <span className="ml-2 text-[10px] text-gray-600">Ctrl+B: Bold · Ctrl+I: Italic · Ctrl+K: Link</span>
                          </label>
                          {/* Toolbar markdown */}
                          <div className="flex flex-wrap gap-0.5 p-2 bg-[#1a1a1a] border border-white/20 border-b-0 rounded-t-xl">
                            <button type="button" onClick={() => insertMarkdown('\n## Section Title\n', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><Heading size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('**bold text**', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><Bold size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('*italic text*', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><Italic size={14} /></button>
                            <div className="w-px h-5 bg-white/10 mx-1 self-center" />
                            <button type="button" onClick={() => insertMarkdown('\n- Item 1\n- Item 2\n', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><List size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('\n1. First point\n2. Second point\n', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><ListOrdered size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('\n> Important quote\n', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><Quote size={14} /></button>
                            <div className="w-px h-5 bg-white/10 mx-1 self-center" />
                            <button type="button" onClick={() => insertMarkdown('\n```\ncode block\n```\n', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><Code size={14} /></button>
                            <button type="button" onClick={() => insertMarkdown('[link text](https://...)', 'en')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><LinkIcon size={14} /></button>
                          </div>
                          <textarea
                            id="content-en"
                            value={contentEn}
                            onChange={e => setContentEn(e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'en')}
                            rows={18}
                            placeholder={articleType === 'audio'
                              ? '— TRANSCRIPT (optional) —\n\nPaste the episode transcript here if available.\n\nEx:\n[00:00] Introduction\nHello and welcome to this new episode...\n\n[05:30] Part One\n...'
                              : '— FULL ARTICLE CONTENT —\n\nStart writing your article here. Use Markdown for formatting:\n\n## Section Title\n\nYour text **in bold** or *in italic*.\n\n> Important quote or excerpt\n\n- Key point 1\n- Key point 2\n\nInsert a media with [MEDIA:0] (after adding it in the Media Gallery tab).'
                            }
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-b-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors resize-y"
                          />
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-gray-600">{contentEn.length} caractères</span>
                            <button onClick={() => handleLingua('translate-content-fr')} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors">
                              {isProcessing === 'translate-content-fr' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} Traduire → FR
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TAB MEDIA GALLERY ── */}
                  {activeTab === 'media' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-white">Galerie Médias</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Ajoutez des images/vidéos puis cliquez sur <strong className="text-blue-400">"Insérer dans le texte"</strong> pour placer le marqueur <code className="text-purple-400">[MEDIA:x]</code> à l'endroit voulu dans le contenu.
                          </p>
                        </div>
                        <button onClick={() => setShowMediaModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-blue-500 transition-colors">
                          <PlusCircle size={16} /> Ajouter un média
                        </button>
                      </div>

                      <InfoBadge text="Les médias ne s'affichent PAS automatiquement dans le texte. Allez dans l'onglet 'Texte' et cliquez sur 'Insérer' pour placer [MEDIA:0], [MEDIA:1]... à l'endroit exact où vous souhaitez les voir apparaître." />

                      {mediaItems.length === 0 ? (
                        <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                          <ImageIcon className="mx-auto mb-3 text-gray-600" size={48} />
                          <p className="text-gray-500 font-medium">Aucun média ajouté</p>
                          <p className="text-gray-600 text-sm mt-1">Cliquez sur "Ajouter un média" pour commencer</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mediaItems.map((item, index) => (
                            <div key={index} className="group relative bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden p-3 hover:border-white/20 transition-colors">
                              {item.type === 'image' && <img src={item.url} className="w-full h-36 object-cover rounded-lg bg-black/20" alt={item.alt || ''} />}
                              {item.type === 'video' && (
                                <div className="w-full h-36 bg-black/20 flex flex-col items-center justify-center rounded-lg gap-2">
                                  <Video size={40} className="text-gray-500" />
                                  <p className="text-xs text-gray-600 truncate max-w-[90%] px-2">{item.url}</p>
                                </div>
                              )}
                              {item.type === 'link' && (
                                <div className="w-full h-36 bg-blue-500/10 flex flex-col items-center justify-center rounded-lg gap-2">
                                  <ExternalLink size={40} className="text-blue-400" />
                                  <p className="text-xs text-blue-400 truncate max-w-[90%] px-2">{item.url}</p>
                                </div>
                              )}

                              <div className="mt-3 flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-mono font-bold">[MEDIA:{index}]</span>
                                  {item.caption && <p className="text-xs text-white/60 truncate mt-1.5 italic">"{item.caption}"</p>}
                                  <span className="text-[10px] text-gray-600 capitalize mt-1 block">{item.type}</span>
                                </div>
                                <button onClick={() => removeMediaItem(index)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => insertMediaIntoContent(index, 'fr')} className="flex-1 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition-colors font-medium">
                                  🇫🇷 Insérer dans FR
                                </button>
                                <button onClick={() => insertMediaIntoContent(index, 'en')} className="flex-1 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition-colors font-medium">
                                  🇬🇧 Insert in EN
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB SOURCES ── */}
                  {activeTab === 'sources' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-white">Sources & Références</h4>
                          <p className="text-sm text-gray-400 mt-1">Citez vos sources pour renforcer la crédibilité de l'article</p>
                        </div>
                        <button onClick={() => setShowSourceModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-purple-500 transition-colors">
                          <PlusCircle size={16} /> Ajouter une source
                        </button>
                      </div>

                      {sources.length === 0 ? (
                        <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                          <BookOpen className="mx-auto mb-3 text-gray-600" size={48} />
                          <p className="text-gray-500 font-medium">Aucune source ajoutée</p>
                          <p className="text-gray-600 text-sm mt-1">Ex: articles scientifiques, AFP, Reuters, sites officiels...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sources.map((source, index) => (
                            <div key={index} className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-white/20 transition-colors">
                              <div className="flex-1 min-w-0">
                                <h5 className="text-white font-semibold flex items-center gap-2 text-sm">
                                  <BookOpen size={14} className="text-purple-400 flex-shrink-0" /> {source.title}
                                </h5>
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-1 truncate">
                                  {source.url} <ExternalLink size={10} />
                                </a>
                                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-2">
                                  {source.author && <span className="flex items-center gap-1"><User size={10} />{source.author}</span>}
                                  {source.date && <span className="flex items-center gap-1"><Calendar size={10} />{source.date}</span>}
                                </div>
                              </div>
                              <button onClick={() => removeSource(index)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex-shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB LOCALISATION ── */}
                  {activeTab === 'location' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <MapPin className="text-blue-400" size={20} /> Localisation géographique
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">Définissez la portée et le lieu de l'article pour un meilleur filtrage</p>
                        </div>
                        <button
                          onClick={getCurrentLocation}
                          disabled={isGeolocating}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-green-500 disabled:opacity-50 transition-colors"
                        >
                          {isGeolocating ? <><Loader2 size={16} className="animate-spin" /> Localisation...</> : <><Navigation size={16} /> Me localiser</>}
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-3">Portée géographique de l'article</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {geographicOptions.map(opt => {
                            const Icon = opt.icon;
                            const isSelected = geographicScope === opt.value;
                            const colorClass = isSelected
                              ? opt.color === 'blue' ? 'border-blue-500 bg-blue-500/10'
                                : opt.color === 'green' ? 'border-green-500 bg-green-500/10'
                                  : opt.color === 'orange' ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-purple-500 bg-purple-500/10'
                              : 'border-white/10 hover:border-white/20';
                            const iconColor = isSelected
                              ? opt.color === 'blue' ? 'text-blue-400'
                                : opt.color === 'green' ? 'text-green-400'
                                  : opt.color === 'orange' ? 'text-orange-400'
                                    : 'text-purple-400'
                              : 'text-gray-500';
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setGeographicScope(opt.value as any)}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${colorClass}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon size={18} className={iconColor} />
                                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{opt.label}</span>
                                </div>
                                <p className="text-xs text-gray-600">{opt.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">Ville / Commune</label>
                          <input
                            type="text"
                            value={locationCity}
                            onChange={e => setLocationCity(e.target.value)}
                            placeholder="Ex: Kinshasa, Lubumbashi, Brazzaville..."
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">Pays</label>
                          <input
                            type="text"
                            value={locationCountry}
                            onChange={e => setLocationCountry(e.target.value)}
                            placeholder="Ex: République Démocratique du Congo"
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {typeof locationLatitude === 'number' && typeof locationLongitude === 'number' && (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-3">
                          <MapPin className="text-green-400 flex-shrink-0 mt-1" size={20} />
                          <div className="flex-1">
                            <p className="text-green-300 font-semibold mb-1">Coordonnées GPS enregistrées</p>
                            <p className="text-xs text-gray-400 font-mono">
                              Latitude : {locationLatitude.toFixed(6)} | Longitude : {locationLongitude.toFixed(6)}
                            </p>
                            <button onClick={() => { setLocationLatitude(undefined); setLocationLongitude(undefined); }} className="text-xs text-red-400 hover:text-red-300 mt-2 underline">
                              Supprimer les coordonnées GPS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── BOUTONS DE SAUVEGARDE ── */}
                <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/10">
                  <div className="text-xs text-gray-600">
                    {articleType === 'audio' && !audioContentUrl && (
                      <span className="text-orange-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> Un fichier audio est requis pour un article audio
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={resetForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10 transition-colors">
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !titleFr.trim() || (articleType === 'audio' && !audioContentUrl.trim())}
                      className={`px-8 py-3 text-white rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 transition-all font-bold ${articleType === 'audio'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'
                          : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                        }`}
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      {editingId ? 'Mettre à jour' : articleType === 'audio' ? '🎙️ Publier l\'audio' : '📝 Enregistrer l\'article'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LISTE DES ARTICLES ── */}
          {!showForm && (
            <div className="space-y-4">
              {/* Filtre par type */}
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-max">
                <Filter size={14} className="text-gray-400 ml-2" />
                <button onClick={() => setArticleTypeFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${articleTypeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  Tous ({articles.length})
                </button>
                <button onClick={() => setArticleTypeFilter('written')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${articleTypeFilter === 'written' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  📝 Écrits ({stats.totalWritten})
                </button>
                <button onClick={() => setArticleTypeFilter('audio')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${articleTypeFilter === 'audio' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  🎙️ Audio ({stats.totalAudio})
                </button>
              </div>

              {filteredArticles.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                  <Newspaper className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-500 font-medium">Aucun article{articleTypeFilter !== 'all' ? ` de type "${articleTypeFilter}"` : ''}</p>
                  <button onClick={() => setShowForm(true)} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors">
                    Créer le premier article
                  </button>
                </div>
              ) : (
                filteredArticles.map(a => (
                  <div key={a.id} className={`group bg-white/[0.02] border rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4 ${a.article_type === 'audio' ? 'border-purple-500/10 hover:border-purple-500/20' : 'border-white/10'
                    }`}>
                    {a.cover_url && (
                      <img src={a.cover_url} className="w-full md:w-36 h-24 object-cover rounded-xl flex-shrink-0" alt={a.title_fr} />
                    )}
                    {!a.cover_url && (
                      <div className={`w-full md:w-36 h-24 rounded-xl flex items-center justify-center flex-shrink-0 ${a.article_type === 'audio' ? 'bg-purple-500/10' : 'bg-white/5'
                        }`}>
                        {a.article_type === 'audio' ? <Radio size={28} className="text-purple-400" /> : <AlignLeft size={28} className="text-gray-600" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {/* Badge type article */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${a.article_type === 'audio'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/10 text-blue-400'
                          }`}>
                          {a.article_type === 'audio' ? <><Radio size={9} /> AUDIO</> : <><AlignLeft size={9} /> ÉCRIT</>}
                        </span>
                        {a.categories?.name_fr && <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] rounded-full">{a.categories.name_fr}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${a.status === 'published' ? 'bg-green-500/20 text-green-400'
                            : a.status === 'draft' ? 'bg-gray-500/20 text-gray-400'
                              : a.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-white/5 text-gray-500'
                          }`}>{a.status}</span>
                        {/* Badge lecture vocale (article écrit avec audio) */}
                        {a.article_type !== 'audio' && a.reading_audio_url && (
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 text-[10px] rounded-full flex items-center gap-1">
                            <Headphones size={9} /> Lecture vocale
                          </span>
                        )}
                        {a.audio_duration && (
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded-full flex items-center gap-1">
                            <Clock size={9} /> {a.audio_duration}
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-bold truncate">{a.title_fr}</h3>
                      {a.summary_fr && <p className="text-sm text-gray-500 line-clamp-1 mt-1">{a.summary_fr}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                        <span className="flex items-center gap-1"><User size={10} />{a.author_name}</span>
                        {a.created_at && <span className="flex items-center gap-1"><Calendar size={10} />{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>}
                        {a.location_city && <span className="flex items-center gap-1"><MapPin size={10} />{a.location_city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleEdit(a)} className="p-2 bg-white/5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Modifier">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VUE ARCHIVES EXTERNES
      ══════════════════════════════════════════════════════════════════ */}
      {view === 'archives' && (
        <>
          {showArchiveForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive size={20} className="text-orange-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">{archiveEditingId ? 'Modifier l\'archive' : 'Référencer un contenu externe'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Articles, podcasts ou vidéos publiés sur d'autres médias (presse externe, radios, télés...)</p>
                  </div>
                </div>
                <button onClick={resetArchiveForm} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="p-6 space-y-6">

                {/* Format */}
                <div>
                  <label className="text-sm font-semibold text-gray-400 mb-3 block">Format du contenu archivé</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setArchiveFormat('image')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'image' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                      <ImageIcon size={24} /><span className="text-sm font-medium">Article / Image</span>
                      <span className="text-[10px] text-gray-600">Presse écrite en ligne</span>
                    </button>
                    <button onClick={() => setArchiveFormat('audio')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'audio' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                      <Mic size={24} /><span className="text-sm font-medium">Audio / Podcast</span>
                      <span className="text-[10px] text-gray-600">Radio, podcast externe</span>
                    </button>
                    <button onClick={() => setArchiveFormat('video')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${archiveFormat === 'video' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                      <Video size={24} /><span className="text-sm font-medium">Vidéo</span>
                      <span className="text-[10px] text-gray-600">TV, YouTube, etc.</span>
                    </button>
                  </div>
                </div>

                {/* Média + Date */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Fichier ou URL du contenu principal *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={archiveMediaUrl}
                        onChange={e => setArchiveMediaUrl(e.target.value)}
                        placeholder="https://... (URL directe du fichier ou embed)"
                        className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={() => {
                          setIsUploading('archive-media');
                          loadCloudinaryScript(() => {
                            const isAV = archiveFormat === 'video' || archiveFormat === 'audio';
                            // @ts-ignore
                            const w = window.cloudinary.createUploadWidget({
                              cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                              uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                              sources: ['local', 'url'],
                              resourceType: isAV ? 'video' : 'image',
                              multiple: false,
                            }, (error: any, result: any) => {
                              setIsUploading(null);
                              if (result?.event === 'success') { setArchiveMediaUrl(result.info.secure_url); showMsg('success', '✅ Média uploadé'); }
                              if (error) showMsg('error', 'Erreur Cloudinary');
                            });
                            w.open();
                          });
                        }}
                        disabled={isUploading === 'archive-media'}
                        className="px-4 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/20 rounded-xl flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                      >
                        {isUploading === 'archive-media' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Upload
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Date de publication originale</label>
                    <input
                      type="date"
                      value={archiveDate}
                      onChange={e => setArchiveDate(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Source */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Nom du média source *</label>
                    <input
                      type="text"
                      value={archiveSourceName}
                      onChange={e => setArchiveSourceName(e.target.value)}
                      placeholder="Ex: Jeune Afrique, RFI, TV5 Monde, Le Monde Afrique..."
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">URL de l'article/contenu d'origine</label>
                    <input
                      type="text"
                      value={archiveSourceUrl}
                      onChange={e => setArchiveSourceUrl(e.target.value)}
                      placeholder="https://www.jeuneafrique.com/..."
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Titres */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Titre (FR) *</label>
                    <input
                      type="text"
                      value={archiveTitleFr}
                      onChange={e => setArchiveTitleFr(e.target.value)}
                      placeholder="Ex: La RDC face aux défis de l'industrialisation"
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Titre (EN)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={archiveTitleEn}
                        onChange={e => setArchiveTitleEn(e.target.value)}
                        placeholder="Ex: DRC facing industrialization challenges"
                        className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={() => handleLingua('translate-en', true)}
                        disabled={!archiveTitleFr}
                        className="px-3 bg-white/5 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                        title="Traduire FR → EN"
                      >
                        {isProcessing === 'translate-en' ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Résumé / Transcript / Notes (FR) — Optionnel, illimité</label>
                    <textarea
                      value={archiveContentFr}
                      onChange={e => setArchiveContentFr(e.target.value)}
                      rows={10}
                      placeholder="Collez ici le texte de l'article, la transcription audio/vidéo, ou vos propres notes de synthèse sur ce contenu..."
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors resize-y"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 flex items-center justify-between">
                      <span>Résumé / Transcript / Notes (EN) — Optionnel, illimité</span>
                      <button
                        onClick={() => handleLingua('translate-content-en', true)}
                        disabled={!archiveContentFr}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px] disabled:opacity-30 transition-colors"
                      >
                        {isProcessing === 'translate-content-en' ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />}
                        Traduire FR → EN
                      </button>
                    </label>
                    <textarea
                      value={archiveContentEn}
                      onChange={e => setArchiveContentEn(e.target.value)}
                      rows={10}
                      placeholder="Paste the article text, audio/video transcript, or your own summary notes here..."
                      className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:border-orange-500 focus:outline-none transition-colors resize-y"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                  <button onClick={resetArchiveForm} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10 transition-colors">Annuler</button>
                  <button
                    onClick={handleSaveArchive}
                    disabled={isSaving || !archiveTitleFr || !archiveSourceName || !archiveMediaUrl}
                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 font-bold transition-all"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {archiveEditingId ? 'Mettre à jour' : 'Enregistrer l\'archive'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showArchiveForm && (
            <div className="space-y-4">
              {archives.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                  <Archive className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-500 font-medium">Aucune archive externe enregistrée</p>
                  <p className="text-gray-600 text-sm mt-1">Référencez des articles, podcasts ou vidéos publiés sur d'autres médias</p>
                </div>
              ) : (
                archives.map(a => (
                  <div key={a.id} className="group bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col md:flex-row gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      {a.format === 'audio' ? <Mic className="text-purple-400" size={28} />
                        : a.format === 'video' ? <Video className="text-red-400" size={28} />
                          : <ImageIcon className="text-blue-400" size={28} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-bold rounded-full uppercase border border-orange-500/20">
                          {a.source_name}
                        </span>
                        <span className="px-2 py-0.5 bg-white/5 text-gray-500 text-[10px] rounded-full uppercase">{a.format}</span>
                        {a.original_date && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10} />{new Date(a.original_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      <h3 className="text-white font-bold truncate">{a.title_fr}</h3>
                      {a.content_fr && <p className="text-sm text-gray-500 line-clamp-1 mt-1">{a.content_fr.substring(0, 120)}...</p>}
                      {a.source_url && (
                        <a href={a.source_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink size={10} /> Voir la source originale
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleEditArchive(a)} className="p-2 bg-white/5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" title="Modifier">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteArchive(a.id)} className="p-2 bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VUE SUGGESTIONS
      ══════════════════════════════════════════════════════════════════ */}
      {view === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-max">
            <Filter size={14} className="text-gray-400 ml-2" />
            <button onClick={() => setSuggestionFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${suggestionFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Toutes ({suggestions.length})
            </button>
            <button onClick={() => setSuggestionFilter('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${suggestionFilter === 'pending' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              ⏳ En attente ({suggestions.filter(s => s.status === 'pending').length})
            </button>
            <button onClick={() => setSuggestionFilter('used')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${suggestionFilter === 'used' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              ✅ Traitées ({suggestions.filter(s => s.status === 'used').length})
            </button>
          </div>

          <div className="space-y-4">
            {filteredSuggestionsList.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <Lightbulb className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-500 font-medium text-lg">Aucune suggestion</p>
                <p className="text-gray-600 text-sm mt-1">Les suggestions des lecteurs apparaîtront ici</p>
              </div>
            ) : (
              filteredSuggestionsList.map(s => (
                <div key={s.id} className={`group rounded-2xl border p-6 transition-all duration-300 ${s.status === 'used'
                    ? 'bg-white/[0.01] border-white/5 opacity-60'
                    : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20 hover:border-purple-500/30'
                  }`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={16} className={s.status === 'used' ? 'text-gray-500' : 'text-purple-400'} />
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'used' ? 'bg-gray-500/20 text-gray-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                          {s.status === 'used' ? '✅ Traitée' : '⏳ En attente de traitement'}
                        </span>
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">{s.suggested_topic}</h3>
                      {s.sources && (
                        <div className="mt-2 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-600 font-semibold uppercase mb-1">Sources suggérées par l'utilisateur :</p>
                          <p className="text-gray-400 text-sm">{s.sources}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><User size={12} />{s.user_email}</span>
                      {s.created_at && (
                        <span className="flex items-center gap-1"><Clock size={12} />{new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === 'pending' && (
                        <button
                          onClick={() => markSuggestionUsed(s.id)}
                          className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} /> Marquer comme traitée
                        </button>
                      )}
                      <button
                        onClick={() => setSuggestionToDelete(s)}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                        title="Supprimer"
                      >
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

      {/* ══════════════════════════════════════════════════════════════════
          VUE RÉSEAUX SOCIAUX
      ══════════════════════════════════════════════════════════════════ */}
      {view === 'settings' && (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xl">
          <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
            <div className="p-3 bg-white/5 rounded-xl"><Settings size={24} className="text-gray-400" /></div>
            <div>
              <h2 className="text-2xl font-bold text-white">Configuration des Réseaux Sociaux</h2>
              <p className="text-gray-500 text-sm mt-0.5">Gérez les liens et boutons de partage affichés sur le site</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* WhatsApp */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/20 rounded-xl"><MessageCircle className="text-green-400" size={24} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">WhatsApp</h3>
                    <p className="text-xs text-gray-500">Bouton de contact direct visible sur le site</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={socialSettings.wa_active} onChange={e => setSocialSettings({ ...socialSettings, wa_active: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 transition-colors"></div>
                </label>
              </div>
              <div className={`space-y-4 transition-opacity ${!socialSettings.wa_active ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block">Numéro WhatsApp (avec indicatif international, sans + ni espaces)</label>
                  <input
                    type="text"
                    value={socialSettings.whatsapp_number || ''}
                    onChange={e => setSocialSettings({ ...socialSettings, whatsapp_number: e.target.value })}
                    placeholder="Ex: 243812345678 (pour +243 81 234 5678)"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block">Message pré-rempli par défaut</label>
                  <input
                    type="text"
                    value={socialSettings.whatsapp_message || ''}
                    onChange={e => setSocialSettings({ ...socialSettings, whatsapp_message: e.target.value })}
                    placeholder="Ex: Bonjour, je vous contacte depuis le site Lukeni..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Instagram */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-500/20 rounded-xl"><InstagramIcon className="text-pink-400" size={24} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Instagram</h3>
                    <p className="text-xs text-gray-500">Icône de lien vers votre profil Instagram</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={socialSettings.ig_active} onChange={e => setSocialSettings({ ...socialSettings, ig_active: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 transition-colors"></div>
                </label>
              </div>
              <div className={`transition-opacity ${!socialSettings.ig_active ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">URL complète du profil Instagram</label>
                <input
                  type="text"
                  value={socialSettings.instagram_url || ''}
                  onChange={e => setSocialSettings({ ...socialSettings, instagram_url: e.target.value })}
                  placeholder="https://www.instagram.com/lukeni_official"
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-pink-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Facebook */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 rounded-xl"><FacebookIcon className="text-blue-400" size={24} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Facebook</h3>
                    <p className="text-xs text-gray-500">Icône de lien vers votre page Facebook</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={socialSettings.fb_active} onChange={e => setSocialSettings({ ...socialSettings, fb_active: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 transition-colors"></div>
                </label>
              </div>
              <div className={`transition-opacity ${!socialSettings.fb_active ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">URL complète de la page Facebook</label>
                <input
                  type="text"
                  value={socialSettings.facebook_url || ''}
                  onChange={e => setSocialSettings({ ...socialSettings, facebook_url: e.target.value })}
                  placeholder="https://www.facebook.com/LukeniOfficiel"
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Enregistrer la configuration
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* Modal Ajout Média */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Ajouter un média à la galerie</h3>
              <button onClick={() => setShowMediaModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Type de média</label>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setMediaType('image')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mediaType === 'image' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}>
                    <ImageIcon className={mediaType === 'image' ? 'text-blue-400' : 'text-gray-500'} size={20} />
                    <span className="text-xs font-medium">Image</span>
                  </button>
                  <button onClick={() => setMediaType('video')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mediaType === 'video' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}>
                    <Video className={mediaType === 'video' ? 'text-blue-400' : 'text-gray-500'} size={20} />
                    <span className="text-xs font-medium">Vidéo</span>
                  </button>
                  <button onClick={() => setMediaType('link')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mediaType === 'link' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}>
                    <LinkIcon className={mediaType === 'link' ? 'text-blue-400' : 'text-gray-500'} size={20} />
                    <span className="text-xs font-medium">Lien</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">URL du média *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder={mediaType === 'link' ? 'https://exemple.com/article' : 'https://res.cloudinary.com/...'}
                    className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  {mediaType !== 'link' && (
                    <button onClick={openMediaCloudinary} className="px-4 bg-white/5 text-gray-400 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-colors text-sm">
                      <Upload size={16} /> Upload
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Légende (optionnel)</label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={e => setMediaCaption(e.target.value)}
                  placeholder="Ex: Vue aérienne de Kinshasa depuis le fleuve Congo"
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {mediaType === 'image' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Texte alternatif (accessibilité)</label>
                  <input
                    type="text"
                    value={mediaAlt}
                    onChange={e => setMediaAlt(e.target.value)}
                    placeholder="Ex: Photo de la ville de Kinshasa prise depuis le fleuve"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {mediaUrl && mediaType === 'image' && (
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img src={mediaUrl} className="w-full h-32 object-cover" alt="Aperçu" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setShowMediaModal(false)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10 transition-colors">Annuler</button>
                <button onClick={addMediaItem} disabled={!mediaUrl.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-blue-500 disabled:opacity-50 transition-colors font-semibold">
                  <CheckCircle size={16} /> Ajouter à la galerie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Source */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 max-w-lg w-full">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Ajouter une source</h3>
              <button onClick={() => setShowSourceModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Nom de la source *</label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={e => setSourceTitle(e.target.value)}
                  placeholder="Ex: Rapport ONU 2024, AFP, Reuters, Ministère des Mines..."
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">URL de la source *</label>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://www...."
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Auteur (optionnel)</label>
                  <input
                    type="text"
                    value={sourceAuthor}
                    onChange={e => setSourceAuthor(e.target.value)}
                    placeholder="Ex: Jean-Marc Kalala"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Date de publication</label>
                  <input
                    type="date"
                    value={sourceDate}
                    onChange={e => setSourceDate(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setShowSourceModal(false)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/10 transition-colors">Annuler</button>
                <button onClick={addSource} disabled={!sourceTitle.trim() || !sourceUrl.trim()} className="px-6 py-3 bg-purple-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-purple-500 disabled:opacity-50 transition-colors font-semibold">
                  <CheckCircle size={16} /> Ajouter la source
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Article */}
      {showPreview && (
        <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto bg-[#050505] border border-white/10 rounded-3xl overflow-hidden my-8 relative">
            <button onClick={() => setShowPreview(false)} className="absolute top-6 right-6 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-[#D4AF37] hover:text-black transition-all z-10">
              <X size={24} />
            </button>

            {/* Type badge */}
            <div className="absolute top-6 left-6 z-10">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${articleType === 'audio' ? 'bg-purple-600/80 text-white' : 'bg-blue-600/80 text-white'
                }`}>
                {articleType === 'audio' ? '🎙️ Article Audio' : '📝 Article Écrit'}
              </span>
            </div>

            {/* Couverture */}
            <div className="h-64 md:h-96 relative">
              {coverUrl
                ? <img src={coverUrl} className="w-full h-full object-cover" alt="Couverture" />
                : <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                  {articleType === 'audio' ? <Radio size={64} className="text-purple-500/30" /> : <Newspaper size={64} className="text-white/10" />}
                </div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            </div>

            {/* Contenu */}
            <div className="px-8 md:px-16 pb-16 -mt-20 relative z-10">
              <h1 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight italic">{titleFr || 'Titre de l\'article'}</h1>

              {/* Audio principal (article audio) */}
              {articleType === 'audio' && audioContentUrl && (
                <div className="mb-8 p-5 bg-gradient-to-r from-purple-600/10 to-purple-500/5 border border-purple-500/30 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Radio size={20} className="text-purple-400" />
                    <div>
                      <p className="text-white font-bold text-sm">🎙️ Écouter l'épisode</p>
                      {audioDuration && <p className="text-purple-400 text-xs">{audioDuration}</p>}
                      {audioHost && <p className="text-gray-500 text-xs">Présenté par : {audioHost}</p>}
                    </div>
                  </div>
                  <audio controls src={audioContentUrl} className="w-full rounded-xl" />
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <p className="text-xl text-white/60 font-light leading-relaxed mb-8 italic border-l-4 border-[#D4AF37] pl-6">
                  {summaryFr || (articleType === 'audio' ? 'Description de l\'épisode...' : 'Résumé de l\'article...')}
                </p>
                <div
                  className="text-white/70 text-base leading-relaxed font-light"
                  dangerouslySetInnerHTML={{ __html: renderContentWithMedia(contentFr || (articleType === 'audio' ? 'Transcript ou notes de l\'épisode...' : 'Contenu de l\'article...'), mediaItems) }}
                />
              </div>

              {/* Player lecture vocale (article écrit) - affiché en bas comme aide à la lecture */}
              {articleType === 'written' && readingAudioUrl && (
                <div className="mt-12 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Headphones size={18} className="text-blue-400" />
                    <div>
                      <p className="text-white font-semibold text-sm">🎧 Écouter la lecture de cet article</p>
                      <p className="text-blue-400/60 text-xs">Aide à la lecture — Pour les personnes ayant des difficultés de lecture</p>
                    </div>
                  </div>
                  <audio controls src={readingAudioUrl} className="w-full h-10 rounded-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression Suggestion */}
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