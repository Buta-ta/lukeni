// app/auth/page.tsx

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Mail, Lock, User, ArrowLeft,
  LogIn, UserPlus, KeyRound, Eye, EyeOff, CheckCircle2, ArrowRight, AlertTriangle, Globe
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <defs>
      <linearGradient id="cauris" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <path fill="url(#cauris)"
      d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5Z
         M50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
  </svg>
);

const AuthBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-purple-600/20 to-transparent blur-3xl" 
      style={{ animation: 'pulse 8s ease-in-out infinite' }} />
    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-[#D4AF37]/10 to-transparent blur-3xl" 
      style={{ animation: 'pulse 6s ease-in-out infinite 1s' }} />
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
    `}</style>
  </div>
);

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ✅ LANGUE LUES DEPUIS LOCALSTORAGE (partagée avec la landing)
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    const stored = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (stored === 'fr' || stored === 'en') {
      setLang(stored);
    }
  }, []);

  // ✅ SAUVEGARDER LA LANGUE QUAND ELLE CHANGE
  const handleLangToggle = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    localStorage.setItem('lukeni_lang', newLang);
  };

  const getRedirectPath = () => searchParams.get('redirect') || '/explore';

  useEffect(() => {
  const reason = searchParams.get('reason');
  const deleted = searchParams.get('deleted');

  // ✅ Message de suppression réussie
  if (deleted === 'true') {
    setSuccess(lang === 'fr'
      ? '✅ Compte supprimé. Créez un nouveau compte pour continuer.'
      : '✅ Account deleted. Create a new account to continue.');
  }

  if (reason === 'timeout') {
    setError(lang === 'fr'
      ? '⏱️ Vous avez été déconnecté pour inactivité. Reconnectez-vous.'
      : '⏱️ You were logged out due to inactivity. Please log in again.');
  }


    const redirectTo = getRedirectPath();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('✅ Session existante');
        setIsRedirecting(true);
        window.location.href = redirectTo;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth event:', event);

      if (event === 'SIGNED_IN' && session) {
        console.log('✅ SIGNED_IN → redirection');
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = getRedirectPath();
        }, 300);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
      }
    });

    const type = searchParams.get('type');
    if (type === 'recovery') setView('reset');

    return () => subscription.unsubscribe();
  }, [searchParams, lang]);

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        if (err.message.includes('Invalid login credentials')) {
          setError(lang === 'fr' ? 'Email ou mot de passe incorrect.' : 'Email or password incorrect.');
        } else if (err.message.includes('rate limit')) {
          setError(lang === 'fr'
            ? '⏱️ Trop de tentatives. Réessaie dans quelques minutes.'
            : '⏱️ Too many attempts. Please try again in a few minutes.');
        } else {
          setError(lang === 'fr'
            ? 'Impossible de se connecter. Réessaie plus tard.'
            : 'Unable to connect. Please try again later.');
        }
        console.error('Login error (logged internally):', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'already_registered') {
          setError(lang === 'fr' ? 'Cet email est déjà utilisé. Connecte-toi !' : 'This email is already registered. Please log in!');
        } else {
          setError(data.error || (lang === 'fr' ? 'Impossible de créer le compte.' : 'Unable to create account.'));
        }
        return;
      }

      if (data.session) {
        setSuccess(lang === 'fr' ? '✅ Compte créé ! Connexion...' : '✅ Account created! Logging in...');
        await supabase.auth.setSession(data.session);

        setTimeout(() => {
          window.location.href = getRedirectPath();
        }, 1000);
      } else {
        setSuccess(lang === 'fr' ? '✅ Compte créé ! Connecte-toi.' : '✅ Account created! Please log in.');
        setTimeout(() => {
          setView('login');
        }, 2000);
      }

      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      }).catch(() => {});
    } catch (err: any) {
      console.error('Registration error:', err.message);
      setError(lang === 'fr' ? 'Erreur de connexion au serveur.' : 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setError(lang === 'fr' ? 'Impossible de se connecter avec Google.' : 'Unable to connect with Google.');
        console.error('Google auth error (logged internally):', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (err) {
        setError(lang === 'fr'
          ? 'Impossible d\'envoyer le lien. Réessaie plus tard.'
          : 'Unable to send link. Please try again later.');
        console.error('Password reset error (logged internally):', err.message);
      } else {
        setSuccess(lang === 'fr' ? '📬 Lien envoyé à ton email.' : '📬 Link sent to your email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(lang === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(lang === 'fr'
          ? 'Impossible de mettre à jour le mot de passe.'
          : 'Unable to update password.');
        console.error('Password update error (logged internally):', err.message);
      } else {
        setSuccess(lang === 'fr' ? '✅ Mot de passe mis à jour !' : '✅ Password updated!');
        setTimeout(() => router.push('/explore'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#020111] to-black flex flex-col items-center justify-center gap-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <CaurisIcon className="w-16 h-16 text-[#D4AF37]" />
        </motion.div>
        <p className="text-[#D4AF37] text-sm tracking-[0.3em] font-light animate-pulse">
          {lang === 'fr' ? 'CONNEXION EN COURS...' : 'LOGGING IN...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-[#020111] via-[#0a0a1a] to-black text-white flex flex-col items-center justify-center p-4 overflow-hidden">
      <AuthBackground />

      {/* Header avec boutons — responsive ✅ */}
      <div className="absolute top-4 md:top-6 left-0 right-0 z-10 flex items-center justify-between px-4 md:px-6">
        {/* Retour accueil — responsive ✅ */}
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-[#D4AF37] text-[10px] md:text-xs font-bold hover:text-white transition-colors uppercase tracking-widest">
          <ArrowLeft size={12} className="md:w-4 md:h-4" /> 
          <span className="hidden md:inline">{lang === 'fr' ? 'Accueil' : 'Home'}</span>
        </Link>

        {/* Bouton langue — responsive ✅ */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-white/5 border border-white/10 
            rounded-full text-white hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] 
            transition-all font-bold text-xs md:text-xs uppercase tracking-widest"
        >
          <Globe size={12} className="md:w-4 md:h-4" /> {lang.toUpperCase()}
        </motion.button>
      </div>

      {/* Card Cauris — forme arrondie asymétrique ✅ */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
        className="w-full max-w-md relative z-10 mt-12 md:mt-16 px-2 md:px-0"
      >
        {/* Glow arrière-plan */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-purple-600/5 rounded-[40px] blur-xl" />
        
        {/* Card avec clip-path pour forme cauris ✅ */}
        <div 
          className="relative bg-[#020111]/60 backdrop-blur-2xl border border-white/10 p-6 md:p-8 shadow-2xl"
          style={{
            clipPath: 'polygon(15% 0%, 85% 0%, 95% 20%, 98% 50%, 95% 80%, 85% 100%, 15% 100%, 5% 80%, 2% 50%, 5% 20%)',
            boxShadow: 'inset 0 -30px 60px rgba(212,175,55,0.05), 0 20px 60px rgba(0,0,0,0.5)'
          }}
        >
          {/* Glow de la bordure interne */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: 'polygon(15% 0%, 85% 0%, 95% 20%, 98% 50%, 95% 80%, 85% 100%, 15% 100%, 5% 80%, 2% 50%, 5% 20%)',
              background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.1) 0%, transparent 70%)',
              animation: 'breathing 4s ease-in-out infinite'
            }}
          />

          {/* Header avec logo — responsive ✅ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 flex flex-col items-center mb-6 md:mb-8 pb-5 md:pb-6 border-b border-white/5"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-3 md:mb-4"
            >
              <CaurisIcon className="w-10 h-10 md:w-14 md:h-14 text-[#D4AF37]" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-serif tracking-wider text-white mb-1">LUKENI</h1>
            <p className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em]">
              {lang === 'fr' ? 'Mémoire • Musique • Genèse' : 'Memory • Music • Genesis'}
            </p>
          </motion.div>

          {/* Tabs — responsive ✅ */}
          {(view === 'login' || view === 'register') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10 flex justify-center mb-6 md:mb-8 gap-1 bg-white/5 rounded-xl p-1"
            >
              <button
                onClick={() => switchView('login')}
                className={`flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                  view === 'login'
                    ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {lang === 'fr' ? 'Connexion' : 'Sign in'}
              </button>
              <button
                onClick={() => switchView('register')}
                className={`flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                  view === 'register'
                    ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {lang === 'fr' ? 'Inscription' : 'Sign up'}
              </button>
            </motion.div>
          )}

          {/* Header pour forgot/reset — responsive ✅ */}
          {(view === 'forgot' || view === 'reset') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mb-6 md:mb-8 pb-5 md:pb-6 border-b border-white/5">
              {view === 'forgot' && (
                <button
                  onClick={() => switchView('login')}
                  className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] text-[10px] md:text-xs mb-4 transition-colors uppercase tracking-widest font-bold"
                >
                  <ArrowLeft size={12} /> {lang === 'fr' ? 'Retour' : 'Back'}
                </button>
              )}
              <h2 className="text-xl md:text-2xl font-serif text-white">
                {view === 'forgot'
                  ? (lang === 'fr' ? 'Mot de passe oublié' : 'Forgot password')
                  : (lang === 'fr' ? 'Nouveau mot de passe' : 'New password')}
              </h2>
            </motion.div>
          )}

          {/* Messages — responsive ✅ */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="relative z-10 mb-4 md:mb-6 p-3 md:p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[11px] md:text-xs flex items-start gap-2 md:gap-3"
              >
                <AlertTriangle size={12} className="md:w-4 md:h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="relative z-10 mb-4 md:mb-6 p-3 md:p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-[11px] md:text-xs flex items-center gap-2 md:gap-3"
              >
                <CheckCircle2 size={12} className="md:w-4 md:h-4 flex-shrink-0" /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms — responsive ✅ */}
          {view === 'login' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleLogin}
              className="relative z-10 space-y-3 md:space-y-4"
            >
              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Email' : 'Email'}
                </label>
                <div className="relative group">
                  <Mail size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Mot de passe' : 'Password'}
                </label>
                <div className="relative group">
                  <Lock size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} className="md:w-4 md:h-4" /> : <Eye size={14} className="md:w-4 md:h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1 md:pt-2">
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-[9px] md:text-[10px] text-white/50 hover:text-[#D4AF37] transition-colors uppercase tracking-widest font-bold"
                >
                  {lang === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn size={14} className="md:w-4 md:h-4" /> {lang === 'fr' ? 'Se connecter' : 'Sign in'}
                  </>
                )}
              </motion.button>
            </motion.form>
          )}

          {view === 'register' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleRegister}
              className="relative z-10 space-y-3 md:space-y-4"
            >
              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Nom complet' : 'Full name'}
                </label>
                <div className="relative group">
                  <User size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={lang === 'fr' ? 'Votre nom' : 'Your name'}
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Email' : 'Email'}
                </label>
                <div className="relative group">
                  <Mail size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Mot de passe' : 'Password'}
                </label>
                <div className="relative group">
                  <Lock size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} className="md:w-4 md:h-4" /> : <Eye size={14} className="md:w-4 md:h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus size={14} className="md:w-4 md:h-4" /> {lang === 'fr' ? 'Créer mon compte' : 'Create account'}
                  </>
                )}
              </motion.button>
            </motion.form>
          )}

          {view === 'forgot' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleForgotPassword}
              className="relative z-10 space-y-3 md:space-y-4"
            >
              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Email' : 'Email'}
                </label>
                <div className="relative group">
                  <Mail size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight size={14} className="md:w-4 md:h-4" /> {lang === 'fr' ? 'Envoyer le lien' : 'Send link'}
                  </>
                )}
              </motion.button>
            </motion.form>
          )}

          {view === 'reset' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleResetPassword}
              className="relative z-10 space-y-3 md:space-y-4"
            >
              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Nouveau mot de passe' : 'New password'}
                </label>
                <div className="relative group">
                  <KeyRound size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} className="md:w-4 md:h-4" /> : <Eye size={14} className="md:w-4 md:h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] text-white/50 mb-1.5 md:mb-2 uppercase tracking-widest font-bold">
                  {lang === 'fr' ? 'Confirmer' : 'Confirm'}
                </label>
                <div className="relative group">
                  <KeyRound size={14} className="md:w-4 md:h-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 group-focus-within:border-[#D4AF37]/50 group-focus-within:bg-white/[0.08] rounded-lg md:rounded-xl pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-white text-sm outline-none transition-all duration-300"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={14} className="md:w-4 md:h-4" /> : <Eye size={14} className="md:w-4 md:h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || password !== confirmPassword}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound size={14} className="md:w-4 md:h-4" /> {lang === 'fr' ? 'Mettre à jour' : 'Update'}
                  </>
                )}
              </motion.button>
            </motion.form>
          )}

          {/* Google Auth — responsive ✅ */}
          {(view === 'login' || view === 'register') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 mt-6 md:mt-8 pt-5 md:pt-8 border-t border-white/5"
            >
              <div className="flex items-center gap-3 mb-4 md:mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-white/40 text-[9px] md:text-xs uppercase tracking-widest font-bold">{lang === 'fr' ? 'ou' : 'or'}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 md:gap-3 bg-white/10 border border-white/20 hover:border-white/40 hover:bg-white/15 text-white py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest transition-all duration-300 disabled:opacity-50"
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="hidden md:inline">{lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}</span>
                <span className="md:hidden">{lang === 'fr' ? 'Google' : 'Google'}</span>
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Footer hint — responsive ✅ */}
      {(view === 'login' || view === 'register') && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 md:mt-8 text-white/30 text-xs text-center relative z-10 max-w-md px-4"
        >
          {view === 'login'
            ? (lang === 'fr' ? "Pas encore de compte ? " : "No account yet? ")
            : (lang === 'fr' ? "Déjà inscrit ? " : "Already registered? ")}
          <button
            onClick={() => switchView(view === 'login' ? 'register' : 'login')}
            className="text-[#D4AF37] hover:text-white transition-colors font-bold"
          >
            {view === 'login'
              ? (lang === 'fr' ? "Créer un compte" : "Create account")
              : (lang === 'fr' ? "Se connecter" : "Sign in")}
          </button>
        </motion.p>
      )}

      {/* CSS Breathing animation */}
      <style>{`
        @keyframes breathing {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

export default function UserAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020111] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}