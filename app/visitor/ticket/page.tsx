"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ArrowLeft, Ticket, Clock, QrCode, Share2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useVisitorSession } from '@/lib/hooks/useVisitorSession';

// ─── QR Code SVG généré côté client (sans dépendance externe) ────────────────

function generateQRData(text: string): boolean[][] {
  // Simple QR-like pattern visuel (pas un vrai QR code standard)
  // Pour un vrai QR code en prod, utiliser une lib comme 'qrcode'
  // Ici on génère un pattern visuel basé sur le hash du texte
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Position markers (coins)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          grid[row + r][col + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, 14);
  drawFinder(14, 0);

  // Data pattern basé sur le texte
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) continue;
      if (r < 8 && c < 8) continue;
      if (r < 8 && c > 12) continue;
      if (r > 12 && c < 8) continue;
      grid[r][c] = ((hash * (r * size + c + 1)) & 3) < 2;
    }
  }

  return grid;
}

function QRCodeSVG({ data, size = 200 }: { data: string; size?: number }) {
  const grid = generateQRData(data);
  const cellSize = size / grid.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="8" />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize - 0.5}
              height={cellSize - 0.5}
              fill="#0a0a0f"
              rx="1"
            />
          ) : null
        )
      )}
      {/* Centre avec logo */}
      <rect x={size * 0.38} y={size * 0.38} width={size * 0.24} height={size * 0.24} fill="white" rx="4" />
      <text
        x={size / 2}
        y={size / 2 + 3}
        textAnchor="middle"
        fill="#D4AF37"
        fontSize={size * 0.08}
        fontWeight="bold"
        fontFamily="serif"
      >
        LUKENI
      </text>
    </svg>
  );
}

 // ✅ Appliquer l'attribut data-landing-page au HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-profil-page', 'true');
    return () => {
      document.documentElement.setAttribute('data-profil-page', 'false');
    };
  }, []);
// ─── Page principale ─────────────────────────────────────────────────────────

function TicketContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code');
  const { lang } = useLanguage();
  const { ticket, isVisitor, timeRemaining, formatTime, isLoading } = useVisitorSession();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Code à afficher : depuis l'URL ou depuis le ticket de l'utilisateur connecté
  const code = codeFromUrl || ticket?.code || null;
  const ticketUrl = code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/visitor/ticket?code=${code}` : '';

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (ticketUrl) {
      navigator.clipboard.writeText(ticketUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && ticketUrl) {
      try {
        await navigator.share({
          title: 'Lukeni - Ticket Visiteur',
          text: `${lang === 'fr' ? 'Mon ticket visiteur Lukeni' : 'My Lukeni visitor ticket'}: ${code}`,
          url: ticketUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#020111] to-black flex flex-col items-center justify-center p-6">
        <Ticket size={48} className="text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-serif mb-2">
          {lang === 'fr' ? 'Aucun ticket' : 'No ticket'}
        </h2>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-sm">
          {lang === 'fr'
            ? 'Tu n\'as pas encore de ticket visiteur. Crée un pour explorer Lukeni !'
            : 'You don\'t have a visitor ticket yet. Create one to explore Lukeni!'}
        </p>
        <Link href="/auth?mode=visitor">
          <button className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black rounded-xl font-bold text-sm">
            {lang === 'fr' ? 'Créer un ticket' : 'Create ticket'}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020111] via-[#0a0a1a] to-black flex flex-col items-center justify-center p-4 md:p-6">
      {/* Header */}
      <div className="absolute top-4 md:top-6 left-4 md:left-6 z-10">
        <Link href="/explore" className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold hover:text-white transition-colors uppercase tracking-widest">
          <ArrowLeft size={14} />
          <span className="hidden md:inline">{lang === 'fr' ? 'Retour' : 'Back'}</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        {/* Carte ticket */}
        <div className="bg-[#0a0a0f]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl" />

          {/* Header */}
          <div className="relative z-10 text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Ticket size={18} className="text-[#D4AF37]" />
              <span className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em] font-bold">
                {lang === 'fr' ? 'Ticket Visiteur' : 'Visitor Ticket'}
              </span>
            </div>
            <h1 className="text-3xl font-serif text-white tracking-wider mb-1">LUKENI</h1>
            <p className="text-white/30 text-[9px] uppercase tracking-[0.2em]">
              {lang === 'fr' ? 'Peuple • Mémoire • Mission' : 'People • Memory • Mission'}
            </p>
          </div>

          {/* QR Code */}
          <div className="relative z-10 flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG data={ticketUrl} size={180} />
            </div>
          </div>

          {/* Code */}
          <div className="relative z-10 text-center mb-6">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
              {lang === 'fr' ? 'Code du ticket' : 'Ticket code'}
            </p>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-[#D4AF37]/30 rounded-xl hover:bg-[#D4AF37]/10 transition-all group"
            >
              <span className="text-xl font-mono font-bold text-[#D4AF37] tracking-wider">{code}</span>
              {copied
                ? <Check size={14} className="text-green-400" />
                : <Copy size={14} className="text-gray-500 group-hover:text-[#D4AF37] transition-colors" />}
            </button>
          </div>

          {/* Timer */}
          {isVisitor && timeRemaining !== null && timeRemaining > 0 && (
            <div className="relative z-10 flex items-center justify-center gap-2 mb-6 py-2.5 bg-white/[0.03] rounded-xl border border-white/5">
              <Clock size={14} className="text-[#D4AF37]" />
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                {lang === 'fr' ? 'Temps restant' : 'Time left'}
              </span>
              <span className="text-sm font-mono font-bold text-white">{formatTime(timeRemaining)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="relative z-10 space-y-2.5">
            {/* Copier le lien */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-bold hover:bg-white/10 transition-all"
            >
              {copiedLink
                ? <><Check size={14} className="text-green-400" /> {lang === 'fr' ? 'Lien copié !' : 'Link copied!'}</>
                : <><Copy size={14} /> {lang === 'fr' ? 'Copier le lien' : 'Copy link'}</>}
            </button>

            {/* Partager */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-bold hover:bg-white/10 transition-all"
            >
              <Share2 size={14} />
              {lang === 'fr' ? 'Partager' : 'Share'}
            </button>

            {/* Entrer */}
            <Link href="/explore">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#e8c547] text-black rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                {lang === 'fr' ? 'Explorer Lukeni' : 'Explore Lukeni'}
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-gray-600 text-[10px] mt-4 leading-relaxed">
          {lang === 'fr'
            ? 'Ce ticket donne un accès de 2h, renouvelable une fois. Rien n\'est sauvegardé.'
            : 'This ticket gives 2h access, renewable once. Nothing is saved.'}
        </p>
      </motion.div>
    </div>
  );
}

export default function VisitorTicketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020111] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    }>
      <TicketContent />
    </Suspense>
  );
}
