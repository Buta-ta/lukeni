"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface FeedbackWidgetProps {
  lang: 'fr' | 'en';
  defaultSpace?: string;
}

interface SpaceItem {
  id: string;
  emoji: string;
  label_fr: string;
  label_en: string;
}

interface EmotionItem {
  id: string;
  label_fr: string;
  label_en: string;
}

// ─── TRADUCTIONS ──────────────────────────────────────────────────────────────
const T = {
  fr: {
    trigger: 'Votre avis',
    title: 'Donnez votre avis',
    subtitle: 'Aidez-nous à améliorer Lukeni',
    spaceLabel: 'Sur quel espace ?',
    emotionLabel: 'En un mot…',
    messageLabel: 'Votre message',
    messagePlaceholder: 'Partagez votre expérience, une idée, un problème…',
    emailLabel: 'Email (optionnel)',
    emailPlaceholder: 'Pour qu\'on vous réponde',
    send: 'Envoyer',
    sending: 'Envoi…',
    successTitle: 'Merci pour votre retour !',
    successSub: 'Votre avis nous aide à construire un meilleur Lukeni.',
    close: 'Fermer',
    charCount: 'caractères restants',
    errorRequired: 'Le message est requis',
    errorTooShort: 'Message trop court (min 10 caractères)',
    errorTooLong: 'Message trop long (max 280 caractères)',
  },
  en: {
    trigger: 'Your feedback',
    title: 'Share your feedback',
    subtitle: 'Help us improve Lukeni',
    spaceLabel: 'About which space?',
    emotionLabel: 'In one word…',
    messageLabel: 'Your message',
    messagePlaceholder: 'Share your experience, an idea, an issue…',
    emailLabel: 'Email (optional)',
    emailPlaceholder: 'So we can reply to you',
    send: 'Send',
    sending: 'Sending…',
    successTitle: 'Thank you for your feedback!',
    successSub: 'Your input helps us build a better Lukeni.',
    close: 'Close',
    charCount: 'characters left',
    errorRequired: 'Message is required',
    errorTooShort: 'Message too short (min 10 characters)',
    errorTooLong: 'Message too long (max 280 characters)',
  },
};

// ─── DONNÉES ──────────────────────────────────────────────────────────────────
const SPACES: SpaceItem[] = [
  { id: 'general',      emoji: '🌍', label_fr: 'Général',         label_en: 'General'         },
  { id: 'encyclopedie', emoji: '📖', label_fr: 'Encyclopédie',    label_en: 'Encyclopedia'    },
  { id: 'presse',       emoji: '📰', label_fr: 'Presse',          label_en: 'Press'           },
  { id: 'musical',      emoji: '🎵', label_fr: 'Voyage Musical',  label_en: 'Musical Journey' },
  { id: 'library',      emoji: '📚', label_fr: 'Bibliothèque',    label_en: 'Library'         },
  { id: 'macro',        emoji: '📊', label_fr: 'Chiffres',        label_en: 'Data'            },
  { id: 'jeux',         emoji: '🎮', label_fr: 'Jeux',            label_en: 'Games'           },
];

const EMOTIONS: EmotionItem[] = [
  { id: '😍', label_fr: 'J\'adore',  label_en: 'Love it'      },
  { id: '👍', label_fr: 'Bien',      label_en: 'Good'         },
  { id: '🤔', label_fr: 'Hésitant',  label_en: 'Unsure'       },
  { id: '😕', label_fr: 'Déçu',      label_en: 'Disappointed' },
  { id: '💡', label_fr: 'Idée',      label_en: 'Idea'         },
];

const MAX_CHARS = 280;
const MIN_CHARS = 10;

