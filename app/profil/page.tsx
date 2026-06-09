'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Save, LogOut, Camera, Heart,
  User as UserIcon, Mail, AtSign, X,
  BookOpen, Newspaper, Library, Globe, ExternalLink,
  Bell, BellOff, Star, Calendar, FileText,
  Edit3, ChevronRight, TrendingUp, Clock,
  CheckCircle, Search,
  Trash2, ShieldAlert, TriangleAlert,Users,AlertCircle
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

// ============================================================================
// CAURIS ICON
// ============================================================================

const CaurisIcon = memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
));
CaurisIcon.displayName = 'CaurisIcon';

// ============================================================================
// HELPERS
// ============================================================================

function cleanTitle(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\{#+[0-9A-Fa-f]*\}/gi, '').replace(/\{\/#?\}/g, '').trim();
}

function prettifyItemId(raw: string): string {
  if (!raw) return '';
  const withoutUuid = raw.replace(/^[0-9a-f]{6,8}-/i, '');
  return withoutUuid.split('-').map((w: string) =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

// ── FIX 2 : détecter si un item_id est un livre Open Library ──
function isOpenLibraryId(itemId: string): boolean {
  return itemId.startsWith('ol_') || itemId.startsWith('ol__');
}

// ── FIX 2 : extraire la clé OL depuis l'item_id stocké ──
// ex: "ol__works_OL1158921W" → "/works/OL1158921W"
function olItemIdToKey(itemId: string): string {
  return itemId
    .replace(/^ol_/, '')      // retire le préfixe "ol_"
    .replace(/_/g, '/')       // remplace _ par /
    .replace(/^\//, '');      // retire le slash initial
  // => "works/OL1158921W"
}

// ============================================================================
// TYPES
// ============================================================================

interface FavoriteItem {
  id: string;
  fav_id: string;
  title_fr: string;
  title_en: string;
  image: string | null;
  type: 'article' | 'press' | 'book' | 'event' | 'wiki';
  slug?: string;
  /** true si c'est un livre Open Library (pas dans library_books) */
  isOLBook?: boolean;
}

// ============================================================================
// TYPE CONFIG
// ============================================================================

const TYPE_CONFIG = {
  article: {
    icon: BookOpen, label_fr: 'Article', label_en: 'Article',
    color: '#D4AF37', basePath: '/encyclopedie',
  },
  press: {
    icon: Newspaper, label_fr: 'Presse', label_en: 'Press',
    color: '#60A5FA', basePath: '/presse',
  },
  book: {
    icon: Library, label_fr: 'Livre', label_en: 'Book',
    color: '#4ADE80', basePath: '/bibliotheque',
  },
  event: {
    icon: Calendar, label_fr: 'Événement', label_en: 'Event',
    color: '#EC4899', basePath: '/encyclopedie',
  },
  wiki: {
    icon: Globe, label_fr: 'Wikipedia', label_en: 'Wikipedia',
    color: '#FACC15', basePath: '/encyclopedie/wiki',
  },
};

// ============================================================================
// STARS
// ============================================================================

const STARS = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: ((i * 37 + 13) % 100),
  top: ((i * 53 + 7) % 100),
  size: (i % 3) + 1,
  opacity: 0.1 + (i % 5) * 0.04,
}));

const StarBackground = memo(() => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.04]"
      style={{ background: 'radial-gradient(ellipse, #D4AF37 0%, transparent 70%)', filter: 'blur(80px)' }} />
    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.03]"
      style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', filter: 'blur(100px)' }} />
    {STARS.map(star => (
      <div key={star.id} className="absolute rounded-full bg-white"
        style={{
          left: `${star.left}%`, top: `${star.top}%`,
          width: star.size, height: star.size, opacity: star.opacity,
        }} />
    ))}
  </div>
));
StarBackground.displayName = 'StarBackground';

// ============================================================================
// FAVORITE CARD
// ============================================================================

const FavoriteCard = memo(({ item, lang, onRemove }: {
  item: FavoriteItem; lang: 'fr' | 'en'; onRemove: (favId: string) => void;
}) => {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;
  const title = lang === 'fr' ? item.title_fr : item.title_en;

  const href = (() => {
    // Tous les livres (Lukeni + OL) → page bibliothèque
    if (item.type === 'book') return `/bibliotheque`;
    if (item.type === 'wiki') return `/encyclopedie/wiki/${item.id}?lang=${lang}`;
    // Presse : pas de route par ID, on renvoie juste vers /presse
    if (item.type === 'press') return `/presse`;
    if (item.slug) return `${config.basePath}/${item.slug}`;
    return undefined;
  })();

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }} transition={{ duration: 0.2 }}
      className="group relative flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-white/12 hover:bg-white/[0.04] transition-all duration-300"
      style={{ borderLeft: `2px solid ${config.color}40` }}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-white/5">
        {item.image
          ? <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Icon size={18} style={{ color: config.color }} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wider"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}>
            {lang === 'fr' ? config.label_fr : config.label_en}
          </span>
          {/* Badge OL pour les livres Open Library */}
          {item.isOLBook && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">
              Open Library
            </span>
          )}
        </div>
        <p className="text-white text-sm font-medium line-clamp-1 leading-tight">{title}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {href && (
          <Link href={href}
            className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all">
            <ExternalLink size={12} />
          </Link>
        )}
        <button onClick={() => onRemove(item.fav_id)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
});
FavoriteCard.displayName = 'FavoriteCard';


// ============================================================================
// USER CIRCLES — Gestion des cercles de lecture
// ============================================================================

