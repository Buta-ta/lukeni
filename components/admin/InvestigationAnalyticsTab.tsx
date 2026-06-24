// components/admin/InvestigationAnalyticsTab.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Loader2,
    BarChart3,
    Users,
    CheckCircle,
    Clock,
    Coins,
    Search,
    ChevronDown,
    Eye,
    Trash2,
    Lock,
    Unlock,
    RefreshCw,
    AlertTriangle,
    X,
    ShieldCheck,
    Lightbulb,
    Puzzle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
    showMsg: (type: "success" | "error", text: string) => void;
}

export default function InvestigationAnalyticsTab({ showMsg }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [investigations, setInvestigations] = useState<any[]>([]);
    const [selectedInvId, setSelectedInvId] = useState<string>("all");
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentEnigmas, setCurrentEnigmas] = useState<any[]>([]);
    const [currentWordSearches, setCurrentWordSearches] = useState<any[]>([]);

    // Modération
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: "block" | "delete" | "reset_session" | "reset_ws";
        player: any;
        wsId?: string;
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Sous-onglets
    const [subTab, setSubTab] = useState<"global" | "enigmas" | "wordsearch" | "players">("global");

    useEffect(() => {
        loadInvestigations();
    }, []);

    useEffect(() => {
        if (selectedInvId) loadData();
    }, [selectedInvId]);

    const loadInvestigations = async () => {
        const { data } = await supabase
            .from("investigations")
            .select("id, title_fr, title_en")
            .order("created_at", { ascending: false });
        setInvestigations(data || []);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Sessions
            let query = supabase
                .from("investigation_sessions")
                .select("*, profiles:user_id(full_name, avatar_url, is_blocked)")
                .order("last_played_at", { ascending: false });

            if (selectedInvId !== "all") {
                query = query.eq("investigation_id", selectedInvId);
            }

            const { data: sessData } = await query;
            setSessions(sessData || []);

            // Enigmas & Word Searches si enquête sélectionnée
            if (selectedInvId !== "all") {
                const { data: chapters } = await supabase
                    .from("investigation_chapters")
                    .select("id, enigmas:investigation_enigmas(id, question_fr, question_en, clues:investigation_clues(id))")
                    .eq("investigation_id", selectedInvId);

                const allEnigmas = (chapters || []).flatMap((c: any) => c.enigmas || []);
                setCurrentEnigmas(allEnigmas);

                const { data: wsData } = await supabase
                    .from("investigation_word_search")
                    .select("id, title_fr, title_en, words_list_fr")
                    .eq("investigation_id", selectedInvId);
                setCurrentWordSearches(wsData || []);
            } else {
                setCurrentEnigmas([]);
                setCurrentWordSearches([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // ── CALCULS KPI ──
    const activeSessions = sessions.filter((s) => s.status === "active");
    const completedSessions = sessions.filter((s) => s.status === "completed");
    const totalCaurisInPlay = activeSessions.reduce((sum, s) => sum + (s.current_cauris || 0), 0);
    const wsCompletedCount = activeSessions.reduce(
        (sum, s) => sum + ((s.completed_word_searches || [])).length,
        0
    );

    // ── STATS ÉNIGMES ──
    const enigmaStats = currentEnigmas.map((enigma: any) => {
        const totalAttempts = activeSessions.length;
        if (totalAttempts === 0) return { ...enigma, successRate: 0, hintsRevealed: 0 };

        const solvedCount = activeSessions.filter((s) =>
            (s.solved_enigmas || []).includes(`enigma_${enigma.id}_solved`)
        ).length;

        const hintsRevealed = activeSessions.reduce((sum, s) => {
            const enigmaClueIds = (enigma.clues || []).map((c: any) => c.id);
            return sum + ((s.revealed_clues || [])).filter((cId: string) => enigmaClueIds.includes(cId)).length;
        }, 0);

        return {
            ...enigma,
            successRate: Math.round((solvedCount / totalAttempts) * 100),
            solvedCount,
            hintsRevealed,
        };
    });

    // ── STATS MOTS MÊLÉS ──
    const wsStats = currentWordSearches.map((ws: any) => {
        const totalAttempts = activeSessions.length;
        if (totalAttempts === 0) return { ...ws, completionRate: 0, avgAttempts: 0 };

        const completedCount = activeSessions.filter((s) =>
            ((s.completed_word_searches || [])).includes(ws.id)
        ).length;

        const totalBadAttempts = activeSessions.reduce((sum, s) => {
            return sum + ((s.word_search_attempts || {})[ws.id] || 0);
        }, 0);

        return {
            ...ws,
            completionRate: Math.round((completedCount / totalAttempts) * 100),
            completedCount,
            avgAttempts: totalAttempts > 0 ? (totalBadAttempts / totalAttempts).toFixed(1) : 0,
        };
    });

    // ── FILTRE JOUEURS ──
    const filteredSessions = sessions.filter((s) => {
        const name = (s.profiles as any)?.full_name || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // ── ACTIONS MODÉRATION ──
    const handleBlockUser = async (userId: string, isBlocked: boolean) => {
        setIsProcessing(true);
        const { error } = await supabase
            .from("profiles")
            .update({ is_blocked: !isBlocked })
            .eq("id", userId);

        if (error) {
            showMsg("error", `Erreur: ${error.message}`);
        } else {
            showMsg("success", isBlocked ? "Joueur débloqué" : "Joueur bloqué");
            loadData();
        }
        setIsProcessing(false);
        setConfirmAction(null);
    };

    const handleDeleteSession = async (sessionId: string) => {
        setIsProcessing(true);
        const { error } = await supabase
            .from("investigation_sessions")
            .delete()
            .eq("id", sessionId);

        if (error) {
            showMsg("error", `Erreur: ${error.message}`);
        } else {
            showMsg("success", "Session supprimée");
            setSelectedPlayer(null);
            loadData();
        }
        setIsProcessing(false);
        setConfirmAction(null);
    };

    const handleResetWordSearch = async (session: any, wsId?: string) => {
        setIsProcessing(true);
        const newCompleted = (session.completed_word_searches || []).filter((id: string) => wsId ? id !== wsId : false);
        const newProgress = { ...(session.word_search_progress || {}) };
        const newAttempts = { ...(session.word_search_attempts || {}) };

        if (wsId) {
            delete newProgress[wsId];
            delete newAttempts[wsId];
        } else {
            // Reset tous les WS
            Object.keys(newProgress).forEach(k => delete newProgress[k]);
            Object.keys(newAttempts).forEach(k => delete newAttempts[k]);
        }

        const { error } = await supabase
            .from("investigation_sessions")
            .update({
                completed_word_searches: newCompleted,
                word_search_progress: newProgress,
                word_search_attempts: newAttempts,
            })
            .eq("id", session.id);

        if (error) {
            showMsg("error", `Erreur: ${error.message}`);
        } else {
            showMsg("success", wsId ? "Mots mêlés reset" : "Tous les mots mêlés reset");
            setSelectedPlayer({ ...session, completed_word_searches: newCompleted, word_search_progress: newProgress, word_search_attempts: newAttempts });
            loadData();
        }
        setIsProcessing(false);
        setConfirmAction(null);
    };

    const handleDeleteUser = async (userId: string) => {
        setIsProcessing(true);
        try {
            const adminSession = await supabase.auth.getSession();
            const adminId = adminSession.data.session?.user?.id;

            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, adminId }),
            });

            const data = await res.json();
            if (data.success) {
                showMsg("success", "Compte supprimé définitivement");
                setSelectedPlayer(null);
                loadData();
            } else {
                showMsg("error", data.error || "Erreur");
            }
        } catch (err) {
            showMsg("error", "Erreur réseau");
        }
        setIsProcessing(false);
        setConfirmAction(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="text-[#D4AF37]" /> Statistiques & Modération
                </h2>

                {/* Sélecteur d'enquête */}
                <select
                    value={selectedInvId}
                    onChange={(e) => setSelectedInvId(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                >
                    <option value="all">Toutes les enquêtes</option>
                    {investigations.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                            {inv.title_fr}
                        </option>
                    ))}
                </select>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: "Joueurs actifs", value: activeSessions.length, icon: Users, color: "text-cyan-400" },
                    { label: "Terminées", value: completedSessions.length, icon: CheckCircle, color: "text-green-400" },
                    { label: "Cauris en jeu", value: totalCaurisInPlay, icon: Coins, color: "text-[#D4AF37]" },
                    { label: "WS Complétés", value: wsCompletedCount, icon: Puzzle, color: "text-pink-400" },
                    { label: "Temps moyen", value: "—", icon: Clock, color: "text-purple-400" },
                ].map((kpi) => (
                    <div key={kpi.label} className="bg-[#0f0f0f] border border-white/5 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <kpi.icon size={14} className={kpi.color} />
                            <span className="text-[10px] text-gray-500 font-bold uppercase">{kpi.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Sous-onglets */}
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                {[
                    { id: "global", label: "Vue Globale" },
                    { id: "enigmas", label: "Énigmes", disabled: selectedInvId === "all" },
                    { id: "wordsearch", label: "Mots Mêlés", disabled: selectedInvId === "all" },
                    { id: "players", label: "Joueurs & Modération" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setSubTab(tab.id as any)}
                        disabled={tab.disabled}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${subTab === tab.id ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "text-gray-500 hover:text-white"
                            } ${tab.disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── CONTENU : ÉNIGMES ── */}
            {subTab === "enigmas" && selectedInvId !== "all" && (
                <div className="overflow-x-auto border border-white/10 rounded-xl">
                    <table className="w-full text-xs">
                        <thead className="bg-white/5 text-gray-400 font-mono uppercase">
                            <tr>
                                <th className="p-3 text-left">Question</th>
                                <th className="p-3 text-center">Réussite</th>
                                <th className="p-3 text-center">Indices révélés</th>
                                <th className="p-3 text-center">Difficulté</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {enigmaStats.map((enigma: any) => (
                                <tr key={enigma.id} className="hover:bg-white/[0.02]">
                                    <td className="p-3 max-w-[200px] truncate">{enigma.question_fr}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full font-bold ${enigma.successRate > 75 ? "bg-green-500/20 text-green-400" :
                                            enigma.successRate > 50 ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-red-500/20 text-red-400"
                                            }`}>
                                            {enigma.successRate}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-gray-400">{enigma.hintsRevealed}</td>
                                    <td className="p-3 text-center">
                                        {enigma.successRate > 75 ? "🟢 Facile" : enigma.successRate > 50 ? "🟡 Moyen" : "🔴 Difficile"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── CONTENU : MOTS MÊLÉS ── */}
            {subTab === "wordsearch" && selectedInvId !== "all" && (
                <div className="overflow-x-auto border border-white/10 rounded-xl">
                    <table className="w-full text-xs">
                        <thead className="bg-white/5 text-gray-400 font-mono uppercase">
                            <tr>
                                <th className="p-3 text-left">Titre</th>
                                <th className="p-3 text-center">Complétion</th>
                                <th className="p-3 text-center">Essais moy.</th>
                                <th className="p-3 text-center">Joueurs bloqués</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {wsStats.map((ws: any) => (
                                <tr key={ws.id} className="hover:bg-white/[0.02]">
                                    <td className="p-3">{ws.title_fr}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full font-bold ${ws.completionRate > 75 ? "bg-green-500/20 text-green-400" :
                                            ws.completionRate > 50 ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-red-500/20 text-red-400"
                                            }`}>
                                            {ws.completionRate}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-gray-400">{ws.avgAttempts}</td>
                                    <td className="p-3 text-center text-gray-400">—</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── CONTENU : JOUEURS & MODÉRATION ── */}
            {subTab === "players" && (
                <div className="space-y-4">
                    {/* Recherche */}
                    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2">
                        <Search size={14} className="text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Chercher un joueur..."
                            className="flex-1 bg-transparent text-sm text-white outline-none"
                        />
                    </div>

                    <div className="overflow-x-auto border border-white/10 rounded-xl">
                        <table className="w-full text-xs">
                            <thead className="bg-white/5 text-gray-400 font-mono uppercase">
                                <tr>
                                    <th className="p-3 text-left">Joueur</th>
                                    <th className="p-3 text-center">Statut</th>
                                    <th className="p-3 text-center">Progression</th>
                                    <th className="p-3 text-center">Cauris</th>
                                    <th className="p-3 text-center">Dernière activité</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredSessions.map((s) => {
                                    const profile = s.profiles as any;
                                    const isBlocked = profile?.is_blocked || false;
                                    const enigmaCount = (s.solved_enigmas || []).length;

                                    return (
                                        <tr key={s.id} className={`hover:bg-white/[0.02] ${isBlocked ? "opacity-50" : ""}`}>
                                            <td className="p-3 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                                    {profile?.avatar_url ? (
                                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={10} className="text-gray-500" />
                                                    )}
                                                </div>
                                                <span className="text-white font-bold">{profile?.full_name || "Anon"}</span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isBlocked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                                                    }`}>
                                                    {isBlocked ? "Bloqué" : "Actif"}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center text-gray-400">{enigmaCount} énigmes</td>
                                            <td className="p-3 text-center text-[#D4AF37] font-bold">{s.current_cauris || 0}</td>
                                            <td className="p-3 text-center text-gray-500">
                                                {new Date(s.last_played_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setSelectedPlayer(s)}
                                                        className="p-1.5 bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 rounded"
                                                        title="Voir"
                                                    >
                                                        <Eye size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleBlockUser(s.user_id, isBlocked)}
                                                        className={`p-1.5 ${isBlocked ? "bg-green-600/10 hover:bg-green-600/30 text-green-400" : "bg-orange-600/10 hover:bg-orange-600/30 text-orange-400"} rounded`}
                                                        title={isBlocked ? "Débloquer" : "Bloquer"}
                                                    >
                                                        {isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmAction({ type: "delete", player: s })}
                                                        className="p-1.5 bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded"
                                                        title="Supprimer le compte"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════
          MODAL DÉTAIL JOUEUR
      ════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedPlayer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setSelectedPlayer(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl bg-[#111] border border-[#D4AF37]/30 rounded-2xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-[#D4AF37]/10 px-5 py-4 flex items-center justify-between border-b border-[#D4AF37]/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                        {(selectedPlayer.profiles as any)?.avatar_url ? (
                                            <img src={(selectedPlayer.profiles as any).avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <Users size={16} className="text-gray-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">{(selectedPlayer.profiles as any)?.full_name || "Anon"}</h3>
                                        <p className="text-gray-500 text-[10px] font-mono">Session: {selectedPlayer.id.slice(0, 8)}...</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlayer(null)} className="text-gray-500 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                {/* Stats rapides */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/5 p-3 rounded-lg text-center">
                                        <p className="text-[10px] text-gray-500 font-mono">Énigmes</p>
                                        <p className="text-white font-bold">{(selectedPlayer.solved_enigmas || []).length}</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg text-center">
                                        <p className="text-[10px] text-gray-500 font-mono">Preuves</p>
                                        <p className="text-white font-bold">{(selectedPlayer.collected_evidences || []).length}</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg text-center">
                                        <p className="text-[10px] text-gray-500 font-mono">Cauris</p>
                                        <p className="text-[#D4AF37] font-bold">{selectedPlayer.current_cauris || 0}</p>
                                    </div>
                                </div>

                                {/* Mots Mêlés */}
                                <div className="bg-pink-900/10 p-4 rounded-xl border border-pink-500/20 space-y-3">
                                    <h4 className="text-pink-400 text-xs font-bold uppercase flex items-center gap-2">
                                        <Puzzle size={12} /> Mots Mêlés
                                    </h4>
                                    <div className="space-y-2">
                                        {currentWordSearches.map((ws: any) => {
                                            const isCompleted = (selectedPlayer.completed_word_searches || []).includes(ws.id);
                                            const progress = (selectedPlayer.word_search_progress || {})[ws.id];
                                            const attempts = (selectedPlayer.word_search_attempts || {})[ws.id] || 0;

                                            return (
                                                <div key={ws.id} className="flex items-center justify-between p-2 bg-black/30 rounded border border-white/10">
                                                    <div className="flex-1">
                                                        <p className="text-white text-xs font-bold">{ws.title_fr}</p>
                                                        <p className="text-gray-500 text-[10px]">
                                                            {isCompleted ? "✅ Complété" : progress ? `${progress.length} mots trouvés` : "Non commencé"} • {attempts} essais
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setConfirmAction({ type: "reset_ws", player: selectedPlayer, wsId: ws.id })}
                                                        className="p-1.5 bg-orange-600/10 hover:bg-orange-600/30 text-orange-400 rounded text-[10px]"
                                                        title="Reset ce mots mêlés"
                                                    >
                                                        <RefreshCw size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {currentWordSearches.length === 0 && <p className="text-gray-600 text-xs">Aucun mots mêlés</p>}
                                    </div>
                                </div>

                                {/* Indices révélés */}
                                <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 space-y-2">
                                    <h4 className="text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
                                        <Lightbulb size={12} /> Indices révélés ({(selectedPlayer.revealed_clues || []).length})
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {(selectedPlayer.revealed_clues || []).map((clueId: string) => (
                                            <span key={clueId} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-mono">
                                                {clueId.slice(0, 6)}...
                                            </span>
                                        ))}
                                        {(selectedPlayer.revealed_clues || []).length === 0 && <p className="text-gray-600 text-xs">Aucun</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Actions modération */}
                            <div className="p-4 border-t border-white/10 bg-white/[0.02] space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmAction({ type: "reset_ws", player: selectedPlayer })}
                                        className="flex-1 py-2 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        <RefreshCw size={12} /> Reset Tous les Mots Mêlés
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({ type: "reset_session", player: selectedPlayer })}
                                        className="flex-1 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        <Trash2 size={12} /> Supprimer la Session
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════════════════════════════════════════════════
          MODAL CONFIRMATION ACTION
      ════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {confirmAction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="w-full max-w-sm bg-[#111] border border-red-500/30 rounded-2xl p-6 text-center space-y-4"
                        >
                            <AlertTriangle className="mx-auto text-red-500" size={40} />
                            <h3 className="text-white font-bold">
                                {confirmAction.type === "delete" && "Supprimer le compte ?"}
                                {confirmAction.type === "block" && "Bloquer ce joueur ?"}
                                {confirmAction.type === "reset_session" && "Supprimer cette session ?"}
                                {confirmAction.type === "reset_ws" && (confirmAction.wsId ? "Reset ce mots mêlés ?" : "Reset tous les mots mêlés ?")}
                            </h3>
                            <p className="text-gray-400 text-xs">
                                {confirmAction.type === "delete" && "Cette action est irréversible. Le compte sera définitivement supprimé."}
                                {confirmAction.type === "block" && "Le joueur ne pourra plus accéder aux enquêtes."}
                                {confirmAction.type === "reset_session" && "Le joueur perdra toute sa progression pour cette enquête."}
                                {confirmAction.type === "reset_ws" && "Le joueur devra recommencer ce(s) mots mêlés."}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    disabled={isProcessing}
                                    className="flex-1 py-2 bg-white/10 text-white rounded-xl text-xs font-bold"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmAction.type === "delete") handleDeleteUser(confirmAction.player.user_id);
                                        else if (confirmAction.type === "block") handleBlockUser(confirmAction.player.user_id, false);
                                        else if (confirmAction.type === "reset_session") handleDeleteSession(confirmAction.player.id);
                                        else if (confirmAction.type === "reset_ws") handleResetWordSearch(confirmAction.player, confirmAction.wsId);
                                    }}
                                    disabled={isProcessing}
                                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                >
                                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : "Confirmer"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}