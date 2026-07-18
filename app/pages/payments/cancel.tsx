// pages/payments/cancel.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft } from 'lucide-react';

const translations = {
  fr: {
    cancelled: 'Paiement annulé',
    reason: 'Vous avez annulé votre paiement',
    tryAgain: 'Réessayer le paiement',
    backHome: 'Retour à l\'accueil',
    note: 'Aucune charge n\'a été effectuée',
  },
  en: {
    cancelled: 'Payment cancelled',
    reason: 'You cancelled your payment',
    tryAgain: 'Retry payment',
    backHome: 'Back to home',
    note: 'No charge has been made',
  },
};

export default function PaymentCancel() {
  const router = useRouter();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const t = translations[lang];

  useEffect(() => {
    const storedLang = localStorage.getItem('lukeni_lang');
    if (storedLang) {
      setLang(JSON.parse(storedLang));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#05050A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#111] border border-amber-500/30 rounded-2xl p-8 text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <XCircle size={64} className="mx-auto text-amber-500" />
        </motion.div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.cancelled}</h1>
          <p className="text-gray-400">{t.reason}</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-amber-400 text-sm">{t.note}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.back()}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft size={16} />
            {t.tryAgain}
          </button>
          <button
            onClick={() => router.push('/investigations')}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors"
          >
            {t.backHome}
          </button>
        </div>
      </motion.div>
    </div>
  );
}