// ─── COMPOSANT ────────────────────────────────────────────────────────────────
export default function FeedbackWidget({
  lang,
  defaultSpace = 'general',
}: FeedbackWidgetProps) {
  const t = T[lang];

  const [isOpen, setIsOpen]     = useState(false);
  const [space, setSpace]       = useState<string>(defaultSpace);
  const [emotion, setEmotion]   = useState<string>('');
  const [message, setMessage]   = useState<string>('');
  const [email, setEmail]       = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone]     = useState(false);
  const [error, setError]       = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync espace par défaut si la prop change
  useEffect(() => {
    if (!isOpen) {
      setSpace(defaultSpace);
    }
  }, [defaultSpace, isOpen]);

  // Focus textarea à l'ouverture
  useEffect(() => {
    if (isOpen && !isDone) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isDone]);

  // Reset à la fermeture
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMessage('');
      setEmail('');
      setEmotion('');
      setError('');
      setIsDone(false);
      setSpace(defaultSpace);
    }, 400);
  };

  // Validation
  const validate = (): boolean => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError(t.errorRequired);
      return false;
    }
    if (trimmed.length < MIN_CHARS) {
      setError(t.errorTooShort);
      return false;
    }
    if (trimmed.length > MAX_CHARS) {
      setError(t.errorTooLong);
      return false;
    }
    setError('');
    return true;
  };

  // Envoi
