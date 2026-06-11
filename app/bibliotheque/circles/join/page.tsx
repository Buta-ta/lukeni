'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import CircleLoadingScreen from '@/components/CircleLoadingScreen';

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// 🎨 COMPOSANT MODALE RÉUTILISABLE
// ============================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  children?: React.ReactNode;
}

function Modal({ isOpen, onClose, type, title, message, children }: ModalProps) {
  const icons = {
    success: <CheckCircle size={48} className="text-emerald-400" />,
    error: <XCircle size={48} className="text-red-400" />,
    warning: <AlertCircle size={48} className="text-amber-400" />,
    info: <AlertCircle size={48} className="text-blue-400" />,
  };

  const colors = {
    success: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    error: 'from-red-500/20 to-red-500/5 border-red-500/30',
    warning: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    info: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-gradient-to-br ${colors[type]} border rounded-3xl w-full max-w-md overflow-hidden`}
          >
            {/* Header */}
            <div className="p-6 text-center space-y-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <X size={20} />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                className="flex justify-center"
              >
                {icons[type]}
              </motion.div>

              <div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2">
                  {title}
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Content */}
            {children && (
              <div className="px-6 pb-6">
                {children}
              </div>
            )}

            {/* Close button */}
            <div className="p-6 pt-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3 bg-white/10 border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-colors"
              >
                OK
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// 📊 COMPOSANT COMPTEUR DE TENTATIVES
// ============================================================================
interface AttemptsCounterProps {
  remaining: number;
  total: number;
  lang: 'fr' | 'en';
}

function AttemptsCounter({ remaining, total, lang }: AttemptsCounterProps) {
  const used = total - remaining;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {lang === 'fr' ? 'Tentatives restantes' : 'Attempts remaining'}
        </span>
        <span className={`text-sm font-bold ${
          remaining === 0 ? 'text-red-400' : 
          remaining === 1 ? 'text-amber-400' : 
          'text-emerald-400'
        }`}>
          {remaining}/{total}
        </span>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all ${
              i < used ? 'bg-red-500' : 'bg-emerald-500/30'
            }`}
          />
        ))}
      </div>

      {remaining === 0 && (
        <p className="text-xs text-red-400">
          {lang === 'fr' 
            ? '❌ Vous ne pouvez plus envoyer de demande pour ce cercle'
            : '❌ You cannot send more requests for this circle'}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// 🎯 COMPOSANT PRINCIPAL
// ============================================================================
function JoinCircleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCode = searchParams.get('code');
  
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [circle, setCircle] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // ✅ États pour les modales
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  // ✅ État pour le compteur de tentatives
  const [attemptsInfo, setAttemptsInfo] = useState<{
    total: number;
    remaining: number;
  }>({
    total: 3,
    remaining: 3,
  });

  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // ✅ Charger les tentatives restantes
  useEffect(() => {
    if (!user || !circle) return;

    const loadAttempts = async () => {
      try {
        const { data: requests } = await supabase
          .from('circle_join_requests')
          .select('status')
          .eq('circle_id', circle.id)
          .eq('user_id', user.id);

        const rejectedCount = (requests || []).filter(r => r.status === 'rejected').length;
        const remaining = Math.max(0, 3 - rejectedCount);

        setAttemptsInfo({
          total: 3,
          remaining,
        });
      } catch (err) {
        console.error('Load attempts error:', err);
      }
    };

    loadAttempts();
  }, [user, circle]);

  useEffect(() => {
    if (urlCode) {
      setManualCode(urlCode.toUpperCase());
    }
  }, [urlCode]);

  useEffect(() => {
    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
  }, []);

  useEffect(() => {
    const effectiveCode = urlCode || manualCode;
    
    if (!effectiveCode) {
      setIsLoading(false);
      return;
    }

    const loadCircle = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: circleData, error: circleError } = await supabase
          .from('reading_circles')
          .select('*')
          .eq('access_code', effectiveCode.toUpperCase())
          .single();

        if (circleError || !circleData) {
          setError(lang === 'fr' ? 'Code invalide' : 'Invalid code');
          setCircle(null);
          return;
        }

        setCircle(circleData);

        const { data: bookData } = await supabase
          .from('library_books')
          .select('*')
          .eq('id', circleData.book_id)
          .single();

        setBook(bookData);
      } catch (err: any) {
        setError(err.message);
        console.error('Load circle error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(loadCircle, 300);
    return () => clearTimeout(timer);
  }, [urlCode, manualCode, lang]);

  // ============================================================================
  // ✅ FONCTION D'ENVOI DE DEMANDE (avec modales)
  // ============================================================================
  const handleSubmitJoinRequest = async () => {
    if (!user || !circle) return;

    setIsSubmitting(true);
    try {
      // 1. Vérifier si déjà membre
      const { data: existingMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        router.push(`/bibliotheque/circles/${circle.id}`);
        return;
      }

      // 2. Charger l'historique des demandes
      const { data: existingRequests } = await supabase
        .from('circle_join_requests')
        .select('id, status')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id);

      const rejectedCount = (existingRequests || []).filter(r => r.status === 'rejected').length;
      const pendingRequest = (existingRequests || []).find(r => r.status === 'pending');

      // 3. Vérifier le nombre de tentatives
      if (rejectedCount >= 3) {
        setModalState({
          isOpen: true,
          type: 'error',
          title: lang === 'fr' ? '❌ Accès refusé' : '❌ Access denied',
          message: lang === 'fr'
            ? 'Vous avez atteint le nombre maximum de demandes pour ce cercle.'
            : 'You have reached the maximum number of requests for this circle.',
        });
        setIsSubmitting(false);
        return;
      }

      // 4. Vérifier s'il y a déjà une demande en attente
      if (pendingRequest) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: lang === 'fr' ? '⏳ Demande en cours' : '⏳ Pending request',
          message: lang === 'fr'
            ? 'Vous avez déjà une demande en attente pour ce cercle. Patientez la réponse du créateur.'
            : 'You already have a pending request for this circle. Wait for the creator\'s response.',
        });
        setIsSubmitting(false);
        return;
      }

      // 5. Envoyer la demande
      const { error } = await supabase
        .from('circle_join_requests')
        .insert({
          circle_id: circle.id,
          user_id: user.id,
          status: 'pending',
        });

      if (error) throw error;

      // 6. Afficher le succès
      setShowSuccessScreen(true);

    } catch (err: any) {
      console.error('Submit join request error:', err);
      
      setModalState({
        isOpen: true,
        type: 'error',
        title: lang === 'fr' ? '❌ Erreur' : '❌ Error',
        message: err.message || (lang === 'fr' 
          ? 'Une erreur est survenue lors de l\'envoi de votre demande.'
          : 'An error occurred while sending your request.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && (urlCode || manualCode)) {
    return <CircleLoadingScreen lang={lang} />;
  }

  // ============================================================================
  // ✅ ÉCRAN DE SUCCÈS
  // ============================================================================
  if (showSuccessScreen) {
    return (
      <div className="min-h-screen bg-[#020111] text-white">
        <header className="sticky top-0 z-40 bg-[#020111]/95 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/bibliotheque" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Bibliothèque</span>
            </Link>
            <div className="flex items-center gap-2">
              <CaurisIcon className="w-5 h-5 text-emerald-500" />
              <span className="font-serif text-sm tracking-widest text-white/80">
                {lang === 'fr' ? 'Rejoindre' : 'Join'}
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
            <div className="text-center space-y-3 mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex justify-center mb-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
              </motion.div>

              <h1 className="text-3xl font-serif font-bold">
                {lang === 'fr' ? '✅ Demande envoyée !' : '✅ Request sent!'}
              </h1>
              <p className="text-gray-400">
                {lang === 'fr'
                  ? 'Le créateur du cercle examinera votre demande'
                  : 'The circle creator will review your request'}
              </p>
            </div>

            {circle && (
              <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl overflow-hidden p-6">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 mb-4" />
                
                {book && (
                  <div className="flex gap-4 mb-4 pb-4 border-b border-white/[0.06]">
                    <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                      <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                        {lang === 'fr' ? 'Livre à lire' : 'Book to read'}
                      </p>
                      <h3 className="text-white font-serif text-lg font-bold">{book.title_fr}</h3>
                      <p className="text-gray-400 text-sm">{book.author_fr}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                      {lang === 'fr' ? 'Nom du cercle' : 'Circle name'}
                    </p>
                    <h2 className="text-white text-xl font-bold">{circle.name}</h2>
                  </div>

                  {/* ✅ Compteur de tentatives */}
                  <AttemptsCounter
                    remaining={attemptsInfo.remaining - 1}
                    total={attemptsInfo.total}
                    lang={lang}
                  />
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <AlertCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-300 text-sm leading-relaxed">
                {lang === 'fr'
                  ? "Vous recevrez une notification dès que le créateur répondra à votre demande."
                  : 'You will receive a notification as soon as the creator responds to your request.'}
              </p>
            </div>

            <Link
              href="/bibliotheque"
              className="block text-center bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors"
            >
              {lang === 'fr' ? 'Retour à la bibliothèque' : 'Back to library'}
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020111] text-white">
      <header className="sticky top-0 z-40 bg-[#020111]/95 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/bibliotheque" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Bibliothèque</span>
          </Link>
          <div className="flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-emerald-500" />
            <span className="font-serif text-sm tracking-widest text-white/80">
              {lang === 'fr' ? 'Rejoindre' : 'Join'}
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
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-3xl font-serif font-bold">
              {lang === 'fr' ? 'Rejoindre un cercle' : 'Join a circle'}
            </h1>
            <p className="text-gray-400">
              {lang === 'fr'
                ? 'Entrez le code d\'accès pour rejoindre'
                : 'Enter the access code to join'}
            </p>
          </div>

          {!circle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3">
                  {lang === 'fr' ? 'Code d\'accès' : 'Access code'}
                </label>
                <input
                  type="text"
                  placeholder="ABCDEF"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-white text-center font-mono text-2xl tracking-[0.2em] outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-600 uppercase"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-300"
                >
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {circle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />

                <div className="p-6 space-y-4">
                  {book && (
                    <div className="flex gap-4 mb-4 pb-4 border-b border-white/[0.06]">
                      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                          {lang === 'fr' ? 'Livre à lire' : 'Book to read'}
                        </p>
                        <h3 className="text-white font-serif text-lg font-bold">{book.title_fr}</h3>
                        <p className="text-gray-400 text-sm">{book.author_fr}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                        {lang === 'fr' ? 'Nom du cercle' : 'Circle name'}
                      </p>
                      <h2 className="text-white text-xl font-bold">{circle.name}</h2>
                    </div>

                    {/* ✅ Afficher le compteur de tentatives */}
                    {user && (
                      <AttemptsCounter
                        remaining={attemptsInfo.remaining}
                        total={attemptsInfo.total}
                        lang={lang}
                      />
                    )}
                  </div>
                </div>
              </div>

              {!user ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                >
                  <p className="text-blue-300 text-sm mb-3">
                    {lang === 'fr'
                      ? 'Connectez-vous pour rejoindre ce cercle'
                      : 'Sign in to join this circle'}
                  </p>
                  <Link href="/auth" className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors">
                    {lang === 'fr' ? 'Se connecter' : 'Sign in'}
                  </Link>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitJoinRequest}
                  disabled={isSubmitting || attemptsInfo.remaining === 0}
                  className="w-full py-3.5 bg-emerald-500 text-black rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {lang === 'fr' ? 'Envoi...' : 'Sending...'}
                    </>
                  ) : attemptsInfo.remaining === 0 ? (
                    <>
                      <XCircle size={16} />
                      {lang === 'fr' ? 'Aucune tentative restante' : 'No attempts left'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      {lang === 'fr' ? 'Envoyer la demande' : 'Send request'}
                    </>
                  )}
                </motion.button>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* ✅ MODALE */}
       <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      >
        {user && circle && (
          <div className="mt-2 pt-4 border-t border-white/10">
            <AttemptsCounter
              remaining={attemptsInfo.remaining}
              total={attemptsInfo.total}
              lang={lang}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function JoinCirclePage() {
  return (
    <Suspense fallback={<CircleLoadingScreen />}>
      <JoinCircleContent />
    </Suspense>
  );
}