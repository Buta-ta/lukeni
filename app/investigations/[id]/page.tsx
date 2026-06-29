"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Fingerprint,
  Star,
  CheckCircle,
  BookOpen,
  Search,
  Briefcase,
  X,
  Target,
  MessageCircle,
  Send,
  Clock,
  MapPin,
  User as UserIcon,
  Edit3,
  LogOut,
  Trophy,
  AlertTriangle, Loader2, Users, Lightbulb
} from "lucide-react";
import { Hotspot } from "@/types/panorama";
import EvidenceModal from "@/components/game/EvidenceModal";
import DialogueBubble from "@/components/game/DialogueBubble";
import { useInvestigationSession } from "@/lib/hooks/useInvestigationSession";
import { useInvestigationChat } from "@/lib/hooks/useInvestigationChat";
import { useInvestigationPresence } from "@/lib/hooks/useInvestigationPresence";
import { CaurisIcon } from "@/components/logo";
import InvestigationIntro from "@/components/game/InvestigationIntro";
import InvestigationOutro from "@/components/game/InvestigationOutro";
import CharacterDialogModal from "@/components/game/CharacterDialogModal";
import ContextualEnding from "@/components/game/ContextualEnding";
import DeductionPanel from "@/components/game/DeductionPanel";
import InstructionsPanel from "@/components/game/InstructionsPanel";
import { useDeduction } from "@/lib/hooks/useDeduction";
import WordSearchGame from "@/components/game/WordSearchGame";

// --- COMPOSANT : EFFET CRT (Global) ---
const CRTEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[100] bg-[length:100%_4px,3px_100%] pointer-events-none" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
  </div>
);

// --- COMPOSANT : CADRE DE SURVEILLANCE PNJ ---
const PNJMonitor = ({
  char,
  children,
}: {
  char: any;
  children: React.ReactNode;
}) => (
  <div className="relative p-4 border-2 border-[#D4AF37] bg-black shadow-[0_0_20px_rgba(212,175,55,0.2)]">
    <div className="absolute top-2 left-2 text-[8px] text-[#D4AF37] font-mono animate-pulse">
      REC // LIVE
    </div>
    <div className="absolute top-2 right-2 text-[8px] text-[#D4AF37] font-mono">
      ID: {char.id.slice(0, 4)}
    </div>
    {children}
  </div>
);

const PanoramaViewer = dynamic(
  () => import("@/components/game/PanoramaViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <CaurisIcon className="w-12 h-12 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
        </motion.div>
      </div>
    ),
  },
);

interface Chapter {
  id: string;
  step_order: number;
  title_fr: string;
  title_en: string;
  narrative_fr: string;
  narrative_en: string;
  panorama_url?: string;
  ambient_audio_url?: string | null;
  visual_filter?: string;
  scenes: Scene[];
  enigmas: Enigma[];
}
interface Scene {
  id: string;
  chapter_id: string;
  scene_order: number;
  title_fr: string;
  title_en: string;
  panorama_url: string;
  ambient_audio_url?: string | null;
  visual_filter?: string;
  timer_duration?: number;
  hotspots: Hotspot[];
  game_over_msg_fr?: string;
  game_over_msg_en?: string;
  instruction_id?: string;

  mission_fr?: string;
  mission_en?: string;
  mission_objectives_fr?: string[];
  mission_objectives_en?: string[];
  mission_hint_fr?: string;
  mission_hint_en?: string;

  historical_context_fr?: string | null;
  historical_context_en?: string | null;
}
interface Clue {
  id: string;
  text_fr: string;
  text_en?: string;
  media_url?: string;
  media_type?: string;
  reveal_cost_cauris?: number;
  clue_order?: number;
}
interface Enigma {
  id: string;
  question_fr: string;
  question_en: string;
  expected_answer_fr: string;
  expected_answer_en: string;
  trigger_event_id?: string;
  clues?: Clue[];
  evidence_id?: string;
  response_type?: 'text' | 'choice';
  choices_fr?: string[];
  choices_en?: string[];
  correct_choice_index?: number;
  scene_id?: string;
  enigma_timer_seconds?: number;
  timer_timeout_instruction_id?: string;
  trigger_event_on_success_id?: string;
  trigger_event_on_failure_id?: string;
  trigger_event_on_timeout_id?: string;
  timer_behavior?: 'alert' | 'pause' | 'end_game';
}
interface Character {
  id: string;
  name_fr: string;
  name_en: string;
  role: string;
  role_en?: string;
  avatar_url?: string;
  description_fr?: string;
  description_en?: string;
}
interface Investigation {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  cover_url: string;
  difficulty: string;
  reward_cauris: number;
  starting_cauris: number;
}

// ── NORMALISATION DES RÉPONSES (accents, casse, ponctuation) ──
const normalizeAnswer = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/[^a-z0-9\s]/g, "") // supprime la ponctuation
    .replace(/\s+/g, " ") // normalise les espaces multiples
    .trim();

