"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Link2, Trash2, Plus, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteModal from '@/components/admin/shared/DeleteModal';

interface Article { id: string; title_fr: string; title_en: string; slug: string; }
interface Event { id: string; title_fr: string; year: number; }
interface LinkItem {
  id: string;
  article_id: string;
  event_id: string;
  articles: Article;   // ← Objet, pas tableau
  events: Event;       // ← Objet, pas tableau
}

function cleanTitle(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\{#+[0-9A-Fa-f]*\}/gi, '').replace(/\{\/\}/g, '').trim();
}

export default function ArticleEventsLinkTab({ showMsg }: {
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchArticle, setSearchArticle] = useState('');
  const [searchEvent, setSearchEvent] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const [artResult, evtResult, linkResult] = await Promise.all([
        supabase.from('articles').select('id, title_fr, title_en, slug').eq('status', 'published').order('title_fr'),
        supabase.from('events').select('id, title_fr, year').order('year', { ascending: false }),
        supabase.from('article_events').select('id, article_id, event_id, articles(id, title_fr, title_en, slug), events(id, title_fr, year)'),
      ]);

      if (artResult.data) setArticles(artResult.data as Article[]);
      if (evtResult.data) setEvents(evtResult.data as Event[]);
      if (linkResult.data) setLinks(linkResult.data as unknown as LinkItem[]);
      setIsLoading(false);
    }
    fetch();
  }, []);

  const handleAddLink = async () => {
    if (!selectedArticleId || !selectedEventId) {
      showMsg('error', 'Sélectionnez un article et un événement');
      return;
    }

    if (links.some(l => l.article_id === selectedArticleId && l.event_id === selectedEventId)) {
      showMsg('error', 'Cette liaison existe déjà');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('article_events')
        .insert({ article_id: selectedArticleId, event_id: selectedEventId })
        .select('id, article_id, event_id, articles(id, title_fr, title_en, slug), events(id, title_fr, year)')
        .single();

      if (error) throw error;
      setLinks([data as unknown as LinkItem, ...links]);
      setSelectedArticleId('');
      setSelectedEventId('');
      showMsg('success', 'Liaison créée !');
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setIsSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const { error } = await supabase.from('article_events').delete().eq('id', deleteTarget.id);
    if (!error) {
      setLinks(links.filter(l => l.id !== deleteTarget.id));
      showMsg('success', 'Liaison supprimée');
    } else {
      showMsg('error', error.message);
    }

    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const filteredArticles = useMemo(() =>
    articles.filter(a =>
      cleanTitle(a.title_fr).toLowerCase().includes(searchArticle.toLowerCase()) ||
      cleanTitle(a.title_en).toLowerCase().includes(searchArticle.toLowerCase())
    ),
    [articles, searchArticle]
  );

  const filteredEvents = useMemo(() =>
    events.filter(e =>
      cleanTitle(e.title_fr).toLowerCase().includes(searchEvent.toLowerCase())
    ),
    [events, searchEvent]
  );

  const selectedArticle = articles.find(a => a.id === selectedArticleId);
  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link2 className="text-[#D4AF37]" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Liaisons Articles ↔ Événements</h2>
          <p className="text-gray-400 text-xs">{links.length} liaisons</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-lg border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus size={18} className="text-[#D4AF37]" />
          Créer une liaison
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Article selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-mono">📄 Article</label>
            <input
              type="text"
              value={searchArticle}
              onChange={e => setSearchArticle(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-white/10 rounded-lg bg-[#1a1a1a]">
              {filteredArticles.map(art => (
                <button
                  key={art.id}
                  onClick={() => {
                    setSelectedArticleId(art.id);
                    setSearchArticle('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedArticleId === art.id ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-bold' : 'text-white/80'
                  }`}
                >
                  {cleanTitle(art.title_fr)}
                </button>
              ))}
              {filteredArticles.length === 0 && (
                <div className="px-4 py-3 text-center text-gray-600 text-xs">
                  Aucun article trouvé
                </div>
              )}
            </div>
            {selectedArticle && (
              <div className="mt-2 p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                <p className="text-[10px] text-gray-500 mb-1">Sélectionné :</p>
                <p className="text-sm font-bold text-[#D4AF37]">{cleanTitle(selectedArticle.title_fr)}</p>
              </div>
            )}
          </div>

          {/* Event selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-mono">📅 Événement</label>
            <input
              type="text"
              value={searchEvent}
              onChange={e => setSearchEvent(e.target.value)}
              placeholder="Rechercher un événement..."
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-white/10 rounded-lg bg-[#1a1a1a]">
              {filteredEvents.map(evt => (
                <button
                  key={evt.id}
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    setSearchEvent('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedEventId === evt.id ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-bold' : 'text-white/80'
                  }`}
                >
                  <span className="font-mono text-[#D4AF37] text-xs mr-2">{evt.year}</span>
                  {cleanTitle(evt.title_fr)}
                </button>
              ))}
              {filteredEvents.length === 0 && (
                <div className="px-4 py-3 text-center text-gray-600 text-xs">
                  Aucun événement trouvé
                </div>
              )}
            </div>
            {selectedEvent && (
              <div className="mt-2 p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                <p className="text-[10px] text-gray-500 mb-1">Sélectionné :</p>
                <p className="text-sm font-bold text-[#D4AF37]">
                  <span className="font-mono text-xs">{selectedEvent.year}</span> — {cleanTitle(selectedEvent.title_fr)}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleAddLink}
          disabled={!selectedArticleId || !selectedEventId || isSaving}
          className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-lg font-bold text-sm hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving
            ? <><Loader2 size={16} className="animate-spin" /> Liaison en cours...</>
            : <><Link2 size={16} /> Créer la liaison</>
          }
        </button>
      </div>

      {/* Liaisons list */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white mb-4">Liaisons existantes</h3>
        {links.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-sm">Aucune liaison pour le moment</p>
          </div>
        ) : (
          <AnimatePresence>
            {links.map((link, i) => {
  const article = link.articles;
  const event = link.events;

  return (
    <motion.div
      key={link.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.05 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-lg gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {article ? cleanTitle(article.title_fr) : 'Article supprimé'}
            </p>
            {article?.slug && (
              <p className="text-gray-600 text-xs truncate">
                <span className="text-gray-700 font-mono text-[10px]">/{article.slug}</span>
              </p>
            )}
          </div>
          <span className="text-gray-700 text-sm font-bold flex-shrink-0">↔</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate flex items-center gap-2">
              {event && (
                <span className="text-[#D4AF37] font-mono text-xs flex-shrink-0">
                  {event.year}
                </span>
              )}
              {event ? cleanTitle(event.title_fr) : 'Événement supprimé'}
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={() => setDeleteTarget(link)}
        className="flex-shrink-0 p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
})}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={!!deleteTarget}
        title="Supprimer la liaison"
        description="Cette liaison entre un article et un événement sera définitivement supprimée."
        itemName={
  deleteTarget
    ? `${cleanTitle(deleteTarget.articles?.title_fr || 'Article supprimé')} ↔ ${deleteTarget.events?.year || ''} ${cleanTitle(deleteTarget.events?.title_fr || 'Événement supprimé')}`
    : undefined
}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
        confirmText="Supprimer la liaison"
        cancelText="Annuler"
      />
    </div>
  );
}