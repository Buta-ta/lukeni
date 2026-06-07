'use client';

import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Copy, CheckCircle,
  BookOpen, Users, Lock, Globe, X, Sparkles
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface FormData {
  name: string;
  description: string;
  bookId: string;
  maxMembers: number;
  isPublic: boolean;
}

interface Book {
  id: string;
  title_fr: string;
  title_en: string;
  author_fr: string;
  cover_url: string;
}

export default function CreateCirclePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchBook, setSearchBook] = useState('');
  const [showBookList, setShowBookList] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [createdCircle, setCreatedCircle] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    bookId: '',
    maxMembers: 10,
    isPublic: false,
  });

  // ── Auth check ──
  React.useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
      setIsLoading(false);
    };
    getSession();

    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);
  }, [router]);

  // ── Charger les livres ──
  React.useEffect(() => {
    const loadBooks = async () => {
      const { data } = await supabase
        .from('library_books')
        .select('id, title_fr, title_en, author_fr, author_en, cover_url')
        .eq('status', 'published')
        .limit(100);

      if (data) setBooks(data);
    };
    loadBooks();
  }, []);

  const filteredBooks = books.filter(book => {
    const q = searchBook.toLowerCase();
    return (
      book.title_fr.toLowerCase().includes(q) ||
      book.title_en.toLowerCase().includes(q) ||
      book.author_fr.toLowerCase().includes(q)
    );
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.bookId || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('reading_circles')
        .insert({
          book_id: formData.bookId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          creator_id: user.id,
          max_members: formData.maxMembers,
          is_public: formData.isPublic,
          access_code: undefined, // Auto-généré par la fonction SQL
        })
        .select()
        .single();

      if (error) throw error;

      // Ajouter le créateur comme membre
      await supabase
        .from('circle_members')
        .insert({
          circle_id: data.id,
          user_id: user.id,
          role: 'creator',
          current_page: 1,
        });

      setCreatedCircle(data);
    } catch (err: any) {
      console.error('Create circle error:', err);
      alert(err.message || 'Erreur de création');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData]);

  const handleCopyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <CaurisIcon className="w-12 h-12 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  // ── État : Cercle créé ──
  if (createdCircle) {
    const selectedBook = books.find(b => b.id === createdCircle.book_id);
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/bibliotheque/circles/join?code=${createdCircle.access_code}`;

    return (
      <div className="min-h-screen bg-[#020111] text-white">
        <header className="sticky top-0 z-40 bg-[#020111]/95 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/bibliotheque" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Bibliothèque</span>
            </Link>
            <div className="flex items-center gap-2">
              <CaurisIcon className="w-5 h-5 text-emerald-500" />
              <span className="font-serif text-sm tracking-widest text-white/80">
                {lang === 'fr' ? 'Cercle créé !' : 'Circle created!'}
              </span>
            </div>
          </div>
        </header>

        <main className="relative max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Success card */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
              </motion.div>

              <div>
                <h1 className="text-3xl font-serif font-bold mb-2">
                  {lang === 'fr' ? '🎉 Cercle créé !' : '🎉 Circle created!'}
                </h1>
                <p className="text-gray-400">
                  {lang === 'fr'
                    ? 'Partagez le lien ci-dessous pour inviter des amis'
                    : 'Share the link below to invite friends'}
                </p>
              </div>
            </div>

            {/* Circle info */}
            <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />

              <div className="p-6 space-y-4">
                {selectedBook && (
                  <div className="flex gap-4">
                    <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                      <img src={selectedBook.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                        {lang === 'fr' ? 'Livre sélectionné' : 'Selected book'}
                      </p>
                      <h2 className="text-white font-serif text-xl font-bold mb-1">
                        {selectedBook.title_fr}
                      </h2>
                      <p className="text-gray-400 text-sm">{selectedBook.author_fr}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/[0.06] pt-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-2">
                        {lang === 'fr' ? 'Nom du cercle' : 'Circle name'}
                      </p>
                      <p className="text-white text-lg font-bold">{createdCircle.name}</p>
                    </div>

                    {createdCircle.description && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-2">
                          Description
                        </p>
                        <p className="text-gray-300 text-sm">{createdCircle.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                          {lang === 'fr' ? 'Membres max' : 'Max members'}
                        </p>
                        <p className="text-emerald-400 text-sm font-mono">{createdCircle.max_members}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                          {lang === 'fr' ? 'Visibilité' : 'Visibility'}
                        </p>
                        <div className="flex items-center gap-1 text-emerald-400 text-sm">
                          {createdCircle.is_public ? (
                            <>
                              <Globe size={14} />
                              {lang === 'fr' ? 'Public' : 'Public'}
                            </>
                          ) : (
                            <>
                              <Lock size={14} />
                              {lang === 'fr' ? 'Code requis' : 'Code required'}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Share code */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                  {lang === 'fr' ? 'Code d\'accès' : 'Access code'}
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={createdCircle.access_code}
                    readOnly
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-lg tracking-[0.2em] outline-none"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCopyCode(createdCircle.access_code)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-emerald-500 text-black hover:bg-white transition-colors"
                  >
                    {copiedCode === createdCircle.access_code ? (
                      <CheckCircle size={18} />
                    ) : (
                      <Copy size={18} />
                    )}
                  </motion.button>
                </div>
                <p className="text-gray-600 text-xs mt-2">
                  {lang === 'fr'
                    ? 'Les gens peuvent utiliser ce code pour rejoindre'
                    : 'People can use this code to join'}
                </p>
              </div>

              {/* Share link */}
              <div>
                <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                  {lang === 'fr' ? 'Lien de partage' : 'Share link'}
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none truncate"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedCode('link');
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-emerald-500 text-black hover:bg-white transition-colors"
                  >
                    {copiedCode === 'link' ? (
                      <CheckCircle size={18} />
                    ) : (
                      <Copy size={18} />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/bibliotheque/circles/${createdCircle.id}`)}
                className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold hover:bg-white transition-colors"
              >
                {lang === 'fr' ? '📖 Ouvrir le cercle' : '📖 Open circle'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/bibliotheque')}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                {lang === 'fr' ? '← Retour' : '← Back'}
              </motion.button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Formulaire de création ──
  return (
    <div className="min-h-screen bg-[#020111] text-white">
      <header className="sticky top-0 z-40 bg-[#020111]/95 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/bibliotheque" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Bibliothèque</span>
          </Link>
          <div className="flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-emerald-500" />
            <span className="font-serif text-sm tracking-widest text-white/80">
              {lang === 'fr' ? 'Nouveau cercle' : 'New circle'}
            </span>
          </div>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Hero */}
          <div className="text-center space-y-3 mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">
                  {lang === 'fr' ? 'Lecture collaborative' : 'Collaborative reading'}
                </span>
              </div>
            </motion.div>

            <h1 className="text-4xl font-serif font-bold">
              {lang === 'fr' ? 'Créer un cercle de lecture' : 'Create a reading circle'}
            </h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              {lang === 'fr'
                ? 'Invitez des amis à lire ensemble, en temps réel, avec chat et synchronisation'
                : 'Invite friends to read together, in real time, with chat and sync'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Book selection */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                {lang === 'fr' ? 'Sélectionner un livre *' : 'Select a book *'}
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === 'fr' ? 'Chercher un livre...' : 'Search a book...'}
                  value={searchBook}
                  onChange={(e) => {
                    setSearchBook(e.target.value);
                    setShowBookList(true);
                  }}
                  onFocus={() => setShowBookList(true)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-600"
                />

                <AnimatePresence>
                  {showBookList && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a14]/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
                    >
                      {filteredBooks.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {lang === 'fr' ? 'Aucun livre trouvé' : 'No books found'}
                        </div>
                      ) : (
                        filteredBooks.map(book => (
                          <motion.button
                            key={book.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, bookId: book.id });
                              setSearchBook('');
                              setShowBookList(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/[0.03] last:border-b-0"
                          >
                            <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-white/5">
                              <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-bold truncate">{book.title_fr}</p>
                              <p className="text-gray-500 text-xs truncate">{book.author_fr}</p>
                            </div>
                          </motion.button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {formData.bookId && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2"
                >
                  <BookOpen size={14} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-300 text-sm">
                    {books.find(b => b.id === formData.bookId)?.title_fr}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                {lang === 'fr' ? 'Nom du cercle *' : 'Circle name *'}
              </label>
              <input
                type="text"
                placeholder={lang === 'fr' ? 'Ex: Club Cheikh Anta Diop' : 'Ex: Cheikh Anta Diop Club'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={50}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-600"
              />
              <p className="text-gray-600 text-[10px] mt-1">{formData.name.length}/50</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                Description (optionnel)
              </label>
              <textarea
                placeholder={lang === 'fr'
                  ? 'Décrivez l\'atmosphère du cercle, la fréquence de lecture...'
                  : 'Describe the circle vibe, reading frequency...'}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={200}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors resize-none placeholder:text-gray-600"
              />
              <p className="text-gray-600 text-[10px] mt-1">{formData.description.length}/200</p>
            </div>

            {/* Max members */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                {lang === 'fr' ? 'Nombre max de membres' : 'Max members'}
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                  />
                </div>
                <span className="text-white font-bold text-lg min-w-[3rem] text-right">
                  {formData.maxMembers}
                </span>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                {lang === 'fr' ? 'Visibilité' : 'Visibility'}
              </label>
              <div className="space-y-2">
                {[
                  {
                    key: false,
                    icon: Lock,
                    label_fr: 'Code requis (recommandé)',
                    label_en: 'Code required (recommended)',
                    desc_fr: 'Les gens rejoignent avec un code',
                    desc_en: 'People join with a code'
                  },
                  {
                    key: true,
                    icon: Globe,
                    label_fr: 'Public',
                    label_en: 'Public',
                    desc_fr: 'Visible par tous et recherchable',
                    desc_en: 'Visible to all and searchable'
                  }
                ].map(({ key, icon: Icon, label_fr, label_en, desc_fr, desc_en }) => (
                  <motion.button
                    key={String(key)}
                    type="button"
                    onClick={() => setFormData({ ...formData, isPublic: key })}
                    whileHover={{ scale: 1.01 }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      formData.isPublic === key
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon size={18} className={formData.isPublic === key ? 'text-emerald-400' : 'text-gray-600'} />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-bold ${formData.isPublic === key ? 'text-emerald-300' : 'text-white'}`}>
                        {lang === 'fr' ? label_fr : label_en}
                      </p>
                      <p className="text-gray-600 text-xs">{lang === 'fr' ? desc_fr : desc_en}</p>
                    </div>
                    {formData.isPublic === key && (
                      <CheckCircle size={18} className="text-emerald-400" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!formData.bookId || !formData.name.trim() || isSubmitting}
              className="w-full py-3.5 bg-emerald-500 text-black rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {lang === 'fr' ? 'Création...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Users size={16} />
                  {lang === 'fr' ? 'Créer le cercle' : 'Create circle'}
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}