export default function InvestigationGame(props: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(props.params);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const rawId =
    typeof resolvedParams?.id === "string"
      ? decodeURIComponent(resolvedParams.id)
      : "";
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rawId,
    );
  const invId = isUUID ? rawId : "";

  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  const [investigation, setInvestigation] = useState<Investigation | null>(
    null,
  );
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [outroConfig, setOutroConfig] = useState<any | null>(null);

  const [showAbortMenu, setShowAbortMenu] = useState(false);
  const [showTimeOver, setShowTimeOver] = useState(false);


  const [showBuyTimeModal, setShowBuyTimeModal] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0); // 0-100



  const [timeRewardPopup, setTimeRewardPopup] = useState<number | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<{
    fr: string;
    en: string;
  } | null>(null);
  const [shownMilestones, setShownMilestones] = useState<number[]>([]);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [dialogueSpeakers, setDialogueSpeakers] = useState<any[]>([]);

  const [wordSearches, setWordSearches] = useState<any[]>([]);
  const [wordSearchProgress, setWordSearchProgress] = useState<Record<string, string[]>>({});
  const [wordSearchAttempts, setWordSearchAttempts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showCharacterSelect, setShowCharacterSelect] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  const [showIntro, setShowIntro] = useState(true);
  const [showOutro, setShowOutro] = useState(false);
  const [gameIntroConfig, setGameIntroConfig] = useState<any | null>(null);

  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  // ✅ NOUVEAU : Timer d'énigme indépendant
  const [enigmaTimerSeconds, setEnigmaTimerSeconds] = useState<number | null>(null);
  const [enigmaTimerActive, setEnigmaTimerActive] = useState(false);
  const [activeEnigmaId, setActiveEnigmaId] = useState<string | null>(null);
  const [wrongEnigmaIds, setWrongEnigmaIds] = useState<string[]>([]); // Pour l'alerte visuelle

  const [revealedHotspotIds, setRevealedHotspotIds] = useState<string[]>([]);

  const [activeUI, setActiveUI] = useState<
    "story" | "mission" | "enigmas" | "inventory" | "chat" | "deduction" | "wordsearch" | null
  >(null);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<any | null>(null);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(
    null,
  );

  const [chatInput, setChatInput] = useState("");

  // ── GROUPE MULTIJOUEUR ──
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // ── CHAT INTERACTIF ──
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [customEmojiInput, setCustomEmojiInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [hasUnreadMemory, setHasUnreadMemory] = useState(false);

  const {
    session,
    isLoading: isSessionLoading,
    solveEnigma,
    collectEvidence,
    setCharacter: saveCharacter,
    updateProgress,
    completeInvestigation,
    createGroup,
    disableGroup,
    joinGroupByCode,
    deleteSession,
    resetSession,
    saveWordSearchProgress,
  } = useInvestigationSession(invId, user);
  const {
    messages: chatMessages,
    sendMessage: sendChatMessage,
    addReaction,
    clearMessages,
  } = useInvestigationChat(invId, session?.group_id || null, user?.id);
  const { presentUsers } = useInvestigationPresence(
    invId,
    session?.group_id || null,
    user?.id,
  );

  const currentChapter = chapters[currentChapterIndex] || null;
  const currentScene = currentChapter?.scenes?.[currentSceneIndex] || null;
  const hotspots = currentScene?.hotspots || [];
  // ✅ NOUVEAU : Filtrer les énigmes par scène
  const allChapterEnigmas = (currentChapter?.enigmas || []).filter((enig: any) => {
    // Si l'énigme a une scene_id, elle ne doit s'afficher QUE sur cette scène
    if (enig.scene_id) {
      return enig.scene_id === currentScene?.id;
    }
    // Sinon elle s'affiche partout dans le chapitre
    return true;
  });





  // ── HOOK DÉDUCTION ──
  const {
    timeline,
    board,
    isLoading: isDeductionLoading,
    notifications: deductionNotifications,
    pendingRewards,
    validateTimelineSlot,
    validateBoardConnection,
    consumeReward,
    dismissNotification,
    availableEvidences,
    isTimelineSlotValidated,
    isBoardConnectionValidated,
    resetDeductions,
    refreshDeductions,
  } = useDeduction(
    currentChapter?.id || null,
    session?.id || null,
    session?.collected_evidences || [],
    lang,
  );

  const allSolved = allChapterEnigmas.every((e) =>
    session?.solved_enigmas?.includes(`enigma_${e.id}_solved`),
  );
  const selectedCharacter =
    characters.find((c) => c.id === selectedCharacterId) || null;

  // ── SCORE GLOBAL POUR LES FINS CONTEXTUELLES / OUTRO ──
  const totalEnigmasCount = chapters.flatMap((c) => c.enigmas || []).length;
  const totalEvidencesCount = evidences.length;
  const solvedEnigmasCount = session?.solved_enigmas?.length || 0;
  const collectedEvidencesCount = session?.collected_evidences?.length || 0;

  const earnedPoints = solvedEnigmasCount * 100 + collectedEvidencesCount * 50;
  const maxPoints = totalEnigmasCount * 100 + totalEvidencesCount * 50;

  const contextualEndingScore =
    maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  const [showContextualEnding, setShowContextualEnding] = useState<{
    title: string;
    message: string;
    type: "victory" | "abandon" | "alternate";
  } | null>(null);
  // FONCTION MAGIQUE POUR EMPECHER LES ERREURS 404 D'IMAGES

  const [showInstructions, setShowInstructions] = useState(false);

  const [instructionNotifications, setInstructionNotifications] = useState<
    { id: string; icon: string; name: string; text: string }[]
  >([]);


  // ── Ajouter une notification d'instruction ──
  // ── Ajouter une notification d'instruction ──
  const addInstructionNotification = useCallback(
    async (instrId: string) => {
      const { data } = await supabase
        .from("investigation_instructions")
        .select("*")
        .eq("id", instrId)
        .single();

      if (data) {
        const newNotif = {
          id: Math.random().toString(36).slice(2), // ID unique garanti
          icon: data.icon,

          name: lang === "fr" ? data.name : (data.name_en || data.name),
          text: lang === "fr" ? data.instruction_fr : data.instruction_en,
        };

        // On ajoute TOUTES les notifications, sans filtrer
        setInstructionNotifications((prev) => [...prev, newNotif]);


      }
    },
    [lang]
  );

  // ── Fermer une notification individuellement ──
  const removeInstructionNotification = useCallback((id: string) => {
    setInstructionNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const [caurisDelta, setCaurisDelta] = useState<string | null>(null);
  const [budgetCauris, setBudgetCauris] = useState<number>(0);
  const [enigmaAttempts, setEnigmaAttempts] = useState<Record<string, number>>(
    {},
  );
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [clueToast, setClueToast] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);  // ✅ Pour zoom image
  const [isZooming, setIsZooming] = useState(false);  // ✅ État zoom

  const renderAvatar = (
    url: string | null | undefined,
    size: string = "w-5 h-5",
  ) => {
    if (url && url.startsWith("http")) {
      return (
        <img
          src={url}
          alt=""
          className={`${size} rounded-full overflow-hidden object-cover flex-shrink-0`}
        />
      );
    }
    return (
      <div
        className={`${size} rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0`}
      >
        <UserIcon size={12} className="text-gray-400" />
      </div>
    );
  };



  // ── GESTION DE LA NOTIFICATION MÉMOIRE ──
  useEffect(() => {
    // Si la nouvelle scène possède un contexte historique, on allume le point rouge
    if (currentScene && (currentScene.historical_context_fr || currentScene.historical_context_en)) {
      setHasUnreadMemory(true);
    }
  }, [currentScene?.id]);

  useEffect(() => {
    // Si le joueur ouvre le panneau "story" (Mémoire), on éteint le point rouge
    if (activeUI === "story") {
      setHasUnreadMemory(false);
    }
  }, [activeUI]);

  // Reset zoom quand on ouvre le panel énigmes
  useEffect(() => {
    setZoomLevel(1);
  }, [activeUI]);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("lukeni_lang");
    if (storedLang) setLang(storedLang.replace(/"/g, "") as "fr" | "en");
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (authSession?.user) {
        setUser(authSession.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authSession.user.id)
          .single();
        setUserProfile(profile);
      } else {
        router.push("/auth");
      }
    };
    getUser();
  }, [router]);

  // ✅ Détecter le code de groupe dans l'URL
  useEffect(() => {
    if (!isMounted) return;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      setGroupCodeInput(code.toUpperCase());
      setShowJoinGroupModal(true);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!invId && isMounted) {
      router.push("/investigations");
    }
  }, [invId, isMounted, router]);

  useEffect(() => {
    if (!invId || !user) return;
    const loadData = async () => {
      try {
        const { data: inv, error: invError } = await supabase
          .from("investigations")
          .select("*")
          .eq("id", invId)
          .single();
        if (invError || !inv) {
          router.push("/investigations");
          return;
        }
        setInvestigation(inv);

        const { data: chaps } = await supabase
          .from("investigation_chapters")
          .select(
            `*, enigmas:investigation_enigmas(*), scenes:investigation_scenes(*)`,
          )
          .eq("investigation_id", invId)
          .order("step_order", { ascending: true });
        if (chaps) {
          setChapters(
            chaps.map((c) => ({
              ...c,
              scenes: (c.scenes || []).sort(
                (a: any, b: any) => a.scene_order - b.scene_order,
              ),
            })),
          );
        }

        const { data: chars } = await supabase
          .from("investigation_characters")
          .select("*")
          .eq("investigation_id", invId);
        setCharacters(chars || []);

        const { data: evs } = await supabase
          .from("investigation_evidences")
          .select("*");
        setEvidences(evs || []);

        const { data: dSpeakers } = await supabase
          .from("investigation_dialogue_speakers")
          .select("*")
          .eq("investigation_id", invId);
        setDialogueSpeakers(dSpeakers || []);


        // ✅ Charger les mots mêlés
        const { data: wsData } = await supabase
          .from("investigation_word_search")
          .select("*")
          .eq("investigation_id", invId);
        setWordSearches(wsData || []);

        const { data: outro } = await supabase
          .from("investigation_outro_config")
          .select("*")
          .eq("investigation_id", invId)
          .maybeSingle();
        if (outro) setOutroConfig(outro);

        // ✅ Charger la config de l'intro
        const { data: introCfg } = await supabase
          .from("investigation_intro_config")
          .select("*")
          .eq("investigation_id", invId)
          .maybeSingle();
        if (introCfg) setGameIntroConfig(introCfg);
      } catch (err) {
        console.error("Load data error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [invId, user, router]);

  // ✅ Charger les membres du groupe
  useEffect(() => {
    if (!session?.group_id) return;

    const loadGroupMembers = async () => {
      const { data } = await supabase
        .from("investigation_sessions")
        .select(
          `
        user_id,
        character_id,
        is_group_creator,
        profiles:profiles(full_name, avatar_url, username),
        investigation_characters:character_id(name_fr, name_en, role, role_en, avatar_url)
      `,
        )
        .eq("group_id", session.group_id);

      if (data) setGroupMembers(data);
    };

    loadGroupMembers();
  }, [session?.group_id]);

  useEffect(() => {
    if (!session || isSessionLoading || chapters.length === 0) return;

    // ✅ Initialisation du Budget d'Investigation
    const sessionCauris = (session as any)?.current_cauris;
    if (sessionCauris === null || sessionCauris === undefined) {
      const startBudget = investigation?.starting_cauris || 50;
      setBudgetCauris(startBudget);
      supabase
        .from("investigation_sessions")
        .update({ current_cauris: startBudget })
        .eq("id", session.id);
    } else {
      setBudgetCauris(sessionCauris);
    }

    // ✅ Initialisation des tentatives et indices révélés
    const sessionAttempts = (session as any)?.enigma_attempts;
    if (sessionAttempts) {
      setEnigmaAttempts(sessionAttempts);
    }
    const sessionRevealedClues = (session as any)?.revealed_clues;
    if (sessionRevealedClues) {
      setRevealedClues(sessionRevealedClues);
    }


    // ✅ Charger la progression des mots mêlés depuis la session
    // ✅ Charger la progression des mots mêlés depuis la session
    const wsProgress = (session as any)?.word_search_progress;
    if (wsProgress && typeof wsProgress === "object") {
      setWordSearchProgress(wsProgress);
    } else {
      setWordSearchProgress({});
    }

    // ✅ Charger les tentatives des mots mêlés depuis la session
    const wsAttempts = (session as any)?.word_search_attempts;
    if (wsAttempts && typeof wsAttempts === "object") {
      setWordSearchAttempts(wsAttempts);
    } else {
      setWordSearchAttempts({});
    }

    if (session.character_id) {
      setSelectedCharacterId(session.character_id);
      setShowCharacterSelect(false);
    }

    // ✅ Charger les hotspots révélés
    if ((session as any)?.revealed_hotspot_ids) {
      setRevealedHotspotIds((session as any).revealed_hotspot_ids);
    }

    // ✅ Charger la progression des mots mêlés
    if ((session as any)?.word_search_progress) {
      setWordSearchProgress((session as any).word_search_progress || {});
    }
    else {
      setShowCharacterSelect(true);
    }
    if (session.current_chapter_id) {
      const chapIdx = chapters.findIndex(
        (c) => c.id === session.current_chapter_id,
      );
      if (chapIdx !== -1) {
        setCurrentChapterIndex(chapIdx);
        if (session.current_scene_id) {
          const sceneIdx =
            chapters[chapIdx]?.scenes?.findIndex(
              (s) => s.id === session.current_scene_id,
            ) ?? 0;
          setCurrentSceneIndex(Math.max(0, sceneIdx));
        }
      }
    }
  }, [session?.id, isSessionLoading, chapters.length]);

  useEffect(() => {
    if (!currentChapter || !currentScene) return;
    const timeout = setTimeout(() => {
      updateProgress(currentChapter.id, currentScene.id);
    }, 500);
    return () => clearTimeout(timeout);
  }, [currentChapter?.id, currentScene?.id, updateProgress]);

  useEffect(() => {
    if (!session || isSessionLoading) return;
    const createdAt = new Date(session.created_at).getTime();
    const lastPlayed = new Date(session.last_played_at).getTime();
    if (lastPlayed - createdAt > 90000) setShowIntro(false);
  }, [session?.id, isSessionLoading]);

  useEffect(() => {
    if (!currentScene?.timer_duration || currentScene.timer_duration <= 0) {
      setTimerSeconds(null);
      setTimerActive(false);
      return;
    }
    setTimerSeconds(currentScene.timer_duration);
    setTimerActive(true);
  }, [currentScene?.id]);


  // ── DÉCLENCHER INSTRUCTION DU HOTSPOT ──
  useEffect(() => {
    if (!activeHotspot?.instruction_id) return;
    addInstructionNotification(activeHotspot.instruction_id);
  }, [activeHotspot?.instruction_id, addInstructionNotification]);

  // ── DÉCLENCHER INSTRUCTION DE LA SCÈNE ──
  useEffect(() => {
    // ✅ On vide les anciennes instructions à chaque changement de scène
    setInstructionNotifications([]);

    if (!currentScene?.instruction_id) return;
    addInstructionNotification(currentScene.instruction_id);
  }, [currentScene?.id, currentScene?.instruction_id, addInstructionNotification]);

  // ── DÉCLENCHER INSTRUCTION DU BOARD / TIMELINE ──
  const shownDeductionNotifs = useRef(new Set<string>());

  useEffect(() => {
    if (activeUI !== "deduction") {
      // Reset quand le joueur ferme le panneau pour qu'elles se relancent la prochaine fois
      shownDeductionNotifs.current.clear();
      return;
    }

    // 1. Notification du Board (S'affiche en premier, donc "en haut")
    if (board?.instruction_id && !shownDeductionNotifs.current.has(`board_${board.instruction_id}`)) {
      shownDeductionNotifs.current.add(`board_${board.instruction_id}`);
      addInstructionNotification(board.instruction_id);
    }

    // 2. Notification de la Timeline (Décalée de 400ms, s'affichera juste "en bas" de la première)
    if (timeline?.instruction_id && !shownDeductionNotifs.current.has(`timeline_${timeline.instruction_id}`)) {
      shownDeductionNotifs.current.add(`timeline_${timeline.instruction_id}`);
      setTimeout(() => {
        addInstructionNotification(timeline.instruction_id);
      }, 400);
    }
  }, [activeUI, board?.instruction_id, timeline?.instruction_id, addInstructionNotification]);




  // ✅ FIX : Charger le timer sauvegardé en base au lieu de toujours partir de 0
  useEffect(() => {
    if (!session || isSessionLoading || !currentScene) return;

    // Si le joueur a un timer sauvegardé en base, l'utiliser
    if (session.current_timer_seconds !== null && session.current_timer_seconds > 0) {
      setTimerSeconds(session.current_timer_seconds);
      setTimerActive(true);
    } else if (currentScene?.timer_duration && currentScene.timer_duration > 0) {
      // Sinon, utiliser le timer de la scène
      setTimerSeconds(currentScene.timer_duration);
      setTimerActive(true);
    } else {
      // Pas de timer
      setTimerSeconds(null);
      setTimerActive(false);
    }
  }, [session?.current_timer_seconds, currentScene?.timer_duration, session?.id, isSessionLoading]);


  // ── GESTION DES RÉCOMPENSES DE DÉDUCTION ──
  useEffect(() => {
    if (pendingRewards.length === 0) return;

    pendingRewards.forEach(reward => {
      switch (reward.type) {

        case "evidence":
          // Ajouter directement la preuve à l'inventaire
          if (reward.target_id && session) {
            collectEvidence(reward.target_id);
          }
          consumeReward(reward.id);
          break;

        case "enigma":
          // Ouvrir le panel énigmes sur la bonne énigme
          setActiveUI("enigmas");
          setTimeout(() => {
            const el = document.querySelector(
              `input[data-enigma="${reward.target_id}"]`
            );
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            (el as HTMLInputElement)?.focus();
          }, 400);
          consumeReward(reward.id);
          break;

        case "chapter":
          // Débloquer le chapitre cible
          if (reward.target_id) {
            const chapIdx = chapters.findIndex(c => c.id === reward.target_id);
            if (chapIdx !== -1) {
              setCurrentChapterIndex(chapIdx);
              setCurrentSceneIndex(0);
            }
          }
          consumeReward(reward.id);
          break;

        case "scene":
          // Changer de scène
          if (reward.target_id && currentChapter) {
            const sceneIdx = currentChapter.scenes?.findIndex(
              s => s.id === reward.target_id
            );
            if (sceneIdx !== undefined && sceneIdx !== -1) {
              setCurrentSceneIndex(sceneIdx);
            }
          }
          consumeReward(reward.id);
          break;

        case "narrative_event":
          // Déclencher un événement narratif existant
          if (reward.target_id) {
            triggerNarrativeEvent(reward.target_id);
          }
          consumeReward(reward.id);
          break;

        case "ending":
          // Déclencher une fin alternative
          setShowContextualEnding({
            title: lang === "fr" ? "FIN ALTERNATIVE" : "ALTERNATIVE ENDING",
            message: lang === "fr"
              ? reward.notif_fr || "Votre déduction a tout changé."
              : reward.notif_en || "Your deduction changed everything.",
            type: (reward.target_id as any) || "alternate",
          });
          consumeReward(reward.id);
          break;

        case "clue":
          // Révéler un indice gratuitement
          if (reward.target_id && !revealedClues.includes(reward.target_id)) {
            const newRevealed = [...revealedClues, reward.target_id];
            setRevealedClues(newRevealed);
            supabase
              .from("investigation_sessions")
              .update({ revealed_clues: newRevealed })
              .eq("id", session?.id);
            setClueToast(
              lang === "fr"
                ? "💡 Un indice a été révélé par votre déduction !"
                : "💡 A clue was revealed by your deduction!"
            );
            setTimeout(() => setClueToast(null), 3000);
          }
          consumeReward(reward.id);
          break;

        case "hotspot":
          // Pour les hotspots on affiche juste la notif
          // (le hotspot devient visible via le système invisible existant)
          consumeReward(reward.id);
          break;

        default:
          consumeReward(reward.id);
      }
    });
  }, [pendingRewards]);
  // ── GESTION DES PALIERS D'ENCOURAGEMENT EN DIRECT ──
  useEffect(() => {
    if (!outroConfig?.milestones || outroConfig.milestones.length === 0) return;

    // On calcule le score actuel exact
    const totalEnigmas = chapters.flatMap((c) => c.enigmas || []).length;
    const totalEvidences = evidences.length;
    if (totalEnigmas === 0 && totalEvidences === 0) return;

    const pointsEnigmas = (session?.solved_enigmas?.length || 0) * 100;
    const pointsEvidences = (session?.collected_evidences?.length || 0) * 50;
    const maxPoints = totalEnigmas * 100 + totalEvidences * 50;
    const currentPercent = Math.floor(
      ((pointsEnigmas + pointsEvidences) / maxPoints) * 100,
    );

    // On cherche si un palier est atteint
    const hitMilestone = outroConfig.milestones.find(
      (m: any) =>
        currentPercent >= m.percent && !shownMilestones.includes(m.percent),
    );

    if (hitMilestone) {
      setActiveMilestone({ fr: hitMilestone.fr, en: hitMilestone.en });
      setShownMilestones((prev) => [...prev, hitMilestone.percent]);

      // Le popup disparait après 4 secondes
      setTimeout(() => {
        setActiveMilestone(null);
      }, 4000);
    }
  }, [
    session?.solved_enigmas,
    session?.collected_evidences,
    outroConfig,
    chapters,
    evidences,
  ]);

  useEffect(() => {
    // ✅ Mettre en pause les DEUX timers si abandon ou achat
    if (!timerActive || timerSeconds === null || showAbortMenu || showBuyTimeModal) {
      setEnigmaTimerActive(false); // ✅ PAUSE AUSSI LE TIMER D'ÉNIGME
      return;
    }
    if (timerSeconds <= 0) {
      setTimerActive(false);

      // ✅ Si la scène a un Game Over spécifique, on utilise ContextualEnding
      if (currentScene?.game_over_msg_fr || currentScene?.game_over_msg_en) {
        setShowContextualEnding({
          title: lang === "fr" ? "TEMPS ÉCOULÉ" : "TIME OUT",
          message:
            lang === "fr"
              ? currentScene.game_over_msg_fr
              : currentScene.game_over_msg_en,
          type: "alternate",
        });
      } else {
        // Sinon, on utilise le Game Over global de l'outro
        setShowTimeOver(true);
      }
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, showAbortMenu, showBuyTimeModal]);  // ✅ Ajout des dépendances



  // ✅ NOUVEAU : Timer d'énigme indépendant
  useEffect(() => {
    // ✅ Si on met en pause (showAbortMenu = true), on sort SANS réinitialiser
    if (showAbortMenu || showBuyTimeModal) {
      return;
    }

    // Sinon, vérifier si le timer est actif
    if (!enigmaTimerActive || enigmaTimerSeconds === null) {
      return;
    }

    if (enigmaTimerSeconds <= 0) {
      setEnigmaTimerActive(false);

      // ✅ Récupérer l'énigme active
      const activeEnigma = currentChapter?.enigmas?.find((e: any) => e.id === activeEnigmaId);

      if (activeEnigma) {
        // 1. Afficher l'instruction si configurée
        if (activeEnigma.timer_timeout_instruction_id) {
          addInstructionNotification(activeEnigma.timer_timeout_instruction_id);
        }

        // 2. Déclencher l'événement "on_timeout"
        if (activeEnigma.trigger_event_on_timeout_id) {
          triggerNarrativeEvent(activeEnigma.trigger_event_on_timeout_id);
        }

        // 3. Gérer le comportement du timer
        switch (activeEnigma.timer_behavior || 'alert') {
          case 'pause':
            // ⏸️ Pause : le joueur ne peut plus interagir
            sendChatMessage(
              lang === "fr"
                ? "⏱️ Temps écoulé pour cette énigme ! Vous ne pouvez plus répondre."
                : "⏱️ Time's up for this enigma! You can no longer answer.",
              "system",
              selectedCharacterId || undefined,
            );
            // On garde enigmaTimerActive = false, l'énigme est bloquée
            break;

          case 'end_game':
            // 🔴 Fin de jeu
            sendChatMessage(
              lang === "fr"
                ? "💀 Temps écoulé ! Le jeu se termine."
                : "💀 Time's up! Game over.",
              "system",
              selectedCharacterId || undefined,
            );
            setShowContextualEnding({
              title: lang === "fr" ? "TEMPS ÉCOULÉ" : "TIME OUT",
              message:
                lang === "fr"
                  ? "Vous avez dépassé le délai imparti pour cette énigme."
                  : "You exceeded the time limit for this enigma.",
              type: "alternate",
            });
            break;

          case 'alert':
          default:
            // 💡 Juste alerte : le jeu continue
            sendChatMessage(
              lang === "fr"
                ? "⏱️ Le temps pour cette énigme est écoulé !"
                : "⏱️ Time's up for this enigma!",
              "system",
              selectedCharacterId || undefined,
            );
          // Le joueur peut toujours répondre mais ne gagne plus de bonus temps
        }
      }
      return;
    }

    const interval = setInterval(() => {
      setEnigmaTimerSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [enigmaTimerActive, enigmaTimerSeconds, showAbortMenu, showBuyTimeModal, activeEnigmaId, currentChapter, lang]);

  useEffect(() => {
    if (activeUI === "chat" && chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeUI]);

  const handleBuyTime = async () => {
    if (!userProfile || !outroConfig?.time_economy) return;
    const cost = outroConfig.time_economy.buy_cost || 50;
    const seconds = outroConfig.time_economy.buy_seconds || 60;

    if (budgetCauris < cost) {
      alert(lang === "fr" ? "Fonds insuffisants !" : "Not enough funds!");
      return;
    }

    // On retire les cauris
    // On retire les cauris du budget d'investigation
    const newBudget = budgetCauris - cost;
    setBudgetCauris(newBudget);
    setCaurisDelta(`-${cost}`);
    setTimeout(() => setCaurisDelta(null), 1200);
    await supabase
      .from("investigation_sessions")
      .update({ current_cauris: newBudget })
      .eq("id", session.id);

    // On ajoute le temps
    const newTimerSeconds = (timerSeconds ?? currentScene?.timer_duration ?? 0) + seconds;
    setTimerSeconds(newTimerSeconds);
    setEnigmaTimerActive(false);


    // ✅ FIX : Sauvegarder le nouveau timer en base
    await supabase
      .from("investigation_sessions")
      .update({ current_timer_seconds: newTimerSeconds })
      .eq("id", session.id);
  };

  // ── RESET COMPLET POUR REJOUER (Option A) ──
  // ── RESET COMPLET POUR REJOUER (Option A) ──
  const handleReplay = async () => {
    const startBudget = investigation?.starting_cauris || 50;

    // Reset des states locaux
    setCurrentChapterIndex(0);
    setCurrentSceneIndex(0);
    setShowIntro(true);
    setShowCharacterSelect(true);
    setShowAbortMenu(false);
    setShowOutro(false);
    setShowTimeOver(false);
    setShowContextualEnding(null);
    setBudgetCauris(startBudget);
    setEnigmaAttempts({});
    setRevealedClues([]);
    resetDeductions();
    setEnigmaTimerSeconds(null);
    setEnigmaTimerActive(false);
    setActiveEnigmaId(null);
    setWrongEnigmaIds([]);
    setRevealedHotspotIds([]);
    setWordSearchProgress({});
    setWordSearchAttempts({});

    await refreshDeductions();
    // Récupère le timer de la première scène du premier chapitre
    const firstScene = chapters[0]?.scenes?.[0];
    if (firstScene?.timer_duration && firstScene.timer_duration > 0) {
      setTimerSeconds(firstScene.timer_duration);
      setTimerActive(true);
    } else {
      setTimerSeconds(null);
      setTimerActive(false);
    }
    clearMessages();

    // ✅ CORRECTION : Utiliser resetSession au lieu de supabase direct
    // Cela vide Supabase ET l'état local React (session) en même temps
    if (session?.id) {
      await resetSession(startBudget);
    }
  };

  // ── REJOINDRE UN GROUPE ──
  const handleJoinGroup = async () => {
    if (!groupCodeInput.trim()) return;
    setIsJoining(true);
    setJoinError(null);

    const result = await joinGroupByCode(groupCodeInput.trim().toUpperCase());

    if (result.success) {
      const creatorName = result.creatorName || "";
      setJoinSuccess(
        lang === "fr"
          ? `✅ Vous avez rejoint la partie${creatorName ? ` de ${creatorName}` : ""} !`
          : `✅ You joined${creatorName ? ` ${creatorName}'s` : ""} game!`,
      );
      setShowJoinGroupModal(false);
      setTimeout(() => setJoinSuccess(null), 4000);
      // Nettoyer l'URL
      window.history.replaceState({}, "", `/investigations/${invId}`);
    } else {
      setJoinError(
        result.error === "invalid_code"
          ? lang === "fr"
            ? "Code invalide. Vérifiez et réessayez."
            : "Invalid code. Check and try again."
          : lang === "fr"
            ? "Une erreur est survenue."
            : "An error occurred.",
      );
    }

    setIsJoining(false);
  };

  const playTransitionSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* silencieux */
    }
  };

  const handleHotspotActivate = useCallback(
    async (hotspot: Hotspot) => {
      // ✅ FIX 1 : Vérification de la condition de verrouillage
      // ✅ Vérification de la condition de verrouillage (Énigmes ET Mots Mêlés)
      // ✅ Vérification de la condition de verrouillage
      if (hotspot.condition) {
        let isConditionMet = false;
        let lockName = "";
        let lockType = "";

        // Format: enigma_<id>_solved
        if (hotspot.condition.startsWith('enigma_')) {
          lockType = "enigma";
          const enigmaId = hotspot.condition.replace('enigma_', '').replace('_solved', '');
          isConditionMet = session?.solved_enigmas?.includes(hotspot.condition);
          const enigma = allChapterEnigmas.find((e: any) => e.id === enigmaId);
          lockName = enigma ? (lang === "fr" ? enigma.question_fr : enigma.question_en) : "cette énigme";
        }
        // Format: wordsearch_<id>_completed
        else if (hotspot.condition.startsWith('wordsearch_')) {
          lockType = "wordsearch";
          const wsId = hotspot.condition.replace('wordsearch_', '').replace('_completed', '');
          isConditionMet = (session as any)?.completed_word_searches?.includes(wsId);
          const ws = wordSearches.find((w: any) => w.id === wsId);
          lockName = ws ? ws.title_fr : "ce mots mêlés";
        }

        if (!isConditionMet) {
          const message = lang === "fr"
            ? `🔒 Accès verrouillé. Vous devez d'abord : ${lockType === 'enigma' ? 'résoudre' : 'terminer'} "${lockName}"`
            : `🔒 Access locked. You must first: ${lockType === 'enigma' ? 'solve' : 'complete'} "${lockName}"`;

          sendChatMessage(message, "system");
          return;
        }
      }

      // ✅ FIX 2 : Fin alternative avec titre et message séparés
      if (hotspot.type === "ending") {
        const endingTitle =
          lang === "fr"
            ? hotspot.ending_title_fr ||
            hotspot.ending_msg_fr?.split("\n")[0] ||
            "Fin"
            : hotspot.ending_title_en ||
            hotspot.ending_msg_en?.split("\n")[0] ||
            "End";
        const endingMsg =
          lang === "fr"
            ? hotspot.ending_msg_fr || "Vous avez décidé de votre sort."
            : hotspot.ending_msg_en || "You decided your fate.";
        setShowContextualEnding({
          title: endingTitle,
          message: endingMsg,
          type: hotspot.ending_type || "abandon",
        });
        return;
      }
      if (hotspot.type === "transition" && hotspot.target_scene_id) {
        const newSceneIdx = currentChapter?.scenes?.findIndex(
          (s) => s.id === hotspot.target_scene_id,
        );
        if (newSceneIdx !== undefined && newSceneIdx !== -1) {
          setCurrentSceneIndex(newSceneIdx);
          playTransitionSound();

          // ✅ FIX : Réinitialiser le timer pour la nouvelle scène
          const newScene = currentChapter?.scenes?.[newSceneIdx];
          if (newScene?.timer_duration && newScene.timer_duration > 0) {
            setTimerSeconds(newScene.timer_duration);
            setTimerActive(true);
            // Sauvegarder en base
            await supabase
              .from("investigation_sessions")
              .update({ current_timer_seconds: newScene.timer_duration })
              .eq("id", session.id);
          } else {
            setTimerSeconds(null);
            setTimerActive(false);
            // Sauvegarder en base
            await supabase
              .from("investigation_sessions")
              .update({ current_timer_seconds: null })
              .eq("id", session.id);
          }

          // NOUVEAU: Récompense de temps pour avoir avancé
          if (outroConfig?.time_economy?.reward_seconds && timerActive) {
            setTimerSeconds((prev) =>
              prev !== null
                ? prev + outroConfig.time_economy.reward_seconds
                : null,
            );
            setTimeRewardPopup(outroConfig.time_economy.reward_seconds);
            setTimeout(() => setTimeRewardPopup(null), 3000);
          }
        }
        return;
      }
      if (hotspot.type === "transition" && hotspot.target_chapter_id) {
        const newChapIdx = chapters.findIndex(
          (c) => c.id === hotspot.target_chapter_id,
        );
        if (newChapIdx !== -1) {
          setCurrentChapterIndex(newChapIdx);
          setCurrentSceneIndex(0);
          playTransitionSound();
        }
        return;
      }
      if (hotspot.type === "character" && hotspot.character_id) {
        const char = characters.find((c) => c.id === hotspot.character_id);
        if (char) {
          setActiveCharacter(char);
          return;
        }
      }
      if (hotspot.type === "enigma" && hotspot.enigma_id) {
        setActiveUI("enigmas");
        setTimeout(() => {
          const el = document.querySelector(
            `input[data-enigma="${hotspot.enigma_id}"]`,
          );
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLInputElement)?.focus();
        }, 300);
        return;
      }


      if (hotspot.type === 'dialogue_bubble') {
        setActiveHotspot(hotspot);
        setActiveEvidence(null);
        // Pas de trigger_event ici, le joueur vient d'ouvrir la bulle
        return;
      }
      setActiveHotspot(hotspot);
      if (hotspot.evidence_id) {
        const evidence = evidences.find((e) => e.id === hotspot.evidence_id);
        setActiveEvidence(evidence || null);

        // ✅ Si la preuve a un message de découverte, on l'affiche en Toast
        if (
          evidence &&
          (evidence.discovery_msg_fr || evidence.discovery_msg_en)
        ) {
          setTimeout(() => {
            setActiveMilestone({
              fr: evidence.discovery_msg_fr,
              en: evidence.discovery_msg_en,
            });
            setTimeout(() => setActiveMilestone(null), 4000);
          }, 1500); // Délai pour laisser le modal s'ouvrir d'abord
        }
      } else {
        setActiveEvidence(null);
      }

      if (hotspot.trigger_event_id) {
        triggerNarrativeEvent(hotspot.trigger_event_id);
      }

      // ✅ NOUVEAU : Révéler d'autres hotspots
      if (hotspot.reveals_hotspot_ids && hotspot.reveals_hotspot_ids.length > 0) {
        const newRevealed = [...new Set([...revealedHotspotIds, ...hotspot.reveals_hotspot_ids])];
        setRevealedHotspotIds(newRevealed);

        // Sauvegarder en BDD
        await supabase
          .from("investigation_sessions")
          .update({ revealed_hotspot_ids: newRevealed })
          .eq("id", session.id);

        sendChatMessage(
          lang === "fr"
            ? `👁️ ${hotspot.reveals_hotspot_ids.length} nouvel(aux) élément(s) révélé(s) !`
            : `👁️ ${hotspot.reveals_hotspot_ids.length} new element(s) revealed!`,
          "system",
        );
      }

      // ✅ NOUVEAU : Navigation après interaction
      if (hotspot.target_chapter_id) {
        const chapIdx = chapters.findIndex(c => c.id === hotspot.target_chapter_id);
        if (chapIdx !== -1) {
          setTimeout(() => {
            setCurrentChapterIndex(chapIdx);
            setCurrentSceneIndex(0);
            playTransitionSound();
          }, 500);
        }
      } else if (hotspot.target_scene_id && currentChapter) {
        const sceneIdx = currentChapter.scenes?.findIndex(s => s.id === hotspot.target_scene_id);
        if (sceneIdx !== undefined && sceneIdx !== -1) {
          setTimeout(() => {
            setCurrentSceneIndex(sceneIdx);
            playTransitionSound();
          }, 500);
        }
      }
    },
    [currentChapter, chapters, characters, evidences, outroConfig, lang, revealedHotspotIds, session],
  );

  const handleSelectCharacter = async (characterId: string) => {
    setSelectedCharacterId(characterId);
    setShowCharacterSelect(false);
    if (session) await saveCharacter(characterId);
  };
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    await sendChatMessage(
      chatInput,
      'text',
      undefined,
      currentScene?.id,
      undefined,
      replyingTo?.id || undefined
    );
    setChatInput('');
    setReplyingTo(null);
    setShowEmojiPicker(null);
  };

  const checkAnswer = (enigma: Enigma) => {
    let userAnswer = "";
    let isCorrect = false;
    const responseType = enigma.response_type || 'text';

    // ── SI CHOIX MULTIPLES ──
    if (responseType === 'choice') {
      const selectedRadio = document.querySelector(
        `input[name="enigma-choice-${enigma.id}"]:checked`
      ) as HTMLInputElement | null;
      if (!selectedRadio) {

        return;
      }
      const selectedIndex = parseInt(selectedRadio.value);
      isCorrect = selectedIndex === enigma.correct_choice_index;
    }
    // ── SI TEXTE ──
    else {
      const input = document.querySelector(
        `input[data-enigma="${enigma.id}"]`,
      ) as HTMLInputElement | null;
      userAnswer = input?.value || "";

      const normalizedUser = normalizeAnswer(userAnswer);
      const expectedRaw =
        lang === "fr" ? enigma.expected_answer_fr : enigma.expected_answer_en;
      const expectedOptions = expectedRaw
        .split(",")
        .map((s) => normalizeAnswer(s));

      isCorrect = expectedOptions.includes(normalizedUser);
    }

    if (isCorrect) {
      // ── BONNE RÉPONSE : +5 CAURIS ──
      const newBudget = budgetCauris + 5;
      setBudgetCauris(newBudget);
      setCaurisDelta("+5");
      setTimeout(() => setCaurisDelta(null), 1200);

      // ✅ FIX 1 : Sauvegarder les Cauris avec vérification
      supabase
        .from("investigation_sessions")
        .update({ current_cauris: newBudget })
        .eq("id", session.id)
        .then(({ error }) => {
          if (error) {
            console.error('❌ Erreur sauvegarde Cauris:', error);
          } else {
            console.log('✅ Cauris sauvegardés:', newBudget);
          }
        });

      solveEnigma(enigma.id);


      // ✅ ARRÊTER LE TIMER D'ÉNIGME (IMPORTANT !)
      setEnigmaTimerActive(false);
      setEnigmaTimerSeconds(null);

      // ✅ Déclencher l'événement "on_success"
      if (enigma.trigger_event_on_success_id) {
        triggerNarrativeEvent(enigma.trigger_event_on_success_id);
      }

      if (enigma.trigger_event_id) {
        triggerNarrativeEvent(enigma.trigger_event_id);
      }

    } else {
      // ── MAUVAISE RÉPONSE : -1 CAURI ──
      const newBudget = Math.max(0, budgetCauris - 1);
      setBudgetCauris(newBudget);
      setCaurisDelta("-1");
      setTimeout(() => setCaurisDelta(null), 1200);

      // ✅ NOUVEAU : Ajouter l'énigme à la liste des "mauvaises"
      setWrongEnigmaIds(prev => [...new Set([...prev, enigma.id])]);
      setTimeout(() => {
        setWrongEnigmaIds(prev => prev.filter(id => id !== enigma.id));
      }, 2000); // L'alerte disparaît après 2 secondes

      const currentAttempts = (enigmaAttempts[enigma.id] || 0) + 1;
      const newAttempts = { ...enigmaAttempts, [enigma.id]: currentAttempts };
      setEnigmaAttempts(newAttempts);

      const autoRevealAfter = outroConfig?.game_economy?.auto_reveal_after || 3;
      const enigmaClues = allChapterEnigmas.find((e: any) => e.id === enigma.id)?.clues || [];

      if (currentAttempts % autoRevealAfter === 0 && enigmaClues.length > 0) {
        const nextClue = enigmaClues.find(
          (c: any) => !revealedClues.includes(c.id),
        );
        if (nextClue) {
          const newRevealed = [...revealedClues, nextClue.id];
          setRevealedClues(newRevealed);
          setClueToast(
            lang === "fr"
              ? "💡 Un indice a été débloqué automatiquement !"
              : "💡 A clue has been automatically unlocked!",
          );
          setTimeout(() => setClueToast(null), 3000);

          // ✅ FIX 1 : Sauvegarder avec vérification
          supabase
            .from("investigation_sessions")
            .update({
              current_cauris: newBudget,
              enigma_attempts: newAttempts,
              revealed_clues: newRevealed,
            })
            .eq("id", session.id)
            .then(({ error }) => {
              if (error) {
                console.error('❌ Erreur sauvegarde session:', error);
              } else {
                console.log('✅ Session sauvegardée');
              }
            });
        } else {
          // ✅ FIX 1 : Sauvegarder avec vérification
          supabase
            .from("investigation_sessions")
            .update({
              current_cauris: newBudget,
              enigma_attempts: newAttempts,
            })
            .eq("id", session.id)
            .then(({ error }) => {
              if (error) {
                console.error('❌ Erreur sauvegarde session:', error);
              } else {
                console.log('✅ Session sauvegardée');
              }
            });
        }
      } else {
        // ✅ FIX 1 : Sauvegarder avec vérification
        supabase
          .from("investigation_sessions")
          .update({
            current_cauris: newBudget,
            enigma_attempts: newAttempts,
          })
          .eq("id", session.id)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Erreur sauvegarde session:', error);
            } else {
              console.log('✅ Session sauvegardée');
            }
          });
      }

      if (newBudget <= 0) {


        // ✅ NOUVEAU : Déclencher l'événement "on_failure"
        if (enigma.trigger_event_on_failure_id) {
          triggerNarrativeEvent(enigma.trigger_event_on_failure_id);
        }

        setShowContextualEnding({
          title: lang === "fr" ? "FAILLITE" : "BANKRUPTCY",
          message:
            lang === "fr"
              ? "Vos réserves de Cauris sont à zéro. L'enquête s'arrête ici."
              : "Your Cauris reserves are empty. The investigation ends here.",
          type: "abandon",
        });
      } else {

      }
    }
  };



  // ✅ FIX 4 : Révélation manuelle d'un indice (coût en Cauris)
  // ✅ FIX 4 : Révélation manuelle d'un indice (coût configurable par indice)
  const handleRevealClue = async (clueId: string) => {
    // ✅ Trouver le coût spécifique de cet indice
    const clue = chapters
      .flatMap((c) => c.enigmas || [])
      .flatMap((e) => e.clues || [])
      .find((c: any) => c.id === clueId);

    const clueCost = clue?.reveal_cost_cauris ?? 5;

    if (budgetCauris < clueCost) {
      setClueToast(
        lang === "fr"
          ? "❌ Fonds insuffisants pour révéler cet indice !"
          : "❌ Not enough Cauris to reveal this clue!",
      );
      setTimeout(() => setClueToast(null), 3000);
      return;
    }

    const newBudget = budgetCauris - clueCost;
    const newRevealed = [...revealedClues, clueId];

    setBudgetCauris(newBudget);
    setCaurisDelta(`-${clueCost}`);
    setTimeout(() => setCaurisDelta(null), 1200);
    setRevealedClues(newRevealed);
    setClueToast(
      lang === "fr"
        ? `💡 Indice révélé (-${clueCost} Cauris)`
        : `💡 Clue revealed (-${clueCost} Cauris)`,
    );
    setTimeout(() => setClueToast(null), 3000);

    await supabase
      .from("investigation_sessions")
      .update({
        current_cauris: newBudget,
        revealed_clues: newRevealed,
      })
      .eq("id", session.id);
  };

  // ── EMOJIS DE RÉACTION PRÉDÉFINIS ──
  const PRESET_EMOJIS = ["❤️", "👍", "🔥", "🧩", "🕵️", "😮"];

  if (!isMounted) return null;
  if (!invId)
    return (
      <div className="h-[100dvh] w-screen bg-[#05050A] flex items-center justify-center">
        <CaurisIcon className="w-12 h-12 text-[#D4AF37] animate-pulse" />
      </div>
    );
  if (showIntro && !isLoading && investigation)
    return (
      <InvestigationIntro
        investigationId={invId}
        lang={lang}
        onComplete={() => setShowIntro(false)}
        directConfig={gameIntroConfig || undefined}
      />
    );

  if (showOutro && investigation)
    return (
      <InvestigationOutro
        investigation={investigation}
        lang={lang}
        solvedEnigmas={session?.solved_enigmas || []}
        totalEnigmas={chapters.flatMap((c) => c.enigmas || []).length}
        collectedEvidences={session?.collected_evidences || []}
        totalEvidences={evidences.length}
        config={outroConfig}
        onReplay={handleReplay}
        onExit={() => router.push("/investigations")}
      />
    );
  // APRÈS (correction complète)
  if (isLoading || !investigation || !currentChapter || !currentScene)
    return (
      <div className="h-[100dvh] w-screen bg-[#05050A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <CaurisIcon className="w-12 h-12 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
          </motion.div>
          <p className="text-[#D4AF37] font-mono text-sm tracking-[0.3em]">
            {lang === "fr"
              ? "ARMEZ-VOUS DE CONNAISSANCES..."
              : "ARM YOURSELF WITH KNOWLEDGE..."}
          </p>
        </div>
      </div>
    );

  if (showCharacterSelect) {
    return (
      <div className="h-[100dvh] w-screen bg-[#05050A] flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-2xl w-full space-y-6"
        >
          <div className="text-center space-y-2 mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
              {lang === "fr" ? "Quel est votre Rôle ?" : "What is your Role?"}
            </h1>
            <p className="text-gray-400 font-mono text-sm">
              {lang === "fr"
                ? "Choisissez un rôle pour commencer l'investigation"
                : "Choose a role to begin the investigation"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500 font-mono text-sm mb-4">
                  {lang === "fr"
                    ? "Aucun rôle configuré."
                    : "No roles configured."}
                </p>
                <button
                  onClick={() => setShowCharacterSelect(false)}
                  className="px-6 py-3 bg-[#D4AF37] text-black font-mono font-bold rounded-xl text-sm hover:bg-white transition-colors"
                >
                  {lang === "fr"
                    ? "COMMENCER L'ENQUÊTE →"
                    : "START INVESTIGATION →"}
                </button>
              </div>
            ) : (
              characters.map((char) => (
                <motion.div
                  key={char.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectCharacter(char.id)}
                  className="relative p-6 bg-black/40 border border-white/10 rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 transition-all overflow-hidden group"
                >
                  <div className="relative z-10 space-y-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#D4AF37] mx-auto bg-gray-900 flex items-center justify-center">
                      {/* ICI ON AFFICHE LA PHOTO DU PERSONNAGE VIRTUEL (PNJ) */}
                      {renderAvatar(char.avatar_url, "w-16 h-16")}
                    </div>
                    <div>
                      <h3 className="text-white font-serif text-lg font-bold text-center">
                        {lang === "fr" ? char.role : char.role_en || char.role}
                      </h3>
                      <p className="text-gray-400 text-xs text-center leading-relaxed mt-2">
                        {lang === "fr"
                          ? char.description_fr
                          : char.description_en}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/10">
                      <span className="text-[#06b6d4] text-[10px] font-mono">
                        {lang === "fr"
                          ? "ENTRER DANS LE JEU →"
                          : "ENTER GAME →"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const chapTitle =
    lang === "fr" ? currentChapter.title_fr : currentChapter.title_en;
  const chapNarrative =
    lang === "fr" ? currentChapter.narrative_fr : currentChapter.narrative_en;
  const sceneTitle =
    lang === "fr" ? currentScene.title_fr : currentScene.title_en;


  // ✅ Filtrer les mots mêlés pour la scène actuelle
  const currentWordSearch = (wordSearches || []).find((ws: any) => {
    if (ws.chapter_id !== currentChapter?.id) return false;
    if (ws.scene_id && ws.scene_id !== currentScene?.id) return false;
    return true;
  }) || null;

  // ── MOTEUR D'ÉVÉNEMENTS NARRATIFS ──
  // ── MOTEUR D'ÉVÉNEMENTS NARRATIFS ──
  const triggerNarrativeEvent = (eventId: string) => {
    if (!outroConfig?.narrative_events) return;
    const event = outroConfig.narrative_events.find(
      (e: any) => e.id === eventId,
    );
    if (!event || !event.source_type) return;

    // On attend 1.5 seconde pour éviter la collision avec les modals classiques
    setTimeout(() => {
      if (event.source_type === "milestone") {
        // 💭 TYPE TOAST
        const milestone = outroConfig.milestones?.find(
          (m: any) => m.id === event.source_id,
        );
        if (milestone) {
          setActiveMilestone({ fr: milestone.fr, en: milestone.en });
          setTimeout(() => setActiveMilestone(null), 4000);
        }
      } else if (event.source_type === "game_over") {
        // 💀 TYPE GAME OVER
        const go = outroConfig.game_overs?.find(
          (g: any) => g.id === event.source_id,
        );
        if (go) {
          setShowContextualEnding({
            title: lang === "fr" ? "FIN TRAGIQUE" : "TRAGIC END",
            message: lang === "fr" ? go.text_fr : go.text_en,
            type: "alternate",
          });
        }
      } else if (event.source_type === "abandon") {
        // 🚪 TYPE ABANDON
        const ab = outroConfig.abandons?.find(
          (a: any) => a.id === event.source_id,
        );
        if (ab) {
          setShowContextualEnding({
            title: lang === "fr" ? "SUSPENSION" : "SUSPENSION",
            message: lang === "fr" ? ab.text_fr : ab.text_en,
            type: "abandon",
          });
        }
      } else if (event.source_type === "rank") {
        // 🏆 TYPE VICTOIRE/RANG
        const rank = outroConfig.ranks?.find(
          (r: any) => r.id === event.source_id,
        );
        if (rank) {
          const randomMsg =
            rank.messages?.length > 0
              ? rank.messages[Math.floor(Math.random() * rank.messages.length)]
              : null;
          setShowContextualEnding({
            title:
              lang === "fr"
                ? rank.main_title_fr || "ENQUÊTE TERMINÉE"
                : rank.main_title_en || "INVESTIGATION COMPLETE",
            message:
              lang === "fr"
                ? randomMsg?.text_fr || rank.title_fr
                : randomMsg?.text_en || rank.title_en,
            type: "victory",
          });
        }
      }
    }, 1500);
  };

  return (
    <div className="h-[100dvh] w-screen bg-black overflow-hidden relative font-sans text-white">
      {currentScene.panorama_url ? (
        <PanoramaViewer
          panoramaUrl={currentScene.panorama_url}
          hotspots={activeUI || showAbortMenu ? [] : hotspots
            .filter(h => h.id !== activeHotspot?.id)
            .filter(h => {
              // Si le hotspot a une condition, vérifier s'il est révélé
              if (h.condition && !revealedHotspotIds.includes(h.id)) {
                // Afficher quand même mais grisé (le joueur verra le message de verrouillage)
                return true;
              }
              return true;
            })
          }
          evidences={evidences}
          solvedEnigmas={session?.solved_enigmas || []}
          lang={lang}
          onHotspotActivate={handleHotspotActivate}
          onSceneChange={(sceneId) => {
            // ✅ LA MAGIE EST ICI : On change la scène après le fondu noir
            const newSceneIdx = currentChapter?.scenes?.findIndex(
              (s) => s.id === sceneId,
            );
            if (newSceneIdx !== undefined && newSceneIdx !== -1) {
              setCurrentSceneIndex(newSceneIdx);
              playTransitionSound();
            }
          }}
          ambientAudioUrl={currentScene.ambient_audio_url}
          ambientAudioVolume={(currentScene as any).ambient_audio_volume ?? 0.5}
          visualFilter={currentScene.visual_filter || "none"}
          characters={characters}
        />
      ) : (
        <div className="absolute inset-0 bg-[#05050A] flex flex-col items-center justify-center">
          <Fingerprint className="text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 font-mono tracking-widest">
            {lang === "fr" ? "AUCUNE DONNÉE VISUELLE" : "NO VISUAL DATA"}
          </p>
        </div>
      )}

      <AnimatePresence>
        {activeUI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={() => {
              // ✅ Mettre en pause le timer d'énigme si on ferme le panel
              if (activeUI === "enigmas") {
                setEnigmaTimerActive(false);
              }
              setActiveUI(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* HUD SUPÉRIEUR */}
      <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-4 pb-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInstructions(true)}
                className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] font-mono text-[10px] tracking-widest transition-colors"
                title={lang === "fr" ? "Instructions" : "Instructions"}
              >
                <Lightbulb size={14} /> {lang === "fr" ? "GUIDE" : "GUIDE"}
              </button>
              <button
                onClick={() => {
                  setShowAbortMenu(true);
                  setEnigmaTimerActive(false); // ✅ PAUSE LE TIMER D'ÉNIGME
                  setActiveUI(null); // ✅ AJOUTE CETTE LIGNE : Ferme tous les panels
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-white font-mono text-[10px] tracking-widest"
              >
                <ChevronLeft size={14} /> {lang === "fr" ? "ABANDONNER" : "ABORT"}
              </button>
            </div>
            <h1 className="font-serif text-lg md:text-2xl font-bold text-white drop-shadow-md">
              {chapTitle}
            </h1>
            <p className="text-gray-500 text-xs flex items-center gap-2">
              <MapPin size={12} /> {sceneTitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="relative flex items-center gap-1.5 px-3 py-1 bg-black/50 border border-[#D4AF37]/30 rounded-full">
              <CaurisIcon className="w-4 h-4 text-[#D4AF37]" />
              <div className="relative h-4 w-6 overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={budgetCauris}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-[#D4AF37]"
                  >
                    {budgetCauris}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ✅ TEXTE FLOTTANT +5 / -1 */}
              <AnimatePresence>
                {caurisDelta && (
                  <motion.span
                    initial={{ opacity: 1, y: 0, scale: 1, x: -10 }}
                    animate={{ opacity: 0, y: -25, scale: 1.2, x: -10 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`absolute -top-1 left-1/2 font-mono text-xs font-black ${caurisDelta.startsWith("+") ? "text-green-400" : "text-red-400"}`}
                  >
                    {caurisDelta}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {timerSeconds !== null && (
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: timerSeconds <= 10 ? [1, 1.1, 1] : 1 }}
                  transition={{
                    repeat: timerSeconds <= 10 ? Infinity : 0,
                    duration: 0.5,
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border ${timerSeconds <= 10 ? "bg-red-500/20 border-red-500/50 text-red-400" : timerSeconds <= 30 ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-black/50 border-white/20 text-white"}`}
                >
                  <Clock size={12} />
                  {Math.floor(timerSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(timerSeconds % 60).toString().padStart(2, "0")}
                </motion.div>
                {/* BOUTON ACHETER DU TEMPS */}
                <button
                  onClick={() => setShowBuyTimeModal(true)}
                  className="w-6 h-6 flex items-center justify-center bg-[#D4AF37] hover:bg-white text-black rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all font-black text-sm"
                >
                  +
                </button>
              </div>
            )}
            {selectedCharacter && userProfile && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px]">
                {renderAvatar(userProfile.avatar_url)}
                <span className="text-gray-300">
                  <strong className="text-white">
                    {userProfile.full_name || "Joueur"}
                  </strong>
                  <span className="opacity-50 mx-1">|</span>
                  {lang === "fr"
                    ? selectedCharacter.role
                    : selectedCharacter.role_en || selectedCharacter.role}
                </span>
                {/* BOUTON CHANGER DE RÔLE */}
                <button
                  onClick={() => setShowCharacterSelect(true)}
                  title={lang === "fr" ? "Changer de rôle" : "Switch role"}
                  className="ml-1 p-0.5 text-gray-500 hover:text-white transition-colors"
                >
                  <Edit3 size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>





      {/* ── INSTRUCTION NOTIFICATIONS (Superposées dynamiquement) ── */}
      <div className="fixed top-24 md:top-32 inset-x-0 z-[60] flex flex-col items-center gap-3 pointer-events-none px-4">
        <AnimatePresence>
          {instructionNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 backdrop-blur-md border border-[#D4AF37]/40 rounded-2xl p-4 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {notif.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#D4AF37] font-mono text-xs tracking-widest font-bold uppercase mb-1">
                      {notif.name}
                    </p>
                    <p className="text-gray-200 text-sm leading-relaxed font-serif">
                      {notif.text}
                    </p>
                  </div>
                  <button
                    onClick={() => removeInstructionNotification(notif.id)}
                    className="text-[#D4AF37] hover:text-white flex-shrink-0 mt-0.5"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* COCKPIT INFÉRIEUR */}
      <div className="absolute bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 md:gap-4 bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-full pointer-events-auto shadow-2xl flex-wrap justify-center">
          <button
            onClick={() => setActiveUI(activeUI === "story" ? null : "story")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors relative ${activeUI === "story" ? "bg-[#06b6d4] text-black" : "hover:bg-white/10 text-gray-300"}`}
          >
            <BookOpen size={18} />
            <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
              {lang === "fr" ? "MÉMOIRE" : "MEMORY"}
            </span>
            {/* ✅ NOUVEAU : Badge rouge si non lu */}
            {hasUnreadMemory && activeUI !== "story" && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            )}
          </button>




          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => setActiveUI(activeUI === "mission" ? null : "mission")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors relative ${activeUI === "mission" ? "bg-green-600 text-white" : "hover:bg-white/10 text-gray-300"}`}
          >
            <Target size={18} />
            <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
              {lang === "fr" ? "MISSION" : "MISSION"}
            </span>
            {/* Badge si objectifs non complétés */}
            {(() => {
              const objectives = currentScene?.mission_objectives_fr || [];
              if (objectives.length > 0) {
                return (
                  <span className="ml-1 bg-green-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {objectives.length}
                  </span>
                );
              }
              return null;
            })()}
          </button>





          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => {
              if (activeUI === "enigmas") {
                setActiveUI(null);
                setEnigmaTimerActive(false); // ✅ Pause en fermant
              } else {
                setActiveUI("enigmas");
                // ✅ Redémarrer le timer s'il était en pause
                if (enigmaTimerSeconds !== null && enigmaTimerSeconds > 0 && !enigmaTimerActive) {
                  setEnigmaTimerActive(true);
                }
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors relative ${activeUI === "enigmas" ? "bg-[#D4AF37] text-black" : "hover:bg-white/10 text-gray-300"}`}
          >
            <Target size={18} />
            <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
              {lang === "fr" ? "ÉNIGMES" : "ENIGMAS"}
            </span>
            {!allSolved && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() =>
              setActiveUI(activeUI === "inventory" ? null : "inventory")
            }
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors ${activeUI === "inventory" ? "bg-white text-black" : "hover:bg-white/10 text-gray-300"}`}
          >
            <Briefcase size={18} />
            <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
              {lang === "fr" ? "PREUVES" : "EVIDENCE"}
            </span>
            {(session?.collected_evidences?.length || 0) > 0 && (
              <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                {session?.collected_evidences?.length || 0}
              </span>
            )}
          </button>


          {/* Bouton Déduction — visible si timeline ou board existe */}
          {(timeline || board) && (
            <>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={() => setActiveUI(activeUI === "deduction" ? null : "deduction")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors relative ${activeUI === "deduction"
                  ? "bg-[#D4AF37] text-black"
                  : "hover:bg-white/10 text-gray-300"
                  }`}
              >
                <span className="text-lg">🧠</span>
                <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
                  {lang === "fr" ? "DÉDUCTION" : "DEDUCTION"}
                </span>
                {/* Badge si des déductions sont disponibles */}
                {(() => {
                  const totalSlots = timeline?.slots?.length || 0;
                  const totalConns = board?.connections?.length || 0;
                  const validatedCount = (session as any)?.validated_deductions?.length || 0;
                  const total = totalSlots + totalConns;
                  if (total > 0 && validatedCount < total) {
                    return (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#D4AF37] rounded-full animate-pulse" />
                    );
                  }
                  return null;
                })()}
              </button>
            </>
          )}





          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => setActiveUI(activeUI === "wordsearch" ? null : "wordsearch")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors relative ${activeUI === "wordsearch"
              ? "bg-pink-600 text-white"
              : "hover:bg-white/10 text-gray-300"
              }`}
          >
            <span className="text-lg">🧩</span>
            <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
              {lang === "fr" ? "MOTS MÊLÉS" : "WORD SEARCH"}
            </span>
          </button>




          {/* Chat visible uniquement si le joueur est dans un groupe */}
          {session?.group_id && (
            <>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={() => setActiveUI(activeUI === "chat" ? null : "chat")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors relative ${activeUI === "chat"
                  ? "bg-purple-600 text-white"
                  : "hover:bg-white/10 text-gray-300"
                  }`}
              >
                <MessageCircle size={18} />
                <span className="hidden md:block font-mono text-xs font-bold tracking-widest">
                  CHAT
                </span>
                {presentUsers.length > 1 && (
                  <span className="ml-1 bg-purple-500 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {presentUsers.length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 🟠 MODALE ACHAT DE TEMPS 🟠 */}
      <AnimatePresence>
        {showBuyTimeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-sm w-full bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-6 text-center space-y-6"
            >
              <Clock size={48} className="mx-auto text-[#D4AF37]" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {lang === "fr" ? "ACHETER DU TEMPS" : "BUY TIME"}
                </h2>
                <p className="text-gray-400 text-sm">
                  {lang === "fr"
                    ? "Achetez des secondes supplémentaires en utilisant vos Cauris."
                    : "Buy extra seconds using your Cauris."}
                </p>
              </div>
              <div className="bg-black/50 p-4 rounded-xl flex items-center justify-between border border-white/10">
                <span className="font-mono text-[#D4AF37] font-bold text-xl">
                  +{outroConfig?.time_economy?.buy_seconds || 60}s
                </span>
                <span className="text-gray-500">=</span>
                <span className="font-mono text-red-400 font-bold flex items-center gap-1">
                  -{outroConfig?.time_economy?.buy_cost || 50}{" "}
                  <CaurisIcon className="w-4 h-4" />
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBuyTimeModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBuyTime}
                  className="flex-1 py-3 bg-[#D4AF37] hover:bg-white text-black rounded-xl text-sm font-bold transition-colors shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 POPUP GAIN DE TEMPS GRATUIT 🟢 */}
      <AnimatePresence>
        {timeRewardPopup !== null && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[80] bg-green-500/90 text-black px-6 py-2 rounded-full font-mono font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.8)] flex items-center gap-2 pointer-events-none"
          >
            <Clock size={20} />+{timeRewardPopup} SEC
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 ALERTE TEMPS ÉCOULÉ (GAME OVER) 🔴 */}
      {showTimeOver && (
        <InvestigationOutro
          investigation={investigation}
          lang={lang}
          solvedEnigmas={session?.solved_enigmas || []}
          totalEnigmas={chapters.flatMap((c) => c.enigmas || []).length}
          collectedEvidences={session?.collected_evidences || []}
          totalEvidences={evidences.length}
          config={outroConfig}
          isTimeout={true}
          onReplay={handleReplay}
          onExit={() => router.push("/investigations")}
        />
      )}

      {/* 🟡 MENU D'ABANDON (PAUSE) 🟡 */}
      <AnimatePresence>
        {showAbortMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-md w-full bg-[#111] border border-yellow-500/30 rounded-2xl p-6 text-center space-y-6"
            >
              <AlertTriangle size={48} className="mx-auto text-yellow-500" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {lang === "fr"
                    ? "SUSPENDRE L'ENQUÊTE"
                    : "SUSPEND INVESTIGATION"}
                </h2>
                <p className="text-gray-400 text-sm italic">
                  "
                  {lang === "fr"
                    ? outroConfig?.abandons?.length > 0
                      ? outroConfig.abandons[
                        Math.floor(
                          Math.random() * outroConfig.abandons.length,
                        )
                      ].text_fr
                      : "Vous abandonnez ?"
                    : outroConfig?.abandons?.length > 0
                      ? outroConfig.abandons[
                        Math.floor(
                          Math.random() * outroConfig.abandons.length,
                        )
                      ].text_en
                      : "Giving up?"}
                  "
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowAbortMenu(false);
                    // ✅ REDÉMARRER LE TIMER D'ÉNIGME
                    if (enigmaTimerSeconds !== null && enigmaTimerSeconds > 0) {
                      setEnigmaTimerActive(true);
                    }
                  }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  {lang === "fr" ? "Reprendre la partie" : "Resume game"}
                </button>
                <button
                  onClick={handleReplay}
                  className="w-full py-3 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-500/30 rounded-xl text-sm font-bold transition-colors"
                >
                  {lang === "fr"
                    ? "Rejouer depuis le début"
                    : "Restart from beginning"}
                </button>
                <button
                  onClick={async () => {
                    setIsSavingSession(true);
                    setSaveProgress(0);
                    setShowAbortMenu(false);

                    try {
                      // Étape 1 : Mots mêlés (25%)
                      setSaveProgress(25);
                      await new Promise((resolve) => setTimeout(resolve, 400));

                      // Étape 2 : Budget (50%)
                      // Étape 2 : Budget (50%)
                      setSaveProgress(50);
                      if (session?.id) {
                        await supabase
                          .from("investigation_sessions")
                          .update({
                            word_search_progress: wordSearchProgress,
                            word_search_attempts: wordSearchAttempts,
                          })
                          .eq("id", session.id);
                      }
                      await new Promise((resolve) => setTimeout(resolve, 400));

                      // Étape 3 : Progression (75%)
                      setSaveProgress(75);
                      if (session?.id) {
                        await supabase
                          .from("investigation_sessions")
                          .update({
                            current_cauris: budgetCauris,
                            last_played_at: new Date().toISOString(),
                          })
                          .eq("id", session.id);
                      }
                      await new Promise((resolve) => setTimeout(resolve, 400));

                      // Étape 4 : Fin (100%)
                      setSaveProgress(100);
                      await new Promise((resolve) => setTimeout(resolve, 600));

                      // Redirection
                      router.push("/investigations");
                    } catch (err) {
                      console.error("Save error:", err);
                      setIsSavingSession(false);
                    }
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  disabled={isSavingSession}
                >
                  {isSavingSession ? (
                    <>
                      <Loader2 size={14} className="inline animate-spin mr-2" />
                      {lang === "fr" ? "Sauvegarde..." : "Saving..."}
                    </>
                  ) : lang === "fr" ? (
                    "Quitter le jeu (Sauvegarder)"
                  ) : (
                    "Quit and Save"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💡 TOAST INDICE DÉBLOQUÉ */}
      <AnimatePresence>
        {clueToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-24 left-1/2 z-[80] bg-blue-500/90 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center gap-3 pointer-events-none"
          >
            <span>{clueToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 TOAST D'ENCOURAGEMENT (PALIERS) 🟢 */}
      <AnimatePresence>
        {activeMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-24 md:bottom-10 left-1/2 z-[80] bg-[#D4AF37]/90 text-black px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(212,175,55,0.5)] flex items-center gap-3"
          >
            <Trophy size={18} />
            <span>
              {lang === "fr" ? activeMilestone.fr : activeMilestone.en}
            </span>
          </motion.div>
        )}
      </AnimatePresence>



      {activeUI === "mission" && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="absolute z-30 bottom-24 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-24 md:w-[600px] bg-black/90 backdrop-blur-xl border border-green-500/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        >
          <div className="bg-green-500/20 px-4 py-3 flex items-center justify-between border-b border-green-500/30">
            <span className="font-mono text-xs text-green-400 tracking-widest font-bold flex items-center gap-2">
              <Target size={14} />{" "}
              {lang === "fr" ? "MISSION ACTUELLE" : "CURRENT MISSION"}
            </span>
            <button
              onClick={() => setActiveUI(null)}
              className="text-green-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Nom de la scène */}
            <div className="text-center pb-4 border-b border-white/10">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">
                {lang === "fr" ? "Scène actuelle" : "Current scene"}
              </p>
              <h3 className="text-lg font-serif font-bold text-white">
                {lang === "fr" ? currentScene?.title_fr : currentScene?.title_en || currentScene?.title_fr}
              </h3>
            </div>

            {/* Mission principale */}
            {(currentScene?.mission_fr || currentScene?.mission_en) && (
              <div className="bg-green-900/10 p-4 rounded-xl border border-green-500/20">
                <p className="text-green-400 text-xs font-mono uppercase tracking-widest mb-2">
                  {lang === "fr" ? "🎯 Mission" : "🎯 Mission"}
                </p>
                <p className="text-gray-200 text-sm leading-relaxed font-serif">
                  {lang === "fr"
                    ? currentScene.mission_fr
                    : currentScene.mission_en || currentScene.mission_fr}
                </p>
              </div>
            )}

            {/* Objectifs */}
            {(currentScene?.mission_objectives_fr || []).length > 0 && (
              <div>
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-3">
                  {lang === "fr" ? "Objectifs" : "Objectives"}
                </p>
                <div className="space-y-2">
                  {(currentScene.mission_objectives_fr || []).map((obj: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="w-5 h-5 rounded border-2 border-green-500/50 flex items-center justify-center">
                        {/* Case à cocher (non interactive pour l'instant) */}
                        <div className="w-2.5 h-2.5 rounded-sm bg-green-500/20" />
                      </div>
                      <span className="text-gray-300 text-sm">
                        {lang === "fr"
                          ? obj
                          : (currentScene.mission_objectives_en || [])[idx] || obj}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indice */}
            {(currentScene?.mission_hint_fr || currentScene?.mission_hint_en) && (
              <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20">
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-2 flex items-center gap-1">
                  💡 {lang === "fr" ? "Indice" : "Hint"}
                </p>
                <p className="text-gray-300 text-sm italic font-serif">
                  {lang === "fr"
                    ? currentScene.mission_hint_fr
                    : currentScene.mission_hint_en || currentScene.mission_hint_fr}
                </p>
              </div>
            )}

            {/* Si aucune mission */}
            {!currentScene?.mission_fr && (!currentScene?.mission_objectives_fr || currentScene.mission_objectives_fr.length === 0) && (
              <div className="text-center py-10 text-gray-600 font-mono text-sm">
                <Target size={32} className="mx-auto mb-2 opacity-50" />
                {lang === "fr" ? "Aucune mission pour cette scène" : "No mission for this scene"}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* PANNEAUX DYNAMIQUES COMPLETS */}
      <AnimatePresence>
        {activeUI === "story" && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute z-30 bottom-24 inset-x-4 md:inset-x-auto md:left-8 md:top-24 md:bottom-24 md:w-[400px] bg-black/80 backdrop-blur-xl border border-[#06b6d4]/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="bg-[#06b6d4]/20 px-4 py-3 flex items-center justify-between border-b border-[#06b6d4]/30">
              <span className="font-mono text-xs text-[#06b6d4] tracking-widest font-bold flex items-center gap-2">
                <BookOpen size={14} />{" "}
                {lang === "fr" ? "DONNÉES HISTORIQUES" : "HISTORICAL DATA"}
              </span>
              <button onClick={() => setActiveUI(null)} className="text-[#06b6d4] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8">

              {/* ✅ BLOC 1 : Contexte Global (Chapitre) */}
              {chapNarrative && (
                <div>
                  <h3 className="text-[#06b6d4] font-bold font-mono text-[10px] uppercase tracking-widest mb-3 border-b border-[#06b6d4]/30 pb-2">
                    {lang === "fr" ? "Contexte Global" : "Global Context"}
                  </h3>
                  <div className="font-serif text-gray-200 leading-relaxed text-sm md:text-base">
                    {chapNarrative}
                  </div>
                </div>
              )}

              {/* ✅ BLOC 2 : Archives du Lieu (Scène actuelle) */}
              {(currentScene?.historical_context_fr || currentScene?.historical_context_en) && (
                <div>
                  <h3 className="text-[#D4AF37] font-bold font-mono text-[10px] uppercase tracking-widest mb-3 border-b border-[#D4AF37]/30 pb-2">
                    {lang === "fr" ? `Archives du lieu : ${sceneTitle}` : `Location Archives: ${sceneTitle}`}
                  </h3>
                  <div className="font-serif text-gray-200 leading-relaxed text-sm md:text-base">
                    {lang === "fr" ? currentScene.historical_context_fr : currentScene.historical_context_en || currentScene.historical_context_fr}
                  </div>
                </div>
              )}

              {/* Si rien n'est configuré */}
              {!chapNarrative && !currentScene?.historical_context_fr && (
                <span className="text-gray-500 font-mono italic block text-center mt-10">
                  -- {lang === "fr" ? "AUCUNE DONNÉE" : "NO DATA"} --
                </span>
              )}
            </div>
          </motion.div>
        )}

        {activeUI === "enigmas" && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute z-30 bottom-24 inset-x-4 md:inset-x-auto md:right-8 md:top-24 md:bottom-24 md:w-[450px] bg-[#05050A]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.1)]"
          >
            <div className="bg-[#D4AF37]/10 px-4 py-3 flex items-center justify-between border-b border-[#D4AF37]/30">
              <span className="font-mono text-xs text-[#D4AF37] tracking-widest font-bold flex items-center gap-2">
                <Target size={14} />{" "}
                {lang === "fr" ? "DÉCRYPTAGE" : "DECRYPTION"}
              </span>


              {/* ✅ NOUVEAU : Afficher le timer d'énigme si actif */}
              {enigmaTimerSeconds !== null && enigmaTimerActive && (
                <motion.div
                  animate={{ scale: enigmaTimerSeconds <= 10 ? [1, 1.1, 1] : 1 }}
                  transition={{
                    repeat: enigmaTimerSeconds <= 10 ? Infinity : 0,
                    duration: 0.5,
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold border ${enigmaTimerSeconds <= 10
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : enigmaTimerSeconds <= 30
                      ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                      : "bg-black/50 border-white/20 text-white"
                    }`}
                >
                  <Clock size={12} />
                  {Math.floor(enigmaTimerSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(enigmaTimerSeconds % 60).toString().padStart(2, "0")}
                </motion.div>
              )}
              <button
                onClick={() => setActiveUI(null)}
                className="text-[#D4AF37] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-6">



              {/* ✅ Si la scène a des énigmes avec timer, initialiser le timer */}
              {(() => {
                const enigmaWithTimer = allChapterEnigmas.find((e: any) => {
                  const isSolved = session?.solved_enigmas?.includes(`enigma_${e.id}_solved`); // ✅ Ajoute cette ligne
                  return (
                    !isSolved &&
                    e.enigma_timer_seconds &&
                    e.enigma_timer_seconds > 0
                  );
                });

                if (enigmaWithTimer && activeEnigmaId === null && enigmaTimerSeconds === null) {
                  setTimeout(() => {
                    setActiveEnigmaId(enigmaWithTimer.id);
                    setEnigmaTimerSeconds(enigmaWithTimer.enigma_timer_seconds);
                    setEnigmaTimerActive(true);
                  }, 500);
                }
                return null;
              })()}

              {allChapterEnigmas.length > 0 ? (
                allChapterEnigmas.map((enigma, idx) => {
                  const isSolved = session?.solved_enigmas?.includes(
                    `enigma_${enigma.id}_solved`,
                  );

                  const isWrong = wrongEnigmaIds.includes(enigma.id); // ✅ NOUVEAU
                  const question =
                    lang === "fr" ? enigma.question_fr : enigma.question_en;
                  const responseType = enigma.response_type || 'text';
                  const linkedEvidence = enigma.evidence_id
                    ? evidences.find(e => e.id === enigma.evidence_id)
                    : null;

                  return (
                    <div
                      key={enigma.id}
                      onClick={() => {
                        // ✅ Quand on clique sur une énigme, démarrer son timer
                        if (!isSolved && enigma.enigma_timer_seconds && enigma.enigma_timer_seconds > 0) {
                          if (activeEnigmaId !== enigma.id) {
                            setActiveEnigmaId(enigma.id);
                            setEnigmaTimerSeconds(enigma.enigma_timer_seconds);
                            setEnigmaTimerActive(true);
                          }
                        }
                      }}
                      className={`p-4 rounded-xl border font-mono ${isSolved
                        ? "bg-green-900/10 border-green-500/30"
                        : isWrong
                          ? "bg-red-900/20 border-red-500/50 animate-pulse"
                          : "bg-black/50 border-white/10 cursor-pointer hover:border-[#D4AF37]/50"
                        }`}
                    >


                      {/* Question */}
                      <p
                        className={`text-sm mb-4 ${isSolved ? "text-green-400" : "text-gray-300"}`}
                      >
                        <span className="text-[#D4AF37] mr-2">[{idx + 1}]</span>{" "}
                        {question}
                      </p>

                      {isSolved ? (
                        <div className="text-green-500 text-xs tracking-widest flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded">
                          <CheckCircle size={14} /> Correct
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* ── AFFICHER LA PREUVE MÉDIA (image/audio/doc) ── */}
                          {linkedEvidence && (
                            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                              {linkedEvidence.media_type === 'image' ? (
                                /* IMAGE avec zoom/dézoom ET navigation (pan) */
                                <div className="relative bg-black rounded-lg border border-white/10 mb-3">
                                  <div
                                    className="overflow-auto rounded-lg"
                                    style={{
                                      height: '12rem',
                                      scrollbarWidth: 'none',
                                      cursor: zoomLevel > 1 ? 'grab' : 'default'
                                    }}
                                    onMouseDown={(e) => {
                                      if (zoomLevel <= 1) return;
                                      e.preventDefault();
                                      const container = e.currentTarget;
                                      container.style.cursor = 'grabbing';
                                      const startX = e.pageX;
                                      const startY = e.pageY;
                                      const scrollLeft = container.scrollLeft;
                                      const scrollTop = container.scrollTop;

                                      const handleMove = (ev: MouseEvent) => {
                                        container.scrollLeft = scrollLeft - (ev.pageX - startX);
                                        container.scrollTop = scrollTop - (ev.pageY - startY);
                                      };

                                      const handleUp = () => {
                                        container.style.cursor = 'grab';
                                        window.removeEventListener('mousemove', handleMove);
                                        window.removeEventListener('mouseup', handleUp);
                                      };

                                      window.addEventListener('mousemove', handleMove);
                                      window.addEventListener('mouseup', handleUp);
                                    }}
                                  >
                                    <img
                                      src={linkedEvidence.media_url}
                                      alt="Preuve"
                                      draggable={false}
                                      className="select-none block"
                                      style={{
                                        width: zoomLevel > 1 ? `${zoomLevel * 100}%` : undefined,
                                        maxWidth: zoomLevel === 1 ? '100%' : 'none',
                                        height: zoomLevel > 1 ? 'auto' : undefined,
                                        maxHeight: zoomLevel === 1 ? '11.5rem' : 'none',
                                        objectFit: zoomLevel === 1 ? 'contain' : undefined,
                                        margin: '0 auto'
                                      }}
                                    />
                                  </div>

                                  {/* Contrôles zoom */}
                                  <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                                    <button
                                      onClick={() => setZoomLevel(z => Math.max(1, z - 0.5))}
                                      className="p-1.5 bg-black/70 rounded text-white hover:bg-black/90 text-xs font-bold backdrop-blur-sm border border-white/10"
                                    >
                                      −
                                    </button>
                                    <button
                                      onClick={() => setZoomLevel(z => Math.min(5, z + 0.5))}
                                      className="p-1.5 bg-black/70 rounded text-white hover:bg-black/90 text-xs font-bold backdrop-blur-sm border border-white/10"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-gray-600 mt-2 text-center">
                                    🔍 Zoomez et glissez pour examiner
                                  </p>
                                </div>
                              ) : linkedEvidence.media_type === 'audio' ? (
                                /* AUDIO */
                                <div className="mb-3">
                                  <audio
                                    src={linkedEvidence.media_url}
                                    controls
                                    className="w-full"
                                  />
                                  <p className="text-[10px] text-gray-600 mt-2">
                                    🎵 Écoutez attentivement et trouvez la réponse
                                  </p>
                                </div>
                              ) : (
                                /* DOCUMENT / AUTRE */
                                <div className="mb-3 p-3 bg-blue-900/20 rounded border border-blue-500/20">
                                  <p className="text-[10px] text-blue-400 mb-2">📄 Document</p>
                                  <a
                                    href={linkedEvidence.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-500 underline hover:text-blue-300"
                                  >
                                    Ouvrir le document
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── MODE TEXTE : Input simple ── */}
                          {responseType === 'text' ? (
                            <div className="space-y-3">
                              <div className="flex border-b border-[#D4AF37]/50 focus-within:border-[#D4AF37] transition-colors pb-1">
                                <span className="text-[#D4AF37] mr-2">{">"}</span>
                                <input
                                  type="text"
                                  data-enigma={enigma.id}
                                  placeholder="ENTREZ LA CLÉ..."
                                  className="bg-transparent w-full text-white text-sm outline-none placeholder:text-gray-700 uppercase"
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && checkAnswer(enigma)
                                  }
                                />
                              </div>
                              <button
                                onClick={() => checkAnswer(enigma)}
                                className="w-full bg-[#D4AF37] hover:bg-white text-black text-[10px] font-bold px-4 py-1.5 rounded transition-colors"
                              >
                                EXÉCUTER
                              </button>
                            </div>
                          ) : (
                            /* ── MODE CHOIX MULTIPLES ── */
                            <div className="space-y-2">
                              {(enigma.choices_fr || []).map((choice: string, choiceIdx: number) => (
                                <label
                                  key={choiceIdx}
                                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                  <input
                                    type="radio"
                                    name={`enigma-choice-${enigma.id}`}
                                    value={choiceIdx}
                                    className="w-4 h-4 accent-[#D4AF37]"
                                  />
                                  <span className="text-sm text-gray-300">
                                    {lang === "fr"
                                      ? choice
                                      : (enigma.choices_en || [])[choiceIdx] || choice}
                                  </span>
                                </label>
                              ))}
                              <button
                                onClick={() => checkAnswer(enigma)}
                                className="w-full bg-[#D4AF37] hover:bg-white text-black text-[10px] font-bold px-4 py-2 rounded transition-colors mt-2"
                              >
                                {lang === "fr" ? "VALIDER" : "SUBMIT"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {/* ✅ INDICES PAYANTS - TOUJOURS VISIBLES */}
                      {(() => {
                        // ✅ FIX : Chercher dans allChapterEnigmas au lieu de currentChapter.enigmas
                        const enigmaClues = allChapterEnigmas.find((e: any) => e.id === enigma.id)?.clues || [];
                        if (enigmaClues.length === 0 || isSolved) return null;

                        const attempts = enigmaAttempts[enigma.id] || 0;
                        const autoRevealAfter = outroConfig?.game_economy?.auto_reveal_after || 3;

                        return (
                          <div className="mt-4 space-y-3 border-t border-blue-500/20 pt-4">
                            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-wider flex items-center gap-1 font-bold">
                              💡 {lang === "fr" ? "Indices disponibles" : "Available Clues"}
                            </p>

                            {enigmaClues.map((clue: any, clueIdx: number) => {
                              const isRevealed = revealedClues.includes(clue.id);
                              const clueText = lang === "fr" ? clue.text_fr : clue.text_en || clue.text_fr;
                              const clueCost = clue.reveal_cost_cauris ?? 5;
                              const errorsUntilAuto = isRevealed ? 0 : autoRevealAfter - (attempts % autoRevealAfter);

                              return (
                                <div
                                  key={clue.id}
                                  className={`p-3 rounded-lg text-xs border ${isRevealed
                                    ? "bg-blue-900/20 border-blue-500/30"
                                    : "bg-black/40 border-white/10"
                                    }`}
                                >
                                  {isRevealed ? (
                                    <div className="space-y-2">
                                      {/* TEXTE RÉVÉLÉ */}
                                      <p className="font-serif italic leading-relaxed text-blue-300">
                                        <span className="text-blue-400 font-mono mr-1">
                                          [{clueIdx + 1}]
                                        </span>
                                        {clueText}
                                      </p>
                                      {/* MÉDIA SI PRÉSENT */}
                                      {clue.media_url && (
                                        <div className="mt-2 p-2 bg-blue-900/30 rounded border border-blue-500/20">
                                          {clue.media_type === "image" ? (
                                            <img src={clue.media_url} alt="Indice" className="w-full h-32 object-cover rounded border border-blue-500/30" />
                                          ) : clue.media_type === "audio" ? (
                                            <audio src={clue.media_url} controls className="w-full h-6" />
                                          ) : (
                                            <a href={clue.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-[10px]">
                                              📄 {lang === "fr" ? "Document" : "Document"}
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-400 font-mono text-[10px] block font-bold">
                                          🔒 {lang === "fr" ? `Indice ${clueIdx + 1}` : `Clue ${clueIdx + 1}`}
                                        </span>
                                        <span className="text-gray-500 text-[9px]">
                                          {lang === "fr"
                                            ? `Débloqué auto après ${errorsUntilAuto} erreur(s)`
                                            : `Auto-unlock after ${errorsUntilAuto} error(s)`}
                                        </span>
                                      </div>

                                      {/* ✅ BOUTON D'ACHAT BIEN VISIBLE */}
                                      <button
                                        onClick={() => handleRevealClue(clue.id)}
                                        disabled={budgetCauris < clueCost}
                                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${budgetCauris >= clueCost
                                          ? "bg-[#D4AF37] hover:bg-white text-black shadow-lg hover:shadow-xl"
                                          : "bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed"
                                          }`}
                                      >
                                        <span>💰</span>
                                        <span>{clueCost}</span>
                                        <CaurisIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 opacity-50 font-mono text-sm">
                  <Search className="mx-auto mb-2" size={24} />
                  {lang === "fr" ? "AUCUNE ÉNIGME" : "NO ENIGMAS"}
                </div>
              )}
              <div className="pt-4 border-t border-white/10 flex gap-2">
                {/* Retour au chapitre précédent */}
                {currentChapterIndex > 0 && (
                  <button
                    onClick={() => {
                      setCurrentChapterIndex((p) => p - 1);
                      setCurrentSceneIndex(0);
                      setActiveUI(null);
                    }}
                    className="flex-1 py-2 border border-white/20 text-gray-400 text-xs font-mono rounded hover:bg-white/10 transition-colors"
                  >
                    {"< RETOUR"}
                  </button>
                )}

                {/* ✅ FIX 5 : Chapitre suivant OU Clore l'enquête selon la position */}
                {currentChapterIndex < chapters.length - 1 ? (
                  <button
                    onClick={() => {
                      setCurrentChapterIndex((p) => p + 1);
                      setCurrentSceneIndex(0);
                      setActiveUI(null);
                    }}
                    className="flex-1 py-2 text-xs font-mono font-bold rounded bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                  >
                    {lang === "fr" ? "CHAPITRE SUIVANT →" : "NEXT CHAPTER →"}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const { data: freshProfile } = await supabase
                        .from("profiles")
                        .select("cauris")
                        .eq("id", user.id)
                        .single();

                      const currentCauris = freshProfile?.cauris || 0;
                      const totalReward =
                        budgetCauris + (investigation.reward_cauris || 0);

                      if (totalReward > 0 && user) {
                        await supabase
                          .from("profiles")
                          .update({ cauris: currentCauris + totalReward })
                          .eq("id", user.id);
                      }
                      await completeInvestigation();
                      setShowOutro(true);
                    }}
                    className="flex-1 py-2 text-xs font-mono font-bold rounded bg-[#D4AF37] text-black hover:bg-white transition-colors"
                  >
                    ✦{" "}
                    {lang === "fr" ? "CLORE L'ENQUÊTE" : "CLOSE INVESTIGATION"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeUI === "inventory" && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute z-30 bottom-24 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-24 md:w-[600px] h-64 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/10">
              <span className="font-mono text-xs text-white tracking-widest font-bold flex items-center gap-2">
                <Briefcase size={14} />{" "}
                {lang === "fr" ? "PREUVES COLLECTÉES" : "COLLECTED EVIDENCE"}
              </span>
              <button
                onClick={() => setActiveUI(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {(session?.collected_evidences?.length || 0) > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                  {(session?.collected_evidences || []).map((eid) => {
                    const ev = evidences.find((e) => e.id === eid);
                    if (!ev) return null;
                    return (
                      <div
                        key={eid}
                        onClick={() => {
                          setActiveEvidence(ev);
                          setActiveHotspot(null);
                        }}
                        className="aspect-square rounded-xl overflow-hidden border border-white/20 cursor-pointer hover:border-[#06b6d4] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all bg-white/5 flex items-center justify-center relative group"
                      >
                        {ev.media_type === "image" ? (
                          <img
                            src={ev.media_url}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="text-2xl">
                            {ev.media_type === "audio" ? "🎵" : "📄"}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Search size={20} className="text-white" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 font-mono text-xs">
                  <Briefcase size={32} className="mb-2 opacity-50" />
                  {lang === "fr" ? "VIDE" : "EMPTY"}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeUI === "chat" && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute z-30 bottom-24 inset-x-4 md:inset-x-auto md:right-8 md:top-24 md:bottom-24 md:w-[420px] bg-black/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="bg-purple-500/20 px-4 py-3 flex items-center justify-between border-b border-purple-500/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-purple-400" />
                <span className="font-mono text-xs text-purple-400 tracking-widest font-bold">
                  {lang === "fr" ? "COMMUNICATIONS" : "COMMUNICATIONS"}
                </span>
                {presentUsers.length > 1 && (
                  <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full">
                    {presentUsers.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveUI(null)}
                className="text-purple-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Liste des membres du groupe (connectés / hors ligne) ── */}
            {session?.group_id && (
              <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                  {lang === "fr" ? "Membres" : "Members"} ({groupMembers.length}
                  )
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map((member: any) => {
                    const isOnline = presentUsers.some(
                      (u) => u.user_id === member.user_id,
                    );
                    const profile = member.profiles;
                    const character = member.investigation_characters;
                    const avatarUrl =
                      profile?.avatar_url || character?.avatar_url;
                    const name =
                      profile?.full_name || profile?.username || "Joueur";
                    const role =
                      lang === "fr"
                        ? character?.role
                        : character?.role_en || character?.role;

                    return (
                      <div
                        key={member.user_id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] ${isOnline
                          ? "bg-green-500/10 border-green-500/20 text-green-300"
                          : "bg-white/5 border-white/10 text-gray-500"
                          }`}
                      >
                        {/* Avatar */}
                        <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <UserIcon size={10} className="text-gray-500" />
                            </div>
                          )}
                          {/* Point vert/gris */}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${isOnline ? "bg-green-400" : "bg-gray-600"
                              }`}
                          />
                        </div>

                        <span className="font-bold max-w-[60px] truncate">
                          {name}
                        </span>

                        {role && (
                          <span className="opacity-60 hidden sm:inline truncate max-w-[50px]">
                            ({role})
                          </span>
                        )}

                        {member.is_group_creator && (
                          <span className="text-[#D4AF37] text-[8px]">★</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-center font-mono text-xs">
                  {lang === "fr" ? "Aucun message" : "No messages"}
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCharacterMessage = !!msg.character_id;
                  const avatarUrl = isCharacterMessage
                    ? msg.character?.avatar_url
                    : msg.profiles?.avatar_url;
                  const senderName = isCharacterMessage
                    ? lang === "fr"
                      ? msg.character?.name_fr
                      : msg.character?.name_en
                    : msg.profiles?.full_name || "Anon";
                  const roleName = isCharacterMessage
                    ? lang === "fr"
                      ? msg.character?.role
                      : msg.character?.role_en
                    : "";
                  const isSystem = msg.type === "system";
                  const isMyMessage = msg.user_id === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`group relative text-xs ${isSystem ? "text-center" : ""}`}
                    >
                      {/* Message cité (réponse) */}
                      {msg.repliedToMessage && (
                        <div className="mb-1 ml-7 px-2 py-1 bg-white/5 border-l-2 border-purple-400/50 rounded text-[10px] text-gray-500 line-clamp-1">
                          <span className="text-purple-400 font-bold mr-1">
                            ↩
                          </span>
                          {msg.repliedToMessage.content}
                        </div>
                      )}

                      {!isSystem && (
                        <div
                          className={`flex items-start gap-2 ${isMyMessage ? "flex-row-reverse" : ""}`}
                        >
                          {/* Avatar */}
                          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon
                                size={10}
                                className="m-auto mt-1 text-gray-500"
                              />
                            )}
                          </div>

                          <div
                            className={`flex-1 ${isMyMessage ? "items-end" : "items-start"} flex flex-col`}
                          >
                            {/* Nom */}
                            <div
                              className={`flex items-center gap-1 mb-0.5 ${isMyMessage ? "flex-row-reverse" : ""}`}
                            >
                              <span className="font-bold text-purple-400 text-[10px]">
                                {senderName}
                              </span>
                              {roleName && (
                                <span className="text-[9px] text-purple-300/40">
                                  ({roleName})
                                </span>
                              )}
                            </div>

                            {/* Bulle de message */}
                            <div
                              className={`relative max-w-[85%] px-3 py-2 rounded-2xl text-xs ${isMyMessage
                                ? "bg-purple-600/30 text-white rounded-tr-none"
                                : "bg-white/5 text-gray-200 rounded-tl-none"
                                }`}
                            >
                              {msg.content}

                              {/* Boutons d'action (survol desktop / toujours visible mobile) */}
                              <div
                                className={`absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMyMessage
                                  ? "right-full mr-1"
                                  : "left-full ml-1"
                                  }`}
                              >
                                {/* Répondre */}
                                <button
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    setShowEmojiPicker(null);
                                  }}
                                  className="p-1 bg-black/60 rounded-full text-gray-400 hover:text-white transition-colors"
                                  title={lang === "fr" ? "Répondre" : "Reply"}
                                >
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M9 17l-5-5 5-5M20 18v-2a4 4 0 00-4-4H4" />
                                  </svg>
                                </button>

                                {/* Réagir */}
                                <button
                                  onClick={() =>
                                    setShowEmojiPicker(
                                      showEmojiPicker === msg.id
                                        ? null
                                        : msg.id,
                                    )
                                  }
                                  className="p-1 bg-black/60 rounded-full text-gray-400 hover:text-white transition-colors"
                                  title={lang === "fr" ? "Réagir" : "React"}
                                >
                                  <span className="text-[10px]">...</span>
                                </button>
                              </div>

                              {/* Picker d'emojis */}
                              {showEmojiPicker === msg.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`absolute z-50 bottom-full mb-1 bg-[#111] border border-white/10 rounded-xl p-2 shadow-2xl ${isMyMessage ? "right-0" : "left-0"
                                    }`}
                                >
                                  {/* Emojis prédéfinis */}
                                  <div className="flex gap-1 mb-2">
                                    {PRESET_EMOJIS.map((emoji) => {
                                      const hasReacted = msg.reactions?.find(
                                        (r) =>
                                          r.emoji === emoji && r.hasUserReacted,
                                      );
                                      return (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            addReaction(msg.id, emoji);
                                            setShowEmojiPicker(null);
                                          }}
                                          className={`text-lg hover:scale-125 transition-transform p-1 rounded-lg ${hasReacted
                                            ? "bg-purple-500/20"
                                            : "hover:bg-white/10"
                                            }`}
                                        >
                                          {emoji}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Emoji personnalisé */}
                                  <div className="flex gap-1 border-t border-white/10 pt-2">
                                    <input
                                      type="text"
                                      value={customEmojiInput}
                                      onChange={(e) =>
                                        setCustomEmojiInput(e.target.value)
                                      }
                                      placeholder={
                                        lang === "fr" ? "Emoji…" : "Emoji…"
                                      }
                                      className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                                      maxLength={2}
                                    />
                                    <button
                                      onClick={() => {
                                        if (customEmojiInput.trim()) {
                                          addReaction(
                                            msg.id,
                                            customEmojiInput.trim(),
                                          );
                                          setCustomEmojiInput("");
                                          setShowEmojiPicker(null);
                                        }
                                      }}
                                      className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold"
                                    >
                                      OK
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Réactions affichées */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div
                                className={`flex flex-wrap gap-1 mt-1 ${isMyMessage ? "justify-end" : ""}`}
                              >
                                {msg.reactions.map((reaction) => (
                                  <button
                                    key={reaction.emoji}
                                    onClick={() =>
                                      addReaction(msg.id, reaction.emoji)
                                    }
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${reaction.hasUserReacted
                                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                      }`}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span className="font-bold">
                                      {reaction.count}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Message système */}
                      {isSystem && (
                        <p className="text-gray-500 text-[10px] font-mono">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* ── Bannière "En réponse à" ── */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="px-4 py-2 bg-purple-500/10 border-t border-purple-500/20 flex items-center gap-2 flex-shrink-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-purple-400 font-bold">
                      ↩ {lang === "fr" ? "En réponse à" : "Replying to"}{" "}
                      {replyingTo.profiles?.full_name || "Anon"}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-600 hover:text-white flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input d'envoi ── */}
            <div className="px-4 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  lang === "fr" ? "Entrez un message..." : "Type a message..."
                }
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 placeholder:text-gray-600"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}


        {activeUI === "deduction" && (
          <DeductionPanel
            timeline={timeline}
            board={board}
            availableEvidences={availableEvidences(evidences)}
            validatedDeductions={(session as any)?.validated_deductions || []}
            notifications={deductionNotifications}
            lang={lang}
            onClose={() => setActiveUI(null)}
            onValidateTimelineSlot={validateTimelineSlot}
            onValidateBoardConnection={validateBoardConnection}
            onDismissNotification={dismissNotification}
            isTimelineSlotValidated={isTimelineSlotValidated}
            isBoardConnectionValidated={isBoardConnectionValidated}
          />
        )}
      </AnimatePresence>





      {activeUI === "wordsearch" && currentWordSearch && (
        <WordSearchGame
          wordSearch={currentWordSearch}
          lang={lang}
          savedProgress={wordSearchProgress[currentWordSearch.id] || []}
          clues={currentWordSearch.word_search_clues || []}
          budgetCauris={budgetCauris}
          revealedClues={revealedClues}
          attempts={wordSearchAttempts[currentWordSearch.id] || 0}
          maxAttempts={currentWordSearch.max_attempts || 0}
          onMaxAttemptsReached={async (behavior: string) => {
            // Déterminer le message selon le comportement
            let systemMessage = "";
            const attemptBehavior = currentWordSearch.attempt_behavior || 'alert';

            if (attemptBehavior === 'pause') {
              systemMessage = lang === "fr"
                ? "⏸️ Vous avez atteint la limite d'essais. Le jeu de mots mêlés est maintenant suspendu."
                : "⏸️ You have reached the attempt limit. Word search game is now paused.";
            } else if (attemptBehavior === 'end_game') {
              systemMessage = lang === "fr"
                ? "💀 Limite d'essais atteinte ! Le jeu se termine."
                : "💀 Attempt limit reached! Game is ending.";
            } else {
              systemMessage = lang === "fr"
                ? "⚠️ Vous avez atteint la limite d'essais."
                : "⚠️ You have reached the attempt limit.";
            }

            sendChatMessage(systemMessage, "system", selectedCharacterId || undefined);

            // Déclencher l'événement narratif si configuré
            if (currentWordSearch.trigger_event_on_max_attempts) {
              triggerNarrativeEvent(currentWordSearch.trigger_event_on_max_attempts);
            }

            // Appliquer le comportement du timer
            switch (currentWordSearch.attempt_behavior || 'alert') {
              case 'pause':
                // ⏸️ Pause : le jeu de mots mêlés est bloqué
                sendChatMessage(
                  lang === "fr"
                    ? "⏸️ Le jeu de mots mêlés est suspendu."
                    : "⏸️ Word search game is paused.",
                  "system"
                );
                break;

              case 'end_game':
                // 🔴 Fin de jeu
                setShowContextualEnding({
                  title: lang === "fr" ? "LIMITE D'ESSAIS" : "ATTEMPT LIMIT",
                  message:
                    lang === "fr"
                      ? "Vous avez dépassé le nombre d'essais autorisés."
                      : "You exceeded the allowed number of attempts.",
                  type: "alternate",
                });
                break;

              case 'alert':
              default:
                // 💡 Juste alerte : le jeu continue
                break;
            }
          }}
          onRevealClue={async (clueId: string, cost: number) => {
            if (budgetCauris < cost) {
              setClueToast(
                lang === "fr"
                  ? "❌ Fonds insuffisants !"
                  : "❌ Not enough Cauris!",
              );
              setTimeout(() => setClueToast(null), 3000);
              return;
            }
            const newBudget = budgetCauris - cost;
            const newRevealed = [...revealedClues, clueId];
            setBudgetCauris(newBudget);
            setCaurisDelta(`-${cost}`);
            setTimeout(() => setCaurisDelta(null), 1200);
            setRevealedClues(newRevealed);
            setClueToast(
              lang === "fr"
                ? `💡 Indice révélé (-${cost} Cauris)`
                : `💡 Clue revealed (-${cost} Cauris)`,
            );
            setTimeout(() => setClueToast(null), 3000);
            await supabase
              .from("investigation_sessions")
              .update({
                current_cauris: newBudget,
                revealed_clues: newRevealed,
              })
              .eq("id", session.id);
          }}
          onSaveProgress={(foundWords) => {
            setWordSearchProgress((prev) => {
              const newProgress = {
                ...prev,
                [currentWordSearch.id]: foundWords,
              };
              saveWordSearchProgress(newProgress);
              return newProgress;
            });
          }}
          onWordFound={(reward) => {
            const newBudget = budgetCauris + reward;
            setBudgetCauris(newBudget);
            setCaurisDelta(`+${reward}`);
            setTimeout(() => setCaurisDelta(null), 1200);
            supabase
              .from("investigation_sessions")
              .update({ current_cauris: newBudget })
              .eq("id", session.id)
              .then(({ error }) => {
                if (error) console.error('❌ Erreur sauvegarde Cauris (WS found):', error);
              });
          }}
          onBadAttempt={(penalty) => {
            if (penalty <= 0) return;
            const newBudget = Math.max(0, budgetCauris - penalty);
            setBudgetCauris(newBudget);
            setCaurisDelta(`-${penalty}`);
            setTimeout(() => setCaurisDelta(null), 1200);

            // ✅ INCRÉMENTER LES TENTATIVES
            const newAttempts = (wordSearchAttempts[currentWordSearch.id] || 0) + 1;
            setWordSearchAttempts((prev) => ({
              ...prev,
              [currentWordSearch.id]: newAttempts,
            }));

            supabase
              .from("investigation_sessions")
              .update({ current_cauris: newBudget })
              .eq("id", session.id)
              .then(({ error }) => {
                if (error) console.error('❌ Erreur sauvegarde Cauris (WS fail):', error);
              });
            if (currentWordSearch?.trigger_event_on_failure_id) {
              triggerNarrativeEvent(currentWordSearch.trigger_event_on_failure_id);
            }
          }}
          onGameComplete={async () => {
            sendChatMessage(
              "🧩 Tous les mots ont été trouvés !",
              "system",
              selectedCharacterId || undefined
            );

            // ✅ Sauvegarder le mot mêlé comme complété
            const newCompleted = [...((session as any)?.completed_word_searches || []), currentWordSearch.id];
            await supabase
              .from("investigation_sessions")
              .update({ completed_word_searches: newCompleted })
              .eq("id", session.id);



            // ✅ Effacer la progression de ce mots mêlés (car complété)
            const newProgress = { ...wordSearchProgress };
            delete newProgress[currentWordSearch.id];
            setWordSearchProgress(newProgress);
            await supabase
              .from("investigation_sessions")
              .update({ word_search_progress: newProgress })
              .eq("id", session.id);

            // ✅ Événement narratif de succès
            if (currentWordSearch?.trigger_event_on_success_id) {
              triggerNarrativeEvent(currentWordSearch.trigger_event_on_success_id);
            }

            // ✅ Navigation vers la scène/chapitre cible
            if (currentWordSearch.success_target_chapter_id) {
              const chapIdx = chapters.findIndex(c => c.id === currentWordSearch.success_target_chapter_id);
              if (chapIdx !== -1) {
                setCurrentChapterIndex(chapIdx);
                setCurrentSceneIndex(0);
              }
            } else if (currentWordSearch.success_target_scene_id && currentChapter) {
              const sceneIdx = currentChapter.scenes?.findIndex(s => s.id === currentWordSearch.success_target_scene_id);
              if (sceneIdx !== undefined && sceneIdx !== -1) {
                setCurrentSceneIndex(sceneIdx);
              }
            }

            setActiveUI(null);
          }}
        />
      )}



      <EvidenceModal
        hotspot={activeHotspot}
        evidence={activeEvidence}
        lang={lang}
        onClose={() => {
          setActiveHotspot(null);
          setActiveEvidence(null);
        }}
        onEvidenceCollected={(id) => {
          if (session) collectEvidence(id);
        }}
      />

      {/* ════════════════════════════════════════════════════
    BULLE DE DIALOGUE
════════════════════════════════════════════════════ */}
      {activeHotspot?.type === 'dialogue_bubble' && (
        <DialogueBubble
          text={lang === "fr" ? activeHotspot.dialogue_text_fr || "" : activeHotspot.dialogue_text_en || ""}
          speaker={dialogueSpeakers.find((s: any) => s.id === activeHotspot.dialogue_speaker_id)}
          style={activeHotspot.dialogue_style || 'classic_blue'}
          size={activeHotspot.dialogue_size || 'medium'}
          speed={activeHotspot.dialogue_typewriter_speed || 30}
          lang={lang}
          onClose={() => setActiveHotspot(null)}
        />
      )}

      <CharacterDialogModal
        character={activeCharacter}
        lang={lang}
        collectedEvidences={session?.collected_evidences || []}
        onClose={() => setActiveCharacter(null)}
        onEvidenceUnlocked={(evidenceId) => {
          if (session) collectEvidence(evidenceId);
        }}
        userProfile={userProfile}
        playerName={
          selectedCharacter
            ? lang === "fr"
              ? selectedCharacter.name_fr
              : selectedCharacter.name_en || selectedCharacter.name_fr
            : undefined
        }
        playerRole={
          selectedCharacter
            ? lang === "fr"
              ? selectedCharacter.role
              : selectedCharacter.role_en || selectedCharacter.role
            : ""
        }
        playerAvatarUrl={selectedCharacter?.avatar_url} // <-- AJOUT ICI : La photo de Ye Moko !
      />

      {/* ── ÉCRAN DE FIN CONTEXTUALISÉE ── */}
      {showContextualEnding && (
        <ContextualEnding
          lang={lang}
          title={showContextualEnding.title}
          message={showContextualEnding.message}
          endingType={showContextualEnding.type}
          score={contextualEndingScore}
          solvedEnigmas={solvedEnigmasCount}
          totalEnigmas={totalEnigmasCount}
          collectedEvidences={collectedEvidencesCount}
          totalEvidences={totalEvidencesCount}
          reward={investigation?.reward_cauris || 0}
          budgetCauris={budgetCauris}
          solvedWordSearches={(session as any)?.completed_word_searches?.length || 0}
          totalWordSearches={wordSearches.length}
          onReplay={handleReplay}
          onExit={() => router.push("/investigations")}
        />
      )}

      {/* ════════════════════════════════════════════════════
    MODAL REJOINDRE UN GROUPE
════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showJoinGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="w-full max-w-sm bg-[#111] border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="bg-purple-500/10 px-5 py-4 flex items-center justify-between border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  <span className="font-bold text-white text-sm">
                    {lang === 'fr' ? 'Rejoindre une partie' : 'Join a game'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowJoinGroupModal(false);
                    setJoinError(null);
                    window.history.replaceState({}, '', `/investigations/${invId}`);
                  }}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-gray-400 text-sm">
                  {lang === 'fr'
                    ? 'Entrez le code de la partie pour rejoindre vos coéquipiers :'
                    : 'Enter the game code to join your teammates:'}
                </p>

                {/* Input code */}
                <input
                  type="text"
                  value={groupCodeInput}
                  onChange={e => {
                    setGroupCodeInput(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinGroup()}
                  placeholder="LUKENI-XXXXXX"
                  className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-center font-mono font-black text-xl text-white outline-none tracking-[0.3em] transition-colors ${joinError
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                  maxLength={13}
                  autoFocus
                />

                {/* Erreur */}
                <AnimatePresence>
                  {joinError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-xs text-center font-bold"
                    >
                      ❌ {joinError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Boutons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowJoinGroupModal(false);
                      setJoinError(null);
                      window.history.replaceState({}, '', `/investigations/${invId}`);
                    }}
                    disabled={isJoining}
                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    disabled={isJoining || groupCodeInput.length < 10}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isJoining ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Users size={14} />
                    )}
                    {lang === 'fr' ? 'Rejoindre' : 'Join'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ════════════════════════════════════════════════════
          LOADING SAUVEGARDE SESSION
      ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSavingSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-6 max-w-sm w-full mx-4"
            >
              {/* Logo Cauris Animé */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-2xl opacity-50" />
                <CaurisIcon className="w-16 h-16 text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.8)] relative z-10" />
              </motion.div>

              {/* Texte */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white font-serif">
                  {lang === "fr" ? "Sauvegarde de l'enquête" : "Saving investigation"}
                </h2>
                <p className="text-sm text-gray-400 font-mono">
                  {lang === "fr" ? "Sécurisation de votre progression..." : "Securing your progress..."}
                </p>
              </div>

              {/* Barre de progression */}
              <div className="w-full space-y-3">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-[#D4AF37]/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${saveProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-yellow-400 shadow-[0_0_10px_rgba(212,175,55,0.6)]"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-mono">
                    {lang === "fr" ? "Progression" : "Progress"}
                  </span>
                  <span className="text-[#D4AF37] font-bold font-mono">{saveProgress}%</span>
                </div>
              </div>

              {/* Étapes de sauvegarde */}
              <div className="w-full space-y-2 text-xs">
                {[
                  { pct: 25, label: lang === "fr" ? "Mots mêlés" : "Word search" },
                  { pct: 50, label: lang === "fr" ? "Budget" : "Budget" },
                  { pct: 75, label: lang === "fr" ? "Progression" : "Progress" },
                  { pct: 100, label: lang === "fr" ? "Fin de session" : "Finalizing" },
                ].map((step) => (
                  <div
                    key={step.pct}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${saveProgress >= step.pct
                      ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]"
                      : "bg-white/5 border-white/10 text-gray-600"
                      }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full transition-all ${saveProgress >= step.pct
                        ? "bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.6)]"
                        : "bg-gray-600"
                        }`}
                    />
                    <span className="font-mono">{step.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── INSTRUCTIONS PANEL ── */}
      <InstructionsPanel
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        lang={lang}
        hasTimeline={!!timeline}
        hasBoard={!!board}
        timerActive={timerActive}
        hasGroup={!!session?.group_id}
      />

      {/* ── Toast "Groupe rejoint" ── */}
      <AnimatePresence>
        {joinSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[80] bg-green-500/90 text-white px-6 py-3 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(34,197,94,0.5)] pointer-events-none"
          >
            {joinSuccess}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
