// app/investigations/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  FolderLock,
  Search,
  Users,
  Trash2,
  Copy,
  Check,
  Play,
  UserPlus,
  X,
  Loader2,
  AlertTriangle,
  Fingerprint,
  User,
  Clock,
  CreditCard,
  ShieldCheck, Trophy
} from "lucide-react";
import { User as UserIcon } from "lucide-react";
import PaywallModal from "@/components/PaywallModal";
import FeedbackWidget from "@/components/FeedbackWidget";


// --- LOGO LUKENI (CAURIS DORÉ) ---
const CaurisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
    <path
      d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const MaskLeftIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 140"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M50 10 C20 10 10 40 10 70 C10 110 35 130 50 130 C65 130 90 110 90 70 C90 40 80 10 50 10 Z" />
    <path d="M25 60 C35 55 45 60 45 60" />
    <path d="M75 60 C65 55 55 60 55 60" />
    <line x1="50" y1="30" x2="50" y2="85" />
    <path d="M40 100 C45 105 55 105 60 100" />
    <circle cx="50" cy="20" r="3" fill="currentColor" />
  </svg>
);

const MaskRightIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 140"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M50 5 L15 35 L15 90 L50 135 L85 90 L85 35 Z" />
    <path d="M25 50 Q35 45 45 55" />
    <path d="M75 50 Q65 45 55 55" />
    <path d="M50 55 L45 85 L55 85 Z" />
    <circle cx="50" cy="105" r="6" />
  </svg>
);

const CRTScanlines = () => (
  <div className="absolute inset-0 pointer-events-none z-20 opacity-20 mix-blend-overlay">
    <svg width="100%" height="100%">
      <defs>
        <pattern
          id="scanlines"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
        >
          <rect width="4" height="2" fill="#000" opacity="0.5" />
          <rect y="2" width="4" height="2" fill="#fff" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#scanlines)" />
    </svg>
  </div>
);

const getAdminFilterClass = (filterType: string) => {
  switch (filterType) {
    case "sepia":
      return "sepia saturate-[1.5] contrast-[1.1]";
    case "grayscale":
      return "grayscale contrast-[1.1]";
    case "invert":
      return "invert";
    case "blur":
      return "blur-[2px]";
    default:
      return "";
  }
};

// ── Générateur de code de groupe ──
const generateGroupCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `LUKENI-${code}`;
};

// ── Types d'accès ──
interface AccessInfo {
  isFree: boolean;
  priceEur?: number;
  priceCfa?: number;
  hasFullAccess: boolean;
  trialStatus: "none" | "active" | "expired";
  trialTimeRemaining: number;
}

