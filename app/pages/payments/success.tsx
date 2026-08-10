// pages/payments/success.tsx

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const translations = {
  fr: {
    success: 'Paiement réussi !',
    loading: 'Vérification du paiement...',
    redirecting: 'Redirection en cours...',
    thankYou: 'Merci pour votre achat !',
    accessGranted: 'Votre accès a été activé',
    backToGame: 'Retourner au jeu',
    backToLibrary: 'Retourner à la bibliothèque',
    error: 'Erreur lors de la vérification',
    tryAgain: 'Réessayer',
  },
  en: {
    success: 'Payment successful!',
    loading: 'Verifying payment...',
    redirecting: 'Redirecting...',
    thankYou: 'Thank you for your purchase!',
    accessGranted: 'Your access has been activated',
    backToGame: 'Back to game',
    backToLibrary: 'Back to library',
    error: 'Error verifying payment',
    tryAgain: 'Try again',
  },
};

export default function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);

  const t = translations[lang];

  useEffect(() => {
    // Détecter la langue
    const storedLang = localStorage.getItem('lukeni_lang');
    if (storedLang) {
      setLang(JSON.parse(storedLang));
    }
  }, []);

  useEffect(() => {
    if (status !== 'loading') return;

    const verifyPayment = async () => {
      try {
        const transactionId = searchParams.get('transaction_id');

        if (!transactionId) {
          setStatus('error');
          return;
        }

        // Vérifier le statut du paiement
        const response = await fetch(`/api/payments/check-status?transactionId=${transactionId}`);
        const data = await response.json();

        if (data.success && data.status === 'completed') {
          // 🔒 La route ne renvoie plus l'objet transaction complet
          // (éviter toute fuite), mais les champs utiles pour la redirection.
          setPaymentData({
            product_type: data.product_type,
            product_id: data.product_id,
          });
          setStatus('success');

          // Redirection automatique après 5 secondes
          const timer = setTimeout(() => {
            if (data.product_type === 'investigation') {
              router.push(`/investigations/${data.product_id}`);
            } else if (data.product_type === 'book') {
              router.push(`/bibliotheque/${data.product_id}`);
            }
          }, 5000);

          return () => clearTimeout(timer);
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [status, searchParams, router]);

  return (
    <div className="min-h-screen bg-[#05050A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        {status === 'loading' && (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center space-y-6">
            <Loader2 size={48} className="mx-auto text-[#D4AF37] animate-spin" />
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{t.loading}</h1>
              <p className="text-gray-400 text-sm">{t.redirecting}</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-[#111] border border-green-500/30 rounded-2xl p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle size={64} className="mx-auto text-green-400" />
            </motion.div>

            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t.success}</h1>
              <p className="text-gray-400">{t.thankYou}</p>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-400 text-sm font-bold">{t.accessGranted}</p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-gray-500">
                {lang === 'fr'
                  ? 'Redirection en cours dans 5 secondes...'
                  : 'Redirecting in 5 seconds...'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (paymentData?.product_type === 'investigation') {
                    router.push(`/investigations/${paymentData.product_id}`);
                  } else if (paymentData?.product_type === 'book') {
                    router.push(`/bibliotheque/${paymentData.product_id}`);
                  }
                }}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRight size={16} />
                {paymentData?.product_type === 'investigation'
                  ? t.backToGame
                  : t.backToLibrary}
              </button>
              <button
                onClick={() => router.push('/investigations')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors"
              >
                {lang === 'fr' ? 'Accueil' : 'Home'}
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-[#111] border border-red-500/30 rounded-2xl p-8 text-center space-y-6">
            <div className="text-6xl">❌</div>

            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{t.error}</h1>
              <p className="text-gray-400 text-sm">
                {lang === 'fr'
                  ? 'Veuillez vérifier votre transaction ou contacter le support.'
                  : 'Please check your transaction or contact support.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
              >
                {t.tryAgain}
              </button>
              <button
                onClick={() => router.push('/investigations')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors"
              >
                {lang === 'fr' ? 'Accueil' : 'Home'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}