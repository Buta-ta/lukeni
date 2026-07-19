// components/InvestigationPaywall.tsx

"use client";

import React, { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';
import { useTrialSession } from '@/lib/hooks/useTrialSession';
import { supabase } from '@/lib/supabase';

interface InvestigationPaywallProps {
  investigationId: string;
  investigationTitle: string;
  lang: 'fr' | 'en';
  onAccessGranted: () => void;
}

const translations = {
  fr: {
    premium: 'Cette enquête est exclusive',
    locked: 'Verrouillée',
    tryFree: 'Essayer gratuitement',
    buyNow: 'Acheter maintenant',
    trialExpired: 'Votre essai a expiré',
    retryIn: 'Réessayer dans',
    minutes: 'minutes',
  },
  en: {
    premium: 'This investigation is exclusive',
    locked: 'Locked',
    tryFree: 'Try for free',
    buyNow: 'Buy now',
    trialExpired: 'Your trial has expired',
    retryIn: 'Retry in',
    minutes: 'minutes',
  },
};

export default function InvestigationPaywall({
  investigationId,
  investigationTitle,
  lang = 'fr',
  onAccessGranted,
}: InvestigationPaywallProps) {
  const t = translations[lang];
  const [showPaywall, setShowPaywall] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const {
    trial,
    timeRemaining,
    startTrial,
    canRetry,
    timeBeforeRetry,
  } = useTrialSession(userId, investigationId, 'investigation');

  // 1. Récupération robuste de l'utilisateur avec onAuthStateChange
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // 2. Vérification des accès payant (completed) ou admin grant
  useEffect(() => {
    if (!userId) return;

    const checkAccess = async () => {
      // Vérifier si accès payant validé
      const { data: access } = await supabase
        .from('user_access')
        .select('*')
        .eq('user_id', userId)
        .eq('target_id', investigationId)
        .eq('access_type', 'investigation')
        .eq('status', 'completed')
        .maybeSingle();

      if (access) {
        setHasAccess(true);
        setShowPaywall(false);
        onAccessGranted();
        return;
      }

      // Vérifier si admin grant
      const { data: grant } = await supabase
        .from('admin_user_access_grants')
        .select('id')
        .eq('user_id', userId)
        .eq('access_type', 'investigation')
        .or(`access_scope.eq.all,target_ids.cs.{${investigationId}}`)
        .maybeSingle();

      if (grant) {
        setHasAccess(true);
        setShowPaywall(false);
        onAccessGranted();
        return;
      }
    };

    checkAccess();
  }, [userId, investigationId, onAccessGranted]);

  // 3. Observer le state du trial pour fermer le paywall dès qu'il devient actif
  useEffect(() => {
    if (trial && trial.status === 'active') {
      console.log('✅ Trial actif détecté, fermeture immédiate du paywall.');
      setHasAccess(true);
      setShowPaywall(false);
      onAccessGranted();
    }
  }, [trial, onAccessGranted]);

  // 4. Charger le prix du produit
  useEffect(() => {
    const fetchPricing = async () => {
      const { data } = await supabase
        .from('product_pricing')
        .select('*')
        .eq('product_type', 'investigation')
        .eq('product_id', investigationId)
        .maybeSingle();

      setPricing(data);
    };

    fetchPricing();
  }, [investigationId]);

  if (hasAccess || !showPaywall || (trial && trial.status === 'active')) {
    return null;
  }

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    const success = await startTrial(30);
    setIsStartingTrial(false);
    
    if (success) {
      setHasAccess(true);
      setShowPaywall(false);
      onAccessGranted();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-[#1a1a2e] to-[#0f0f0f] border border-amber-500/30 rounded-2xl p-8 text-center space-y-6">
          <Lock size={48} className="mx-auto text-amber-500" />

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t.premium}
            </h2>
            <p className="text-gray-400 text-sm">
              "{investigationTitle}"
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
                onClick={handleStartTrial}
                disabled={isStartingTrial}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isStartingTrial ? (
                  <><Loader2 size={16} className="animate-spin" /> Chargement...</>
                ) : (
                  `⏱️ ${t.tryFree}`
                )}
              </button>
            )}

            {pricing && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
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
          productType="investigation"
          productId={investigationId}
          productTitle={investigationTitle}
          pricing={pricing}
          lang={lang}
        />
      )}
    </>
  );
}