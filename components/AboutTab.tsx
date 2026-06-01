"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Loader2, Save, Plus, Trash2, Check, Link as LinkIcon,
  Languages, Sparkles, ImagePlus, Copy, Edit2, X,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploader from '@/components/admin/ImageUploader';

interface SocialLink {
  id: string;
  title: string;
  url: string;
}

interface Section {
  id: string;
  key: string;
  title_fr: string;
  title_en: string;
  text_fr: string;
  text_en: string;
  images: string[];
  icon: string;
  order: number;
}

interface AboutContent {
  id?: string;
  hero_text_fr: string;
  hero_text_en: string;
  sections: Section[];
  contact_email: string;
  social_links: SocialLink[];
  updated_at?: string;
}

const DEFAULT_SECTIONS: Section[] = [
  {
    id: '1',
    key: 'mission',
    title_fr: 'Notre Mission',
    title_en: 'Our Mission',
    text_fr: 'Connecter les peuples africains à leur héritage intellectuel et culturel.',
    text_en: 'Connect African peoples to their intellectual and cultural heritage.',
    images: [],
    icon: '🎯',
    order: 1,
  },
  {
    id: '2',
    key: 'vision',
    title_fr: 'Notre Vision',
    title_en: 'Our Vision',
    text_fr: 'Un monde où le savoir africain est accessible, célébré et valorisé.',
    text_en: 'A world where African knowledge is accessible, celebrated and valued.',
    images: [],
    icon: '👁️',
    order: 2,
  },
  {
    id: '3',
    key: 'values',
    title_fr: 'Nos Valeurs',
    title_en: 'Our Values',
    text_fr: 'Intégrité, Innovation, Inclusion et Impact.',
    text_en: 'Integrity, Innovation, Inclusion and Impact.',
    images: [],
    icon: '💎',
    order: 3,
  },
  {
    id: '4',
    key: 'team',
    title_fr: 'Notre Équipe',
    title_en: 'Our Team',
    text_fr: 'Des passionnés du continent, travaillant pour son avenir.',
    text_en: 'Passionate individuals working for the continent\'s future.',
    images: [],
    icon: '👥',
    order: 4,
  },
];

const DEFAULT_CONTENT: AboutContent = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  hero_text_fr: 'Lukeni est une plateforme dédiée à la préservation et la diffusion du savoir africain.',
  hero_text_en: 'Lukeni is a platform dedicated to preserving and sharing African knowledge.',
  sections: DEFAULT_SECTIONS,
  contact_email: 'hello@lukeni.africa',
  social_links: [
    { id: '1', title: 'Twitter', url: 'https://twitter.com/lukeni' },
    { id: '2', title: 'Instagram', url: 'https://instagram.com/lukeni' },
  ],
};

