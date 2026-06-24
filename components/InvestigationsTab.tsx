// components/InvestigationsTab.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  ImagePlus,
  Languages,
  FileText,
  ListOrdered,
  Save,
  FileQuestion,
  Lightbulb,
  Paperclip,
  KeyRound,
  Star,
  ChevronDown,
  ChevronUp,
  Globe,
  Music,
  Eye,
  RotateCcw,
  LogOut,
  Trophy,
  AlertTriangle,
  Zap,
  Upload,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

import { autoTranslate } from "@/lib/lingua";
import DeleteModal from "@/components/admin/shared/DeleteModal";
import PanoramaHotspotEditor from "@/components/admin/PanoramaHotspotEditor";
import InvestigationCharacters from "@/components/admin/InvestigationCharacters";
import TimelineAdmin from "@/components/admin/TimelineAdmin";
import DeductionBoardAdmin from "@/components/admin/DeductionBoardAdmin";
import InstructionsLibrary from "@/components/admin/InstructionsLibrary";
import DialogueSpeakersManager from "@/components/admin/DialogueSpeakersManager";
import InvestigationIntro from "@/components/game/InvestigationIntro";
import InvestigationOutro from "@/components/game/InvestigationOutro";
import { motion, AnimatePresence } from "framer-motion";
import WordSearchAdmin from "@/components/admin/WordSearchAdmin";

