"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, FileText, PlusCircle, Edit2, Trash2, X,
  Languages, SpellCheck, CheckCircle, Globe, Link2, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { autoTranslate, autoCorrect } from '@/lib/lingua';
import ImageUploader from '@/components/admin/ImageUploader';
import { Image as ImageIcon, Music, Upload } from 'lucide-react';
import FormatToolbar from '@/components/admin/FormatToolbar';

interface Category { id: string; name_fr: string; name_en: string; color?: string; }
interface EventOption { id: string; title_fr: string; year: number; }
interface Article {
  id: string; title_fr: string; title_en: string;
  content_fr: string; content_en: string;
  summary_fr: string; summary_en: string;
  image_url: string; category_id: string; status: string;
  slug: string; wikipedia_url: string; reading_time: number;
  categories: Category;
  timeline?: Array<{
    year: string;
    title_fr: string;
    title_en: string;
    description_fr: string;
    description_en: string;
  }>;
}

// ============================================================================
// STRIP FORMATTING — Nettoie le texte du formatage
// ============================================================================

function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([\s\S]+?)\*/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/==([\s\S]+?)==/g, '$1')
    .replace(/\{#[^}]+\}([\s\S]+?)\{\/\}/g, '$1')
    .replace(/\{\+[^}]+\}([\s\S]+?)\{\/\+\}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// ============================================================================
// PARSE INLINE — Rend le formatage visible
// ============================================================================

function parseInline(text: string, catColor: string = '#D4AF37'): React.ReactNode[] {
  if (!text) return [];

  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/);
    const italicMatch = remaining.match(/^([\s\S]*?)\*(?!\*)([\s\S]+?)\*(?!\*)/);
    const strikeMatch = remaining.match(/^([\s\S]*?)~~([\s\S]+?)~~/);
    const highlightMatch = remaining.match(/^([\s\S]*?)==([\s\S]+?)==/);
    const colorMatch = remaining.match(/^([\s\S]*?)\{#([^}]+)\}([\s\S]+?)\{\/\}/);
    const sizeMatch = remaining.match(/^([\s\S]*?)\{\+([^}]+)\}([\s\S]+?)\{\/\+\}/);
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)/);
    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`/);

    const candidates = [
      { type: 'bold', match: boldMatch, before: boldMatch?.[1] },
      { type: 'italic', match: italicMatch, before: italicMatch?.[1] },
      { type: 'strike', match: strikeMatch, before: strikeMatch?.[1] },
      { type: 'highlight', match: highlightMatch, before: highlightMatch?.[1] },
      { type: 'color', match: colorMatch, before: colorMatch?.[1] },
      { type: 'size', match: sizeMatch, before: sizeMatch?.[1] },
      { type: 'link', match: linkMatch, before: linkMatch?.[1] },
      { type: 'code', match: codeMatch, before: codeMatch?.[1] },
    ].filter(c => c.match !== null && c.before !== undefined) as {
      type: string;
      match: RegExpMatchArray;
      before: string;
    }[];

    if (candidates.length === 0) {
      result.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const best = candidates.reduce((a, b) =>
      a.before.length <= b.before.length ? a : b
    );

    if (best.before.length > 0) {
      result.push(<span key={key++}>{best.before}</span>);
    }

    const m = best.match;

    switch (best.type) {
      case 'bold':
        result.push(<strong key={key++} className="text-white font-bold">{parseInline(m[2], catColor)}</strong>);
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 2);
        break;
      case 'italic':
        result.push(<em key={key++} className="text-gray-200 italic">{parseInline(m[2], catColor)}</em>);
        remaining = remaining.slice(best.before.length + 1 + m[2].length + 1);
        break;
      case 'strike':
        result.push(<s key={key++} className="text-gray-500 line-through">{parseInline(m[2], catColor)}</s>);
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 2);
        break;
      case 'highlight':
        result.push(
          <mark key={key++} className="rounded px-1.5 py-0.5"
            style={{ backgroundColor: `${catColor}30`, color: catColor }}>
            {parseInline(m[2], catColor)}
          </mark>
        );
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 2);
        break;
      case 'color':
        result.push(<span key={key++} style={{ color: `#${m[2]}` }}>{parseInline(m[3], catColor)}</span>);
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 1 + m[3].length + 3);
        break;
      case 'size': {
        const sizeMap: Record<string, string> = {
          xs: 'text-[11px]', sm: 'text-sm', base: 'text-base',
          lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl',
          '3xl': 'text-3xl', '4xl': 'text-4xl',
        };
        result.push(
          <span key={key++} className={sizeMap[m[2]] || 'text-base'}>
            {parseInline(m[3], catColor)}
          </span>
        );
        remaining = remaining.slice(best.before.length + 2 + m[2].length + 1 + m[3].length + 4);
        break;
      }
      case 'link':
        result.push(
          <a key={key++} href={m[3]} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
            style={{ color: catColor }}>
            {m[2]}
          </a>
        );
        remaining = remaining.slice(best.before.length + 1 + m[2].length + 2 + m[3].length + 1);
        break;
      case 'code':
        result.push(
          <code key={key++} className="bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[13px] font-mono break-all">
            {m[2]}
          </code>
        );
        remaining = remaining.slice(best.before.length + 1 + m[2].length + 1);
        break;
      default:
        result.push(<span key={key++}>{remaining}</span>);
        remaining = '';
    }
  }

  return result;
}

