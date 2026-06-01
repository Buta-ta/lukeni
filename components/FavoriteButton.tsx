"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';

interface FavoriteButtonProps {
  itemType:
    | 'article' | 'event' | 'track' | 'press'
    | 'book' | 'wiki' | 'archive' | 'scholar'
    | 'core' | 'arxiv';
  itemId: string;
  size?: number;
  className?: string;
  onLikeChange?: (newCount: number) => void; // ✅ Callback pour notifier
}

export default function FavoriteButton({
  itemType,
  itemId,
  size = 18,
  className = '',
  onLikeChange, // ✅ Destructurer
}: FavoriteButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // ── Session ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setIsFavorite(false);
          setFavId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Vérification + comptage initial ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const checkFavorite = async () => {
      try {
        // 1️⃣ Récupérer tous les favoris pour cet item
        const { data, error } = await supabase
          .from('user_favorites')
          .select('id, user_id')
          .eq('item_type', itemType)
          .eq('item_id', itemId);

        if (error) throw error;

        const count = data?.length || 0;

        // ✅ Notifier le parent du compteur initial
        onLikeChange?.(count);

        // 2️⃣ Vérifier si l'utilisateur actuel a liké
        if (data) {
          const userFav = data.find(fav => fav.user_id === user.id);
          if (userFav) {
            setIsFavorite(true);
            setFavId(userFav.id);
          } else {
            setIsFavorite(false);
            setFavId(null);
          }
        }

        setHasError(false);
      } catch (err) {
        console.error('FavoriteButton check error:', err);
        setHasError(true);
      }
    };

    checkFavorite();
  }, [user, itemType, itemId, onLikeChange]); // ✅ Dépendance onLikeChange

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      window.location.href = '/auth';
      return;
    }

    if (isLoading || hasError) return;
    setIsLoading(true);

    try {
      if (isFavorite && favId) {
        // ── Suppression ──────────────────────────────────────────────────
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('id', favId);

        if (error) throw error;

        // ✅ Si c'est un livre : supprimer AUSSI de book_likes
        if (itemType === 'book') {
          await supabase
            .from('book_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', itemId);
        }

        setIsFavorite(false);
        setFavId(null);

        // ✅ Recompter et notifier
        const { data: allFavs } = await supabase
          .from('user_favorites')
          .select('id')
          .eq('item_type', itemType)
          .eq('item_id', itemId);

        const newCount = allFavs?.length || 0;
        onLikeChange?.(newCount);

      } else {
        // ── Insertion ────────────────────────────────────────────────────
        const { data, error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: itemId,
          })
          .select('id')
          .single();

        if (error) {
          // Contrainte unique déjà satisfaite (double-clic)
          if (error.code === '23505') {
            const { data: existing } = await supabase
              .from('user_favorites')
              .select('id')
              .eq('user_id', user.id)
              .eq('item_type', itemType)
              .eq('item_id', itemId)
              .maybeSingle();

            if (existing) {
              setIsFavorite(true);
              setFavId(existing.id);

              // ✅ Livre : insérer dans book_likes
              if (itemType === 'book') {
                await supabase
                  .from('book_likes')
                  .insert({ user_id: user.id, book_id: itemId })
                  .select()
                  .maybeSingle(); // Ignore si déjà existant
              }

              // Recompter
              const { data: allFavs } = await supabase
                .from('user_favorites')
                .select('id')
                .eq('item_type', itemType)
                .eq('item_id', itemId);

              onLikeChange?.(allFavs?.length || 0);
            }
            return;
          }
          throw error;
        }

        if (data) {
          setIsFavorite(true);
          setFavId(data.id);

          // ✅ Livre : insérer dans book_likes
          if (itemType === 'book') {
            await supabase
              .from('book_likes')
              .insert({ user_id: user.id, book_id: itemId })
              .select()
              .maybeSingle();
          }

          // Recompter
          const { data: allFavs } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('item_type', itemType)
            .eq('item_id', itemId);

          onLikeChange?.(allFavs?.length || 0);
        }
      }

      setHasError(false);
    } catch (err) {
      console.error('FavoriteButton toggle error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, hasError, isFavorite, favId, itemType, itemId, onLikeChange]);

  // ── Mode dégradé ──────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <button
        disabled
        className={`p-2 rounded-full bg-black/40 opacity-40 cursor-not-allowed ${className}`}
        title="Favoris temporairement indisponibles"
      >
        <Heart size={size} className="text-gray-600" />
      </button>
    );
  }

  return (
    <motion.button
      onClick={toggleFavorite}
      disabled={isLoading}
      whileHover={{ scale: isLoading ? 1 : 1.1 }}
      whileTap={{ scale: isLoading ? 1 : 0.9 }}
      className={`relative p-2 rounded-full transition-all duration-300 ${
        isFavorite
          ? 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
          : 'bg-black/40 hover:bg-black/60'
      } ${isLoading ? 'opacity-70' : ''} ${className}`}
      title={
        !user
          ? 'Connectez-vous pour ajouter aux favoris'
          : isFavorite
            ? 'Retirer des favoris'
            : 'Ajouter aux favoris'
      }
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="spinner"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Loader2 size={size} className="text-white/50 animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key={isFavorite ? 'filled' : 'empty'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Heart
              size={size}
              className={`transition-colors duration-300 ${
                isFavorite ? 'text-red-500 fill-red-500' : 'text-white/70'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse animation au like */}
      <AnimatePresence>
        {isFavorite && !isLoading && (
          <motion.div
            key="pulse"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-red-500/30 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}