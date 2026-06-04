"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PushSubscribeButton({ 
  isOrganic, 
  lang = 'fr' 
}: { 
  isOrganic: boolean;
  lang?: 'fr' | 'en';
}) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Vérifier au chargement si l'utilisateur est déjà abonné
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribeUser = async () => {
    setIsLoading(true);
    try {
      // 1. Enregistrer le Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 2. Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert(
          lang === 'fr'
            ? 'Vous avez bloqué les notifications. Veuillez les autoriser dans les paramètres de votre navigateur.'
            : 'You have blocked notifications. Please allow them in your browser settings.'
        );
        setIsLoading(false);
        return;
      }

      // 3. S'abonner avec la clé publique
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Sauvegarder dans Supabase
      const { error } = await supabase.from('push_subscriptions').insert({
        endpoint: subscription.endpoint,
        p256dh: subscription.toJSON().keys!.p256dh,
        auth_key: subscription.toJSON().keys!.auth,
      });

      if (!error) {
        setIsSubscribed(true);
      } else if (error.code === '23505') {
        // Erreur de doublon (déjà abonné)
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error(lang === 'fr' ? 'Erreur abonnement push:' : 'Push subscription error:', error);
    }
    setIsLoading(false);
  };

  const unsubscribeUser = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        // Supprimer de Supabase
        await supabase.from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error(lang === 'fr' ? 'Erreur désabonnement:' : 'Unsubscribe error:', error);
    }
    setIsLoading(false);
  };

  // Fonction utilitaire pour convertir la clé
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={isSubscribed ? unsubscribeUser : subscribeUser}
      disabled={isLoading}
      className={`p-2 sm:px-3 sm:py-2.5 rounded-full flex items-center gap-2 transition-colors ${
        isSubscribed
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : isOrganic
            ? 'bg-[#D4AF37] text-black border border-[#D4AF37]'
            : 'bg-[#D4AF37] text-black border border-[#D4AF37]'
      } ${isLoading ? 'opacity-50' : 'hover:shadow-lg'}`}
      aria-label={
        isSubscribed
          ? (lang === 'fr' ? 'Désactiver les rappels' : 'Disable reminders')
          : (lang === 'fr' ? 'Activer les rappels' : 'Enable reminders')
      }
    >
      {isSubscribed ? <BellOff size={16} /> : <Bell size={16} />}
      <span className="hidden sm:inline text-xs font-bold whitespace-nowrap">
        {isSubscribed
          ? (isLoading
            ? (lang === 'fr' ? 'Désabonnement...' : 'Unsubscribing...')
            : (lang === 'fr' ? 'Activé' : 'Enabled'))
          : (isLoading
            ? (lang === 'fr' ? 'Abonnement...' : 'Subscribing...')
            : (lang === 'fr' ? 'Rappels' : 'Reminders'))}
      </span>
    </motion.button>
  );
}