export default function ArticlesTab({ showMsg }: {
  showMsg: (type: 'success' | 'error', text: string) => void
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [summaryFr, setSummaryFr] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [contentFr, setContentFr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [wikipediaUrl, setWikipediaUrl] = useState('');
  const [readingTime, setReadingTime] = useState<string>('');
  const [catId, setCatId] = useState('');
  const [status, setStatus] = useState('draft');
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [newSource, setNewSource] = useState('');

  // CHRONOLOGIE
  const [timeline, setTimeline] = useState<Array<{
    year: string;
    title_fr: string;
    title_en: string;
    description_fr: string;
    description_en: string;
  }>>([]);
  const [newTimelineYear, setNewTimelineYear] = useState('');
  const [newTimelineTitleFr, setNewTimelineTitleFr] = useState('');
  const [newTimelineTitleEn, setNewTimelineTitleEn] = useState('');
  const [newTimelineDescFr, setNewTimelineDescFr] = useState('');
  const [newTimelineDescEn, setNewTimelineDescEn] = useState('');

  const [editingTimelineIndex, setEditingTimelineIndex] = useState<number | null>(null);
  const [editTimelineYear, setEditTimelineYear] = useState('');
  const [editTimelineTitleFr, setEditTimelineTitleFr] = useState('');
  const [editTimelineTitleEn, setEditTimelineTitleEn] = useState('');
  const [editTimelineDescFr, setEditTimelineDescFr] = useState('');
  const [editTimelineDescEn, setEditTimelineDescEn] = useState('');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [catResult, artResult, evtResult] = await Promise.all([
        supabase.from('categories').select('id, name_fr, name_en'),
        supabase.from('articles').select('*, categories(id, name_fr, name_en)').order('created_at', { ascending: false }),
        supabase.from('events').select('id, title_fr, year').order('year', { ascending: false }).limit(100),
      ]);
      if (catResult.data) setCategories(catResult.data);
      if (artResult.data) setArticles(artResult.data as unknown as Article[]);
      if (evtResult.data) setEventOptions(evtResult.data as EventOption[]);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const resetForm = () => {
    setEditingId(null); setTitleFr(''); setTitleEn('');
    setSummaryFr(''); setSummaryEn('');
    setContentFr(''); setContentEn('');
    setImageUrl(''); setWikipediaUrl(''); setReadingTime('');
    setCatId(''); setStatus('draft'); setLinkedEventIds([]);
    setEventSearch(''); setAudioUrl(''); setSources([]); setNewSource('');
    setGalleryImages([]);
    setTimeline([]);
    setNewTimelineYear('');
    setNewTimelineTitleFr('');
    setNewTimelineTitleEn('');
    setNewTimelineDescFr('');
    setNewTimelineDescEn('');
    setEditingTimelineIndex(null);
    setEditTimelineYear('');
    setEditTimelineTitleFr('');
    setEditTimelineTitleEn('');
    setEditTimelineDescFr('');
    setEditTimelineDescEn('');
  };

  const openAudioWidget = () => {
    setIsUploading(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'url'],
          resourceType: 'auto',
          multiple: false,
          maxFileSize: 50_000_000,
          folder: 'articles/audio',
        },
        (
          error: unknown,
          result: { event: string; info: { secure_url: string } }
        ) => {
          setIsUploading(false);
          if (result?.event === 'success') {
            setAudioUrl(result.info.secure_url);
            showMsg('success', '✅ Audio uploadé !');
          }
          if (error) showMsg('error', 'Erreur upload Cloudinary');
        }
      );
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  const handleEdit = async (art: Article) => {
    setEditingId(art.id);
    setTitleFr(art.title_fr); setTitleEn(art.title_en);
    setSummaryFr(art.summary_fr || ''); setSummaryEn(art.summary_en || '');
    setContentFr(art.content_fr || ''); setContentEn(art.content_en || '');
    setImageUrl(art.image_url || '');
    setWikipediaUrl(art.wikipedia_url || '');
    setReadingTime(art.reading_time ? String(art.reading_time) : '');
    setCatId(art.category_id || ''); setStatus(art.status);
    setGalleryImages((art as any).gallery_images || []);
    setAudioUrl((art as any).audio_url || '');
    setSources((art as any).sources || []);
    setTimeline((art as any).timeline || []);

    const { data: linked } = await supabase
      .from('article_events').select('event_id').eq('article_id', art.id);
    if (linked) setLinkedEventIds(linked.map(l => l.event_id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLingua = async (action: string) => {
    setIsProcessing(action);
    try {
      if (action === 'translate-en') setTitleEn(await autoTranslate(titleFr, 'fr'));
      if (action === 'translate-fr') setTitleFr(await autoTranslate(titleEn, 'en'));
      if (action === 'correct-fr') setTitleFr(await autoCorrect(titleFr, 'fr'));
      if (action === 'correct-en') setTitleEn(await autoCorrect(titleEn, 'en'));
      if (action === 'summary-en') setSummaryEn(await autoTranslate(summaryFr, 'fr'));
      if (action === 'summary-fr') setSummaryFr(await autoTranslate(summaryEn, 'en'));
      if (action === 'translate-content-en') setContentEn(await autoTranslate(contentFr, 'fr'));
      if (action === 'translate-content-fr') setContentFr(await autoTranslate(contentEn, 'en'));
      if (action === 'correct-content-fr') setContentFr(await autoCorrect(contentFr, 'fr'));
      if (action === 'correct-content-en') setContentEn(await autoCorrect(contentEn, 'en'));
      if (action === 'translate-timeline-en') setNewTimelineTitleEn(await autoTranslate(newTimelineTitleFr, 'fr'));
      if (action === 'translate-timeline-fr') setNewTimelineTitleFr(await autoTranslate(newTimelineTitleEn, 'en'));
      if (action === 'translate-timeline-desc-en') setNewTimelineDescEn(await autoTranslate(newTimelineDescFr, 'fr'));
      if (action === 'translate-timeline-desc-fr') setNewTimelineDescFr(await autoTranslate(newTimelineDescEn, 'en'));
      if (action === 'edit-translate-timeline-en') setEditTimelineTitleEn(await autoTranslate(editTimelineTitleFr, 'fr'));
      if (action === 'edit-translate-timeline-fr') setEditTimelineTitleFr(await autoTranslate(editTimelineTitleEn, 'en'));
      if (action === 'edit-translate-timeline-desc-en') setEditTimelineDescEn(await autoTranslate(editTimelineDescFr, 'fr'));
      if (action === 'edit-translate-timeline-desc-fr') setEditTimelineDescFr(await autoTranslate(editTimelineDescEn, 'en'));
    } catch { showMsg('error', 'Erreur API'); }
    setIsProcessing(null);
  };

  const toggleEvent = useCallback((eventId: string) => {
    setLinkedEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  }, []);

  const handleSave = async () => {
    if (!titleFr.trim() || !titleEn.trim()) return showMsg('error', 'Titres requis.');
    setIsSaving(true);
    const slug = titleFr.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      const payload = {
        title_fr: titleFr, title_en: titleEn,
        summary_fr: summaryFr, summary_en: summaryEn,
        content_fr: contentFr, content_en: contentEn,
        image_url: imageUrl,
        wikipedia_url: wikipediaUrl || null,
        reading_time: readingTime ? parseInt(readingTime) : null,
        category_id: catId || null,
        status, slug,
        gallery_images: galleryImages,
        sources,
        timeline: timeline.length > 0 ? timeline : null,
        audio_url: audioUrl || null,
      };

      let articleId = editingId;
      if (editingId) {
        const { error } = await supabase.from('articles').update(payload).eq('id', editingId);
        if (error) throw error;
        setArticles(articles.map(a => a.id === editingId ? { ...a, ...payload } : a));
        showMsg('success', 'Article mis à jour !');
      } else {
        const { data, error } = await supabase.from('articles')
          .insert(payload).select('*, categories(id, name_fr, name_en)').single();
        if (error) throw error;
        articleId = data.id;
        setArticles([data as unknown as Article, ...articles]);
        showMsg('success', 'Article créé !');
      }
      if (articleId) {
        await supabase.from('article_events').delete().eq('article_id', articleId);
        if (linkedEventIds.length > 0) {
          await supabase.from('article_events').insert(
            linkedEventIds.map(eventId => ({ article_id: articleId, event_id: eventId }))
          );
        }
      }
      resetForm();
    } catch (err: any) { showMsg('error', err.message); }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (!error) {
      setArticles(articles.filter(a => a.id !== id));
      showMsg('success', 'Supprimé.');
    } else showMsg('error', error.message);
  };

  const filteredEvents = eventOptions.filter(e =>
    e.title_fr.toLowerCase().includes(eventSearch.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex justify-center py-20 w-full">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 px-2 sm:px-0">
      
      {/* HEADER */}
      <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
        <FileText className="text-[#D4AF37] flex-shrink-0" size={20} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-serif truncate">Articles (Encyclopédie)</h2>
          <p className="text-gray-400 text-xs">{articles.length} articles</p>
        </div>
      </div>

      {/* FORMULAIRE PRINCIPAL */}
      <div className="bg-[#0f0f0f] p-3 sm:p-4 md:p-6 rounded-lg border border-white/5 space-y-4 w-full min-w-0">
        
        <div className="flex items-center justify-between min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 min-w-0">
            {editingId ? <Edit2 size={16} className="text-[#D4AF37] flex-shrink-0" /> : <PlusCircle size={16} className="text-[#D4AF37] flex-shrink-0" />}
            <span className="truncate">{editingId ? 'Modifier' : 'Nouvel Article'}</span>
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 flex-shrink-0">
              <X size={14} /> <span className="hidden sm:inline">Annuler</span>
            </button>
          )}
        </div>

        {/* ── Titres ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Titre FR</label>
            <FormatToolbar fieldId="title-fr" value={titleFr} onChange={setTitleFr} minimal />
            <input id="title-fr" type="text" value={titleFr} onChange={e => setTitleFr(e.target.value)}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-b-lg rounded-t-none px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
            <div className="flex flex-wrap gap-1 mt-1">
              <button onClick={() => handleLingua('correct-fr')} disabled={isProcessing === 'correct-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <SpellCheck size={10} /> Corriger
              </button>
              <button onClick={() => handleLingua('translate-fr')} disabled={isProcessing === 'translate-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={10} /> EN→FR
              </button>
            </div>
          </div>

          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Titre EN</label>
            <FormatToolbar fieldId="title-en" value={titleEn} onChange={setTitleEn} minimal />
            <input id="title-en" type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-b-lg rounded-t-none px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
            <div className="flex flex-wrap gap-1 mt-1">
              <button onClick={() => handleLingua('correct-en')} disabled={isProcessing === 'correct-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <SpellCheck size={10} /> Correct
              </button>
              <button onClick={() => handleLingua('translate-en')} disabled={isProcessing === 'translate-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={10} /> FR→EN
              </button>
            </div>
          </div>
        </div>

        {/* ── Résumés ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Résumé FR</label>
            <FormatToolbar fieldId="summary-fr" value={summaryFr} onChange={setSummaryFr} minimal />
            <textarea id="summary-fr" value={summaryFr} onChange={e => setSummaryFr(e.target.value)} rows={2}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-b-lg rounded-t-none px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] resize-none" />
            <div className="flex flex-wrap mt-1">
              <button onClick={() => handleLingua('summary-en')} disabled={isProcessing === 'summary-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={10} /> Traduire en EN
              </button>
            </div>
          </div>

          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Summary EN</label>
            <FormatToolbar fieldId="summary-en" value={summaryEn} onChange={setSummaryEn} minimal />
            <textarea id="summary-en" value={summaryEn} onChange={e => setSummaryEn(e.target.value)} rows={2}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-b-lg rounded-t-none px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] resize-none" />
            <div className="flex flex-wrap mt-1">
              <button onClick={() => handleLingua('summary-fr')} disabled={isProcessing === 'summary-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={10} /> Traduire en FR
              </button>
            </div>
          </div>
        </div>

        {/* Contenus avec toolbar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Contenu FR</label>
            <FormatToolbar fieldId="content-fr" value={contentFr} onChange={setContentFr} />
            <textarea id="content-fr" value={contentFr} onChange={e => setContentFr(e.target.value)} rows={8}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-b-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] resize-none font-mono rounded-t-none" />
            <div className="flex flex-wrap gap-1 mt-1">
              <button onClick={() => handleLingua('correct-content-fr')} disabled={isProcessing === 'correct-content-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <SpellCheck size={10} /> Corriger
              </button>
              <button onClick={() => handleLingua('translate-content-en')} disabled={isProcessing === 'translate-content-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={10} /> FR→EN
              </button>
            </div>
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Content EN</label>
            <FormatToolbar fieldId="content-en" value={contentEn} onChange={setContentEn} />
            <textarea id="content-en" value={contentEn} onChange={e => setContentEn(e.target.value)} rows={8}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-b-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37] resize-none font-mono rounded-t-none" />
            <div className="flex flex-wrap gap-1 mt-1">
              <button onClick={() => handleLingua('correct-content-en')} disabled={isProcessing === 'correct-content-en'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <SpellCheck size={10} /> Correct
              </button>
              <button onClick={() => handleLingua('translate-content-fr')} disabled={isProcessing === 'translate-content-fr'}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={10} /> EN→FR
              </button>
            </div>
          </div>
        </div>

        {/* Métadonnées */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🏷️ Catégorie</label>
            <select value={catId} onChange={e => setCatId(e.target.value)}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]">
              <option value="">Aucune</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
            </select>
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">⏱️ Temps (min)</label>
            <input type="number" value={readingTime} onChange={e => setReadingTime(e.target.value)} placeholder="5"
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🌐 Wikipedia</label>
            <input type="text" value={wikipediaUrl} onChange={e => setWikipediaUrl(e.target.value)} placeholder="https://..."
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">📊 Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]">
              <option value="draft">Brouillon</option>
              <option value="pending_review">En attente</option>
              <option value="published">Publié</option>
            </select>
          </div>
        </div>

        {/* Image principale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
          <div className="flex flex-col min-w-0 w-full">
            <label className="block text-xs text-gray-400 mb-1 font-mono">🖼️ Image principale</label>
            <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
              className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]" />
            {imageUrl && (
              <div className="mt-2 w-full h-20 rounded-lg overflow-hidden border border-white/10">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0 w-full justify-end">
            <ImageUploader label="Uploader l'image" currentUrl={imageUrl} onUpload={setImageUrl} />
          </div>
        </div>

        {/* ── Audio ── */}
        <div className="p-3 sm:p-4 bg-[#1a1a1a] rounded-lg border border-white/10 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Music size={14} className="text-[#D4AF37] flex-shrink-0" />
            <span className="text-xs font-bold text-gray-300">Fichier Audio (optionnel)</span>
          </div>

          {audioUrl ? (
            <div className="space-y-2 w-full min-w-0">
              <audio src={audioUrl} controls className="w-full h-8" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full min-w-0">
                <code className="flex-1 min-w-0 text-[10px] text-gray-500 bg-black/40 px-2 py-1 rounded break-all">
                  {audioUrl}
                </code>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openAudioWidget()} disabled={isUploading}
                    className="text-[10px] text-[#D4AF37] hover:text-white transition-colors">
                    Remplacer
                  </button>
                  <button onClick={() => setAudioUrl('')}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => openAudioWidget()} disabled={isUploading}
              className="w-full flex flex-col items-center gap-2 p-4 sm:p-6 border border-dashed border-white/15 rounded-xl text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-colors disabled:opacity-40">
              {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
              <span className="text-xs font-bold text-center">
                {isUploading ? 'Upload en cours...' : 'Uploader un fichier audio'}
              </span>
            </button>
          )}
        </div>

        {/* ✅ CHRONOLOGIE DE L'ARTICLE */}
        <div className="p-3 sm:p-4 bg-[#1a1a1a] rounded-lg border border-white/10 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-[#D4AF37] flex-shrink-0" />
            <span className="text-xs font-bold text-gray-300">Chronologie de l&apos;article</span>
          </div>

          {/* Formulaire d'ajout */}
          <div className="space-y-3 mb-3 p-3 bg-[#0f0f0f] rounded-lg border border-white/5 w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
              <input type="text" value={newTimelineYear} onChange={e => setNewTimelineYear(e.target.value)}
                placeholder="Année (ex: 1492)"
                className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]" />
              <div className="w-full min-w-0">
                <input type="text" value={newTimelineTitleFr} onChange={e => setNewTimelineTitleFr(e.target.value)}
                  placeholder="Titre FR"
                  className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]" />
                <button onClick={() => handleLingua('translate-timeline-en')} disabled={isProcessing === 'translate-timeline-en' || !newTimelineTitleFr}
                  className="mt-1 p-1 text-[9px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                  <Languages size={9} /> FR→EN
                </button>
              </div>
            </div>
            
            <div className="w-full min-w-0">
              <input type="text" value={newTimelineTitleEn} onChange={e => setNewTimelineTitleEn(e.target.value)}
                placeholder="Titre EN"
                className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]" />
              <button onClick={() => handleLingua('translate-timeline-fr')} disabled={isProcessing === 'translate-timeline-fr' || !newTimelineTitleEn}
                className="mt-1 p-1 text-[9px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={9} /> EN→FR
              </button>
            </div>

            <div className="w-full min-w-0">
              <textarea value={newTimelineDescFr} onChange={e => setNewTimelineDescFr(e.target.value)}
                placeholder="Description FR (optionnel)" rows={2}
                className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37] resize-none" />
              <button onClick={() => handleLingua('translate-timeline-desc-en')} disabled={isProcessing === 'translate-timeline-desc-en' || !newTimelineDescFr}
                className="mt-1 p-1 text-[9px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={9} /> Desc FR→EN
              </button>
            </div>

            <div className="w-full min-w-0">
              <textarea value={newTimelineDescEn} onChange={e => setNewTimelineDescEn(e.target.value)}
                placeholder="Description EN (optionnel)" rows={2}
                className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37] resize-none" />
              <button onClick={() => handleLingua('translate-timeline-desc-fr')} disabled={isProcessing === 'translate-timeline-desc-fr' || !newTimelineDescEn}
                className="mt-1 p-1 text-[9px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30">
                <Languages size={9} /> Desc EN→FR
              </button>
            </div>

            <button onClick={() => {
              if (newTimelineYear && newTimelineTitleFr && newTimelineTitleEn) {
                setTimeline([...timeline, { year: newTimelineYear, title_fr: newTimelineTitleFr, title_en: newTimelineTitleEn, description_fr: newTimelineDescFr, description_en: newTimelineDescEn }]);
                setNewTimelineYear(''); setNewTimelineTitleFr(''); setNewTimelineTitleEn(''); setNewTimelineDescFr(''); setNewTimelineDescEn('');
              }
            }} disabled={!newTimelineYear || !newTimelineTitleFr || !newTimelineTitleEn}
              className="w-full px-4 py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:bg-white transition-colors disabled:opacity-50">
              Ajouter une étape
            </button>
          </div>

          {/* Liste des entrées */}
          {timeline.length > 0 ? (
            <div className="space-y-2 w-full min-w-0">
              {timeline.map((entry, i) => (
                <div key={i} className="rounded-lg border border-white/10 overflow-hidden w-full min-w-0">
                  {editingTimelineIndex === i ? (
                    <div className="p-3 bg-[#0f0f0f] space-y-3 w-full min-w-0">
                      <div className="flex justify-between w-full min-w-0">
                        <span className="text-[10px] text-[#D4AF37] font-mono">✏️ Édition #{i + 1}</span>
                        <button onClick={() => setEditingTimelineIndex(null)} className="text-gray-500 hover:text-white"><X size={12} /></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                        <input type="text" value={editTimelineYear} onChange={e => setEditTimelineYear(e.target.value)} placeholder="Année" className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs" />
                        <input type="text" value={editTimelineTitleFr} onChange={e => setEditTimelineTitleFr(e.target.value)} placeholder="Titre FR" className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs" />
                      </div>
                      <input type="text" value={editTimelineTitleEn} onChange={e => setEditTimelineTitleEn(e.target.value)} placeholder="Titre EN" className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs" />
                      <textarea value={editTimelineDescFr} onChange={e => setEditTimelineDescFr(e.target.value)} placeholder="Description FR" rows={2} className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs resize-none" />
                      <textarea value={editTimelineDescEn} onChange={e => setEditTimelineDescEn(e.target.value)} placeholder="Description EN" rows={2} className="w-full min-w-0 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 py-2 text-white text-xs resize-none" />
                      
                      <div className="flex gap-2 w-full min-w-0">
                        <button onClick={() => {
                          const updated = [...timeline];
                          updated[i] = { year: editTimelineYear, title_fr: editTimelineTitleFr, title_en: editTimelineTitleEn, description_fr: editTimelineDescFr, description_en: editTimelineDescEn };
                          setTimeline(updated); setEditingTimelineIndex(null);
                        }} disabled={!editTimelineYear || !editTimelineTitleFr || !editTimelineTitleEn} className="flex-1 bg-[#D4AF37] text-black py-1.5 rounded text-xs font-bold">Enregistrer</button>
                        <button onClick={() => setTimeline(timeline.filter((_, idx) => idx !== i))} className="px-3 bg-red-500/10 text-red-400 py-1.5 rounded text-xs font-bold"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between p-3 bg-[#0f0f0f] group w-full min-w-0">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1 w-full min-w-0">
                          <span className="text-[#D4AF37] font-mono text-xs font-bold">{entry.year}</span>
                          <span className="text-white text-xs font-bold truncate">{entry.title_fr}</span>
                          <span className="text-gray-500 text-[10px] truncate">/ {entry.title_en}</span>
                        </div>
                        {entry.description_fr && <p className="text-gray-500 text-[10px] break-words">{entry.description_fr}</p>}
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0">
                        <button onClick={() => {
                          setEditingTimelineIndex(i); setEditTimelineYear(entry.year); setEditTimelineTitleFr(entry.title_fr);
                          setEditTimelineTitleEn(entry.title_en); setEditTimelineDescFr(entry.description_fr || ''); setEditTimelineDescEn(entry.description_en || '');
                        }} className="p-1 text-gray-500 hover:text-[#D4AF37]"><Edit2 size={12} /></button>
                        <button onClick={() => setTimeline(timeline.filter((_, idx) => idx !== i))} className="p-1 text-gray-600 hover:text-red-500"><X size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-xs text-center py-4 w-full">Aucune étape ajoutée</p>
          )}
        </div>

        {/* Galerie */}
        <div className="p-3 sm:p-4 bg-[#1a1a1a] rounded-lg border border-white/10 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={14} className="text-[#D4AF37] flex-shrink-0" />
            <span className="text-xs font-bold text-gray-300">Galerie d&apos;images</span>
          </div>
          <ImageUploader label="Ajouter des images" multiple currentUrls={galleryImages} onMultipleUpload={setGalleryImages} />
          {galleryImages.length > 0 && (
            <div className="mt-3 p-3 bg-[#0f0f0f] rounded-lg border border-white/5 w-full min-w-0">
              <div className="space-y-2 w-full min-w-0">
                {galleryImages.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 w-full min-w-0">
                    <code className="flex-1 text-[10px] text-gray-400 bg-black/50 px-2 py-1 rounded break-all min-w-0">{url}</code>
                    <button onClick={() => navigator.clipboard.writeText(`![légende](${url})`)}
                      className="text-[10px] text-[#D4AF37] whitespace-nowrap">Copier</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sources */}
        <div className="p-3 sm:p-4 bg-[#1a1a1a] rounded-lg border border-white/10 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-[#D4AF37] flex-shrink-0" />
            <span className="text-xs font-bold text-gray-300">Sources & Références</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-3 w-full min-w-0">
            <input type="text" value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="https://..."
              className="flex-1 min-w-0 bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none"
              onKeyDown={e => { if (e.key === 'Enter' && newSource.trim()) { setSources([...sources, newSource.trim()]); setNewSource(''); } }} />
            <button onClick={() => { if (newSource.trim()) { setSources([...sources, newSource.trim()]); setNewSource(''); } }} disabled={!newSource.trim()}
              className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold disabled:opacity-50 whitespace-nowrap">Ajouter</button>
          </div>
          {sources.length > 0 && (
            <div className="space-y-2 w-full min-w-0">
              {sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-[#0f0f0f] rounded-lg border border-white/10 w-full min-w-0">
                  <span className="text-gray-400 text-xs break-all flex-1 min-w-0 pr-2">{source}</span>
                  <button onClick={() => setSources(sources.filter((_, idx) => idx !== i))} className="p-1 text-gray-600 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Événements liés */}
        <div className="p-3 sm:p-4 bg-[#1a1a1a] rounded-lg border border-white/10 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} className="text-[#D4AF37] flex-shrink-0" />
            <span className="text-xs font-bold text-gray-300">Événements liés</span>
          </div>
          {linkedEventIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 w-full">
              {linkedEventIds.map(id => {
                const evt = eventOptions.find(e => e.id === id);
                if (!evt) return null;
                return (
                  <span key={id} className="flex items-center gap-1.5 bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] px-2.5 py-1 rounded-full font-bold max-w-full min-w-0">
                    <span className="truncate">{evt.year} — {evt.title_fr}</span>
                    <button onClick={() => toggleEvent(id)} className="flex-shrink-0"><X size={10} /></button>
                  </span>
                );
              })}
            </div>
          )}
          <input type="text" value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full min-w-0 bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-xs mb-2" />
          <div className="max-h-40 overflow-y-auto space-y-1 w-full min-w-0">
            {filteredEvents.slice(0, 20).map(evt => (
              <label key={evt.id} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer w-full min-w-0">
                <input type="checkbox" checked={linkedEventIds.includes(evt.id)} onChange={() => toggleEvent(evt.id)} className="accent-[#D4AF37] flex-shrink-0" />
                <span className="text-[#D4AF37] font-mono text-[10px] flex-shrink-0">{evt.year}</span>
                <span className="text-white text-xs truncate flex-1">{evt.title_fr}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5 w-full">
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-white transition-colors">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            <span>{editingId ? 'Mettre à jour' : "Créer l'article"}</span>
          </button>
        </div>
      </div>

      {/* Liste articles */}
      <div className="space-y-3 w-full min-w-0">
        {articles.map(art => (
          <div key={art.id} className="flex flex-col sm:flex-row justify-between p-3 sm:p-4 bg-white/[0.02] border border-white/10 rounded-lg gap-3 w-full min-w-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {art.image_url && <img src={art.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate w-full">{parseInline(art.title_fr, art.categories?.color)}</p>
                <p className="text-gray-500 text-xs italic truncate w-full">{parseInline(art.title_en, art.categories?.color)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleEdit(art)} className="p-2 bg-white/5 hover:text-[#D4AF37] rounded-lg"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(art.id)} className="p-2 bg-white/5 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}