"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface PaywallModalProps {
  isOpen: boolean;
  productType: 'investigation' | 'book';
  productId: string;
  productTitle: string;
  pricing: {
    price_xof_cfa: number;
    price_eur: number;
  };
  lang: 'fr' | 'en';
  onClose: () => void;
  onTrialStart?: () => void;
}

const translations = {
  fr: {
    unlock: 'ACCÈS PREMIUM',
    pay: 'Payer l\'accès',
    trial: 'Commencer l\'essai gratuit (30 min)',
    processing: 'Sécurisation...',
    location: 'Zone détectée :',
  },
  en: {
    unlock: 'PREMIUM ACCESS',
    pay: 'Pay for access',
    trial: 'Start free trial (30 min)',
    processing: 'Securing...',
    location: 'Detected zone :',
  },
};

export default function PaywallModal({
  isOpen,
  productType,
  productId,
  productTitle,
  pricing,
  lang = 'fr',
  onClose,
  onTrialStart,
}: PaywallModalProps) {
  const t = translations[lang];
  const [currency, setCurrency] = useState<'XOF' | 'EUR'>('EUR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // 1️⃣ Détection de la devise selon le pays
  useEffect(() => {
    if (!isOpen) return;
    const detectCurrency = async () => {
      try {
        const response = await fetch('/api/payments/get-user-currency');
        const data = await response.json();
        if (data.success) {
          setCurrency(data.currency);
          setDetectedCountry(data.country_name);
        }
      } catch (err) {
        setCurrency('EUR');
      }
    };
    detectCurrency();
  }, [isOpen]);

  const amount = currency === 'XOF' ? pricing.price_xof_cfa : pricing.price_eur;
  const displayAmount = currency === 'XOF'
    ? `${amount.toLocaleString()} CFA`
    : `${amount.toFixed(2)} €`;

  // 2️⃣ Lancement du paiement
  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert(lang === 'fr' ? 'Connectez-vous pour payer.' : 'Log in to pay.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/payments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productType, 
          productId, 
          currency, 
          userId: session.user.id, 
          userEmail: session.user.email 
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(`${lang === 'fr' ? 'Erreur' : 'Error'}: ${data.error}`);
        setIsProcessing(false);
        return;
      }

      // ✅ REDIRECTION VERS LA PAGE SÉCURISÉE DE FEDAPAY (Zéro bug de widget)
      const publicKey = process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY || '';
      const isLive = !publicKey.includes('sandbox');
      const checkoutBaseUrl = isLive 
        ? 'https://checkout.fedapay.com/pay/' 
        : 'https://sandbox-checkout.fedapay.com/pay/';
      
      window.location.href = checkoutBaseUrl + data.transactionToken;

    } catch (err) {
      console.error('Payment error:', err);
      alert(lang === 'fr' ? 'Erreur réseau.' : 'Network error.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          // Design ultra compact : largeur max réduite, padding ajusté
          className="bg-[#0A0A0F] border border-[#D4AF37]/40 rounded-3xl p-5 max-w-[320px] w-full shadow-2xl flex flex-col relative"
        >
          {/* HEADER COMPACT */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Lock size={16} />
              <h2 className="text-xs font-black tracking-widest uppercase">{t.unlock}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white bg-white/5 rounded-full transition-colors">
              <X size={14} />
            </button>
          </div>

          <p className="text-white text-sm font-bold text-center mb-4 line-clamp-1 truncate">
            {productTitle}
          </p>

          {/* SWITCH DEVISE COMPACT */}
          <div className="flex bg-black p-1 rounded-lg border border-white/10 mb-4">
            <button
              onClick={() => setCurrency('XOF')}
              className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-all ${
                currency === 'XOF' ? 'bg-[#D4AF37] text-black' : 'text-gray-400'
              }`}
            >
              CFA
            </button>
            <button
              onClick={() => setCurrency('EUR')}
              className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-all ${
                currency === 'EUR' ? 'bg-[#D4AF37] text-black' : 'text-gray-400'
              }`}
            >
              EUR
            </button>
          </div>

          {/* GROS BLOC PRIX (Très visible) */}
          <div className="text-center mb-6">
            <h3 className="text-4xl font-black text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] tracking-tighter">
              {displayAmount}
            </h3>
            {detectedCountry && (
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-mono">
                {t.location} {detectedCountry}
              </p>
            )}
          </div>

          {/* BOUTON PAYER */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-3.5 bg-[#D4AF37] hover:bg-yellow-400 text-black rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] mb-4"
          >
            {isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> {t.processing}</>
            ) : (
              <><ShieldCheck size={16} /> {t.pay}</>
            )}
          </button>

          {/* LIEN ESSAI GRATUIT DISCRET */}
          <button
            onClick={() => {
              if (onTrialStart) onTrialStart();
              onClose();
            }}
            className="text-xs text-gray-400 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors text-center"
          >
            {t.trial}
          </button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}