// Dans FeedbackWidget.tsx, remplacez handleSend par :
const handleSend = async () => {
  if (!validate()) return;
  setIsSending(true);

  try {
    // Récupérer l'utilisateur connecté (si existe)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Récupérer ou générer un session_id pour les anonymes
    let sessionId = localStorage.getItem('lukeni_visitor_id');
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('lukeni_visitor_id', sessionId);
    }

    const { error: supabaseError } = await supabase
      .from('user_feedback')
      .insert({
        space,
        emotion: emotion || null,
        message: message.trim(),
        email: email.trim() || null,
        status: 'new',
        user_id: user?.id || null,
        session_id: sessionId,
      });

    if (supabaseError) {
      throw new Error(supabaseError.message);
    }

    setIsDone(true);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
    setError(msg);
  } finally {
    setIsSending(false);
  }
};

  // Toggle émotion (désélectionnable)
  const handleEmotionClick = (id: string) => {
    setEmotion(prev => (prev === id ? '' : id));
  };

  const charsLeft = MAX_CHARS - message.length;
  const currentSpace = SPACES.find(s => s.id === space);

  return (
    <>
      {/* ─── BOUTON FLOTTANT ─────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, duration: 0.4 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={
          'fixed bottom-6 left-6 z-40 flex items-center gap-2 ' +
          'px-4 py-2.5 rounded-full ' +
          'bg-[#020111]/80 backdrop-blur-xl ' +
          'border border-white/10 hover:border-[#D4AF37]/40 ' +
          'text-white/50 hover:text-[#D4AF37] ' +
          'transition-all duration-300 shadow-lg group'
        }
      >
        <MessageSquarePlus
          size={15}
          className="text-white/40 group-hover:text-[#D4AF37] transition-colors shrink-0"
        />
        <span className="text-[11px] font-medium tracking-wide whitespace-nowrap">
          {t.trigger}
        </span>
      </motion.button>

      {/* ─── OVERLAY ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ─── DRAWER ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={
              'fixed left-0 top-0 h-full w-[340px] z-[100] ' +
              'bg-[#020111]/98 backdrop-blur-2xl ' +
              'border-r border-white/8 ' +
              'flex flex-col shadow-2xl'
            }
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/6 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse block" />
                  <span className="text-[#D4AF37] text-[9px] font-black uppercase tracking-widest">
                    Lukeni
                  </span>
                </div>
                <h2 className="text-white font-serif text-lg">{t.title}</h2>
                <p className="text-white/35 text-[11px] mt-0.5">{t.subtitle}</p>
              </div>
              <button
                onClick={handleClose}
                className={
                  'p-1.5 rounded-full text-white/30 ' +
                  'hover:text-white hover:bg-white/8 transition-all mt-1 shrink-0'
                }
              >
                <X size={16} />
              </button>
            </div>

            {/* ─── ÉTAT SUCCÈS ─────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {isDone ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col items-center justify-center p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      damping: 12,
                      stiffness: 200,
                      delay: 0.1,
                    }}
                    className={
                      'w-16 h-16 rounded-full ' +
                      'bg-[#D4AF37]/15 border border-[#D4AF37]/30 ' +
                      'flex items-center justify-center mb-6'
                    }
                  >
                    <Check size={28} className="text-[#D4AF37]" />
                  </motion.div>

                  <h3 className="text-white font-serif text-xl mb-2">
                    {t.successTitle}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed mb-8">
                    {t.successSub}
                  </p>

                  <button
                    onClick={handleClose}
                    className={
                      'px-6 py-2.5 bg-[#D4AF37] text-black font-bold ' +
                      'rounded-full text-sm hover:bg-white transition-colors'
                    }
                  >
                    {t.close}
                  </button>
                </motion.div>
              ) : (

                // ─── FORMULAIRE ────────────────────────────────────────────
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-y-auto p-6 space-y-5"
                >
                  {/* Espace */}
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">
                      {t.spaceLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SPACES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSpace(s.id)}
                          className={
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-left ' +
                            'border transition-all text-[11px] font-medium ' +
                            (space === s.id
                              ? 'bg-[#D4AF37]/12 border-[#D4AF37]/40 text-[#D4AF37]'
                              : 'bg-white/[0.02] border-white/8 text-white/50 hover:text-white hover:border-white/20')
                          }
                        >
                          <span className="shrink-0">{s.emoji}</span>
                          <span className="truncate">
                            {lang === 'fr' ? s.label_fr : s.label_en}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Émotion */}
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">
                      {t.emotionLabel}
                    </p>
                    <div className="flex gap-1.5">
                      {EMOTIONS.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => handleEmotionClick(e.id)}
                          title={lang === 'fr' ? e.label_fr : e.label_en}
                          className={
                            'flex-1 py-2 rounded-xl text-xl transition-all border ' +
                            (emotion === e.id
                              ? 'bg-white/10 border-[#D4AF37]/40 scale-105'
                              : 'bg-white/[0.02] border-white/8 hover:bg-white/6 opacity-60 hover:opacity-100')
                          }
                        >
                          {e.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                        {t.messageLabel}
                      </p>
                      <span
                        className={
                          'text-[10px] font-mono ' +
                          (charsLeft < 30 ? 'text-red-400' : 'text-white/25')
                        }
                      >
                        {charsLeft} {t.charCount}
                      </span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        setError('');
                      }}
                      placeholder={t.messagePlaceholder}
                      maxLength={MAX_CHARS}
                      rows={4}
                      className={
                        'w-full bg-white/[0.03] border rounded-xl px-4 py-3 ' +
                        'text-white text-sm placeholder:text-white/20 ' +
                        'resize-none focus:outline-none transition-colors leading-relaxed ' +
                        (error
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-white/10 focus:border-[#D4AF37]/40')
                      }
                    />
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          key="error"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-red-400 text-[10px] mt-1"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Email optionnel */}
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">
                      {t.emailLabel}
                    </p>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className={
                        'w-full bg-white/[0.03] border border-white/10 rounded-xl ' +
                        'px-4 py-2.5 text-white text-sm placeholder:text-white/20 ' +
                        'focus:outline-none focus:border-[#D4AF37]/40 transition-colors'
                      }
                    />
                  </div>

                  {/* Bouton envoi */}
                  <button
                    onClick={handleSend}
                    disabled={isSending || !message.trim()}
                    className={
                      'w-full flex items-center justify-center gap-2 ' +
                      'py-3 rounded-full font-bold text-sm ' +
                      'bg-[#D4AF37] text-black hover:bg-white transition-colors ' +
                      'disabled:opacity-40 disabled:cursor-not-allowed ' +
                      'shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                    }
                  >
                    {isSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t.sending}
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        {t.send}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer décoratif */}
            {!isDone && (
              <div className="px-6 pb-5 pt-2 border-t border-white/5 shrink-0">
                <p className="text-white/15 text-[9px] text-center">
                  {currentSpace ? currentSpace.emoji : '🌍'}
                  {' '}
                  {currentSpace
                    ? (lang === 'fr' ? currentSpace.label_fr : currentSpace.label_en)
                    : 'Général'}
                  {' · '}
                  Lukeni Africa
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}