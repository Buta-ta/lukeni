"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';

interface SubscribeButtonProps {
  categoryId: string;
  label?: string;
  className?: string;
}

export default function SubscribeButton({
  categoryId,
  label,
  className = '',
}: SubscribeButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);

  // ── Vérifie l'abonnement via user_id (table user_subscriptions) ─────────
  const checkSub = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .maybeSingle(); // ← maybeSingle : pas d'erreur si 0 résultat

    if (error) {
      console.error('SubscribeButton checkSub error:', error);
      return;
    }

    if (data) {
      setIsSubscribed(true);
      setSubId(data.id);
    } else {
      setIsSubscribed(false);
      setSubId(null);
    }
  }, [categoryId]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await checkSub(session.user.id);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkSub(session.user.id);
        } else {
          setIsSubscribed(false);
          setSubId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [categoryId, checkSub]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      window.location.href = '/auth';
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed && subId) {
        // ── Désabonnement par ID (plus sûr) ──────────────────────────────
        const { error } = await supabase
          .from('user_subscriptions')
          .delete()
          .eq('id', subId);

        if (error) throw error;
        setIsSubscribed(false);
        setSubId(null);

      } else {
        // ── Abonnement ────────────────────────────────────────────────────
        const { data, error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            category_id: categoryId,
          })
          .select('id')
          .single();

        if (error) {
          // Contrainte unique déjà satisfaite → on recheck
          if (error.code === '23505') {
            await checkSub(user.id);
            return;
          }
          throw error;
        }

        if (data) {
          setIsSubscribed(true);
          setSubId(data.id);
        }
      }
    } catch (err) {
      console.error('SubscribeButton toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSubscribed, subId, categoryId, checkSub]);

  return (
    <motion.button
      whileHover={{ scale: user ? 1.05 : 1 }}
      whileTap={{ scale: user ? 0.95 : 1 }}
      onClick={toggle}
      disabled={isLoading}
      title={
        !user
          ? 'Connectez-vous pour suivre'
          : isSubscribed
            ? 'Se désabonner'
            : 'Suivre cette catégorie'
      }
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-xs font-bold transition-all duration-300 ${
        isSubscribed
          ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_12px_rgba(212,175,55,0.2)]'
          : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30 hover:text-white/70'
      } ${!user ? 'opacity-40 cursor-not-allowed' : ''} ${
        isLoading ? 'opacity-60' : ''
      } ${className}`}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Loader2 size={12} className="animate-spin" />
          </motion.span>
        ) : isSubscribed ? (
          <motion.span
            key="subscribed"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <BookmarkCheck size={14} />
          </motion.span>
        ) : (
          <motion.span
            key="unsubscribed"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            <Bookmark size={14} />
          </motion.span>
        )}
      </AnimatePresence>

      <span>
        {label
          ? (isSubscribed ? 'Suivi ✓' : label)
          : (isSubscribed ? 'Abonné' : 'Suivre')}
      </span>
    </motion.button>
  );
}