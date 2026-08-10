// components/VisitorGate.tsx
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, UserPlus, Ticket, LogOut, Loader2, AlertTriangle, PartyPopper, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useVisitorSession } from '@/lib/hooks/useVisitorSession';
import { useLanguage } from '@/lib/contexts/LanguageContext';

// ─── Badge flottant (temps restant) ──────────────────────────────────────────

export function VisitorBadge() {
  const { isVisitor, timeRemaining, isExpired, isFinalExpired, formatTime, isLoading } = useVisitorSession();
  const { lang } = useLanguage();

  if (isLoading || !isVisitor || isFinalExpired) return null;

  // Couleur selon le temps restant
  const getColor = () => {
    if (!timeRemaining) return 'text-gray-400';
    if (timeRemaining < 300) return 'text-red-400';     // < 5min
    if (timeRemaining < 1800) return 'text-orange-400';  // < 30min
    return 'text-[#D4AF37]';
  };

  const getPulse = () => {
    if (!timeRemaining) return '';
    return timeRemaining < 300 ? 'animate-pulse' : '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 
        bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 
        shadow-lg ${getPulse()}`}
    >
      <Ticket size={14} className="text-[#D4AF37]" />
      <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
        {lang === 'fr' ? 'Visiteur' : 'Visitor'}
      </span>
      <span className={`text-sm font-mono font-bold ${getColor()}`}>
        {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
      </span>
    </motion.div>
  );
}

// ─── Overlay d'expiration (2h / 4h) ─────────────────────────────────────────

export function VisitorExpiredOverlay() {
  const {
    isVisitor, isExpired, canRenew, isFinalExpired,
    isLoading, renew, timeRemaining, ticket,
  } = useVisitorSession();

  const { lang } = useLanguage();
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLoading || !isVisitor) return null;

  // ── Cas 1 : Ticket encore actif → rien à afficher
  if (!isExpired) return null;

  // ── Cas 2 : Expire après 2h, peut renouveler
  const handleRenew = async () => {
    setIsRenewing(true);
    setRenewError(null);
    const result = await renew();
    setIsRenewing(false);
    if (result.success) {
      setRenewSuccess(true);
      setTimeout(() => setRenewSuccess(false), 3000);
    } else {
      setRenewError(result.error || 'Erreur');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleCopyLink = () => {
    if (ticket?.code) {
      const url = `${window.location.origin}/visitor/ticket?code=${ticket.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── RENDU ─────────────────────────────────────────────────────────────────

  if (canRenew) {
    // Écran "Prolonger ?"
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#0a0a0f] border border-[#D4AF37]/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 mx-auto mb-6 bg-[#D4AF37]/20 rounded-full flex items-center justify-center"
          >
            <Clock size={32} className="text-[#D4AF37]" />
          </motion.div>

          <h2 className="text-2xl font-serif text-white mb-2">
            {lang === 'fr' ? '⏰ Temps écoulé !' : '⏰ Time\'s up!'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {lang === 'fr'
              ? 'Ta session de 2h est terminée. Tu peux la prolonger une fois.'
              : 'Your 2h session ended. You can extend it once.'}
          </p>

          {renewError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {renewError}
            </div>
          )}

          {renewSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs flex items-center justify-center gap-2"
            >
              <PartyPopper size={14} />
              {lang === 'fr' ? '+2h ajoutées !' : '+2h added!'}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRenew}
            disabled={isRenewing || renewSuccess}
            className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
          >
            {isRenewing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <RefreshCw size={16} />
                {lang === 'fr' ? 'Prolonger de 2h' : 'Extend 2h'}
              </>
            )}
          </motion.button>

          <button
            onClick={handleLogout}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <LogOut size={12} />
            {lang === 'fr' ? 'Quitter' : 'Leave'}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // ── Cas 3 : Fin définitive (4h écoulées)
  if (isFinalExpired) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 mx-auto mb-6 bg-orange-500/20 rounded-full flex items-center justify-center"
          >
            <AlertTriangle size={32} className="text-orange-400" />
          </motion.div>

          <h2 className="text-2xl font-serif text-white mb-2">
            {lang === 'fr' ? 'Session terminée' : 'Session ended'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {lang === 'fr'
              ? 'Ta session visiteur est arrivée à son terme. Crée un compte pour sauvegarder tes données ou génère un nouveau ticket.'
              : 'Your visitor session has ended. Create an account to save your data or generate a new ticket.'}
          </p>

          {/* Bouton Copier le lien ticket */}
          {ticket?.code && (
            <button
              onClick={handleCopyLink}
              className="w-full mb-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-mono flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied
                ? (lang === 'fr' ? 'Copié !' : 'Copied!')
                : `${ticket.code}`}
            </button>
          )}

          <Link href="/auth?mode=register&redirect=/explore">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-3"
            >
              <UserPlus size={16} />
              {lang === 'fr' ? 'Créer un compte' : 'Create account'}
            </motion.button>
          </Link>

          <Link href="/auth?mode=visitor">
            <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 mb-3">
              <Ticket size={14} />
              {lang === 'fr' ? 'Nouveau ticket' : 'New ticket'}
            </button>
          </Link>

          <button
            onClick={handleLogout}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <LogOut size={12} />
            {lang === 'fr' ? 'Retour à l\'accueil' : 'Back to home'}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}
