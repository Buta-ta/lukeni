"use client";

export const dynamic = 'force-dynamic';


import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Library, Loader2, Search, X, Headphones, Download, BookOpen,
  Star, Heart, MessageCircle, Send, Play, Pause, Plus,
  Sparkles, Lightbulb, User as UserIcon, Globe, Upload,
  FileText, Music, ChevronRight, Check, ExternalLink, AlertCircle
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import SpaceHeader from '@/components/SpaceHeader';
import FavoriteButton from '@/components/FavoriteButton';
import { useOpenLibrary, useLibGen } from '@/lib/hooks/useOpenLibrary';
import type { EnrichedOLBook } from '@/lib/hooks/useOpenLibrary';
import { NotesplitContainer } from '@/components/NotesplitContainer';
import CloudinaryPDFReader from '@/components/CloudinaryPDFReader';

// ============================================================================
// TYPES
// ============================================================================

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=60';

interface Category { id: string; name_fr: string; name_en: string; color: string; }
interface Book {
  id: string; title_fr: string; title_en: string; author_fr: string; author_en: string;
  cover_url: string; description_fr: string; description_en: string;
  file_url: string; audio_url: string; has_audio: boolean; access_type: string;
  status: string; category_id: string; categories: Category;
}
interface BookComment { id: string; user_email: string; content: string; created_at: string; }
interface CollageSlot { id: string; slot_index: number; url: string | null; label: string; is_active: boolean; }
interface CollageSettings { layout_index: number; collage_enabled: boolean; }
type SubmissionType = 'full_book' | 'audio_book' | 'suggestion';

// ============================================================================
// LAYOUTS
// ============================================================================

const COLLAGE_LAYOUTS: { name: string; areas: string }[] = [
  { name: 'Classique', areas: `"a a b c" "a a d c" "e f f c" "e g h i"` },
  { name: 'Centrale', areas: `"a b b c" "d b b e" "d f g e" "h f g i"` },
  { name: 'Bandes', areas: `"a a a b" "c d e b" "c f f g" "h h i i"` },
  { name: 'Mosaïque', areas: `"a b c d" "a e e d" "f e e g" "f h h i"` },
  { name: 'Colonne', areas: `"a b c c" "a d e e" "a f g h" "a i i h"` },
];

const SLOT_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(date: string, lang: 'fr' | 'en'): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return lang === 'fr' ? "à l'instant" : 'just now';
  if (s < 3600) return lang === 'fr' ? `il y a ${Math.floor(s / 60)}m` : `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return lang === 'fr' ? `il y a ${Math.floor(s / 3600)}h` : `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// CAURIS ICON
// ============================================================================

const CaurisIcon = memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
));
CaurisIcon.displayName = 'CaurisIcon';

// ============================================================================
// COLLAGE BACKGROUND
// ============================================================================

