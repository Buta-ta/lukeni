// components/VisitorsTab.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Globe, Users, Eye, MapPin,
  Monitor, Smartphone, RefreshCw, User, UserX,
  BarChart3, ArrowUpRight, Activity, Mail, X,
  Trash2, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitProfile {
  full_name:  string | null;
  email:      string | null;
  avatar_url: string | null;
  username:   string | null;
  role:       string | null;
}

interface Visit {
  id:           string;
  session_id:   string;
  user_id:      string | null;
  page:         string;
  referrer:     string | null;
  country:      string | null;
  country_code: string | null;
  city:         string | null;
  region:       string | null;
  ip:           string;
  user_agent:   string;
  is_mobile:    boolean;
  created_at:   string;
  profile?:     VisitProfile | null;
}

interface Stats {
  totalVisits:    number;
  uniqueSessions: number;
  knownUsers:     number;
  anonymousUsers: number;
  mobileVisits:   number;
  desktopVisits:  number;
}

interface CountryData {
  country:      string;
  country_code: string;
  count:        number;
  flag:         string;
}

interface CityData {
  city:         string;
  country:      string;
  country_code: string;
  count:        number;
}

interface PageData {
  page:  string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countryCodeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return '🌍';
  return code
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

function formatPage(page: string): string {
  if (page === '/')                    return '🏠 Accueil';
  if (page === '/explore')             return '🔍 Explorer';
  if (page === '/voyage-musical')      return '🎵 Voyage Musical';
  if (page === '/bibliotheque')        return '📚 Bibliothèque';
  if (page === '/presse')              return '📰 Presse';
  if (page === '/encyclopedie')        return '📖 Encyclopédie';
  if (page === '/profil')              return '👤 Profil';
  if (page === '/auth')                return '🔐 Auth';
  if (page.startsWith('/encyclopedie/')) return `📖 ${page.replace('/encyclopedie/', '')}`;
  return page;
}

function timeAgo(dateStr: string): string {
  const diff    = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1)  return 'À l\'instant';
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24)   return `il y a ${hours}h`;
  return `il y a ${days}j`;
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname; }
  catch { return url.slice(0, 30); }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color = 'blue',
}: {
  icon: LucideIcon;   
  label: string;
  value: number | string;
  color?: 'red' | 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    red:    'bg-red-500/10    text-red-400    border-red-500/20',
    blue:   'bg-blue-500/10   text-blue-400   border-blue-500/20',
    green:  'bg-green-500/10  text-green-400  border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${colors[color]} flex items-center gap-4`}
    >
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-mono truncate">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Modal de confirmation de suppression ──────────────────────────────────────

function DeleteConfirmModal({
  onConfirm,
  onCancel,
  type,
  count,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  type: 'single' | 'all' | 'period';
  count?: number;
}) {
  const messages = {
    single: {
      title: 'Supprimer cette visite ?',
      description: 'Cette action est irréversible.',
    },
    all: {
      title: 'Supprimer TOUTES les visites ?',
      description: `Vous êtes sur le point de supprimer ${count || 0} visites. Cette action est irréversible et supprimera définitivement toutes les données de tracking.`,
    },
    period: {
      title: 'Supprimer les visites de cette période ?',
      description: `${count || 0} visites seront supprimées définitivement.`,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{messages[type].title}</h3>
            <p className="text-gray-400 text-xs">Action irréversible</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          {messages[type].description}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function VisitorsTab({
  showMsg,
}: {
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [visits, setVisits]                   = useState<Visit[]>([]);
  const [stats, setStats]                     = useState<Stats | null>(null);
  const [countries, setCountries]             = useState<CountryData[]>([]);
  const [cities, setCities]                   = useState<CityData[]>([]);
  const [pages, setPages]                     = useState<PageData[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [isRefreshing, setIsRefreshing]       = useState(false);
  const [activeSection, setActiveSection]     = useState<'overview' | 'live' | 'geo' | 'pages'>('overview');
  const [selectedVisit, setSelectedVisit]     = useState<Visit | null>(null);

  // Suppression
  const [deleteModal, setDeleteModal]         = useState<{ type: 'single' | 'all' | 'period'; id?: string; count?: number } | null>(null);
  const [isDeleting, setIsDeleting]           = useState(false);

  // Filtres
  const [period, setPeriod]         = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h');
  const [filterType, setFilterType] = useState<'all' | 'known' | 'anonymous'>('all');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Période
      const now = new Date();
      let startDate: string | null = null;
      if (period === '1h')  startDate = new Date(now.getTime() - 3_600_000).toISOString();
      if (period === '24h') startDate = new Date(now.getTime() - 86_400_000).toISOString();
      if (period === '7d')  startDate = new Date(now.getTime() - 7  * 86_400_000).toISOString();
      if (period === '30d') startDate = new Date(now.getTime() - 30 * 86_400_000).toISOString();

      // ── 1. Visites ──────────────────────────────────────────────────────────
      let query = supabase
        .from('page_visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate)                  query = query.gte('created_at', startDate);
      if (filterType === 'known')     query = query.not('user_id', 'is', null);
      if (filterType === 'anonymous') query = query.is('user_id', null);

      const { data, error } = await query.limit(500);
      if (error) throw error;

      const rawVisits = (data || []) as Visit[];

      // ── 2. User IDs uniques ─────────────────────────────────────────────────
      const userIds = [
        ...new Set(
          rawVisits
            .filter(v => v.user_id !== null)
            .map(v => v.user_id as string)
        ),
      ];

      // ── 3. Profils en une seule requête ─────────────────────────────────────
      const profileMap = new Map<string, VisitProfile>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, username, role')
          .in('id', userIds);

        if (profiles) {
          (profiles as any[]).forEach(p => {
            profileMap.set(p.id, {
              full_name:  p.full_name  || null,
              email:      p.email      || null,
              avatar_url: p.avatar_url || null,
              username:   p.username   || null,
              role:       p.role       || null,
            });
          });
        }
      }

      // ── 4. Enrichir les visites ─────────────────────────────────────────────
      const enrichedVisits: Visit[] = rawVisits.map(v => ({
        ...v,
        profile: v.user_id ? (profileMap.get(v.user_id) ?? null) : null,
      }));

      setVisits(enrichedVisits);

      // ── 5. Stats ────────────────────────────────────────────────────────────
      const sessions   = new Set(enrichedVisits.map(v => v.session_id));
      const knownUsers = new Set(enrichedVisits.filter(v => v.user_id).map(v => v.user_id));
      const anonSess   = new Set(enrichedVisits.filter(v => !v.user_id).map(v => v.session_id));

      setStats({
        totalVisits:    enrichedVisits.length,
        uniqueSessions: sessions.size,
        knownUsers:     knownUsers.size,
        anonymousUsers: anonSess.size,
        mobileVisits:   enrichedVisits.filter(v => v.is_mobile).length,
        desktopVisits:  enrichedVisits.filter(v => !v.is_mobile).length,
      });

      // ── 6. Pays ─────────────────────────────────────────────────────────────
      const countryMap = new Map<string, { country: string; country_code: string; count: number }>();
      enrichedVisits.forEach(v => {
        if (!v.country_code) return;
        const existing = countryMap.get(v.country_code);
        if (existing) existing.count++;
        else countryMap.set(v.country_code, { country: v.country || v.country_code, country_code: v.country_code, count: 1 });
      });
      setCountries(
        Array.from(countryMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
          .map(c => ({ ...c, flag: countryCodeToFlag(c.country_code) }))
      );

      // ── 7. Villes ───────────────────────────────────────────────────────────
      const cityMap = new Map<string, CityData>();
      enrichedVisits.forEach(v => {
        if (!v.city) return;
        const key = `${v.city}-${v.country_code}`;
        const existing = cityMap.get(key);
        if (existing) existing.count++;
        else cityMap.set(key, { city: v.city, country: v.country || '', country_code: v.country_code || '', count: 1 });
      });
      setCities(
        Array.from(cityMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // ── 8. Pages ────────────────────────────────────────────────────────────
      const pageMap = new Map<string, number>();
      enrichedVisits.forEach(v => pageMap.set(v.page, (pageMap.get(v.page) || 0) + 1));
      setPages(
        Array.from(pageMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([page, count]) => ({ page, count }))
      );

    } catch (err: any) {
      showMsg('error', err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, filterType, showMsg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh en direct
  useEffect(() => {
    if (activeSection !== 'live') return;
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [activeSection, fetchData]);

  // ── Suppression ───────────────────────────────────────────────────────────
  const handleDeleteSingle = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('page_visits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showMsg('success', '✓ Visite supprimée');
      setDeleteModal(null);
      setSelectedVisit(null);
      await fetchData(true);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur de suppression');
    } finally {
      setIsDeleting(false);
    }
  }, [fetchData, showMsg]);

  const handleDeletePeriod = useCallback(async () => {
    setIsDeleting(true);
    try {
      const now = new Date();
      let startDate: string | null = null;

      if (period === '1h')  startDate = new Date(now.getTime() - 3_600_000).toISOString();
      if (period === '24h') startDate = new Date(now.getTime() - 86_400_000).toISOString();
      if (period === '7d')  startDate = new Date(now.getTime() - 7  * 86_400_000).toISOString();
      if (period === '30d') startDate = new Date(now.getTime() - 30 * 86_400_000).toISOString();

      let query = supabase.from('page_visits').delete();

      if (startDate) query = query.gte('created_at', startDate);
      if (filterType === 'known') query = query.not('user_id', 'is', null);
      if (filterType === 'anonymous') query = query.is('user_id', null);

      const { error } = await query;
      if (error) throw error;

      showMsg('success', '✓ Visites supprimées');
      setDeleteModal(null);
      await fetchData(true);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur de suppression');
    } finally {
      setIsDeleting(false);
    }
  }, [period, filterType, fetchData, showMsg]);

  const handleDeleteAll = useCallback(async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('page_visits')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      showMsg('success', '✓ Toutes les visites ont été supprimées');
      setDeleteModal(null);
      await fetchData(true);
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur de suppression');
    } finally {
      setIsDeleting(false);
    }
  }, [fetchData, showMsg]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  const maxCountry = countries[0]?.count || 1;
  const maxPage    = pages[0]?.count    || 1;

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Eye className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white">Visiteurs</h2>
            <p className="text-gray-400 text-xs">Analyse du trafic en temps réel</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Période */}
          <div className="flex bg-white/5 rounded-lg p-1 gap-1">
            {(['1h', '24h', '7d', '30d', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Tout' : p}
              </button>
            ))}
          </div>

          {/* Type visiteur */}
          <div className="flex bg-white/5 rounded-lg p-1 gap-1">
            {([
              { value: 'all',       label: 'Tous' },
              { value: 'known',     label: '✓ Connus' },
              { value: 'anonymous', label: '? Anonymes' },
            ] as const).map(f => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  filterType === f.value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            {/* Supprimer période */}
            {visits.length > 0 && (
              <button
                onClick={() => setDeleteModal({ type: 'period', count: visits.length })}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-all"
                title="Supprimer les visites de cette période"
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Supprimer tout */}
            {stats && stats.totalVisits > 0 && (
              <button
                onClick={() => setDeleteModal({ type: 'all', count: stats.totalVisits })}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-all"
                title="Supprimer TOUTES les visites"
              >
                <Trash2 size={14} className="animate-pulse" />
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard icon={Eye}        label="Pages vues"    value={stats.totalVisits}    color="blue"   />
          <StatCard icon={Activity}   label="Sessions"      value={stats.uniqueSessions} color="purple" />
          <StatCard icon={User}       label="Connus"        value={stats.knownUsers}     color="green"  />
          <StatCard icon={UserX}      label="Anonymes"      value={stats.anonymousUsers} color="orange" />
          <StatCard icon={Monitor}    label="Desktop"       value={stats.desktopVisits}  color="blue"   />
          <StatCard icon={Smartphone} label="Mobile"        value={stats.mobileVisits}   color="red"    />
        </div>
      )}

      {/* ── Navigation sections ──────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-white/5 pb-2 flex-wrap">
        {([
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
          { id: 'live',     label: 'En direct',       icon: Activity  },
          { id: 'geo',      label: 'Géographie',      icon: Globe     },
          { id: 'pages',    label: 'Pages',           icon: Eye       },
        ] as const).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === s.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <s.icon size={12} />
            {s.label}
            {s.id === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* ── Sections ─────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ── VUE D'ENSEMBLE ───────────────────────────────────────────────── */}
        {activeSection === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Top pays */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Globe size={14} className="text-blue-400" /> Top Pays
              </h3>
              <div className="space-y-3">
                {countries.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-6">Aucune donnée géographique</p>
                )}
                {countries.slice(0, 8).map((c, i) => (
                  <div key={c.country_code} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4 font-mono">{i + 1}</span>
                    <span className="text-lg leading-none">{c.flag}</span>
                    <span className="text-xs text-gray-300 flex-1 truncate">{c.country}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-white/5 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${(c.count / maxCountry) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-mono w-6 text-right">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top pages */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Eye size={14} className="text-blue-400" /> Pages les plus visitées
              </h3>
              <div className="space-y-3">
                {pages.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-6">Aucune donnée</p>
                )}
                {pages.map((p, i) => (
                  <div key={p.page} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4 font-mono">{i + 1}</span>
                    <span className="text-xs text-gray-300 flex-1 truncate">{formatPage(p.page)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-white/5 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-purple-500"
                          style={{ width: `${(p.count / maxPage) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-mono w-6 text-right">{p.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appareils */}
            {stats && (
              <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Monitor size={14} className="text-blue-400" /> Appareils
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span className="flex items-center gap-1.5"><Monitor size={11} /> Desktop</span>
                      <span>
                        {stats.desktopVisits}
                        {' '}({stats.totalVisits > 0 ? Math.round((stats.desktopVisits / stats.totalVisits) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${stats.totalVisits > 0 ? (stats.desktopVisits / stats.totalVisits) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span className="flex items-center gap-1.5"><Smartphone size={11} /> Mobile</span>
                      <span>
                        {stats.mobileVisits}
                        {' '}({stats.totalVisits > 0 ? Math.round((stats.mobileVisits / stats.totalVisits) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${stats.totalVisits > 0 ? (stats.mobileVisits / stats.totalVisits) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><User size={11} /> {stats.knownUsers} membres identifiés</span>
                    <span className="flex items-center gap-1.5"><UserX size={11} /> {stats.anonymousUsers} anonymes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top villes */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-blue-400" /> Top Villes
              </h3>
              <div className="space-y-2">
                {cities.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-6">Aucune donnée de ville</p>
                )}
                {cities.map((c, i) => (
                  <div key={`${c.city}-${i}`} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-mono w-4">{i + 1}</span>
                      <span className="text-sm">{countryCodeToFlag(c.country_code)}</span>
                      <div>
                        <p className="text-xs text-white font-medium">{c.city}</p>
                        <p className="text-[10px] text-gray-600">{c.country}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-blue-400 font-bold">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── EN DIRECT ────────────────────────────────────────────────────── */}
        {activeSection === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                {visits.length} visite{visits.length > 1 ? 's' : ''} — actualisation auto toutes les 30s
              </p>
              <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                EN DIRECT
              </span>
            </div>

            {visits.length === 0 && (
              <div className="text-center py-16">
                <Activity size={48} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">Aucune visite sur cette période</p>
              </div>
            )}

            {visits.slice(0, 100).map((visit) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedVisit(visit)}
                className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-white/5 rounded-xl hover:border-white/15 transition-all cursor-pointer group"
              >
                {/* Avatar / icône */}
                <div className="flex-shrink-0">
                  {visit.user_id && visit.profile ? (
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500/40 bg-green-500/10">
                        {visit.profile.avatar_url ? (
                          <img
                            src={visit.profile.avatar_url}
                            alt={visit.profile.full_name || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-green-400 text-sm font-bold">
                              {(visit.profile.full_name || visit.profile.email || '?')
                                .charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Point vert */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0f0f0f]" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
                      <UserX size={16} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  {/* Ligne identité */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    {visit.user_id && visit.profile ? (
                      <>
                        <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                          {visit.profile.full_name || 'Membre'}
                        </span>
                        {visit.profile.username && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            @{visit.profile.username}
                          </span>
                        )}
                        {(visit.profile.role === 'admin' || visit.profile.role === 'superadmin') ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-bold border border-red-500/20">
                            👑 ADMIN
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold border border-green-500/20">
                            ✓ MEMBRE
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-600 italic">Visiteur anonyme</span>
                    )}
                    {visit.is_mobile && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                        📱
                      </span>
                    )}
                  </div>

                  {/* Email si connu */}
                  {visit.profile?.email && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <Mail size={9} className="text-gray-600 flex-shrink-0" />
                      <span className="text-[10px] text-gray-500 font-mono truncate">
                        {visit.profile.email}
                      </span>
                    </div>
                  )}

                  {/* Page + lieu */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-blue-400 truncate max-w-[140px]">
                      {formatPage(visit.page)}
                    </span>
                    {(visit.city || visit.country) && (
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <MapPin size={9} />
                        {[visit.city, visit.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {visit.ip && visit.ip !== 'localhost' && (
                      <span className="text-[9px] text-gray-700 font-mono">
                        {visit.ip}
                      </span>
                    )}
                  </div>
                </div>

                {/* Drapeau + temps */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xl leading-none">
                    {countryCodeToFlag(visit.country_code)}
                  </span>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
                    {timeAgo(visit.created_at)}
                  </span>
                  {visit.referrer && (
                    <span className="text-[9px] text-gray-700 truncate max-w-[70px]" title={visit.referrer}>
                      ← {safeHostname(visit.referrer)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── GÉOGRAPHIE ───────────────────────────────────────────────────── */}
        {activeSection === 'geo' && (
          <motion.div
            key="geo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Pays */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Globe size={14} className="text-blue-400" />
                Tous les pays ({countries.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {countries.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-8">Aucune donnée géographique</p>
                )}
                {countries.map((c, i) => (
                  <div key={c.country_code} className="flex items-center gap-3 p-2 hover:bg-white/[0.02] rounded-lg transition-all">
                    <span className="text-xs text-gray-600 w-5 font-mono text-right">{i + 1}</span>
                    <span className="text-xl leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{c.country}</p>
                      <p className="text-[9px] text-gray-600 font-mono">{c.country_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-white/5 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                          style={{ width: `${(c.count / maxCountry) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-blue-400 w-6 text-right font-mono">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Villes */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-blue-400" />
                Toutes les villes ({cities.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {cities.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-8">Aucune donnée de ville</p>
                )}
                {cities.map((c, i) => (
                  <div key={`${c.city}-${c.country_code}-${i}`} className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-all">
                    <span className="text-xs text-gray-600 w-5 font-mono text-right">{i + 1}</span>
                    <span className="text-xl leading-none">{countryCodeToFlag(c.country_code)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium">{c.city}</p>
                      <p className="text-[10px] text-gray-500">{c.country}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-400 font-mono">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PAGES ────────────────────────────────────────────────────────── */}
        {activeSection === 'pages' && (
          <motion.div
            key="pages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5"
          >
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Eye size={14} className="text-blue-400" /> Détail par page
            </h3>
            <div className="space-y-3">
              {pages.length === 0 && (
                <p className="text-gray-600 text-xs text-center py-8">Aucune donnée</p>
              )}
              {pages.map((p, i) => (
                <div key={p.page} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-mono w-5 text-right">{i + 1}</span>
                      <span className="text-xs text-white font-medium">{formatPage(p.page)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {maxPage > 0 ? Math.round((p.count / maxPage) * 100) : 0}%
                      </span>
                      <span className="text-xs font-bold text-blue-400 font-mono w-6 text-right">{p.count}</span>
                    </div>
                  </div>
                  <div className="ml-7 w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-500"
                      style={{ width: `${(p.count / maxPage) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL DÉTAIL VISITEUR ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedVisit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedVisit(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Header modal */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">Détail du visiteur</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeleteModal({ type: 'single', id: selectedVisit.id })}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Supprimer cette visite"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="p-1.5 text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Identité */}
              <div className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5 mb-5">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                  {selectedVisit.profile?.avatar_url ? (
                    <img
                      src={selectedVisit.profile.avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : selectedVisit.user_id ? (
                    <span className="text-white text-xl font-bold">
                      {(selectedVisit.profile?.full_name || selectedVisit.profile?.email || '?')
                        .charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <UserX size={24} className="text-gray-600" />
                  )}
                </div>

                {/* Infos identité */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-white font-semibold truncate">
                      {selectedVisit.profile?.full_name
                        || (selectedVisit.user_id ? 'Membre' : 'Visiteur anonyme')}
                    </p>
                    {selectedVisit.user_id && (
                      (selectedVisit.profile?.role === 'admin' || selectedVisit.profile?.role === 'superadmin') ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-bold">
                          👑 ADMIN
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold">
                          ✓ MEMBRE
                        </span>
                      )
                    )}
                  </div>
                  {selectedVisit.profile?.email && (
                    <p className="text-gray-500 text-xs font-mono truncate">
                      {selectedVisit.profile.email}
                    </p>
                  )}
                  {selectedVisit.profile?.username && (
                    <p className="text-gray-600 text-xs">
                      @{selectedVisit.profile.username}
                    </p>
                  )}
                  {!selectedVisit.user_id && (
                    <p className="text-gray-700 text-[10px] font-mono">
                      Session : {selectedVisit.session_id.slice(0, 24)}...
                    </p>
                  )}
                </div>
              </div>

              {/* Détails visite */}
              <div className="space-y-0">
                {[
                  { label: 'Page',     value: formatPage(selectedVisit.page)                                           },
                  { label: 'Pays',     value: `${countryCodeToFlag(selectedVisit.country_code)} ${selectedVisit.country || '—'}` },
                  { label: 'Ville',    value: selectedVisit.city   || '—'                                              },
                  { label: 'Région',   value: selectedVisit.region || '—'                                              },
                  { label: 'IP',       value: selectedVisit.ip     || '—'                                              },
                  { label: 'Appareil', value: selectedVisit.is_mobile ? '📱 Mobile' : '🖥️ Desktop'                     },
                  { label: 'Date',     value: new Date(selectedVisit.created_at).toLocaleString('fr-FR')               },
                  { label: 'Referrer', value: selectedVisit.referrer ? safeHostname(selectedVisit.referrer) : 'Direct' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0"
                  >
                    <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider w-20 flex-shrink-0">
                      {label}
                    </span>
                    <span className="text-xs text-gray-300 font-mono text-right truncate max-w-[220px]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL CONFIRMATION SUPPRESSION ────────────────────────────────────── */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteConfirmModal
            type={deleteModal.type}
            count={deleteModal.count}
            onConfirm={() => {
              if (deleteModal.type === 'single' && deleteModal.id) {
                handleDeleteSingle(deleteModal.id);
              } else if (deleteModal.type === 'period') {
                handleDeletePeriod();
              } else if (deleteModal.type === 'all') {
                handleDeleteAll();
              }
            }}
            onCancel={() => setDeleteModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}