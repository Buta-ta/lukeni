"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Lock, ShieldCheck, Clock } from 'lucide-react';
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

// ⚠️ Pour TypeScript : On déclare que window.FedaPay va exister
declare global {
  interface Window {
    FedaPay: any;
  }
}

const translations = {
  fr: {
    unlockAccess: 'Déverrouiller l\'accès',
    amountXOF: 'Prix en CFA',
    amountEUR: 'Prix en EUR',
    basedOnLocation: 'Basé sur votre zone :',
    paySecurely: 'Payer de manière sécurisée',
    or: 'OU',
    freeTrial: 'Essai gratuit (30 min)',
    retryIn24h: 'L\'essai se renouvelle 24h après expiration',
    securedBy: 'Paiement crypté et sécurisé par FedaPay',
    processing: 'Création de la transaction...',
  },
  en: {
    unlockAccess: 'Unlock Access',
    amountXOF: 'Price in CFA',
    amountEUR: 'Price in EUR',
    basedOnLocation: 'Based on your region:',
    paySecurely: 'Pay securely',
    or: 'OR',
    freeTrial: 'Free Trial (30 min)',
    retryIn24h: 'Trial renews 24h after expiration',
    securedBy: 'Encrypted and secured by FedaPay',
    processing: 'Creating transaction...',
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

  // 1️⃣ Charger le script officiel de FedaPay discrètement en arrière-plan
  useEffect(() => {
    if (isOpen && !document.getElementById('fedapay-script')) {
      const script = document.createElement('script');
      script.id = 'fedapay-script';
      script.src = 'https://checkout.fedapay.com/js/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen]);

  // 2️⃣ Détecter la devise selon le pays
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

  // 3️⃣ Fonction pour déclencher le paiement
  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert(lang === 'fr' ? 'Vous devez être connecté pour payer.' : 'You must be logged in to pay.');
        setIsProcessing(false);
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email;
      const publicKey = process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY;

      if (!publicKey) {
        console.error("Clé publique FedaPay introuvable dans Vercel (NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY)");
      }

      // On demande le token à notre serveur
      const response = await fetch('/api/payments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, productId, currency, userId, userEmail }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(`${lang === 'fr' ? 'Erreur' : 'Error'}: ${data.error}`);
        setIsProcessing(false);
        return;
      }

      // Si le serveur a répondu avec succès
      setIsProcessing(false);

      // On ferme NOTRE modal pour ne pas cacher celui de FedaPay
      onClose();

      // On ouvre le VRAI modal sécurisé de FedaPay
      if (window.FedaPay && publicKey) {
        const widget = window.FedaPay.init({
          public_key: publicKey,
          transaction: {
            token: data.transactionToken
          },
          onComplete: () => {
            // Optionnel : tu pourrais rediriger vers la page /success ici si tu le souhaites
            // window.location.href = `/pages/payments/success?transaction_id=${data.transactionToken}`;
          }
        });
        widget.open();
      } else {
        // Mode secours (si le script JS n'est pas chargé) : on redirige vers leur page web
        const isLive = !publicKey?.includes('sandbox');
        const checkoutBaseUrl = isLive 
          ? 'https://checkout.fedapay.com/pay/' 
          : 'https://sandbox-checkout.fedapay.com/pay/';
        window.location.assign(checkoutBaseUrl + data.transactionToken);
      }

    } catch (err) {
      console.error('Payment error:', err);
      alert(lang === 'fr' ? 'Erreur de connexion' : 'Connection error');
      setIsProcessing(false);
    }
  };

  const handleTrial = () => {
    if (onTrialStart) onTrialStart();
    onClose();
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
          className="bg-[#0A0A0F] border border-[#D4AF37]/30 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col relative max-h-[90vh] overflow-y-auto"
        >
          {/* Header Compact */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 text-[#D4AF37]">
              <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-bold text-white font-serif leading-tight">
                {t.unlockAccess}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full">
              <X size={16} />
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-6 font-serif italic border-l-2 border-[#D4AF37]/50 pl-3">
            {productTitle}
          </p>

          {/* Switch EUR / CFA */}
          <div className="flex gap-2 mb-5 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setCurrency('XOF')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                currency === 'XOF' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mobile Money (CFA)
            </button>
            <button
              onClick={() => setCurrency('EUR')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                currency === 'EUR' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Carte (EUR)
            </button>
          </div>

          {/* Box Prix */}
          <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-xl mb-6 text-center border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <ShieldCheck size={64} />
            </div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1 relative z-10">
              {currency === 'XOF' ? t.amountXOF : t.amountEUR}
            </p>
            <p className="text-3xl font-black text-white relative z-10 tracking-tight">
              {displayAmount}
            </p>
            {detectedCountry && (
              <p className="text-[9px] text-gray-500 mt-2 relative z-10">
                {t.basedOnLocation} <span className="text-gray-300">{detectedCountry}</span>
              </p>
            )}
          </div>

          {/* Bouton Payer */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-[#D4AF37] hover:bg-yellow-400 text-black rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            {isProcessing ? (
              <><Loader2 size={18} className="animate-spin" /> {t.processing}</>
            ) : (
              <>🔒 {t.paySecurely}</>
            )}
          </button>

          {/* Diviseur */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold">
              <span className="px-3 bg-[#0A0A0F] text-gray-600 tracking-widest">{t.or}</span>
            </div>
          </div>

          {/* Bouton Essai */}
          <button
            onClick={handleTrial}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
          >
            <Clock size={16} className="text-gray-400" /> {t.freeTrial}
          </button>

          <p className="text-[9px] text-gray-600 text-center mt-3 mb-4">
            {t.retryIn24h}
          </p>

          {/* Sécurité Footer */}
          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-gray-600">
            <ShieldCheck size={12} />
            <p className="text-[9px] uppercase tracking-wider">{t.securedBy}</p>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}