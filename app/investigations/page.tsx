// app/investigations/page.tsx
"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { User as UserIcon } from "lucide-react";
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
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `LUKENI-${code}`;
};

export default function InvestigationsHub() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [boardNodes, setBoardNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Sessions utilisateur par investigation
  const [userSessions, setUserSessions] = useState<Record<string, any>>({});

  // Modal groupe (créateur)
  const [groupModal, setGroupModal] = useState<{
    invId: string;
    invTitle: string;
    groupCode: string;
    groupId: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState<string | null>(null);
  const [isDisablingGroup, setIsDisablingGroup] = useState(false);

  // Modal suppression partie
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
      // Récupérer l'utilisateur connecté
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const currentUserId = authSession?.user?.id || null;
      setUserId(currentUserId);

      // ✅ NOUVEAU : Récupérer le profil utilisateur
      let profileData: any = null;
      if (currentUserId) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUserId)
          .single();

        if (profile) {
          profileData = profile;
          setUserProfile(profile);
        }
      }

      const [invRes, boardRes] = await Promise.all([
        supabase
          .from("investigations")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("investigation_board").select("*"),
      ]);

      if (invRes.data) setInvestigations(invRes.data);
      if (boardRes.data) setBoardNodes(boardRes.data);

      // Charger les sessions de l'utilisateur
      if (currentUserId && invRes.data) {
        const invIds = invRes.data.map((i: any) => i.id);
        const { data: sessions } = await supabase
          .from("investigation_sessions")
          .select("*")
          .eq("user_id", currentUserId)
          .in("investigation_id", invIds);

        if (sessions) {
          const sessionsMap: Record<string, any> = {};
          sessions.forEach((s: any) => {
            sessionsMap[s.investigation_id] = s;
          });
          setUserSessions(sessionsMap);

          // ✅ Calculer les Cauris réels : profil + sessions actives
          if (profileData) {
            const activeSessionCauris = sessions
              .filter((s: any) => s.status === 'active')
              .reduce((sum: number, s: any) => sum + (s.current_cauris || 0), 0);

            const totalCauris = (profileData.cauris || 0) + activeSessionCauris;

            setUserProfile({
              ...profileData,
              cauris: totalCauris,
            });
          }
        }
      }

      setIsLoading(false);
    }
    load();
  }, []);

  // ── Créer un groupe ──
   // ── Créer un groupe ──
  const handleCreateGroup = async (inv: any) => {
    if (!userId) return;
    setIsCreatingGroup(inv.id);

    try {
      const existingSession = userSessions[inv.id];

      // Si un groupe est déjà actif, afficher directement le modal
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

      // 1️⃣ NOUVEAU : CRÉER LE GROUPE DANS LA BASE DE DONNÉES !
      const { error: groupErr } = await supabase
        .from("investigation_groups")
        .insert({
          id: newGroupId,
          investigation_id: inv.id,
          created_by: userId,
          invite_code: newGroupCode,
          status: "waiting", 
        });

      if (groupErr) {
        console.error("Erreur création groupe dans Supabase:", groupErr);
        throw groupErr;
      }

      // 2️⃣ Upsert la session avec le groupe
      if (existingSession) {
        await supabase
          .from("investigation_sessions")
          .update({
            group_code: newGroupCode,
            group_id: newGroupId,
            is_group_creator: true,
          })
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

      // Mettre à jour le state local
      setUserSessions((prev) => ({
        ...prev,
        [inv.id]: {
          ...(prev[inv.id] || {}),
          group_code: newGroupCode,
          group_id: newGroupId,
          is_group_creator: true,
        },
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

  // ── Désactiver le multijoueur ──
  const handleDisableGroup = async () => {
    if (!groupModal || !userId) return;
    setIsDisablingGroup(true);

    try {
      const session = userSessions[groupModal.invId];
      if (!session) return;

      await supabase
        .from("investigation_sessions")
        .update({
          group_id: null,
          group_code: null,
          is_group_creator: false,
        })
        .eq("id", session.id);

      setUserSessions((prev) => ({
        ...prev,
        [groupModal.invId]: {
          ...prev[groupModal.invId],
          group_id: null,
          group_code: null,
          is_group_creator: false,
        },
      }));

      setGroupModal(null);
    } catch (err) {
      console.error("Disable group error:", err);
    } finally {
      setIsDisablingGroup(false);
    }
  };

  // ── Copier le lien ──
  const handleCopyLink = () => {
    if (!groupModal) return;
    const url = `${window.location.origin}/investigations/${groupModal.invId}?code=${groupModal.groupCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // ── Supprimer la partie ──
  const handleDeleteSession = async () => {
    if (!deleteModal || !userId) return;
    setIsDeleting(true);

    try {
      await supabase
        .from("investigation_sessions")
        .delete()
        .eq("id", deleteModal.sessionId);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121110] flex flex-col items-center justify-center font-mono text-[#D4AF37]">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
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
          {/* GAUCHE : Retour */}
          <Link
            href="/explore"
            className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors text-xs font-mono tracking-widest"
          >
            <ChevronLeft size={16} />
            <span>{lang === "fr" ? "RETOUR" : "BACK"}</span>
          </Link>

          {/* CENTRE : Logo + Lukeni */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
            <p className="font-serif tracking-[0.2em] text-sm text-[#D4AF37] uppercase font-bold">
              Lukeni
            </p>
          </div>

          {/* DROITE : Titre section + Avatar cliquable */}
          {/* DROITE : Titre section + Cauris + Avatar cliquable */}
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="hidden sm:block font-mono text-[10px] sm:text-xs tracking-widest text-gray-400 uppercase">
              {lang === "fr"
                ? "Enquêtes Historiques"
                : "Historical Investigations"}
            </p>

            {/* ✅ SOLDE CAURIS */}
            {userId && userProfile && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-[#D4AF37]/30 rounded-full">
                <CaurisIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-mono text-xs font-bold text-[#D4AF37]">
                  {userProfile?.cauris ?? 0}
                </span>
              </div>
            )}

            {/* Avatar cliquable → Profil */}
            {userId && (
              <Link
                href="/profil"
                title={lang === "fr" ? "Voir mon profil" : "View my profile"}
                className="w-8 h-8 rounded-full overflow-hidden border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all hover:shadow-[0_0_10px_rgba(212,175,55,0.3)] flex-shrink-0 bg-gray-800 flex items-center justify-center"
              >
                {userProfile?.avatar_url &&
                  userProfile.avatar_url.startsWith("http") ? (
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Si l'image échoue à charger, afficher l'icône
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <User size={14} className="text-gray-400" />
                )}
              </Link>
            )}
          </div>
        </div>
      </nav>

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
            <span className="font-mono text-[9px] text-gray-500 tracking-widest">
              REC / MEMORY_BANK
            </span>
          </div>
          <div className="absolute top-4 right-4 md:right-16 font-mono text-[9px] text-gray-500 tracking-widest z-10">
            kindoki 2080
          </div>

          <div className="relative w-full h-[450px] md:h-[550px] bg-[#0A0D0F] rounded-lg overflow-hidden border-4 border-[#111] shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] mt-6">
            <CRTScanlines />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none z-30" />

            <motion.div
              drag
              dragConstraints={{
                left: -1000,
                right: 1000,
                top: -1000,
                bottom: 1000,
              }}
              className="relative w-[3000px] h-[3000px] cursor-grab active:cursor-grabbing"
            >
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
                  }),
                )}
              </svg>

              {boardNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute z-10 w-[140px] bg-[#E8E6DF] p-2 pb-6 rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.6)] select-none border border-[#D0CDBF]"
                  style={{
                    left: node.pos_x,
                    top: node.pos_y,
                    rotate: `${node.rotation * 0.8}deg`,
                  }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] z-20">
                    <CaurisIcon className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="w-full h-[110px] bg-black overflow-hidden border border-black/10 relative">
                    <img
                      src={node.image_url}
                      alt=""
                      className={`w-full h-full object-cover pointer-events-none ${getAdminFilterClass(node.filter_type)}`}
                    />
                    <div className="absolute inset-0 bg-white/5 pointer-events-none mix-blend-overlay" />
                  </div>
                  <p className="text-[10px] text-black font-mono font-bold text-center mt-3 truncate tracking-widest uppercase opacity-80">
                    {node.title}
                  </p>
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
            <h2 className="text-xl font-serif uppercase tracking-widest">
              {lang === "fr" ? "Dossiers Classifiés" : "Classified Files"}
            </h2>
            <MaskRightIcon className="w-6 h-8 text-[#D4AF37] opacity-60 md:hidden" />
          </div>
          <div className="hidden md:block">
            <MaskRightIcon className="w-6 h-8 text-[#D4AF37] opacity-60" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investigations.map((inv) => {
            const userSession = userSessions[inv.id];
            const hasSession = !!userSession;
            const hasActiveGroup = hasSession && !!userSession.group_code;
            const invTitle =
              lang === "fr" ? inv.title_fr : inv.title_en || inv.title_fr;

            return (
              <div
                key={inv.id}
                className="group relative bg-[#1E1C1A] border border-white/5 hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col shadow-xl rounded-b-md rounded-tr-md"
              >
                <div className="absolute -top-[18px] left-[-1px] bg-[#1E1C1A] border-t border-l border-r border-white/5 px-4 py-0.5 rounded-t-md text-[9px] font-mono text-gray-500 group-hover:border-[#D4AF37]/50 group-hover:text-[#D4AF37] transition-colors flex items-center gap-2">
                  ID: {inv.id.slice(0, 6).toUpperCase()}
                  {hasSession && (
                    <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[8px] font-bold">
                      {lang === "fr" ? "En cours" : "In progress"}
                    </span>
                  )}
                  {hasActiveGroup && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[8px] font-bold flex items-center gap-1">
                      <Users size={8} />{" "}
                      {lang === "fr" ? "Groupe actif" : "Active group"}
                    </span>
                  )}
                </div>

                <div className="h-40 relative overflow-hidden bg-[#0A0A0A]">
                  <img
                    src={
                      inv.cover_url ||
                      "https://images.unsplash.com/photo-1614036417651-1d4b6dbbc608?w=800&q=80"
                    }
                    alt=""
                    className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col border-t border-black/50">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <Search size={12} />
                      <span>{lang === "fr" ? "ENQUÊTE" : "INVESTIGATION"}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-[#D4AF37] font-mono font-bold">
                      <CaurisIcon className="w-3.5 h-3.5" />{" "}
                      {inv.reward_cauris || 0}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold mb-2 text-white group-hover:text-[#D4AF37] transition-colors tracking-wide leading-tight">
                    {invTitle}
                  </h3>

                  <p className="text-xs text-gray-400 line-clamp-3 mb-4 flex-1 font-sans leading-relaxed">
                    {lang === "fr"
                      ? inv.description_fr
                      : inv.description_en || inv.description_fr}
                  </p>

                  {/* ✅ BOUTONS D'ACTION */}
                  <div className="space-y-2">
                    {/* Bouton principal : Jouer */}
                    <Link
                      href={`/investigations/${inv.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2A2726] hover:bg-[#D4AF37] border border-white/10 hover:border-[#D4AF37] text-center text-xs font-bold tracking-[0.2em] font-mono text-gray-300 hover:text-black transition-all duration-300 rounded shadow-sm"
                    >
                      <Play size={12} />
                      {hasSession
                        ? lang === "fr"
                          ? "REPRENDRE L'ARCHIVE"
                          : "RESUME ARCHIVE"
                        : lang === "fr"
                          ? "OUVRIR L'ARCHIVE"
                          : "OPEN ARCHIVE"}
                    </Link>

                    {/* Boutons secondaires */}
                    <div className="flex gap-2">
                      {/* Bouton Inviter */}
                      <button
                        onClick={() => handleCreateGroup(inv)}
                        disabled={isCreatingGroup === inv.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 text-[10px] font-bold font-mono tracking-wider rounded transition-all"
                      >
                        {isCreatingGroup === inv.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <UserPlus size={10} />
                        )}
                        {hasActiveGroup
                          ? lang === "fr"
                            ? "GROUPE"
                            : "GROUP"
                          : lang === "fr"
                            ? "INVITER"
                            : "INVITE"}
                      </button>

                      {/* Bouton Supprimer partie (seulement si session existe) */}
                      {hasSession && (
                        <button
                          onClick={() =>
                            setDeleteModal({
                              invId: inv.id,
                              invTitle,
                              sessionId: userSession.id,
                            })
                          }
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-[10px] font-bold font-mono rounded transition-all"
                          title={
                            lang === "fr"
                              ? "Supprimer ma partie"
                              : "Delete my game"
                          }
                        >
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
              {lang === "fr"
                ? "Le tiroir des mystères est vide"
                : "The mystery drawer is empty"}
            </p>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════
          MODAL GROUPE (CRÉATEUR)
      ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {groupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setGroupModal(null)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111] border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="bg-purple-500/10 px-5 py-4 flex items-center justify-between border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  <span className="font-bold text-white text-sm">
                    {lang === "fr" ? "Jouer en Groupe" : "Play in Group"}
                  </span>
                </div>
                <button
                  onClick={() => setGroupModal(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Titre de l'investigation */}
                <p className="text-gray-400 text-xs font-mono">
                  {lang === "fr" ? "Enquête :" : "Investigation:"}{" "}
                  <span className="text-white font-bold">
                    {groupModal.invTitle}
                  </span>
                </p>

                {/* Code */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                    {lang === "fr" ? "Code de la partie" : "Game code"}
                  </p>
                  <div className="flex items-center gap-3 p-4 bg-black/50 border border-purple-500/20 rounded-xl">
                    <span className="font-mono font-black text-2xl text-purple-300 tracking-[0.2em] flex-1 text-center">
                      {groupModal.groupCode}
                    </span>
                  </div>
                </div>

                {/* Bouton copier le lien */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-bold transition-all"
                >
                  {isCopied ? (
                    <>
                      <Check size={14} className="text-green-400" />
                      <span className="text-green-400">
                        {lang === "fr" ? "Lien copié !" : "Link copied!"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      {lang === "fr"
                        ? "Copier le lien d'invitation"
                        : "Copy invitation link"}
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-600 text-center">
                  {lang === "fr"
                    ? "Vos coéquipiers devront taper ce code pour rejoindre la partie."
                    : "Your teammates will need to type this code to join the game."}
                </p>

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-white/10">
                  <button
                    onClick={handleDisableGroup}
                    disabled={isDisablingGroup}
                    className="flex-1 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isDisablingGroup ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <X size={12} />
                    )}
                    {lang === "fr" ? "Désactiver" : "Disable"}
                  </button>
                  <Link
                    href={`/investigations/${groupModal.invId}`}
                    className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-white text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={12} />
                    {lang === "fr" ? "Jouer maintenant" : "Play now"}
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════
          MODAL SUPPRESSION PARTIE
      ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !isDeleting && setDeleteModal(null)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-red-500/10 px-5 py-4 flex items-center justify-between border-b border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="font-bold text-white text-sm">
                    {lang === "fr" ? "Supprimer ma partie" : "Delete my game"}
                  </span>
                </div>
                <button
                  onClick={() => !isDeleting && setDeleteModal(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-gray-400 text-sm">
                  {lang === "fr"
                    ? "Vous allez supprimer votre progression pour :"
                    : "You are about to delete your progress for:"}
                </p>
                <p className="text-white font-bold font-serif">
                  {deleteModal.invTitle}
                </p>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-300 text-xs">
                    {lang === "fr"
                      ? "⚠️ Énigmes résolues, preuves collectées et Cauris gagnés seront perdus. Les autres joueurs de votre groupe ne seront pas affectés."
                      : "⚠️ Solved enigmas, collected evidence and earned Cauris will be lost. Other players in your group will not be affected."}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteModal(null)}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                  <button
                    onClick={handleDeleteSession}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {lang === "fr" ? "Supprimer" : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
