'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

function JoinCircleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCode = searchParams.get('code');
  
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [circle, setCircle] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // ✅ Initialiser manualCode avec le code URL au montage
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

  // ✅ Charger le cercle dès qu'on a un code (URL ou manuel)
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

  const handleJoin = async () => {
    if (!user || !circle) return;

    setIsJoining(true);
    try {
      const { data: existingMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        router.push(`/bibliotheque/circles/${circle.id}`);
        return;
      }

      const { error } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circle.id,
          user_id: user.id,
          role: 'member',
          current_page: 1,
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/bibliotheque/circles/${circle.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      console.error('Join circle error:', err);
    } finally {
      setIsJoining(false);
    }
  };

  // ✅ Meilleure condition de loading
  if (isLoading && (urlCode || manualCode)) {
    return <CircleLoadingScreen lang={lang} />;
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

          {!circle && !success && (
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

              <p className="text-gray-600 text-xs text-center">
                {lang === 'fr'
                  ? 'Demandez le code au créateur du cercle'
                  : 'Ask the creator for the code'}
              </p>
            </motion.div>
          )}

          {circle && !success && (
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

                    {circle.description && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-1">
                          Description
                        </p>
                        <p className="text-gray-300 text-sm">{circle.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-white/[0.02] rounded-lg">
                        <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">
                          {lang === 'fr' ? 'Créateur' : 'Creator'}
                        </p>
                        <p className="text-white text-sm font-mono">{circle.creator_id.slice(0, 8)}...</p>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-lg">
                        <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">
                          {lang === 'fr' ? 'Places' : 'Spots'}
                        </p>
                        <p className="text-emerald-400 text-sm font-bold">{circle.max_members} {lang === 'fr' ? 'max' : 'max'}</p>
                      </div>
                    </div>
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
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full py-3.5 bg-emerald-500 text-black rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {lang === 'fr' ? 'Rejoindre...' : 'Joining...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      {lang === 'fr' ? 'Rejoindre ce cercle' : 'Join this circle'}
                    </>
                  )}
                </motion.button>
              )}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-8"
            >
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
              <h2 className="text-2xl font-serif font-bold">
                {lang === 'fr' ? '🎉 Bienvenue !' : '🎉 Welcome!'}
              </h2>
              <p className="text-gray-400">
                {lang === 'fr'
                  ? 'Vous avez rejoint le cercle avec succès'
                  : 'You successfully joined the circle'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
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