export default function AboutTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [isAddingLink, setIsAddingLink] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      // ✅ Utiliser l'ID fixe au lieu de .single()
      const { data, error } = await supabase
        .from('about_page')
        .select('*')
        .eq('id', '123e4567-e89b-12d3-a456-426614174000')
        .single();

      if (error) {
        console.error('Fetch error:', error);
        setContent(DEFAULT_CONTENT);
      } else if (data) {
        const parsedContent: AboutContent = {
          id: data.id,
          hero_text_fr: data.hero_text_fr || DEFAULT_CONTENT.hero_text_fr,
          hero_text_en: data.hero_text_en || DEFAULT_CONTENT.hero_text_en,
          sections: Array.isArray(data.sections) ? data.sections : DEFAULT_SECTIONS,
          contact_email: data.contact_email || DEFAULT_CONTENT.contact_email,
          social_links: Array.isArray(data.social_links) ? data.social_links : [],
          updated_at: data.updated_at,
        };
        setContent(parsedContent);
      } else {
        setContent(DEFAULT_CONTENT);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setContent(DEFAULT_CONTENT);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTranslate = async (fieldKey: string, sourceText: string, targetLang: 'fr' | 'en') => {
    if (!sourceText.trim()) {
      showMsg('error', 'Texte vide');
      return;
    }

    setIsTranslating(fieldKey);
    try {
      const res = await fetch('/api/proxy/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: sourceText,
          text: sourceText,
          source: 'auto',
          target: targetLang,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = data.translated || data.translatedText || '';

      if (!translated) {
        window.open(
          `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(sourceText.slice(0, 500))}&op=translate`,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }

      if (fieldKey === 'hero') {
        setContent({
          ...content,
          [targetLang === 'en' ? 'hero_text_en' : 'hero_text_fr']: translated,
        });
      } else if (fieldKey.startsWith('section-')) {
        const [, sectionId, field] = fieldKey.split('-');
        setContent({
          ...content,
          sections: (content.sections || []).map(s =>
            s.id === sectionId
              ? {
                  ...s,
                  [targetLang === 'en' ? `${field}_en` : `${field}_fr`]: translated,
                }
              : s
          ),
        });
      }

      showMsg('success', `✨ Traduction complétée`);
    } catch (err) {
      console.error('Translation error:', err);
      showMsg('error', 'Erreur de traduction');
    } finally {
      setIsTranslating(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // ✅ Utiliser UPDATE au lieu de UPSERT
      const { error } = await supabase
        .from('about_page')
        .update({
          hero_text_fr: content.hero_text_fr,
          hero_text_en: content.hero_text_en,
          sections: content.sections,
          contact_email: content.contact_email,
          social_links: content.social_links,
          updated_at: new Date().toISOString(),
        })
        .eq('id', content.id || '123e4567-e89b-12d3-a456-426614174000');

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      showMsg('success', '✅ Contenu sauvegardé');
    } catch (err: any) {
      console.error('Error saving:', err);
      showMsg('error', err.message || 'Erreur de sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setContent({
      ...content,
      sections: (content.sections || []).map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      key: `section-${Date.now()}`,
      title_fr: 'Nouvelle Section',
      title_en: 'New Section',
      text_fr: 'Description...',
      text_en: 'Description...',
      images: [],
      icon: '⭐',
      order: (content.sections || []).length + 1,
    };
    setContent({
      ...content,
      sections: [...(content.sections || []), newSection],
    });
  };

  const removeSection = (sectionId: string) => {
    setContent({
      ...content,
      sections: (content.sections || []).filter(s => s.id !== sectionId),
    });
  };

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      showMsg('error', 'Titre et URL requis');
      return;
    }

    const updatedLinks = [
      ...(content.social_links || []),
      { id: Date.now().toString(), ...newLink },
    ];

    setContent({ ...content, social_links: updatedLinks });
    setNewLink({ title: '', url: '' });
    setIsAddingLink(false);
    showMsg('success', '🔗 Lien ajouté');
  };

  const removeLink = (id: string) => {
    setContent({
      ...content,
      social_links: (content.social_links || []).filter(l => l.id !== id),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
      </div>
    );
  }

  const sections = content.sections || DEFAULT_SECTIONS;
  const socialLinks = content.social_links || [];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          ✨
        </motion.div>
        <div>
          <h2 className="text-3xl font-serif font-bold text-white">À Propos de Lukeni</h2>
          <p className="text-gray-400 text-sm">Page publique bilingue avec galeries</p>
        </div>
      </motion.div>

      {/* HERO SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 p-6 rounded-2xl space-y-4"
      >
        <label className="block text-xs text-[#D4AF37] font-mono tracking-widest uppercase flex items-center gap-2">
          <Sparkles size={14} />
          Texte Héroïque
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FR */}
          <div>
            <label className="block text-xs text-gray-300 mb-2 font-semibold">🇫🇷 Français</label>
            <textarea
              value={content.hero_text_fr}
              onChange={e => setContent({ ...content, hero_text_fr: e.target.value })}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 resize-none"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAutoTranslate('hero', content.hero_text_fr, 'en')}
              disabled={isTranslating === 'hero'}
              className="mt-2 text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isTranslating === 'hero' ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Traduction...
                </>
              ) : (
                <>
                  <Languages size={12} />
                  Traduire en EN
                </>
              )}
            </motion.button>
          </div>

          {/* EN */}
          <div>
            <label className="block text-xs text-gray-300 mb-2 font-semibold">🇬🇧 English</label>
            <textarea
              value={content.hero_text_en}
              onChange={e => setContent({ ...content, hero_text_en: e.target.value })}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 resize-none"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAutoTranslate('hero', content.hero_text_en, 'fr')}
              disabled={isTranslating === 'hero'}
              className="mt-2 text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isTranslating === 'hero' ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Traduction...
                </>
              ) : (
                <>
                  <Languages size={12} />
                  Traduire en FR
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* SECTIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-lg font-serif font-bold text-white flex items-center gap-2">
            📚 Sections Principales ({sections.length})
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addSection}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg border border-[#D4AF37]/30 text-xs font-bold hover:bg-[#D4AF37]/30 transition-all"
          >
            <Plus size={14} />
            Ajouter une section
          </motion.button>
        </div>

        <AnimatePresence>
          {sections.map(section => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden"
            >
              {/* HEADER */}
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === section.id ? null : section.id)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-2xl">{section.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{section.title_fr}</p>
                    <p className="text-xs text-gray-500 italic">{section.title_en}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={20} className="text-[#D4AF37]" />
                </motion.div>
              </button>

              {/* CONTENT */}
              <AnimatePresence>
                {expandedSection === section.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/5 bg-black/20 px-6 py-6 space-y-6"
                  >
                    {/* ICON */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-mono">Emoji</label>
                      <input
                        type="text"
                        value={section.icon}
                        onChange={e => updateSection(section.id, { icon: e.target.value })}
                        maxLength={2}
                        className="w-24 bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-center text-2xl outline-none focus:border-[#D4AF37]/50"
                      />
                    </div>

                    {/* TITLES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 font-mono">🇫🇷 Titre</label>
                        <input
                          type="text"
                          value={section.title_fr}
                          onChange={e => updateSection(section.id, { title_fr: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 font-mono">🇬🇧 Title</label>
                        <input
                          type="text"
                          value={section.title_en}
                          onChange={e => updateSection(section.id, { title_en: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                    </div>

                    {/* TEXTS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs text-gray-400 font-mono">📝 Texte FR</label>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() =>
                              handleAutoTranslate(
                                `section-${section.id}-text`,
                                section.text_fr,
                                'en'
                              )
                            }
                            disabled={isTranslating === `section-${section.id}-text`}
                            className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isTranslating === `section-${section.id}-text` ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Languages size={10} />
                            )}
                          </motion.button>
                        </div>
                        <textarea
                          value={section.text_fr}
                          onChange={e => updateSection(section.id, { text_fr: e.target.value })}
                          rows={5}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 resize-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs text-gray-400 font-mono">📝 Text EN</label>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() =>
                              handleAutoTranslate(
                                `section-${section.id}-text`,
                                section.text_en,
                                'fr'
                              )
                            }
                            disabled={isTranslating === `section-${section.id}-text`}
                            className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isTranslating === `section-${section.id}-text` ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Languages size={10} />
                            )}
                          </motion.button>
                        </div>
                        <textarea
                          value={section.text_en}
                          onChange={e => updateSection(section.id, { text_en: e.target.value })}
                          rows={5}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 resize-none"
                        />
                      </div>
                    </div>

                    {/* IMAGES */}
                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-white/10">
                      <label className="block text-xs text-gray-400 mb-3 font-mono flex items-center gap-2">
                        <ImagePlus size={14} className="text-[#D4AF37]" />
                        Galerie d'images ({(section.images || []).length})
                      </label>

                      <ImageUploader
                        label="Ajouter des images"
                        multiple
                        currentUrls={section.images || []}
                        onMultipleUpload={urls => updateSection(section.id, { images: urls })}
                      />

                      {section.images && section.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {section.images.map((img, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative group rounded-lg overflow-hidden border border-white/10"
                            >
                              <img
                                src={img}
                                alt={`Gallery ${idx}`}
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => navigator.clipboard.writeText(img)}
                                  className="p-2 bg-[#D4AF37] text-black rounded-lg hover:bg-[#E5C158] transition-colors"
                                  title="Copier URL"
                                >
                                  <Copy size={14} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() =>
                                    updateSection(section.id, {
                                      images: (section.images || []).filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={14} />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DELETE BUTTON */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => removeSection(section.id)}
                      className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      Supprimer cette section
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CONTACT & SOCIAL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-6 rounded-2xl space-y-4"
      >
        <label className="text-lg font-serif font-bold text-white flex items-center gap-2">
          ✉️ Contact & Liens Sociaux
        </label>

        <div>
          <label className="block text-xs text-gray-400 mb-2 font-mono">Email</label>
          <input
            type="email"
            value={content.contact_email}
            onChange={e => setContent({ ...content, contact_email: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/50"
          />
        </div>

        {/* LINKS */}
        <div className="space-y-2">
          {socialLinks.map(link => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-white/10 group"
            >
              <div className="flex items-center gap-2 flex-1">
                <LinkIcon size={14} className="text-[#D4AF37]" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold">{link.title}</p>
                  <p className="text-gray-500 text-xs truncate">{link.url}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => removeLink(link.id)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* ADD LINK */}
        <AnimatePresence>
          {isAddingLink ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 p-4 bg-[#1a1a1a] rounded-lg border border-white/10"
            >
              <input
                type="text"
                value={newLink.title}
                onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                placeholder="ex: Twitter"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]/50"
              />
              <input
                type="url"
                value={newLink.url}
                onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]/50"
              />
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsAddingLink(false)}
                  className="flex-1 px-3 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addLink}
                  className="flex-1 px-3 py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:bg-[#E5C158]"
                >
                  Ajouter
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddingLink(true)}
              className="w-full px-4 py-2 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg border border-[#D4AF37]/30 hover:bg-[#D4AF37]/30 transition-all text-sm font-bold flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Ajouter un lien
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* SAVE BUTTON */}
      <motion.button
        onClick={handleSave}
        disabled={isSaving}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-[#D4AF37]/50 disabled:opacity-50 transition-all"
      >
        {isSaving ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Sauvegarde...
          </>
        ) : (
          <>
            <Save size={20} />
            Sauvegarder les modifications
          </>
        )}
      </motion.button>
    </div>
  );
}