'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Send, Users, MessageCircle, FileText,
  ChevronLeft, ChevronRight, Copy, CheckCircle, Clock,
  Settings, LogOut, AlertCircle, Eye, AlertCircleIcon
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useReadingCircle, type ReadingCircle, type CircleMember } from '@/lib/hooks/useReadingCircle';
import { useCircleChat, type ChatMessage } from '@/lib/hooks/useCircleChat';
import CloudinaryPDFReader from '@/components/CloudinaryPDFReaderWrapper';
import { NotesplitContainer } from '@/components/NotesplitContainer';
import CircleLoadingScreen from '@/components/CircleLoadingScreen';

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface Book {
  id: string;
  title_fr: string;
  title_en: string;
  author_fr: string;
  author_en: string;
  cover_url: string;
  file_url: string;
}

// ============================================================================
// COMPOSANT : Écran de blocage pour les non-membres
// ============================================================================
function AccessBlockedScreen({
  circle,
  book,
  user,
  lang,
  onSubmitRequest,
  isSubmitting,
  joinRequestStatus,
}: {
  circle: ReadingCircle;
  book: Book | null;
  user: User | null;
  lang: 'fr' | 'en';
  onSubmitRequest: (message: string) => void;
  isSubmitting: boolean;
  joinRequestStatus: 'none' | 'pending' | 'approved' | 'rejected';
}) {
  const [joinMessage, setJoinMessage] = useState('');

  if (!user) {
    return (
      <div className="fixed inset-0 bg-[#020111] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-serif font-bold text-white">
              {lang === 'fr' ? 'Connexion requise' : 'Sign in required'}
            </h1>
            <p className="text-gray-400">
              {lang === 'fr'
                ? 'Veuillez vous connecter pour accéder aux cercles de lecture'
                : 'Please sign in to access reading circles'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl p-6">
            {book && (
              <div className="flex gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                    {lang === 'fr' ? 'Livre à lire' : 'Book to read'}
                  </p>
                  <h3 className="text-white font-serif text-lg font-bold line-clamp-2">{book.title_fr}</h3>
                  <p className="text-gray-400 text-xs mt-1">{book.author_fr}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                {lang === 'fr' ? 'Cercle' : 'Circle'}
              </p>
              <h2 className="text-white text-xl font-bold mb-2">{circle.name}</h2>
              <p className="text-gray-400 text-sm">{circle.description || ''}</p>
            </div>
          </div>

          <a
            href="/auth"
            className="w-full py-3 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-white transition-colors flex items-center justify-center"
          >
            {lang === 'fr' ? 'Se connecter' : 'Sign in'}
          </a>
        </motion.div>
      </div>
    );
  }

  // ── Utilisateur connecté mais pas membre ──
  if (joinRequestStatus === 'pending') {
    return (
      <div className="fixed inset-0 bg-[#020111] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white">
              {lang === 'fr' ? '⏳ En attente' : '⏳ Pending'}
            </h1>
            <p className="text-gray-400">
              {lang === 'fr'
                ? 'Votre demande d\'adhésion est en attente d\'approbation'
                : 'Your membership request is awaiting approval'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-amber-500/20 rounded-3xl p-6">
            {book && (
              <div className="flex gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-serif text-lg font-bold line-clamp-2">{book.title_fr}</h3>
                  <p className="text-gray-400 text-xs mt-2">{book.author_fr}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                {lang === 'fr' ? 'Cercle' : 'Circle'}
              </p>
              <h2 className="text-white text-xl font-bold">{circle.name}</h2>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-xs">
              {lang === 'fr'
                ? 'Le créateur examinera votre demande et vous notifiera de sa réponse'
                : 'The creator will review your request and notify you'}
            </p>
          </div>

          <a
            href="/bibliotheque"
            className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            {lang === 'fr' ? 'Retour à la bibliothèque' : 'Back to library'}
          </a>
        </motion.div>
      </div>
    );
  }

  if (joinRequestStatus === 'rejected') {
    return (
      <div className="fixed inset-0 bg-[#020111] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
              <AlertCircleIcon size={32} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white">
              {lang === 'fr' ? '❌ Demande refusée' : '❌ Request rejected'}
            </h1>
            <p className="text-gray-400">
              {lang === 'fr'
                ? 'Le créateur a refusé votre demande d\'adhésion'
                : 'The creator rejected your membership request'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-red-500/20 rounded-3xl p-6">
            {book && (
              <div className="flex gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-serif text-lg font-bold line-clamp-2">{book.title_fr}</h3>
                  <p className="text-gray-400 text-xs mt-2">{book.author_fr}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                {lang === 'fr' ? 'Cercle' : 'Circle'}
              </p>
              <h2 className="text-white text-xl font-bold">{circle.name}</h2>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs">
              {lang === 'fr'
                ? 'Vous pouvez envoyer une nouvelle demande (maximum 2 tentatives)'
                : 'You can submit another request (maximum 2 attempts)'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-amber-500 text-black rounded-xl font-bold text-sm hover:bg-white transition-colors"
          >
            {lang === 'fr' ? 'Envoyer une nouvelle demande' : 'Send another request'}
          </motion.button>

          <a
            href="/bibliotheque"
            className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            {lang === 'fr' ? 'Retour à la bibliothèque' : 'Back to library'}
          </a>
        </motion.div>
      </div>
    );
  }

  // ── État par défaut : Pas encore de demande ──
  return (
    <div className="fixed inset-0 bg-[#020111] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-serif font-bold text-white">
            {lang === 'fr' ? 'Demander à rejoindre' : 'Request to join'}
          </h1>
          <p className="text-gray-400">
            {lang === 'fr'
              ? 'Ce cercle est privé. Envoyez une demande au créateur'
              : 'This circle is private. Send a request to the creator'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-purple-400" />

          <div className="p-6 space-y-4">
            {book && (
              <div className="flex gap-4 pb-4 border-b border-white/[0.06]">
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-purple-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                    {lang === 'fr' ? 'Livre à lire' : 'Book to read'}
                  </p>
                  <h3 className="text-white font-serif text-lg font-bold line-clamp-2">{book.title_fr}</h3>
                  <p className="text-gray-400 text-xs mt-1">{book.author_fr}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                {lang === 'fr' ? 'Nom du cercle' : 'Circle name'}
              </p>
              <h2 className="text-white text-xl font-bold">{circle.name}</h2>
            </div>

            {circle.description && (
              <div>
                <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                  Description
                </p>
                <p className="text-gray-300 text-sm">{circle.description}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-2">
            {lang === 'fr' ? 'Message au créateur' : 'Message to creator'}
          </label>
          <textarea
            value={joinMessage}
            onChange={(e) => setJoinMessage(e.target.value)}
            placeholder={
              lang === 'fr'
                ? 'Ex: Je suis passionnée par ce livre et j\'aimerais rejoindre votre groupe...'
                : 'Ex: I\'m passionate about this book and would love to join your group...'
            }
            maxLength={300}
            rows={4}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-colors resize-none placeholder:text-gray-600"
          />
          <p className="text-gray-600 text-[10px] mt-1">{joinMessage.length}/300</p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-blue-300 text-xs">
            {lang === 'fr'
              ? 'Le créateur examinera votre demande et vous notifiera de sa réponse'
              : 'The creator will review your request and notify you'}
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href="/bibliotheque"
            className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancel'}
          </a>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSubmitRequest(joinMessage)}
            disabled={!joinMessage.trim() || isSubmitting}
            className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-bold text-sm hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {lang === 'fr' ? 'Envoi...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send size={14} />
                {lang === 'fr' ? 'Envoyer' : 'Send'}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
export default function CirclePage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isLoading, setIsLoading] = useState(true);
  const [book, setBook] = useState<Book | null>(null);

  // Hooks Realtime
  const { circle, members, changePage, updateMyProgress } = useReadingCircle(circleId, user?.id);
  const { messages, sendMessage } = useCircleChat(circleId, user?.id);

  // UI State
  const [sidebarMode, setSidebarMode] = useState<'chat' | 'notes' | 'members'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ État pour la vérification du statut membre
  const [joinRequestStatus, setJoinRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // ── Auth ──
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
    };
    getSession();

    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);
  }, [router]);

  // ✅ Vérifier le statut de l'utilisateur (membre, demande en attente, etc.)
  useEffect(() => {
    if (!user || !circleId) return;

    const checkMemberStatus = async () => {
      try {
        // 1. Vérifier si l'utilisateur est déjà membre
        const { data: memberData } = await supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberData) {
          setJoinRequestStatus('approved');
          setIsLoading(false);
          return;
        }

        // 2. Vérifier s'il y a une demande existante
        const { data: requestData } = await supabase
          .from('circle_join_requests')
          .select('id, status')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (requestData) {
          setJoinRequestStatus(requestData.status as any);
        } else {
          setJoinRequestStatus('none');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Check member status error:', err);
        setIsLoading(false);
      }
    };

    checkMemberStatus();
  }, [user, circleId]);

  // ── Charger le livre ──
  useEffect(() => {
    if (!circle) return;

    const loadBook = async () => {
      try {
        const { data } = await supabase
          .from('library_books')
          .select('*')
          .eq('id', circle.book_id)
          .single();

        setBook(data);
      } catch (err) {
        console.error('Load book error:', err);
      }
    };

    loadBook();
  }, [circle]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Envoyer message ──
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await sendMessage(chatInput, circle?.current_page);
      setChatInput('');
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSendingMessage(false);
    }
  }, [chatInput, sendMessage, circle, isSendingMessage]);

  // ── Copier code ──
  const handleCopyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // ============================================================================
  // ✅ NOUVELLE FONCTION : Soumettre une demande d'adhésion
  // ============================================================================
  const handleSubmitJoinRequest = useCallback(async (message: string) => {
    if (!user || !circle || !message.trim()) return;

    setIsSubmittingRequest(true);
    try {
      // Compter les demandes existantes (acceptées + refusées)
      const { data: existingRequests } = await supabase
        .from('circle_join_requests')
        .select('id, status')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id);

      // Vérifier si max 2 demandes atteint
      const rejectedCount = (existingRequests || []).filter(r => r.status === 'rejected').length;
      if (rejectedCount >= 2) {
        alert(
          lang === 'fr'
            ? 'Vous avez atteint le nombre maximum de demandes pour ce cercle'
            : 'You have reached the maximum number of requests for this circle'
        );
        setIsSubmittingRequest(false);
        return;
      }

      // Insérer une nouvelle demande d'adhésion
      const { error } = await supabase
        .from('circle_join_requests')
        .insert({
          circle_id: circle.id,
          user_id: user.id,
          message: message.trim(),
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          alert(
            lang === 'fr'
              ? 'Vous avez déjà une demande en attente pour ce cercle'
              : 'You already have a pending request for this circle'
          );
        } else {
          throw error;
        }
        setIsSubmittingRequest(false);
        return;
      }

      setJoinRequestStatus('pending');
    } catch (err: any) {
      console.error('Submit join request error:', err);
      alert(lang === 'fr' ? 'Erreur lors de l\'envoi' : 'Error sending request');
    } finally {
      setIsSubmittingRequest(false);
    }
  }, [user, circle, lang]);

  // ── Quitter le cercle ──
  const handleLeaveCircle = useCallback(async () => {
    if (!user || !circle) return;

    if (circle.creator_id === user.id) {
      alert(lang === 'fr'
        ? 'Les créateurs ne peuvent pas quitter. Supprimez le cercle à la place.'
        : 'Creators cannot leave. Delete the circle instead.');
      return;
    }

    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circle.id)
      .eq('user_id', user.id);

    if (!error) {
      router.push('/bibliotheque');
    }
  }, [user, circle, lang, router]);

  // ============================================================================
  // ✅ CONDITION DE CHARGEMENT INITIAL
  // ============================================================================
  if (isLoading) {
    return <CircleLoadingScreen lang={lang} />;
  }

  // ============================================================================
  // ✅ CONDITION : Non-membre → Afficher l'écran de blocage
  // ============================================================================
  if (joinRequestStatus !== 'approved') {
    return (
      <AccessBlockedScreen
        circle={circle!}
        book={book}
        user={user}
        lang={lang}
        onSubmitRequest={handleSubmitJoinRequest}
        isSubmitting={isSubmittingRequest}
        joinRequestStatus={joinRequestStatus}
      />
    );
  }

  // ============================================================================
  // ✅ CONTENU NORMAL : Utilisateur est membre
  // ============================================================================
  if (!circle || !book) {
    return <CircleLoadingScreen lang={lang} />;
  }

  const isCreator = user && circle.creator_id === user.id;
  const currentMember = members.find(m => m.user_id === user?.id);
  const avgProgress = members.length > 0
    ? Math.round(members.reduce((acc, m) => acc + m.current_page, 0) / members.length)
    : 0;

  return (
    <div className="fixed inset-0 bg-[#020111] flex flex-col md:flex-row text-white overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════
          LECTEUR PDF (gauche / haut)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#0a0a14] flex-shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.push('/bibliotheque')}
              className="p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-white text-sm font-bold truncate">{book.title_fr}</h1>
              <p className="text-gray-500 text-[10px] truncate">{circle.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Eye size={12} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-bold">{members.length}</span>
            </div>

            {isCreator && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Reader */}
        <div className="flex-1 overflow-hidden relative">
          {book.file_url ? (
            <CloudinaryPDFReader
              url={book.file_url}
              title={book.title_fr}
              lang={lang}
              bookId={book.id}
              userId={user?.id}
              onClose={() => router.push('/bibliotheque')}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-center px-4">
              <div>
                <AlertCircle size={40} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">{lang === 'fr' ? 'Livre non disponible' : 'Book not available'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {isCreator && (
          <div className="h-16 flex items-center justify-center gap-3 border-t border-white/10 bg-[#0a0a14] flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => changePage(Math.max(1, circle.current_page - 1))}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={20} className="text-white" />
            </motion.button>

            <div className="text-center px-4">
              <p className="text-white font-bold text-sm">{lang === 'fr' ? 'Page' : 'Page'} {circle.current_page}</p>
              <p className="text-gray-600 text-[10px] flex items-center justify-center gap-1">
                <span>📊 Moyenne : {avgProgress}</span>
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => changePage(circle.current_page + 1)}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={20} className="text-white" />
            </motion.button>
          </div>
        )}

        {/* Personal progress (si pas créateur) */}
        {!isCreator && currentMember && (
          <div className="h-12 flex items-center justify-between px-4 border-t border-white/10 bg-[#0a0a14] flex-shrink-0 text-sm">
            <span className="text-gray-500">
              {lang === 'fr' ? 'Votre position' : 'Your position'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="200"
                value={currentMember.current_page}
                onChange={(e) => updateMyProgress(parseInt(e.target.value))}
                className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
              />
              <span className="text-white font-bold min-w-[3rem] text-right">
                p.{currentMember.current_page}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PANNEAU LATÉRAL (droite / bas)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full md:w-96 bg-[#0a0a14] border-l border-white/10 flex flex-col max-h-screen md:max-h-none">
        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {[
            { key: 'chat' as const, icon: MessageCircle, label: lang === 'fr' ? 'Chat' : 'Chat' },
            { key: 'notes' as const, icon: FileText, label: lang === 'fr' ? 'Notes' : 'Notes' },
            { key: 'members' as const, icon: Users, label: lang === 'fr' ? 'Membres' : 'Members' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setSidebarMode(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
                sidebarMode === key
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarMode === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <p>{lang === 'fr' ? 'Aucun message' : 'No messages'}</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      // ✅ Chercher le profil du message dans les membres
                      const memberProfile = members.find(m => m.user_id === msg.user_id)?.profiles;
                      const displayName = memberProfile?.full_name || msg.profiles?.full_name || 'Anonyme';

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex-shrink-0 flex items-center justify-center text-emerald-400 text-xs font-bold">
                            {displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-white text-xs font-bold">
                                {displayName}
                                {user?.id === msg.user_id && (
                                  <span className="text-gray-500 text-[10px] ml-1">(vous)</span>
                                )}
                              </span>
                              {msg.page_number && (
                                <span className="text-gray-600 text-[10px] flex items-center gap-0.5">
                                  <Clock size={10} /> p.{msg.page_number}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm break-words">{msg.content}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={lang === 'fr' ? 'Message...' : 'Message...'}
                    disabled={isSendingMessage}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isSendingMessage}
                    className="px-3 py-2 bg-emerald-500 text-black rounded-lg font-bold text-sm hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {isSendingMessage ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </motion.button>
                </div>
              </div>
            </>
          )}

          {sidebarMode === 'notes' && (
            <NotesplitContainer
              itemId={book.id}
              itemType="book"
              userId={user?.id}
              lang={lang}
              mode="side"
            >
              <div />
            </NotesplitContainer>
          )}

          {sidebarMode === 'members' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:border-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex-shrink-0 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        {member.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {member.profiles?.full_name || 'Utilisateur'}
                        </p>
                        {member.role === 'creator' && (
                          <span className="text-[10px] text-emerald-400 font-bold">👑 Créateur</span>
                        )}
                      </div>
                    </div>
                    {user?.id === member.user_id && (
                      <span className="text-[10px] text-gray-500">Vous</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>p. {member.current_page}</span>
                      {member.last_active_at && (
                        <span className="text-gray-700">
                          {Math.round((Date.now() - new Date(member.last_active_at).getTime()) / 1000 / 60)} min
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(member.current_page / 200) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 100 }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SETTINGS MODAL (créateur seulement)
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettings && isCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl w-full max-w-md overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-serif text-xl font-bold">
                    {lang === 'fr' ? 'Paramètres' : 'Settings'}
                  </h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 text-gray-600 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Circle info */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                      {lang === 'fr' ? 'Code d\'accès' : 'Access code'}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={circle.access_code}
                        readOnly
                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCopyCode(circle.access_code)}
                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        {copiedCode === circle.access_code ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                        {lang === 'fr' ? 'Membres' : 'Members'}
                      </p>
                      <p className="text-white text-lg font-bold">{members.length}/{circle.max_members}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                        {lang === 'fr' ? 'Page actuelle' : 'Current page'}
                      </p>
                      <p className="text-white text-lg font-bold">{circle.current_page}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      handleLeaveCircle();
                      setShowSettings(false);
                    }}
                    className="w-full py-2.5 bg-red-500/20 text-red-400 rounded-lg font-bold text-sm border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    {lang === 'fr' ? 'Quitter' : 'Leave'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-creator leave button */}
      {!isCreator && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLeaveCircle}
          className="fixed bottom-20 right-6 md:bottom-6 z-40 p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
          title={lang === 'fr' ? 'Quitter le cercle' : 'Leave circle'}
        >
          <LogOut size={18} />
        </motion.button>
      )}
    </div>
  );
}