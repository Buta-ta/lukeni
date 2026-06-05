// app/admin/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ImagePlus, MessageSquareText, Star, CheckCircle,
  Tag, Lightbulb, FileText, CalendarDays, Music, FileAudio,
  Newspaper, Library, ShieldCheck, X, Loader2, AlertTriangle,
  Crown, LayoutDashboard, Inbox, Clock, Globe,Link2,Eye,Bell, BookOpen
} from "lucide-react";
import { autoTranslate } from "@/lib/lingua";
import type { User } from "@supabase/supabase-js";


// Tabs locales
import HeroTab         from "./tabs/HeroTab";
import SuggestionsTab  from "./tabs/SuggestionsTab";
import ConstellationTab from "./tabs/ConstellationTab";
import DashboardTab    from "./tabs/DashboardTab";
import ContributionsTab from "./tabs/ContributionsTab";

// Tabs globales
import CategoriesTab      from "@/components/CategoriesTab";
import TopicSuggestionsTab from "@/components/TopicSuggestionsTab";
import ArticlesTab        from "@/components/ArticlesTab";
import EventsTab          from "@/components/EventsTab";
import MusicGenresTab     from "@/components/MusicGenresTab";
import MusicTracksTab     from "@/components/MusicTracksTab";
import MusicErasTab       from "@/components/MusicErasTab";
import SocialMediaTab     from "@/components/SocialMediaTab";
import PressTab           from "@/components/PressTab";
import LibraryTab         from "@/components/LibraryTab";
import AdminsTab          from "@/components/AdminsTab";
import ArticleEventsLinkTab from "@/components/ArticleEventsLinkTab"; // ← AJOUTER
import AdsTab from '@/components/AdsTab';
import VisitorsTab from '@/components/VisitorsTab';
import NotificationsTab    from "@/components/NotificationsTab";  
import AboutTab from '@/components/AboutTab';

import { useActivityTimeout } from '@/lib/hooks/useActivityTimeout';

// ─── Types ────────────────────────────────────────────────────────────────────

// ✅ CORRECT (à remplacer)
type TabType =
  | "dashboard"
  | "contributions"
  | "hero"
  | "suggestions"
  | "constellation"
  | "about" 
  | "categories"
  | "topic_suggestions"
  | "articles"
  | "events"
  | "article_events"
  | "music_eras"
  | "music_genres"
  | "music_tracks"
  | "social_media"
  | "press"
  | "notifications"  
  | "library"
  | "admins"
  | "ads"  // ← Pas de point-virgule avant cette ligne
  | "visitors";

