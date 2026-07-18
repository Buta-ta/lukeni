// components/BookPaywall.tsx

import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';
import { useTrialSession } from '@/lib/hooks/useTrialSession';
import { supabase } from '@/lib/supabase';

interface BookPaywallProps {
  bookId: string;
  bookTitle: string;
  lang: 'fr' | 'en';
  onAccessGranted: () => void;
}

const translations = {
  fr: {
    premium: 'Ce livre est réservé aux abonnés',
    locked: 'Verrouillé',
    tryFree: 'Essayer gratuitement',
    buyNow: 'Acheter maintenant',
    trialExpired: 'Votre essai a expiré',
    retryIn: 'Réessayer dans',
    minutes: 'minutes',
  },
  en: {
    premium: 'This book is for premium members',
    locked: 'Locked',
    tryFree: 'Try for free',
    buyNow: 'Buy now',
    trialExpired: 'Your trial has expired',
    retryIn: 'Retry in',
    minutes: 'minutes',
  },
};

export default function BookPaywall({
  bookId,
  bookTitle,
  lang = 'fr',
  onAccessGranted,
}: BookPaywallProps) {
  const t = translations[lang];
  const [showPaywall, setShowPaywall] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const {
    trial,
    timeRemaining,
    startTrial,
    canRetry,
    timeBeforeRetry,
  } = useTrialSession(userId, bookId, 'book');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const checkAccess = async () => {
      const { data: access } = await supabase
        .from('user_access')
        .select('*')
        .eq('user_id', userId)
        .eq('target_id', bookId)
        .eq('access_type', 'book')
        .maybeSingle();

      if (access) {
        setHasAccess(true);
        setShowPaywall(false);
        onAccessGranted();
        return;
      }

      const { data: grant } = await supabase
        .from('admin_user_access_grants')
        .select('*')
        .eq('user_id', userId)
        .eq('target_id', bookId)
        .maybeSingle();

      if (grant) {
        setHasAccess(true);
        setShowPaywall(false);
        onAccessGranted();
        return;
      }
    };

    checkAccess();
  }, [userId, bookId, onAccessGranted]);

  useEffect(() => {
    const fetchPricing = async () => {
      const { data } = await supabase
        .from('product_pricing')
        .select('*')
        .eq('product_type', 'book')
        .eq('product_id', bookId)
        .maybeSingle();

      setPricing(data);
    };

    fetchPricing();
  }, [bookId]);

  if (hasAccess || !showPaywall) {
    return null;
  }

  if (trial && trial.status === 'active' && timeRemaining !== null) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-[#1a1a2e] to-[#0f0f0f] border border-blue-500/30 rounded-2xl p-8 text-center space-y-6">
          <Lock size={48} className="mx-auto text-blue-500" />

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t.premium}
            </h2>
            <p className="text-gray-400 text-sm">
              "{bookTitle}"
            </p>
          </div>

          {trial && trial.status === 'expired' && !canRetry && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm font-bold mb-2">
                {t.trialExpired}
              </p>
              <p className="text-red-400 text-xs">
                {t.retryIn} {timeBeforeRetry} {t.minutes}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(!trial || canRetry) && (
              <button
                onClick={() => startTrial(30)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
              >
                ⏱️ {t.tryFree}
              </button>
            )}

            {pricing && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                💳 {t.buyNow} ({pricing.price_eur.toFixed(2)} EUR)
              </button>
            )}
          </div>
        </div>
      </div>

      {pricing && (
        <PaywallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          productType="book"
          productId={bookId}
          productTitle={bookTitle}
          pricing={pricing}
          lang={lang}
        />
      )}
    </>
  );
}