export default function InvestigationsTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [allInstructions, setAllInstructions] = useState<any[]>([]);

  // ── Niveau 1 : Dossier ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invData, setInvData] = useState({
    title_fr: "",
    title_en: "",
    desc_fr: "",
    desc_en: "",
    cover_url: "",
    difficulty: "intermediaire",
    reward: 50,
    starting_cauris: 50,
    status: "draft",
  });

  // ── Niveau 2 : Scénario ──
  const [chapters, setChapters] = useState<any[]>([]);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<
    Record<string, boolean>
  >({});

  const [introConfig, setIntroConfig] = useState<{
    background_image_url: string | null;
    audio_url: string | null;
    scroll_texts_fr: string[];
    scroll_texts_en: string[];
    text_scroll_speed: number;
    audio_volume: number;
    skip_allowed: boolean;
    visual_filter: string;
    image_effect: string;
    final_message_fr: string;
    final_message_en: string;
    final_message_icon: string;
    text_effect: string;
    typewriter_speed: number;
    text_color: string;
    text_font: string;
  } | null>(null);

  const [showIntroPreview, setShowIntroPreview] = useState(false);
  const [isTranslatingIntro, setIsTranslatingIntro] = useState(false);

  const [outroConfig, setOutroConfig] = useState<any | null>(null);
  const [showOutroPreview, setShowOutroPreview] = useState<
    | {
      isTimeout: boolean;
      title: string;
      message: string;
      color?: string;
      score?: number;
    }
    | false
  >(false);
  const [previewMilestone, setPreviewMilestone] = useState<{
    fr: string;
    en: string;
  } | null>(null);
  const rankColors = [
    "#D4AF37",
    "#60A5FA",
    "#4ADE80",
    "#9CA3AF",
    "#F59E0B",
    "#D946EF",
  ]; // Couleurs auto pour les nouveaux rangs

  const [previewAbortMsg, setPreviewAbortMsg] = useState<string | null>(null);
  const [isTranslatingOutro, setIsTranslatingOutro] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isTranslatingEvidence, setIsTranslatingEvidence] = useState<
    string | null
  >(null);

  // ── Suppression ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    table: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchInvestigations();
  }, []);

  async function fetchInvestigations() {
    setIsLoading(true);
    const { data } = await supabase
      .from("investigations")
      .select("*")
      .order("created_at", { ascending: false });
    setInvestigations(data || []);
    setIsLoading(false);
  }

  async function fetchFullScenario(invId: string) {
    const { data: chaps } = await supabase
      .from("investigation_chapters")
      .select(
        `
        *,
        enigmas:investigation_enigmas(*, clues:investigation_clues(*)),
        scenes:investigation_scenes(*)
      `,
      )
      .eq("investigation_id", invId)
      .order("step_order", { ascending: true });

    const chapsWithSortedScenes = (chaps || []).map((c: any) => ({
      ...c,
      scenes: (c.scenes || []).sort(
        (a: any, b: any) => a.scene_order - b.scene_order,
      ),
    }));

    setChapters(chapsWithSortedScenes);

    const { data: evs } = await supabase
      .from("investigation_evidences")
      .select("*");
    setEvidences(evs || []);
  }

  const resetForm = () => {
    setEditingId(null);
    setChapters([]);
    setInvData({
      title_fr: "",
      title_en: "",
      desc_fr: "",
      desc_en: "",
      cover_url: "",
      difficulty: "intermediaire",
      reward: 50,
      starting_cauris: 50,
      status: "draft",
    });
  };

  const handleEdit = async (inv: any) => {
    setEditingId(inv.id);
    setInvData({
      title_fr: inv.title_fr,
      title_en: inv.title_en || "",
      desc_fr: inv.description_fr || "",
      desc_en: inv.description_en || "",
      cover_url: inv.cover_url || "",
      difficulty: inv.difficulty || "intermediaire",
      reward: inv.reward_cauris || 50,
      starting_cauris: inv.starting_cauris || 50,
      status: inv.status || "draft",
    });

    fetchFullScenario(inv.id);

    // ✅ Charger les instructions pour la configuration du timer d'énigme
    const { data: instrs } = await supabase
      .from("investigation_instructions")
      .select("*")
      .eq("investigation_id", inv.id);
    if (instrs) {
      setAllInstructions(instrs);
    }

    // ✅ Charger la config de l'intro
    try {
      const { data: intro } = await supabase
        .from("investigation_intro_config")
        .select("*")
        .eq("investigation_id", inv.id)
        .maybeSingle();

      if (intro) {
        setIntroConfig({
          ...intro,
          final_message_fr: intro.final_message_fr || "Bonne enquête",
          final_message_en: intro.final_message_en || "Good investigation",
          final_message_icon: intro.final_message_icon || "✦",
          text_effect: intro.text_effect || "none",
          typewriter_speed: intro.typewriter_speed || 30,
          text_color: intro.text_color || "#FFFFFF",
          text_font: intro.text_font || "serif",
        });
      } else {
        setIntroConfig({
          background_image_url: null,
          audio_url: null,
          scroll_texts_fr: [],
          scroll_texts_en: [],
          text_scroll_speed: 5,
          audio_volume: 0.8,
          skip_allowed: true,
          visual_filter: "none",
          image_effect: "none",
          final_message_fr: "Bonne enquête",
          final_message_en: "Good investigation",
          final_message_icon: "✦",
          text_effect: "none",
          typewriter_speed: 30,
          text_color: "#FFFFFF",
          text_font: "serif",
        });
      }
    } catch (err) {
      console.error("Load intro config error:", err);
    }

    // ✅ Charger la config de l'outro
    try {
      const { data: outro } = await supabase
        .from("investigation_outro_config")
        .select("*")
        .eq("investigation_id", inv.id)
        .maybeSingle();
      if (outro) {
        setOutroConfig({
          ...outro,
          ranks: outro.ranks || [],
          game_overs: outro.game_overs || [],
          time_economy: outro.time_economy || {
            buy_cost: 50,
            buy_seconds: 60,
            reward_seconds: 30,
          },
          // ✅ FIX 10 : Initialisation de game_economy
          game_economy: outro.game_economy || {
            hint_cost_cauris: 5,
            auto_reveal_after: 3,
          },
          milestones: outro.milestones || [],
        });
      } else {
        setOutroConfig({
          title_fr: "ENQUÊTE TERMINÉE",
          title_en: "INVESTIGATION COMPLETE",
          ranks: [],
          game_overs: [],
          time_economy: { buy_cost: 50, buy_seconds: 60, reward_seconds: 30 },
          // ✅ FIX 10 : Valeurs par défaut
          game_economy: { hint_cost_cauris: 5, auto_reveal_after: 3 },
          abort_msg_fr: "Vous abandonnez ?",
          abort_msg_en: "Giving up?",
          milestones: [],
        });
      }
    } catch (err) {
      console.error("Load outro config error:", err);
    }
  };

  const handleSaveDossier = async () => {
    if (!invData.title_fr.trim()) return showMsg("error", "Titre FR requis.");
    setIsSaving(true);
    const payload = {
      title_fr: invData.title_fr,
      title_en: invData.title_en,
      description_fr: invData.desc_fr,
      description_en: invData.desc_en,
      cover_url: invData.cover_url,
      difficulty: invData.difficulty,
      reward_cauris: invData.reward,
      starting_cauris: invData.starting_cauris,
      status: invData.status,
    };
    if (editingId) {
      await supabase.from("investigations").update(payload).eq("id", editingId);
      showMsg("success", "Dossier mis à jour !");
    } else {
      const { data } = await supabase
        .from("investigations")
        .insert(payload)
        .select()
        .single();
      handleEdit(data);
      showMsg("success", "Dossier créé ! Vous pouvez scénariser.");
    }
    fetchInvestigations();
    setIsSaving(false);
  };

  const toggleChapter = (chapId: string) =>
    setExpandedChapters((prev) => ({ ...prev, [chapId]: !prev[chapId] }));

  const addChapter = async () => {
    const { data } = await supabase
      .from("investigation_chapters")
      .insert({
        investigation_id: editingId,
        step_order: chapters.length + 1,
        title_fr: "Nouveau Chapitre",
        narrative_fr: "",
      })
      .select()
      .single();
    if (data) setExpandedChapters((prev) => ({ ...prev, [data.id]: true }));
    fetchFullScenario(editingId!);
  };

  const addEnigma = async (chapterId: string) => {
    await supabase
      .from("investigation_enigmas")
      .insert({ chapter_id: chapterId, question_fr: "" });
    fetchFullScenario(editingId!);
  };

  const addClue = async (enigmaId: string) => {
    await supabase
      .from("investigation_clues")
      .insert({ enigma_id: enigmaId, text_fr: "" });
    fetchFullScenario(editingId!);
  };

  const updateLocalChapter = (cId: string, field: string, val: string) =>
    setChapters((prev) =>
      prev.map((c) => (c.id === cId ? { ...c, [field]: val } : c)),
    );

  const updateLocalEnigma = (
    cId: string,
    eId: string,
    field: string,
    val: string,
  ) =>
    setChapters((prev) =>
      prev.map((c) =>
        c.id === cId
          ? {
            ...c,
            enigmas: c.enigmas.map((e: any) =>
              e.id === eId ? { ...e, [field]: val } : e,
            ),
          }
          : c,
      ),
    );

  const updateLocalClue = (
    cId: string,
    eId: string,
    clId: string,
    field: string,
    val: string,
  ) =>
    setChapters((prev) =>
      prev.map((c) =>
        c.id === cId
          ? {
            ...c,
            enigmas: c.enigmas.map((e: any) =>
              e.id === eId
                ? {
                  ...e,
                  clues: e.clues.map((cl: any) =>
                    cl.id === clId ? { ...cl, [field]: val } : cl,
                  ),
                }
                : e,
            ),
          }
          : c,
      ),
    );

  const handleTranslateDossier = async (frText: string, field: string) => {
    setIsProcessing(field);
    const translated = await autoTranslate(frText, "fr");
    setInvData((prev) => ({ ...prev, [field]: translated }));
    setIsProcessing(null);
  };

  const handleTranslateNested = async (
    frText: string,
    table: string,
    id: string,
    enField: string,
    localUpdater: (val: string) => void,
  ) => {
    if (!frText.trim()) return;
    setIsProcessing(id + enField);
    try {
      const translated = await autoTranslate(frText, "fr");
      localUpdater(translated);
      await supabase
        .from(table)
        .update({ [enField]: translated })
        .eq("id", id);
    } catch {
      showMsg("error", "Erreur de traduction");
    }
    setIsProcessing(null);
  };

  const handleTranslateEvidence = async (
    evId: string,
    frText: string,
    field: "name_en",
  ) => {
    if (!frText.trim()) return;
    setIsTranslatingEvidence(evId + field);
    try {
      const translated = await autoTranslate(frText, "fr");
      setEvidences((prev) =>
        prev.map((ev) =>
          ev.id === evId ? { ...ev, [field]: translated } : ev,
        ),
      );
      await supabase
        .from("investigation_evidences")
        .update({ [field]: translated })
        .eq("id", evId);
    } catch {
      showMsg("error", "Erreur de traduction");
    }
    setIsTranslatingEvidence(null);
  };

  // ── Ajouter un choix ──
  const addChoice = async (enigmaId: string) => {
    const enigma = chapters
      .flatMap((c) => c.enigmas || [])
      .find((e) => e.id === enigmaId);
    if (!enigma) return;

    const newChoicesFr = [
      ...(enigma.choices_fr || []),
      `Option ${(enigma.choices_fr || []).length + 1}`,
    ];
    const newChoicesEn = [
      ...(enigma.choices_en || []),
      `Option ${(enigma.choices_en || []).length + 1}`,
    ];

    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        enigmas: c.enigmas.map((e: any) =>
          e.id === enigmaId
            ? { ...e, choices_fr: newChoicesFr, choices_en: newChoicesEn }
            : e,
        ),
      })),
    );

    await supabase
      .from("investigation_enigmas")
      .update({ choices_fr: newChoicesFr, choices_en: newChoicesEn })
      .eq("id", enigmaId);
  };

  // ── Modifier un choix ──
  const updateChoice = async (
    enigmaId: string,
    index: number,
    value: string,
    lang: "fr" | "en",
  ) => {
    const enigma = chapters
      .flatMap((c) => c.enigmas || [])
      .find((e) => e.id === enigmaId);
    if (!enigma) return;

    const field = lang === "fr" ? "choices_fr" : "choices_en";
    const currentChoices =
      lang === "fr" ? enigma.choices_fr : enigma.choices_en;
    const newChoices = [...(currentChoices || [])];
    newChoices[index] = value;

    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        enigmas: c.enigmas.map((e: any) =>
          e.id === enigmaId ? { ...e, [field]: newChoices } : e,
        ),
      })),
    );

    await supabase
      .from("investigation_enigmas")
      .update({ [field]: newChoices })
      .eq("id", enigmaId);
  };

  // ── Supprimer un choix ──
  const deleteChoice = async (enigmaId: string, index: number) => {
    const enigma = chapters
      .flatMap((c) => c.enigmas || [])
      .find((e) => e.id === enigmaId);
    if (!enigma) return;

    const newChoicesFr = (enigma.choices_fr || []).filter(
      (_: any, i: number) => i !== index,
    );
    const newChoicesEn = (enigma.choices_en || []).filter(
      (_: any, i: number) => i !== index,
    );

    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        enigmas: c.enigmas.map((e: any) =>
          e.id === enigmaId
            ? { ...e, choices_fr: newChoicesFr, choices_en: newChoicesEn }
            : e,
        ),
      })),
    );

    await supabase
      .from("investigation_enigmas")
      .update({ choices_fr: newChoicesFr, choices_en: newChoicesEn })
      .eq("id", enigmaId);
  };

  // ── Définir la bonne réponse ──
  const setCorrectChoice = async (enigmaId: string, index: number) => {
    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        enigmas: c.enigmas.map((e: any) =>
          e.id === enigmaId ? { ...e, correct_choice_index: index } : e,
        ),
      })),
    );

    await supabase
      .from("investigation_enigmas")
      .update({ correct_choice_index: index })
      .eq("id", enigmaId);
  };

  const updateDB = async (table: string, id: string, payload: any) => {
    await supabase.from(table).update(payload).eq("id", id);
  };

  const openCloudinaryWidget = (
    entityId: string,
    entityType: "investigation" | "chapter" | "enigma" | "clue" | "scene",
  ) => {
    setIsUploading(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          uploadSignature: async (callback: any, paramsToSign: any) => {
            try {
              const res = await fetch("/api/cloudinary-sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paramsToSign }),
              });
              const { signature } = await res.json();
              callback(signature);
            } catch (err) {
              console.error("Erreur de signature", err);
            }
          },
          sources: ["local", "url", "camera", "image_search"],
          resourceType: "auto",
          folder: "lukeni/investigations",
          maxFileSize: 100000000,
          multiple: false,
        },
        async (error: any, result: any) => {
          setIsUploading(false);
          if (result?.event === "success") {
            const url = result.info.secure_url;
            if (entityType === "investigation") {
              setInvData((prev) => ({ ...prev, cover_url: url }));
              showMsg("success", "✅ Couverture uploadée !");
            } else {
              let mType = result.info.resource_type;
              if (mType === "video" && url.match(/\.(mp3|wav|ogg|m4a)$/i))
                mType = "audio";
              if (mType === "raw") mType = "document";
              await supabase.from("investigation_evidences").insert({
                entity_id: entityId,
                entity_type: entityType,
                media_url: url,
                media_type: mType,
                name_fr: "",
                name_en: "",
              });
              fetchFullScenario(editingId!);
              showMsg("success", "✅ Pièce à conviction ajoutée !");
            }
          }
        },
      );
      widget.open();
    };
    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  const openCloudinaryForIntroImage = () => {
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          uploadSignature: async (callback: any, paramsToSign: any) => {
            const res = await fetch("/api/cloudinary-sign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paramsToSign }),
            });
            const { signature } = await res.json();
            callback(signature);
          },
          sources: ["local", "url", "camera"],
          resourceType: "image",
          folder: "lukeni/investigations/intro",
          maxFileSize: 20000000,
          multiple: false,
        },
        (_error: any, result: any) => {
          if (result?.event === "success") {
            const url = result.info.secure_url;
            setIntroConfig((prev) =>
              prev ? { ...prev, background_image_url: url } : prev,
            );
            showMsg("success", "✅ Image d'intro uploadée !");
          }
        },
      );
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  const openCloudinaryForIntroAudio = () => {
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          uploadSignature: async (callback: any, paramsToSign: any) => {
            const res = await fetch("/api/cloudinary-sign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paramsToSign }),
            });
            const { signature } = await res.json();
            callback(signature);
          },
          sources: ["local", "url"],
          resourceType: "video", // Cloudinary classe les audios en "video"
          folder: "lukeni/investigations/intro",
          maxFileSize: 50000000,
          multiple: false,
        },
        (_error: any, result: any) => {
          if (result?.event === "success") {
            const url = result.info.secure_url;
            setIntroConfig((prev) =>
              prev ? { ...prev, audio_url: url } : prev,
            );
            showMsg("success", "✅ Audio d'intro uploadé !");
          }
        },
      );
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    await supabase.from(itemToDelete.table).delete().eq("id", itemToDelete.id);
    if (itemToDelete.table === "investigations") {
      resetForm();
      fetchInvestigations();
    } else {
      fetchFullScenario(editingId!);
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
    setIsDeleting(false);
  };

  const handleTranslateOutro = async (frText: string, field: string) => {
    if (!frText.trim()) return;
    setIsTranslatingOutro(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setOutroConfig((prev: any) => ({ ...prev, [field]: translated }));
    } catch (err) {
      console.error(err);
    }
    setIsTranslatingOutro(false);
  };

  const saveOutroConfig = async (invId: string) => {
    if (!outroConfig) return;
    try {
      const { data: existing } = await supabase
        .from("investigation_outro_config")
        .select("investigation_id")
        .eq("investigation_id", invId)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("investigation_outro_config")
          .update(outroConfig)
          .eq("investigation_id", invId);
      } else {
        await supabase
          .from("investigation_outro_config")
          .insert({ investigation_id: invId, ...outroConfig });
      }
      showMsg("success", "Configuration de conclusion sauvegardée !");
    } catch (err: any) {
      showMsg("error", `Erreur: ${err.message}`);
    }
  };

  const saveIntroConfig = async (invId: string) => {
    if (!introConfig) return;

    try {
      const { data: existing } = await supabase
        .from("investigation_intro_config")
        .select("id")
        .eq("investigation_id", invId)
        .maybeSingle();

      const payload = {
        background_image_url: introConfig.background_image_url || null,
        audio_url: introConfig.audio_url || null,
        scroll_texts_fr: introConfig.scroll_texts_fr || [],
        scroll_texts_en: introConfig.scroll_texts_en || [],
        text_scroll_speed: introConfig.text_scroll_speed || 5,
        audio_volume: introConfig.audio_volume || 0.8,
        skip_allowed: introConfig.skip_allowed ?? true,
        visual_filter: introConfig.visual_filter || "none",
        image_effect: introConfig.image_effect || "none",
        final_message_fr: introConfig.final_message_fr || "Bonne enquête",
        final_message_en: introConfig.final_message_en || "Good investigation",
        final_message_icon: introConfig.final_message_icon || "✦",
        text_effect: introConfig.text_effect || "none",
        typewriter_speed: introConfig.typewriter_speed || 30, // ✅ AJOUT
        text_color: introConfig.text_color || "#FFFFFF", // ✅ AJOUT
        text_font: introConfig.text_font || "serif", // ✅ AJOUT
      };

      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from("investigation_intro_config")
          .update(payload)
          .eq("investigation_id", invId);

        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from("investigation_intro_config")
          .insert({
            investigation_id: invId,
            ...payload,
          });

        if (error) throw error;
      }

      showMsg("success", "Configuration d'intro sauvegardée !");
    } catch (err: any) {
      console.error("Save intro config error:", err);
      showMsg("error", `Erreur: ${err.message}`);
    }
  };

  const renderEvidenceList = (
    entityId: string,
    type: "chapter" | "enigma" | "clue" | "scene",
  ) => {
    const relatedEvidences = evidences.filter((e) => e.entity_id === entityId);
    return (
      <div className="flex gap-3 items-start flex-wrap mt-3 bg-black/20 p-3 rounded-lg border border-dashed border-white/10">
        <button
          onClick={() => openCloudinaryWidget(entityId, type)}
          className="flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 text-[10px] bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/30 border border-blue-500/30 transition-colors flex-shrink-0"
        >
          <Paperclip size={16} className="mb-1" />+ Ajouter
          <br />
          Média
        </button>
        {relatedEvidences.map((ev) => (
          <div
            key={ev.id}
            className="group relative flex flex-col w-36 h-auto sm:w-48 bg-black rounded-lg border border-white/20 overflow-hidden flex-shrink-0 transition-all"
          >
            <div className="w-full h-20 sm:h-24 flex items-center justify-center bg-black overflow-hidden">
              {ev.media_type === "audio" ? (
                <audio
                  src={ev.media_url}
                  controls
                  className="w-full scale-75 sm:scale-90"
                />
              ) : ev.media_type === "video" ? (
                <video
                  src={ev.media_url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={ev.media_url}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  alt="Preuve"
                />
              )}
            </div>
            <div className="bg-[#111] p-2 flex-1 flex flex-col gap-2">
              {/* ✅ MESSAGE DE DÉCOUVERTE CONTEXTUEL */}
              <div className="bg-purple-900/10 p-1.5 rounded border border-purple-500/20">
                <label className="text-[8px] text-purple-400 uppercase font-bold flex items-center gap-1">
                  <Zap size={8} /> Révélation (Toast)
                </label>
                <input
                  type="text"
                  value={ev.discovery_msg_fr || ""}
                  onChange={(e) =>
                    setEvidences((prev) =>
                      prev.map((v) =>
                        v.id === ev.id
                          ? { ...v, discovery_msg_fr: e.target.value }
                          : v,
                      ),
                    )
                  }
                  onBlur={() =>
                    updateDB("investigation_evidences", ev.id, {
                      discovery_msg_fr: ev.discovery_msg_fr,
                    })
                  }
                  placeholder="Ex: Mon Dieu... le sang !"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none focus:border-purple-500 mb-1"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={ev.discovery_msg_en || ""}
                    onChange={(e) =>
                      setEvidences((prev) =>
                        prev.map((v) =>
                          v.id === ev.id
                            ? { ...v, discovery_msg_en: e.target.value }
                            : v,
                        ),
                      )
                    }
                    onBlur={() =>
                      updateDB("investigation_evidences", ev.id, {
                        discovery_msg_en: ev.discovery_msg_en,
                      })
                    }
                    placeholder="Ex: My God... the blood!"
                    className="flex-1 bg-[#0a0a0a] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={async () => {
                      setIsProcessing(ev.id + "discovery_msg_en");
                      const t = await autoTranslate(ev.discovery_msg_fr, "fr");
                      setEvidences((prev) =>
                        prev.map((v) =>
                          v.id === ev.id ? { ...v, discovery_msg_en: t } : v,
                        ),
                      );
                      await updateDB("investigation_evidences", ev.id, {
                        discovery_msg_en: t,
                      });
                      setIsProcessing(null);
                    }}
                    className="p-1 bg-white/5 rounded text-gray-400 hover:text-white"
                  >
                    {isProcessing === ev.id + "discovery_msg_en" ? (
                      <Loader2 size={8} className="animate-spin" />
                    ) : (
                      <Languages size={8} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[8px] text-gray-600 uppercase font-bold">
                  Nom (FR)
                </label>
                <input
                  type="text"
                  value={ev.name_fr || ""}
                  onChange={(e) =>
                    setEvidences((prev) =>
                      prev.map((v) =>
                        v.id === ev.id ? { ...v, name_fr: e.target.value } : v,
                      ),
                    )
                  }
                  onBlur={() =>
                    updateDB("investigation_evidences", ev.id, {
                      name_fr: ev.name_fr,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Ex: Lettre"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={ev.name_en || ""}
                  onChange={(e) =>
                    setEvidences((prev) =>
                      prev.map((v) =>
                        v.id === ev.id ? { ...v, name_en: e.target.value } : v,
                      ),
                    )
                  }
                  onBlur={() =>
                    updateDB("investigation_evidences", ev.id, {
                      name_en: ev.name_en,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Letter"
                  className="flex-1 bg-[#0a0a0a] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none focus:border-blue-500"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranslateEvidence(ev.id, ev.name_fr, "name_en");
                  }}
                  className="p-1 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                >
                  {isTranslatingEvidence === ev.id + "name_en" ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Languages size={10} />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 bg-[#0a0a0a] px-2 py-1 text-[10px] text-gray-500">
              <span>
                {ev.media_type === "image"
                  ? "🖼️"
                  : ev.media_type === "audio"
                    ? "🎵"
                    : ev.media_type === "video"
                      ? "🎬"
                      : "📄"}
              </span>
              <button
                onClick={() => {
                  setItemToDelete({
                    id: ev.id,
                    table: "investigation_evidences",
                  });
                  setDeleteModalOpen(true);
                }}
                className="ml-auto p-1 text-gray-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
        {relatedEvidences.length === 0 && (
          <p className="text-gray-600 text-xs self-center">
            Aucune pièce à conviction
          </p>
        )}
      </div>
    );
  };

  // ── Composant interne pour les onglets de déduction (évite le hook dans callback) ──
  const DeductionSection = ({ chap }: { chap: any }) => {
    const [deductionTab, setDeductionTab] = React.useState<
      "timeline" | "board"
    >("timeline");
    return (
      <div className="space-y-4">
        <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setDeductionTab("timeline")}
            className={`flex-1 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${deductionTab === "timeline"
              ? "bg-amber-600/30 text-amber-300 border border-amber-500/30"
              : "text-gray-500 hover:text-white"
              }`}
          >
            🗓️ Timeline Chronologique
          </button>
          <button
            onClick={() => setDeductionTab("board")}
            className={`flex-1 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${deductionTab === "board"
              ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
              : "text-gray-500 hover:text-white"
              }`}
          >
            🕸️ Tableau de Connexions
          </button>
        </div>

        {deductionTab === "timeline" && (
          <div className="bg-amber-950/10 p-4 rounded-xl border border-amber-500/20">
            <TimelineAdmin
              chapterId={chap.id}
              evidences={evidences}
              scenes={chap.scenes || []}
              chapters={chapters}
              enigmas={chap.enigmas || []}
              outroConfig={outroConfig}
              showMsg={showMsg}
              investigationId={editingId}
            />
          </div>
        )}

        {deductionTab === "board" && (
          <div className="bg-purple-950/10 p-4 rounded-xl border border-purple-500/20">
            <DeductionBoardAdmin
              chapterId={chap.id}
              evidences={evidences}
              scenes={chap.scenes || []}
              chapters={chapters}
              enigmas={chap.enigmas || []}
              outroConfig={outroConfig}
              showMsg={showMsg}
              investigationId={editingId}
            />
          </div>
        )}
      </div>
    );
  };


  // ✅ FONCTION RÉUTILISABLE POUR SAUVEGARDER UNE ÉNIGME
  const saveEnigmaToDb = async (enigmaToSave: any) => {
    const { error } = await supabase
      .from('investigation_enigmas')
      .update({
        question_fr: enigmaToSave.question_fr,
        question_en: enigmaToSave.question_en,
        expected_answer_fr: enigmaToSave.expected_answer_fr,
        expected_answer_en: enigmaToSave.expected_answer_en,
        response_type: enigmaToSave.response_type || 'text',
        choices_fr: enigmaToSave.choices_fr || [],
        choices_en: enigmaToSave.choices_en || [],
        correct_choice_index: enigmaToSave.correct_choice_index,
        evidence_id: enigmaToSave.evidence_id || null,
        scene_id: enigmaToSave.scene_id || null,
        enigma_timer_seconds: enigmaToSave.enigma_timer_seconds || 0,
        timer_timeout_instruction_id: enigmaToSave.timer_timeout_instruction_id || null,
        trigger_event_id: enigmaToSave.trigger_event_id || null,
        trigger_event_on_success_id: enigmaToSave.trigger_event_on_success_id || null,
        trigger_event_on_failure_id: enigmaToSave.trigger_event_on_failure_id || null,
        trigger_event_on_timeout_id: enigmaToSave.trigger_event_on_timeout_id || null,
        timer_behavior: enigmaToSave.timer_behavior || 'alert',
      })
      .eq('id', enigmaToSave.id);

    if (error) {
      console.error('Erreur sauvegarde énigme:', error);
      return false;
    }
    return true;
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Search className="text-red-500 flex-shrink-0" size={24} />
        <h2 className="text-xl md:text-2xl font-serif">Enquêtes Historiques</h2>
      </div>

      {/* NIVEAU 1 : DOSSIER */}
      <div className="bg-[#0f0f0f] p-4 sm:p-6 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            {editingId ? (
              <Edit2 size={18} className="text-red-500" />
            ) : (
              <PlusCircle size={18} className="text-red-500" />
            )}
            {editingId ? "Éditer le Dossier" : "Nouveau Dossier d'Enquête"}
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X size={14} /> Fermer
            </button>
          )}




        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-white/5">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Statut de publication
            </label>
            <select
              value={invData.status}
              onChange={(e) =>
                setInvData({ ...invData, status: e.target.value })
              }
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            >
              <option value="draft">📝 Brouillon</option>
              <option value="published">✅ Publié</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Difficulté
            </label>
            <select
              value={invData.difficulty}
              onChange={(e) =>
                setInvData({ ...invData, difficulty: e.target.value })
              }
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            >
              <option value="facile">🟢 Facile</option>
              <option value="intermediaire">🟠 Intermédiaire</option>
              <option value="expert">🔴 Expert</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Star size={10} /> Récompense (Cauris)
            </label>
            <input
              type="number"
              value={invData.reward}
              onChange={(e) =>
                setInvData({ ...invData, reward: Number(e.target.value) })
              }
              min={0}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Star size={10} /> Budget de départ (Cauris)
            </label>
            <input
              type="number"
              value={invData.starting_cauris}
              onChange={(e) =>
                setInvData({
                  ...invData,
                  starting_cauris: Number(e.target.value),
                })
              }
              min={1}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Titre (FR)
            </label>
            <input
              type="text"
              value={invData.title_fr}
              onChange={(e) =>
                setInvData({ ...invData, title_fr: e.target.value })
              }
              placeholder="Ex: L'assassinat de Lumumba"
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Titre (EN)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invData.title_en}
                onChange={(e) =>
                  setInvData({ ...invData, title_en: e.target.value })
                }
                placeholder="Ex: The assassination of Lumumba"
                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
              />
              <button
                onClick={() =>
                  handleTranslateDossier(invData.title_fr, "title_en")
                }
                className="p-2 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
              >
                {isProcessing === "title_en" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Languages size={14} />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Synopsis (FR)
            </label>
            <textarea
              rows={3}
              value={invData.desc_fr}
              onChange={(e) =>
                setInvData({ ...invData, desc_fr: e.target.value })
              }
              placeholder="Ex: Rouvrez les archives secrètes de 1961..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Synopsis (EN)
            </label>
            <div className="flex gap-2 items-start">
              <textarea
                rows={3}
                value={invData.desc_en}
                onChange={(e) =>
                  setInvData({ ...invData, desc_en: e.target.value })
                }
                placeholder="Ex: Reopen the secret archives from 1961..."
                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-red-500"
              />
              <button
                onClick={() =>
                  handleTranslateDossier(invData.desc_fr, "desc_en")
                }
                className="p-2 bg-white/5 rounded text-gray-400 hover:text-white mt-1 flex-shrink-0"
              >
                {isProcessing === "desc_en" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Languages size={14} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-4">
          <div>
            <button
              onClick={() =>
                openCloudinaryWidget(editingId || "new", "investigation")
              }
              className="text-xs bg-white/5 px-4 py-2 rounded flex items-center gap-2 border border-white/10 hover:bg-white/10 w-full sm:w-auto justify-center"
            >
              <ImagePlus size={14} />
              {invData.cover_url
                ? "Cover ajoutée (modifier)"
                : "Uploader Image de Couverture"}
            </button>
          </div>
          {invData.cover_url && (
            <div className="relative rounded-lg overflow-hidden border border-white/10 h-40 sm:h-48 w-full sm:w-64">
              <img
                src={invData.cover_url}
                alt="Aperçu couverture"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                <p className="text-white text-xs font-bold truncate">
                  {invData.title_fr || "Sans titre"}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleSaveDossier}
            disabled={isSaving}
            className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-red-500 flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            Sauvegarder le Dossier
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          NIVEAU 1.5 : PERSONNAGES (PNJ)
      ════════════════════════════════════════════════════ */}
      {editingId && (
        <InvestigationCharacters
          investigationId={editingId}
          evidences={evidences}
          showMsg={showMsg}
        />
      )}



      {/* ════════════════════════════════════════════════════
    DIALOGUE SPEAKERS
════════════════════════════════════════════════════ */}
      {editingId && (
        <div className="bg-purple-950/10 p-4 sm:p-6 rounded-xl border border-purple-500/20 space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">💬</span> Bulles de Dialogue
          </h3>
          <DialogueSpeakersManager
            investigationId={editingId}
            showMsg={showMsg}
          />
        </div>
      )}



      {/* ════════════════════════════════════════════════════
    MOTS MÊLÉS
════════════════════════════════════════════════════ */}
      {editingId && (
        <div className="bg-pink-950/10 p-4 sm:p-6 rounded-xl border border-pink-500/20 space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🧩</span> Mots Mêlés
          </h3>
          <WordSearchAdmin
            investigationId={editingId}
            chapters={chapters}
            outroConfig={outroConfig}
            allInstructions={allInstructions}
            showMsg={showMsg}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          NIVEAU 1.2 : BIBLIOTHÈQUE D'INSTRUCTIONS
      ════════════════════════════════════════════════════ */}
      {editingId && (
        <div className="bg-blue-950/10 p-4 sm:p-6 rounded-xl border border-blue-500/20 space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Lightbulb size={18} className="text-blue-400" />
            Bibliothèque d'Instructions
          </h3>
          <InstructionsLibrary investigationId={editingId} showMsg={showMsg} />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          NIVEAU 1.3 : ÉCRAN D'INTRODUCTION
      ════════════════════════════════════════════════════ */}
      {editingId && introConfig && (
        <div className="bg-indigo-950/10 p-4 sm:p-6 rounded-xl border border-indigo-500/20 space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-indigo-400" />
            Écran d'Introduction
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Image de fond */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Image de fond
              </label>
              <button
                onClick={openCloudinaryForIntroImage}
                className="w-full py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-600/40 flex items-center justify-center gap-2"
              >
                <ImagePlus size={14} />
                {introConfig.background_image_url
                  ? "Changer l'image"
                  : "Uploader une image"}
              </button>
              {introConfig.background_image_url && (
                <img
                  src={introConfig.background_image_url}
                  alt="Intro background"
                  className="w-full h-32 object-cover rounded-lg mt-2 border border-white/10"
                />
              )}
            </div>

            {/* Vitesse Machine à écrire */}
            {introConfig.text_effect === "typewriter" && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                  ⌨️ Vitesse de frappe (ms)
                </label>
                <input
                  type="number"
                  value={introConfig.typewriter_speed || 30}
                  onChange={(e) =>
                    setIntroConfig({
                      ...introConfig,
                      typewriter_speed: Number(e.target.value),
                    })
                  }
                  min="10"
                  max="200"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  20 = Très rapide, 100 = Lent
                </p>
              </div>
            )}

            {/* Couleur du texte */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                🎨 Couleur du texte
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={introConfig.text_color || "#FFFFFF"}
                  onChange={(e) =>
                    setIntroConfig({
                      ...introConfig,
                      text_color: e.target.value,
                    })
                  }
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={introConfig.text_color || "#FFFFFF"}
                  onChange={(e) =>
                    setIntroConfig({
                      ...introConfig,
                      text_color: e.target.value,
                    })
                  }
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Police du texte */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                ✏️ Police du texte
              </label>
              <select
                value={introConfig.text_font || "serif"}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    text_font: e.target.value,
                  })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="serif">Serif (Classique)</option>
                <option value="sans-serif">Sans-Serif (Moderne)</option>
                <option value="monospace">Monospace (Machine)</option>
                <option value="'Courier New', Courier">
                  Courier (Télétype)
                </option>
                <option value="'Georgia', serif">Georgia (Élégant)</option>
                <option value="'Times New Roman', serif">
                  Times (Journal)
                </option>
                <option value="'Brush Script MT', cursive">
                  Cursive (Manuscrit)
                </option>
              </select>
            </div>

            {/* Audio narratif */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Audio narratif
              </label>
              <button
                onClick={openCloudinaryForIntroAudio}
                className="w-full py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-600/40 flex items-center justify-center gap-2"
              >
                <Music size={14} />
                {introConfig.audio_url
                  ? "Changer l'audio"
                  : "Uploader un audio"}
              </button>
              {introConfig.audio_url && (
                <audio
                  src={introConfig.audio_url}
                  controls
                  className="w-full mt-2 h-8"
                />
              )}
            </div>
          </div>

          {/* Textes défilants FR */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block font-bold uppercase">
              Textes défilants (FR)
            </label>
            <div className="space-y-2">
              {introConfig.scroll_texts_fr.map((text, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => {
                      const newTexts = [...introConfig.scroll_texts_fr];
                      newTexts[idx] = e.target.value;
                      setIntroConfig({
                        ...introConfig,
                        scroll_texts_fr: newTexts,
                      });
                    }}
                    placeholder="Ex: En l'an 1960, l'ombre d'un complot..."
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const newTexts = introConfig.scroll_texts_fr.filter(
                        (_, i) => i !== idx,
                      );
                      setIntroConfig({
                        ...introConfig,
                        scroll_texts_fr: newTexts,
                      });
                    }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setIntroConfig({
                    ...introConfig,
                    scroll_texts_fr: [...introConfig.scroll_texts_fr, ""],
                  });
                }}
                className="w-full py-2 border border-dashed border-indigo-500/30 text-indigo-400 rounded text-xs font-bold hover:bg-indigo-500/10"
              >
                + Ajouter un texte FR
              </button>
            </div>
          </div>

          {/* Textes défilants EN avec traduction */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block font-bold uppercase flex items-center gap-2">
              Textes défilants (EN)
              <Languages size={12} className="text-gray-500" />
            </label>
            <div className="space-y-2">
              {introConfig.scroll_texts_en.map((text, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => {
                      const newTexts = [...introConfig.scroll_texts_en];
                      newTexts[idx] = e.target.value;
                      setIntroConfig({
                        ...introConfig,
                        scroll_texts_en: newTexts,
                      });
                    }}
                    placeholder="Ex: In 1960, the shadow of a plot..."
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={async () => {
                      if (!introConfig.scroll_texts_fr[idx]?.trim()) return;
                      setIsTranslatingIntro(true);
                      try {
                        const translated = await autoTranslate(
                          introConfig.scroll_texts_fr[idx],
                          "fr",
                        );
                        const newTexts = [...introConfig.scroll_texts_en];
                        newTexts[idx] = translated;
                        setIntroConfig({
                          ...introConfig,
                          scroll_texts_en: newTexts,
                        });
                      } catch (err) {
                        console.error("Translation error:", err);
                      }
                      setIsTranslatingIntro(false);
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    disabled={isTranslatingIntro}
                  >
                    {isTranslatingIntro ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Languages size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const newTexts = introConfig.scroll_texts_en.filter(
                        (_, i) => i !== idx,
                      );
                      setIntroConfig({
                        ...introConfig,
                        scroll_texts_en: newTexts,
                      });
                    }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setIntroConfig({
                    ...introConfig,
                    scroll_texts_en: [...introConfig.scroll_texts_en, ""],
                  });
                }}
                className="w-full py-2 border border-dashed border-indigo-500/30 text-indigo-400 rounded text-xs font-bold hover:bg-indigo-500/10"
              >
                + Add text EN
              </button>
            </div>
          </div>

          {/* Message Final */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Icône Finale
              </label>
              <input
                type="text"
                value={introConfig.final_message_icon}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    final_message_icon: e.target.value,
                  })
                }
                placeholder="Ex: ✦ ou 🔍"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Message Final (FR)
              </label>
              <input
                type="text"
                value={introConfig.final_message_fr}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    final_message_fr: e.target.value,
                  })
                }
                placeholder="Ex: Bonne enquête"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Message Final (EN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={introConfig.final_message_en}
                  onChange={(e) =>
                    setIntroConfig({
                      ...introConfig,
                      final_message_en: e.target.value,
                    })
                  }
                  placeholder="Ex: Good investigation"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
                <button
                  onClick={async () => {
                    if (!introConfig.final_message_fr.trim()) return;
                    setIsTranslatingIntro(true);
                    try {
                      const translated = await autoTranslate(
                        introConfig.final_message_fr,
                        "fr",
                      );
                      setIntroConfig({
                        ...introConfig,
                        final_message_en: translated,
                      });
                    } catch (err) {
                      console.error("Translation error:", err);
                    }
                    setIsTranslatingIntro(false);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                  disabled={isTranslatingIntro}
                >
                  {isTranslatingIntro ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Languages size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Paramètres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Temps de pause (sec/texte)
              </label>
              <input
                type="number"
                value={introConfig.text_scroll_speed}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    text_scroll_speed: Number(e.target.value),
                  })
                }
                min="1"
                max="15"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Volume audio (0-1)
              </label>
              <input
                type="number"
                value={introConfig.audio_volume}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    audio_volume: Math.max(
                      0,
                      Math.min(1, Number(e.target.value)),
                    ),
                  })
                }
                min="0"
                max="1"
                step="0.1"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Permettre de passer ?
              </label>
              <select
                value={introConfig.skip_allowed ? "true" : "false"}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    skip_allowed: e.target.value === "true",
                  })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
              >
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
          </div>

          {/* Filtres et Effets Vidéo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Filtre Visuel
              </label>
              <select
                value={introConfig.visual_filter || "none"}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    visual_filter: e.target.value,
                  })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="none">Aucun (Original)</option>
                <option value="sepia">Sépia (Années 1900)</option>
                <option value="grayscale">Noir & Blanc (Archives)</option>
                <option value="vintage">Vintage (Contraste élevé)</option>
                <option value="noir">Film Noir (Sombre)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Effet Vidéo (Mouvement)
              </label>
              <select
                value={introConfig.image_effect || "none"}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    image_effect: e.target.value,
                  })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="none">Aucun (Image fixe)</option>
                <option value="zoom-in">Zoom Lent (Effet dramatique)</option>
                <option value="zoom-out">Dé-zoom Lent (Révélation)</option>
                <option value="pan-left">Panoramique Gauche</option>
                <option value="pan-right">Panoramique Droite</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">
                Effet de Texte
              </label>
              <select
                value={introConfig.text_effect || "none"}
                onChange={(e) =>
                  setIntroConfig({
                    ...introConfig,
                    text_effect: e.target.value,
                  })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="none">Aucun (Texte fixe)</option>
                <option value="typewriter">Machine à écrire</option>
                <option value="fade">Fondu</option>
                <option value="blur">Flou cinématique</option>
                <option value="slide">Glissement vertical</option>
              </select>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowIntroPreview(true)}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 border border-white/10"
            >
              <Eye size={16} /> Aperçu
            </button>
            <button
              onClick={() => saveIntroConfig(editingId)}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Save size={16} /> Sauvegarder l'intro
            </button>
          </div>
        </div>
      )}

      {/* Modale Aperçu Intro */}
      {showIntroPreview && introConfig && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setShowIntroPreview(false)}
              className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/20 backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
          <InvestigationIntro
            investigationId={editingId!}
            lang="fr"
            onComplete={() => setShowIntroPreview(false)}
            directConfig={introConfig}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          NIVEAU 1.4 : ÉCRAN DE CONCLUSION & RÈGLES (OUTRO)
      ════════════════════════════════════════════════════ */}
      {editingId && outroConfig && (
        <div className="bg-green-950/10 p-4 sm:p-6 rounded-xl border border-green-500/20 space-y-6">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-green-400" /> Conclusions & Règles
            du Temps
          </h3>

          {/* 0. ÉCONOMIE DU JEU */}
          <div className="space-y-4 bg-[#D4AF37]/10 p-4 rounded-xl border border-[#D4AF37]/30">
            <h4 className="text-sm font-bold text-[#D4AF37] border-b border-[#D4AF37]/20 pb-2 flex items-center gap-2">
              <Star size={16} /> Économie du Jeu (Cauris & Temps)
            </h4>

            {/* Sous-section : Temps */}
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              ⏱ Gestion du Temps
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-300 font-bold mb-1 block">
                  Coût d'achat de temps (Cauris)
                </label>
                <input
                  type="number"
                  value={outroConfig.time_economy?.buy_cost ?? 50}
                  onChange={(e) =>
                    setOutroConfig({
                      ...outroConfig,
                      time_economy: {
                        ...outroConfig.time_economy,
                        buy_cost: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 font-bold mb-1 block">
                  Temps gagné lors de l'achat (Sec)
                </label>
                <input
                  type="number"
                  value={outroConfig.time_economy?.buy_seconds ?? 60}
                  onChange={(e) =>
                    setOutroConfig({
                      ...outroConfig,
                      time_economy: {
                        ...outroConfig.time_economy,
                        buy_seconds: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 font-bold mb-1 block">
                  Temps offert si on change de scène (Sec)
                </label>
                <input
                  type="number"
                  value={outroConfig.time_economy?.reward_seconds ?? 30}
                  onChange={(e) =>
                    setOutroConfig({
                      ...outroConfig,
                      time_economy: {
                        ...outroConfig.time_economy,
                        reward_seconds: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* ✅ FIX 10 : Sous-section Indices */}
            <div className="border-t border-[#D4AF37]/20 pt-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">
                💡 Gestion des Indices
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-300 font-bold mb-1 block">
                    Coût pour révéler un indice manuellement (Cauris)
                  </label>
                  <input
                    type="number"
                    value={outroConfig.game_economy?.hint_cost_cauris ?? 5}
                    onChange={(e) =>
                      setOutroConfig({
                        ...outroConfig,
                        game_economy: {
                          ...(outroConfig.game_economy || {}),
                          hint_cost_cauris: Number(e.target.value),
                        },
                      })
                    }
                    min={0}
                    className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    0 = Gratuit. Le joueur peut révéler librement.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-bold mb-1 block">
                    Nombre d'erreurs avant révélation automatique
                  </label>
                  <input
                    type="number"
                    value={outroConfig.game_economy?.auto_reveal_after ?? 3}
                    onChange={(e) =>
                      setOutroConfig({
                        ...outroConfig,
                        game_economy: {
                          ...(outroConfig.game_economy || {}),
                          auto_reveal_after: Number(e.target.value),
                        },
                      })
                    }
                    min={1}
                    className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Ex: 3 = après 3 erreurs sur cette énigme, l'indice suivant
                    se débloque.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 1. TEXTE DE VICTOIRE */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
              1. Victoire & Rangs Infinis
            </h4>

            <div className="space-y-4">
              {outroConfig.ranks?.map((rank: any, rIdx: number) => (
                <div
                  key={rank.id || rIdx}
                  className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-4"
                >
                  {/* ✅ NOM INTERNE DU RANG (Pour la bibliothèque) */}
                  <div className="mb-4">
                    <label className="text-[10px] text-gray-500 font-bold">
                      Nom de la règle (interne, pour bibliothèque)
                    </label>
                    <input
                      type="text"
                      value={rank.name || ""}
                      onChange={(e) => {
                        const r = [...outroConfig.ranks];
                        r[rIdx].name = e.target.value;
                        setOutroConfig({ ...outroConfig, ranks: r });
                      }}
                      placeholder="Ex: victoire_legende"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>

                  {/* ✅ TITRE GÉANT AFFICHÉ POUR CE RANG */}
                  <div className="space-y-2 border-b border-white/10 pb-4">
                    <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold flex items-center gap-1">
                      <Star size={10} /> Titre géant affiché (ex: ENQUÊTE
                      TERMINÉE)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={rank.main_title_fr || ""}
                        onChange={(e) => {
                          const r = [...outroConfig.ranks];
                          r[rIdx].main_title_fr = e.target.value;
                          setOutroConfig({ ...outroConfig, ranks: r });
                        }}
                        placeholder="Titre géant FR"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rank.main_title_en || ""}
                          onChange={(e) => {
                            const r = [...outroConfig.ranks];
                            r[rIdx].main_title_en = e.target.value;
                            setOutroConfig({ ...outroConfig, ranks: r });
                          }}
                          placeholder="Titre géant EN"
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                        />
                        <button
                          onClick={async () => {
                            setIsTranslatingOutro(true);
                            const t = await autoTranslate(
                              rank.main_title_fr,
                              "fr",
                            );
                            const r = [...outroConfig.ranks];
                            r[rIdx].main_title_en = t;
                            setOutroConfig({ ...outroConfig, ranks: r });
                            setIsTranslatingOutro(false);
                          }}
                          className="p-2 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                        >
                          <Languages size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ✅ SCORE MIN & NOM DU RANG */}
                  <div className="flex flex-col sm:flex-row gap-4 items-end border-b border-white/10 pb-4">
                    <div className="w-28 flex-shrink-0">
                      <label className="text-[10px] text-green-400 font-bold">
                        Score Min (%)
                      </label>
                      <input
                        type="number"
                        value={rank.min_percent}
                        onChange={(e) => {
                          const r = [...outroConfig.ranks];
                          r[rIdx].min_percent = Number(e.target.value);
                          setOutroConfig({ ...outroConfig, ranks: r });
                        }}
                        className="w-full bg-[#1a1a1a] border border-green-500/30 rounded px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 font-bold">
                        Nom du Rang (FR)
                      </label>
                      <input
                        type="text"
                        value={rank.title_fr}
                        onChange={(e) => {
                          const r = [...outroConfig.ranks];
                          r[rIdx].title_fr = e.target.value;
                          setOutroConfig({ ...outroConfig, ranks: r });
                        }}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex-1 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 font-bold">
                          Nom du Rang (EN)
                        </label>
                        <input
                          type="text"
                          value={rank.title_en}
                          onChange={(e) => {
                            const r = [...outroConfig.ranks];
                            r[rIdx].title_en = e.target.value;
                            setOutroConfig({ ...outroConfig, ranks: r });
                          }}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          setIsTranslatingOutro(true);
                          const t = await autoTranslate(rank.title_fr, "fr");
                          const r = [...outroConfig.ranks];
                          r[rIdx].title_en = t;
                          setOutroConfig({ ...outroConfig, ranks: r });
                          setIsTranslatingOutro(false);
                        }}
                        className="p-2 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                      >
                        <Languages size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const r = outroConfig.ranks.filter(
                            (_: any, i: number) => i !== rIdx,
                          );
                          setOutroConfig({ ...outroConfig, ranks: r });
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/20 rounded flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* ✅ MESSAGES ALÉATOIRES POUR CE RANG */}
                  <div className="space-y-2 pl-4 border-l-2 border-green-500/30">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      Messages aléatoires pour ce rang
                    </p>
                    {rank.messages?.map((msg: any, mIdx: number) => (
                      <div
                        key={msg.id || mIdx}
                        className="flex gap-2 items-start bg-white/5 p-2 rounded"
                      >
                        <textarea
                          rows={2}
                          value={msg.text_fr}
                          onChange={(e) => {
                            const r = [...outroConfig.ranks];
                            r[rIdx].messages[mIdx].text_fr = e.target.value;
                            setOutroConfig({ ...outroConfig, ranks: r });
                          }}
                          placeholder="Message FR"
                          className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none"
                        />
                        <textarea
                          rows={2}
                          value={msg.text_en}
                          onChange={(e) => {
                            const r = [...outroConfig.ranks];
                            r[rIdx].messages[mIdx].text_en = e.target.value;
                            setOutroConfig({ ...outroConfig, ranks: r });
                          }}
                          placeholder="Message EN"
                          className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none"
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={async () => {
                              setIsTranslatingOutro(true);
                              const t = await autoTranslate(msg.text_fr, "fr");
                              const r = [...outroConfig.ranks];
                              r[rIdx].messages[mIdx].text_en = t;
                              setOutroConfig({ ...outroConfig, ranks: r });
                              setIsTranslatingOutro(false);
                            }}
                            className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white"
                          >
                            <Languages size={12} />
                          </button>
                          <button
                            onClick={() =>
                              setShowOutroPreview({
                                isTimeout: false,
                                title: rank.title_fr,
                                message: msg.text_fr,
                                color: rankColors[rIdx % rankColors.length],
                                score: rank.min_percent,
                              })
                            }
                            className="p-1.5 bg-white/5 rounded text-green-400 hover:bg-green-500 hover:text-black"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => {
                              const r = [...outroConfig.ranks];
                              r[rIdx].messages = r[rIdx].messages.filter(
                                (_: any, i: number) => i !== mIdx,
                              );
                              setOutroConfig({ ...outroConfig, ranks: r });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-500/20 rounded"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const r = [...outroConfig.ranks];
                        r[rIdx].messages = [
                          ...(r[rIdx].messages || []),
                          {
                            id: Date.now().toString(),
                            text_fr: "",
                            text_en: "",
                          },
                        ];
                        setOutroConfig({ ...outroConfig, ranks: r });
                      }}
                      className="text-xs text-green-400 hover:text-green-300 font-bold flex items-center gap-1 mt-2"
                    >
                      + Ajouter une variante de message
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setOutroConfig({
                    ...outroConfig,
                    ranks: [
                      ...(outroConfig.ranks || []),
                      {
                        id: Date.now().toString(),
                        min_percent: 50,
                        main_title_fr: "ENQUÊTE TERMINÉE",
                        main_title_en: "",
                        title_fr: "Nouveau Rang",
                        title_en: "New Rank",
                        messages: [],
                      },
                    ],
                  })
                }
                className="w-full py-3 border border-dashed border-green-500/50 text-green-400 font-bold rounded-xl hover:bg-green-500/10"
              >
                + Créer un nouveau Rang (ex: 80%)
              </button>
            </div>
          </div>

          {/* 2. GAME OVER MULTIPLES */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h4 className="text-sm font-bold text-red-500 border-b border-red-500/20 pb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> 2. Fins Tragiques (Game Over / Time
              Out Aléatoires)
            </h4>
            <div className="space-y-2">
              {outroConfig.game_overs?.map((go: any, idx: number) => (
                <div
                  key={go.id || idx}
                  className="space-y-2 bg-red-950/20 p-3 rounded-lg border border-red-500/20"
                >
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 font-bold">
                        Nom de la règle (interne)
                      </label>
                      <input
                        type="text"
                        value={go.name || ""}
                        onChange={(e) => {
                          const g = [...outroConfig.game_overs];
                          g[idx].name = e.target.value;
                          setOutroConfig({ ...outroConfig, game_overs: g });
                        }}
                        placeholder="Ex: go_arrestation"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <textarea
                      rows={2}
                      value={go.text_fr}
                      onChange={(e) => {
                        const g = [...outroConfig.game_overs];
                        g[idx].text_fr = e.target.value;
                        setOutroConfig({ ...outroConfig, game_overs: g });
                      }}
                      placeholder="Le temps est écoulé (FR)..."
                      className="flex-1 bg-[#1a1a1a] border border-red-500/30 rounded px-2 py-1.5 text-xs text-white resize-none"
                    />
                    <textarea
                      rows={2}
                      value={go.text_en}
                      onChange={(e) => {
                        const g = [...outroConfig.game_overs];
                        g[idx].text_en = e.target.value;
                        setOutroConfig({ ...outroConfig, game_overs: g });
                      }}
                      placeholder="Time is up (EN)..."
                      className="flex-1 bg-[#1a1a1a] border border-red-500/30 rounded px-2 py-1.5 text-xs text-white resize-none"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={async () => {
                          setIsTranslatingOutro(true);
                          const t = await autoTranslate(go.text_fr, "fr");
                          const g = [...outroConfig.game_overs];
                          g[idx].text_en = t;
                          setOutroConfig({ ...outroConfig, game_overs: g });
                          setIsTranslatingOutro(false);
                        }}
                        className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white"
                      >
                        <Languages size={12} />
                      </button>
                      <button
                        onClick={() =>
                          setShowOutroPreview({
                            isTimeout: true,
                            title: "TEMPS ÉCOULÉ",
                            message: go.text_fr,
                            score: 0,
                          })
                        }
                        className="p-1.5 bg-white/5 rounded text-red-400 hover:bg-red-500 hover:text-white"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => {
                          const g = outroConfig.game_overs.filter(
                            (_: any, i: number) => i !== idx,
                          );
                          setOutroConfig({ ...outroConfig, game_overs: g });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/20 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setOutroConfig({
                    ...outroConfig,
                    game_overs: [
                      ...(outroConfig.game_overs || []),
                      { id: Date.now().toString(), text_fr: "", text_en: "" },
                    ],
                  })
                }
                className="w-full py-2 border border-dashed border-red-500/50 text-red-400 text-xs font-bold rounded hover:bg-red-500/10"
              >
                + Ajouter un scénario de Game Over
              </button>
            </div>
          </div>

          {/* 2.5. ABANDONS (MENU PAUSE) */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h4 className="text-sm font-bold text-yellow-500 border-b border-yellow-500/20 pb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> 2. Abandons (Menu Pause / Fuite)
            </h4>
            <p className="text-xs text-gray-400">
              Messages affichés si le joueur clique sur "Abandonner" ou fuit par
              un hotspot.
            </p>

            <div className="space-y-3">
              {(outroConfig.abandons || []).map((ab: any, idx: number) => (
                <div
                  key={ab.id || idx}
                  className="space-y-2 bg-yellow-950/20 p-3 rounded-lg border border-yellow-500/20"
                >
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 font-bold">
                        Nom de la règle (interne)
                      </label>
                      <input
                        type="text"
                        value={ab.name || ""}
                        onChange={(e) => {
                          const a = [...outroConfig.abandons];
                          a[idx].name = e.target.value;
                          setOutroConfig({ ...outroConfig, abandons: a });
                        }}
                        placeholder="Ex: fuite_lache"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <textarea
                      rows={2}
                      value={ab.text_fr}
                      onChange={(e) => {
                        const a = [...outroConfig.abandons];
                        a[idx].text_fr = e.target.value;
                        setOutroConfig({ ...outroConfig, abandons: a });
                      }}
                      placeholder="Vous prenez la fuite ? (FR)"
                      className="flex-1 bg-[#1a1a1a] border border-yellow-500/30 rounded px-2 py-1.5 text-xs text-white resize-none"
                    />
                    <textarea
                      rows={2}
                      value={ab.text_en}
                      onChange={(e) => {
                        const a = [...outroConfig.abandons];
                        a[idx].text_en = e.target.value;
                        setOutroConfig({ ...outroConfig, abandons: a });
                      }}
                      placeholder="Are you fleeing? (EN)"
                      className="flex-1 bg-[#1a1a1a] border border-yellow-500/30 rounded px-2 py-1.5 text-xs text-white resize-none"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={async () => {
                          setIsTranslatingOutro(true);
                          const t = await autoTranslate(ab.text_fr, "fr");
                          const a = [...outroConfig.abandons];
                          a[idx].text_en = t;
                          setOutroConfig({ ...outroConfig, abandons: a });
                          setIsTranslatingOutro(false);
                        }}
                        className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white"
                      >
                        <Languages size={12} />
                      </button>
                      <button
                        onClick={() =>
                          setPreviewAbortMsg(ab.text_fr || "Message abandon")
                        }
                        className="p-1.5 bg-white/5 rounded text-yellow-400 hover:bg-yellow-500 hover:text-black"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => {
                          const a = outroConfig.abandons.filter(
                            (_: any, i: number) => i !== idx,
                          );
                          setOutroConfig({ ...outroConfig, abandons: a });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/20 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setOutroConfig({
                    ...outroConfig,
                    abandons: [
                      ...(outroConfig.abandons || []),
                      {
                        id: Date.now().toString(),
                        name: "",
                        text_fr: "",
                        text_en: "",
                      },
                    ],
                  })
                }
                className="w-full py-2 border border-dashed border-yellow-500/50 text-yellow-400 text-xs font-bold rounded hover:bg-yellow-500/10"
              >
                + Ajouter un scénario d'Abandon
              </button>
            </div>
          </div>

          {/* 3. PALIERS D'ENCOURAGEMENT */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h4 className="text-sm font-bold text-green-400 border-b border-green-500/20 pb-2 flex items-center gap-2">
              <Trophy size={16} /> 3. Paliers d'encouragement (Toasts pendant le
              jeu)
            </h4>
            <p className="text-xs text-gray-400">
              Ces messages s'affichent sous forme de notification quand le
              joueur atteint un certain pourcentage de résolution.
            </p>

            <div className="space-y-2">
              {(outroConfig.milestones || []).map((m: any, idx: number) => (
                <div
                  key={m.id || idx}
                  className="space-y-2 bg-black/30 p-3 rounded-lg border border-white/10"
                >
                  {/* Ligne 1 : Nom interne et Seuil */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 font-bold">
                        Nom de la règle (interne)
                      </label>
                      <input
                        type="text"
                        value={m.name || ""}
                        onChange={(e) => {
                          const newM = [...outroConfig.milestones];
                          newM[idx].name = e.target.value;
                          setOutroConfig({ ...outroConfig, milestones: newM });
                        }}
                        placeholder="Ex: toast_50"
                        className="w-full bg-[#1a1a1a] border border-white/20 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-gray-500 font-bold">
                        Seuil %
                      </label>
                      <input
                        type="number"
                        value={m.percent}
                        onChange={(e) => {
                          const newM = [...outroConfig.milestones];
                          newM[idx].percent = Number(e.target.value);
                          setOutroConfig({ ...outroConfig, milestones: newM });
                        }}
                        className="w-full bg-[#1a1a1a] border border-white/20 rounded px-2 py-1 text-xs text-white text-center"
                      />
                    </div>
                  </div>
                  {/* Ligne 2 : Messages */}
                  <div className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={m.fr}
                      onChange={(e) => {
                        const newM = [...outroConfig.milestones];
                        newM[idx].fr = e.target.value;
                        setOutroConfig({ ...outroConfig, milestones: newM });
                      }}
                      placeholder="Message FR"
                      className="flex-1 bg-[#1a1a1a] border border-white/20 rounded px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={m.en}
                      onChange={(e) => {
                        const newM = [...outroConfig.milestones];
                        newM[idx].en = e.target.value;
                        setOutroConfig({ ...outroConfig, milestones: newM });
                      }}
                      placeholder="Message EN"
                      className="flex-1 bg-[#1a1a1a] border border-white/20 rounded px-2 py-1 text-xs text-white"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          setIsTranslatingOutro(true);
                          const t = await autoTranslate(m.fr, "fr");
                          const newM = [...outroConfig.milestones];
                          newM[idx].en = t;
                          setOutroConfig({ ...outroConfig, milestones: newM });
                          setIsTranslatingOutro(false);
                        }}
                        className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white"
                      >
                        <Languages size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setPreviewMilestone(m);
                          setTimeout(() => setPreviewMilestone(null), 3000);
                        }}
                        className="p-1.5 bg-white/5 rounded text-green-400 hover:bg-green-500 hover:text-black"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => {
                          const newM = outroConfig.milestones.filter(
                            (_: any, i: number) => i !== idx,
                          );
                          setOutroConfig({ ...outroConfig, milestones: newM });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/20 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setOutroConfig({
                    ...outroConfig,
                    milestones: [
                      ...(outroConfig.milestones || []),
                      {
                        id: Date.now().toString(),
                        name: "",
                        percent: 50,
                        fr: "Moitié du chemin fait !",
                        en: "Halfway there!",
                      },
                    ],
                  })
                }
                className="w-full py-2 border border-dashed border-green-500/30 text-green-400 text-xs font-bold rounded hover:bg-green-500/10"
              >
                + Ajouter un palier
              </button>
            </div>
          </div>

          {/* 4. BIBLIOTHÈQUE D'ÉVÉNEMENTS NARRATIFS */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h4 className="text-sm font-bold text-purple-400 border-b border-purple-500/20 pb-2 flex items-center gap-2">
              <Zap size={16} /> 4. Bibliothèque d'Événements (Assignables aux
              Hotspots/Énigmes)
            </h4>
            <p className="text-xs text-gray-400">
              Sélectionnez une règle que vous avez nommée ci-dessus pour la
              transformer en événement assignable.
            </p>

            <div className="space-y-3">
              {(outroConfig.narrative_events || []).map(
                (ev: any, idx: number) => (
                  <div
                    key={ev.id || idx}
                    className="flex gap-3 items-center bg-purple-950/20 p-3 rounded-lg border border-purple-500/20"
                  >
                    <div className="flex-1">
                      <select
                        value={`${ev.source_type}|${ev.source_id}`}
                        onChange={(e) => {
                          const n = [...outroConfig.narrative_events];
                          const [type, id] = e.target.value.split("|");
                          const ruleName =
                            type === "rank"
                              ? outroConfig.ranks.find((r: any) => r.id === id)
                                ?.name
                              : type === "game_over"
                                ? outroConfig.game_overs.find(
                                  (g: any) => g.id === id,
                                )?.name
                                : type === "abandon"
                                  ? outroConfig.abandons.find(
                                    (a: any) => a.id === id,
                                  )?.name
                                  : outroConfig.milestones.find(
                                    (m: any) => m.id === id,
                                  )?.name || "";
                          n[idx] = {
                            id: n[idx].id,
                            source_type: type,
                            source_id: id,
                            name: ruleName,
                          };
                          setOutroConfig({
                            ...outroConfig,
                            narrative_events: n,
                          });
                        }}
                        className="w-full bg-[#1a1a1a] border border-purple-500/30 rounded px-3 py-2 text-sm text-white"
                      >
                        <option value="">-- Choisir une règle nommée --</option>
                        <optgroup label="🏆 1. Victoires & Rangs">
                          {(outroConfig.ranks || [])
                            .filter((r: any) => r.name)
                            .map((r: any) => (
                              <option key={r.id} value={`rank|${r.id}`}>
                                Rang: {r.name} ({r.min_percent}%)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="💀 2. Fins Tragiques (Game Over)">
                          {(outroConfig.game_overs || [])
                            .filter((g: any) => g.name)
                            .map((g: any) => (
                              <option key={g.id} value={`game_over|${g.id}`}>
                                Game Over: {g.name}
                              </option>
                            ))}
                        </optgroup>

                        <optgroup label="🚪 2.5 Abandons">
                          {(outroConfig.abandons || [])
                            .filter((a: any) => a.name)
                            .map((a: any) => (
                              <option key={a.id} value={`abandon|${a.id}`}>
                                Abandon: {a.name}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="💭 3. Paliers (Toasts)">
                          {(outroConfig.milestones || [])
                            .filter((m: any) => m.name)
                            .map((m: any) => (
                              <option key={m.id} value={`milestone|${m.id}`}>
                                Toast: {m.name} ({m.percent}%)
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                    <div className="w-48">
                      <input
                        type="text"
                        value={ev.name}
                        readOnly
                        placeholder="Nom auto"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-2 text-xs text-gray-400 font-mono"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const n = outroConfig.narrative_events.filter(
                          (_: any, i: number) => i !== idx,
                        );
                        setOutroConfig({ ...outroConfig, narrative_events: n });
                      }}
                      className="p-2 text-red-500 hover:bg-red-500/20 rounded flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              )}
              <button
                onClick={() =>
                  setOutroConfig({
                    ...outroConfig,
                    narrative_events: [
                      ...(outroConfig.narrative_events || []),
                      {
                        id: Date.now().toString(),
                        source_type: "",
                        source_id: "",
                        name: "",
                      },
                    ],
                  })
                }
                className="w-full py-2 border border-dashed border-purple-500/50 text-purple-400 text-xs font-bold rounded hover:bg-purple-500/10"
              >
                + Créer un Événement à partir d'une règle
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => saveOutroConfig(editingId)}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Save size={18} /> Sauvegarder toute la configuration (Temps,
              Rangs, Game Over)
            </button>
          </div>
        </div>
      )}

      {/* Modale Aperçu Outro Ciblée */}
      {showOutroPreview !== false && outroConfig && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setShowOutroPreview(false)}
              className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/20 backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
          <InvestigationOutro
            investigation={{
              title_fr: invData.title_fr,
              title_en: invData.title_en,
              reward_cauris: invData.reward,
            }}
            lang="fr"
            solvedEnigmas={[]}
            totalEnigmas={3}
            collectedEvidences={[]}
            totalEvidences={4}
            config={outroConfig}
            isTimeout={showOutroPreview.isTimeout}
            forcedPreview={{
              title: showOutroPreview.title,
              message: showOutroPreview.message,
              color: showOutroPreview.color,
              score: showOutroPreview.score,
            }}
            onReplay={() => setShowOutroPreview(false)}
            onExit={() => setShowOutroPreview(false)}
          />
        </div>
      )}

      {/* 🟡 APERÇU ABANDON 🟡 */}
      <AnimatePresence>
        {previewAbortMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-md w-full bg-[#111] border border-yellow-500/30 rounded-2xl p-6 text-center space-y-6"
            >
              <AlertTriangle size={48} className="mx-auto text-yellow-500" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Aperçu : Abandon
                </h2>
                <p className="text-gray-400 text-sm italic">
                  "{previewAbortMsg}"
                </p>
              </div>
              <button
                onClick={() => setPreviewAbortMsg(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Fermer l'aperçu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 TOAST D'ENCOURAGEMENT (APERÇU ADMIN) 🟢 */}
      <AnimatePresence>
        {previewMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-[9999] bg-[#D4AF37]/90 text-black px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(212,175,55,0.5)] flex items-center gap-3"
          >
            <Trophy size={18} />
            <span>{previewMilestone.fr}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════
          NIVEAU 2 : CHAPITRES
      ════════════════════════════════════════════════════ */}

      {editingId && (
        <div className="bg-red-950/10 p-4 sm:p-6 rounded-xl border border-red-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-red-500/20 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ListOrdered size={18} className="text-red-400 flex-shrink-0" />
              Le Scénario de l'Enquête
            </h3>
            <button
              onClick={addChapter}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-500 font-bold shadow-lg w-full sm:w-auto justify-center"
            >
              <PlusCircle size={14} /> Ajouter un Chapitre
            </button>
          </div>

          {chapters.map((chap, cIdx) => {
            const isExpanded = expandedChapters[chap.id] !== false;
            return (
              <div
                key={chap.id}
                className="bg-[#0a0a0a] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleChapter(chap.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
                      {cIdx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-red-400 font-bold text-sm truncate">
                        {chap.title_fr || `Chapitre ${cIdx + 1}`}
                      </p>
                      <p className="text-gray-600 text-[10px]">
                        {(chap.scenes || []).length} scène(s) •{" "}
                        {(chap.enigmas || []).length} énigme(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete({
                          id: chap.id,
                          table: "investigation_chapters",
                        });
                        setDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-white/5 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                          Titre (FR)
                        </label>
                        <input
                          type="text"
                          value={chap.title_fr}
                          onChange={(e) =>
                            updateLocalChapter(
                              chap.id,
                              "title_fr",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            updateDB("investigation_chapters", chap.id, {
                              title_fr: e.target.value,
                            })
                          }
                          placeholder="Ex: Le télégramme secret"
                          className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-red-500/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                          Titre (EN)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chap.title_en || ""}
                            onChange={(e) =>
                              updateLocalChapter(
                                chap.id,
                                "title_en",
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              updateDB("investigation_chapters", chap.id, {
                                title_en: e.target.value,
                              })
                            }
                            placeholder="Ex: The secret telegram"
                            className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-red-500/50 outline-none"
                          />
                          <button
                            onClick={() =>
                              handleTranslateNested(
                                chap.title_fr,
                                "investigation_chapters",
                                chap.id,
                                "title_en",
                                (val) =>
                                  updateLocalChapter(chap.id, "title_en", val),
                              )
                            }
                            className="p-2 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                          >
                            {isProcessing === chap.id + "title_en" ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Languages size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <FileText size={10} /> L'Histoire (FR)
                        </label>
                        <textarea
                          rows={4}
                          value={chap.narrative_fr}
                          onChange={(e) =>
                            updateLocalChapter(
                              chap.id,
                              "narrative_fr",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            updateDB("investigation_chapters", chap.id, {
                              narrative_fr: e.target.value,
                            })
                          }
                          placeholder="Ex: Ce matin du 17 janvier..."
                          className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none focus:border-red-500/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <FileText size={10} /> L'Histoire (EN)
                        </label>
                        <div className="flex gap-2 items-start">
                          <textarea
                            rows={4}
                            value={chap.narrative_en || ""}
                            onChange={(e) =>
                              updateLocalChapter(
                                chap.id,
                                "narrative_en",
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              updateDB("investigation_chapters", chap.id, {
                                narrative_en: e.target.value,
                              })
                            }
                            placeholder="Ex: On the morning of January 17..."
                            className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none focus:border-red-500/50 outline-none"
                          />
                          <button
                            onClick={() =>
                              handleTranslateNested(
                                chap.narrative_fr,
                                "investigation_chapters",
                                chap.id,
                                "narrative_en",
                                (val) =>
                                  updateLocalChapter(
                                    chap.id,
                                    "narrative_en",
                                    val,
                                  ),
                              )
                            }
                            className="p-2 bg-white/5 rounded text-gray-400 hover:text-white mt-1 flex-shrink-0"
                          >
                            {isProcessing === chap.id + "narrative_en" ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Languages size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Paperclip size={10} /> Pièces à Conviction du Chapitre
                      </label>
                      {renderEvidenceList(chap.id, "chapter")}
                    </div>

                    <div className="border-t border-white/5 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe size={16} className="text-purple-400" />
                        <h5 className="text-sm font-bold text-white">
                          Scènes Panoramiques 360°
                        </h5>
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                          {(chap.scenes || []).length} scène(s)
                        </span>
                      </div>
                      <PanoramaHotspotEditor
                        investigationId={editingId!} // <-- LIGNE À AJOUTER
                        chapterId={chap.id}
                        scenes={chap.scenes || []}
                        evidences={evidences}
                        chapters={chapters}
                        currentChapterId={chap.id}
                        onScenesUpdate={() => fetchFullScenario(editingId!)}
                        lang="fr"
                        outroConfig={outroConfig}
                      />
                    </div>

                    <div className="border-t border-white/5 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <FileQuestion size={10} /> Énigmes du Chapitre
                        </label>
                        <button
                          onClick={() => addEnigma(chap.id)}
                          className="text-xs text-yellow-500 font-bold flex items-center gap-1 bg-yellow-500/10 px-3 py-1.5 rounded hover:bg-yellow-500/20 border border-yellow-500/20"
                        >
                          <PlusCircle size={12} /> Ajouter une Énigme
                        </button>
                      </div>
                      <div className="space-y-4">



                        {chap.enigmas?.map((enig: any, eIdx: number) => {
                          const enigmaType = enig.enigma_type || "text";

                          return (
                            <div
                              key={enig.id}
                              className="bg-[#1a1a1a] p-4 rounded-lg border border-yellow-500/20 relative"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-yellow-500 font-bold flex items-center gap-1">
                                  <FileQuestion size={12} /> Énigme {eIdx + 1}
                                </span>
                                <button
                                  onClick={() => {
                                    setItemToDelete({
                                      id: enig.id,
                                      table: "investigation_enigmas",
                                    });
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1 text-gray-600 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Sélectionner un indice existant */}
                              <div className="mb-4">
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                  📎 Sélectionner un indice (preuve média)
                                </label>
                                <select
                                  value={enig.evidence_id || ""}
                                  onChange={(event) => {
                                    const newValue = event.target.value || null;
                                    setChapters((prev) =>
                                      prev.map((c) => ({
                                        ...c,
                                        enigmas: c.enigmas.map((enigma: any) =>
                                          enigma.id === enig.id
                                            ? {
                                              ...enigma,
                                              evidence_id: newValue,
                                            }
                                            : enigma,
                                        ),
                                      })),
                                    );

                                    // ✅ Sauvegarde AVEC gestion d'erreur
                                    supabase
                                      .from("investigation_enigmas")
                                      .update({ evidence_id: newValue })
                                      .eq("id", enig.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          console.error(
                                            "Erreur SQL evidence_id:",
                                            error,
                                          );
                                          showMsg(
                                            "error",
                                            `Erreur BDD: ${error.message}`,
                                          );
                                        } else {
                                          showMsg(
                                            "success",
                                            "✅ Indice lié à l'énigme !",
                                          );
                                        }
                                      });
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50"
                                >
                                  <option value="">— Aucun indice —</option>
                                  {evidences.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                      {ev.media_type === "image"
                                        ? "🖼️"
                                        : ev.media_type === "audio"
                                          ? "🎵"
                                          : "📄"}{" "}
                                      {ev.name_fr}
                                    </option>
                                  ))}
                                </select>
                                {enig.evidence_id &&
                                  (() => {
                                    const ev = evidences.find(
                                      (e) => e.id === enig.evidence_id,
                                    );
                                    return ev ? (
                                      <p className="text-[10px] text-gray-600 mt-1">
                                        ✅ Indice sélectionné : {ev.name_fr}
                                      </p>
                                    ) : null;
                                  })()}
                              </div>

                              {/* Portée et Configuration Énigme */}
                              <div className="mb-4 space-y-3 bg-blue-900/10 p-3 rounded border border-blue-500/20">
                                <div>
                                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                    📍 Portée de l'énigme
                                  </label>
                                  <select
                                    value={
                                      enig.scene_id ? "specific" : "chapter"
                                    }
                                    onChange={(e) => {
                                      if (e.target.value === "specific") {
                                        // Sélectionner la première scène par défaut
                                        const firstScene = chap.scenes?.[0];
                                        setChapters((prev) =>
                                          prev.map((c) => ({
                                            ...c,
                                            enigmas: c.enigmas.map((e: any) =>
                                              e.id === enig.id
                                                ? {
                                                  ...e,
                                                  scene_id:
                                                    firstScene?.id || null,
                                                }
                                                : e,
                                            ),
                                          })),
                                        );
                                        supabase
                                          .from("investigation_enigmas")
                                          .update({
                                            scene_id: firstScene?.id || null,
                                          })
                                          .eq("id", enig.id);
                                      } else {
                                        setChapters((prev) =>
                                          prev.map((c) => ({
                                            ...c,
                                            enigmas: c.enigmas.map((e: any) =>
                                              e.id === enig.id
                                                ? { ...e, scene_id: null }
                                                : e,
                                            ),
                                          })),
                                        );
                                        supabase
                                          .from("investigation_enigmas")
                                          .update({ scene_id: null })
                                          .eq("id", enig.id);
                                      }
                                    }}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                  >
                                    <option value="chapter">
                                      📚 Tout le chapitre
                                    </option>
                                    <option value="specific">
                                      📍 Scène spécifique
                                    </option>
                                  </select>
                                </div>

                                {/* Si scène spécifique, afficher le select */}
                                {enig.scene_id && (
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                      Choisir la scène
                                    </label>
                                    <select
                                      value={enig.scene_id || ""}
                                      onChange={(event) => {
                                        // ✅ Renomme 'e' en 'event'
                                        setChapters((prev) =>
                                          prev.map((c) => ({
                                            ...c,
                                            enigmas: c.enigmas.map(
                                              (
                                                enigma: any, // ✅ Renomme 'e' en 'enigma'
                                              ) =>
                                                enigma.id === enig.id
                                                  ? {
                                                    ...enigma,
                                                    scene_id:
                                                      event.target.value ||
                                                      null,
                                                  }
                                                  : enigma, // ✅ Utilise event et enigma
                                            ),
                                          })),
                                        );
                                        supabase
                                          .from("investigation_enigmas")
                                          .update({
                                            scene_id:
                                              event.target.value || null,
                                          }) // ✅ event ici aussi
                                          .eq("id", enig.id);
                                      }}
                                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    >
                                      <option value="">
                                        — Sélectionner une scène —
                                      </option>
                                      {(chap.scenes || []).map(
                                        (scene: any, idx: number) => (
                                          <option
                                            key={scene.id}
                                            value={scene.id}
                                          >
                                            Scène {idx + 1} — {scene.title_fr}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                )}
                                {/* Timer d'énigme */}
                                <div>
                                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block flex items-center gap-1">
                                    <Clock size={12} /> Timer d'énigme (secondes)
                                  </label>
                                  <input
                                    type="number"
                                    value={enig.enigma_timer_seconds || 0}
                                    onChange={(event) => {  // ✅ Renomme 'e' en 'event'
                                      setChapters(prev => prev.map(c => ({
                                        ...c,
                                        enigmas: c.enigmas.map((enigma: any) =>  // ✅ Renomme 'e' en 'enigma'
                                          enigma.id === enig.id ? { ...enigma, enigma_timer_seconds: Number(event.target.value) } : enigma  // ✅ event et enigma
                                        )
                                      })));
                                    }}
                                    onBlur={(event) => {  // ✅ Aussi ici
                                      supabase
                                        .from('investigation_enigmas')
                                        .update({ enigma_timer_seconds: Number(event.target.value) })
                                        .eq('id', enig.id);
                                    }}
                                    placeholder="0 = pas de timer"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                  />
                                </div>
                                {/* Instruction si timeout */}
                                {enig.enigma_timer_seconds > 0 && (
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block flex items-center gap-1">
                                      <AlertTriangle
                                        size={12}
                                        className="text-red-400"
                                      />{" "}
                                      Action à l'expiration (optionnel)
                                    </label>
                                    <select
                                      value={enig.timer_timeout_instruction_id || ''}
                                      onChange={(event) => {  // ✅ Renomme
                                        setChapters(prev => prev.map(c => ({
                                          ...c,
                                          enigmas: c.enigmas.map((enigma: any) =>  // ✅ Renomme
                                            enigma.id === enig.id ? { ...enigma, timer_timeout_instruction_id: event.target.value || null } : enigma  // ✅
                                          )
                                        })));
                                        supabase
                                          .from('investigation_enigmas')
                                          .update({ timer_timeout_instruction_id: event.target.value || null })
                                          .eq('id', enig.id);
                                      }}
                                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                    >
                                      <option value="">
                                        — Aucune action —
                                      </option>
                                      {allInstructions.map((instr: any) => (
                                        <option key={instr.id} value={instr.id}>
                                          {instr.icon} {instr.name}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-[10px] text-gray-600 mt-1">
                                      Une instruction s'affichera quand ce timer
                                      arrive à 0
                                    </p>
                                  </div>
                                )}
                              </div>



                              {/* ✅ NOUVEAU : Événements narratifs liés à l'énigme */}
                              <div className="border-t border-white/10 pt-4 space-y-4 bg-purple-900/10 p-3 rounded border border-purple-500/20">
                                <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Zap size={12} /> Événements Narratifs (selon le résultat)
                                </h4>

                                {/* Si RÉSOLUE */}
                                <div>
                                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                    ✅ Si énigme résolue
                                  </label>
                                  <select
                                    value={enig.trigger_event_on_success_id || ''}
                                    onChange={(event) => {
                                      setChapters(prev => prev.map(c => ({
                                        ...c,
                                        enigmas: c.enigmas.map((enigma: any) =>
                                          enigma.id === enig.id ? { ...enigma, trigger_event_on_success_id: event.target.value || null } : enigma
                                        )
                                      })));
                                    }}
                                    onBlur={async (event) => {
                                      const enigmaToSave = chapters
                                        .find(c => c.id === chap.id)
                                        ?.enigmas?.find((en: any) => en.id === enig.id);
                                      if (enigmaToSave) {
                                        enigmaToSave.trigger_event_on_success_id = event.target.value || null;
                                        await saveEnigmaToDb(enigmaToSave);
                                      }
                                    }}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                  >
                                    <option value="">— Aucun événement —</option>
                                    {(outroConfig?.narrative_events || []).map((ev: any) => (
                                      <option key={ev.id} value={ev.id}>
                                        {ev.name || `Événement ${ev.id.slice(0, 4)}`}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-gray-600 mt-1">Cet événement se déclenche quand le joueur résout l'énigme</p>
                                </div>

                                {/* Si RATÉE */}
                                <div>
                                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                    ❌ Si énigme ratée (budget = 0)
                                  </label>
                                  <select
                                    value={enig.trigger_event_on_failure_id || ''}
                                    onChange={(event) => {
                                      setChapters(prev => prev.map(c => ({
                                        ...c,
                                        enigmas: c.enigmas.map((enigma: any) =>
                                          enigma.id === enig.id ? { ...enigma, trigger_event_on_failure_id: event.target.value || null } : enigma
                                        )
                                      })));
                                    }}
                                    onBlur={async (event) => {
                                      const enigmaToSave = chapters
                                        .find(c => c.id === chap.id)
                                        ?.enigmas?.find((en: any) => en.id === enig.id);
                                      if (enigmaToSave) {
                                        enigmaToSave.trigger_event_on_failure_id = event.target.value || null;
                                        await saveEnigmaToDb(enigmaToSave);
                                      }
                                    }}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                  >
                                    <option value="">— Aucun événement —</option>
                                    {(outroConfig?.narrative_events || []).map((ev: any) => (
                                      <option key={ev.id} value={ev.id}>
                                        {ev.name || `Événement ${ev.id.slice(0, 4)}`}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-gray-600 mt-1">Cet événement se déclenche si le joueur épuise son budget en tentant cette énigme</p>
                                </div>

                                {/* Si TIMEOUT */}
                                <div>
                                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                    ⏱️ Si timer énigme = 0
                                  </label>
                                  <select
                                    value={enig.trigger_event_on_timeout_id || ''}
                                    onChange={(event) => {
                                      setChapters(prev => prev.map(c => ({
                                        ...c,
                                        enigmas: c.enigmas.map((enigma: any) =>
                                          enigma.id === enig.id ? { ...enigma, trigger_event_on_timeout_id: event.target.value || null } : enigma
                                        )
                                      })));
                                    }}
                                    onBlur={async (event) => {
                                      const enigmaToSave = chapters
                                        .find(c => c.id === chap.id)
                                        ?.enigmas?.find((en: any) => en.id === enig.id);
                                      if (enigmaToSave) {
                                        enigmaToSave.trigger_event_on_timeout_id = event.target.value || null;
                                        await saveEnigmaToDb(enigmaToSave);
                                      }
                                    }}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                  >
                                    <option value="">— Aucun événement —</option>
                                    {(outroConfig?.narrative_events || []).map((ev: any) => (
                                      <option key={ev.id} value={ev.id}>
                                        {ev.name || `Événement ${ev.id.slice(0, 4)}`}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-gray-600 mt-1">Cet événement se déclenche quand le timer de l'énigme arrive à 0</p>
                                </div>

                                {/* Comportement du timer */}
                                {enig.enigma_timer_seconds > 0 && (
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                      ⚙️ Comportement du timer
                                    </label>
                                    <select
                                      value={enig.timer_behavior || 'alert'}
                                      onChange={(event) => {
                                        setChapters(prev => prev.map(c => ({
                                          ...c,
                                          enigmas: c.enigmas.map((enigma: any) =>
                                            enigma.id === enig.id ? { ...enigma, timer_behavior: event.target.value as any } : enigma
                                          )
                                        })));
                                      }}
                                      onBlur={async (event) => {
                                        const enigmaToSave = chapters
                                          .find(c => c.id === chap.id)
                                          ?.enigmas?.find((en: any) => en.id === enig.id);
                                        if (enigmaToSave) {
                                          enigmaToSave.timer_behavior = event.target.value as any;
                                          await saveEnigmaToDb(enigmaToSave);
                                        }
                                      }}
                                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                    >
                                      <option value="alert">💡 Juste alerte (le jeu continue)</option>
                                      <option value="pause">⏸️ Pause le jeu (le joueur ne peut plus répondre)</option>
                                      <option value="end_game">🔴 Termine le jeu (affiche une fin alternative)</option>
                                    </select>
                                    <p className="text-[10px] text-gray-600 mt-1">Que faire quand ce timer arrive à 0 ?</p>
                                  </div>
                                )}
                              </div>

                              {/* Mode de réponse */}
                              <div className="mb-4">
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
                                  Mode de réponse
                                </label>
                                <div className="flex gap-2">
                                  {[
                                    {
                                      value: "text",
                                      label: "✍️ Texte à taper",
                                      activeClass:
                                        "bg-gray-600/30 border-gray-500/50 text-gray-400",
                                    },
                                    {
                                      value: "choice",
                                      label: "✅ Choix multiples",
                                      activeClass:
                                        "bg-green-600/30 border-green-500/50 text-green-400",
                                    },
                                  ].map((type) => (
                                    <button
                                      key={type.value}
                                      onClick={() => {
                                        setChapters((prev) =>
                                          prev.map((c) => ({
                                            ...c,
                                            enigmas: c.enigmas.map((e: any) =>
                                              e.id === enig.id
                                                ? {
                                                  ...e,
                                                  response_type: type.value,
                                                }
                                                : e,
                                            ),
                                          })),
                                        );
                                        supabase
                                          .from("investigation_enigmas")
                                          .update({ response_type: type.value })
                                          .eq("id", enig.id);
                                      }}
                                      className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${(enig.response_type || "text") ===
                                        type.value
                                        ? type.activeClass
                                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                                        }`}
                                    >
                                      {type.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Questions FR/EN */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={enig.question_fr || ""}
                                    onChange={(e) =>
                                      updateLocalEnigma(
                                        chap.id,
                                        enig.id,
                                        "question_fr",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={async (e) => {
                                      // ✅ NOUVEAU : Sauvegarder l'énigme complète
                                      const enigmaToSave = chapters
                                        .find(c => c.id === chap.id)
                                        ?.enigmas?.find((en: any) => en.id === enig.id);
                                      if (enigmaToSave) {
                                        await saveEnigmaToDb(enigmaToSave);
                                      }
                                    }}
                                    placeholder="Question FR"
                                    className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none"
                                  />
                                  <div className="flex items-center gap-2">
                                    <KeyRound
                                      size={12}
                                      className="text-green-500 flex-shrink-0"
                                    />
                                    <input
                                      type="text"
                                      value={enig.expected_answer_fr || ""}
                                      onChange={(e) =>
                                        updateLocalEnigma(
                                          chap.id,
                                          enig.id,
                                          "expected_answer_fr",
                                          e.target.value,
                                        )
                                      }
                                      onBlur={(e) =>
                                        updateDB(
                                          "investigation_enigmas",
                                          enig.id,
                                          {
                                            expected_answer_fr: e.target.value,
                                          },
                                        )
                                      }
                                      placeholder="Réponse FR"
                                      className="flex-1 bg-[#111] border border-green-500/30 rounded px-3 py-1.5 text-sm font-mono text-green-400 focus:border-green-500 outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={enig.question_en || ""}
                                      onChange={(e) =>
                                        updateLocalEnigma(
                                          chap.id,
                                          enig.id,
                                          "question_en",
                                          e.target.value,
                                        )
                                      }
                                      onBlur={(e) =>
                                        updateDB(
                                          "investigation_enigmas",
                                          enig.id,
                                          { question_en: e.target.value },
                                        )
                                      }
                                      placeholder="Question EN"
                                      className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none"
                                    />
                                    <button
                                      onClick={() =>
                                        handleTranslateNested(
                                          enig.question_fr,
                                          "investigation_enigmas",
                                          enig.id,
                                          "question_en",
                                          (val) =>
                                            updateLocalEnigma(
                                              chap.id,
                                              enig.id,
                                              "question_en",
                                              val,
                                            ),
                                        )
                                      }
                                      className="p-2 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                                    >
                                      {isProcessing ===
                                        enig.id + "question_en" ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Languages size={14} />
                                      )}
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={enig.expected_answer_en || ""}
                                    onChange={(e) =>
                                      updateLocalEnigma(
                                        chap.id,
                                        enig.id,
                                        "expected_answer_en",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={(e) =>
                                      updateDB(
                                        "investigation_enigmas",
                                        enig.id,
                                        {
                                          expected_answer_en: e.target.value,
                                        },
                                      )
                                    }
                                    placeholder="Réponse EN (optionnel)"
                                    className="w-full bg-[#111] border border-green-500/10 rounded px-3 py-1.5 text-sm font-mono text-green-400 focus:border-green-500 outline-none"
                                  />
                                </div>
                              </div>

                              {/* ── SI MODE CHOIX MULTIPLES ── */}
                              {(enig.response_type || "text") === "choice" && (
                                <div className="mb-4 p-4 bg-green-900/10 border border-green-500/20 rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-green-400 font-bold uppercase">
                                      ✅ Options de réponse (max 4)
                                    </label>
                                    <button
                                      onClick={() => addChoice(enig.id)}
                                      disabled={
                                        (enig.choices_fr || []).length >= 4
                                      }
                                      className="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-500/30 rounded text-xs font-bold hover:bg-green-600/40 flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <PlusCircle size={10} /> Ajouter
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {(enig.choices_fr || []).map(
                                      (choice: string, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex gap-2 items-center"
                                        >
                                          {/* Radio pour la bonne réponse */}
                                          <input
                                            type="radio"
                                            name={`correct-${enig.id}`}
                                            checked={
                                              enig.correct_choice_index === idx
                                            }
                                            onChange={() =>
                                              setCorrectChoice(enig.id, idx)
                                            }
                                            className="w-4 h-4 accent-green-500"
                                          />
                                          {/* Option FR */}
                                          <input
                                            type="text"
                                            value={choice}
                                            onChange={(e) =>
                                              updateChoice(
                                                enig.id,
                                                idx,
                                                e.target.value,
                                                "fr",
                                              )
                                            }
                                            placeholder="Option FR"
                                            className="flex-1 bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-green-500"
                                          />
                                          {/* Option EN */}
                                          <input
                                            type="text"
                                            value={
                                              (enig.choices_en || [])[idx] || ""
                                            }
                                            onChange={(e) =>
                                              updateChoice(
                                                enig.id,
                                                idx,
                                                e.target.value,
                                                "en",
                                              )
                                            }
                                            placeholder="EN"
                                            className="flex-1 bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-green-500"
                                          />
                                          {/* Traduction */}
                                          <button
                                            onClick={async () => {
                                              if (!choice.trim()) return;
                                              const translated =
                                                await autoTranslate(
                                                  choice,
                                                  "fr",
                                                );
                                              updateChoice(
                                                enig.id,
                                                idx,
                                                translated,
                                                "en",
                                              );
                                            }}
                                            className="p-1.5 bg-white/5 rounded hover:bg-white/10"
                                          >
                                            <Languages
                                              size={10}
                                              className="text-gray-400"
                                            />
                                          </button>
                                          {/* Supprimer */}
                                          <button
                                            onClick={() =>
                                              deleteChoice(enig.id, idx)
                                            }
                                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      ),
                                    )}
                                    {(enig.choices_fr || []).length === 0 && (
                                      <p className="text-[10px] text-gray-600 italic">
                                        Aucune option
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-500">
                                    ⚠️ Cochez la radio button de la bonne
                                    réponse
                                  </p>
                                </div>
                              )}

                              {renderEvidenceList(enig.id, "enigma")}

                              {/* ✅ ASSIGNATION ÉVÉNEMENT NARRATIF */}
                              <div className="mt-4 bg-purple-900/10 border border-purple-500/20 rounded-lg p-3">
                                <label className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                                  <Zap size={10} /> Déclencher un Événement si
                                  résolue
                                </label>
                                <select
                                  value={enig.trigger_event_id || ""}
                                  onChange={(e) =>
                                    updateLocalEnigma(
                                      chap.id,
                                      enig.id,
                                      "trigger_event_id",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    updateDB("investigation_enigmas", enig.id, {
                                      trigger_event_id: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#111] border border-purple-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                                >
                                  <option value="">— Aucun événement —</option>
                                  {(outroConfig?.narrative_events || []).map(
                                    (ev: any) => (
                                      <option key={ev.id} value={ev.id}>
                                        {ev.type === "takeover" ? "🎬" : "💭"}{" "}
                                        {ev.name ||
                                          `Événement ${ev.id.slice(0, 4)}`}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>

                              <div className="mt-4 space-y-2 ml-0 sm:ml-4">
                                <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Lightbulb size={10} /> Indices (Payants)
                                </label>
                                {enig.clues?.map((clue: any, clIdx: number) => (
                                  <div
                                    key={clue.id}
                                    className="bg-blue-900/10 p-3 rounded border border-blue-500/20 relative space-y-3"
                                  >
                                    <button
                                      onClick={() => {
                                        setItemToDelete({
                                          id: clue.id,
                                          table: "investigation_clues",
                                        });
                                        setDeleteModalOpen(true);
                                      }}
                                      className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-500"
                                    >
                                      <X size={12} />
                                    </button>
                                    <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1 mb-2">
                                      <Lightbulb size={10} /> Indice {clIdx + 1}
                                    </span>

                                    {/* ✅ COÛT EN CAURIS */}
                                    <div className="flex gap-2 items-center p-2 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30">
                                      <span className="text-[10px] text-[#D4AF37] font-bold flex-shrink-0">💰</span>
                                      <input
                                        type="number"
                                        value={clue.reveal_cost_cauris ?? 5}
                                        onChange={(e) => {
                                          setChapters((prev) =>
                                            prev.map((c) => ({
                                              ...c,
                                              enigmas: c.enigmas.map((e: any) =>
                                                e.id === enig.id
                                                  ? {
                                                    ...e,
                                                    clues: e.clues.map(
                                                      (cl: any) =>
                                                        cl.id === clue.id
                                                          ? {
                                                            ...cl,
                                                            reveal_cost_cauris:
                                                              Number(
                                                                e.target
                                                                  .value
                                                              ),
                                                          }
                                                          : cl,
                                                    ),
                                                  }
                                                  : e,
                                              ),
                                            }))
                                          );
                                        }}
                                        onBlur={(e) =>
                                          updateDB(
                                            "investigation_clues",
                                            clue.id,
                                            {
                                              reveal_cost_cauris: Number(
                                                e.target.value
                                              ),
                                            },
                                          )
                                        }
                                        min={0}
                                        className="flex-1 bg-[#1a1a1a] border border-[#D4AF37]/30 rounded px-2 py-1 text-xs text-[#D4AF37] font-bold outline-none focus:border-[#D4AF37]"
                                        placeholder="5"
                                      />
                                      <span className="text-[10px] text-gray-500">Cauris</span>
                                    </div>

                                    {/* TEXTE */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                      <input
                                        type="text"
                                        value={clue.text_fr || ""}
                                        onChange={(e) =>
                                          updateLocalClue(
                                            chap.id,
                                            enig.id,
                                            clue.id,
                                            "text_fr",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) =>
                                          updateDB(
                                            "investigation_clues",
                                            clue.id,
                                            { text_fr: e.target.value },
                                          )
                                        }
                                        placeholder="Indice FR"
                                        className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500/50"
                                      />
                                      <div className="flex gap-1">
                                        <input
                                          type="text"
                                          value={clue.text_en || ""}
                                          onChange={(e) =>
                                            updateLocalClue(
                                              chap.id,
                                              enig.id,
                                              clue.id,
                                              "text_en",
                                              e.target.value,
                                            )
                                          }
                                          onBlur={(e) =>
                                            updateDB(
                                              "investigation_clues",
                                              clue.id,
                                              { text_en: e.target.value },
                                            )
                                          }
                                          placeholder="Indice EN"
                                          className="flex-1 bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500/50"
                                        />
                                        <button
                                          onClick={() =>
                                            handleTranslateNested(
                                              clue.text_fr,
                                              "investigation_clues",
                                              clue.id,
                                              "text_en",
                                              (val) =>
                                                updateLocalClue(
                                                  chap.id,
                                                  enig.id,
                                                  clue.id,
                                                  "text_en",
                                                  val,
                                                ),
                                            )
                                          }
                                          className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0"
                                        >
                                          {isProcessing ===
                                            clue.id + "text_en" ? (
                                            <Loader2
                                              size={12}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Languages size={12} />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* MÉDIAS (Image/Audio/Document) */}
                                    {renderEvidenceList(clue.id, "clue")}
                                  </div>
                                ))}
                                <button
                                  onClick={() => addClue(enig.id)}
                                  className="text-[10px] text-blue-400 font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-1.5 rounded hover:bg-blue-500/20"
                                >
                                  <PlusCircle size={10} /> Ajouter un Indice
                                </button>
                              </div>


                              {/* ✅ BOUTON SAUVEGARDER ÉNIGME */}
                              <div className="mt-6 pt-4 border-t border-white/10">
                                <button
                                  onClick={async () => {
                                    // Sauvegarder TOUS les champs de l'énigme en DB
                                    const { error } = await supabase
                                      .from('investigation_enigmas')
                                      .update({
                                        question_fr: enig.question_fr,
                                        question_en: enig.question_en,
                                        expected_answer_fr: enig.expected_answer_fr,
                                        expected_answer_en: enig.expected_answer_en,
                                        response_type: enig.response_type || 'text',
                                        choices_fr: enig.choices_fr || [],
                                        choices_en: enig.choices_en || [],
                                        correct_choice_index: enig.correct_choice_index,
                                        evidence_id: enig.evidence_id || null,
                                        scene_id: enig.scene_id || null,
                                        enigma_timer_seconds: enig.enigma_timer_seconds || 0,
                                        timer_timeout_instruction_id: enig.timer_timeout_instruction_id || null,
                                        trigger_event_id: enig.trigger_event_id || null,
                                      })
                                      .eq('id', enig.id);

                                    if (error) {
                                      showMsg('error', `Erreur sauvegarde: ${error.message}`);
                                    } else {
                                      showMsg('success', '✅ Énigme sauvegardée !');
                                    }
                                  }}
                                  className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                  <Save size={14} /> Sauvegarder cette Énigme
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ════ OUTILS DE DÉDUCTION ════ */}
                    <div className="border-t border-white/5 pt-6">
                      <div className="mb-4">
                        <h5 className="text-sm font-bold text-white flex items-center gap-2">
                          🧠 Outils de Déduction
                        </h5>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Configurez la timeline et le tableau de connexions. Le
                          joueur glisse ses preuves collectées pour valider ses
                          déductions.
                        </p>
                      </div>
                      <DeductionSection chap={chap} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {chapters.length === 0 && (
            <div className="text-center py-12 border border-dashed border-red-500/20 rounded-xl">
              <p className="text-gray-500 text-sm">Aucun chapitre créé</p>
              <p className="text-gray-600 text-xs mt-1">
                Cliquez sur "Ajouter un Chapitre" pour commencer le scénario
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          LISTE DES DOSSIERS EXISTANTS
      ════════════════════════════════════════════════════ */}
      {!editingId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investigations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl cursor-pointer hover:border-red-500/50 group transition-colors"
              onClick={() => handleEdit(inv)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {inv.cover_url ? (
                  <img
                    src={inv.cover_url}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded object-cover border border-white/10 group-hover:border-red-500/50 flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Search size={20} className="text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${inv.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
                    >
                      {inv.status === "published"
                        ? "✅ Publié"
                        : "📝 Brouillon"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/10 text-gray-300">
                      {inv.difficulty}
                    </span>
                  </div>
                  <p className="text-white text-sm font-bold group-hover:text-red-400 transition-colors truncate">
                    {inv.title_fr}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setItemToDelete({ id: inv.id, table: "investigations" });
                  setDeleteModalOpen(true);
                }}
                className="p-2 text-gray-500 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {investigations.length === 0 && (
            <div className="col-span-2 text-center py-12 border border-dashed border-white/10 rounded-xl">
              <Search className="mx-auto text-gray-600 mb-3" size={32} />
              <p className="text-gray-500 text-sm">Aucune enquête créée</p>
              <p className="text-gray-600 text-xs mt-1">
                Créez votre première enquête historique ci-dessus
              </p>
            </div>
          )}
        </div>
      )}

      <DeleteModal
        isOpen={deleteModalOpen}
        title="Confirmer la suppression"
        description="Action irréversible. Les médias liés seront supprimés du scénario."
        itemName="cet élément"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        isDeleting={isDeleting}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />
    </div>
  );
}