const CollageBackground = memo(({ slots, settings }: {
  slots: CollageSlot[];
  settings: CollageSettings | null;
}) => {
  if (!settings?.collage_enabled) return null;
  const layout = COLLAGE_LAYOUTS[settings.layout_index ?? 0];
  const activeSlots = slots.filter(s => s.is_active);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 hidden md:grid gap-1 p-1"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gridTemplateAreas: layout.areas }}>
        {SLOT_LETTERS.map((letter, idx) => {
          const slot = activeSlots.find(s => s.slot_index === idx);
          return (
            <div key={idx} className="relative overflow-hidden rounded-sm" style={{ gridArea: letter }}>
              {slot?.url ? (
                <><img src={slot.url} alt="" loading="lazy" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-[#020111]/40" /></>
              ) : (
                <div className="w-full h-full bg-[#0a0a18]" />
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 md:hidden grid gap-1 p-1"
        style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}>
        {activeSlots.slice(0, 9).map((slot, idx) => (
          <div key={idx} className={`relative overflow-hidden rounded-sm ${idx === 0 ? 'col-span-2' : ''}`}>
            {slot?.url ? (
              <><img src={slot.url} alt="" loading="lazy" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-[#020111]/40" /></>
            ) : <div className="w-full h-full bg-[#0a0a18]" />}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 z-10"
        style={{ background: `linear-gradient(to bottom, rgba(2,1,17,0.82) 0%, rgba(3,3,43,0.75) 40%, rgba(3,3,43,0.80) 70%, rgba(0,0,0,0.92) 100%)` }} />
      <div className="absolute bottom-0 left-0 right-0 h-64 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(16,185,129,0.06) 0%, transparent 100%)' }} />
      <div className="absolute inset-0 z-10 pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <motion.div key={i} className="absolute rounded-full bg-white"
            style={{ width: Math.random() * 1.5 + 0.5, height: Math.random() * 1.5 + 0.5, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: Math.random() * 4 + 3, repeat: Infinity, delay: Math.random() * 6, ease: 'easeInOut' }} />
        ))}
      </div>
    </div>
  );
});
CollageBackground.displayName = 'CollageBackground';

// ============================================================================
// LOADING SCREEN
// ============================================================================

const LoadingScreen = memo(({ lang }: { lang: 'fr' | 'en' }) => (
  <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
    className="fixed inset-0 z-[9999] bg-[#020111] flex flex-col items-center justify-center gap-8">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
      <CaurisIcon className="w-20 h-20 text-emerald-500" />
    </motion.div>
    <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      className="text-emerald-500 text-xs tracking-[0.4em] font-light uppercase">
      {lang === 'fr' ? 'Chargement de la bibliothèque...' : 'Loading the library...'}
    </motion.p>
  </motion.div>
));
LoadingScreen.displayName = 'LoadingScreen';

// ============================================================================
// STAR RATING
// ============================================================================

const StarRating = memo(({ rating, onRate, size = 16, readonly = false }: {
  rating: number; onRate?: (r: number) => void; size?: number; readonly?: boolean;
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <motion.button key={s} whileHover={!readonly ? { scale: 1.2 } : {}}
        onClick={() => !readonly && onRate?.(s)}
        className={readonly ? 'cursor-default' : 'cursor-pointer'} disabled={readonly}>
        <Star size={size} className={s <= rating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-gray-700'} />
      </motion.button>
    ))}
  </div>
));
StarRating.displayName = 'StarRating';

// ============================================================================
// READ STATUS BADGE — Composant autonome sans dépendance à lucide Lock
// ============================================================================

const LockIcon = memo(({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
));
LockIcon.displayName = 'LockIcon';

type ReadStatus = 'public' | 'borrow' | 'unknown' | 'loading';

const ReadStatusBadge = memo(({ status, lang }: { status: ReadStatus; lang: 'fr' | 'en' }) => {
  const config: Record<ReadStatus, { icon: React.ReactNode; label: string; className: string }> = {
    public: {
      icon: <Globe size={11} />,
      label: lang === 'fr' ? 'Domaine public — Lecture libre' : 'Public domain — Free reading',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    borrow: {
      icon: <LockIcon size={11} />,
      label: lang === 'fr' ? 'Emprunt requis (Open Library)' : 'Borrow required (Open Library)',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    unknown: {
      icon: <AlertCircle size={11} />,
      label: lang === 'fr' ? 'Disponibilité inconnue' : 'Availability unknown',
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    },
    loading: {
      icon: <Loader2 size={11} className="animate-spin" />,
      label: lang === 'fr' ? 'Vérification...' : 'Checking...',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
});
ReadStatusBadge.displayName = 'ReadStatusBadge';

// ============================================================================
// BORROW SCREEN
// ============================================================================

const BorrowScreen = memo(({ book, lang, olPageUrl }: {
  book: EnrichedOLBook; lang: 'fr' | 'en'; olPageUrl: string;
}) => (
  <div className="flex flex-col items-center justify-center h-full px-8 py-16 text-center overflow-y-auto">
    <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
      <LockIcon size={36} className="text-amber-400" />
    </div>

    <h3 className="text-white text-xl font-serif font-bold mb-3">
      {lang === 'fr' ? 'Emprunt numérique requis' : 'Digital borrow required'}
    </h3>

    <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-6">
      {lang === 'fr'
        ? "Ce livre est sous droit d'auteur. Open Library utilise le Prêt Numérique Contrôlé (CDL) : vous devez emprunter ce livre gratuitement sur Open Library pour le lire."
        : 'This book is under copyright. Open Library uses Controlled Digital Lending (CDL): you must borrow this book for free on Open Library to read it.'}
    </p>

    <div className="flex flex-col items-start gap-2 mb-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl max-w-md w-full">
      {(lang === 'fr'
        ? ['1. Créez un compte gratuit sur openlibrary.org', '2. Cliquez "Emprunter"', '3. Lisez dans votre navigateur']
        : ['1. Create a free account on openlibrary.org', '2. Click "Borrow"', '3. Read in your browser']
      ).map((step, i) => (
        <p key={i} className="text-amber-300/70 text-xs">{step}</p>
      ))}
    </div>

    <div className="flex flex-col sm:flex-row gap-3">
      <a href={olPageUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors">
        <ExternalLink size={16} />
        {lang === 'fr' ? 'Emprunter sur Open Library' : 'Borrow on Open Library'}
      </a>
      <a href="https://archive.org/account/login" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-white/5 text-gray-300 px-6 py-3 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-colors">
        {lang === 'fr' ? 'Créer un compte' : 'Create account'}
      </a>
    </div>

    {book.cover_i && (
      <div className="mt-8 opacity-20">
        <img src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`} alt=""
          className="w-24 rounded-lg mx-auto" />
      </div>
    )}
  </div>
));
BorrowScreen.displayName = 'BorrowScreen';

// ============================================================================
// OPEN LIBRARY READER
// ============================================================================

interface OpenLibraryReaderProps {
  book: EnrichedOLBook;
  lang: 'fr' | 'en';
  userId?: string;
  onClose: () => void;
}

const OpenLibraryReader = memo(({ book, lang, userId, onClose }: OpenLibraryReaderProps) => {
  const [readStatus, setReadStatus] = useState<ReadStatus>(book.readStatus || 'loading');
  const [embedUrl, setEmbedUrl] = useState<string | null>(book.embedUrl || null);
  const [olPageUrl, setOlPageUrl] = useState(`https://openlibrary.org${book.key}`);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    // Si on a déjà toutes les infos, pas besoin de fetch
    if (book.readStatus !== 'unknown' && book.embedUrl) {
      setReadStatus(book.readStatus);
      setEmbedUrl(book.embedUrl);
      return;
    }

    // Sinon, cherche les éditions pour trouver l'OCAID
    setReadStatus('loading');

    const fetchReadUrl = async () => {
      try {
        const res = await fetch(`https://openlibrary.org${book.key}/editions.json?limit=10`);
        const data = await res.json();
        const editions: Array<{
          key?: string; ocaid?: string; public_scan_b?: boolean;
        }> = data.entries || [];

        // Cherche d'abord édition domaine public
        const publicEd = editions.find(e => e.ocaid && e.public_scan_b);
        if (publicEd?.ocaid) {
          setReadStatus('public');
          setEmbedUrl(`https://archive.org/embed/${publicEd.ocaid}?ui=embed#mode/1up`);
          setOlPageUrl(`https://openlibrary.org${publicEd.key || book.key}`);
          return;
        }

        // Sinon édition avec OCAID (emprunt)
        const borrowEd = editions.find(e => e.ocaid);
        if (borrowEd?.ocaid) {
          setReadStatus('borrow');
          setOlPageUrl(`https://openlibrary.org${borrowEd.key || book.key}`);
          return;
        }

        setReadStatus('unknown');
      } catch {
        setReadStatus('unknown');
      }
    };

    fetchReadUrl();
  }, [book.key, book.readStatus, book.embedUrl]);

  const title = book.title;
  const author = book.author_name?.[0] || '';
  const cover = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
    : null;

  // ID stable pour les notes
  const noteItemId = `ol_${book.key.replace(/\//g, '_')}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-[#020111] flex flex-col"
      >
        {/* ── Header ── */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#0a0a14] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {cover && (
              <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0">
                <img src={cover} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-white text-sm font-bold truncate">{title}</h3>
              {author && <p className="text-gray-500 text-[10px] truncate">{author}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <ReadStatusBadge status={readStatus} lang={lang} />
            <a href={olPageUrl} target="_blank" rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-blue-400 transition-colors" title="Open Library">
              <ExternalLink size={16} />
            </a>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 overflow-hidden relative">
          {/* Loading */}
          {readStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
                <p className="text-gray-500 text-sm">
                  {lang === 'fr' ? 'Vérification de la disponibilité...' : 'Checking availability...'}
                </p>
              </div>
            </div>
          )}

          {/* Lecture directe — iframe Internet Archive */}
          {readStatus === 'public' && embedUrl && (
            <>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#020111] backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 size={28} className="animate-spin text-emerald-500" />
                    <p className="text-gray-500 text-xs">
                      {lang === 'fr' ? 'Chargement du livre...' : 'Loading book...'}
                    </p>
                  </div>
                </div>
              )}
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                title={title}
                loading="lazy"
                allow="fullscreen"
                onLoad={() => setIframeLoaded(true)}
                onError={() => {
                  setIframeLoaded(false);
                  setReadStatus('unknown');
                }}
                style={{ background: '#1a1a2e' }}
              />
            </>
          )}

          {/* Emprunt requis ou inconnu */}
          {(readStatus === 'borrow' || readStatus === 'unknown') && (
            <BorrowScreen book={book} lang={lang} olPageUrl={olPageUrl} />
          )}
        </div>

        {/* ── Footer domaine public ── */}
        {readStatus === 'public' && (
          <div className="h-10 flex items-center justify-center gap-4 border-t border-white/[0.06] bg-[#0a0a14] flex-shrink-0">
            <Globe size={12} className="text-emerald-500/60" />
            <span className="text-[10px] text-gray-600">
              {lang === 'fr'
                ? 'Livre du domaine public via Internet Archive & Open Library'
                : 'Public domain book via Internet Archive & Open Library'}
            </span>
            {embedUrl && (
              <a
                href={embedUrl.replace('embed/', '').split('?')[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400/60 hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <ExternalLink size={10} />
                {lang === 'fr' ? 'Ouvrir dans Archive.org' : 'Open in Archive.org'}
              </a>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Panel Notes — flotte indépendamment ── */}
      {userId && (
        <NotesplitContainer
          itemId={noteItemId}
          itemType="book"
          userId={userId}
          catColor="#3B82F6"
          lang={lang}

        >
          <div />
        </NotesplitContainer>
      )}
    </>
  );
});
OpenLibraryReader.displayName = 'OpenLibraryReader';

// ============================================================================
// ADD BOOK MODAL
// ============================================================================

const AddBookModal = memo(({ isOpen, onClose, lang, user }: {
  isOpen: boolean; onClose: () => void; lang: 'fr' | 'en'; user: User | null;
}) => {
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [submissionType, setSubmissionType] = useState<SubmissionType | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setStep('choose'); setSubmissionType(null);
    setTitle(''); setAuthor(''); setDescription('');
    setCoverUrl(''); setFileUrl(''); setAudioUrl('');
    setSuccess(false);
  }, []);

  const handleClose = useCallback(() => { resetAll(); onClose(); }, [resetAll, onClose]);

  const openCloudinaryWidget = useCallback((fieldName: string, resourceType: string) => {
    setUploadingField(fieldName);
    const doUpload = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'], multiple: false,
        maxFileSize: 100_000_000,
        folder: 'lukeni/library/submissions',
        resourceType,
      }, (error: any, result: any) => {
        setUploadingField(null);
        if (error) return;
        if (result.event === 'success') {
          const url = result.info.secure_url;
          if (fieldName === 'cover') setCoverUrl(url);
          else if (fieldName === 'file') setFileUrl(url);
          else if (fieldName === 'audio') setAudioUrl(url);
        }
      });
      widget.open();
    };
    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = doUpload;
      document.body.appendChild(script);
    } else { doUpload(); }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !title.trim()) return;
    setIsSubmitting(true);
    try {
      await supabase.from('book_suggestions').insert({
        title, author: author || null, description: description || null,
        user_email: user.email, status: 'pending',
        submission_type: submissionType,
        cover_url: coverUrl || null, file_url: fileUrl || null,
        audio_url: audioUrl || null,
        has_audio: submissionType === 'audio_book' || !!audioUrl,
      });
      setSuccess(true);
      setTimeout(() => handleClose(), 2500);
    } catch (err) { console.error(err); }
    setIsSubmitting(false);
  }, [user, title, author, description, submissionType, coverUrl, fileUrl, audioUrl, handleClose]);

  if (!isOpen) return null;

  const typeConfig = {
    full_book: {
      icon: <FileText size={28} className="text-emerald-400" />,
      label: lang === 'fr' ? 'Ajouter un livre' : 'Add a book',
      sublabel: lang === 'fr' ? 'PDF, EPUB — tout format' : 'PDF, EPUB — any format',
      desc: lang === 'fr' ? 'Partagez un livre numérique' : 'Share a digital book',
    },
    audio_book: {
      icon: <Music size={28} className="text-purple-400" />,
      label: lang === 'fr' ? 'Livre audio' : 'Audio book',
      sublabel: lang === 'fr' ? 'MP3, enregistrement' : 'MP3, recording',
      desc: lang === 'fr' ? 'Partagez un livre audio' : 'Share an audio book',
    },
    suggestion: {
      icon: <Lightbulb size={28} className="text-amber-400" />,
      label: lang === 'fr' ? 'Suggérer un livre' : 'Suggest a book',
      sublabel: lang === 'fr' ? 'Sans fichier' : 'Without file',
      desc: lang === 'fr' ? "Recommandez un titre à l'admin" : 'Recommend a title to admin',
    },
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        onClick={handleClose}>
        <motion.div initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 24 }} transition={{ duration: 0.28 }}
          onClick={e => e.stopPropagation()}
          className="relative bg-gradient-to-br from-[#0d0d1a] via-[#0a0a14] to-black border border-emerald-500/20 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide shadow-[0_0_80px_rgba(16,185,129,0.12)]">
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <button onClick={handleClose} className="absolute top-4 right-4 z-10 p-2 text-gray-600 hover:text-white transition-colors"><X size={20} /></button>

          {success ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                <Check size={40} className="text-emerald-400" />
              </motion.div>
              <h3 className="text-2xl font-serif text-white mb-3">{lang === 'fr' ? 'Demande envoyée !' : 'Request sent!'}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {lang === 'fr' ? "L'administrateur examinera votre demande." : 'The administrator will review your request.'}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500/70">
                <CaurisIcon className="w-4 h-4" />
                <span>{lang === 'fr' ? 'En attente de validation' : 'Pending validation'}</span>
              </div>
            </div>
          ) : step === 'choose' ? (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <CaurisIcon className="w-8 h-8 text-emerald-500" />
                <div>
                  <h2 className="text-xl font-serif text-white">{lang === 'fr' ? 'Contribuer' : 'Contribute'}</h2>
                  <p className="text-gray-600 text-[10px] tracking-[0.2em] uppercase">{lang === 'fr' ? 'Que voulez-vous faire ?' : 'What would you like to do?'}</p>
                </div>
              </div>
              {!user ? (
                <div className="text-center py-8">
                  <UserIcon size={40} className="mx-auto text-gray-700 mb-4" />
                  <p className="text-gray-400 mb-6 text-sm">{lang === 'fr' ? 'Connectez-vous pour contribuer.' : 'Sign in to contribute.'}</p>
                  <Link href="/auth" className="inline-flex items-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors">
                    {lang === 'fr' ? 'Se connecter' : 'Sign in'}<ChevronRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Object.entries(typeConfig) as [SubmissionType, typeof typeConfig['full_book']][]).map(([type, config]) => (
                    <motion.button key={type} whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSubmissionType(type); setStep('form'); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all text-left group">
                      <div className="p-3 rounded-xl bg-white/[0.05] flex-shrink-0">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{config.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{config.sublabel}</p>
                        <p className="text-gray-600 text-[11px] mt-1">{config.desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8">
              <button onClick={() => { setStep('choose'); setSubmissionType(null); }}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-6">
                <ChevronRight size={16} className="rotate-180" />{lang === 'fr' ? 'Retour' : 'Back'}
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/[0.05] rounded-2xl">
                  {submissionType && typeConfig[submissionType].icon}
                </div>
                <div>
                  <h2 className="text-xl font-serif text-white">{submissionType && typeConfig[submissionType].label}</h2>
                  <p className="text-gray-600 text-[10px] tracking-wider uppercase">{lang === 'fr' ? 'En attente de validation admin' : 'Pending admin validation'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">{lang === 'fr' ? 'Titre *' : 'Title *'}</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder={lang === 'fr' ? 'Titre du livre' : 'Book title'}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">{lang === 'fr' ? 'Auteur' : 'Author'}</label>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
                    placeholder="Ex: Cheikh Anta Diop"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">{lang === 'fr' ? 'Description' : 'Description'}</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors resize-none placeholder:text-gray-600"
                    placeholder={submissionType === 'suggestion'
                      ? (lang === 'fr' ? 'Pourquoi ce livre mérite sa place...' : 'Why this book deserves its place...')
                      : (lang === 'fr' ? 'Résumé ou note...' : 'Summary or note...')} />
                </div>
                {submissionType !== 'suggestion' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">{lang === 'fr' ? 'Fichiers (optionnel)' : 'Files (optional)'}</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['cover', ...(submissionType === 'full_book' ? ['file'] : []), 'audio'].map(field => {
                        const url = field === 'cover' ? coverUrl : field === 'file' ? fileUrl : audioUrl;
                        const resourceType = field === 'cover' ? 'image' : field === 'audio' ? 'audio' : 'auto';
                        const icons: Record<string, string> = { cover: '🖼️', file: '📄', audio: '🎵' };
                        return (
                          <button key={field} type="button"
                            onClick={() => openCloudinaryWidget(field, resourceType)}
                            className={`p-3 border rounded-xl text-xs flex flex-col items-center gap-2 transition-all ${url ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                            {uploadingField === field ? <Loader2 size={18} className="animate-spin" /> : <span className="text-lg">{icons[field]}</span>}
                            <span>{url ? '✓' : (field === 'cover' ? (lang === 'fr' ? 'Couverture' : 'Cover') : field === 'file' ? 'PDF/EPUB' : 'Audio')}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-gray-700 text-[10px] mt-2">{lang === 'fr' ? "Fichiers optionnels — l'admin peut les ajouter après." : 'Optional files — admin can add them later.'}</p>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl">
                  <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300/70 text-[11px] leading-relaxed">
                    {lang === 'fr' ? "Votre demande sera examinée avant publication." : 'Your request will be reviewed before publication.'}
                  </p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit} disabled={!title.trim() || isSubmitting}
                  className="w-full py-3.5 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting
                    ? <><Loader2 size={16} className="animate-spin" />{lang === 'fr' ? 'Envoi...' : 'Sending...'}</>
                    : <><Sparkles size={16} />{lang === 'fr' ? 'Envoyer la demande' : 'Send request'}</>}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
AddBookModal.displayName = 'AddBookModal';

// ============================================================================
// BOOK CARD
// ============================================================================

const BookCard = memo(({ book, index, lang, onClick }: {
  book: Book; index: number; lang: 'fr' | 'en'; onClick: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const catColor = book.categories?.color || '#10B981';

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: '-30px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.45 }}
      className="group relative cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(16,185,129,0.2)]">
        <div className="absolute left-0 top-0 bottom-0 w-2 z-10 rounded-l-xl"
          style={{ background: `linear-gradient(to right, ${catColor}80, transparent)` }} />
        <img src={book.cover_url || FALLBACK_COVER} alt="" loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute top-2 left-3 right-3 flex items-start justify-between z-10">
          <div className="flex flex-col gap-1">
            {book.categories && (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider backdrop-blur-sm"
                style={{ backgroundColor: `${catColor}30`, color: catColor }}>
                {lang === 'fr' ? book.categories.name_fr : book.categories.name_en}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {book.has_audio && <span className="w-6 h-6 rounded-full bg-purple-500/70 backdrop-blur-sm flex items-center justify-center"><Headphones size={11} className="text-white" /></span>}
            {book.access_type === 'read_and_download' && <span className="w-6 h-6 rounded-full bg-blue-500/70 backdrop-blur-sm flex items-center justify-center"><Download size={11} className="text-white" /></span>}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <h3 className="text-white text-sm font-bold line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
            {lang === 'fr' ? book.title_fr : book.title_en}
          </h3>
          <p className="text-gray-400 text-[11px] mt-1 truncate">{lang === 'fr' ? book.author_fr : book.author_en}</p>
        </div>
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1px ${catColor}40` }} />
      </div>
    </motion.div>
  );
});
BookCard.displayName = 'BookCard';

// ============================================================================
// AUDIO PLAYER
// ============================================================================

const AudioPlayer = memo(({ url, title, cover }: { url: string; title: string; cover: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause(); else a.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      <motion.div animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? { duration: 4, repeat: Infinity, ease: 'linear' } : { duration: 0.5 }} className="mb-8">
        <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <img src={cover || FALLBACK_COVER} alt="" className="w-full h-full object-cover" />
        </div>
      </motion.div>
      <h3 className="text-white text-lg font-serif font-bold mb-8 text-center max-w-md">{title}</h3>
      <div className="w-full max-w-md space-y-3">
        <input type="range" min="0" max={duration || 0} step="0.1" value={progress}
          onChange={e => {
            const t = parseFloat(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setProgress(t);
          }}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500" />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>{formatTime(progress)}</span><span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-center">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-black hover:bg-white transition-colors shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </motion.button>
        </div>
      </div>
      <audio ref={audioRef} src={url}
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)} />
    </div>
  );
});
AudioPlayer.displayName = 'AudioPlayer';

// ============================================================================
// BOOK DETAIL MODAL
// ============================================================================

const BookDetailModal = memo(({ book, lang, user, onClose }: {
  book: Book; lang: 'fr' | 'en'; user: User | null; onClose: () => void;
}) => {

  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [comments, setComments] = useState<BookComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  // ✅ Auto-ouvrir si c'est un livre Lukeni avec PDF
  const [showReader, setShowReader] = useState(!!book.file_url && book.access_type !== 'external_link');
  const [readerMode, setReaderMode] = useState<'pdf' | 'audio'>(book.file_url ? 'pdf' : 'audio');
  const [iframeLoadError, setIframeLoadError] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const title = lang === 'fr' ? book.title_fr : book.title_en;
  const author = lang === 'fr' ? book.author_fr : book.author_en;
  const desc = lang === 'fr' ? book.description_fr : book.description_en;
  const catColor = book.categories?.color || '#10B981';

  // ✅ Valider l'URL du PDF
  const isValidPdfUrl = useCallback((url: string) => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      // Vérifier que c'est un PDF ou une URL valide
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);


  // ✅ NOUVEAU — à placer juste après isValidPdfUrl
  const getPdfDisplayUrl = useCallback((originalUrl: string) => {
    if (!originalUrl) return '';
    const isCloudinary = originalUrl.includes('cloudinary.com');
    if (isCloudinary) {
      return `/api/pdf-proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    return originalUrl;
  }, []);

  useEffect(() => {
    loadBookData();

    // ✅ Vérifier si le PDF est accessible
    if (book.file_url && !isValidPdfUrl(book.file_url)) {
      setIframeLoadError(true);
      setIsIframeLoading(false);
    }

    (async () => {
      try {
        const { error } = await supabase.rpc('increment_book_views', { book_id: book.id });
        if (error) console.warn('View count:', error.message);
      } catch (err) { console.warn('View count error:', err); }
    })();
  }, [book.id, user?.id, isValidPdfUrl, book.file_url]);

  const loadBookData = useCallback(async () => {
    try {
      const [ratingsRes, commentsRes] = await Promise.all([
        supabase
          .from('book_ratings')
          .select('rating, user_id')
          .eq('book_id', book.id),
        supabase
          .from('book_comments')
          .select('*')
          .eq('book_id', book.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (ratingsRes.data) {
        const ratings = ratingsRes.data.map((r) => r.rating);
        setAvgRating(
          ratings.length
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0
        );
        setRatingCount(ratings.length);
        if (user) {
          const userRatingData = ratingsRes.data.find(
            (r) => r.user_id === user.id
          );
          setUserRating(userRatingData?.rating ?? 0);
        }
      }

      if (commentsRes.data) setComments(commentsRes.data);
    } catch (err) {
      console.error('loadBookData error:', err);
    }
  }, [book.id, user]);

  // ✅ Callback synchronisé avec FavoriteButton
  const handleLikeChange = useCallback((newCount: number) => {
    setLikeCount(newCount);
  }, []);

  async function handleRate(rating: number) {
    if (!user) return;
    await supabase.from('book_ratings').upsert(
      { user_id: user.id, book_id: book.id, rating },
      { onConflict: 'user_id,book_id' }
    );
    setUserRating(rating);
    loadBookData();
  }

  async function handleComment() {
    if (!user || !newComment.trim()) return;
    setIsSubmittingComment(true);
    const { error } = await supabase.from('book_comments').insert({
      user_id: user.id,
      book_id: book.id,
      user_email: user.email,
      content: newComment.trim(),
    });
    if (!error) {
      setNewComment('');
      loadBookData();
    }
    setIsSubmittingComment(false);
  }

  const handleDownload = useCallback(() => {
    if (!book.file_url) return;
    const link = document.createElement('a');
    link.href = book.file_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    (async () => {
      try {
        const { error } = await supabase.rpc('increment_book_downloads', {
          book_id: book.id,
        });
        if (error) console.warn('Download count:', error.message);
      } catch (err) {
        console.warn('Download count error:', err);
      }
    })();
  }, [book.file_url, book.id]);

  if (showReader) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] bg-[#020111] flex flex-col"
        >
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#0a0a14]">
            <div className="flex items-center gap-3 min-w-0">
              <CaurisIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <h3 className="text-white text-sm font-bold truncate">{title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <StarRating rating={userRating} onRate={handleRate} size={14} />
              <button
                onClick={() => setShowReader(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {readerMode === 'pdf' && book.file_url ? (
              <CloudinaryPDFReader
                url={getPdfDisplayUrl(book.file_url)}
                title={title}
                lang={lang}
              />
            ) : readerMode === 'audio' && book.audio_url ? (
              <AudioPlayer url={book.audio_url} title={title} cover={book.cover_url} />
            ) : null}
          </div>
          {book.has_audio && book.file_url && (
            <div className="h-12 flex items-center justify-center gap-4 border-t border-white/10 bg-[#0a0a14]">
              <button
                onClick={() => setReaderMode('pdf')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${readerMode === 'pdf'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                <BookOpen size={14} />
                {lang === 'fr' ? 'Document' : 'Document'}
              </button>
              <button
                onClick={() => setReaderMode('audio')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${readerMode === 'audio'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                <Headphones size={14} />
                {lang === 'fr' ? 'Audio' : 'Audio'}
              </button>
            </div>
          )}
        </motion.div>
        <NotesplitContainer
          itemId={book.id}
          itemType="book"
          userId={user?.id}
          catColor="#10B981"
          lang={lang}
        >
          <div />
        </NotesplitContainer>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-[0_0_80px_rgba(16,185,129,0.08)]"
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-gray-600 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative w-40 md:w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 z-10"
                  style={{
                    background: `linear-gradient(to right, ${catColor}80, transparent)`,
                  }}
                />
                <img
                  src={book.cover_url || FALLBACK_COVER}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              {book.categories && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider mb-3"
                  style={{
                    backgroundColor: `${catColor}20`,
                    color: catColor,
                  }}
                >
                  {lang === 'fr'
                    ? book.categories.name_fr
                    : book.categories.name_en}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-serif text-white mb-2 leading-tight">
                {title}
              </h2>
              <p className="text-gray-400 text-sm mb-4">{author}</p>
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <StarRating rating={userRating} onRate={handleRate} size={20} />
                <span className="text-sm text-gray-400">
                  {avgRating.toFixed(1)}{' '}
                  <span className="text-gray-600">({ratingCount})</span>
                </span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                {/* ✅ Passer le callback onLikeChange */}
                <FavoriteButton
                  itemType="book"
                  itemId={book.id}
                  size={16}
                  onLikeChange={handleLikeChange}
                />
                <span className="text-sm font-bold text-gray-400">
                  {likeCount} {lang === 'fr' ? 'Favori' : 'Favorite'}
                  {likeCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          {desc && (
            <div className="mb-6 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mb-8">
            {book.file_url && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowReader(true);
                  setReaderMode('pdf');
                }}
                className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <BookOpen size={18} />
                {lang === 'fr' ? 'Lire' : 'Read'}
              </motion.button>
            )}
            {book.has_audio && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowReader(true);
                  setReaderMode('audio');
                }}
                className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-6 py-3 rounded-xl font-bold text-sm border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                <Headphones size={18} />
                {lang === 'fr' ? 'Écouter' : 'Listen'}
              </motion.button>
            )}
            {book.access_type === 'read_and_download' && book.file_url && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-6 py-3 rounded-xl font-bold text-sm border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                <Download size={18} />
                {lang === 'fr' ? 'Télécharger' : 'Download'}
              </motion.button>
            )}
          </div>
          <div className="border-t border-white/[0.06] pt-6">
            <h3 className="flex items-center gap-2 text-white font-bold text-sm mb-4">
              <MessageCircle size={16} className="text-emerald-500" />
              {lang === 'fr' ? 'Commentaires' : 'Comments'}{' '}
              <span className="text-gray-600 font-normal">
                ({comments.length})
              </span>
            </h3>
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto scrollbar-hide">
              {comments.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">
                  {lang === 'fr'
                    ? 'Aucun commentaire. Soyez le premier !'
                    : 'No comments yet. Be the first!'}
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    {(c.user_email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-xs font-bold">
                        {c.user_email?.split('@')[0]}
                      </span>
                      <span className="text-gray-600 text-[10px]">
                        {timeAgo(c.created_at, lang)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {user ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder={
                    lang === 'fr'
                      ? 'Écrire un commentaire...'
                      : 'Write a comment...'
                  }
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/40 transition-colors placeholder:text-gray-600"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="p-3 bg-emerald-500 text-black rounded-xl hover:bg-white transition-colors disabled:opacity-30"
                >
                  {isSubmittingComment ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </motion.button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="block text-center py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-400 text-sm hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
              >
                {lang === 'fr'
                  ? 'Connectez-vous pour commenter'
                  : 'Sign in to comment'}
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
BookDetailModal.displayName = 'BookDetailModal';

// ============================================================================
// HERO SECTION
// ============================================================================

const HeroSection = memo(({ lang, bookCount }: { lang: 'fr' | 'en'; bookCount: number }) => {
  const titleChars = (lang === 'fr' ? 'Bibliothèque' : 'Library').split('');
  return (
    <div className="relative text-center py-16 md:py-24">
      <motion.div className="flex justify-center mb-8"
        initial={{ opacity: 0, scale: 0.5, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1 }}>
        <div className="relative">
          <motion.div className="absolute inset-0 rounded-full"
            animate={{ boxShadow: ['0 0 20px rgba(16,185,129,0.3)', '0 0 60px rgba(16,185,129,0.7)', '0 0 20px rgba(16,185,129,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity }} />
          <motion.div className="absolute -inset-3 rounded-full border border-emerald-500/20"
            animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
          <CaurisIcon className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 relative z-10" />
        </div>
      </motion.div>
      <div className="flex flex-wrap justify-center gap-0 mb-4 overflow-hidden">
        {titleChars.map((char, i) => (
          <motion.span key={i}
            className={`font-serif text-3xl sm:text-4xl md:text-6xl ${char === ' ' ? 'w-4' : ''}`}
            style={{
              background: i < 6 ? 'linear-gradient(135deg, #ffffff, #10B981)' : 'linear-gradient(135deg, #10B981, #ffffff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}>
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.6 }}
        className="text-gray-500 text-sm md:text-base max-w-lg mx-auto tracking-wide mb-10">
        {lang === 'fr' ? 'Lectures africaines et diaspora, préservées dans les étoiles.' : 'African and diaspora readings, preserved in the stars.'}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8, duration: 0.5 }}
        className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2"><BookOpen size={14} className="text-emerald-500/60" /><span className="text-2xl font-serif font-bold text-emerald-500">{bookCount}</span></div>
          <span className="text-gray-600 text-[10px] tracking-[0.25em] uppercase">{lang === 'fr' ? 'Livres' : 'Books'}</span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2"><Globe size={14} className="text-emerald-500/60" /><span className="text-2xl font-serif font-bold text-emerald-500">2</span></div>
          <span className="text-gray-600 text-[10px] tracking-[0.25em] uppercase">{lang === 'fr' ? 'Langues' : 'Languages'}</span>
        </div>
      </motion.div>
    </div>
  );
});
HeroSection.displayName = 'HeroSection';

// ============================================================================
// LIBRARY SEARCH DROPDOWN
// ============================================================================

interface LibrarySearchDropdownProps {
  searchTerm: string;
  lang: 'fr' | 'en';
  lukeniBooks: Book[];
  onSelectBook: (book: Book) => void;
  onSelectOLBook: (book: EnrichedOLBook) => void;
  onClose: () => void;
}

const LibrarySearchDropdown = memo(({
  searchTerm,
  lang,
  lukeniBooks,
  onSelectBook,
  onSelectOLBook,
  onClose,
}: LibrarySearchDropdownProps) => {
  const showExternal = searchTerm.length >= 3;
  const { books: openLibBooks, isLoading: openLibLoading } = useOpenLibrary(searchTerm, showExternal);
  const { books: libGenBooks, isLoading: libGenLoading } = useLibGen(searchTerm, showExternal);

  const hasLukeni = lukeniBooks.length > 0;
  const hasOpenLib = openLibBooks.length > 0;
  const hasLibGen = libGenBooks.length > 0;

  const isVisible =
    searchTerm.length >= 2 &&
    (hasLukeni || hasOpenLib || hasLibGen || openLibLoading || libGenLoading);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute top-full mt-2 left-0 right-0 bg-[#0d0d1a]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* ── LUKENI (priorité) ── */}
        {hasLukeni && (
          <>
            <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-white/5 flex items-center gap-2 sticky top-0 z-10">
              <CaurisIcon className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 tracking-[0.2em] uppercase">
                {lang === 'fr' ? 'Nos livres' : 'Our books'}
              </span>
              <span className="text-[9px] text-gray-600 ml-auto">
                {lukeniBooks.length} {lang === 'fr' ? 'résultat(s)' : 'result(s)'}
              </span>
            </div>
            {lukeniBooks.slice(0, 4).map(book => (
              <div key={book.id}
                onClick={() => { onSelectBook(book); onClose(); }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/10 transition-colors group border-b border-white/[0.03] cursor-pointer">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  <img src={book.cover_url || FALLBACK_COVER} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate group-hover:text-emerald-400 transition-colors">
                    {lang === 'fr' ? book.title_fr : book.title_en}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {lang === 'fr' ? book.author_fr : book.author_en}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-700 group-hover:text-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </>
        )}

        {/* ── OPEN LIBRARY ── */}
        {(hasOpenLib || openLibLoading) && (
          <>
            <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] border-t border-white/[0.06] flex items-center gap-2 sticky top-0 z-10">
              <BookOpen size={11} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase">Open Library</span>
              {openLibLoading && <Loader2 size={10} className="animate-spin text-gray-600 ml-auto" />}
            </div>
            {openLibBooks.slice(0, 4).map(book => {
              const cover = book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
                : FALLBACK_COVER;
              return (
                <div key={book.key}
                  onClick={() => { onSelectOLBook(book); onClose(); }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-500/10 transition-colors group border-b border-white/[0.03] cursor-pointer">
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium truncate group-hover:text-white transition-colors">
                      {book.title}
                    </p>
                    <p className="text-gray-600 text-xs truncate">
                      {book.author_name?.[0] || 'Unknown'}
                    </p>
                    {/* Badge statut lisibilité */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {book.readStatus === 'public' ? (
                        <span className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                          <Globe size={8} />
                          {lang === 'fr' ? 'Lecture directe' : 'Direct reading'}
                        </span>
                      ) : book.readStatus === 'borrow' ? (
                        <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                          <LockIcon size={8} />
                          {lang === 'fr' ? 'Emprunt requis' : 'Borrow required'}
                        </span>
                      ) : book.first_publish_year ? (
                        <span className="text-[9px] text-gray-600">{book.first_publish_year}</span>
                      ) : null}
                    </div>
                  </div>
                  <BookOpen size={14} className="text-gray-700 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                </div>
              );
            })}
          </>
        )}

        {/* ── LIBGEN ── */}
        {(hasLibGen || libGenLoading) && (
          <>
            <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] border-t border-white/[0.06] flex items-center gap-2 sticky top-0 z-10">
              <FileText size={11} className="text-purple-400" />
              <span className="text-[10px] font-bold text-purple-400 tracking-[0.2em] uppercase">LibGen</span>
              {libGenLoading && <Loader2 size={10} className="animate-spin text-gray-600 ml-auto" />}
            </div>
            {libGenBooks.slice(0, 4).map(book => (
              <a key={book.md5}
                href={`https://libgen.is/book/index.php?md5=${book.md5}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-purple-500/10 transition-colors group border-b border-white/[0.03]">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                  {book.coverurl
                    ? <img src={book.coverurl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <FileText size={18} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate group-hover:text-white transition-colors">{book.title}</p>
                  <p className="text-gray-600 text-xs truncate">{book.author || 'Unknown'}</p>
                  <p className="text-gray-700 text-[9px]">{book.extension.toUpperCase()} • {book.filesize}</p>
                </div>
                <ChevronRight size={14} className="text-gray-700 group-hover:text-purple-400 flex-shrink-0" />
              </a>
            ))}
          </>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/[0.05] bg-[#0d0d1a] sticky bottom-0">
          <p className="text-[9px] text-gray-700 text-center">
            {lang === 'fr' ? '✨ Les livres Lukeni apparaissent en premier' : '✨ Lukeni books appear first'}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
LibrarySearchDropdown.displayName = 'LibrarySearchDropdown';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function BibliothequePage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collageSlots, setCollageSlots] = useState<CollageSlot[]>([]);
  const [collageSettings, setCollageSettings] = useState<CollageSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  // ── Nouveau state pour Open Library Reader ──
  const [selectedOLBook, setSelectedOLBook] = useState<EnrichedOLBook | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [catResult, bookResult, collageResult, settingsResult] = await Promise.all([
        supabase.from('categories').select('id, name_fr, name_en, color').eq('is_active', true).eq('show_bibliotheque', true).order('name_fr'),
        supabase.from('library_books').select('*, categories(id, name_fr, name_en, color)').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('library_collage').select('*').order('slot_index'),
        supabase.from('library_collage_settings').select('*').limit(1).single(),
      ]);
      if (catResult.data) setCategories(catResult.data as Category[]);
      if (bookResult.data) setBooks(bookResult.data as unknown as Book[]);
      if (collageResult.data) setCollageSlots(collageResult.data as CollageSlot[]);
      if (settingsResult.data) setCollageSettings(settingsResult.data as CollageSettings);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let result = books;
    if (activeCategory !== 'all') result = result.filter(b => b.category_id === activeCategory);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(b =>
        b.title_fr?.toLowerCase().includes(q) || b.title_en?.toLowerCase().includes(q) ||
        b.author_fr?.toLowerCase().includes(q) || b.author_en?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [books, searchTerm, activeCategory]);

  const handleLangChange = useCallback((newLang: 'fr' | 'en') => {
    setLang(newLang);
    localStorage.setItem('lukeni_lang', newLang);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020111] text-white overflow-x-hidden">
      <AnimatePresence>{isLoading && <LoadingScreen lang={lang} />}</AnimatePresence>

      <CollageBackground slots={collageSlots} settings={collageSettings} />

      <div className="relative z-40">
        <SpaceHeader
          title={lang === 'fr' ? 'Bibliothèque' : 'Library'}
          icon={<CaurisIcon className="w-5 h-5" />}
          accentColor="#10B981"
          lang={lang}
          onLangChange={handleLangChange}
        />
      </div>

      {/* FAB Contribuer */}
      <motion.button onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-6 z-30 flex items-center gap-2 bg-emerald-500 text-black px-5 py-3.5 rounded-full font-bold text-sm shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:bg-white transition-colors"
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}>
        <Plus size={20} />
        <span className="hidden sm:inline">{lang === 'fr' ? 'Contribuer' : 'Contribute'}</span>
      </motion.button>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <HeroSection lang={lang} bookCount={books.length} />

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }}
          className="relative max-w-2xl mx-auto mb-8">
          <div className="relative group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={lang === 'fr' ? 'Rechercher un livre, un auteur...' : 'Search a book, an author...'}
              className="w-full bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white text-base outline-none focus:border-emerald-500/40 focus:bg-black/70 transition-all placeholder:text-gray-700"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dropdown unifié */}
          <LibrarySearchDropdown
            searchTerm={searchTerm}
            lang={lang}
            lukeniBooks={filtered}
            onSelectBook={book => setSelectedBook(book)}
            onSelectOLBook={book => setSelectedOLBook(book)}
            onClose={() => setSearchTerm('')}
          />
        </motion.div>

        {/* Categories */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 mb-8">
          <button onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${activeCategory === 'all' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-black/40 backdrop-blur-sm text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300'}`}>
            <Globe size={12} />{lang === 'fr' ? 'Tout' : 'All'}
          </button>
          {categories.map(cat => (
            <motion.button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border whitespace-nowrap ${activeCategory === cat.id ? 'text-black border-transparent' : 'bg-black/40 backdrop-blur-sm text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300'}`}
              style={activeCategory === cat.id ? { backgroundColor: cat.color, boxShadow: `0 0 15px ${cat.color}50` } : {}}>
              {lang === 'fr' ? cat.name_fr : cat.name_en}
            </motion.button>
          ))}
        </motion.div>

        {/* Grid livres */}
        {filtered.length === 0 && !isLoading ? (
          <div className="text-center py-24">
            <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>
              <Library size={56} className="mx-auto text-gray-800 mb-4" />
            </motion.div>
            <p className="text-gray-600 text-sm tracking-wider">{lang === 'fr' ? 'La bibliothèque se remplit...' : 'The library is filling up...'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filtered.map((book, i) => (
              <BookCard key={book.id} book={book} index={i} lang={lang} onClick={() => setSelectedBook(book)} />
            ))}
          </div>
        )}
        <div className="h-24" />
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedBook && (
          <BookDetailModal book={selectedBook} lang={lang} user={user} onClose={() => setSelectedBook(null)} />
        )}
      </AnimatePresence>

      {/* ── Open Library Reader ── */}
      <AnimatePresence>
        {selectedOLBook && (
          <OpenLibraryReader
            book={selectedOLBook}
            lang={lang}
            userId={user?.id}
            onClose={() => setSelectedOLBook(null)}
          />
        )}
      </AnimatePresence>

      <AddBookModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} lang={lang} user={user} />
    </div>
  );
}