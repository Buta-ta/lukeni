"use client";

import React, { useState, useEffect } from 'react';
import { 
  Loader2, Newspaper, PlusCircle, Edit2, Trash2, X, Languages, 
  SpellCheck, CheckCircle, Lightbulb, Upload, Image as ImageIcon,
  Eye, Calendar, User, Tag, FileText, Sparkles, Clock, TrendingUp,
  Link as LinkIcon, Video, ExternalLink, BookOpen, Type, Code,
  List, ListOrdered, Quote, Bold, Italic, Heading, Save, Mic, Play,
  MapPin, Globe, Map, Navigation
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';

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

export default function PressTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [view, setView] = useState<'articles' | 'suggestions'>('articles');
  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [suggestions, setSuggestions] = useState<PressSuggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'sources' | 'location'>('content');
  const [showPreview, setShowPreview] = useState(false);

  // Media modal states
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');

  // Source modal states
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceDate, setSourceDate] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name_fr, name_en')
      .eq('is_active', true)
      .eq('show_presse', true);
    if (catData) setCategories(catData);

    const { data: artData } = await supabase
      .from('press_articles')
      .select('*, categories(id, name_fr, name_en)')
      .order('created_at', { ascending: false });
    if (artData) setArticles(artData as unknown as PressArticle[]);

    const { data: sugData } = await supabase
      .from('press_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (sugData) setSuggestions(sugData);
    
    setIsLoading(false);
  }

  const resetForm = () => { 
    setEditingId(null); 
    setTitleFr(''); 
    setTitleEn(''); 
    setContentFr(''); 
    setContentEn(''); 
    setSummaryFr(''); 
    setSummaryEn(''); 
    setCoverUrl(''); 
    setAudioUrl('');
    setAuthorName('Rédaction Lukeni'); 
    setCategoryId(''); 
    setStatus('draft');
    setMediaItems([]);
    setSources([]);
    setScheduledPublishAt('');
    setGeographicScope('');
    setLocationCity('');
    setLocationCountry('');
    setLocationLatitude(undefined);
    setLocationLongitude(undefined);
    setShowForm(false);
    setActiveTab('content');
  };

  const handleEdit = (a: PressArticle) => { 
    setEditingId(a.id); 
    setTitleFr(a.title_fr); 
    setTitleEn(a.title_en); 
    setContentFr(a.content_fr || ''); 
    setContentEn(a.content_en || ''); 
    setSummaryFr(a.summary_fr || ''); 
    setSummaryEn(a.summary_en || ''); 
    setCoverUrl(a.cover_url || ''); 
    setAudioUrl(a.audio_url || '');
    setAuthorName(a.author_name); 
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

  const handleLingua = async (action: string) => {
    setIsProcessing(action);
    try {
      if (action === 'translate-en') setTitleEn(await autoTranslate(titleFr, 'fr'));
      if (action === 'translate-fr') setTitleFr(await autoTranslate(titleEn, 'en'));
      if (action === 'correct-fr') setTitleFr(await autoCorrect(titleFr, 'fr'));
      if (action === 'correct-en') setTitleEn(await autoCorrect(titleEn, 'en'));
      if (action === 'translate-content-en') setContentEn(await autoTranslate(contentFr, 'fr'));
      if (action === 'translate-content-fr') setContentFr(await autoTranslate(contentEn, 'en'));
      if (action === 'translate-summary-en') setSummaryEn(await autoTranslate(summaryFr, 'fr'));
      if (action === 'translate-summary-fr') setSummaryFr(await autoTranslate(summaryEn, 'en'));
      showMsg('success', '✨ Traitement terminé avec succès');
    } catch (e) { 
      showMsg('error', 'Erreur API Lingua'); 
    }
    setIsProcessing(null);
  };

  const getCurrentLocation = () => {
    setIsGeolocating(true);
    
    if (!navigator.geolocation) {
      showMsg('error', 'La géolocalisation n\'est pas supportée par votre navigateur');
      setIsGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLatitude(latitude);
        setLocationLongitude(longitude);

        // Reverse geocoding avec l'API Nominatim d'OpenStreetMap
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`
          );
          const data = await response.json();
          
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state || '';
            const country = data.address.country || '';
            
            setLocationCity(city);
            setLocationCountry(country);
            
            // Déterminer automatiquement la portée géographique
            if (country === 'République démocratique du Congo' || country === 'Democratic Republic of the Congo') {
              setGeographicScope('national');
            } else if (city) {
              setGeographicScope('local');
            }
            
            showMsg('success', `📍 Localisé à ${city}, ${country}`);
          }
        } catch (error) {
          showMsg('error', 'Erreur lors de la récupération de l\'adresse');
        }
        
        setIsGeolocating(false);
      },
      (error) => {
        showMsg('error', 'Impossible d\'obtenir votre position');
        setIsGeolocating(false);
      }
    );
  };

  const openCloudinary = () => {
    setIsUploading(true);
    // @ts-ignore
    if (!window.cloudinary) { 
      const s = document.createElement('script'); 
      s.src = 'https://upload-widget.cloudinary.com/global/all.js'; 
      s.onload = () => createWidget(); 
      document.body.appendChild(s); 
    } else { 
      createWidget(); 
    }
  };

  const createWidget = () => {
    // @ts-ignore
    const w = window.cloudinary.createUploadWidget({ 
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, 
      sources: ['local', 'url'], 
      resourceType: 'image', 
      multiple: false 
    }, (error: any, result: any) => {
      setIsUploading(false);
      if (result.event === 'success') {
        setCoverUrl(result.info.secure_url);
        showMsg('success', '🖼️ Image uploadée avec succès');
      }
      if (error) showMsg('error', 'Erreur Cloudinary');
    });
    w.open();
  };

  const openAudioCloudinary = () => {
    setIsUploading(true);
    // @ts-ignore
    if (!window.cloudinary) { 
      const s = document.createElement('script'); 
      s.src = 'https://upload-widget.cloudinary.com/global/all.js'; 
      s.onload = () => createAudioWidget(); 
      document.body.appendChild(s); 
    } else { 
      createAudioWidget(); 
    }
  };

  const createAudioWidget = () => {
    // @ts-ignore
    const w = window.cloudinary.createUploadWidget({ 
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, 
      sources: ['local', 'url'], 
      resourceType: 'video',
      multiple: false 
    }, (error: any, result: any) => {
      setIsUploading(false);
      if (result.event === 'success') {
        setAudioUrl(result.info.secure_url);
        showMsg('success', '🎙️ Audio uploadé avec succès');
      }
      if (error) showMsg('error', 'Erreur Cloudinary');
    });
    w.open();
  };

  const openMediaCloudinary = () => {
    // @ts-ignore
    if (!window.cloudinary) { 
      const s = document.createElement('script'); 
      s.src = 'https://upload-widget.cloudinary.com/global/all.js'; 
      s.onload = () => createMediaWidget(); 
      document.body.appendChild(s); 
    } else { 
      createMediaWidget(); 
    }
  };

  const createMediaWidget = () => {
    // @ts-ignore
    const w = window.cloudinary.createUploadWidget({ 
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, 
      sources: ['local', 'url'], 
      resourceType: mediaType === 'video' ? 'video' : 'image',
      multiple: false 
    }, (error: any, result: any) => {
      if (result.event === 'success') {
        setMediaUrl(result.info.secure_url);
      }
      if (error) showMsg('error', 'Erreur Cloudinary');
    });
    w.open();
  };

  const addMediaItem = () => {
    if (!mediaUrl.trim()) return showMsg('error', 'URL requise');
    const newItem: MediaItem = {
      type: mediaType,
      url: mediaUrl,
      caption: mediaCaption || undefined,
      alt: mediaAlt || undefined
    };
    setMediaItems([...mediaItems, newItem]);
    setMediaUrl('');
    setMediaCaption('');
    setMediaAlt('');
    setShowMediaModal(false);
    showMsg('success', '✅ Média ajouté');
  };

  const removeMediaItem = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
    showMsg('success', '🗑️ Média supprimé');
  };

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
      
      // Repositionner le curseur après le marker
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + marker.length, start + marker.length);
      }, 0);
      
      showMsg('success', `📌 Média ${index + 1} inséré dans le texte ${lang.toUpperCase()}`);
    } else {
      setter(content + marker);
      showMsg('success', `📌 Média ${index + 1} ajouté à la fin`);
    }
  };

  const addSource = () => {
    if (!sourceTitle.trim() || !sourceUrl.trim()) return showMsg('error', 'Titre et URL requis');
    const newSource: Source = {
      title: sourceTitle,
      url: sourceUrl,
      author: sourceAuthor || undefined,
      date: sourceDate || undefined
    };
    setSources([...sources, newSource]);
    setSourceTitle('');
    setSourceUrl('');
    setSourceAuthor('');
    setSourceDate('');
    setShowSourceModal(false);
    showMsg('success', '✅ Source ajoutée');
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
    showMsg('success', '🗑️ Source supprimée');
  };

  const insertMarkdown = (syntax: string, cursorField: 'fr' | 'en') => {
    const textareaId = cursorField === 'fr' ? 'content-fr' : 'content-en';
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    
    if (!textarea) {
      const field = cursorField === 'fr' ? contentFr : contentEn;
      const setter = cursorField === 'fr' ? setContentFr : setContentEn;
      setter(field + syntax);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const field = cursorField === 'fr' ? contentFr : contentEn;
    const setter = cursorField === 'fr' ? setContentFr : setContentEn;
    const selectedText = field.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    // Gras
    if (syntax.includes('**texte gras**') || syntax.includes('**bold text**')) {
      if (selectedText) {
        newText = field.substring(0, start) + '**' + selectedText + '**' + field.substring(end);
        cursorOffset = end + 4;
      } else {
        const placeholder = syntax.includes('gras') ? 'texte gras' : 'bold text';
        newText = field.substring(0, start) + '**' + placeholder + '**' + field.substring(end);
        cursorOffset = start + 2 + placeholder.length + 2;
      }
    } 
    // Italique
    else if (syntax.includes('*texte italique*') || syntax.includes('*italic text*')) {
      if (selectedText) {
        newText = field.substring(0, start) + '*' + selectedText + '*' + field.substring(end);
        cursorOffset = end + 2;
      } else {
        const placeholder = syntax.includes('italique') ? 'texte italique' : 'italic text';
        newText = field.substring(0, start) + '*' + placeholder + '*' + field.substring(end);
        cursorOffset = start + 1 + placeholder.length + 1;
      }
    } 
    // Lien
    else if (syntax.includes('[texte') || syntax.includes('[link')) {
      const linkText = syntax.includes('texte') ? 'texte du lien' : 'link text';
      if (selectedText) {
        newText = field.substring(0, start) + '[' + selectedText + '](url)' + field.substring(end);
        cursorOffset = start + selectedText.length + 3;
      } else {
        newText = field.substring(0, start) + '[' + linkText + '](url)' + field.substring(end);
        cursorOffset = start + 1 + linkText.length + 2;
      }
    } 
    // Autres (titres, listes, etc.)
    else {
      newText = field.substring(0, start) + syntax + field.substring(end);
      cursorOffset = start + syntax.length;
    }

    setter(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorOffset, cursorOffset);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: 'fr' | 'en') => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertMarkdown(field === 'fr' ? '**texte gras**' : '**bold text**', field);
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown(field === 'fr' ? '*texte italique*' : '*italic text*', field);
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown(field === 'fr' ? '[texte du lien](url)' : '[link text](url)', field);
          break;
      }
    }
  };

  const handleSave = async () => {
    if (!titleFr.trim()) return showMsg('error', 'Le titre français est requis');
    setIsSaving(true);
    
    // Déterminer le statut automatique si programmé
    let finalStatus = status;
    if (scheduledPublishAt && new Date(scheduledPublishAt) > new Date()) {
      finalStatus = 'scheduled';
    }
    
    const payload = { 
      title_fr: titleFr, 
      title_en: titleEn || null, 
      content_fr: contentFr || null, 
      content_en: contentEn || null, 
      summary_fr: summaryFr || null, 
      summary_en: summaryEn || null, 
      cover_url: coverUrl || null, 
      audio_url: audioUrl || null,
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
        showMsg('success', '🎉 Article créé avec succès');
      }
      resetForm(); 
      fetchData();
    } catch (err: any) { 
      showMsg('error', err.message); 
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    const { error } = await supabase.from('press_articles').delete().eq('id', id);
    if (!error) { 
      setArticles(articles.filter(a => a.id !== id)); 
      showMsg('success', '🗑️ Article supprimé'); 
    } else {
      showMsg('error', error.message);
    }
  };

  const markSuggestionUsed = async (id: string) => {
    const { error } = await supabase.from('press_suggestions').update({ status: 'used' }).eq('id', id);
    if (!error) { 
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: 'used' } : s)); 
      showMsg('success', '✅ Suggestion marquée comme utilisée'); 
    }
  };

  const renderContentWithMedia = (content: string, mediaItems: MediaItem[]) => {
    let processedContent = parseMarkdown(content);
    
    mediaItems.forEach((media, index) => {
      const marker = `[MEDIA:${index}]`;
      let mediaHTML = '';
      
      if (media.type === 'image') {
        mediaHTML = `
          <div class="my-6">
            <img src="${media.url}" alt="${media.alt || 'Image'}" class="w-full rounded-xl shadow-lg" />
            ${media.caption ? `<p class="text-center text-sm text-white/50 mt-3 italic">${media.caption}</p>` : ''}
          </div>
        `;
      } else if (media.type === 'video') {
        mediaHTML = `
          <div class="my-6">
            <video controls class="w-full rounded-xl shadow-lg">
              <source src="${media.url}" />
            </video>
            ${media.caption ? `<p class="text-center text-sm text-white/50 mt-3 italic">${media.caption}</p>` : ''}
          </div>
        `;
      } else if (media.type === 'link') {
        mediaHTML = `
          <div class="my-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <a href="${media.url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 flex items-center gap-2">
              🔗 ${media.caption || media.url}
            </a>
          </div>
        `;
      }
      
      processedContent = processedContent.replace(marker, mediaHTML);
    });
    
    return processedContent;
  };

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
    pendingSuggestions: suggestions.filter(s => s.status === 'pending').length
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
        <p className="text-gray-400 text-sm animate-pulse">Chargement des articles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header avec Stats */}
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
                Espace Presse
              </h2>
              <p className="text-gray-400 text-sm mt-1">Gérez vos articles et suggestions</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
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
                <Edit2 size={14} className="text-yellow-400" />
                <span className="text-xs text-gray-400">Brouillons</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.draft}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-orange-400" />
                <span className="text-xs text-gray-400">Programmés</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{stats.scheduled}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={14} className="text-purple-400" />
                <span className="text-xs text-gray-400">Suggestions</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.pendingSuggestions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setView('articles')} 
          className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
            view === 'articles' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Newspaper size={16} />
            <span>Articles</span>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{articles.length}</span>
          </div>
          {view === 'articles' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
          )}
        </button>

        <button 
          onClick={() => setView('suggestions')} 
          className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
            view === 'suggestions' 
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={16} />
            <span>Suggestions</span>
            {stats.pendingSuggestions > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs animate-pulse">
                {stats.pendingSuggestions}
              </span>
            )}
          </div>
          {view === 'suggestions' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
          )}
        </button>

        {view === 'articles' && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="ml-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300 flex items-center gap-2"
          >
            <PlusCircle size={16} />
            <span>Nouvel Article</span>
          </button>
        )}
      </div>

      {/* Content */}
      {view === 'articles' ? (
        <>
          {/* Form */}
          {showForm && (
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {editingId ? (
                      <Edit2 size={20} className="text-blue-400" />
                    ) : (
                      <Sparkles size={20} className="text-blue-400" />
                    )}
                    <h3 className="text-xl font-bold text-white">
                      {editingId ? 'Modifier l\'article' : 'Créer un nouvel article'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowPreview(true)} 
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <Eye size={16} /> Aperçu
                    </button>
                    <button 
                      onClick={resetForm} 
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub Tabs */}
              <div className="px-6 pt-4 border-b border-white/10">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'content'
                        ? 'bg-white/10 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Type size={14} />
                      Contenu
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('media')}
                    className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'media'
                        ? 'bg-white/10 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} />
                      Médias
                      {mediaItems.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          {mediaItems.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('sources')}
                    className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'sources'
                        ? 'bg-white/10 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} />
                      Sources
                      {sources.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          {sources.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('location')}
                    className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'location'
                        ? 'bg-white/10 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      Localisation
                      {(locationCity || geographicScope) && (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {activeTab === 'content' && (
                  <>
                    {/* Metadata Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                          <Tag size={14} />
                          Statut
                        </label>
                        <select 
                          value={status} 
                          onChange={e => setStatus(e.target.value)} 
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="draft">📝 Brouillon</option>
                          <option value="published">✅ Publié</option>
                          <option value="scheduled">🕐 Programmé</option>
                          <option value="archived">📦 Archivé</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                          <Tag size={14} />
                          Catégorie
                        </label>
                        <select 
                          value={categoryId} 
                          onChange={e => setCategoryId(e.target.value)} 
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="">Sans catégorie</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name_fr}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                          <User size={14} />
                          Auteur
                        </label>
                        <input 
                          type="text" 
                          value={authorName} 
                          onChange={e => setAuthorName(e.target.value)} 
                          placeholder="Rédaction Lukeni"
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                        />
                      </div>
                    </div>

                    {/* Scheduled Publish */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                        <Clock size={14} />
                        Programmer la publication (optionnel)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledPublishAt}
                        onChange={e => setScheduledPublishAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                      {scheduledPublishAt && (
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-orange-400 flex items-center gap-1">
                            <Clock size={10} />
                            Publication prévue: {new Date(scheduledPublishAt).toLocaleString('fr-FR')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setScheduledPublishAt('')}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Cover Image */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                        <ImageIcon size={14} />
                        Image de couverture
                      </label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <button 
                          onClick={openCloudinary} 
                          disabled={isUploading}
                          className="group relative h-32 bg-[#1a1a1a] border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500 transition-all overflow-hidden disabled:opacity-50"
                        >
                          {coverUrl ? (
                            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                              {isUploading ? (
                                <>
                                  <Loader2 size={24} className="animate-spin text-blue-400" />
                                  <span className="text-xs text-gray-400">Upload en cours...</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={24} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                                  <span className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
                                    Cliquer pour uploader
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </button>
                        {coverUrl && (
                          <div className="flex items-center justify-center">
                            <button 
                              onClick={() => setCoverUrl('')}
                              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors text-sm font-medium"
                            >
                              Supprimer l'image
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AUDIO UPLOAD */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                        <Mic size={14} className="text-purple-400" />
                        Audio de l'article (optionnel)
                      </label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <button 
                          onClick={openAudioCloudinary} 
                          disabled={isUploading}
                          className="group relative h-32 bg-[#1a1a1a] border-2 border-dashed border-purple-500/20 rounded-xl hover:border-purple-500 transition-all overflow-hidden disabled:opacity-50"
                        >
                          {audioUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                              <Mic size={32} className="text-purple-400" />
                              <audio controls src={audioUrl} className="w-full h-8" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                              {isUploading ? (
                                <>
                                  <Loader2 size={24} className="animate-spin text-purple-400" />
                                  <span className="text-xs text-gray-400">Upload en cours...</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={24} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                                  <span className="text-xs text-gray-500 group-hover:text-purple-400 transition-colors">
                                    Uploader un fichier audio
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </button>
                        {audioUrl && (
                          <div className="flex items-center justify-center">
                            <button 
                              onClick={() => setAudioUrl('')}
                              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors text-sm font-medium"
                            >
                              Supprimer l'audio
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          🇫🇷 Titre (Français)
                        </label>
                        <input 
                          type="text" 
                          value={titleFr} 
                          onChange={e => setTitleFr(e.target.value)} 
                          placeholder="Ex: La musique congolaise à l'honneur au festival"
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleLingua('correct-fr')} 
                            disabled={isProcessing === 'correct-fr' || !titleFr}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                          >
                            {isProcessing === 'correct-fr' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <SpellCheck size={12} />
                            )}
                            Corriger
                          </button>
                          <button 
                            onClick={() => handleLingua('translate-fr')} 
                            disabled={isProcessing === 'translate-fr' || !titleEn}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                          >
                            {isProcessing === 'translate-fr' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Languages size={12} />
                            )}
                            EN → FR
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          🇬🇧 Titre (Anglais)
                        </label>
                        <input 
                          type="text" 
                          value={titleEn} 
                          onChange={e => setTitleEn(e.target.value)} 
                          placeholder="Ex: Congolese music in the spotlight at festival"
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleLingua('correct-en')} 
                            disabled={isProcessing === 'correct-en' || !titleEn}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                          >
                            {isProcessing === 'correct-en' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <SpellCheck size={12} />
                            )}
                            Correct
                          </button>
                          <button 
                            onClick={() => handleLingua('translate-en')} 
                            disabled={isProcessing === 'translate-en' || !titleFr}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                          >
                            {isProcessing === 'translate-en' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Languages size={12} />
                            )}
                            FR → EN
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Summaries */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          🇫🇷 Résumé (Français)
                        </label>
                        <textarea 
                          value={summaryFr} 
                          onChange={e => setSummaryFr(e.target.value)} 
                          rows={3}
                          placeholder="Un bref résumé de l'article pour donner envie de lire la suite..."
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder:text-gray-600"
                        />
                        <button 
                          onClick={() => handleLingua('translate-summary-en')} 
                          disabled={isProcessing === 'translate-summary-en' || !summaryFr}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                        >
                          {isProcessing === 'translate-summary-en' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Languages size={12} />
                          )}
                          Traduire → EN
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          🇬🇧 Résumé (Anglais)
                        </label>
                        <textarea 
                          value={summaryEn} 
                          onChange={e => setSummaryEn(e.target.value)} 
                          rows={3}
                          placeholder="A brief summary of the article to entice readers..."
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder:text-gray-600"
                        />
                        <button 
                          onClick={() => handleLingua('translate-summary-fr')} 
                          disabled={isProcessing === 'translate-summary-fr' || !summaryEn}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                        >
                          {isProcessing === 'translate-summary-fr' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Languages size={12} />
                          )}
                          Traduire → FR
                        </button>
                      </div>
                    </div>

                    {/* Content avec toolbar Markdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          🇫🇷 Contenu (Français)
                          <span className="text-[10px] text-gray-600">(Ctrl+B: Gras, Ctrl+I: Italique, Ctrl+K: Lien)</span>
                        </label>
                        
                        {/* Markdown Toolbar */}
                        <div className="flex flex-wrap gap-1 p-2 bg-[#1a1a1a] border border-white/20 rounded-t-xl">
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n## ', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Titre"
                          >
                            <Heading size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('**texte gras**', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Gras (Ctrl+B)"
                          >
                            <Bold size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('*texte italique*', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Italique (Ctrl+I)"
                          >
                            <Italic size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n- ', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Liste"
                          >
                            <List size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n1. ', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Liste numérotée"
                          >
                            <ListOrdered size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n> ', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Citation"
                          >
                            <Quote size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n```\ncode\n```\n', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Code"
                          >
                            <Code size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('[texte du lien](url)', 'fr')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Lien (Ctrl+K)"
                          >
                            <LinkIcon size={14} />
                          </button>
                        </div>

                        <textarea 
                          id="content-fr"
                          value={contentFr} 
                          onChange={e => setContentFr(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, 'fr')}
                          rows={16}
                          placeholder="Le contenu complet de l'article en français. Utilisez [MEDIA:0], [MEDIA:1] pour insérer des médias."
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-b-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-mono placeholder:text-gray-600"
                        />
                        <button 
                          onClick={() => handleLingua('translate-content-en')} 
                          disabled={isProcessing === 'translate-content-en' || !contentFr}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                        >
                          {isProcessing === 'translate-content-en' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Languages size={12} />
                          )}
                          Traduire le contenu → EN
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          🇬🇧 Contenu (Anglais)
                          <span className="text-[10px] text-gray-600">(Ctrl+B: Bold, Ctrl+I: Italic, Ctrl+K: Link)</span>
                        </label>
                        
                        {/* Markdown Toolbar EN */}
                        <div className="flex flex-wrap gap-1 p-2 bg-[#1a1a1a] border border-white/20 rounded-t-xl">
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n## ', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Heading"
                          >
                            <Heading size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('**bold text**', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Bold (Ctrl+B)"
                          >
                            <Bold size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('*italic text*', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Italic (Ctrl+I)"
                          >
                            <Italic size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n- ', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="List"
                          >
                            <List size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n1. ', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Numbered List"
                          >
                            <ListOrdered size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n> ', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Quote"
                          >
                            <Quote size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('\n```\ncode\n```\n', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Code"
                          >
                            <Code size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('[link text](url)', 'en')}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Link (Ctrl+K)"
                          >
                            <LinkIcon size={14} />
                          </button>
                        </div>

                        <textarea 
                          id="content-en"
                          value={contentEn} 
                          onChange={e => setContentEn(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, 'en')}
                          rows={16}
                          placeholder="The full article content in English. Use [MEDIA:0], [MEDIA:1] to insert media."
                          className="w-full bg-[#1a1a1a] border border-white/20 rounded-b-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-mono placeholder:text-gray-600"
                        />
                        <button 
                          onClick={() => handleLingua('translate-content-fr')} 
                          disabled={isProcessing === 'translate-content-fr' || !contentEn}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-xs font-medium disabled:opacity-30"
                        >
                          {isProcessing === 'translate-content-fr' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Languages size={12} />
                          )}
                          Traduire le contenu → FR
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'media' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-white">Galerie Média</h4>
                        <p className="text-sm text-gray-400 mt-1">Ajoutez des images, vidéos ou liens externes. Cliquez sur "Insérer" pour placer dans le texte.</p>
                      </div>
                      <button
                        onClick={() => setShowMediaModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                      >
                        <PlusCircle size={16} />
                        Ajouter un média
                      </button>
                    </div>

                    {mediaItems.length === 0 ? (
                      <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/10">
                        <ImageIcon className="mx-auto mb-3 text-gray-600" size={40} />
                        <p className="text-gray-500">Aucun média ajouté</p>
                        <p className="text-gray-600 text-sm mt-1">Cliquez sur "Ajouter un média" pour commencer</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mediaItems.map((item, index) => (
                          <div key={index} className="group relative bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                            {item.type === 'image' && (
                              <div className="aspect-video bg-black/20">
                                <img src={item.url} alt={item.alt || 'Media'} className="w-full h-full object-cover" />
                              </div>
                            )}
                            {item.type === 'video' && (
                              <div className="aspect-video bg-black/20 flex items-center justify-center">
                                <Video className="text-gray-500" size={48} />
                              </div>
                            )}
                            {item.type === 'link' && (
                              <div className="aspect-video bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                                <ExternalLink className="text-blue-400" size={48} />
                              </div>
                            )}
                            
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                                      {item.type}
                                    </span>
                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-mono">
                                      [MEDIA:{index}]
                                    </span>
                                  </div>
                                  {item.caption && (
                                    <p className="text-sm text-white line-clamp-2">{item.caption}</p>
                                  )}
                                  <p className="text-xs text-gray-500 truncate mt-1">{item.url}</p>
                                </div>
                                <button
                                  onClick={() => removeMediaItem(index)}
                                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex-shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => insertMediaIntoContent(index, 'fr')}
                                  className="flex-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                >
                                  🇫🇷 Insérer
                                </button>
                                <button
                                  onClick={() => insertMediaIntoContent(index, 'en')}
                                  className="flex-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                >
                                  🇬🇧 Insert
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'sources' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-white">Sources & Références</h4>
                        <p className="text-sm text-gray-400 mt-1">Citez vos sources pour plus de crédibilité</p>
                      </div>
                      <button
                        onClick={() => setShowSourceModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2"
                      >
                        <PlusCircle size={16} />
                        Ajouter une source
                      </button>
                    </div>

                    {sources.length === 0 ? (
                      <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/10">
                        <BookOpen className="mx-auto mb-3 text-gray-600" size={40} />
                        <p className="text-gray-500">Aucune source ajoutée</p>
                        <p className="text-gray-600 text-sm mt-1">Ajoutez des sources pour renforcer votre article</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sources.map((source, index) => (
                          <div key={index} className="group bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <BookOpen size={14} className="text-purple-400 flex-shrink-0" />
                                  <h5 className="text-white font-semibold line-clamp-1">{source.title}</h5>
                                </div>
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mb-2"
                                >
                                  <span className="truncate">{source.url}</span>
                                  <ExternalLink size={12} className="flex-shrink-0" />
                                </a>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {source.author && (
                                    <span className="flex items-center gap-1">
                                      <User size={10} />
                                      {source.author}
                                    </span>
                                  )}
                                  {source.date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={10} />
                                      {source.date}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => removeSource(index)}
                                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex-shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'location' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <MapPin className="text-blue-400" size={20} />
                            Localisation de l'article
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">Définissez la portée géographique et la localisation</p>
                        </div>
                        <button
                          onClick={getCurrentLocation}
                          disabled={isGeolocating}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isGeolocating ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Localisation...</span>
                            </>
                          ) : (
                            <>
                              <Navigation size={16} />
                              <span>Me localiser</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Geographic Scope */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-400 mb-3">Portée géographique</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {geographicOptions.map(opt => {
                            const Icon = opt.icon;
                            const isSelected = geographicScope === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setGeographicScope(opt.value as any)}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                  isSelected
                                    ? opt.color === 'blue' ? 'border-blue-500 bg-blue-500/10' :
                                      opt.color === 'green' ? 'border-green-500 bg-green-500/10' :
                                      opt.color === 'orange' ? 'border-orange-500 bg-orange-500/10' :
                                      'border-purple-500 bg-purple-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon size={18} className={isSelected ? 
                                    opt.color === 'blue' ? 'text-blue-400' :
                                    opt.color === 'green' ? 'text-green-400' :
                                    opt.color === 'orange' ? 'text-orange-400' :
                                    'text-purple-400'
                                    : 'text-gray-500'} />
                                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                    {opt.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600">{opt.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Location Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">Ville / Commune</label>
                          <input
                            type="text"
                            value={locationCity}
                            onChange={e => setLocationCity(e.target.value)}
                            placeholder="Ex: Kinshasa"
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">Pays</label>
                          <input
                            type="text"
                            value={locationCountry}
                            onChange={e => setLocationCountry(e.target.value)}
                            placeholder="Ex: République démocratique du Congo"
                            className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Coordinates (if geolocated) */}
                      {(typeof locationLatitude === 'number' && typeof locationLongitude === 'number') && (
  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
    <div className="flex items-start gap-3">
      <MapPin className="text-green-400 flex-shrink-0 mt-1" size={20} />
      <div className="flex-1">
        <p className="text-green-300 font-semibold mb-1">Position GPS enregistrée</p>
        <p className="text-xs text-gray-400">
          Latitude: {locationLatitude.toFixed(6)} | Longitude: {locationLongitude.toFixed(6)}
        </p>
                              <button
                                onClick={() => {
                                  setLocationLatitude(undefined);
                                  setLocationLongitude(undefined);
                                }}
                                className="text-xs text-red-400 hover:text-red-300 mt-2"
                              >
                                Supprimer les coordonnées
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                  <button 
                    onClick={resetForm}
                    className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl font-semibold text-sm hover:bg-white/10 hover:text-white transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving || !titleFr.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>{editingId ? 'Mettre à jour' : 'Créer l\'article'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Articles List */}
          <div className="space-y-4">
            {articles.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/10">
                <Newspaper className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-500 text-lg font-medium">Aucun article pour le moment</p>
                <p className="text-gray-600 text-sm mt-2">Créez votre premier article de presse</p>
              </div>
            ) : (
              articles.map(a => (
                <div 
                  key={a.id} 
                  className="group bg-gradient-to-br from-white/[0.02] to-white/[0.01] hover:from-white/[0.05] hover:to-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    {a.cover_url && (
                      <div className="flex-shrink-0 w-full lg:w-48 h-32 rounded-xl overflow-hidden bg-white/5">
                        <img 
                          src={a.cover_url} 
                          alt={a.title_fr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              a.status === 'published' 
                                ? 'bg-green-500/20 text-green-400' 
                                : a.status === 'draft'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : a.status === 'scheduled'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {a.status === 'published' ? '✅ Publié' : 
                               a.status === 'draft' ? '📝 Brouillon' : 
                               a.status === 'scheduled' ? '🕐 Programmé' :
                               '📦 Archivé'}
                            </span>
                            {a.categories && (
                              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">
                                {a.categories.name_fr}
                              </span>
                            )}
                            {a.geographic_scope && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                a.geographic_scope === 'local' ? 'bg-blue-500/10 text-blue-400' :
                                a.geographic_scope === 'national' ? 'bg-green-500/10 text-green-400' :
                                a.geographic_scope === 'regional' ? 'bg-orange-500/10 text-orange-400' :
                                'bg-purple-500/10 text-purple-400'
                              }`}>
                                {a.geographic_scope === 'local' ? '🏙️' : 
                                 a.geographic_scope === 'national' ? '🇨🇩' : 
                                 a.geographic_scope === 'regional' ? '🌍' : '🌐'} {a.geographic_scope}
                              </span>
                            )}
                            {a.location_city && (
                              <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-xs font-medium flex items-center gap-1">
                                <MapPin size={10} />
                                {a.location_city}
                              </span>
                            )}
                            {a.scheduled_publish_at && (
                              <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs font-medium flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(a.scheduled_publish_at).toLocaleString('fr-FR', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                            {a.audio_url && (
                              <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                                <Mic size={10} />
                                Audio
                              </span>
                            )}
                            {a.media_items && a.media_items.length > 0 && (
                              <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                                <ImageIcon size={10} />
                                {a.media_items.length} média{a.media_items.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {a.sources && a.sources.length > 0 && (
                              <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs font-medium flex items-center gap-1">
                                <BookOpen size={10} />
                                {a.sources.length} source{a.sources.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-white text-lg font-bold mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                            {a.title_fr}
                          </h3>
                          {a.title_en && (
                            <p className="text-gray-500 text-sm italic line-clamp-1">{a.title_en}</p>
                          )}
                        </div>
                      </div>

                      {a.summary_fr && (
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{a.summary_fr}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <User size={12} />
                            <span>{a.author_name}</span>
                          </div>
                          {a.published_at && (
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span>{new Date(a.published_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEdit(a)}
                            className="p-2.5 bg-white/5 text-gray-400 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(a.id)}
                            className="p-2.5 bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/10">
              <Lightbulb className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 text-lg font-medium">Aucune suggestion</p>
              <p className="text-gray-600 text-sm mt-2">Les suggestions des utilisateurs apparaîtront ici</p>
            </div>
          ) : (
            suggestions.map(s => (
              <div 
                key={s.id} 
                className={`group rounded-2xl border p-6 transition-all duration-300 ${
                  s.status === 'used' 
                    ? 'bg-white/[0.01] border-white/5 opacity-60' 
                    : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb size={16} className={s.status === 'used' ? 'text-gray-500' : 'text-purple-400'} />
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        s.status === 'used' 
                          ? 'bg-gray-500/20 text-gray-400' 
                          : 'bg-purple-500/20 text-purple-400 animate-pulse'
                      }`}>
                        {s.status === 'used' ? '✅ Utilisé' : '⏳ En attente'}
                      </span>
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">{s.suggested_topic}</h3>
                    {s.sources && (
                      <p className="text-gray-400 text-sm mb-3">
                        <span className="text-gray-500 font-medium">Sources : </span>
                        {s.sources}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User size={12} />
                    <span>{s.user_email}</span>
                    {s.created_at && (
                      <>
                        <span className="text-gray-700">•</span>
                        <Clock size={12} />
                        <span>{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                      </>
                    )}
                  </div>

                  {s.status === 'pending' && (
                    <button 
                      onClick={() => markSuggestionUsed(s.id)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      Marquer comme utilisé
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Ajouter un média</h3>
              <button onClick={() => setShowMediaModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Type de média</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setMediaType('image')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mediaType === 'image'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <ImageIcon className={`mx-auto mb-2 ${mediaType === 'image' ? 'text-blue-400' : 'text-gray-500'}`} size={24} />
                    <span className={`text-sm font-medium ${mediaType === 'image' ? 'text-white' : 'text-gray-400'}`}>Image</span>
                  </button>
                  <button
                    onClick={() => setMediaType('video')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mediaType === 'video'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Video className={`mx-auto mb-2 ${mediaType === 'video' ? 'text-blue-400' : 'text-gray-500'}`} size={24} />
                    <span className={`text-sm font-medium ${mediaType === 'video' ? 'text-white' : 'text-gray-400'}`}>Vidéo</span>
                  </button>
                  <button
                    onClick={() => setMediaType('link')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mediaType === 'link'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <LinkIcon className={`mx-auto mb-2 ${mediaType === 'link' ? 'text-blue-400' : 'text-gray-500'}`} size={24} />
                    <span className={`text-sm font-medium ${mediaType === 'link' ? 'text-white' : 'text-gray-400'}`}>Lien</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">URL du média</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder={`https://exemple.com/${mediaType === 'image' ? 'image.jpg' : mediaType === 'video' ? 'video.mp4' : 'page'}`}
                    className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {mediaType !== 'link' && (
                    <button
                      onClick={openMediaCloudinary}
                      className="px-4 py-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Upload
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
                  placeholder="Description du média..."
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {mediaType === 'image' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Texte alternatif (optionnel)</label>
                  <input
                    type="text"
                    value={mediaAlt}
                    onChange={e => setMediaAlt(e.target.value)}
                    placeholder="Description pour l'accessibilité..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl font-semibold text-sm hover:bg-white/10 hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={addMediaItem}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Ajouter une source</h3>
              <button onClick={() => setShowSourceModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Titre de la source *</label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={e => setSourceTitle(e.target.value)}
                  placeholder="Ex: Article de Radio France sur la musique congolaise"
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">URL *</label>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://exemple.com/article"
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Auteur (optionnel)</label>
                  <input
                    type="text"
                    value={sourceAuthor}
                    onChange={e => setSourceAuthor(e.target.value)}
                    placeholder="Nom de l'auteur"
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Date (optionnel)</label>
                  <input
                    type="date"
                    value={sourceDate}
                    onChange={e => setSourceDate(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowSourceModal(false)}
                  className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl font-semibold text-sm hover:bg-white/10 hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={addSource}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APERÇU MODAL */}
      {showPreview && (
        <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto bg-[#050505] border border-white/10 rounded-3xl overflow-hidden my-8 relative">
            <button 
              onClick={() => setShowPreview(false)} 
              className="absolute top-6 right-6 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-[#D4AF37] hover:text-black transition-all z-10"
            >
              <X size={24} />
            </button>

            <div className="h-64 md:h-96 relative">
              {coverUrl ? (
                <img src={coverUrl} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                  <Newspaper size={64} className="text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            </div>

            <div className="px-8 md:px-16 pb-16 -mt-20 relative z-10">
              {/* Geographic & Schedule & Location Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {geographicScope && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${
                    geographicScope === 'local' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    geographicScope === 'national' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    geographicScope === 'regional' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                    'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {geographicScope === 'local' ? '🏙️ Local' : 
                     geographicScope === 'national' ? '🇨🇩 National' : 
                     geographicScope === 'regional' ? '🌍 Régional' : '🌐 International'}
                  </span>
                )}
                {locationCity && (
                  <span className="px-3 py-1.5 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1">
                    <MapPin size={12} />
                    {locationCity}{locationCountry && `, ${locationCountry}`}
                  </span>
                )}
                {scheduledPublishAt && (
                  <span className="px-3 py-1.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1">
                    <Clock size={12} />
                    Programmé: {new Date(scheduledPublishAt).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>

              {audioUrl && (
                <div className="mb-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-purple-500 rounded-full text-black flex-shrink-0">
                    <Mic size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-purple-300 text-xs font-bold uppercase mb-2">Version Audio Disponible</p>
                    <audio src={audioUrl} controls className="w-full h-10" />
                  </div>
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight italic">
                {titleFr || 'Titre de l\'article'}
              </h1>

              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/10 text-sm text-white/40">
                <span className="flex items-center gap-2">
                  <User size={16} />
                  {authorName}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {new Date().toLocaleDateString('fr-FR')}
                </span>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-xl text-white/60 font-light leading-relaxed mb-8 italic border-l-4 border-[#D4AF37] pl-6">
                  {summaryFr || 'Résumé de l\'article...'}
                </p>
                
                <div 
                  className="text-white/70 text-base leading-relaxed font-light"
                  dangerouslySetInnerHTML={{ 
                    __html: renderContentWithMedia(contentFr || 'Contenu de l\'article...', mediaItems) 
                  }}
                />
              </div>

              {/* Sources Section */}
              {sources.length > 0 && (
                <div className="mt-12 pt-8 border-t border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-purple-400" />
                    Sources & Références
                  </h3>
                  <div className="space-y-3">
                    {sources.map((source, index) => (
                      <div key={index} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 mb-1"
                        >
                          {source.title}
                          <ExternalLink size={14} />
                        </a>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {source.author && (
                            <span className="flex items-center gap-1">
                              <User size={10} />
                              {source.author}
                            </span>
                          )}
                          {source.date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {source.date}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}