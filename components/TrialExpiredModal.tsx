// components/TrialExpiredModal.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';
import { useRouter } from 'next/navigation';

interface TrialExpiredModalProps {
  isOpen: boolean;
  investigationId: string;
  investigationTitle: string;
  pricing: any;
  lang: 'fr' | 'en';
  onClose: () => void;
}

const translations = {
  fr: {
    expired: 'Votre essai a expiré',
    subtitle: 'Vous pouvez réessayer dans 24 heures',
    nextTrial: 'Prochain essai disponible dans',
    buyAccess: 'Acheter l\'accès',
    returnInvestigations: 'Retour aux enquêtes',
  },
  en: {
    expired: 'Your trial has expired',
    subtitle: 'You can try again in 24 hours',
    nextTrial: 'Next trial available in',
    buyAccess: 'Buy access',
    returnInvestigations: 'Back to investigations',
  },
};

export default function TrialExpiredModal({
  isOpen,
  investigationId,
  investigationTitle,
  pricing,
  lang = 'fr',
  onClose,
}: TrialExpiredModalProps) {
  const t = translations[lang];
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!isOpen || !pricing) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="max-w-md w-full bg-gradient-to-br from-red-900/30 to-[#0f0f0f] border border-red-500/30 rounded-2xl p-8 text-center space-y-6 relative"
        >
          <button
            onClick={() => {
              onClose();
              router.push('/investigations');
            }}
            className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 transition-colors"
          >
            <X size={20} />
          </button>

          <Clock size={48} className="mx-auto text-red-500" />

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t.expired}
            </h2>
            <p className="text-gray-400 text-sm">
              {t.subtitle}
            </p>
          </div>

          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
            <p className="text-red-400 text-xs uppercase tracking-widest">
              {t.nextTrial}
            </p>
            <p className="text-xl font-bold text-red-400 mt-1">24h</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors"
            >
              💳 {t.buyAccess} ({pricing.price_eur.toFixed(2)} EUR)
            </button>

            <button
              onClick={() => {
                onClose();
                router.push('/investigations');
              }}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
            >
              {t.returnInvestigations}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* ✅ PaywallModal TOUJOURS rendu (pas de condition) */}
      <PaywallModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        productType="investigation"
        productId={investigationId}
        productTitle={investigationTitle}
        pricing={pricing}
        lang={lang}
      />
    </>
  );
}