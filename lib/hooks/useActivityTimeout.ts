// /lib/hooks/useActivityTimeout.ts
"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes en ms
const WARNING_BEFORE = 2 * 60 * 1000;      // Avertir 2 min avant

export function useActivityTimeout(onTimeout?: () => void) {
  const supabase = createClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    // Nettoyer les anciens timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    lastActivityRef.current = Date.now();

    // Sauvegarder l'activité dans localStorage
    localStorage.setItem('last_activity', String(Date.now()));

    // Timer d'avertissement (optionnel)
    warningRef.current = setTimeout(() => {
      const shouldWarn = confirm(
        '⏱️ Votre session expire dans 2 minutes.\nCliquez OK pour rester connecté.'
      );
      if (shouldWarn) {
        resetTimer(); // Prolonger si l'utilisateur répond
      }
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    // Timer de déconnexion
    timeoutRef.current = setTimeout(async () => {
      console.log('⏱️ Session expirée par inactivité');
      await supabase.auth.signOut();
      localStorage.removeItem('last_activity');
      
      if (onTimeout) {
        onTimeout();
      } else {
        window.location.href = '/auth?reason=timeout';
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // Vérifier l'activité précédente au chargement
    const lastActivity = localStorage.getItem('last_activity');
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        // Session expirée avant même de charger
        supabase.auth.signOut();
        localStorage.removeItem('last_activity');
        window.location.href = '/auth?reason=timeout';
        return;
      }
    }

    // Démarrer le timer
    resetTimer();

    // Événements d'activité
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, []);

  return { resetTimer };
}