"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // <-- CORRECTION : Ajout de l'import manquant
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PushSubscribeButton({ isOrganic }: { isOrganic: boolean }) {
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
        alert('Vous avez bloqué les notifications. Veuillez les autoriser dans les paramètres de votre navigateur.');
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
      console.error('Erreur abonnement push:', error);
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
      console.error('Erreur désabonnement:', error);
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
      className={`p-2 rounded-full flex items-center gap-1 transition-colors ${
        isSubscribed 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-[#D4AF37] text-black'
      } ${isLoading ? 'opacity-50' : ''}`}
      aria-label={isSubscribed ? 'Désactiver les rappels' : 'Activer les rappels'}
    >
      {isSubscribed ? <BellOff size={16} /> : <Bell size={16} />}
      <span className="hidden sm:inline text-xs font-bold">
        {isSubscribed 
          ? (isLoading ? '...' : 'Activé') 
          : (isLoading ? '...' : 'Rappels')
        }
      </span>
    </motion.button>
  );
}