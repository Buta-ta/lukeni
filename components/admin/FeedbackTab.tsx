// components/admin/FeedbackTab.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Trash2, MessageSquareText, Search, X,
  AlertTriangle, Archive, Eye, Filter,
  Download, RefreshCw, CheckCheck, Mail, User, UserX,
  Crown, ShieldCheck, Fingerprint
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Feedback {
  id: string;
  space: string;
  emotion: string | null;
  message: string;
  email: string | null;
  status: 'new' | 'read' | 'archived';
  created_at: string;
  user_id: string | null;
  session_id: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    username: string | null;
    role: string | null;
  } | null;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const SPACES: Record<string, { label: string; emoji: string }> = {
  general:      { label: 'Général',        emoji: '🌍' },
  encyclopedie: { label: 'Encyclopédie',   emoji: '📖' },
  presse:       { label: 'Presse',         emoji: '📰' },
  musical:      { label: 'Voyage Musical', emoji: '🎵' },
  library:      { label: 'Bibliothèque',   emoji: '📚' },
  macro:        { label: 'Chiffres',       emoji: '📊' },
  jeux:         { label: 'Jeux',           emoji: '🎮' },
};

const STATUS_CONFIG = {
  new:      { label: 'Nouveau',  color: 'text-[#D4AF37]',  bg: 'bg-[#D4AF37]/15',  dot: 'bg-[#D4AF37]'  },
  read:     { label: 'Lu',       color: 'text-blue-400',   bg: 'bg-blue-400/15',    dot: 'bg-blue-400'    },
  archived: { label: 'Archivé', color: 'text-white/30',   bg: 'bg-white/8',        dot: 'bg-white/30'    },
};

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
const exportCSV = (feedbacks: Feedback[]) => {
  const headers = ['Date', 'Espace', 'Émotion', 'Message', 'Email fourni', 'Utilisateur', 'Session', 'Statut'];
  const rows = feedbacks.map(f => [
    new Date(f.created_at).toLocaleDateString('fr-FR'),
    SPACES[f.space]?.label || f.space,
    f.emotion || '',
    `"${f.message.replace(/"/g, '""')}"`,
    f.email || '',
    f.profile?.full_name || f.profile?.email || '',
    f.session_id || '',
    f.status,
  ]);

  const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lukeni-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── COMPOSANT IDENTITÉ EXPÉDITEUR ────────────────────────────────────────────
const SenderIdentity = ({ feedback }: { feedback: Feedback }) => {
  const hasProfile = feedback.user_id && feedback.profile;
  const hasEmail = feedback.email;
  const isAnonymous = !hasProfile && !hasEmail;

  return (
    <div className="flex items-center gap-2">
      {/* Avatar / Icône */}
      <div className="relative flex-shrink-0">
        {hasProfile && feedback.profile?.avatar_url ? (
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
            <img
              src={feedback.profile.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : hasProfile ? (
          <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30
            flex items-center justify-center">
            <span className="text-green-400 text-xs font-bold">
              {(feedback.profile.full_name || feedback.profile.email || '?')
                .charAt(0).toUpperCase()}
            </span>
          </div>
        ) : hasEmail ? (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30
            flex items-center justify-center">
            <Mail size={12} className="text-blue-400" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-500/10 border border-gray-500/20
            flex items-center justify-center">
            <UserX size={12} className="text-gray-600" />
          </div>
        )}
        {/* Badge rôle si admin */}
        {hasProfile && (feedback.profile?.role === 'admin' || feedback.profile?.role === 'superadmin') && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3 rounded-full bg-red-500
            border border-[#0f0f0f] flex items-center justify-center">
            <Crown size={7} className="text-white" />
          </div>
        )}
      </div>

      {/* Infos texte */}
      <div className="min-w-0">
        {hasProfile ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {feedback.profile.full_name || 'Membre'}
              </span>
              {feedback.profile.role === 'admin' || feedback.profile.role === 'superadmin' ? (
                <span className="text-[8px] px-1 py-0.5 bg-red-500/20 text-red-400 rounded font-bold">
                  👑
                </span>
              ) : (
                <span className="text-[8px] px-1 py-0.5 bg-green-500/20 text-green-400 rounded font-bold">
                  ✓
                </span>
              )}
            </div>
            {feedback.profile.email && (
              <p className="text-[9px] text-gray-500 font-mono truncate max-w-[150px]">
                {feedback.profile.email}
              </p>
            )}
          </>
        ) : hasEmail ? (
          <>
            <p className="text-xs font-medium text-blue-400 truncate max-w-[150px]">
              {feedback.email}
            </p>
            <p className="text-[9px] text-gray-600 flex items-center gap-1">
              <UserX size={8} /> Visiteur avec email
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 italic">Anonyme</p>
            {feedback.session_id && (
              <p className="text-[8px] text-gray-700 font-mono truncate max-w-[150px] flex items-center gap-1">
                <Fingerprint size={8} />
                {feedback.session_id.slice(0, 16)}...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── FEEDBACK CARD ────────────────────────────────────────────────────────────
const FeedbackCard = ({
  feedback,
  onStatusChange,
  onDelete,
}: {
  feedback: Feedback;
  onStatusChange: (id: string, status: Feedback['status']) => void;
  onDelete: (feedback: Feedback) => void;
}) => {
  const sp = SPACES[feedback.space] || { label: feedback.space, emoji: '🌐' };
  const st = STATUS_CONFIG[feedback.status];
  const date = new Date(feedback.created_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`
        p-4 rounded-xl border transition-all
        ${feedback.status === 'new'
          ? 'bg-[#D4AF37]/4 border-[#D4AF37]/20 hover:border-[#D4AF37]/35'
          : feedback.status === 'archived'
            ? 'bg-white/[0.015] border-white/6 opacity-60'
            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Ligne 1 : Expéditeur + meta */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <SenderIdentity feedback={feedback} />

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Espace */}
          <span className="flex items-center gap-1 px-2 py-1 rounded-full
            bg-white/6 border border-white/10 text-[10px] font-bold">
            {sp.emoji} {sp.label}
          </span>

          {/* Émotion */}
          {feedback.emotion && (
            <span className="text-base" title={feedback.emotion}>
              {feedback.emotion}
            </span>
          )}

          {/* Statut */}
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.color}`}>
            <span className={`w-1 h-1 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </div>
      </div>

      {/* Message */}
      <p className="text-white/75 text-sm leading-relaxed mb-3 pl-10">
        {feedback.message}
      </p>

      {/* Date */}
      <div className="flex items-center justify-between pl-10">
        <span className="text-white/20 text-[10px] font-mono">
          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          {' '}
          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Marquer comme lu */}
          {feedback.status === 'new' && (
            <button
              onClick={() => onStatusChange(feedback.id, 'read')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-white/5 text-white/50 hover:text-blue-400 hover:bg-blue-400/10
                transition-all text-[11px] font-medium"
            >
              <Eye size={12} />
              Lu
            </button>
          )}

          {/* Archiver */}
          {feedback.status !== 'archived' && (
            <button
              onClick={() => onStatusChange(feedback.id, 'archived')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-white/5 text-white/50 hover:text-white hover:bg-white/10
                transition-all text-[11px] font-medium"
            >
              <Archive size={12} />
              Archiver
            </button>
          )}

          {/* Désarchiver */}
          {feedback.status === 'archived' && (
            <button
              onClick={() => onStatusChange(feedback.id, 'read')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-white/5 text-white/50 hover:text-white hover:bg-white/10
                transition-all text-[11px] font-medium"
            >
              <RefreshCw size={12} />
              Désarchiver
            </button>
          )}

          {/* Email reply */}
          {(feedback.email || feedback.profile?.email) && (
            <a
              href={`mailto:${feedback.email || feedback.profile?.email}?subject=Lukeni — Réponse à votre avis&body=Bonjour,%0A%0AMerci pour votre retour sur ${SPACES[feedback.space]?.label || feedback.space}.%0A%0ACordialement,%0AL'équipe Lukeni`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-white/5 text-white/50 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10
                transition-all text-[11px] font-medium"
            >
              <Mail size={12} />
              Répondre
            </a>
          )}

          {/* Supprimer */}
          <button
            onClick={() => onDelete(feedback)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-400/10
              transition-all text-[11px] font-medium"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function FeedbackTab({
  showMsg,
}: {
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Feedback | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'read' | 'archived'>('all');
  const [filterSpace, setFilterSpace] = useState<string>('all');
  const [filterEmotion, setFilterEmotion] = useState<string>('all');
  const [filterSender, setFilterSender] = useState<'all' | 'members' | 'email' | 'anonymous'>('all');

  // ─── CHARGEMENT ─────────────────────────────────────────────────────────────
  const loadFeedbacks = useCallback(async () => {
    setIsLoading(true);
    
    // Charger les feedbacks
    const { data: feedbackData, error } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showMsg('error', `Erreur de chargement: ${error.message}`);
      setIsLoading(false);
      return;
    }

    // Récupérer les profils des utilisateurs connectés
    const userIds = (feedbackData || [])
      .filter(f => f.user_id)
      .map(f => f.user_id as string);
    
    const uniqueUserIds = [...new Set(userIds)];
    const profileMap = new Map<string, any>();

    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, username, role')
        .in('id', uniqueUserIds);

      if (profiles) {
        profiles.forEach(p => profileMap.set(p.id, p));
      }
    }

    // Enrichir les feedbacks avec les profils
    const enriched: Feedback[] = (feedbackData || []).map(f => ({
      ...f,
      profile: f.user_id ? (profileMap.get(f.user_id) || null) : null,
    }));

    setFeedbacks(enriched);
    setIsLoading(false);
  }, [showMsg]);

  useEffect(() => { loadFeedbacks(); }, [loadFeedbacks]);

  // ─── CHANGEMENT STATUT ───────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id: string, newStatus: Feedback['status']) => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));

    const { error } = await supabase
      .from('user_feedback')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      showMsg('error', error.message);
    }
  }, [showMsg]);

  // ─── MARQUER TOUS COMME LUS ──────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const newIds = feedbacks.filter(f => f.status === 'new').map(f => f.id);
    if (!newIds.length) return;

    setFeedbacks(prev => prev.map(f =>
      newIds.includes(f.id) ? { ...f, status: 'read' } : f
    ));

    const { error } = await supabase
      .from('user_feedback')
      .update({ status: 'read' })
      .in('id', newIds);

    if (error) showMsg('error', error.message);
    else showMsg('success', `${newIds.length} avis marqués comme lus`);
  }, [feedbacks, showMsg]);

  // ─── SUPPRESSION ────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from('user_feedback')
      .delete()
      .eq('id', deleteConfirm.id);

    if (error) {
      showMsg('error', error.message);
    } else {
      setFeedbacks(prev => prev.filter(f => f.id !== deleteConfirm.id));
      showMsg('success', 'Avis supprimé');
      setDeleteConfirm(null);
    }
    setIsDeleting(false);
  }, [deleteConfirm, showMsg]);

  // ─── FILTRES ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...feedbacks];

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(f =>
        f.message.toLowerCase().includes(t) ||
        f.email?.toLowerCase().includes(t) ||
        f.space.toLowerCase().includes(t) ||
        f.profile?.full_name?.toLowerCase().includes(t) ||
        f.profile?.email?.toLowerCase().includes(t) ||
        f.session_id?.toLowerCase().includes(t)
      );
    }
    if (filterStatus !== 'all') result = result.filter(f => f.status === filterStatus);
    if (filterSpace !== 'all') result = result.filter(f => f.space === filterSpace);
    if (filterEmotion !== 'all') result = result.filter(f => f.emotion === filterEmotion);
    
    // Filtre par type d'expéditeur
    if (filterSender === 'members') result = result.filter(f => f.user_id && f.profile);
    if (filterSender === 'email') result = result.filter(f => !f.user_id && f.email);
    if (filterSender === 'anonymous') result = result.filter(f => !f.user_id && !f.email);

    return result;
  }, [feedbacks, searchTerm, filterStatus, filterSpace, filterEmotion, filterSender]);

  // ─── STATS ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'new').length,
    members: feedbacks.filter(f => f.user_id && f.profile).length,
    withEmail: feedbacks.filter(f => !f.user_id && f.email).length,
    anonymous: feedbacks.filter(f => !f.user_id && !f.email).length,
    bySpace: Object.fromEntries(
      Object.keys(SPACES).map(s => [s, feedbacks.filter(f => f.space === s).length])
    ),
  }), [feedbacks]);

  const emotions = ['😍', '👍', '🤔', '😕', '💡'];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-[#D4AF37]" size={36} />
        <p className="text-white/30 text-sm">Chargement des avis…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <MessageSquareText className="text-[#D4AF37]" size={22} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif text-white">Avis Utilisateurs</h2>
              {stats.new > 0 && (
                <span className="px-2 py-0.5 bg-[#D4AF37] text-black text-[10px]
                  font-black rounded-full">
                  {stats.new} nouveau{stats.new > 1 ? 'x' : ''}
                </span>
              )}
            </div>
            <p className="text-white/35 text-xs mt-0.5">
              {stats.total} avis · {stats.members} membres · {stats.withEmail} emails · {stats.anonymous} anonymes
            </p>
          </div>
        </div>

        {/* Actions globales */}
        <div className="flex items-center gap-2">
          {stats.new > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                bg-white/5 border border-white/10 text-white/50
                hover:text-white hover:border-white/20 transition-all text-xs"
            >
              <CheckCheck size={13} />
              Tout marquer lu
            </button>
          )}
          <button
            onClick={() => exportCSV(feedbacks)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg
              bg-white/5 border border-white/10 text-white/50
              hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all text-xs"
          >
            <Download size={13} />
            Exporter CSV
          </button>
          <button
            onClick={loadFeedbacks}
            className="p-2 rounded-lg bg-white/5 border border-white/10
              text-white/40 hover:text-white transition-all"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ─── STATS RAPIDES PAR ESPACE ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {Object.entries(SPACES).map(([id, sp]) => (
          <button
            key={id}
            onClick={() => setFilterSpace(filterSpace === id ? 'all' : id)}
            className={`
              flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all
              ${filterSpace === id
                ? 'bg-[#D4AF37]/12 border-[#D4AF37]/40'
                : 'bg-white/[0.02] border-white/8 hover:border-white/20'
              }
            `}
          >
            <span className="text-xl">{sp.emoji}</span>
            <span className="text-white font-bold text-sm">{stats.bySpace[id] || 0}</span>
            <span className="text-white/30 text-[9px] truncate w-full text-center">
              {sp.label}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-5 space-y-4">

        {/* ─── FILTRES ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Recherche */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher (message, email, nom, session)…"
              className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg
                pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/20
                focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Statut */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2
              text-xs text-white focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
          >
            <option value="all">Tous les statuts</option>
            <option value="new">🟡 Nouveaux</option>
            <option value="read">🔵 Lus</option>
            <option value="archived">⚫ Archivés</option>
          </select>

          {/* Type d'expéditeur */}
          <select
            value={filterSender}
            onChange={e => setFilterSender(e.target.value as any)}
            className="bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2
              text-xs text-white focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
          >
            <option value="all">Tous les expéditeurs</option>
            <option value="members">✓ Membres connectés</option>
            <option value="email">✉ Visiteurs avec email</option>
            <option value="anonymous">? Anonymes</option>
          </select>

          {/* Émotion */}
          <div className="flex gap-1">
            {['all', ...emotions].map(e => (
              <button
                key={e}
                onClick={() => setFilterEmotion(filterEmotion === e ? 'all' : e)}
                className={`
                  px-2.5 py-2 rounded-lg text-sm transition-all border
                  ${filterEmotion === e
                    ? 'bg-white/10 border-white/30'
                    : 'bg-white/[0.02] border-white/8 opacity-50 hover:opacity-100'
                  }
                `}
              >
                {e === 'all' ? <Filter size={13} className="text-white/50" /> : e}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center justify-between text-[11px] text-white/30">
          <span>
            {filtered.length} avis affiché{filtered.length > 1 ? 's' : ''}
          </span>
          {(searchTerm || filterStatus !== 'all' || filterSpace !== 'all' || filterEmotion !== 'all' || filterSender !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterSpace('all');
                setFilterEmotion('all');
                setFilterSender('all');
              }}
              className="text-[#D4AF37] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* ─── LISTE ────────────────────────────────────────────────────────── */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <AnimatePresence>
            {filtered.length > 0 ? (
              filtered.map(f => (
                <FeedbackCard
                  key={f.id}
                  feedback={f}
                  onStatusChange={handleStatusChange}
                  onDelete={setDeleteConfirm}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <MessageSquareText size={40} className="mx-auto text-white/15 mb-3" />
                <p className="text-white/30 text-sm">
                  {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun avis pour le moment'}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── MODAL SUPPRESSION ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center
              p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-red-500/25 rounded-2xl
                p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-red-500/15 rounded-full">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Supprimer cet avis ?</h3>
                  <p className="text-white/35 text-xs">Action irréversible</p>
                </div>
              </div>

              <div className="bg-white/4 rounded-xl p-3 mb-5 border border-white/8">
                <p className="text-white/60 text-sm line-clamp-3">{deleteConfirm.message}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-white/8 text-white rounded-xl
                    text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl
                    text-sm font-bold hover:bg-red-600 transition-colors
                    flex items-center justify-center gap-2
                    disabled:opacity-50"
                >
                  {isDeleting
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}