const ALL_TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "dashboard",         label: "Dashboard",       icon: LayoutDashboard  },
  { id: "contributions",     label: "Contributions",   icon: Inbox            },
  { id: "hero",              label: "Background",      icon: ImagePlus        },
  { id: "suggestions",       label: "Recherche",       icon: MessageSquareText},
  { id: "constellation",     label: "Constellation",   icon: Star             },
  { id: "categories",        label: "Catégories",      icon: Tag              },
  { id: "topic_suggestions", label: "Sujets 💡",       icon: Lightbulb        },
  { id: "articles",          label: "Articles",        icon: FileText         },
  { id: "events",            label: "Événements",      icon: CalendarDays     },
  { id: "article_events",    label: "Art↔Evt 🔗",      icon: Link2            }, // ← AJOUTER (tu dois importer Link2 aussi)
  { id: "music_eras",        label: "Époques 🕐",      icon: Clock            },
  { id: "music_genres",      label: "Genres 🎵",       icon: Music            },
  { id: "music_tracks",      label: "Tracks 🧨",       icon: FileAudio        },
  { id: "social_media",      label: "Réseaux 🌐",      icon: Globe            },
  { id: "press",             label: "Presse 📰",        icon: Newspaper        },
   { id: "notifications",     label: "Notifications 🔔", icon: Bell            }, 
  { id: "ads", label: "Publicités 📣", icon: Star },
  { id: "library",           label: "Bibliothèque 📚", icon: Library          },
  { id: "visitors", label: "Visiteurs 👁️", icon: Eye },
  { id: "admins",            label: "Admins 👑",        icon: ShieldCheck      },
  { id: "about", label: "À Propos 📖", icon: BookOpen },

];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {


   // ✅ Ajouter juste après les useState
  useActivityTimeout(() => {
    router.push('/admin/auth?reason=timeout');
  });

  
  const router = useRouter();


  const [activeTab, setActiveTab]         = useState<TabType>("dashboard");
  const [msg, setMsg]                     = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [user, setUser]                   = useState<User | null>(null);
  const [userProfile, setUserProfile]     = useState<{ role: string; allowed_tabs: string[] } | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [mounted, setMounted]             = useState(false);
  const [contributionsCount, setContributionsCount] = useState(0);
  const [availableTabs, setAvailableTabs] = useState<typeof ALL_TABS>([]);

  useEffect(() => { setMounted(true); }, []);

  // Badge contributions en attente
  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from("music_contributions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setContributionsCount(count || 0);
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/admin/auth");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, allowed_tabs")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.push("/admin/auth");
        return;
      }

      if (profile.role !== "admin" && profile.role !== "superadmin") {
        await supabase.auth.signOut();
        router.push("/admin/auth");
        return;
      }

      setUser(session.user);
      setUserProfile(profile);

      if (profile.role === "superadmin") {
        setAvailableTabs(ALL_TABS);
      } else {
        const allowed = profile.allowed_tabs || [];
        const filtered = ALL_TABS.filter((t) => allowed.includes(t.id));
        setAvailableTabs(filtered);
        if (filtered.length > 0 && !allowed.includes(activeTab)) {
          setActiveTab(filtered[0].id);
        }
      }

      setIsLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => { if (event === "SIGNED_OUT") router.push("/admin/auth"); }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const translateText = async (text: string, lang: "fr" | "en") => {
    try { return await autoTranslate(text, lang); }
    catch { return text; }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/auth");
  };

  // ── Splash ────────────────────────────────────────────────────────────────
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-red-500 mx-auto mb-4" size={40} />
          <p className="text-gray-400 text-sm font-mono">Chargement du dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Helper badge ──────────────────────────────────────────────────────────
  const getBadge = (tabId: TabType) =>
    tabId === "contributions" ? contributionsCount : 0;

  // ── Render tab content ────────────────────────────────────────────────────
  function renderTab() {
    if (!availableTabs.some((t) => t.id === activeTab)) return null;

    switch (activeTab) {
      case "dashboard":         return <DashboardTab showMsg={showMsg} />;
      case "contributions":     return <ContributionsTab showMsg={showMsg} />;
      case "hero":              return <HeroTab showMsg={showMsg} />;
      case "suggestions":       return <SuggestionsTab showMsg={showMsg} translateText={translateText} />;
      case "constellation":     return <ConstellationTab showMsg={showMsg} translateText={translateText} />;
      case "about": return <AboutTab showMsg={showMsg} />;
      case "categories":        return <CategoriesTab showMsg={showMsg} translateText={translateText} />;
      case "topic_suggestions": return <TopicSuggestionsTab showMsg={showMsg} />;
      case "articles":          return <ArticlesTab showMsg={showMsg} />;
      case "events":            return <EventsTab showMsg={showMsg} />;
      case "article_events":    return <ArticleEventsLinkTab showMsg={showMsg} />; // ← AJOUTER
      case "music_eras":        return <MusicErasTab showMsg={showMsg} />;
      case "music_genres":      return <MusicGenresTab showMsg={showMsg} />;
      case "music_tracks":      return <MusicTracksTab showMsg={showMsg} />;
      case "social_media":      return <SocialMediaTab showMsg={showMsg} />;
      case "press":             return <PressTab showMsg={showMsg} />;
      case "notifications":     return <NotificationsTab showMsg={showMsg} />;
      case "ads": return <AdsTab showMsg={showMsg} />;  
      case "library":           return <LibraryTab showMsg={showMsg} />;
      case "visitors": return <VisitorsTab showMsg={showMsg} />;

      case "admins":            return <AdminsTab showMsg={showMsg} />;

      default:                  return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">

      {/* ── Sidebar desktop ───────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-[#0a0a0a]">
        {/* Logo */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
              {userProfile?.role === "superadmin"
                ? <Crown size={16} className="text-red-500" />
                : <ShieldCheck size={16} className="text-red-500" />}
            </div>
            <div>
              <h1 className="text-sm font-mono font-bold text-gray-300">LUKENI</h1>
              <p className="text-[10px] text-gray-600 font-mono">
                {userProfile?.role === "superadmin" ? "SUPERADMIN" : "ADMIN"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {availableTabs.map((tab) => {
            const badge = getBadge(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all relative ${
                  activeTab === tab.id
                    ? "bg-red-600/20 text-red-400"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {badge > 0 && (
                  <span className="absolute right-3 top-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            onClick={() => router.push("/explore")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={14} /> Retour au site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"
          >
            <X size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen">

        {/* Top bar mobile */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-white/5 bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-600/20 flex items-center justify-center">
              {userProfile?.role === "superadmin"
                ? <Crown size={14} className="text-red-500" />
                : <ShieldCheck size={14} className="text-red-500" />}
            </div>
            <span className="text-xs font-mono text-gray-400">
              {userProfile?.role === "superadmin" ? "SUPERADMIN" : "ADMIN"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/explore")} className="p-2 text-gray-500 hover:text-white">
              <ArrowLeft size={16} />
            </button>
            <button onClick={handleLogout} className="p-2 text-red-400 text-xs hover:text-red-300">
              Logout
            </button>
          </div>
        </div>

        {/* Tabs mobile */}
        <div className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-white/5 bg-[#0a0a0a] scrollbar-hide">
          {availableTabs.map((tab) => {
            const badge = getBadge(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all relative ${
                  activeTab === tab.id
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-gray-500"
                }`}
              >
                <tab.icon size={10} /> {tab.label}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toast */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 right-4 z-50"
            >
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-xl text-sm font-bold ${
                msg.type === "success"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {msg.type === "success" ? <CheckCircle size={16} /> : <X size={16} />}
                {msg.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {renderTab()}

          {/* Onglet non autorisé */}
          {!availableTabs.some((t) => t.id === activeTab) && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle size={64} className="text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Accès non autorisé</h3>
              <p className="text-gray-400 text-sm mb-4">
                Vous n'avez pas les permissions pour accéder à cet onglet.
              </p>
              <button
                onClick={() => setActiveTab(availableTabs[0]?.id || "dashboard")}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all"
              >
                Retour à l'accueil
              </button>
            </div>
          )}

          {/* Aucun onglet */}
          {availableTabs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle size={64} className="text-red-500 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Aucun accès</h3>
              <p className="text-gray-400 text-sm mb-4">
                Vous n'avez aucune permission pour accéder aux onglets.
              </p>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}