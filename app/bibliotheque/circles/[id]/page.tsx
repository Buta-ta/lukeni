'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Send, Users, MessageCircle, FileText,
  ChevronLeft, ChevronRight, Copy, CheckCircle, Clock,
  Settings, LogOut, AlertCircle, Eye, AlertCircleIcon, Pin,
  BookOpen, TrendingUp, BarChart3, Heart
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useReadingCircle, type ReadingCircle, type CircleMember } from '@/lib/hooks/useReadingCircle';
import { useCircleChat, type ChatMessage } from '@/lib/hooks/useCircleChat';
import { useCirclePresence } from '@/lib/hooks/useCirclePresence';
import {
  useCircleBookmarks,
  useCircleHighlights,
  useCircleReadingStats,
  useCircleEvents,
  useCirclePolls,
  useCircleSummaries,
  useCircleQuizzes,
} from '@/lib/hooks/useCircleReadingFeatures';
import CloudinaryPDFReader from '@/components/CloudinaryPDFReaderWrapper';
import { NotesplitContainer } from '@/components/NotesplitContainer';
import CircleLoadingScreen from '@/components/CircleLoadingScreen';
import {
  MessageReactions,
  MessageQuotePreview,
  PresenceIndicator,
  MentionsList,
  ChatSearch,
  PinnedMessagesPanel,
} from '@/components/CircleChatFeatures';
import {
  BookmarksPanel,
  ReadingStatsPanel,
  EventsTimeline,
  PollsPanel,
  SummariesPanel,
  QuizzesPanel,
} from '@/components/CircleReadingFeatures';

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

  // ✅ Hooks Realtime
  const { circle, members, changePage, updateMyProgress } = useReadingCircle(circleId, user?.id);
  const { messages, sendMessage, addReaction, removeReaction, pinMessage, unpinMessage } = useCircleChat(circleId, user?.id);
  const { presentUsers } = useCirclePresence(circleId, user?.id);

  // ✅ NOUVELLE : Hooks Lecture commune
  const { bookmarks, addBookmark, removeBookmark } = useCircleBookmarks(circleId, user?.id);
  const { highlights, addHighlight, removeHighlight } = useCircleHighlights(circleId, user?.id);
  const { stats } = useCircleReadingStats(circleId, members);
  const { events, logEvent } = useCircleEvents(circleId);
  const { polls, createPoll, votePoll } = useCirclePolls(circleId, user?.id);
  const { summaries, createSummary, voteSummary } = useCircleSummaries(circleId, user?.id);
  const { quizzes, createQuiz, answerQuiz } = useCircleQuizzes(circleId, user?.id);

  // UI State - Chat
  const [sidebarMode, setSidebarMode] = useState<'chat' | 'notes' | 'members' | 'reading'>('chat');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // UI State - Chat Features
  const [showMentions, setShowMentions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [repliedToMessage, setRepliedToMessage] = useState<ChatMessage | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);

  const [rejectedRequestsCount, setRejectedRequestsCount] = useState(0);

  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [isSendingJoin, setIsSendingJoin] = useState(false);

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
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [circle]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // ✅ Vérifier que l'utilisateur est toujours membre

    // ✅ Vérifier l'appartenance et les rejets
  useEffect(() => {
    if (!user || !circle) return;

    const checkMembership = async () => {
      // Vérifier si membre
      const { data: memberData } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsMember(!!memberData || circle.creator_id === user.id);

      // Vérifier les rejets
      const { data: rejectedRequests } = await supabase
        .from('circle_join_requests')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .eq('status', 'rejected');

      const rejectedCount = rejectedRequests?.length || 0;
      setRejectedRequestsCount(rejectedCount);

      // Vérifier si demande en attente
      const { data: pendingRequests } = await supabase
        .from('circle_join_requests')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      setHasPendingRequest(!!pendingRequests);

      // Si pas membre et pas créateur et 3 rejets → bloquer
      if (!memberData && circle.creator_id !== user.id && rejectedCount >= 3) {
        router.push('/bibliotheque');
      }
    };

    checkMembership();
    const interval = setInterval(checkMembership, 5000);
    return () => clearInterval(interval);
  }, [user, circle, router]);


  // ✅ Charger le compte des demandes rejetées
  useEffect(() => {
    if (!user || !circle) return;

    const loadRejectedCount = async () => {
      const { data: rejectedRequests } = await supabase
        .from('circle_join_requests')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .eq('status', 'rejected');

      setRejectedRequestsCount(rejectedRequests?.length || 0);
    };

    loadRejectedCount();
  }, [user, circle]);
  // ============================================================================
  // FONCTIONS : Chat Features
  // ============================================================================

  const handleMentionInput = useCallback((input: string) => {
    const atIndex = input.lastIndexOf('@');
    if (atIndex !== -1) {
      const after = input.substring(atIndex + 1);
      if (after.length > 0 && !after.includes(' ')) {
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);

  const handleSelectMention = useCallback((userId: string) => {
    const member = members.find(m => m.user_id === userId);
    if (!member) return;

    const atIndex = chatInput.lastIndexOf('@');
    const beforeAt = chatInput.substring(0, atIndex);
    const newInput = `${beforeAt}@${member.profiles?.username || member.profiles?.full_name || userId} `;

    setChatInput(newInput);
    setShowMentions(false);
    setMentions([...mentions, userId]);
  }, [chatInput, members, mentions]);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await sendMessage(chatInput, circle?.current_page, mentions, repliedToMessage?.id);
      setChatInput('');
      setMentions([]);
      setRepliedToMessage(null);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSendingMessage(false);
    }
  }, [chatInput, sendMessage, circle, isSendingMessage, mentions, repliedToMessage]);

  const handleCopyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

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

  const handleJoinRequest = useCallback(async () => {
    if (!user || !circle || isSendingJoin) return;

    setIsSendingJoin(true);
    try {
      // Vérifier s'il existe déjà une ligne pour ce couple circle/user
      const { data: existingRequest } = await supabase
        .from('circle_join_requests')
        .select('id, status')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRequest) {
        // Mettre à jour la ligne existante → remettre en "pending"
        const { error } = await supabase
          .from('circle_join_requests')
          .update({
            status: 'pending',
            message: joinMessage.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRequest.id);

        if (error) throw error;
      } else {
        // Insérer une nouvelle ligne
        const { error } = await supabase
          .from('circle_join_requests')
          .insert({
            circle_id: circle.id,
            user_id: user.id,
            message: joinMessage.trim() || null,
            status: 'pending',
          });

        if (error) throw error;
      }

      setHasPendingRequest(true);
      setJoinMessage('');
    } catch (err) {
      console.error('Join request error:', err);
    } finally {
      setIsSendingJoin(false);
    }
  }, [user, circle, joinMessage, isSendingJoin]);

  // ✅ Filtrer les messages
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;

    const query = searchQuery.toLowerCase();
    return messages.filter(msg =>
      msg.content.toLowerCase().includes(query) ||
      (msg.profiles?.full_name || '').toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  // ✅ Obtenir les messages épinglés
  const pinnedMessages = useMemo(() => {
    return messages.filter(msg => msg.isPinned);
  }, [messages]);

  // ✅ Préparer les stats enrichies
  // ✅ Préparer les stats enrichies
  const enrichedStats = useMemo(() => {
    if (!stats) return null;
    const member = members.find(m => m.user_id === user?.id);
    if (!member) return stats;

    return {
      ...stats,
      your_page: member.current_page,
    };
  }, [stats, members, user?.id]);

  if (isLoading || !circle || !book) {
    return <CircleLoadingScreen lang={lang} />;
  }

  const isCreator = user && circle.creator_id === user.id;
  const currentMember = members.find(m => m.user_id === user?.id);
  const avgProgress = members.length > 0
    ? Math.round(members.reduce((acc, m) => acc + m.current_page, 0) / members.length)
    : 0;
  


  // ✅ Si l'utilisateur n'est pas membre, afficher l'interface appropriée
  if (!isCreator && !isMember) {
    // ── 3 rejets → Accès refusé
    if (rejectedRequestsCount >= 3) {
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
                {lang === 'fr' ? '❌ Accès refusé' : '❌ Access denied'}
              </h1>
              <p className="text-gray-400">
                {lang === 'fr'
                  ? "Vous avez dépassé le nombre de demandes d'adhésion pour ce cercle."
                  : 'You have exceeded the number of membership requests for this circle.'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-red-500/20 rounded-3xl p-6">
              <p className="text-red-300 text-sm mb-2">
                {lang === 'fr' ? '📋 Votre historique' : '📋 Your history'}
              </p>
              <div className="space-y-1">
                <p className="text-white text-xs">
                  <span className="text-red-400 font-bold">3/3</span> {lang === 'fr' ? 'demandes rejetées' : 'requests rejected'}
                </p>
                <p className="text-gray-500 text-xs">
                  {lang === 'fr'
                    ? 'Le créateur a refusé vos demandes.'
                    : 'The creator rejected your requests.'}
                </p>
              </div>
              <div className="flex gap-1 mt-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-1.5 flex-1 rounded-full bg-red-500" />
                ))}
              </div>
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

    // ── Demande en attente → Écran d'attente
    if (hasPendingRequest) {
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
              <h1 className="text-2xl font-serif font-bold text-white">
                {lang === 'fr' ? '⏳ Demande envoyée' : '⏳ Request sent'}
              </h1>
              <p className="text-gray-400">
                {lang === 'fr'
                  ? 'Votre demande d\'adhésion est en attente de validation par le créateur.'
                  : 'Your join request is waiting for the creator\'s approval.'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-amber-500/20 rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                  {book?.cover_url && <img src={book.cover_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{circle.name}</p>
                  <p className="text-gray-500 text-xs">{book?.title_fr}</p>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${
                    i <= rejectedRequestsCount ? 'bg-red-500' : 'bg-white/10'
                  }`} />
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {lang === 'fr'
                  ? `${3 - rejectedRequestsCount}/3 tentatives restantes`
                  : `${3 - rejectedRequestsCount}/3 attempts left`}
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

    // ── Pas membre → Interface "Demander à rejoindre"
    return (
      <div className="fixed inset-0 bg-[#020111] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-white">
              {lang === 'fr' ? 'Rejoindre ce cercle' : 'Join this circle'}
            </h1>
            <p className="text-gray-400">
              {lang === 'fr'
                ? 'Envoyez une demande au créateur pour participer à la lecture commune.'
                : 'Send a request to the creator to join the shared reading.'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                {book?.cover_url && <img src={book.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{circle.name}</p>
                <p className="text-gray-500 text-xs">{book?.title_fr}</p>
                <p className="text-gray-600 text-xs mt-1">
                  {members.length}/{circle.max_members} {lang === 'fr' ? 'membres' : 'members'}
                </p>
              </div>
            </div>

            {/* Tentatives restantes */}
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${
                    i <= rejectedRequestsCount ? 'bg-red-500' : 'bg-white/10'
                  }`} />
                ))}
              </div>
              <p className={`text-xs font-bold ${
                3 - rejectedRequestsCount > 1 ? 'text-gray-400' : 'text-amber-400'
              }`}>
                {lang === 'fr'
                  ? `${3 - rejectedRequestsCount}/3 tentatives restantes`
                  : `${3 - rejectedRequestsCount}/3 attempts left`}
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                {lang === 'fr' ? 'Message (optionnel)' : 'Message (optional)'}
              </label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder={lang === 'fr' ? 'Pourquoi voulez-vous rejoindre ?' : 'Why do you want to join?'}
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-600 resize-none"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoinRequest}
              disabled={isSendingJoin}
              className="w-full py-3 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSendingJoin ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {lang === 'fr' ? 'Envoi...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send size={14} />
                  {lang === 'fr' ? 'Envoyer la demande' : 'Send request'}
                </>
              )}
            </motion.button>
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
          PANNEAU LATÉRAL (droite / bas) - RÉDUCTIBLE
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        animate={{ width: isSidebarExpanded ? 'auto' : '0px', opacity: isSidebarExpanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#0a0a14] border-l border-white/10 flex flex-col max-h-screen md:max-h-none overflow-hidden"
      >
        {isSidebarExpanded && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0 overflow-x-auto">
              {[
                { key: 'chat' as const, icon: MessageCircle, label: lang === 'fr' ? 'Chat' : 'Chat' },
                { key: 'reading' as const, icon: BookOpen, label: lang === 'fr' ? 'Lecture' : 'Reading' },
                { key: 'notes' as const, icon: FileText, label: lang === 'fr' ? 'Notes' : 'Notes' },
                { key: 'members' as const, icon: Users, label: lang === 'fr' ? 'Membres' : 'Members' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSidebarMode(key)}
                  className={`flex items-center justify-center gap-2 py-3 px-3 text-sm font-bold transition-all flex-shrink-0 whitespace-nowrap ${sidebarMode === key
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
                  {/* INDICATEUR DE PRÉSENCE */}
                  <div className="p-3 border-b border-white/10 flex-shrink-0">
                    <PresenceIndicator
                      presentUsers={presentUsers}
                      allMembers={members}
                      lang={lang}
                    />
                  </div>

                  {/* MESSAGES ÉPINGLÉS */}
                  {pinnedMessages.length > 0 && (
                    <div className="p-3 border-b border-white/10 flex-shrink-0">
                      <PinnedMessagesPanel
                        pinnedMessages={pinnedMessages}
                        onUnpin={(msgId) => unpinMessage(msgId)}
                        isCreator={isCreator}
                        userId={user?.id}
                        lang={lang}
                      />
                    </div>
                  )}

                  {/* BARRE DE RECHERCHE */}
                  <div className="p-3 border-b border-white/10 flex-shrink-0">
                    <ChatSearch
                      onSearch={setSearchQuery}
                      lang={lang}
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>{lang === 'fr' ? 'Aucun message' : 'No messages'}</p>
                      </div>
                    ) : (
                      <>
                        {filteredMessages.map((msg) => {
                          const memberProfile = members.find(m => m.user_id === msg.user_id)?.profiles;
                          const displayName = memberProfile?.full_name || msg.profiles?.full_name || 'Anonyme';
                          const isOnline = presentUsers.some(u => u.user_id === msg.user_id);

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group flex gap-2"
                            >
                              <div className="relative w-8 h-8 flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold overflow-hidden">
                                  {memberProfile?.avatar_url ? (
                                    <img src={memberProfile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    displayName?.[0]?.toUpperCase() || '?'
                                  )}
                                </div>
                                {isOnline && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a14] shadow-lg" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {msg.repliedToMessage && (
                                  <MessageQuotePreview message={msg.repliedToMessage} />
                                )}

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

                                {msg.reactions && msg.reactions.length > 0 && (
                                  <MessageReactions
                                    reactions={msg.reactions}
                                    onAddReaction={(emoji) => addReaction(msg.id, emoji)}
                                    onRemoveReaction={(emoji) => removeReaction(msg.id, emoji)}
                                  />
                                )}

                                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setRepliedToMessage(msg)}
                                    className="p-1 text-gray-600 hover:text-blue-400 transition-colors rounded"
                                    title={lang === 'fr' ? 'Répondre' : 'Reply'}
                                  >
                                    <MessageCircle size={12} />
                                  </button>

                                  <button
                                    onClick={() => addReaction(msg.id, '👍')}
                                    className="p-1 text-gray-600 hover:text-yellow-400 transition-colors rounded"
                                    title={lang === 'fr' ? 'Aimer' : 'React'}
                                  >
                                    <Heart size={12} />
                                  </button>

                                  {isCreator && (
                                    <button
                                      onClick={() => msg.isPinned ? unpinMessage(msg.id) : pinMessage(circleId, msg.id)}
                                      className={`p-1 transition-colors rounded ${msg.isPinned
                                        ? 'text-amber-400'
                                        : 'text-gray-600 hover:text-amber-400'
                                        }`}
                                      title={lang === 'fr' ? 'Épingler' : 'Pin'}
                                    >
                                      <Pin size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {repliedToMessage && (
                    <div className="px-4 pt-2 flex items-start gap-2 pb-2 border-t border-white/10">
                      <MessageQuotePreview message={repliedToMessage} />
                      <button
                        onClick={() => setRepliedToMessage(null)}
                        className="p-1 text-gray-600 hover:text-white transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-4 border-t border-white/10 flex-shrink-0 space-y-2">
                    {showMentions && (
                      <MentionsList
                        members={members}
                        onSelectMember={handleSelectMention}
                        lang={lang}
                      />
                    )}

                    <div className="flex gap-2 relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => {
                          setChatInput(e.target.value);
                          handleMentionInput(e.target.value);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={lang === 'fr' ? 'Message... (@ pour mentionner)' : 'Message... (@ to mention)'}
                        disabled={isSendingMessage}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50 placeholder:text-gray-600"
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

              {sidebarMode === 'reading' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Statistiques */}
                  {enrichedStats && (
                    <ReadingStatsPanel stats={enrichedStats} lang={lang} />
                  )}

                  {/* Repères */}
                  <BookmarksPanel
                    bookmarks={bookmarks}
                    onAddBookmark={addBookmark}
                    onRemoveBookmark={removeBookmark}
                    currentPage={currentMember?.current_page || 1}
                    lang={lang}
                  />

                  {/* Timeline */}
                  {events.length > 0 && (
                    <EventsTimeline events={events} lang={lang} />
                  )}

                  {/* Sondages */}
                  {polls.length > 0 && (
                    <PollsPanel polls={polls} onVote={votePoll} lang={lang} />
                  )}

                  {/* Résumés */}
                  {summaries.length > 0 && (
                    <SummariesPanel summaries={summaries} onVote={voteSummary} lang={lang} />
                  )}

                  {/* Questions */}
                  {quizzes.length > 0 && (
                    <QuizzesPanel quizzes={quizzes} onAnswer={answerQuiz} lang={lang} />
                  )}
                </div>
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
                  {members.map((member) => {
                    const isOnline = presentUsers.some(u => u.user_id === member.user_id);

                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:border-white/10 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative w-8 h-8 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex-shrink-0 flex items-center justify-center text-emerald-400 text-xs font-bold overflow-hidden">
                                {member.profiles?.avatar_url ? (
                                  <img src={member.profiles.avatar_url} alt={member.profiles?.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  member.profiles?.full_name?.[0] || '?'
                                )}
                              </div>
                              {isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a14] shadow-lg" />
                              )}
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
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>

            {/* ✅ BOUTON TOGGLE SIDEBAR - DÉPLAÇABLE */}
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.2}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className="fixed z-50 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all cursor-grab active:cursor-grabbing bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
        style={{
          bottom: 100,
          right: 24,
        }}
        title={lang === 'fr' ? (isSidebarExpanded ? 'Réduire' : 'Agrandir') : (isSidebarExpanded ? 'Collapse' : 'Expand')}
      >
        {isSidebarExpanded ? '◄' : '►'}
        
        {/* 🔴 NOTIFICATION ROUGE - Nouveau message (seulement si sidebar fermée) */}
        {!isSidebarExpanded && messages.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#020111] animate-pulse"
          />
        )}
        
        {/* 🔵 NOTIFICATION BLEU - Nouveau repère (seulement si sidebar fermée) */}
        {!isSidebarExpanded && bookmarks.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-[#020111] animate-pulse"
          />
        )}
      </motion.button>

      {/* ═══════════════════════════════════════════════════════════
          SETTINGS MODAL
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

           {/* Non-creator leave button - DÉPLAÇABLE */}
      {!isCreator && (
        <motion.button
          drag
          dragMomentum={false}
          dragElastic={0.2}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLeaveCircle}
          className="fixed z-40 p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30 cursor-grab active:cursor-grabbing"
          style={{
            bottom: 50,
            right: 24,
          }}
          title={lang === 'fr' ? 'Quitter le cercle' : 'Leave circle'}
        >
          <LogOut size={18} />
        </motion.button>
      )}
    </div>
  );
}