function UserCircles({ lang, userId }: { lang: 'fr' | 'en'; userId?: string }) {

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<any>(null);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);

  const [myCircles, setMyCircles] = useState<any[]>([]);
  const [joinedCircles, setJoinedCircles] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    const fetchCirclesData = async () => {
      try {
        // Cercles créés par moi
        const { data: created } = await supabase
          .from('reading_circles')
          .select('*, library_books(title_fr, title_en, cover_url)')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false });

        // Cercles rejoints
        const { data: joined } = await supabase
          .from('circle_members')
          .select('*, reading_circles(*, library_books(title_fr, title_en, cover_url))')
          .eq('user_id', userId)
          .neq('role', 'creator')
          .order('joined_at', { ascending: false });

        // Mes demandes en attente
        const { data: pending } = await supabase
          .from('circle_join_requests')
          .select('*, reading_circles(name, library_books(title_fr, title_en))')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        // Demandes entrantes (pour mes cercles)
        const { data: incoming } = await supabase
          .from('circle_join_requests')
          .select(`
            *,
            reading_circles!inner(id, name, creator_id),
            profiles(full_name, username, avatar_url)
          `)
          .eq('reading_circles.creator_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        setMyCircles(created || []);
        setJoinedCircles(joined?.map(j => j.reading_circles) || []);
        setPendingRequests(pending || []);
        setIncomingRequests(incoming || []);
      } catch (err) {
        console.error('Fetch circles error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCirclesData();
  }, [userId]);

  const handleApprove = useCallback(async (requestId: string, circleId: string, requestUserId: string) => {
    try {
      // 1. Ajouter le membre
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: requestUserId,
          role: 'member',
          current_page: 1,
        });

      if (memberError) throw memberError;

      // 2. Marquer la demande comme approuvée
      const { error: updateError } = await supabase
        .from('circle_join_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Retirer de la liste
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Approve error:', err);
      alert(lang === 'fr' ? "Erreur lors de l'approbation" : 'Approval error');
    }
  }, [lang]);

  const handleReject = useCallback(async (requestId: string, comment?: string) => {
    try {
      const { error } = await supabase
        .from('circle_join_requests')
        .update({
          status: 'rejected',
          admin_comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Reject error:', err);
      alert(lang === 'fr' ? "Erreur lors du refus" : 'Rejection error');
    }
  }, [lang]);


   // ── Supprimer un cercle ──
  const handleDeleteCircle = useCallback(async () => {
    if (!circleToDelete) return;

    setIsDeletingCircle(true);
    try {
      // 1. Supprimer tous les membres du cercle
      const { error: membersError } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleToDelete.id);

      if (membersError) throw membersError;

      // 2. Supprimer toutes les demandes d'adhésion
      const { error: requestsError } = await supabase
        .from('circle_join_requests')
        .delete()
        .eq('circle_id', circleToDelete.id);

      if (requestsError) throw requestsError;

      // 3. Supprimer le cercle lui-même
      const { error: circleError } = await supabase
        .from('reading_circles')
        .delete()
        .eq('id', circleToDelete.id);

      if (circleError) throw circleError;

      // Retirer de la liste locale
      setMyCircles(prev => prev.filter(c => c.id !== circleToDelete.id));
      setShowDeleteModal(false);
      setCircleToDelete(null);
    } catch (err) {
      console.error('Delete circle error:', err);
      alert(lang === 'fr' ? "Erreur lors de la suppression du cercle" : 'Circle deletion error');
    } finally {
      setIsDeletingCircle(false);
    }
  }, [circleToDelete, lang]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-purple-400" />
      </div>
    );
  }

  const totalCircles = myCircles.length + joinedCircles.length;

  if (totalCircles === 0 && pendingRequests.length === 0 && incomingRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Users size={24} className="text-purple-400/60" />
        </div>
        <div>
          <p className="text-white font-medium mb-1">
            {lang === 'fr' ? 'Aucun cercle' : 'No circles'}
          </p>
          <p className="text-gray-500 text-sm">
            {lang === 'fr' ? 'Créez ou rejoignez un cercle de lecture' : 'Create or join a reading circle'}
          </p>
        </div>
        <Link href="/bibliotheque" className="flex items-center gap-2 text-xs text-purple-400 font-bold hover:underline">
          <Users size={11} /> {lang === 'fr' ? 'Explorer' : 'Explore'} <ChevronRight size={11} />
        </Link>
      </div>
    );
  }

   return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          MODAL DE SUPPRESSION
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDeleteModal && circleToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => !isDeletingCircle && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-red-500/20 rounded-3xl w-full max-w-md overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-400 to-red-600" />

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-serif text-xl font-bold">
                    {lang === 'fr' ? 'Supprimer le cercle ?' : 'Delete circle?'}
                  </h2>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeletingCircle}
                    className="p-1.5 text-gray-600 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Circle info */}
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-300 text-xs font-bold mb-1">
                    {lang === 'fr' ? 'Cercle à supprimer' : 'Circle to delete'}
                  </p>
                  <p className="text-white text-sm font-bold">{circleToDelete.name}</p>
                  {circleToDelete.library_books && (
                    <p className="text-gray-400 text-xs mt-1">
                      📖 {lang === 'fr' ? circleToDelete.library_books.title_fr : circleToDelete.library_books.title_en}
                    </p>
                  )}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-xs">
                    {lang === 'fr'
                      ? "Cette action supprimera définitivement le cercle, tous ses membres et toutes les demandes en attente."
                      : 'This will permanently delete the circle, all its members, and all pending requests.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeletingCircle}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <motion.button
                    whileHover={!isDeletingCircle ? { scale: 1.02 } : {}}
                    whileTap={!isDeletingCircle ? { scale: 0.98 } : {}}
                    onClick={handleDeleteCircle}
                    disabled={isDeletingCircle}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeletingCircle ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {lang === 'fr' ? 'Suppression...' : 'Deleting...'}
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        {lang === 'fr' ? 'Supprimer' : 'Delete'}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
      ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        {/* Demandes entrantes (créateur) */}
        {incomingRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Bell size={12} />
              {lang === 'fr' ? 'Demandes reçues' : 'Incoming requests'} ({incomingRequests.length})
            </h3>
            {incomingRequests.map(req => (
              <div key={req.id}
                className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500/20 flex-shrink-0">
                    {req.profiles?.avatar_url ? (
                      <img src={req.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon size={18} className="text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">
                      {req.profiles?.full_name || req.profiles?.username || 'Utilisateur'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {lang === 'fr' ? 'Veut rejoindre' : 'Wants to join'} <span className="text-purple-400">{req.reading_circles?.name}</span>
                    </p>
                    {req.message && (
                      <p className="text-gray-400 text-xs mt-2 italic">« {req.message} »</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id, req.circle_id, req.user_id)}
                    className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition-colors flex items-center justify-center gap-1">
                    <CheckCircle size={12} />
                    {lang === 'fr' ? 'Accepter' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-1">
                    <X size={12} />
                    {lang === 'fr' ? 'Refuser' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mes demandes en attente */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Clock size={12} />
              {lang === 'fr' ? 'Demandes en attente' : 'Pending requests'} ({pendingRequests.length})
            </h3>
            {pendingRequests.map(req => (
              <div key={req.id}
                className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{req.reading_circles?.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {lang === 'fr' ? 'En attente de réponse...' : 'Waiting for response...'}
                  </p>
                </div>
                <Loader2 size={14} className="animate-spin text-amber-400" />
              </div>
            ))}
          </div>
        )}

        {/* Mes cercles */}
        {myCircles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Star size={12} />
              {lang === 'fr' ? 'Mes cercles' : 'My circles'} ({myCircles.length})
            </h3>
            {myCircles.map(circle => (
              <div key={circle.id}
                className="group flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-emerald-500/30 transition-all">
                <Link href={`/bibliotheque/circles/${circle.id}`}
                  className="flex-1 flex items-center gap-3 min-w-0">
                  {circle.library_books?.cover_url && (
                    <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={circle.library_books.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold group-hover:text-emerald-400 transition-colors">{circle.name}</p>
                    {circle.library_books && (
                      <p className="text-gray-500 text-xs truncate">
                        📖 {lang === 'fr' ? circle.library_books.title_fr : circle.library_books.title_en}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-700 group-hover:text-emerald-400" />
                </Link>
                
                {/* ✅ Bouton supprimer */}
                <button
                  onClick={() => {
                    setCircleToDelete(circle);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title={lang === 'fr' ? 'Supprimer ce cercle' : 'Delete this circle'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cercles rejoints */}
        {joinedCircles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Users size={12} />
              {lang === 'fr' ? 'Cercles rejoints' : 'Joined circles'} ({joinedCircles.length})
            </h3>
            {joinedCircles.map(circle => (
              <Link key={circle.id} href={`/bibliotheque/circles/${circle.id}`}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-blue-500/30 transition-all group">
                {circle.library_books?.cover_url && (
                  <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={circle.library_books.cover_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold group-hover:text-blue-400 transition-colors">{circle.name}</p>
                  {circle.library_books && (
                    <p className="text-gray-500 text-xs truncate">
                      📖 {lang === 'fr' ? circle.library_books.title_fr : circle.library_books.title_en}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-gray-700 group-hover:text-blue-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// USER FAVORITES
// FIX 1 : dédupliquer par item_id + item_type pour éviter les doublons
//         (book_likes + user_favorites peuvent créer des entrées en double)
// FIX 2 : gérer les livres Open Library (item_id commence par "ol_")
// ============================================================================

function UserFavorites({ lang }: { lang: 'fr' | 'en' }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<any>(null);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);
  const [filter, setFilter] = useState<'all' | 'article' | 'press' | 'book' | 'event' | 'wiki'>('all');

  useEffect(() => {
    const fetchFavorites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsLoading(false); return; }

      const { data: favsData, error: favsError } = await supabase
        .from('user_favorites')
        .select('id, item_id, item_type, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (favsError || !favsData?.length) { setIsLoading(false); return; }

      // ── FIX 1 : Dédupliquer par (item_id + item_type) ──────────────────
      // book_likes + user_favorites peuvent créer 2 entrées pour le même livre
      const seen = new Set<string>();
      const dedupedFavs = (favsData as any[]).filter(fav => {
        const key = `${fav.item_type}::${fav.item_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // ────────────────────────────────────────────────────────────────────

      const TABLE_CONFIG: Record<string, {
        table: string; fields: string; hasSlug: boolean; imageField: string;
      }> = {
        article: { table: 'articles', fields: 'id, title_fr, title_en, image_url, slug', hasSlug: true, imageField: 'image_url' },
        press: { table: 'press_articles', fields: 'id, title_fr, title_en, cover_url', hasSlug: false, imageField: 'cover_url' },
        book: { table: 'library_books', fields: 'id, title_fr, title_en, cover_url', hasSlug: false, imageField: 'cover_url' },
        event: { table: 'events', fields: 'id, title_fr, title_en, image_url, slug', hasSlug: true, imageField: 'image_url' },
        wiki: { table: 'articles', fields: 'id, title_fr, title_en, image_url, slug', hasSlug: true, imageField: 'image_url' },
      };

      const items: FavoriteItem[] = [];
      const wikiIds: string[] = [];

      for (const fav of dedupedFavs) {
        const itemType = fav.item_type as string;

        // ── Cas Wikipedia ──
        if (itemType === 'wiki') {
          wikiIds.push(fav.item_id);
          items.push({
            id: fav.item_id, fav_id: fav.id,
            title_fr: 'Article Wikipedia', title_en: 'Wikipedia Article',
            image: null, type: 'wiki',
          });
          continue;
        }

        // ── FIX 2 : Cas livre Open Library (item_id préfixé "ol_") ──────
        if (itemType === 'book' && isOpenLibraryId(fav.item_id)) {
          // Récupérer le titre depuis l'API Open Library
          let olTitle = fav.item_id; // fallback
          let olCover: string | null = null;

          try {
            // Convertit "ol__works_OL1158921W" → "/works/OL1158921W"
            const olKey = '/' + olItemIdToKey(fav.item_id);
            const res = await fetch(
              `https://openlibrary.org${olKey}.json`,
              { headers: { 'User-Agent': 'Lukeni/1.0' } }
            );
            if (res.ok) {
              const data = await res.json();
              if (data.title) olTitle = data.title;
              // Couverture depuis covers[]
              if (data.covers?.[0]) {
                olCover = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
              }
            }
          } catch (err) {
            console.warn('OL title fetch error:', err);
          }

          items.push({
            id: fav.item_id, fav_id: fav.id,
            title_fr: olTitle, title_en: olTitle,
            image: olCover,
            type: 'book',
            isOLBook: true,
          });
          continue;
        }
        // ────────────────────────────────────────────────────────────────

        // ── Cas standard (article, press, book UUID, event) ──
        const cfg = TABLE_CONFIG[itemType];
        if (!cfg) { console.warn(`Type non supporté: ${itemType}`); continue; }

        try {
          const { data: d, error: e } = await supabase
            .from(cfg.table)
            .select(cfg.fields)
            .eq('id', fav.item_id)
            .maybeSingle();

          if (e) { console.warn(`[Fav] ${itemType}/${fav.item_id}:`, e.message); continue; }
          if (d) {
            const data = d as any;
            items.push({
              id: data.id, fav_id: fav.id,
              title_fr: cleanTitle(data.title_fr || ''),
              title_en: cleanTitle(data.title_en || ''),
              image: data[cfg.imageField] || null,
              type: itemType as FavoriteItem['type'],
              slug: cfg.hasSlug ? (data.slug || undefined) : undefined,
            });
          }
        } catch (err) {
          console.error(`Error fetching ${itemType}:`, err);
        }
      }

      // ── Enrichir les Wikipedia avec thumbnails ──
      if (wikiIds.length > 0) {
        try {
          const res = await fetch(
            `https://fr.wikipedia.org/w/api.php?` + new URLSearchParams({
              action: 'query', pageids: wikiIds.join('|'),
              prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '100',
              format: 'json', origin: '*',
            }),
            { headers: { 'Api-User-Agent': 'Lukeni/1.0' } }
          );
          if (res.ok) {
            const wData = await res.json();
            const pages = wData.query?.pages || {};
            for (const item of items) {
              if (item.type !== 'wiki') continue;
              const p = pages[item.id];
              if (!p || p.missing !== undefined) continue;
              if (p.title) { item.title_fr = p.title; item.title_en = p.title; }
              if (p.thumbnail?.source) item.image = p.thumbnail.source;
            }
          }
        } catch (err) {
          console.error('Wiki fetch error:', err);
        }
      }

      setFavorites(items);
      setIsLoading(false);
    };

    fetchFavorites();
  }, [lang]);

  const handleRemove = useCallback(async (favId: string) => {
    const { error } = await supabase.from('user_favorites').delete().eq('id', favId);
    if (!error) setFavorites(prev => prev.filter(f => f.fav_id !== favId));
  }, []);

  const counts = {
    all: favorites.length,
    article: favorites.filter(f => f.type === 'article').length,
    press: favorites.filter(f => f.type === 'press').length,
    book: favorites.filter(f => f.type === 'book').length,
    event: favorites.filter(f => f.type === 'event').length,
    wiki: favorites.filter(f => f.type === 'wiki').length,
  };
  const filtered = filter === 'all' ? favorites : favorites.filter(f => f.type === filter);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12 gap-3">
      <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
      <span className="text-gray-500 text-sm">{lang === 'fr' ? 'Chargement...' : 'Loading...'}</span>
    </div>
  );

  if (favorites.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <Heart size={24} className="text-red-400/60" />
      </div>
      <div>
        <p className="text-white font-medium mb-1">{lang === 'fr' ? 'Aucun favori' : 'No favorites yet'}</p>
        <p className="text-gray-500 text-sm">{lang === 'fr' ? 'Likez des articles pour les retrouver ici' : 'Like articles to find them here'}</p>
      </div>
      <Link href="/encyclopedie" className="flex items-center gap-2 text-xs text-[#D4AF37] font-bold hover:underline">
        <Globe size={11} /> {lang === 'fr' ? 'Explorer' : 'Explore'} <ChevronRight size={11} />
      </Link>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'article', 'press', 'book', 'event', 'wiki'] as const).map(type => {
          const count = counts[type];
          if (type !== 'all' && count === 0) return null;
          return (
            <button key={type} onClick={() => setFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${filter === type ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}>
              {type === 'all'
                ? (lang === 'fr' ? 'Tous' : 'All')
                : (lang === 'fr' ? TYPE_CONFIG[type].label_fr : TYPE_CONFIG[type].label_en)}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === type ? 'bg-white/20' : 'bg-white/10'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence>
          {filtered.map(item => (
            <FavoriteCard key={item.fav_id} item={item} lang={lang} onRemove={handleRemove} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-6">
            {lang === 'fr' ? 'Aucun élément dans cette catégorie.' : 'No items in this category.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// USER NOTES
// FIX 2 : gérer les livres Open Library dans les notes (item_id "ol_...")
// FIX 3 : corriger le lien presse (pas de route /presse/:id)
// ============================================================================

function UserNotes({ lang }: { lang: 'fr' | 'en' }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsLoading(false); return; }

      const { data: notesData } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (!notesData?.length) { setIsLoading(false); return; }

      const enrichedNotes = await Promise.all(
        notesData.map(async (note) => {
          let title = prettifyItemId(note.item_id); // Fallback lisible
          let link: string | null = null;

          try {
            switch (note.item_type) {

              case 'article': {
                const { data } = await supabase
                  .from('articles')
                  .select('title_fr, title_en, slug')
                  .eq('slug', note.item_id)
                  .maybeSingle();
                if (data) {
                  title = lang === 'fr' ? cleanTitle(data.title_fr) : cleanTitle(data.title_en);
                  link = `/encyclopedie/${data.slug}`;
                }
                break;
              }

              case 'press': {
                // ── FIX 3 : presse n'a pas de route /presse/:id ──────────
                // On récupère quand même le titre pour l'affichage,
                // mais le lien pointe vers /presse (liste)
                const { data } = await supabase
                  .from('press_articles')
                  .select('title_fr, title_en')
                  .eq('id', note.item_id)
                  .maybeSingle();
                if (data) {
                  title = lang === 'fr' ? cleanTitle(data.title_fr) : cleanTitle(data.title_en);
                }
                // Pas de lien direct — la presse s'ouvre via état React
                link = null;
                break;
              }

              case 'book': {
                // ── FIX 2 : Livre Open Library → API OL ─────────────────
                if (isOpenLibraryId(note.item_id)) {
                  try {
                    const olKey = '/' + olItemIdToKey(note.item_id);
                    const res = await fetch(
                      `https://openlibrary.org${olKey}.json`,
                      { headers: { 'User-Agent': 'Lukeni/1.0' } }
                    );
                    if (res.ok) {
                      const data = await res.json();
                      if (data.title) {
                        // Ajouter l'auteur si disponible
                        let authorName = '';
                        if (data.authors?.[0]?.author?.key) {
                          try {
                            const authorRes = await fetch(
                              `https://openlibrary.org${data.authors[0].author.key}.json`
                            );
                            if (authorRes.ok) {
                              const authorData = await authorRes.json();
                              authorName = authorData.name || '';
                            }
                          } catch { /* silencieux */ }
                        }
                        title = authorName ? `${data.title} — ${authorName}` : data.title;
                      }
                    }
                  } catch (err) {
                    console.warn('OL book title fetch error:', err);
                    // Fallback : afficher l'ID nettoyé
                    title = note.item_id
                      .replace('ol__works_', '')
                      .replace('ol_', '');
                  }
                  link = `/bibliotheque`;
                  break;
                }

                // Livre Lukeni (UUID standard) → library_books
                const { data } = await supabase
                  .from('library_books')
                  .select('title_fr, title_en, author_fr, author_en')
                  .eq('id', note.item_id)
                  .maybeSingle();
                if (data) {
                  const bookTitle = lang === 'fr' ? cleanTitle(data.title_fr) : cleanTitle(data.title_en);
                  const bookAuthor = lang === 'fr' ? data.author_fr : data.author_en;
                  title = bookAuthor ? `${bookTitle} — ${bookAuthor}` : bookTitle;
                  link = `/bibliotheque`;
                }
                break;
              }

              case 'scholar': {
                const { data } = await supabase
                  .from('articles')
                  .select('title_fr, title_en, slug')
                  .eq('slug', note.item_id)
                  .maybeSingle();
                if (data) {
                  title = lang === 'fr' ? cleanTitle(data.title_fr) : cleanTitle(data.title_en);
                  link = `/encyclopedie/scholar/${data.slug}`;
                }
                break;
              }

              case 'wiki': {
                try {
                  const res = await fetch(
                    `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
                      action: 'query', pageids: note.item_id,
                      prop: 'extracts', exintro: 'true',
                      format: 'json', origin: '*',
                    }),
                    { headers: { 'Api-User-Agent': 'Lukeni/1.0' } }
                  );
                  if (res.ok) {
                    const data = await res.json();
                    const page = Object.values(data.query?.pages || {})[0] as any;
                    if (page?.title) {
                      title = page.title;
                      link = `/encyclopedie/wiki/${note.item_id}`;
                    }
                  }
                } catch (err) {
                  console.warn('Wiki title fetch error:', err);
                }
                break;
              }
            }
          } catch (err) {
            console.warn(`Error loading title for ${note.item_type}/${note.item_id}:`, err);
          }

          return { ...note, title, link };
        })
      );

      setNotes(enrichedNotes);
      setIsLoading(false);
    };

    fetchNotes();
  }, [lang]);

  useEffect(() => {
    const tags = new Set<string>();
    notes.forEach(n => (n.tags || []).forEach((t: string) => tags.add(t)));
    setAllTags(Array.from(tags));
  }, [notes]);

  const handleDelete = useCallback(async (noteId: string) => {
    const { error } = await supabase.from('user_notes').delete().eq('id', noteId);
    if (!error) setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  const typeColors: Record<string, string> = {
    article: '#D4AF37', scholar: '#60A5FA',
    press: '#4ADE80', wiki: '#FACC15', book: '#10B981',
  };

  const totalChars = notes.reduce((acc, n) => acc + (n.content?.length || 0), 0);
  const filtered = notes.filter(note => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      note.title.toLowerCase().includes(q) ||
      (note.content || '').toLowerCase().includes(q);
    const matchTag = tagFilter ? (note.tags || []).includes(tagFilter) : true;
    return matchSearch && matchTag;
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
    </div>
  );

  if (notes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
        <FileText size={24} className="text-purple-400/60" />
      </div>
      <div>
        <p className="text-white font-medium mb-1">{lang === 'fr' ? 'Aucune note' : 'No notes yet'}</p>
        <p className="text-gray-500 text-sm">{lang === 'fr' ? 'Ouvrez un article et prenez des notes' : 'Open an article and take notes'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: FileText, value: notes.length, label: lang === 'fr' ? 'Notes' : 'Notes', color: '#A78BFA' },
          { icon: BookOpen, value: new Set(notes.map(n => n.item_id)).size, label: lang === 'fr' ? 'Sources' : 'Sources', color: '#60A5FA' },
          {
            icon: TrendingUp,
            value: totalChars >= 1000 ? `${(totalChars / 1000).toFixed(1)}k` : totalChars,
            label: lang === 'fr' ? 'Caractères' : 'Chars',
            color: '#4ADE80',
          },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
            <Icon size={14} style={{ color }} />
            <p className="font-bold text-base font-serif" style={{ color }}>{value}</p>
            <p className="text-gray-600 text-[9px] uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input type="text"
          placeholder={lang === 'fr' ? 'Rechercher…' : 'Search…'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/40 transition-colors placeholder:text-gray-600"
        />
      </div>

      {/* Filtres tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setTagFilter('')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${tagFilter === '' ? 'bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30' : 'bg-white/5 text-gray-500'}`}>
            {lang === 'fr' ? 'Tous' : 'All'}
          </button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${tagFilter === tag ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-gray-500'}`}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Liste des notes */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence>
          {filtered.map(note => {
            const isExpanded = expandedId === note.id;
            const typeColor = typeColors[note.item_type] || '#D4AF37';
            const lines = (note.content || '').split('\n');
            const hasMore = lines.length > 4;
            const preview = (isExpanded ? lines : lines.slice(0, 4)).join('\n');

            return (
              <motion.div key={note.id} layout
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }} transition={{ duration: 0.2 }}
                className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/12 transition-all"
                style={{ borderLeft: `3px solid ${typeColor}50` }}>

                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div className="flex-1 min-w-0">
                    {/* Type badge */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>
                        {note.item_type}
                      </span>
                      {/* Badge OL pour les livres Open Library */}
                      {note.item_type === 'book' && isOpenLibraryId(note.item_id) && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">
                          Open Library
                        </span>
                      )}
                      {(note.tags || []).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Titre enrichi */}
                    {note.link ? (
                      <Link href={note.link} className="group/link flex items-center gap-1.5">
                        <span className="text-white font-semibold text-sm group-hover/link:text-[#D4AF37] transition-colors line-clamp-1">
                          {note.title}
                        </span>
                        <ExternalLink size={10} className="flex-shrink-0 text-gray-600 group-hover/link:text-[#D4AF37] transition-colors" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-semibold text-sm line-clamp-1">
                          {note.title}
                        </p>
                        {/* Pour la presse : indiquer qu'il faut ouvrir la page */}
                        {note.item_type === 'press' && (
                          <Link href="/presse"
                            className="text-[9px] text-blue-400/60 hover:text-blue-400 transition-colors flex-shrink-0 flex items-center gap-0.5">
                            <ExternalLink size={9} />
                            <span>{lang === 'fr' ? 'Voir' : 'View'}</span>
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Date + caractères */}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={9} className="text-gray-600" />
                      <span className="text-gray-600 text-[10px]">
                        {new Date(note.updated_at).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-US',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </span>
                      <span className="text-gray-700 text-[10px]">·</span>
                      <span className="text-gray-600 text-[10px]">{note.content?.length || 0} car.</span>
                    </div>
                  </div>

                  {/* Bouton supprimer */}
                  <button onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5">
                    <X size={12} />
                  </button>
                </div>

                {/* Contenu note */}
                {note.content && (
                  <div className="px-4 pb-4">
                    <div className="bg-black/20 rounded-xl p-3 border border-white/[0.04]">
                      <p className={`text-gray-400 text-xs leading-relaxed font-mono whitespace-pre-wrap ${!isExpanded ? 'line-clamp-4' : ''}`}>
                        {preview}
                      </p>
                    </div>
                    {hasMore && (
                      <button onClick={() => setExpandedId(isExpanded ? null : note.id)}
                        className="mt-2 text-[10px] text-gray-500 hover:text-[#D4AF37] transition-colors font-medium flex items-center gap-1">
                        {isExpanded
                          ? <><span>▲</span> {lang === 'fr' ? 'Réduire' : 'Collapse'}</>
                          : <><span>▼</span> {lang === 'fr' ? 'Voir tout' : 'Show all'} ({lines.length} {lang === 'fr' ? 'lignes' : 'lines'})</>}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && notes.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">
            {lang === 'fr' ? 'Aucune note ne correspond à votre recherche.' : 'No notes match your search.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// USER SUBSCRIPTIONS (inchangé)
// ============================================================================

function UserSubscriptions({ lang }: { lang: 'fr' | 'en' }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsLoading(false); return; }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, category_id, created_at, categories(id, name_fr, name_en, color)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) console.error('Subscriptions fetch error:', error);
      if (data) setSubs(data);
      setIsLoading(false);
    };
    fetchSubs();
  }, []);

  const handleUnsubscribe = useCallback(async (subId: string) => {
    const { error } = await supabase.from('user_subscriptions').delete().eq('id', subId);
    if (!error) setSubs(prev => prev.filter(s => s.id !== subId));
    else console.error('Unsubscribe error:', error);
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
    </div>
  );

  if (!userId) return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <Bell size={24} className="text-[#D4AF37]/60" />
      <p className="text-gray-500 text-sm">
        {lang === 'fr' ? 'Connectez-vous pour voir vos abonnements' : 'Sign in to see your subscriptions'}
      </p>
    </div>
  );

  if (subs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
        <Bell size={24} className="text-[#D4AF37]/60" />
      </div>
      <div>
        <p className="text-white font-medium mb-1">{lang === 'fr' ? 'Aucun abonnement' : 'No subscriptions'}</p>
        <p className="text-gray-500 text-sm">{lang === 'fr' ? 'Suivez des catégories pour être notifié' : 'Follow categories to get notified'}</p>
      </div>
      <Link href="/encyclopedie" className="flex items-center gap-2 text-xs text-[#D4AF37] font-bold hover:underline">
        <Globe size={11} /> {lang === 'fr' ? 'Découvrir des catégories' : 'Discover categories'} <ChevronRight size={11} />
      </Link>
    </div>
  );

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {subs.map((s, i) => {
          const cat = s.categories;
          const color = cat?.color || '#D4AF37';
          return (
            <motion.div key={s.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="group flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/12 transition-all">
              <div className="flex items-center gap-3">
                <motion.div className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px 2px ${color}40` }}
                  animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 3, repeat: Infinity }} />
                <div>
                  <p className="text-white text-sm font-medium">
                    {lang === 'fr' ? cat?.name_fr : cat?.name_en}
                  </p>
                  <p className="text-gray-600 text-[10px] flex items-center gap-1.5">
                    <Bell size={8} className="text-[#D4AF37]" />
                    {lang === 'fr' ? 'Abonné·e' : 'Subscribed'}
                    {s.created_at && (
                      <span className="text-gray-700">
                        · {new Date(s.created_at).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-US',
                          { month: 'short', year: 'numeric' }
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => handleUnsubscribe(s.id)}
                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                <BellOff size={13} />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// STATS CARD
// FIX 1 : StatsCard compte user_favorites — le dédupliquage est en amont
// ============================================================================

function StatsCard({ user, lang }: { user: User; lang: 'fr' | 'en' }) {
  const [stats, setStats] = useState({ favorites: 0, notes: 0, joined: '' });

  useEffect(() => {
    const fetchStats = async () => {
      // Récupérer les IDs pour dédupliquer côté stats aussi
      const [favsRes, notesRes] = await Promise.all([
        supabase
          .from('user_favorites')
          .select('item_id, item_type')
          .eq('user_id', user.id),
        supabase
          .from('user_notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      // ── FIX 1 : dédupliquer pour le compteur ──
      let favCount = 0;
      if (favsRes.data) {
        const seen = new Set<string>();
        favsRes.data.forEach(f => {
          const key = `${f.item_type}::${f.item_id}`;
          seen.add(key);
        });
        favCount = seen.size;
      }

      setStats({
        favorites: favCount,
        notes: notesRes.count || 0,
        joined: new Date(user.created_at).toLocaleDateString(
          lang === 'fr' ? 'fr-FR' : 'en-US',
          { month: 'short', year: 'numeric' }
        ),
      });
    };
    fetchStats();
  }, [user, lang]);

  return (
    <div className="flex items-center gap-3">
      {[
        { value: stats.favorites, label: lang === 'fr' ? 'Favoris' : 'Favs', icon: Heart, color: '#EF4444' },
        { value: stats.notes, label: lang === 'fr' ? 'Notes' : 'Notes', icon: FileText, color: '#A78BFA' },
        { value: stats.joined, label: lang === 'fr' ? 'Membre' : 'Since', icon: Star, color: '#D4AF37' },
      ].map(({ value, label, icon: Icon, color }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1 py-3 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
          <Icon size={13} style={{ color }} />
          <span className="text-white font-bold text-sm">{value}</span>
          <span className="text-gray-600 text-[9px] uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DELETE ACCOUNT MODAL (inchangé)
// ============================================================================

function DeleteAccountModal({ isOpen, onClose, onConfirm, lang, isDeleting }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  lang: 'fr' | 'en'; isDeleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState('');
  const expected = lang === 'fr' ? 'SUPPRIMER' : 'DELETE';
  const isValid = confirmText === expected;

  useEffect(() => { if (isOpen) setConfirmText(''); }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-red-500/20 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.15)]">
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={22} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">
                    {lang === 'fr' ? 'Supprimer le compte' : 'Delete account'}
                  </h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {lang === 'fr' ? 'Cette action est irréversible' : 'This action is irreversible'}
                  </p>
                </div>
              </div>
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4 space-y-2">
                <p className="text-red-300 text-xs font-bold flex items-center gap-2 mb-3">
                  <TriangleAlert size={12} />
                  {lang === 'fr' ? 'Ce qui sera supprimé définitivement :' : 'What will be permanently deleted:'}
                </p>
                {[
                  lang === 'fr' ? '🗂️ Tous vos favoris' : '🗂️ All your favorites',
                  lang === 'fr' ? '📝 Toutes vos notes' : '📝 All your notes',
                  lang === 'fr' ? '🔔 Tous vos abonnements' : '🔔 All your subscriptions',
                  lang === 'fr' ? '👤 Votre profil et données personnelles' : '👤 Your profile and personal data',
                ].map((item, i) => (
                  <p key={i} className="text-red-200/70 text-xs">{item}</p>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-2 tracking-[0.2em] uppercase">
                  {lang === 'fr' ? `Tapez "${expected}" pour confirmer` : `Type "${expected}" to confirm`}
                </label>
                <input type="text" value={confirmText}
                  onChange={e => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={expected}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all border ${isValid
                    ? 'bg-red-500/10 border-red-500/50 text-red-300'
                    : 'bg-white/[0.03] border-white/10 text-white placeholder:text-gray-700'
                  }`}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50">
                  {lang === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <motion.button
                  whileHover={isValid && !isDeleting ? { scale: 1.02 } : {}}
                  whileTap={isValid && !isDeleting ? { scale: 0.98 } : {}}
                  onClick={isValid ? onConfirm : undefined}
                  disabled={!isValid || isDeleting}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isValid && !isDeleting
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'bg-red-900/30 text-red-900 cursor-not-allowed opacity-50'
                  }`}>
                  {isDeleting
                    ? <><Loader2 size={14} className="animate-spin" /> {lang === 'fr' ? 'Suppression…' : 'Deleting…'}</>
                    : <><Trash2 size={14} /> {lang === 'fr' ? 'Supprimer' : 'Delete'}</>}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// SETTINGS FORM (inchangé)
// ============================================================================

function SettingsForm({
  user, lang, fullName, setFullName, username, setUsername,
  avatarUrl, setAvatarUrl, onSave, isSaving, saveSuccess,
  isUploading, onUpload, onDeleteAccount,
}: {
  user: User; lang: 'fr' | 'en';
  fullName: string; setFullName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  avatarUrl: string; setAvatarUrl: (v: string) => void;
  onSave: () => void; isSaving: boolean; saveSuccess: boolean;
  isUploading: boolean; onUpload: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <UserIcon size={24} className="text-gray-600" />}
          </div>
          {isUploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
            </div>
          )}
          <button onClick={onUpload} disabled={isUploading}
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-[#D4AF37] text-black rounded-lg flex items-center justify-center shadow-lg hover:bg-white transition-colors disabled:opacity-50">
            <Camera size={10} />
          </button>
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">{lang === 'fr' ? 'Photo de profil' : 'Profile picture'}</p>
          <p className="text-gray-600 text-xs mt-0.5">{lang === 'fr' ? 'JPG, PNG ou GIF recommandé' : 'JPG, PNG or GIF recommended'}</p>
          <button onClick={onUpload} disabled={isUploading}
            className="mt-2 text-xs text-[#D4AF37] font-bold hover:underline disabled:opacity-50">
            {isUploading
              ? (lang === 'fr' ? 'Upload en cours…' : 'Uploading…')
              : (lang === 'fr' ? 'Changer la photo' : 'Change photo')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 tracking-[0.2em] uppercase">
            {lang === 'fr' ? 'Nom complet' : 'Full Name'}
          </label>
          <div className="relative">
            <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-gray-600"
              placeholder="Mansa Moussa" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 tracking-[0.2em] uppercase">
            Username
          </label>
          <div className="relative">
            <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input type="text" value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-gray-600"
              placeholder="mansa_moussa" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 tracking-[0.2em] uppercase">
            Email
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input type="email" value={user.email || ''} disabled
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-gray-500 text-sm cursor-not-allowed" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 text-sm text-green-400 bg-green-400/8 border border-green-400/20 rounded-xl px-4 py-3">
            <CheckCircle size={15} />
            {lang === 'fr' ? 'Profil mis à jour !' : 'Profile updated!'}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={onSave} disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors disabled:opacity-50">
        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {lang === 'fr' ? 'Sauvegarder les modifications' : 'Save changes'}
      </motion.button>

      <div className="pt-4 mt-4 border-t border-white/[0.05]">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-3">
          {lang === 'fr' ? 'Zone dangereuse' : 'Danger zone'}
        </p>
        <button onClick={onDeleteAccount}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-400 bg-red-500/8 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/40 transition-all">
          <Trash2 size={14} />
          {lang === 'fr' ? 'Supprimer mon compte' : 'Delete my account'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE (inchangé)
// ============================================================================

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [activeTab, setActiveTab] = useState<'favorites' | 'notes' | 'subscriptions' | 'circles' | 'settings'>('favorites');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const savedLang = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (savedLang) setLang(savedLang);

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setFullName(data.full_name || '');
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setIsLoading(false);
    };

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { setUser(session.user); await fetchProfile(session.user.id); }
      else router.push('/auth');
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.push('/auth');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const openCloudinary = useCallback(() => {
    if (!user) return;
    setIsUploading(true);

    const handleUploadSuccess = async (secureUrl: string) => {
      setAvatarUrl(secureUrl);
      try {
        const { error } = await supabase.from('profiles').update({ avatar_url: secureUrl }).eq('id', user.id);
        if (error) throw error;
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        console.error('Avatar save error:', err);
      } finally {
        setIsUploading(false);
      }
    };

    const createWidget = () => {
      // @ts-ignore
      const w = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'url', 'camera'],
          resourceType: 'image', multiple: false,
          cropping: true, croppingAspectRatio: 1,
          maxFileSize: 5000000,
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        },
        (error: any, result: any) => {
          if (error) { console.error('Cloudinary error:', error); setIsUploading(false); return; }
          if (result?.event === 'success') handleUploadSuccess(result.info.secure_url);
          if (result?.event === 'close') setIsUploading(false);
        }
      );
      w.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const s = document.createElement('script');
      s.src = 'https://upload-widget.cloudinary.com/global/all.js';
      s.onload = createWidget;
      s.onerror = () => setIsUploading(false);
      document.body.appendChild(s);
    } else {
      createWidget();
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        avatar_url: avatarUrl || null,
      }).eq('id', user.id);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      alert(lang === 'fr' ? 'Erreur de sauvegarde.' : 'Save error.');
    } finally {
      setIsSaving(false);
    }
  }, [user, fullName, username, avatarUrl, lang]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/');
  }, [router]);

   const handleDeleteAccount = useCallback(async () => {
  if (!user) return;
  setIsDeleting(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error(
        lang === 'fr'
          ? 'Session expirée. Reconnectez-vous.'
          : 'Session expired. Please sign in again.'
      );
    }

    const res = await fetch('/api/auth/delete-account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || (
          lang === 'fr'
            ? 'Échec de la suppression du compte'
            : 'Account deletion failed'
        )
      );
    }

    // Nettoyage
    await supabase.auth.signOut({ scope: 'global' });

    const keysToRemove = [
      'lukeni_lang',
      'lukeni_pwa_dismissed',
      'lukeni_pwa_installed',
      'sb-access-token',
      'sb-refresh-token',
      'last_activity', // ✅ Ajouter pour nettoyer le middleware
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // ✅ REDIRECTION VERS /auth AU LIEU DE /
    router.push('/auth?deleted=true');
    
    setTimeout(() => {
      window.location.href = '/auth';
    }, 200);

  } catch (err: any) {
    console.error('Delete account error:', err);
    alert(
      err.message || (
        lang === 'fr'
          ? 'Erreur lors de la suppression. Veuillez contacter le support.'
          : 'Error during deletion. Please contact support.'
      )
    );
  } finally {
    setIsDeleting(false);
    setShowDeleteModal(false);
  }
}, [user, lang, router]);

  if (isLoading) return (
    <div className="min-h-screen bg-[#020111] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
        <CaurisIcon className="w-12 h-12 text-[#D4AF37]" />
      </motion.div>
    </div>
  );

  const TABS = [
    { key: 'favorites' as const, icon: Heart, label_fr: 'Favoris', label_en: 'Favorites', color: '#EF4444' },
    { key: 'notes' as const, icon: FileText, label_fr: 'Notes', label_en: 'Notes', color: '#A78BFA' },
    { key: 'subscriptions' as const, icon: Bell, label_fr: 'Abonnements', label_en: 'Subs', color: '#D4AF37' },
    { key: 'circles' as const, icon: Users, label_fr: 'Cercles', label_en: 'Circles', color: '#A855F7' },
    { key: 'settings' as const, icon: Edit3, label_fr: 'Profil', label_en: 'Profile', color: '#60A5FA' },
  ];

  return (
    <div className="min-h-screen bg-[#020111] text-white overflow-x-hidden">
      <StarBackground />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        lang={lang}
        isDeleting={isDeleting}
      />

      <header className="sticky top-0 z-40 bg-[#020111]/95 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/explore"
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline font-medium">Lukeni</span>
          </Link>
          <div className="flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
            <span className="font-serif text-sm tracking-widest text-white/80">
              {lang === 'fr' ? 'Mon Profil' : 'My Profile'}
            </span>
          </div>
          <button
            onClick={() => {
              const nl = lang === 'fr' ? 'en' : 'fr';
              setLang(nl);
              localStorage.setItem('lukeni_lang', nl);
            }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-[#D4AF37] transition-colors tracking-wider">
            {lang.toUpperCase()}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d0d1a] via-[#0a0a18] to-[#060610] border border-white/[0.07]">
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #D4AF37, #8B5CF6, #60A5FA, #D4AF37)' }} />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #D4AF37 0%, transparent 50%)' }} />
          <div className="relative p-6">
            <div className="flex items-start gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#D4AF37]/30 bg-[#D4AF37]/5">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><UserIcon size={28} className="text-gray-600" /></div>}
                </div>
                {isUploading && (
                  <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
                  </div>
                )}
                <button onClick={openCloudinary} disabled={isUploading}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#D4AF37] text-black rounded-xl flex items-center justify-center shadow-xl hover:bg-white transition-colors disabled:opacity-50">
                  <Camera size={12} />
                </button>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h1 className="text-xl font-serif text-white font-bold leading-tight mb-0.5">
                  {fullName || (lang === 'fr' ? 'Voyageur des étoiles' : 'Star Traveler')}
                </h1>
                {username && (
                  <p className="text-[#D4AF37] text-xs font-mono mb-1 flex items-center gap-1">
                    <AtSign size={10} />@{username}
                  </p>
                )}
                <p className="text-gray-500 text-xs flex items-center gap-1.5 mb-3">
                  <Mail size={10} /><span className="truncate">{user?.email}</span>
                </p>
                <button onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-[11px] text-red-400/60 hover:text-red-400 transition-colors font-medium">
                  <LogOut size={11} />
                  {lang === 'fr' ? 'Déconnexion' : 'Sign out'}
                </button>
              </div>
            </div>
            {user && (
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <StatsCard user={user} lang={lang} />
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex gap-1.5 mb-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5">
            {TABS.map(({ key, icon: Icon, label_fr, label_en, color }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200 ${activeTab === key ? 'text-black' : 'text-gray-500 hover:text-gray-300'}`}>
                {activeTab === key && (
                  <motion.div layoutId="profileTab"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: color }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5">
                  <Icon size={13} /><span>{lang === 'fr' ? label_fr : label_en}</span>
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
              className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.05]"
                style={{ background: `linear-gradient(135deg, ${TABS.find(t => t.key === activeTab)?.color}08, transparent)` }}>
                {(() => {
                  const tab = TABS.find(t => t.key === activeTab)!;
                  const Icon = tab.icon;
                  return (
                    <>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${tab.color}15`, border: `1px solid ${tab.color}25` }}>
                        <Icon size={16} style={{ color: tab.color }} />
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-sm">{lang === 'fr' ? tab.label_fr : tab.label_en}</h2>
                        <p className="text-gray-600 text-[10px]">
                          {activeTab === 'favorites' && (lang === 'fr' ? 'Articles, livres et événements' : 'Articles, books and events')}
                          {activeTab === 'notes' && (lang === 'fr' ? 'Vos annotations personnelles' : 'Your personal annotations')}
                          {activeTab === 'subscriptions' && (lang === 'fr' ? 'Catégories suivies' : 'Followed categories')}
                          {activeTab === 'settings' && (lang === 'fr' ? 'Informations personnelles' : 'Personal information')}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="p-5">
                {activeTab === 'favorites' && <UserFavorites lang={lang} />}
                {activeTab === 'notes' && <UserNotes lang={lang} />}
                {activeTab === 'subscriptions' && (
                  <>
                    <UserSubscriptions lang={lang} />
                    <div className="mt-5 pt-4 border-t border-white/[0.05]">
                      <Link href="/encyclopedie" className="flex items-center gap-2 text-xs text-[#D4AF37] font-bold hover:underline">
                        <Globe size={11} /> {lang === 'fr' ? 'Découvrir des catégories' : 'Discover categories'} <ChevronRight size={11} />
                      </Link>
                    </div>
                  </>
                )}

                {activeTab === 'circles' && <UserCircles lang={lang} userId={user?.id} />}
                {activeTab === 'settings' && user && (
                  <SettingsForm
                    user={user} lang={lang}
                    fullName={fullName} setFullName={setFullName}
                    username={username} setUsername={setUsername}
                    avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
                    onSave={handleSave} isSaving={isSaving} saveSuccess={saveSuccess}
                    isUploading={isUploading} onUpload={openCloudinary}
                    onDeleteAccount={() => setShowDeleteModal(true)}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="h-8" />
      </main>
    </div>
  );
}