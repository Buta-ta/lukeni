// components/PaywallModal.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Lock } from 'lucide-react';

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
    unlockAccess: 'Débloquer l\'accès',
    amountXOF: 'Montant CFA',
    amountEUR: 'Montant EUR',
    basedOnLocation: 'Basé sur votre localisation :',
    mobileMoney: 'Mobile Money (Afrique)',
    orangeMoney: 'Orange Money',
    mtnMoney: 'MTN Money',
    moovMoney: 'Moov Money',
    otherMethod: 'Autre moyen',
    bankCard: 'Carte Bancaire',
    pay: 'Payer',
    or: 'ou',
    freeTrial: 'Essai gratuit 30 min',
    retryIn24h: 'Essai renouvelable dans 24h après expiration',
    securedBy: 'Sécurisé par',
    bankDataProtected: 'Vos données bancaires sont protégées',
    exchangeRate: 'Le taux utilisé : 1 EUR = 655 XOF (mis à jour quotidiennement)',
    updateDaily: '(mis à jour quotidiennement)',
    processing: 'Traitement...',
  },
  en: {
    unlockAccess: 'Unlock Access',
    amountXOF: 'CFA Amount',
    amountEUR: 'EUR Amount',
    basedOnLocation: 'Based on your location:',
    mobileMoney: 'Mobile Money (Africa)',
    orangeMoney: 'Orange Money',
    mtnMoney: 'MTN Money',
    moovMoney: 'Moov Money',
    otherMethod: 'Other method',
    bankCard: 'Bank Card',
    pay: 'Pay',
    or: 'or',
    freeTrial: 'Free 30 min trial',
    retryIn24h: 'Trial can be renewed in 24h after expiration',
    securedBy: 'Secured by',
    bankDataProtected: 'Your bank data is protected',
    exchangeRate: 'Exchange rate: 1 EUR = 655 XOF (updated daily)',
    updateDaily: '(updated daily)',
    processing: 'Processing...',
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
        console.error('Currency detection error:', err);
        setCurrency('EUR');
      }
    };

    detectCurrency();
  }, [isOpen]);

  const amount = currency === 'XOF' ? pricing.price_xof_cfa : pricing.price_eur;
  const displayAmount = currency === 'XOF'
    ? `${amount.toLocaleString()} CFA`
    : `${amount.toFixed(2)} EUR`;

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType,
          productId,
          currency,
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(`${lang === 'fr' ? 'Erreur' : 'Error'}: ${data.error}`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(lang === 'fr' ? 'Erreur lors du paiement' : 'Payment error');
      setIsProcessing(false);
    }
  };

  const handleTrial = () => {
    if (onTrialStart) {
      onTrialStart();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f0f] border border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lock size={24} className="text-[#D4AF37]" />
            <h2 className="text-2xl font-bold text-white">{t.unlockAccess}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Titre du produit */}
        <p className="text-gray-300 text-sm mb-6 line-clamp-2 font-serif">
          "{productTitle}"
        </p>

        {/* Sélecteur de devise */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setCurrency('XOF')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              currency === 'XOF'
                ? 'bg-[#D4AF37] text-black shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            🌍 CFA
          </button>
          <button
            onClick={() => setCurrency('EUR')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              currency === 'EUR'
                ? 'bg-[#D4AF37] text-black shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            💳 EUR
          </button>
        </div>

        {/* Montant affiché */}
        <div className="bg-black/50 p-4 rounded-xl mb-6 text-center border border-[#D4AF37]/20">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
            {currency === 'XOF' ? t.amountXOF : t.amountEUR}
          </p>
          <p className="text-4xl font-bold text-[#D4AF37]">{displayAmount}</p>
          {detectedCountry && (
            <p className="text-[10px] text-gray-600 mt-2">
              {t.basedOnLocation} {detectedCountry}
            </p>
          )}
        </div>

        {/* Moyens de paiement - CFA */}
        {currency === 'XOF' && (
          <div className="space-y-3 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
              {t.mobileMoney}
            </p>
            <div className="space-y-2">
              {[
                { name: t.orangeMoney, icon: '🟠' },
                { name: t.mtnMoney, icon: '🔴' },
                { name: t.moovMoney, icon: '🟢' },
              ].map((method) => (
                <button
                  key={method.name}
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white rounded-lg font-bold transition-all disabled:opacity-50 border border-white/10 flex items-center justify-center gap-2"
                >
                  {method.icon} {method.name}
                </button>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                {t.otherMethod}
              </p>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white rounded-lg font-bold transition-all disabled:opacity-50 border border-white/10 flex items-center justify-center gap-2"
              >
                💳 {t.bankCard}
              </button>
            </div>
          </div>
        )}

        {/* Paiement par carte - EUR */}
        {currency === 'EUR' && (
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-[#D4AF37] hover:bg-yellow-400 disabled:bg-[#D4AF37] text-black rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t.processing}
              </>
            ) : (
              <>
                💳 {t.pay} {displayAmount}
              </>
            )}
          </button>
        )}

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[#0f0f0f] text-gray-500">{t.or}</span>
          </div>
        </div>

        {/* Bouton Essai */}
        <button
          onClick={handleTrial}
          className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
        >
          ⏱️ {t.freeTrial}
        </button>

        <p className="text-[10px] text-gray-600 text-center mt-4">
          {t.retryIn24h}
        </p>

        {/* Sécurité */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-[10px] text-gray-600 text-center">
            🔒 {t.securedBy} <strong className="text-gray-400">Fedapay</strong>
            <br />
            {t.bankDataProtected}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}