export default function InvestigationsHub() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [boardNodes, setBoardNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userSessions, setUserSessions] = useState<Record<string, any>>({});
  const [userRanks, setUserRanks] = useState<Record<string, any>>({});

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [dailyChallenge, setDailyChallenge] = useState<any | null>(null);

  const [trialConfigDuration, setTrialConfigDuration] = useState(30);
  const [accessMap, setAccessMap] = useState<Record<string, AccessInfo>>({});

  const [pricingData, setPricingData] = useState<any[]>([]);
  const [buyModal, setBuyModal] = useState<{
    invId: string;
    invTitle: string;
    pricing: any;
  } | null>(null);





  // ✅ NOUVEAU : Pour rafraîchir les données trial
  const [trialRefreshKey, setTrialRefreshKey] = useState(0);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);


  // ✅ Détecter le retour après paiement FedaPay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get('payment_success');
    const productType = params.get('product_type');

    if (paymentSuccess && productType === 'investigation') {
      console.log('✅ [LISTE] Paiement détecté, rafraîchissement des accès...');

      // Nettoyer l'URL
      window.history.replaceState({}, '', '/investigations');

      // Rafraîchir les données d'accès
      refreshAccessData();

      // Rediriger vers le jeu après 1.5 secondes
      setTimeout(() => {
        console.log('🚀 [LISTE] Redirection vers le jeu...');
        router.push(`/investigations/${paymentSuccess}`);
      }, 1500);
    }


    if (paymentSuccess && productType === 'investigation') {
      console.log('✅ [LISTE] Paiement détecté, rafraîchissement des accès...');

      // Afficher un message de succès
      setPaymentSuccessMessage(
        lang === 'fr'
          ? '✅ Paiement réussi ! Redirection vers le jeu...'
          : '✅ Payment successful! Redirecting to the game...'
      );

      // Nettoyer l'URL
      window.history.replaceState({}, '', '/investigations');

      // Rafraîchir les données d'accès
      refreshAccessData();

      // Rediriger vers le jeu après 2 secondes
      setTimeout(() => {
        console.log('🚀 [LISTE] Redirection vers le jeu...');
        router.push(`/investigations/${paymentSuccess}`);
      }, 2000);
    }
  }, []);


  // ✅ Fonction pour rafraîchir les données d'accès après paiement
  // ✅ Fonction pour rafraîchir les données d'accès après paiement
  const refreshAccessData = useCallback(async () => {
    if (!userId) return;

    const { data: userAccess } = await supabase
      .from('user_access')
      .select('target_id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (userAccess) {
      setAccessMap(prev => {
        const updated = { ...prev };
        userAccess.forEach(access => {
          if (updated[access.target_id]) {
            updated[access.target_id] = {
              ...updated[access.target_id],
              hasFullAccess: true,
            };
          }
        });
        return updated;
      });
    }
  }, [userId]);


  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_ranks')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        const map: Record<string, any> = {};
        (data || []).forEach(r => { map[r.investigation_id] = r; });
        setUserRanks(map);
      });
  }, [userId]);


  // ✅ Charger le classement global (grades) + les amis
  useEffect(() => {
    if (!userId) return;
    // Amis
    supabase
      .from("user_friends")
      .select("friend_id")
      .eq("user_id", userId)
      .then(({ data }) => setFriendIds((data || []).map((f: any) => f.friend_id)));
    // Classement : tous les user_ranks avec profils
    supabase
      .from("user_ranks")
      .select("*, profiles:profiles(full_name, username, avatar_url)")
      .order("score_percent", { ascending: false })
      .limit(50)
      .then(({ data }) => setLeaderboard(data || []));
  }, [userId]);


  // ✅ Charger le défi du jour
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("daily_challenge")
      .select("*")
      .eq("challenge_date", today)
      .maybeSingle()
      .then(({ data }) => setDailyChallenge(data || null));
  }, []);

  const refreshTrialData = useCallback(async () => {
    if (!userId || !investigations.length) return;

    const invIds = investigations.map((i: any) => i.id);
    const { data: trialData } = await supabase
      .from('trial_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('target_id', invIds);

    // Mettre à jour l'accessMap avec les nouvelles données
    setAccessMap(prev => {
      const updated = { ...prev };
      for (const inv of investigations) {
        // ✅ Récupérer pricing pour cette investigation
        const pricing = pricingData.find((p: any) => p.product_id === inv.id && p.product_type === "investigation");

        // ✅ Prendre le trial le plus RÉCENT
        const invTrials = (trialData || [])
          .filter((t: any) => t.target_id === inv.id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const trial = invTrials[0];

        // ✅ Calculer le trial UNIQUEMENT si enquête payante
        if (pricing && trial && trial.status === 'active') {
          const expiredAt = new Date(trial.expired_at).getTime();
          const now = Date.now();
          const remainingMs = expiredAt - now;
          if (remainingMs > 0) {
            const remainingMinutes = Math.max(0, Math.floor(remainingMs / 1000 / 60));
            updated[inv.id] = {
              ...updated[inv.id],
              trialStatus: 'active',
              trialTimeRemaining: remainingMinutes,
            };
            console.log(`⏰ [LISTE] Trial ${inv.id}: ${remainingMinutes} min restantes`);
          } else {
            updated[inv.id] = {
              ...updated[inv.id],
              trialStatus: 'expired',
              trialTimeRemaining: 0,
            };
          }
        }
      }
      return updated;
    });
  }, [userId, investigations, pricingData]);

  // ✅ NOUVEAU : Écouter le focus de la page pour rafraîchir
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTrialRefreshKey(prev => prev + 1);
        refreshTrialData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ✅ RAFRAÎCHIR AUTOMATIQUEMENT TOUTES LES 30 SECONDES
    const interval = setInterval(() => {
      setTrialRefreshKey(prev => prev + 1);
      refreshTrialData();
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refreshTrialData]);

  // Modal groupe
  const [groupModal, setGroupModal] = useState<{
    invId: string;
    invTitle: string;
    groupCode: string;
    groupId: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState<string | null>(null);
  const [isDisablingGroup, setIsDisablingGroup] = useState(false);

  // Modal suppression
  const [deleteModal, setDeleteModal] = useState<{
    invId: string;
    invTitle: string;
    sessionId: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("lukeni_lang");
    if (storedLang) setLang(storedLang.replace(/"/g, "") as "fr" | "en");

    async function load() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const currentUserId = authSession?.user?.id || null;
      setUserId(currentUserId);

      let profileData: any = null;
      if (currentUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .single();
        if (profile) {
          profileData = profile;
          setUserProfile(profile);
        }
      }

      // ✅ DÉCLARER invIds AVANT LE Promise.all
      const invRes = await supabase.from("investigations").select("*").order("created_at", { ascending: false });
      const invIds = invRes.data?.map((i: any) => i.id) || [];

      const [boardRes, trialConfigRes, trialRes] = await Promise.all([
        supabase.from("investigation_board").select("*"),
        supabase.from('trial_config').select('trial_duration_minutes').eq('id', 1).maybeSingle(),
        supabase.from('trial_sessions').select('*').eq('user_id', currentUserId).in('target_id', invIds),
      ]);

      if (trialConfigRes.data) {
        setTrialConfigDuration(trialConfigRes.data.trial_duration_minutes || 30);
      }

      if (invRes.data) setInvestigations(invRes.data);
      if (boardRes.data) setBoardNodes(boardRes.data);

      if (currentUserId && invRes.data) {
        const invIds = invRes.data.map((i: any) => i.id);

        const [sessionsRes, pricingRes, userAccessRes, adminGrantsRes, trialRes] = await Promise.all([
          supabase.from("investigation_sessions").select("*").eq("user_id", currentUserId).in("investigation_id", invIds),
          supabase.from("product_pricing").select("*").in("product_id", invIds),
          supabase.from("user_access").select("target_id").eq("user_id", currentUserId).eq("status", "completed"),
          supabase.from("admin_user_access_grants").select("access_scope, target_ids, access_type").eq("user_id", currentUserId),
          supabase.from("trial_sessions").select("*").eq("user_id", currentUserId).in("target_id", invIds),
        ]);

        const sessions = sessionsRes.data || [];
        const pricingData = pricingRes.data || [];
        setPricingData(pricingData);
        const userAccessData = userAccessRes.data || [];
        const adminGrants = adminGrantsRes.data || [];
        const trialData = trialRes.data || [];

        const map: Record<string, AccessInfo> = {};
        for (const inv of invRes.data) {
          // ✅ Déclarer pricing AU DÉBUT de la boucle
          const pricing = pricingData.find((p) => p.product_id === inv.id && p.product_type === "investigation");
          const isFree = !pricing;

          // ✅ Prendre le trial le plus RÉCENT (pas le premier)
          const invTrials = trialData
            .filter((t) => t.target_id === inv.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const trial = invTrials[0];

          if (invTrials.length > 1) {
            console.log(`⚠️ [LISTE] Plusieurs trials pour ${inv.id}, on prend le plus récent`);
          }

          const hasBought = userAccessData.some((a) => a.target_id === inv.id);
          const hasGrant = adminGrants.some(
            (g) => g.access_type === "investigation" && (g.access_scope === "all" || (g.target_ids && g.target_ids.includes(inv.id)))
          );
          const hasFullAccess = hasBought || hasGrant;

          // ✅ Calculer le trial UNIQUEMENT si enquête payante
          let trialStatus: "none" | "active" | "expired" = "none";
          let trialTimeRemaining = 0;

          if (pricing && trial && trial.status === 'active') {
            const expiredAt = new Date(trial.expired_at).getTime();
            const now = Date.now();
            const remainingMs = expiredAt - now;
            if (remainingMs > 0) {
              trialStatus = "active";
              trialTimeRemaining = Math.max(0, Math.floor(remainingMs / 1000 / 60));
              console.log(`⏰ [LISTE] Trial ${inv.id}: ${trialTimeRemaining} min restantes`);
            } else {
              trialStatus = "expired";
            }
          } else if (pricing && trial && trial.status === 'expired') {
            trialStatus = "expired";
          }

          map[inv.id] = {
            isFree,
            priceEur: pricing?.price_eur,
            priceCfa: pricing?.price_xof_cfa,
            hasFullAccess,
            trialStatus,
            trialTimeRemaining,
          };
        }
        setAccessMap(map);

        if (sessions) {
          const sessionsMap: Record<string, any> = {};
          sessions.forEach((s: any) => {
            sessionsMap[s.investigation_id] = s;
          });
          setUserSessions(sessionsMap);

          if (profileData) {
            const activeSessionCauris = sessions
              .filter((s: any) => s.status === "active")
              .reduce((sum: number, s: any) => sum + (s.current_cauris || 0), 0);
            const totalCauris = (profileData.cauris || 0) + activeSessionCauris;
            setUserProfile({ ...profileData, cauris: totalCauris });
          }
        }
      }

      setIsLoading(false);
    }
    load();
  }, []);

  const handleCreateGroup = async (inv: any) => {
    if (!userId) return;
    setIsCreatingGroup(inv.id);

    try {
      const existingSession = userSessions[inv.id];
      if (existingSession?.group_code && existingSession?.group_id) {
        setGroupModal({
          invId: inv.id,
          invTitle: lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr,
          groupCode: existingSession.group_code,
          groupId: existingSession.group_id,
        });
        setIsCreatingGroup(null);
        return;
      }

      const newGroupCode = generateGroupCode();
      const newGroupId = crypto.randomUUID();

      const { error: groupErr } = await supabase
        .from("investigation_groups")
        .insert({
          id: newGroupId,
          investigation_id: inv.id,
          created_by: userId,
          invite_code: newGroupCode,
          status: "waiting",
        });

      if (groupErr) throw groupErr;

      if (existingSession) {
        await supabase
          .from("investigation_sessions")
          .update({ group_code: newGroupCode, group_id: newGroupId, is_group_creator: true })
          .eq("id", existingSession.id);
      } else {
        await supabase.from("investigation_sessions").insert({
          investigation_id: inv.id,
          user_id: userId,
          group_code: newGroupCode,
          group_id: newGroupId,
          is_group_creator: true,
          status: "active",
          solved_enigmas: [],
          collected_evidences: [],
        });
      }

      setUserSessions((prev) => ({
        ...prev,
        [inv.id]: { ...(prev[inv.id] || {}), group_code: newGroupCode, group_id: newGroupId, is_group_creator: true },
      }));

      setGroupModal({
        invId: inv.id,
        invTitle: lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr,
        groupCode: newGroupCode,
        groupId: newGroupId,
      });
    } catch (err) {
      console.error("Create group error:", err);
    } finally {
      setIsCreatingGroup(null);
    }
  };

  const handleDisableGroup = async () => {
    if (!groupModal || !userId) return;
    setIsDisablingGroup(true);

    try {
      const session = userSessions[groupModal.invId];
      if (!session) return;

      await supabase
        .from("investigation_sessions")
        .update({ group_id: null, group_code: null, is_group_creator: false })
        .eq("id", session.id);

      setUserSessions((prev) => ({
        ...prev,
        [groupModal.invId]: { ...prev[groupModal.invId], group_id: null, group_code: null, is_group_creator: false },
      }));

      setGroupModal(null);
    } catch (err) {
      console.error("Disable group error:", err);
    } finally {
      setIsDisablingGroup(false);
    }
  };

  const handleCopyLink = () => {
    if (!groupModal) return;
    const url = `${window.location.origin}/investigations/${groupModal.invId}?code=${groupModal.groupCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDeleteSession = async () => {
    if (!deleteModal || !userId) return;
    setIsDeleting(true);

    try {
      await supabase.from("investigation_sessions").delete().eq("id", deleteModal.sessionId);

      // ✅ Réinitialiser le tutoriel pour cette investigation
      localStorage.removeItem(`lukeni_tutorial_done_${deleteModal.invId}`);

      setUserSessions((prev) => {
        const next = { ...prev };
        delete next[deleteModal.invId];
        return next;
      });
      setDeleteModal(null);
    } catch (err) {
      console.error("Delete session error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTrialTime = (minutes: number): string => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m.toString().padStart(2, "0")}`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121110] flex flex-col items-center justify-center font-mono text-[#D4AF37]">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <CaurisIcon className="w-12 h-12 mb-4 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
        </motion.div>
        <p className="text-[10px] tracking-widest uppercase">
          {lang === "fr" ? "Enquêtes Historiques" : "Historical Investigations"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161514] text-[#E0Dcd3] font-sans selection:bg-[#D4AF37] selection:text-black pb-20 overflow-x-hidden w-full relative">
      {/* Masques en arrière-plan */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <MaskLeftIcon className="absolute -left-20 top-32 w-96 h-96 text-white opacity-[0.02] -rotate-12" />
        <MaskRightIcon className="absolute -right-32 top-1/2 w-[500px] h-[500px] text-white opacity-[0.02] rotate-12" />
        <MaskLeftIcon className="absolute left-1/3 bottom-10 w-64 h-64 text-[#D4AF37] opacity-[0.03] rotate-45" />
      </div>

      <nav className="relative z-10 border-b border-black/50 bg-[#1A1817] shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          <Link href="/explore" className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors text-xs font-mono tracking-widest">
            <ChevronLeft size={16} />
            <span>{lang === "fr" ? "RETOUR" : "BACK"}</span>
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
            <p className="font-serif tracking-[0.2em] text-sm text-[#D4AF37] uppercase font-bold">Lukeni</p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <p className="hidden sm:block font-mono text-[10px] sm:text-xs tracking-widest text-gray-400 uppercase">
              {lang === "fr" ? "Enquêtes Historiques" : "Historical Investigations"}
            </p>

            {userId && userProfile && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-[#D4AF37]/30 rounded-full">
                <CaurisIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-mono text-xs font-bold text-[#D4AF37]">{userProfile?.cauris ?? 0}</span>
              </div>
            )}

            {userId && (
              <Link
                href="/profil"
                title={lang === "fr" ? "Voir mon profil" : "View my profile"}
                className="w-8 h-8 rounded-full overflow-hidden border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all hover:shadow-[0_0_10px_rgba(212,175,55,0.3)] flex-shrink-0 bg-gray-800 flex items-center justify-center"
              >
                {userProfile?.avatar_url && userProfile.avatar_url.startsWith("http") ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <User size={14} className="text-gray-400" />
                )}
              </Link>



            )}


            {/* 🏆 BOUTON CLASSEMENT */}
            {userId && (
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-[#D4AF37]/40 rounded-full text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors text-xs font-mono font-bold"
              >
                <Trophy size={14} /> {lang === "fr" ? "Classement" : "Ranking"}
              </button>
            )}
          </div>
        </div>
      </nav>


      {/* 🌟 DÉFI DU JOUR */}
      {dailyChallenge && (
        <section className="max-w-6xl mx-auto px-4 mt-6 relative z-10 w-full">
          <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/40 rounded-2xl p-4 flex items-center gap-4">
            <span className="text-3xl">🌟</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#D4AF37] font-mono uppercase tracking-widest">
                {lang === "fr" ? "Défi du jour" : "Daily challenge"}
              </h3>
              <p className="text-xs text-gray-300">
                {lang === "fr" ? dailyChallenge.title_fr : dailyChallenge.title_en || dailyChallenge.title_fr}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#D4AF37] font-mono font-bold flex items-center gap-1">
                <CaurisIcon className="w-3.5 h-3.5" /> +{dailyChallenge.reward_cauris || 50}
              </span>
              {dailyChallenge.scene_id && (
                <Link
                  href={`/investigations/${dailyChallenge.investigation_id}`}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-white text-black rounded-lg text-xs font-bold font-mono"
                >
                  {lang === "fr" ? "Jouer" : "Play"}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}



      {/* 🏆 CLASSEMENT */}
      {showLeaderboard && (
        <section className="max-w-6xl mx-auto px-4 mt-6 mb-4 relative z-10 w-full">
          <div className="bg-[#1E1C1A] border border-[#D4AF37]/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#D4AF37] flex items-center gap-2">
                <Trophy size={16} /> {lang === "fr" ? "Classement des enquêteurs" : "Investigator ranking"}
              </h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8 font-mono">
                {lang === "fr" ? "Aucun grade pour l'instant. Terminez une enquête !" : "No ranks yet. Finish an investigation!"}
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const profile = entry.profiles;
                  const isFriend = friendIds.includes(entry.user_id);
                  const isMe = entry.user_id === userId;
                  return (
                    <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? "bg-[#D4AF37]/10 border-[#D4AF37]/40" : isFriend ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10"}`}>
                      <span className="w-6 text-center font-mono font-bold text-[#D4AF37]">#{idx + 1}</span>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><User size={14} className="text-gray-400" /></div>
                      )}
                      <span className="flex-1 text-sm font-bold text-white truncate">
                        {isMe ? (lang === "fr" ? "Vous" : "You") : (profile?.full_name || profile?.username || "Joueur")}
                        {isFriend && <span className="ml-1 text-[9px] text-blue-400 font-mono">• {lang === "fr" ? "Ami" : "Friend"}</span>}
                      </span>
                      {entry.icon_url && <img src={entry.icon_url} alt="" className="w-6 h-6 rounded" />}
                      <span className="font-mono text-[#D4AF37] font-bold text-xs">{entry.score_percent}%</span>
                      <span className="text-xs text-gray-400 hidden sm:inline">{lang === "fr" ? entry.rank_title_fr : entry.rank_title_en}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TERMINAL D'ARCHIVES */}
      <section className="max-w-6xl mx-auto px-4 mt-12 mb-16 relative z-10 w-full">
        <div className="relative w-full bg-[#201E1D] p-4 md:px-16 md:py-8 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(255,255,255,0.05)] border border-[#2A2726]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center justify-center text-[#4A4542] opacity-80 pointer-events-none">
            <MaskLeftIcon className="w-10 h-16" />
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center justify-center text-[#4A4542] opacity-80 pointer-events-none">
            <MaskRightIcon className="w-10 h-16" />
          </div>

          <div className="absolute top-4 left-4 md:left-16 flex items-center gap-3 z-10">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-mono text-[9px] text-gray-500 tracking-widest">REC / MEMORY_BANK</span>
          </div>
          <div className="absolute top-4 right-4 md:right-16 font-mono text-[9px] text-gray-500 tracking-widest z-10">kindoki 2080</div>

          <div className="relative w-full h-[450px] md:h-[550px] bg-[#0A0D0F] rounded-lg overflow-hidden border-4 border-[#111] shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] mt-6">
            <CRTScanlines />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none z-30" />

            <motion.div drag dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }} className="relative w-[3000px] h-[3000px] cursor-grab active:cursor-grabbing">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {boardNodes.map((node) =>
                  node.linked_to?.map((targetId: string) => {
                    const target = boardNodes.find((n) => n.id === targetId);
                    if (!target) return null;
                    return (
                      <line
                        key={`${node.id}-${targetId}`}
                        x1={node.pos_x + 70}
                        y1={node.pos_y + 80}
                        x2={target.pos_x + 70}
                        y2={target.pos_y + 80}
                        stroke="#EF4444"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        className="opacity-70 drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]"
                      />
                    );
                  })
                )}
              </svg>

              {boardNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute z-10 w-[140px] bg-[#E8E6DF] p-2 pb-6 rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.6)] select-none border border-[#D0CDBF]"
                  style={{ left: node.pos_x, top: node.pos_y, rotate: `${node.rotation * 0.8}deg` }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] z-20">
                    <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="w-full h-[110px] bg-black overflow-hidden border border-black/10 relative">
                    <img src={node.image_url} alt="" className={`w-full h-full object-cover pointer-events-none ${getAdminFilterClass(node.filter_type)}`} />
                    <div className="absolute inset-0 bg-white/5 pointer-events-none mix-blend-overlay" />
                  </div>
                  <p className="text-[10px] text-black font-mono font-bold text-center mt-3 truncate tracking-widest uppercase opacity-80">{node.title}</p>
                </div>
              ))}
            </motion.div>

            <div className="absolute bottom-6 left-6 z-40 pointer-events-none">
              <h2 className="text-xl md:text-2xl font-serif text-[#00E5FF] uppercase tracking-wider font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                {lang === "fr" ? "Mémoire Matérielle" : "Material Memory"}
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* LISTE DES DOSSIERS */}
      <main className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="mb-8 flex items-center justify-center md:justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-4 text-gray-300">
            <MaskLeftIcon className="w-6 h-8 text-[#D4AF37] opacity-60" />
            <h2 className="text-xl font-serif uppercase tracking-widest">{lang === "fr" ? "Dossiers Classifiés" : "Classified Files"}</h2>
            <MaskRightIcon className="w-6 h-8 text-[#D4AF37] opacity-60 md:hidden" />
          </div>
          <div className="hidden md:block"><MaskRightIcon className="w-6 h-8 text-[#D4AF37] opacity-60" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investigations.map((inv) => {
            const userSession = userSessions[inv.id];
            const hasSession = !!userSession;
            const hasActiveGroup = hasSession && !!userSession.group_code;
            const invTitle = lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr;
            const access = accessMap[inv.id] || { isFree: true, hasFullAccess: false, trialStatus: "none", trialTimeRemaining: 0 };
            const isFree = access.isFree;
            const hasFullAccess = access.hasFullAccess;
            const trialStatus = access.trialStatus;
            const trialTimeRemaining = access.trialTimeRemaining;
            const priceEur = access.priceEur;

            return (
              <div key={inv.id} className="group relative bg-[#1E1C1A] border border-white/5 hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col shadow-xl rounded-b-md rounded-tr-md">
                <div className="absolute -top-[18px] left-[-1px] bg-[#1E1C1A] border-t border-l border-r border-white/5 px-4 py-0.5 rounded-t-md text-[9px] font-mono text-gray-500 group-hover:border-[#D4AF37]/50 group-hover:text-[#D4AF37] transition-colors flex items-center gap-2">
                  ID: {inv.id.slice(0, 6).toUpperCase()}
                  {hasFullAccess && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[8px] font-bold flex items-center gap-1">
                      <ShieldCheck size={8} /> {lang === "fr" ? "PREMIUM" : "PREMIUM"}
                    </span>
                  )}
                  {hasSession && !hasFullAccess && (
                    <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[8px] font-bold">
                      {lang === "fr" ? "En cours" : "In progress"}
                    </span>
                  )}
                  {hasActiveGroup && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[8px] font-bold flex items-center gap-1">
                      <Users size={8} /> {lang === "fr" ? "Groupe" : "Group"}
                    </span>
                  )}
                </div>

                <div className="h-40 relative overflow-hidden bg-[#0A0A0A]">
                  <img src={inv.cover_url || "https://images.unsplash.com/photo-1614036417651-1d4b6dbbc608?w=800&q=80"} alt="" className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                  {hasFullAccess && (
                    <div className="absolute top-2 right-2 bg-[#D4AF37] text-black px-2 py-1 rounded text-[9px] font-bold font-mono flex items-center gap-1 shadow-lg">
                      <ShieldCheck size={10} /> {lang === "fr" ? "ACCÈS ILLIMITÉ" : "UNLIMITED"}
                    </div>
                  )}


                  {userRanks[inv.id] && (
                    <div className="absolute top-2 left-2 bg-black/80 border border-[#D4AF37]/40 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 shadow-lg">
                      {userRanks[inv.id].icon_url
                        ? <img src={userRanks[inv.id].icon_url} alt="" className="w-3.5 h-3.5 rounded" />
                        : <span>🏆</span>}
                      <span className="text-[#D4AF37]">
                        {lang === "fr" ? userRanks[inv.id].rank_title_fr : userRanks[inv.id].rank_title_en}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col border-t border-black/50">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <Search size={12} />
                      <span>{lang === "fr" ? "ENQUÊTE" : "INVESTIGATION"}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-[#D4AF37] font-mono font-bold">
                      <CaurisIcon className="w-3.5 h-3.5" /> {inv.reward_cauris || 0}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold mb-2 text-white group-hover:text-[#D4AF37] transition-colors tracking-wide leading-tight">{invTitle}</h3>
                  <p className="text-xs text-gray-400 line-clamp-3 mb-4 flex-1 font-sans leading-relaxed">
                    {lang === "fr" ? inv.description_fr : inv.description_en || inv.description_fr}
                  </p>

                  <div className="space-y-2">
                    {/* ÉTAT 1 : ACCÈS COMPLET */}
                    {hasFullAccess && (
                      <Link href={`/investigations/${inv.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#D4AF37] hover:bg-white border border-[#D4AF37] text-center text-xs font-bold tracking-[0.2em] font-mono text-black transition-all duration-300 rounded shadow-sm">
                        <ShieldCheck size={12} /> {lang === "fr" ? "ACCÈS ILLIMITÉ" : "UNLIMITED ACCESS"}
                      </Link>
                    )}

                    {/* ÉTAT 2 : GRATUIT */}
                    {!hasFullAccess && isFree && (
                      <Link href={`/investigations/${inv.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2A2726] hover:bg-[#D4AF37] border border-white/10 hover:border-[#D4AF37] text-center text-xs font-bold tracking-[0.2em] font-mono text-gray-300 hover:text-black transition-all duration-300 rounded shadow-sm">
                        <Play size={12} /> {hasSession ? (lang === "fr" ? "REPRENDRE" : "RESUME") : (lang === "fr" ? "JOUER" : "PLAY")}
                      </Link>
                    )}
                    {/* ÉTAT 3 : ESSAI EN COURS */}
                    {!hasFullAccess && !isFree && trialStatus === "active" && trialTimeRemaining > 0 && (
                      <>
                        <Link href={`/investigations/${inv.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-center text-xs font-bold tracking-wider font-mono transition-all duration-300 rounded">
                          <Play size={12} className="text-blue-400" /> {lang === "fr" ? `CONTINUER (${formatTrialTime(trialTimeRemaining)})` : `CONTINUE (${formatTrialTime(trialTimeRemaining)})`}
                        </Link>
                        <button
                          onClick={() => {
                            const pricing = pricingData.find((p: any) => p.product_id === inv.id && p.product_type === "investigation");
                            if (pricing) {
                              setBuyModal({
                                invId: inv.id,
                                invTitle: lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr,
                                pricing,
                              });
                            }
                          }}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-[#2A2726] hover:bg-[#D4AF37] border border-white/10 hover:border-[#D4AF37] text-center text-[10px] font-bold tracking-wider font-mono text-gray-500 hover:text-black transition-all duration-300 rounded"
                        >
                          <CreditCard size={10} /> {lang === "fr" ? `ACHETER (${priceEur?.toFixed(2)} €)` : `BUY (${priceEur?.toFixed(2)} €)`}
                        </button>
                      </>
                    )}

                    {/* ÉTAT 4 : ESSAI EXPIRÉ */}
                    {!hasFullAccess && !isFree && trialStatus === "expired" && (
                      <>
                        <button
                          onClick={() => {
                            const pricing = pricingData.find((p: any) => p.product_id === inv.id && p.product_type === "investigation");
                            if (pricing) {
                              setBuyModal({
                                invId: inv.id,
                                invTitle: lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr,
                                pricing,
                              });
                            }
                          }}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#D4AF37] hover:bg-white border border-[#D4AF37] text-center text-xs font-bold tracking-[0.2em] font-mono text-black transition-all duration-300 rounded shadow-sm"
                        >
                          <CreditCard size={12} /> {lang === "fr" ? `ACHETER L'ACCÈS (${priceEur?.toFixed(2)} €)` : `BUY ACCESS (${priceEur?.toFixed(2)} €)`}
                        </button>
                        <p className="text-[10px] text-gray-600 text-center font-mono flex items-center justify-center gap-1">
                          <Clock size={10} className="text-red-400" /> {lang === "fr" ? "Essai expiré" : "Trial expired"}
                        </p>
                      </>
                    )}

                    {/* ÉTAT 5 : PAYANT, AUCUN ESSAI */}
                    {!hasFullAccess && !isFree && trialStatus === "none" && (
                      <>
                        <Link href={`/investigations/${inv.id}?autoStartTrial=true`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-center text-xs font-bold tracking-wider font-mono transition-all duration-300 rounded">
                          <Clock size={12} /> {lang === "fr" ? `ESSAI GRATUIT (${trialConfigDuration} min)` : `FREE TRIAL (${trialConfigDuration} min)`}
                        </Link>
                        <button
                          onClick={() => {
                            const pricing = pricingData.find((p: any) => p.product_id === inv.id && p.product_type === "investigation");
                            if (pricing) {
                              setBuyModal({
                                invId: inv.id,
                                invTitle: lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr,
                                pricing,
                              });
                            }
                          }}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-transparent hover:bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:border-[#D4AF37] text-center text-[10px] font-bold tracking-wider font-mono text-[#D4AF37] transition-all duration-300 rounded"
                        >
                          <CreditCard size={10} /> {lang === "fr" ? `ACHETER (${priceEur?.toFixed(2)} €)` : `BUY (${priceEur?.toFixed(2)} €)`}
                        </button>
                      </>
                    )}

                    {/* Boutons secondaires */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleCreateGroup(inv)} disabled={isCreatingGroup === inv.id} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 text-[10px] font-bold font-mono tracking-wider rounded transition-all">
                        {isCreatingGroup === inv.id ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                        {hasActiveGroup ? (lang === "fr" ? "GROUPE" : "GROUP") : (lang === "fr" ? "INVITER" : "INVITE")}
                      </button>
                      {hasSession && (
                        <button onClick={() => setDeleteModal({ invId: inv.id, invTitle, sessionId: userSession.id })} className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-[10px] font-bold font-mono rounded transition-all" title={lang === "fr" ? "Supprimer ma partie" : "Delete my game"}>
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {investigations.length === 0 && (
          <div className="text-center py-20 bg-[#1E1C1A] border border-dashed border-white/10 rounded-md relative overflow-hidden">
            <MaskRightIcon className="mx-auto text-gray-700 mb-4 w-12 h-16 opacity-50" />
            <p className="text-xs text-gray-400 font-mono tracking-widest uppercase relative z-10">
              {lang === "fr" ? "Le tiroir des mystères est vide" : "The mystery drawer is empty"}
            </p>
          </div>
        )}
      </main>

      {/* MODAL GROUPE */}
      <AnimatePresence>
        {groupModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setGroupModal(null)}>
            <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-[#111] border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-purple-500/10 px-5 py-4 flex items-center justify-between border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  <span className="font-bold text-white text-sm">{lang === "fr" ? "Jouer en Groupe" : "Play in Group"}</span>
                </div>
                <button onClick={() => setGroupModal(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-gray-400 text-xs font-mono">{lang === "fr" ? "Enquête :" : "Investigation:"} <span className="text-white font-bold">{groupModal.invTitle}</span></p>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{lang === "fr" ? "Code de la partie" : "Game code"}</p>
                  <div className="flex items-center gap-3 p-4 bg-black/50 border border-purple-500/20 rounded-xl">
                    <span className="font-mono font-black text-2xl text-purple-300 tracking-[0.2em] flex-1 text-center">{groupModal.groupCode}</span>
                  </div>
                </div>
                <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-bold transition-all">
                  {isCopied ? (<><Check size={14} className="text-green-400" /><span className="text-green-400">{lang === "fr" ? "Lien copié !" : "Link copied!"}</span></>) : (<><Copy size={14} />{lang === "fr" ? "Copier le lien d'invitation" : "Copy invitation link"}</>)}
                </button>
                <p className="text-[10px] text-gray-600 text-center">{lang === "fr" ? "Vos coéquipiers devront taper ce code pour rejoindre la partie." : "Your teammates will need to type this code to join the game."}</p>
                <div className="flex gap-3 pt-2 border-t border-white/10">
                  <button onClick={handleDisableGroup} disabled={isDisablingGroup} className="flex-1 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    {isDisablingGroup ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} {lang === "fr" ? "Désactiver" : "Disable"}
                  </button>
                  <Link href={`/investigations/${groupModal.invId}`} className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-white text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Play size={12} /> {lang === "fr" ? "Jouer maintenant" : "Play now"}
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SUPPRESSION */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => !isDeleting && setDeleteModal(null)}>
            <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-[#111] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-red-500/10 px-5 py-4 flex items-center justify-between border-b border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="font-bold text-white text-sm">{lang === "fr" ? "Supprimer ma partie" : "Delete my game"}</span>
                </div>
                <button onClick={() => !isDeleting && setDeleteModal(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-gray-400 text-sm">{lang === "fr" ? "Vous allez supprimer votre progression pour :" : "You are about to delete your progress for:"}</p>
                <p className="text-white font-bold font-serif">{deleteModal.invTitle}</p>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-300 text-xs">{lang === "fr" ? "⚠️ Énigmes résolues, preuves collectées et Cauris gagnés seront perdus. Les autres joueurs de votre groupe ne seront pas affectés." : "⚠️ Solved enigmas, collected evidence and earned Cauris will be lost. Other players in your group will not be affected."}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDeleteModal(null)} disabled={isDeleting} className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50">{lang === "fr" ? "Annuler" : "Cancel"}</button>
                  <button onClick={handleDeleteSession} disabled={isDeleting} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {lang === "fr" ? "Supprimer" : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MODAL D'ACHAT */}
      {buyModal && (
        <PaywallModal
          isOpen={!!buyModal}
          onClose={() => setBuyModal(null)}
          productType="investigation"
          productId={buyModal.invId}
          productTitle={buyModal.invTitle}
          pricing={buyModal.pricing}
          lang={lang}
        />
      )}


      {/* ✅ MESSAGE DE SUCCÈS PAIEMENT */}
      <AnimatePresence>
        {paymentSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-green-500/90 text-white px-6 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-3"
          >
            <ShieldCheck size={20} />
            <span>{paymentSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 Widget Feedback */}
      <FeedbackWidget lang={lang} defaultSpace="investigations" />
    </div>


  );
}