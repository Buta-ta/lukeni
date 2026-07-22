"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import {
  Save,
  Loader2,
  Languages,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  Zap,
  Lightbulb,
  DollarSign,
  Upload,
  ImagePlus,
  Music,
  Eye,
  Sliders,
} from "lucide-react";
import MiniGamePreview from "./MiniGamePreview";
import { RefreshCw } from "lucide-react"; // ✅ ajouter cette icône aux imports existants

import dynamic from "next/dynamic";

const AdminMapGeo = dynamic(() => import("./AdminMapGeo"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center p-10">
      <Loader2 className="animate-spin text-amber-500" />
    </div>
  ),
});

interface Props {
  investigationId: string;
  miniGameId?: string;
  chapters: any[];
  outroConfig: any;
  allInstructions: any[];
  showMsg: (type: "success" | "error", text: string) => void;
  onSaved: () => void;
  onCancel: () => void;
}

// ── COMPOSANT INTERNE : UPLOADER CLOUDINARY ──
const MediaUploader: React.FC<{
  label: string;
  url: string | undefined;
  onUpload: (url: string) => void;
  resourceType?: "image" | "video" | "auto";
  icon?: React.ReactNode;
}> = ({ label, url, onUpload, resourceType = "image", icon }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = () => createWidget();
      document.body.appendChild(script);
    } else {
      createWidget();
    }

    function createWidget() {
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
              console.error("Erreur signature Cloudinary", err);
            }
          },
          sources: ["local", "url", "camera", "image_search"],
          resourceType: resourceType,
          folder: "lukeni/investigations/minigames",
          multiple: false,
        },
        (error: any, result: any) => {
          setIsUploading(false);
          if (result?.event === "success") {
            onUpload(result.info.secure_url);
          }
          if (error) {
            console.error("Cloudinary error:", error);
          }
        },
      );
      widget.open();
    }
  };

  return (
    <div>
      <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={url || ""}
          onChange={(e) => onUpload(e.target.value)}
          placeholder="URL du média ou uploader"
          className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="px-3 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-600/40 flex items-center gap-1 flex-shrink-0"
        >
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          Upload
        </button>
      </div>
      {url && resourceType === "image" && (
        <div className="mt-2 relative rounded-lg overflow-hidden border border-white/10 h-20 w-full bg-black/30">
          <img src={url} className="w-full h-full object-cover" alt="preview" />
        </div>
      )}
      {url && resourceType === "video" && (
        <div className="mt-2 p-2 bg-black/30 rounded border border-white/10">
          <audio src={url} controls className="w-full h-8" />
        </div>
      )}
    </div>
  );
};

export default function MiniGameEditor({
  investigationId,
  miniGameId,
  chapters,
  outroConfig,
  allInstructions,
  showMsg,
  onSaved,
  onCancel,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLang, setPreviewLang] = useState<"fr" | "en">("fr");

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    general: true,
    config: true,
    scope: true,
    economy: false,
    timer: false,
    attempts: false,
    triggers: false,
    clues: false,
    instruction: false,
  });

  const [formData, setFormData] = useState<any>({
    type: "radio",
    title_fr: "",
    title_en: "",
    chapter_id: chapters[0]?.id || "",
    scene_id: null,
    instruction_id: null,
    config: {},
    reward_cauris: 15,
    reward_per_step: 0,
    penalty_per_error: 1,
    starting_hint_cost: 5,
    timer_seconds: 0,
    timer_behavior: "alert",
    max_attempts: 0,
    attempt_behavior: "alert",
    trigger_event_on_success_id: null,
    trigger_event_on_failure_id: null,
    trigger_event_on_timeout_id: null,
    trigger_event_on_max_attempts_id: null,
    success_target_scene_id: null,
    success_target_chapter_id: null,
    failure_target_scene_id: null,
    failure_target_chapter_id: null,
    timeout_target_scene_id: null,
    timeout_target_chapter_id: null,
    max_attempts_target_scene_id: null,
    max_attempts_target_chapter_id: null,
    mini_game_clues: [],
  });

  useEffect(() => {
    if (!miniGameId) return;
    let isMounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("investigation_mini_games")
        .select("*, mini_game_clues:investigation_mini_game_clues(*)")
        .eq("id", miniGameId)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("Load mini game error:", error);
      } else if (data) {
        setFormData({
          ...data,
          mini_game_clues: data.mini_game_clues || [], // CORRIGÉ : L'alias correct
        });
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [miniGameId]);

  const getCleanConfig = (type: string, currentConfig: any) => {
    switch (type) {
      case "radio":
        return {
          audio_url_fr: currentConfig?.audio_url_fr || "",
          audio_url_en: currentConfig?.audio_url_en || "",
          target_frequency: currentConfig?.target_frequency || 104.2,
          expected_answer_fr: currentConfig?.expected_answer_fr || "",
          expected_answer_en: currentConfig?.expected_answer_en || "",
        };
      case "puzzle":
        return {
          puzzle_image_url_fr: currentConfig?.puzzle_image_url_fr || "",
          puzzle_image_url_en: currentConfig?.puzzle_image_url_en || "",
          grid_size: currentConfig?.grid_size || 3,
        };
      case "canvas":
        return {
          opaque_image_url: currentConfig?.opaque_image_url || "",
          revealed_image_url: currentConfig?.revealed_image_url || "",
          reveal_threshold: currentConfig?.reveal_threshold || 75,
          brush_size: currentConfig?.brush_size || "medium",
          show_progress_bar: currentConfig?.show_progress_bar !== false,
        };
      case "map":
        return {
          map_mode: currentConfig?.map_mode || "image",
          map_url_fr: currentConfig?.map_url_fr || "",
          map_url_en: currentConfig?.map_url_en || "",
          points: currentConfig?.points || [],
          geo_points: currentConfig?.geo_points || [],
          map_center: currentConfig?.map_center || [0, 0],
          map_zoom: currentConfig?.map_zoom || 2,
          target_sequence: currentConfig?.target_sequence || [],
        };
      case "ballistics":
        return {
          evidence_image_url_fr: currentConfig?.evidence_image_url_fr || "",
          evidence_image_url_en: currentConfig?.evidence_image_url_en || "",
          focus_target: currentConfig?.focus_target || 80,
          light_target: currentConfig?.light_target || "white",
        };
      case "portrait":
        return {
          portrait_mode: currentConfig?.portrait_mode || "layers",
          categories: currentConfig?.categories || [],
          target_combination: currentConfig?.target_combination || {},
          suspects: currentConfig?.suspects || [],
          reveal_image_url: currentConfig?.reveal_image_url || "",
          target_blur: currentConfig?.target_blur || 0,
          target_contrast: currentConfig?.target_contrast || 100,
          target_brightness: currentConfig?.target_brightness || 100,
        };
      case "chemical":
        return {
          reference_image_url: currentConfig?.reference_image_url || "",
          similarity_threshold: currentConfig?.similarity_threshold || 85,
          samples: currentConfig?.samples || [],
        };
      case "cipher":
        return {
          cipher_type: currentConfig?.cipher_type || "caesar",
          shift_value: currentConfig?.shift_value || 3,
          encoded_message_fr: currentConfig?.encoded_message_fr || "",
          decoded_message_fr: currentConfig?.decoded_message_fr || "",
          encoded_message_en: currentConfig?.encoded_message_en || "",
          decoded_message_en: currentConfig?.decoded_message_en || "",
        };
      case "cryptex":
        return {
          password_fr: currentConfig?.password_fr || "",
          password_en: currentConfig?.password_en || "",
          hint_positions: currentConfig?.hint_positions || [],
        };
      case "teletype":
        return {
          code_type: currentConfig?.code_type || "morse",
          message_fr: currentConfig?.message_fr || "",
          message_en: currentConfig?.message_en || "",
          custom_alphabet: currentConfig?.custom_alphabet || {},
        };
      case "translation":
        return {
          source_language: currentConfig?.source_language || "",
          message_text: currentConfig?.message_text || "",
          full_message_fr: currentConfig?.full_message_fr || "",
          full_message_en: currentConfig?.full_message_en || "",
          words_to_translate: currentConfig?.words_to_translate || [],
        };
      case "redacted":
        return {
          document_url: currentConfig?.document_url || "",
          hidden_text_fr: currentConfig?.hidden_text_fr || "",
          hidden_text_en: currentConfig?.hidden_text_en || "",
          reveal_type: currentConfig?.reveal_type || "uv",
          reveal_radius: currentConfig?.reveal_radius || 80,
        };



      case "counterfeit":
        return {
          banknote_image_url_fr: currentConfig?.banknote_image_url_fr || "",
          banknote_image_url_en: currentConfig?.banknote_image_url_en || "",
          focus_target: currentConfig?.focus_target || 85,
          light_target: currentConfig?.light_target || "uv",
          markers_to_find: currentConfig?.markers_to_find || [],
        };
      case "exchange_rate":
        return {
          reference_chart_url_fr: currentConfig?.reference_chart_url_fr || "",
          reference_chart_url_en: currentConfig?.reference_chart_url_en || "",
          exchange_rates: currentConfig?.exchange_rates || [],
          similarity_threshold: currentConfig?.similarity_threshold || 90,
        };
      case "banking_flow":
        return {
          entities: currentConfig?.entities || [],
          all_connections: currentConfig?.all_connections || [],
          target_sequence: currentConfig?.target_sequence || [],
          background_url_fr: currentConfig?.background_url_fr || "",
          background_url_en: currentConfig?.background_url_en || "",
        };
      case "treasury_calcul":
        return {
          mode: currentConfig?.mode || "black_box",
          // Mode 1 : Caisse Noire
          target_amount: currentConfig?.target_amount || 0,
          tolerance: currentConfig?.tolerance || 10000,
          target_total_fr: currentConfig?.target_total_fr || "",
          target_total_en: currentConfig?.target_total_en || "",
          documents: currentConfig?.documents || [],
          // Mode 2 : Audit
          reference: currentConfig?.reference || {
            description_fr: "",
            description_en: "",
            quantity: 0,
            unit: "km",
            budget: 0,
            currency: "XOF",
          },
          contracts: currentConfig?.contracts || [],
          // Commun
          background_url_fr: currentConfig?.background_url_fr || "",
          background_url_en: currentConfig?.background_url_en || "",
        };
      case "anomaly_detector":
        return {
          ledger_image_url_fr: currentConfig?.ledger_image_url_fr || "",
          ledger_image_url_en: currentConfig?.ledger_image_url_en || "",
          anomalies: currentConfig?.anomalies || [],
          min_anomalies_to_find: currentConfig?.min_anomalies_to_find || 3,
        };


      
      case "signature_analysis":
        return {
          analysis_mode: currentConfig?.analysis_mode || "simple",
          signatures: currentConfig?.signatures || [],
          counterfeit_signature_id: currentConfig?.counterfeit_signature_id || "",
          contracts: currentConfig?.contracts || [],
          visual_differences: currentConfig?.visual_differences || [],
          feedback_mode: currentConfig?.feedback_mode || "end",
        };
      case "contract_clauses":
        return {
          title_fr: currentConfig?.title_fr || "",
          title_en: currentConfig?.title_en || "",
          state_name_fr: currentConfig?.state_name_fr || "",
          state_name_en: currentConfig?.state_name_en || "",
          company_name_fr: currentConfig?.company_name_fr || "",
          company_name_en: currentConfig?.company_name_en || "",
          date: currentConfig?.date || "",
          reference: currentConfig?.reference || "",
          object_fr: currentConfig?.object_fr || "",
          object_en: currentConfig?.object_en || "",
          contract_image_url: currentConfig?.contract_image_url || "",
          clauses: currentConfig?.clauses || [],
          minimum_abusive_count: currentConfig?.minimum_abusive_count || 3,
        };
      


      default:
        return {};
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = async () => {

    console.log("🔍 DEBUG formData.config AVANT getCleanConfig:", formData.config);
    console.log("🔍 DEBUG formData complet:", formData);

    // ✅ Validation spécifique par type de mini-jeu
    if (formData.type === "teletype" && !formData.config?.message_fr?.trim()) {
      alert("⚠️ Le champ 'Message à transmettre (FR)' est obligatoire pour un mini-jeu Téléscripteur.");
      return;
    }

    if (formData.type === "cipher" && (!formData.config?.decoded_message_fr?.trim() || !formData.config?.encoded_message_fr?.trim())) {
      alert("⚠️ Les messages codé et décodé (FR) sont obligatoires pour un mini-jeu Cipher.");
      return;
    }

    if (formData.type === "cryptex" && !formData.config?.password_fr?.trim()) {
      alert("⚠️ Le mot de passe (FR) est obligatoire pour un mini-jeu Cryptex.");
      return;
    }

    if (!formData.title_fr?.trim())
      return showMsg("error", "Le titre FR est obligatoire");
    if (!formData.chapter_id)
      return showMsg("error", "Le chapitre est obligatoire");
    if (!formData.type)
      return showMsg("error", "Le type de mini-jeu est obligatoire");

    setIsSaving(true);
    try {
      const payload = {
        investigation_id: investigationId,
        type: formData.type,
        title_fr: formData.title_fr,
        title_en: formData.title_en,
        chapter_id: formData.chapter_id,
        scene_id: formData.scene_id || null,
        instruction_id: formData.instruction_id || null,
        config: getCleanConfig(formData.type, formData.config),
        reward_cauris: formData.reward_cauris || 0,
        reward_per_step: formData.reward_per_step || 0,
        penalty_per_error: formData.penalty_per_error || 0,
        starting_hint_cost: formData.starting_hint_cost || 5,
        timer_seconds: formData.timer_seconds || 0,
        timer_behavior: formData.timer_behavior || "alert",
        max_attempts: formData.max_attempts || 0,
        attempt_behavior: formData.attempt_behavior || "alert",
        trigger_event_on_success_id:
          formData.trigger_event_on_success_id || null,
        trigger_event_on_failure_id:
          formData.trigger_event_on_failure_id || null,
        trigger_event_on_timeout_id:
          formData.trigger_event_on_timeout_id || null,
        trigger_event_on_max_attempts_id:
          formData.trigger_event_on_max_attempts_id || null,
        success_target_scene_id: formData.success_target_scene_id || null,
        success_target_chapter_id: formData.success_target_chapter_id || null,
        failure_target_scene_id: formData.failure_target_scene_id || null,
        failure_target_chapter_id: formData.failure_target_chapter_id || null,
        timeout_target_scene_id: formData.timeout_target_scene_id || null,
        timeout_target_chapter_id: formData.timeout_target_chapter_id || null,
        max_attempts_target_scene_id:
          formData.max_attempts_target_scene_id || null,
        max_attempts_target_chapter_id:
          formData.max_attempts_target_chapter_id || null,
      };

      console.log("DEBUG - Payload to save:", JSON.stringify(payload, null, 2));

      let gameId = miniGameId;

      if (miniGameId) {
        const { error } = await supabase
          .from("investigation_mini_games")
          .update(payload)
          .eq("id", miniGameId);

        console.log("DEBUG - Update error:", error);

        if (error) throw error;
        showMsg("success", "Mini-jeu mis à jour !");
      } else {
        const { data: newGame, error } = await supabase
          .from("investigation_mini_games")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        gameId = newGame.id;
        showMsg("success", "Mini-jeu créé !");
      }

      // Sauvegarde des indices
      // Sauvegarde des indices (SUPPRIME TOUT + RÉINSÈRE)
      if (gameId) {
        // Étape 1 : On supprime TOUS les indices existants de ce mini-jeu
        const { error: deleteErr } = await supabase
          .from("investigation_mini_game_clues")
          .delete()
          .eq("mini_game_id", gameId);

        if (deleteErr) {
          console.error("Erreur suppression anciens indices:", deleteErr);
        }

        // Étape 2 : On réinsère uniquement les indices actuellement dans le state
        // Étape 2 : On réinsère uniquement les indices actuellement dans le state
        if (formData.mini_game_clues && formData.mini_game_clues.length > 0) {
          for (let idx = 0; idx < formData.mini_game_clues.length; idx++) {
            const clue = formData.mini_game_clues[idx];
            if (clue.text_fr?.trim() || clue.media_url) {
              // Permet de sauvegarder si texte OU media est présent
              const { error: insertErr } = await supabase
                .from("investigation_mini_game_clues")
                .insert({
                  mini_game_id: gameId,
                  text_fr: clue.text_fr || "",
                  text_en: clue.text_en || null,
                  media_url: clue.media_url || null, // Ajout du media
                  reveal_cost_cauris: clue.reveal_cost_cauris ?? 5,
                  clue_order: idx,
                });

              if (insertErr) {
                console.error("Erreur insertion indice:", insertErr);
              }
            }
          }
        }
      }

      onSaved();
    } catch (err: any) {
      showMsg("error", `Erreur: ${err.message}`);
    }
    setIsSaving(false);
  };


  const CIPHER_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const encodeCaesar = (text: string, shift: number): string => {
    return text
      .toUpperCase()
      .split("")
      .map((char) => {
        const idx = CIPHER_ALPHABET.indexOf(char);
        if (idx === -1) return char; // garde espaces, ponctuation, etc.
        return CIPHER_ALPHABET[(idx + shift) % CIPHER_ALPHABET.length];
      })
      .join("");
  };

  const getScenesForChapter = (chapterId: string) =>
    chapters.find((c) => c.id === chapterId)?.scenes || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-purple-400">
          {miniGameId ? "Modifier" : "Créer"} un Mini-Jeu
        </h3>
        <button onClick={onCancel} className="text-gray-600 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* GÉNÉRAL */}
      <div className="border border-purple-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("general")}
          className="w-full flex items-center justify-between p-3 bg-purple-500/10 hover:bg-purple-500/20"
        >
          <span className="text-xs font-bold text-purple-400 uppercase">
            📋 Général
          </span>
          {expandedSections.general ? (
            <ChevronUp size={16} className="text-purple-400" />
          ) : (
            <ChevronDown size={16} className="text-purple-400" />
          )}
        </button>
        {expandedSections.general && (
          <div className="p-4 space-y-4 bg-purple-950/10">
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Type de Mini-Jeu
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="radio">📻 Interception Radio</option>
                <option value="ballistics">🔍 Analyse Scientifique / Balistique</option>
                <option value="puzzle">🧩 Restauration de Preuve (Puzzle)</option>
                <option value="map">🗺️ Traque Cartographique</option>
                <option value="canvas">🕯️ Grattage (Ancien)</option>
                <option value="portrait">🎭 Portrait / Identification</option>
                <option value="chemical">🔬 Analyse Chimique (Graphes)</option>
                <option value="cipher">🔐 Disque de Chiffrement</option>
                <option value="cryptex">🗝️ Cryptex (Serrure)</option>
                <option value="teletype">📻 Téléscripteur (Morse)</option>
                <option value="translation">🌍 Langue Africaine (Lingala)</option>
                <option value="redacted">📄 Document Classifié (UV)</option>
                <option value="counterfeit">💵 Fausse Monnaie / Billet</option>
                <option value="exchange_rate">💹 Taux de Change Falsifié</option>
                <option value="banking_flow">🏦 Réseau de Blanchiment</option>
                <option value="treasury_calcul">💰 Caisse Noire (Cartes)</option>
                
                
                <option value="signature_analysis">✍️ Signature de Contrat</option>
                <option value="contract_clauses">📜 Marché Colonial / Contrat Inégal</option>
                
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Titre (FR)
              </label>
              <input
                type="text"
                value={formData.title_fr}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    title_fr: e.target.value,
                  }))
                }
                placeholder="Ex: Décrypter la transmission"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Titre (EN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.title_en || ""}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      title_en: e.target.value,
                    }))
                  }
                  placeholder="Ex: Decrypt the transmission"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
                <button
                  onClick={async () => {
                    if (!formData.title_fr?.trim()) return;
                    setIsTranslating(true);
                    const t = await autoTranslate(formData.title_fr, "fr");
                    setFormData((prev: any) => ({ ...prev, title_en: t }));
                    setIsTranslating(false);
                  }}
                  className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                >
                  {isTranslating ? (
                    <Loader2
                      size={14}
                      className="animate-spin text-purple-500"
                    />
                  ) : (
                    <Languages size={14} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIG SPÉCIFIQUE */}
      <div className="border border-amber-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("config")}
          className="w-full flex items-center justify-between p-3 bg-amber-500/10 hover:bg-amber-500/20"
        >
          <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1">
            ⚙️ Configuration du jeu ({formData.type})
          </span>
          {expandedSections.config ? (
            <ChevronUp size={16} className="text-amber-400" />
          ) : (
            <ChevronDown size={16} className="text-amber-400" />
          )}
        </button>
        {expandedSections.config && (
          <div className="p-4 space-y-4 bg-amber-950/10">
            {/* BALLISTICS (Microscope Pro) */}
            {formData.type === "ballistics" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploader
                    label="Image Échantillon (FR ou Général)"
                    url={formData.config?.evidence_image_url_fr}
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, evidence_image_url_fr: url },
                      }))
                    }
                    icon={<ImagePlus size={12} />}
                  />
                  <MediaUploader
                    label="Image Échantillon (EN - Optionnel)"
                    url={formData.config?.evidence_image_url_en}
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, evidence_image_url_en: url },
                      }))
                    }
                    icon={<ImagePlus size={12} />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Netteté cible (Focus 0-100)
                    </label>
                    <input
                      type="number"
                      value={formData.config?.focus_target || 80}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            focus_target: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Filtre Lumineux requis
                    </label>
                    <select
                      value={formData.config?.light_target || "white"}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            light_target: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="white">⚪ Lumière Blanche</option>
                      <option value="uv">🟣 Ultra-Violet (UV)</option>
                      <option value="ir">🔴 Infrarouge (IR)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* RADIO (Oscilloscope Pro) */}
            {formData.type === "radio" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploader
                    label="Fichier Vocal (FR)"
                    url={formData.config?.audio_url_fr}
                    resourceType="video"
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, audio_url_fr: url },
                      }))
                    }
                    icon={<Music size={12} />}
                  />
                  <MediaUploader
                    label="Fichier Vocal (EN - Optionnel)"
                    url={formData.config?.audio_url_en}
                    resourceType="video"
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, audio_url_en: url },
                      }))
                    }
                    icon={<Music size={12} />}
                  />
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Fréquence cible (FM)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.config?.target_frequency || 104.2}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          target_frequency: Number(e.target.value),
                        },
                      }))
                    }
                    placeholder="Ex: 104.2"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Le bruit blanc de fond sera généré automatiquement par le
                    moteur du jeu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Message décrypté attendu (FR)
                    </label>
                    <input
                      type="text"
                      value={formData.config?.expected_answer_fr || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            expected_answer_fr: e.target.value,
                          },
                        }))
                      }
                      placeholder="Ex: GOMA"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block flex items-center justify-between">
                      Message (EN)
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.expected_answer_fr) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(
                            formData.config.expected_answer_fr,
                            "fr",
                          );
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, expected_answer_en: t },
                          }));
                          setIsTranslating(false);
                        }}
                        className="text-purple-400 hover:text-white flex items-center gap-1 disabled:opacity-50"
                        disabled={isTranslating}
                      >
                        {isTranslating ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Languages size={10} />
                        )}{" "}
                        Auto
                      </button>
                    </label>
                    <input
                      type="text"
                      value={formData.config?.expected_answer_en || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            expected_answer_en: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PUZZLE (Restauration) */}
            {formData.type === "puzzle" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploader
                    label="Image à reconstituer (FR/Général)"
                    url={formData.config?.puzzle_image_url_fr}
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, puzzle_image_url_fr: url },
                      }))
                    }
                    icon={<ImagePlus size={12} />}
                  />
                  <MediaUploader
                    label="Image à reconstituer (EN - Optionnel)"
                    url={formData.config?.puzzle_image_url_en}
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, puzzle_image_url_en: url },
                      }))
                    }
                    icon={<ImagePlus size={12} />}
                  />
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Taille de la Grille
                  </label>
                  <select
                    value={formData.config?.grid_size || 3}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          grid_size: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value={2}>2x2 (4 pièces - Facile)</option>
                    <option value={3}>3x3 (9 pièces - Normal)</option>
                    <option value={4}>4x4 (16 pièces - Difficile)</option>
                    <option value={5}>5x5 (25 pièces - Extrême)</option>
                  </select>
                </div>
              </div>
            )}




            {/* CRYPTEX (Serrure à combinaison) */}
            {formData.type === "cryptex" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Mot de passe (FR)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.config?.password_fr || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, password_fr: e.target.value.toUpperCase() },
                          }))
                        }
                        placeholder="Ex: VERITE"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                      {/* ✅ NOUVEAU : Bouton traduction FR → EN */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.password_fr) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.password_fr, "fr");
                          // Nettoyage : garder uniquement A-Z après traduction
                          const cleaned = (t || "").toUpperCase().replace(/[^A-Z]/g, "");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, password_en: cleaned },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                        disabled={isTranslating}
                      >
                        {isTranslating ? (
                          <Loader2 size={14} className="animate-spin text-purple-500" />
                        ) : (
                          <Languages size={14} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">Uniquement des lettres A-Z, sans accents</p>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Mot de passe (EN - Optionnel)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.config?.password_en || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, password_en: e.target.value.toUpperCase() },
                          }))
                        }
                        placeholder="Ex: TRUTH"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                      {/* ✅ NOUVEAU : Bouton traduction inverse EN → FR */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.password_en) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.password_en, "en");
                          const cleaned = (t || "").toUpperCase().replace(/[^A-Z]/g, "");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, password_fr: cleaned },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                        disabled={isTranslating}
                      >
                        {isTranslating ? (
                          <Loader2 size={14} className="animate-spin text-purple-500" />
                        ) : (
                          <Languages size={14} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Indices de position (optionnel)
                  </label>
                  <input
                    type="text"
                    value={(formData.config?.hint_positions || []).join(',')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const positions = val.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n));
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, hint_positions: positions },
                      }));
                    }}
                    placeholder="Ex: 0,4 (révèle 1ère et 5ème lettre)"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">Positions des lettres déjà révélées (commence à 0)</p>
                </div>
              </div>
            )}



            {/* CIPHER (Disque de Chiffrement) */}
            {formData.type === "cipher" && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block">
                    Type de Chiffrement
                  </label>
                  <select
                    value={formData.config?.cipher_type || "caesar"}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, cipher_type: e.target.value },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="caesar">🔠 Chiffre de César (Décalage)</option>
                  </select>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Valeur du décalage (Shift)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={formData.config?.shift_value || 3}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, shift_value: Number(e.target.value) },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">Ex: 3 signifie que A devient D</p>
                </div>

                {/* ✅ BLOC FR : message décodé (avec traduction) + message codé (avec auto-génération) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Message Décodé Attendu (FR)
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={formData.config?.decoded_message_fr || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, decoded_message_fr: e.target.value.toUpperCase() },
                          }))
                        }
                        placeholder="Ex: HELLO WORLD"
                        rows={3}
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono"
                      />
                      {/* ✅ NOUVEAU : traduction du texte clair FR → EN */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.decoded_message_fr) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.decoded_message_fr, "fr");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, decoded_message_en: (t || "").toUpperCase() },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0 h-fit"
                        disabled={isTranslating}
                        title="Traduire vers l'anglais"
                      >
                        {isTranslating ? (
                          <Loader2 size={14} className="animate-spin text-purple-500" />
                        ) : (
                          <Languages size={14} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Message Codé (FR)
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={formData.config?.encoded_message_fr || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, encoded_message_fr: e.target.value.toUpperCase() },
                          }))
                        }
                        placeholder="Ex: KHOOR ZRUOG"
                        rows={3}
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono"
                      />
                      {/* ✅ NOUVEAU : auto-génère le message codé à partir du message décodé + shift */}
                      <button
                        type="button"
                        onClick={() => {
                          const shift = formData.config?.shift_value || 3;
                          const decoded = formData.config?.decoded_message_fr || "";
                          if (!decoded) return;
                          const encoded = encodeCaesar(decoded, shift);
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, encoded_message_fr: encoded },
                          }));
                        }}
                        className="p-2 bg-amber-500/10 rounded hover:bg-amber-500/20 flex-shrink-0 h-fit border border-amber-500/30"
                        title="Générer automatiquement depuis le message décodé"
                      >
                        <RefreshCw size={14} className="text-amber-400" />
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">
                      💡 Remplis d'abord "Message Décodé", puis clique sur ⟳ pour générer le code automatiquement
                    </p>
                  </div>
                </div>

                {/* ✅ BLOC EN : idem, avec traduction inverse + auto-génération */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Message Décodé Attendu (EN - Optionnel)
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={formData.config?.decoded_message_en || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, decoded_message_en: e.target.value.toUpperCase() },
                          }))
                        }
                        rows={3}
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none font-mono"
                      />
                      {/* ✅ NOUVEAU : traduction inverse EN → FR */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.decoded_message_en) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.decoded_message_en, "en");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, decoded_message_fr: (t || "").toUpperCase() },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0 h-fit"
                        disabled={isTranslating}
                        title="Traduire vers le français"
                      >
                        {isTranslating ? (
                          <Loader2 size={14} className="animate-spin text-purple-500" />
                        ) : (
                          <Languages size={14} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Message Codé (EN - Optionnel)
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={formData.config?.encoded_message_en || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, encoded_message_en: e.target.value.toUpperCase() },
                          }))
                        }
                        rows={3}
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none font-mono"
                      />
                      {/* ✅ NOUVEAU : auto-génère depuis decoded_message_en */}
                      <button
                        type="button"
                        onClick={() => {
                          const shift = formData.config?.shift_value || 3;
                          const decoded = formData.config?.decoded_message_en || "";
                          if (!decoded) return;
                          const encoded = encodeCaesar(decoded, shift);
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, encoded_message_en: encoded },
                          }));
                        }}
                        className="p-2 bg-amber-500/10 rounded hover:bg-amber-500/20 flex-shrink-0 h-fit border border-amber-500/30"
                        title="Générer automatiquement depuis le message décodé"
                      >
                        <RefreshCw size={14} className="text-amber-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}





            {/* TELETYPE (Téléscripteur) */}
            {formData.type === "teletype" && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block">
                    Type de Code
                  </label>
                  <select
                    value={formData.config?.code_type || "morse"}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, code_type: e.target.value },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="morse">📻 Code Morse (⋅ −)</option>
                    <option value="custom">🔑 Code Personnalisé</option>
                  </select>
                </div>

                {/* Message FR avec traducteur */}
                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Message à transmettre (FR)
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={formData.config?.message_fr || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, message_fr: e.target.value },
                        }))
                      }
                      placeholder="Ex: L'ENNEMI APPROCHE"
                      rows={2}
                      className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.config?.message_fr) return;
                        setIsTranslating(true);
                        const t = await autoTranslate(formData.config.message_fr, "fr");
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, message_en: t },
                        }));
                        setIsTranslating(false);
                      }}
                      className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                      disabled={isTranslating}
                    >
                      {isTranslating ? (
                        <Loader2 size={14} className="animate-spin text-purple-500" />
                      ) : (
                        <Languages size={14} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Message EN avec traducteur inverse */}
                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Message (EN - Optionnel)
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={formData.config?.message_en || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, message_en: e.target.value },
                        }))
                      }
                      rows={2}
                      className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.config?.message_en) return;
                        setIsTranslating(true);
                        const t = await autoTranslate(formData.config.message_en, "en");
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, message_fr: t },
                        }));
                        setIsTranslating(false);
                      }}
                      className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                      disabled={isTranslating}
                    >
                      {isTranslating ? (
                        <Loader2 size={14} className="animate-spin text-purple-500" />
                      ) : (
                        <Languages size={14} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Code Personnalisé (si sélectionné) */}
                {formData.config?.code_type === "custom" && (
                  <div className="border-t border-white/10 pt-4">
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-2 block">
                      Alphabet Personnalisé (JSON)
                    </label>
                    <textarea
                      value={formData.config?.custom_alphabet ? JSON.stringify(formData.config.custom_alphabet) : ""}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue.trim() === "") {
                          // ✅ Champ vidé volontairement → on nettoie proprement
                          setFormData((prev: any) => {
                            const newConfig = { ...prev.config };
                            delete newConfig.custom_alphabet;
                            return { ...prev, config: newConfig };
                          });
                          return;
                        }
                        try {
                          const parsed = JSON.parse(rawValue);
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, custom_alphabet: parsed },
                          }));
                        } catch (err) {
                          // ✅ On log l'erreur au lieu de l'avaler silencieusement
                          console.warn("JSON invalide pour custom_alphabet:", err);
                        }
                      }}
                      placeholder='{"A": "🔴", "B": "🔵", "C": "🟡"}'
                      rows={4}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <p className="text-[9px] text-gray-500 mt-1">Format JSON. Laissez vide pour utiliser le Morse standard.</p>
                  </div>
                )}
              </div>
            )}




            {/* TRANSLATION (Langue Africaine) */}
            {formData.type === "translation" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Langue Source
                  </label>
                  <input
                    type="text"
                    value={formData.config?.source_language || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, source_language: e.target.value },
                      }))
                    }
                    placeholder="Ex: Lingala, Swahili, Wolof..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Message complet dans la langue source
                  </label>
                  <textarea
                    value={formData.config?.message_text || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, message_text: e.target.value },
                      }))
                    }
                    placeholder="Ex: Bato bazali kozwa mbongo na banki"
                    rows={3}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Traduction complète (FR) avec bouton auto
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.config?.full_message_fr || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, full_message_fr: e.target.value },
                          }))
                        }
                        placeholder="Les gens retirent de l'argent à la banque"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.message_text) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.message_text, "fr");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, full_message_fr: t },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                        disabled={isTranslating}
                      >
                        {isTranslating ? <Loader2 size={14} className="animate-spin text-purple-500" /> : <Languages size={14} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Traduction complète (EN) avec bouton auto
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.config?.full_message_en || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, full_message_en: e.target.value },
                          }))
                        }
                        placeholder="People are withdrawing money from the bank"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.message_text) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.message_text, "en");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, full_message_en: t },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                        disabled={isTranslating}
                      >
                        {isTranslating ? <Loader2 size={14} className="animate-spin text-purple-500" /> : <Languages size={14} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* MOTS À TRADUIRE */}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-300 font-bold uppercase">
                      Mots à traduire
                    </label>
                    <button
                      onClick={() => {
                        const words = [...(formData.config?.words_to_translate || [])];
                        words.push({ word: "", translation_fr: "", translation_en: "", wrong_options_fr: ["", ""], wrong_options_en: ["", ""] });
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, words_to_translate: words },
                        }));
                      }}
                      className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={10} /> Mot
                    </button>
                  </div>

                  {(formData.config?.words_to_translate || []).map((w: any, idx: number) => (
                    <div key={idx} className="bg-black/30 p-3 rounded border border-amber-500/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-amber-400 font-bold">Mot {idx + 1}</span>
                        <button onClick={() => {
                          const words = [...(formData.config?.words_to_translate || [])];
                          words.splice(idx, 1);
                          setFormData((prev: any) => ({ ...prev, config: { ...prev.config, words_to_translate: words } }));
                        }} className="text-red-500 p-1"><Trash2 size={12} /></button>
                      </div>

                      <input
                        type="text"
                        value={w.word || ""}
                        onChange={(e) => {
                          const words = [...(formData.config?.words_to_translate || [])];
                          words[idx].word = e.target.value;
                          setFormData((prev: any) => ({ ...prev, config: { ...prev.config, words_to_translate: words } }));
                        }}
                        placeholder="Mot en Lingala"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Bonne réponse (FR)</label>
                          <input type="text" value={w.translation_fr || ""} onChange={(e) => { const words = [...(formData.config?.words_to_translate || [])]; words[idx].translation_fr = e.target.value; setFormData((prev: any) => ({ ...prev, config: { ...prev.config, words_to_translate: words } })); }} placeholder="Traduction FR" className="w-full bg-[#1a1a1a] border border-green-500/30 rounded px-2 py-1 text-xs text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Bonne réponse (EN)</label>
                          <input type="text" value={w.translation_en || ""} onChange={(e) => { const words = [...(formData.config?.words_to_translate || [])]; words[idx].translation_en = e.target.value; setFormData((prev: any) => ({ ...prev, config: { ...prev.config, words_to_translate: words } })); }} placeholder="Translation EN" className="w-full bg-[#1a1a1a] border border-green-500/30 rounded px-2 py-1 text-xs text-white outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Mauvaises options (FR) - séparées par virgule</label>
                          <input type="text" value={(w.wrong_options_fr || []).join(',')} onChange={(e) => { const words = [...(formData.config?.words_to_translate || [])]; words[idx].wrong_options_fr = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean); setFormData((prev: any) => ({ ...prev, config: { ...prev.config, words_to_translate: words } })); }} placeholder="les arbres, les maisons" className="w-full bg-[#1a1a1a] border border-red-500/30 rounded px-2 py-1 text-xs text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Mauvaises options (EN) - séparées par virgule</label>
                          <input type="text" value={(w.wrong_options_en || []).join(',')} onChange={(e) => { const words = [...(formData.config?.words_to_translate || [])]; words[idx].wrong_options_en = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean); setFormData((prev: any) => ({ ...prev, config: { ...prev.config, words_to_translate: words } })); }} placeholder="trees, houses" className="w-full bg-[#1a1a1a] border border-red-500/30 rounded px-2 py-1 text-xs text-white outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* REDACTED (Document Classifié) */}
            {formData.type === "redacted" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    URL du Document (Image)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.config?.document_url || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, document_url: e.target.value },
                        }))
                      }
                      placeholder="https://..."
                      className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // @ts-ignore
                        if (!window.cloudinary) {
                          const script = document.createElement("script");
                          script.src = "https://upload-widget.cloudinary.com/global/all.js";
                          script.onload = () => createWidget();
                          document.body.appendChild(script);
                        } else {
                          createWidget();
                        }
                        function createWidget() {
                          // @ts-ignore
                          const widget = window.cloudinary.createUploadWidget({
                            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                            apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
                            uploadSignature: async (callback: any, paramsToSign: any) => {
                              const res = await fetch("/api/cloudinary-sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paramsToSign }) });
                              const { signature } = await res.json();
                              callback(signature);
                            },
                            sources: ["local", "url"],
                            resourceType: "image",
                            folder: "lukeni/investigations/minigames/documents",
                          }, (error: any, result: any) => {
                            if (result?.event === "success") {
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, document_url: result.info.secure_url },
                              }));
                            }
                          });
                          widget.open();
                        }
                      }}
                      className="p-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 rounded text-xs font-bold"
                    >
                      Upload
                    </button>
                  </div>
                  {formData.config?.document_url && (
                    <div className="mt-2 h-20 rounded border border-white/10 overflow-hidden">
                      <img src={formData.config.document_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Texte caché (FR)
                    </label>
                    <input
                      type="text"
                      value={formData.config?.hidden_text_fr || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, hidden_text_fr: e.target.value },
                        }))
                      }
                      placeholder="Ex: LE CODE EST 7342"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Texte caché (EN)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.config?.hidden_text_en || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, hidden_text_en: e.target.value },
                          }))
                        }
                        placeholder="Ex: THE CODE IS 7342"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.config?.hidden_text_fr) return;
                          setIsTranslating(true);
                          const t = await autoTranslate(formData.config.hidden_text_fr, "fr");
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, hidden_text_en: t },
                          }));
                          setIsTranslating(false);
                        }}
                        className="p-2 bg-white/5 rounded hover:bg-white/10 flex-shrink-0"
                        disabled={isTranslating}
                      >
                        {isTranslating ? <Loader2 size={14} className="animate-spin text-purple-500" /> : <Languages size={14} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Type de révélation
                    </label>
                    <select
                      value={formData.config?.reveal_type || "uv"}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, reveal_type: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="uv">🔦 Lampe UV (Violet)</option>
                      <option value="heat">🔥 Chaleur (Rouge)</option>
                      <option value="scratch">✏️ Grattage (Vert)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Taille de la lampe (px)
                    </label>
                    <input
                      type="number"
                      value={formData.config?.reveal_radius || 80}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, reveal_radius: Number(e.target.value) },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}



            {/* COUNTERFEIT (Fausse Monnaie) */}
            {formData.type === "counterfeit" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploader
                    label="Image du Billet (FR)"
                    url={formData.config?.banknote_image_url_fr}
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, banknote_image_url_fr: url },
                      }))
                    }
                    icon={<ImagePlus size={12} />}
                  />
                  <MediaUploader
                    label="Image du Billet (EN - Optionnel)"
                    url={formData.config?.banknote_image_url_en}
                    onUpload={(url) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, banknote_image_url_en: url },
                      }))
                    }
                    icon={<ImagePlus size={12} />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Netteté Cible (Focus 0-100)
                    </label>
                    <input
                      type="number"
                      value={formData.config?.focus_target || 85}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            focus_target: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Filtre Lumineux Cible
                    </label>
                    <select
                      value={formData.config?.light_target || "uv"}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            light_target: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="white">⚪ Lumière Blanche</option>
                      <option value="uv">🟣 Ultra-Violet (UV)</option>
                      <option value="ir">🔴 Infrarouge (IR)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-300 font-bold uppercase">
                      Marqueurs à Détecter
                    </label>
                    <button
                      onClick={() => {
                        const markers = [...(formData.config?.markers_to_find || [])];
                        markers.push({
                          id: `marker_${Date.now()}`,
                          x_percent: 50,
                          y_percent: 50,
                          description_fr: "Nouveau Marqueur",
                          description_en: "New Marker",
                        });
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, markers_to_find: markers },
                        }));
                      }}
                      className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={10} /> Ajouter
                    </button>
                  </div>

                  {(formData.config?.markers_to_find || []).map(
                    (marker: any, idx: number) => (
                      <div
                        key={marker.id}
                        className="bg-black/30 p-3 rounded border border-amber-500/20 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-amber-400 font-bold">
                            Marqueur {idx + 1}
                          </span>
                          <button
                            onClick={() => {
                              const markers = [
                                ...(formData.config?.markers_to_find || []),
                              ];
                              markers.splice(idx, 1);
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, markers_to_find: markers },
                              }));
                            }}
                            className="p-1 text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={marker.description_fr || ""}
                            onChange={(e) => {
                              const markers = [
                                ...(formData.config?.markers_to_find || []),
                              ];
                              markers[idx].description_fr = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, markers_to_find: markers },
                              }));
                            }}
                            placeholder="Description FR (ex: Fil de Sécurité)"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={marker.description_en || ""}
                              onChange={(e) => {
                                const markers = [
                                  ...(formData.config?.markers_to_find || []),
                                ];
                                markers[idx].description_en = e.target.value;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, markers_to_find: markers },
                                }));
                              }}
                              placeholder="Description EN"
                              className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                            />
                            <button
                              onClick={async () => {
                                if (!marker.description_fr?.trim()) return;
                                setIsTranslating(true);
                                const t = await autoTranslate(
                                  marker.description_fr,
                                  "fr",
                                );
                                const markers = [
                                  ...(formData.config?.markers_to_find || []),
                                ];
                                markers[idx].description_en = t;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, markers_to_find: markers },
                                }));
                                setIsTranslating(false);
                              }}
                              className="p-1 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0 disabled:opacity-50"
                              disabled={isTranslating}
                            >
                              {isTranslating ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Languages size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-1">
                              Position X (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marker.x_percent || 50}
                              onChange={(e) => {
                                const markers = [
                                  ...(formData.config?.markers_to_find || []),
                                ];
                                markers[idx].x_percent = Number(e.target.value);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, markers_to_find: markers },
                                }));
                              }}
                              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-1">
                              Position Y (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marker.y_percent || 50}
                              onChange={(e) => {
                                const markers = [
                                  ...(formData.config?.markers_to_find || []),
                                ];
                                markers[idx].y_percent = Number(e.target.value);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, markers_to_find: markers },
                                }));
                              }}
                              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* EXCHANGE_RATE (Taux de Change) */}
            {formData.type === "exchange_rate" && (
              <div className="space-y-4">
                <MediaUploader
                  label="Graphique de Référence (FR)"
                  url={formData.config?.reference_chart_url_fr}
                  onUpload={(url) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, reference_chart_url_fr: url },
                    }))
                  }
                  icon={<ImagePlus size={12} />}
                />
                <MediaUploader
                  label="Graphique de Référence (EN - Optionnel)"
                  url={formData.config?.reference_chart_url_en}
                  onUpload={(url) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, reference_chart_url_en: url },
                    }))
                  }
                  icon={<ImagePlus size={12} />}
                />

                <div className="border-t border-white/10 pt-4">
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Seuil de Similarité (%)
                  </label>
                  <input
                    type="number"
                    value={formData.config?.similarity_threshold || 90}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          similarity_threshold: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-300 font-bold uppercase">
                      Taux de Change
                    </label>
                    <button
                      onClick={() => {
                        const rates = [...(formData.config?.exchange_rates || [])];
                        rates.push({
                          currency_pair: "EUR/USD",
                          correct_rate: 1.1,
                          wrong_rates: [1.0, 1.2, 1.3],
                          date: new Date().toISOString().split("T")[0],
                          official_rate: 1.1,
                          deviation_fr: "Déviation suspecte détectée",
                          deviation_en: "Suspicious deviation detected",
                        });
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, exchange_rates: rates },
                        }));
                      }}
                      className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={10} /> Ajouter Taux
                    </button>
                  </div>

                  {(formData.config?.exchange_rates || []).map(
                    (rate: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-black/30 p-3 rounded border border-amber-500/20 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-amber-400 font-bold">
                            Taux {idx + 1}
                          </span>
                          <button
                            onClick={() => {
                              const rates = [
                                ...(formData.config?.exchange_rates || []),
                              ];
                              rates.splice(idx, 1);
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, exchange_rates: rates },
                              }));
                            }}
                            className="p-1 text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={rate.currency_pair || ""}
                            onChange={(e) => {
                              const rates = [
                                ...(formData.config?.exchange_rates || []),
                              ];
                              rates[idx].currency_pair = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, exchange_rates: rates },
                              }));
                            }}
                            placeholder="Ex: USD/XOF"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                          <input
                            type="date"
                            value={rate.date || ""}
                            onChange={(e) => {
                              const rates = [
                                ...(formData.config?.exchange_rates || []),
                              ];
                              rates[idx].date = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, exchange_rates: rates },
                              }));
                            }}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-1">
                              Taux Correct
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={rate.correct_rate || ""}
                              onChange={(e) => {
                                const rates = [
                                  ...(formData.config?.exchange_rates || []),
                                ];
                                rates[idx].correct_rate = Number(e.target.value);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, exchange_rates: rates },
                                }));
                              }}
                              className="w-full bg-[#1a1a1a] border border-green-500/30 rounded px-2 py-1 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-1">
                              Taux Officiel
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={rate.official_rate || ""}
                              onChange={(e) => {
                                const rates = [
                                  ...(formData.config?.exchange_rates || []),
                                ];
                                rates[idx].official_rate = Number(e.target.value);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, exchange_rates: rates },
                                }));
                              }}
                              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Description (FR)
                          </label>
                          <input
                            type="text"
                            value={rate.deviation_fr || ""}
                            onChange={(e) => {
                              const rates = [
                                ...(formData.config?.exchange_rates || []),
                              ];
                              rates[idx].deviation_fr = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, exchange_rates: rates },
                              }));
                            }}
                            placeholder="Ex: Écart frauduleux détecté"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Description (EN)
                          </label>
                          <input
                            type="text"
                            value={rate.deviation_en || ""}
                            onChange={(e) => {
                              const rates = [
                                ...(formData.config?.exchange_rates || []),
                              ];
                              rates[idx].deviation_en = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, exchange_rates: rates },
                              }));
                            }}
                            placeholder="Ex: Fraudulent deviation detected"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* BANKING_FLOW (Réseau de Blanchiment) */}
            {formData.type === "banking_flow" && (
              <div className="space-y-4">
                {/* Fond de carte */}
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block">
                    🗺️ Fond de carte (optionnel)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MediaUploader
                      label="Fond (FR)"
                      url={formData.config?.background_url_fr}
                      onUpload={(url) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, background_url_fr: url },
                        }))
                      }
                      icon={<ImagePlus size={12} />}
                    />
                    <MediaUploader
                      label="Fond (EN - Optionnel)"
                      url={formData.config?.background_url_en}
                      onUpload={(url) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, background_url_en: url },
                        }))
                      }
                      icon={<ImagePlus size={12} />}
                    />
                  </div>
                </div>

                {/* ── LISTE DES ENTITÉS ── */}
                <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-2">
                      🏢 Entités du réseau
                    </label>
                    <button
                      onClick={() => {
                        const entities = [...(formData.config?.entities || [])];
                        entities.push({
                          id: `entity_${Date.now()}`,
                          type: "shell_company",
                          name_fr: "Nouvelle entité",
                          name_en: "New entity",
                          x_percent: 20 + entities.length * 15,
                          y_percent: 30 + (entities.length % 2) * 30,
                          avatar_url: "",
                        });
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, entities },
                        }));
                      }}
                      className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500/20"
                    >
                      <Plus size={10} /> Ajouter entité
                    </button>
                  </div>

                  <p className="text-[9px] text-gray-500 italic">
                    💡 Chaque entité représente une société, banque ou compte. Positionnez-les en ajustant X% et Y% (0-100).
                  </p>

                  {(formData.config?.entities || []).map((entity: any, idx: number) => (
                    <div
                      key={entity.id}
                      className="bg-black/40 p-3 rounded-lg border border-purple-500/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-purple-400 font-bold">
                          Entité {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-500 font-mono">
                            ID: {entity.id.slice(0, 12)}
                          </span>
                          <button
                            onClick={() => {
                              const entities = formData.config.entities.filter(
                                (e: any) => e.id !== entity.id
                              );
                              // Supprimer aussi les connexions liées
                              const connections = (formData.config?.all_connections || []).filter(
                                (c: any) => c.from_id !== entity.id && c.to_id !== entity.id
                              );
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  entities,
                                  all_connections: connections,
                                },
                              }));
                            }}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Type d'entité */}
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">Type</label>
                        <select
                          value={entity.type}
                          onChange={(e) => {
                            const entities = [...formData.config.entities];
                            entities[idx].type = e.target.value;
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, entities },
                            }));
                          }}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                        >
                          <option value="shell_company">🏢 Société Écran</option>
                          <option value="offshore_bank">🏦 Banque Offshore</option>
                          <option value="personal_account">👤 Compte Personnel</option>
                          <option value="government">🏛️ Institution Gouvernementale</option>
                          <option value="business">💼 Entreprise Légitime</option>
                        </select>
                      </div>

                      {/* Noms FR/EN */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">Nom FR</label>
                          <input
                            type="text"
                            value={entity.name_fr}
                            onChange={(e) => {
                              const entities = [...formData.config.entities];
                              entities[idx].name_fr = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, entities },
                              }));
                            }}
                            placeholder="Ex: Lukeni Holdings"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Nom EN
                            <button
                              type="button"
                              onClick={async () => {
                                if (!entity.name_fr?.trim()) return;
                                setIsTranslating(true);
                                const t = await autoTranslate(entity.name_fr, "fr");
                                const entities = [...formData.config.entities];
                                entities[idx].name_en = t;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, entities },
                                }));
                                setIsTranslating(false);
                              }}
                              disabled={isTranslating}
                              className="ml-1 text-purple-400 hover:text-white disabled:opacity-50"
                            >
                              {isTranslating ? (
                                <Loader2 size={10} className="animate-spin inline" />
                              ) : (
                                <Languages size={10} className="inline" />
                              )}
                            </button>
                          </label>
                          <input
                            type="text"
                            value={entity.name_en || ""}
                            onChange={(e) => {
                              const entities = [...formData.config.entities];
                              entities[idx].name_en = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, entities },
                              }));
                            }}
                            placeholder="Ex: Lukeni Holdings"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Position X (%) : {entity.x_percent}%
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={entity.x_percent}
                            onChange={(e) => {
                              const entities = [...formData.config.entities];
                              entities[idx].x_percent = Number(e.target.value);
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, entities },
                              }));
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Position Y (%) : {entity.y_percent}%
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={entity.y_percent}
                            onChange={(e) => {
                              const entities = [...formData.config.entities];
                              entities[idx].y_percent = Number(e.target.value);
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, entities },
                              }));
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      </div>

                      {/* Avatar */}
                      <MediaUploader
                        label="Avatar (optionnel)"
                        url={entity.avatar_url}
                        onUpload={(url) => {
                          const entities = [...formData.config.entities];
                          entities[idx].avatar_url = url;
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, entities },
                          }));
                        }}
                        icon={<ImagePlus size={10} />}
                      />
                    </div>
                  ))}
                </div>

                {/* ── LISTE DES CONNEXIONS ── */}
                <div className="bg-green-950/20 p-4 rounded-xl border border-green-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-2">
                      🔗 Connexions entre entités
                    </label>
                    <button
                      onClick={() => {
                        if (!formData.config?.entities || formData.config.entities.length < 2) {
                          alert("Ajoutez au moins 2 entités avant de créer une connexion");
                          return;
                        }
                        const connections = [...(formData.config?.all_connections || [])];
                        connections.push({
                          id: `conn_${Date.now()}`,
                          from_id: formData.config.entities[0].id,
                          to_id: formData.config.entities[1].id,
                          is_correct: true,
                          amount_fr: "0 USD",
                          amount_en: "0 USD",
                        });
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, all_connections: connections },
                        }));
                      }}
                      className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-500/20"
                    >
                      <Plus size={10} /> Ajouter connexion
                    </button>
                  </div>

                  <p className="text-[9px] text-gray-500 italic">
                    💡 Les connexions "Correctes" sont les vrais liens frauduleux à découvrir. Les autres sont des pièges.
                  </p>

                  {(formData.config?.all_connections || []).map((conn: any, idx: number) => (
                    <div
                      key={conn.id}
                      className={`p-3 rounded-lg border space-y-3 ${conn.is_correct
                        ? "bg-green-900/20 border-green-500/30"
                        : "bg-red-900/20 border-red-500/30"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold flex items-center gap-2">
                          {conn.is_correct ? (
                            <span className="text-green-400">✅ Vrai lien frauduleux</span>
                          ) : (
                            <span className="text-red-400">❌ Piège / Lien suspect</span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            const connections = formData.config.all_connections.filter(
                              (c: any) => c.id !== conn.id
                            );
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, all_connections: connections },
                            }));
                          }}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Source → Destination */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            De (Source)
                          </label>
                          <select
                            value={conn.from_id}
                            onChange={(e) => {
                              const connections = [...formData.config.all_connections];
                              connections[idx].from_id = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, all_connections: connections },
                              }));
                            }}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          >
                            {(formData.config?.entities || []).map((e: any) => (
                              <option key={e.id} value={e.id}>
                                {e.name_fr}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Vers (Destination)
                          </label>
                          <select
                            value={conn.to_id}
                            onChange={(e) => {
                              const connections = [...formData.config.all_connections];
                              connections[idx].to_id = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, all_connections: connections },
                              }));
                            }}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          >
                            {(formData.config?.entities || []).map((e: any) => (
                              <option key={e.id} value={e.id}>
                                {e.name_fr}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Type de connexion */}
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">
                          Type de connexion
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const connections = [...formData.config.all_connections];
                              connections[idx].is_correct = true;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, all_connections: connections },
                              }));
                            }}
                            className={`py-2 rounded text-xs font-bold transition-all ${conn.is_correct
                              ? "bg-green-600 text-white"
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                              }`}
                          >
                            ✅ Vrai lien (à découvrir)
                          </button>
                          <button
                            onClick={() => {
                              const connections = [...formData.config.all_connections];
                              connections[idx].is_correct = false;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, all_connections: connections },
                              }));
                            }}
                            className={`py-2 rounded text-xs font-bold transition-all ${!conn.is_correct
                              ? "bg-red-600 text-white"
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                              }`}
                          >
                            ❌ Piège (à éviter)
                          </button>
                        </div>
                      </div>

                      {/* Montants */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Montant FR
                          </label>
                          <input
                            type="text"
                            value={conn.amount_fr}
                            onChange={(e) => {
                              const connections = [...formData.config.all_connections];
                              connections[idx].amount_fr = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, all_connections: connections },
                              }));
                            }}
                            placeholder="Ex: 500 000 USD"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Montant EN
                          </label>
                          <input
                            type="text"
                            value={conn.amount_en || ""}
                            onChange={(e) => {
                              const connections = [...formData.config.all_connections];
                              connections[idx].amount_en = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, all_connections: connections },
                              }));
                            }}
                            placeholder="Ex: 500,000 USD"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── PREVIEW VISUEL ── */}
                {(formData.config?.entities || []).length > 0 && (
                  <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-3">
                    <label className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-2">
                      👁️ Aperçu du réseau
                    </label>
                    <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-700 overflow-hidden" style={{ height: "400px" }}>
                      {/* Lignes de connexion */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {(formData.config?.all_connections || []).map((conn: any) => {
                          const from = formData.config.entities.find((e: any) => e.id === conn.from_id);
                          const to = formData.config.entities.find((e: any) => e.id === conn.to_id);
                          if (!from || !to) return null;
                          return (
                            <line
                              key={conn.id}
                              x1={`${from.x_percent}%`}
                              y1={`${from.y_percent}%`}
                              x2={`${to.x_percent}%`}
                              y2={`${to.y_percent}%`}
                              stroke={conn.is_correct ? "#22c55e" : "#ef4444"}
                              strokeWidth="2"
                              strokeDasharray={conn.is_correct ? "0" : "4,4"}
                              opacity="0.6"
                            />
                          );
                        })}
                      </svg>

                      {/* Entités */}
                      {(formData.config?.entities || []).map((entity: any) => (
                        <div
                          key={entity.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                          style={{ left: `${entity.x_percent}%`, top: `${entity.y_percent}%` }}
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center text-xl shadow-lg">
                            {entity.type === "shell_company"
                              ? "🏢"
                              : entity.type === "offshore_bank"
                                ? "🏦"
                                : entity.type === "personal_account"
                                  ? "👤"
                                  : entity.type === "government"
                                    ? "🏛️"
                                    : "💼"}
                          </div>
                          <span className="mt-1 text-[9px] text-white bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {entity.name_fr}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-gray-500 italic">
                      🟢 Lignes continues = vrais liens frauduleux | 🔴 Lignes pointillées = pièges
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TREASURY_CALCUL (Caisse Noire / Audit) */}
            {formData.type === "treasury_calcul" && (
              <div className="space-y-4">
                {/* SÉLECTEUR DE MODE */}
                <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30">
                  <label className="text-[10px] text-purple-400 font-bold uppercase mb-3 block">
                    💰 Mode de jeu
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, mode: "black_box" },
                        }))
                      }
                      className={`p-4 rounded-lg border-2 text-left transition-all ${formData.config?.mode === "black_box"
                        ? "bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-white/5 border-white/10 hover:border-purple-500/50"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">📦</span>
                        <span className="font-bold text-white">Caisse Noire</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Le joueur doit retrouver le montant total détourné en sélectionnant les bons bordereaux.
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, mode: "overpricing" },
                        }))
                      }
                      className={`p-4 rounded-lg border-2 text-left transition-all ${formData.config?.mode === "overpricing"
                        ? "bg-amber-600/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        : "bg-white/5 border-white/10 hover:border-amber-500/50"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">📊</span>
                        <span className="font-bold text-white">Audit de Surfactualisation</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Le joueur compare les prix unitaires avec une référence pour identifier les contrats gonflés.
                      </p>
                    </button>
                  </div>
                </div>

                {/* ════════════════════════════════════════════════════
        MODE 1 : CAISSE NOIRE
    ════════════════════════════════════════════════════ */}
                {(!formData.config?.mode || formData.config.mode === "black_box") && (
                  <div className="space-y-4">
                    {/* Objectif */}
                    <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-3">
                      <label className="text-[10px] text-purple-400 font-bold uppercase block">
                        🎯 Objectif de reconstitution
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Montant cible
                          </label>
                          <input
                            type="number"
                            value={formData.config?.target_amount || 0}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  target_amount: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Tolérance (±)
                          </label>
                          <input
                            type="number"
                            value={formData.config?.tolerance || 10000}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  tolerance: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Description FR
                          </label>
                          <input
                            type="text"
                            value={formData.config?.target_total_fr || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  target_total_fr: e.target.value,
                                },
                              }))
                            }
                            placeholder="Ex: Reconstituez le montant détourné"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Description EN
                            <button
                              type="button"
                              onClick={async () => {
                                if (!formData.config?.target_total_fr?.trim()) return;
                                setIsTranslating(true);
                                const t = await autoTranslate(
                                  formData.config.target_total_fr,
                                  "fr"
                                );
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, target_total_en: t },
                                }));
                                setIsTranslating(false);
                              }}
                              disabled={isTranslating}
                              className="ml-1 text-purple-400 hover:text-white disabled:opacity-50"
                            >
                              {isTranslating ? (
                                <Loader2 size={10} className="animate-spin inline" />
                              ) : (
                                <Languages size={10} className="inline" />
                              )}
                            </button>
                          </label>
                          <input
                            type="text"
                            value={formData.config?.target_total_en || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  target_total_en: e.target.value,
                                },
                              }))
                            }
                            placeholder="Ex: Reconstruct the embezzled amount"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-purple-400 font-bold uppercase">
                          📄 Bordereaux de virement
                        </label>
                        <button
                          onClick={() => {
                            const docs = [...(formData.config?.documents || [])];
                            docs.push({
                              id: `doc_${Date.now()}`,
                              type: "transfer",
                              amount: 0,
                              currency: "XOF",
                              date: new Date().toISOString().split("T")[0],
                              description_fr: "Nouveau bordereau",
                              description_en: "New statement",
                              is_correct: false,
                              image_url: "",
                              details_fr: [""],
                              details_en: [""],
                            });
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, documents: docs },
                            }));
                          }}
                          className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500/20"
                        >
                          <Plus size={10} /> Ajouter
                        </button>
                      </div>

                      {(formData.config?.documents || []).map((doc: any, idx: number) => (
                        <div
                          key={doc.id}
                          className={`p-3 rounded-lg border space-y-3 ${doc.is_correct
                            ? "bg-green-900/20 border-green-500/30"
                            : "bg-red-900/20 border-red-500/30"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">
                              Document {idx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const docs = formData.config.documents.filter(
                                  (d: any) => d.id !== doc.id
                                );
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, documents: docs },
                                }));
                              }}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Montant
                              </label>
                              <input
                                type="number"
                                value={doc.amount || 0}
                                onChange={(e) => {
                                  const docs = [...formData.config.documents];
                                  docs[idx].amount = Number(e.target.value);
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, documents: docs },
                                  }));
                                }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Devise
                              </label>
                              <select
                                value={doc.currency || "XOF"}
                                onChange={(e) => {
                                  const docs = [...formData.config.documents];
                                  docs[idx].currency = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, documents: docs },
                                  }));
                                }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              >
                                <option value="XOF">XOF</option>
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                value={doc.date || ""}
                                onChange={(e) => {
                                  const docs = [...formData.config.documents];
                                  docs[idx].date = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, documents: docs },
                                  }));
                                }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Description FR
                              </label>
                              <input
                                type="text"
                                value={doc.description_fr || ""}
                                onChange={(e) => {
                                  const docs = [...formData.config.documents];
                                  docs[idx].description_fr = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, documents: docs },
                                  }));
                                }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Description EN
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!doc.description_fr?.trim()) return;
                                    setIsTranslating(true);
                                    const t = await autoTranslate(doc.description_fr, "fr");
                                    const docs = [...formData.config.documents];
                                    docs[idx].description_en = t;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, documents: docs },
                                    }));
                                    setIsTranslating(false);
                                  }}
                                  disabled={isTranslating}
                                  className="ml-1 text-purple-400 hover:text-white disabled:opacity-50"
                                >
                                  {isTranslating ? (
                                    <Loader2 size={10} className="animate-spin inline" />
                                  ) : (
                                    <Languages size={10} className="inline" />
                                  )}
                                </button>
                              </label>
                              <input
                                type="text"
                                value={doc.description_en || ""}
                                onChange={(e) => {
                                  const docs = [...formData.config.documents];
                                  docs[idx].description_en = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, documents: docs },
                                  }));
                                }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>
                          </div>

                          <MediaUploader
                            label="Image du document (optionnel)"
                            url={doc.image_url}
                            onUpload={(url) => {
                              const docs = [...formData.config.documents];
                              docs[idx].image_url = url;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, documents: docs },
                              }));
                            }}
                            icon={<ImagePlus size={10} />}
                          />

                          {/* Type */}
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-1">
                              Type de document
                            </label>
                            <select
                              value={doc.type || "transfer"}
                              onChange={(e) => {
                                const docs = [...formData.config.documents];
                                docs[idx].type = e.target.value;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, documents: docs },
                                }));
                              }}
                              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                            >
                              <option value="transfer">Virement</option>
                              <option value="invoice">Facture</option>
                              <option value="receipt">Reçu</option>
                              <option value="contract">Contrat</option>
                            </select>
                          </div>

                          {/* Marquage correct/piège */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const docs = [...formData.config.documents];
                                docs[idx].is_correct = true;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, documents: docs },
                                }));
                              }}
                              className={`py-2 rounded text-xs font-bold transition-all ${doc.is_correct
                                ? "bg-green-600 text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                                }`}
                            >
                              ✅ Fait partie du détournement
                            </button>
                            <button
                              onClick={() => {
                                const docs = [...formData.config.documents];
                                docs[idx].is_correct = false;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, documents: docs },
                                }));
                              }}
                              className={`py-2 rounded text-xs font-bold transition-all ${!doc.is_correct
                                ? "bg-red-600 text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                                }`}
                            >
                              ❌ Paiement légitime (piège)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════
        MODE 2 : AUDIT DE SURFACTUALISATION
    ════════════════════════════════════════════════════ */}
                {formData.config?.mode === "overpricing" && (
                  <div className="space-y-4">
                    {/* Référence de marché */}
                    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
                      <label className="text-[10px] text-amber-400 font-bold uppercase block">
                        📊 Référence de marché
                      </label>
                      <p className="text-[9px] text-gray-500 italic">
                        Cette référence servira de base de comparaison pour les contrats.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Description FR
                          </label>
                          <input
                            type="text"
                            value={formData.config?.reference?.description_fr || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  reference: {
                                    ...prev.config.reference,
                                    description_fr: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="Ex: Construction route standard en plaine"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Description EN
                            <button
                              type="button"
                              onClick={async () => {
                                if (!formData.config?.reference?.description_fr?.trim())
                                  return;
                                setIsTranslating(true);
                                const t = await autoTranslate(
                                  formData.config.reference.description_fr,
                                  "fr"
                                );
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: {
                                    ...prev.config,
                                    reference: {
                                      ...prev.config.reference,
                                      description_en: t,
                                    },
                                  },
                                }));
                                setIsTranslating(false);
                              }}
                              disabled={isTranslating}
                              className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                            >
                              {isTranslating ? (
                                <Loader2 size={10} className="animate-spin inline" />
                              ) : (
                                <Languages size={10} className="inline" />
                              )}
                            </button>
                          </label>
                          <input
                            type="text"
                            value={formData.config?.reference?.description_en || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  reference: {
                                    ...prev.config.reference,
                                    description_en: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="Ex: Standard road construction on flat terrain"
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Quantité
                          </label>
                          <input
                            type="number"
                            value={formData.config?.reference?.quantity || 0}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  reference: {
                                    ...prev.config.reference,
                                    quantity: Number(e.target.value),
                                  },
                                },
                              }))
                            }
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Unité
                          </label>
                          <select
                            value={formData.config?.reference?.unit || "km"}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  reference: {
                                    ...prev.config.reference,
                                    unit: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="km">km</option>
                            <option value="m²">m²</option>
                            <option value="unité">unité</option>
                            <option value="tonne">tonne</option>
                            <option value="litre">litre</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-500 block mb-1">
                            Budget référence
                          </label>
                          <input
                            type="number"
                            value={formData.config?.reference?.budget || 0}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  reference: {
                                    ...prev.config.reference,
                                    budget: Number(e.target.value),
                                  },
                                },
                              }))
                            }
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-500 block mb-1">
                          Devise
                        </label>
                        <select
                          value={formData.config?.reference?.currency || "XOF"}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                reference: {
                                  ...prev.config.reference,
                                  currency: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                        >
                          <option value="XOF">XOF</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>

                      {/* Calcul automatique */}
                      {formData.config?.reference?.quantity > 0 && (
                        <div className="bg-black/30 p-3 rounded border border-amber-500/20">
                          <p className="text-[9px] text-gray-500 mb-1">
                            Prix unitaire calculé automatiquement :
                          </p>
                          <p className="text-amber-400 font-bold font-mono">
                            {(
                              (formData.config.reference.budget || 0) /
                              (formData.config.reference.quantity || 1)
                            ).toLocaleString()}{" "}
                            {formData.config.reference.currency}/{formData.config.reference.unit}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Contrats à analyser */}
                    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-amber-400 font-bold uppercase">
                          📋 Contrats à analyser
                        </label>
                        <button
                          onClick={() => {
                            const contracts = [...(formData.config?.contracts || [])];
                            contracts.push({
                              id: `contract_${Date.now()}`,
                              description_fr: "Nouveau contrat",
                              description_en: "New contract",
                              quantity: 0,
                              unit: formData.config?.reference?.unit || "km",
                              budget: 0,
                              currency: formData.config?.reference?.currency || "XOF",
                              year: new Date().getFullYear(),
                              image_url: "",
                              is_correct: false,
                            });
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, contracts },
                            }));
                          }}
                          className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-amber-500/20"
                        >
                          <Plus size={10} /> Ajouter
                        </button>
                      </div>

                      {(formData.config?.contracts || []).map(
                        (contract: any, idx: number) => (
                          <div
                            key={contract.id}
                            className={`p-3 rounded-lg border space-y-3 ${contract.is_correct
                              ? "bg-red-900/20 border-red-500/30"
                              : "bg-green-900/20 border-green-500/30"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold">
                                Contrat {idx + 1}
                              </span>
                              <button
                                onClick={() => {
                                  const contracts = formData.config.contracts.filter(
                                    (c: any) => c.id !== contract.id
                                  );
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, contracts },
                                  }));
                                }}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Description FR
                                </label>
                                <input
                                  type="text"
                                  value={contract.description_fr || ""}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].description_fr = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Description EN
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!contract.description_fr?.trim()) return;
                                      setIsTranslating(true);
                                      const t = await autoTranslate(
                                        contract.description_fr,
                                        "fr"
                                      );
                                      const contracts = [...formData.config.contracts];
                                      contracts[idx].description_en = t;
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        config: { ...prev.config, contracts },
                                      }));
                                      setIsTranslating(false);
                                    }}
                                    disabled={isTranslating}
                                    className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                                  >
                                    {isTranslating ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin inline"
                                      />
                                    ) : (
                                      <Languages size={10} className="inline" />
                                    )}
                                  </button>
                                </label>
                                <input
                                  type="text"
                                  value={contract.description_en || ""}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].description_en = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Quantité
                                </label>
                                <input
                                  type="number"
                                  value={contract.quantity || 0}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].quantity = Number(e.target.value);
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Unité
                                </label>
                                <select
                                  value={contract.unit || "km"}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].unit = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                >
                                  <option value="km">km</option>
                                  <option value="m²">m²</option>
                                  <option value="unité">unité</option>
                                  <option value="tonne">tonne</option>
                                  <option value="litre">litre</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Budget
                                </label>
                                <input
                                  type="number"
                                  value={contract.budget || 0}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].budget = Number(e.target.value);
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Année
                                </label>
                                <input
                                  type="number"
                                  value={contract.year || new Date().getFullYear()}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].year = Number(e.target.value);
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>
                            </div>

                            {/* Calcul prix unitaire */}
                            {contract.quantity > 0 && (
                              <div className="bg-black/30 p-2 rounded border border-amber-500/20">
                                <p className="text-[9px] text-gray-500">
                                  Prix unitaire :{" "}
                                  <span className="text-amber-400 font-bold font-mono">
                                    {(
                                      (contract.budget || 0) / (contract.quantity || 1)
                                    ).toLocaleString()}{" "}
                                    {contract.currency}/{contract.unit}
                                  </span>
                                </p>
                              </div>
                            )}

                            <MediaUploader
                              label="Image du contrat (optionnel)"
                              url={contract.image_url}
                              onUpload={(url) => {
                                const contracts = [...formData.config.contracts];
                                contracts[idx].image_url = url;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, contracts },
                                }));
                              }}
                              icon={<ImagePlus size={10} />}
                            />

                            {/* Marquage fraude/normal */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  const contracts = [...formData.config.contracts];
                                  contracts[idx].is_correct = true;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, contracts },
                                  }));
                                }}
                                className={`py-2 rounded text-xs font-bold transition-all ${contract.is_correct
                                  ? "bg-red-600 text-white"
                                  : "bg-white/5 text-gray-400 hover:bg-white/10"
                                  }`}
                              >
                                ❌ Contrat frauduleux (surfactualisé)
                              </button>
                              <button
                                onClick={() => {
                                  const contracts = [...formData.config.contracts];
                                  contracts[idx].is_correct = false;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, contracts },
                                  }));
                                }}
                                className={`py-2 rounded text-xs font-bold transition-all ${!contract.is_correct
                                  ? "bg-green-600 text-white"
                                  : "bg-white/5 text-gray-400 hover:bg-white/10"
                                  }`}
                              >
                                ✅ Contrat légitime
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

       





            {/* SIGNATURE_ANALYSIS (Analyse de Signature) */}
            {formData.type === "signature_analysis" && (
              <div className="space-y-4">
                {/* SÉLECTEUR DE MODE */}
                <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30">
                  <label className="text-[10px] text-purple-400 font-bold uppercase mb-3 block">
                    🎯 Mode d'analyse
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, analysis_mode: "simple" },
                        }))
                      }
                      className={`p-4 rounded-lg border-2 text-left transition-all ${formData.config?.analysis_mode === "simple"
                        ? "bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-white/5 border-white/10 hover:border-purple-500/50"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🔍</span>
                        <span className="font-bold text-white">Simple</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Le joueur doit identifier la fausse signature parmi plusieurs exemples.
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, analysis_mode: "matching" },
                        }))
                      }
                      className={`p-4 rounded-lg border-2 text-left transition-all ${formData.config?.analysis_mode === "matching"
                        ? "bg-amber-600/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        : "bg-white/5 border-white/10 hover:border-amber-500/50"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🔗</span>
                        <span className="font-bold text-white">Matching</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Le joueur doit apparier chaque signature au bon contrat.
                      </p>
                    </button>
                  </div>
                </div>

                {/* ════════════════════════════════════════════════════
        MODE SIMPLE : TROUVER LA FAUSSE SIGNATURE
    ════════════════════════════════════════════════════ */}
                {(!formData.config?.analysis_mode || formData.config.analysis_mode === "simple") && (
                  <div className="space-y-4">
                    {/* Signatures */}
                    <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-purple-400 font-bold uppercase">
                          🖋️ Signatures à présenter
                        </label>
                        <button
                          onClick={() => {
                            const sigs = [...(formData.config?.signatures || [])];
                            sigs.push({
                              id: `sig_${Date.now()}`,
                              name_fr: "Nouvelle signature",
                              name_en: "New signature",
                              image_url: "",
                            });
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, signatures: sigs },
                            }));
                          }}
                          className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500/20"
                        >
                          <Plus size={10} /> Ajouter signature
                        </button>
                      </div>

                      <p className="text-[9px] text-gray-500 italic">
                        💡 Ajoutez au moins 3 signatures. Marquez UNE comme étant la fausse.
                      </p>

                      {(formData.config?.signatures || []).map((sig: any, idx: number) => (
                        <div
                          key={sig.id}
                          className={`p-3 rounded-lg border space-y-3 ${formData.config?.counterfeit_signature_id === sig.id
                            ? "bg-red-900/20 border-red-500/30"
                            : "bg-green-900/20 border-green-500/30"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">
                              Signature {idx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const sigs = formData.config.signatures.filter(
                                  (s: any) => s.id !== sig.id
                                );
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, signatures: sigs },
                                }));
                              }}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Nom FR
                              </label>
                              <input
                                type="text"
                                value={sig.name_fr || ""}
                                onChange={(e) => {
                                  const sigs = [...formData.config.signatures];
                                  sigs[idx].name_fr = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, signatures: sigs },
                                  }));
                                }}
                                placeholder="Ex: Jean Moko - Original"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Nom EN
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!sig.name_fr?.trim()) return;
                                    setIsTranslating(true);
                                    const t = await autoTranslate(sig.name_fr, "fr");
                                    const sigs = [...formData.config.signatures];
                                    sigs[idx].name_en = t;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, signatures: sigs },
                                    }));
                                    setIsTranslating(false);
                                  }}
                                  disabled={isTranslating}
                                  className="ml-1 text-purple-400 hover:text-white disabled:opacity-50"
                                >
                                  {isTranslating ? (
                                    <Loader2 size={10} className="animate-spin inline" />
                                  ) : (
                                    <Languages size={10} className="inline" />
                                  )}
                                </button>
                              </label>
                              <input
                                type="text"
                                value={sig.name_en || ""}
                                onChange={(e) => {
                                  const sigs = [...formData.config.signatures];
                                  sigs[idx].name_en = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, signatures: sigs },
                                  }));
                                }}
                                placeholder="Ex: Jean Moko - Original"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>
                          </div>

                          <MediaUploader
                            label="Image de la signature"
                            url={sig.image_url}
                            onUpload={(url) => {
                              const sigs = [...formData.config.signatures];
                              sigs[idx].image_url = url;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, signatures: sigs },
                              }));
                            }}
                            icon={<ImagePlus size={10} />}
                          />

                          {/* Aperçu */}
                          {sig.image_url && (
                            <div className="bg-gray-900 rounded p-2 h-24 flex items-center justify-center overflow-hidden border border-white/10">
                              <img
                                src={sig.image_url}
                                alt="Signature"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          )}

                          {/* Marquage fausse signature */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: {
                                    ...prev.config,
                                    counterfeit_signature_id: sig.id,
                                  },
                                }));
                              }}
                              className={`py-2 rounded text-xs font-bold transition-all ${formData.config?.counterfeit_signature_id === sig.id
                                ? "bg-red-600 text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                                }`}
                            >
                              ❌ C'est la FAUSSE signature
                            </button>
                            <button
                              onClick={() => {
                                if (formData.config?.counterfeit_signature_id === sig.id) {
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: {
                                      ...prev.config,
                                      counterfeit_signature_id: "",
                                    },
                                  }));
                                }
                              }}
                              className={`py-2 rounded text-xs font-bold transition-all ${formData.config?.counterfeit_signature_id !== sig.id
                                ? "bg-green-600 text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                                }`}
                            >
                              ✅ Signature authentique
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════
        MODE MATCHING : APPARIER SIGNATURES/CONTRATS
    ════════════════════════════════════════════════════ */}
                {formData.config?.analysis_mode === "matching" && (
                  <div className="space-y-4">
                    {/* Mode de feedback */}
                    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30">
                      <label className="text-[10px] text-amber-400 font-bold uppercase mb-3 block">
                        🎯 Mode de feedback
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, feedback_mode: "immediate" },
                            }))
                          }
                          className={`p-3 rounded-lg border-2 text-left transition-all ${formData.config?.feedback_mode === "immediate"
                            ? "bg-green-600/20 border-green-500"
                            : "bg-white/5 border-white/10 hover:border-green-500/50"
                            }`}
                        >
                          <p className="text-xs font-bold text-white mb-1">
                            ⚡ Immédiat
                          </p>
                          <p className="text-[9px] text-gray-400">
                            Le joueur voit tout de suite si un appariement est correct
                          </p>
                        </button>

                        <button
                          onClick={() =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, feedback_mode: "end" },
                            }))
                          }
                          className={`p-3 rounded-lg border-2 text-left transition-all ${formData.config?.feedback_mode === "end"
                            ? "bg-amber-600/20 border-amber-500"
                            : "bg-white/5 border-white/10 hover:border-amber-500/50"
                            }`}
                        >
                          <p className="text-xs font-bold text-white mb-1">
                            🏁 À la fin
                          </p>
                          <p className="text-[9px] text-gray-400">
                            Les résultats sont révélés uniquement à la validation (plus challengeant)
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Contrats */}
                    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-amber-400 font-bold uppercase">
                          📄 Contrats à apparier
                        </label>
                        <button
                          onClick={() => {
                            const contracts = [...(formData.config?.contracts || [])];
                            contracts.push({
                              id: `contract_${Date.now()}`,
                              name_fr: "Nouveau contrat",
                              name_en: "New contract",
                              description_fr: "",
                              description_en: "",
                              image_url: "",
                              correct_signature_id: "",
                            });
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, contracts },
                            }));
                          }}
                          className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-amber-500/20"
                        >
                          <Plus size={10} /> Ajouter contrat
                        </button>
                      </div>

                      {(formData.config?.contracts || []).map(
                        (contract: any, idx: number) => (
                          <div
                            key={contract.id}
                            className="p-3 rounded-lg border border-amber-500/20 bg-black/20 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold">
                                Contrat {idx + 1}
                              </span>
                              <button
                                onClick={() => {
                                  const contracts = formData.config.contracts.filter(
                                    (c: any) => c.id !== contract.id
                                  );
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, contracts },
                                  }));
                                }}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Nom FR
                                </label>
                                <input
                                  type="text"
                                  value={contract.name_fr || ""}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].name_fr = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  placeholder="Ex: Mine de Kolwezi"
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Nom EN
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!contract.name_fr?.trim()) return;
                                      setIsTranslating(true);
                                      const t = await autoTranslate(
                                        contract.name_fr,
                                        "fr"
                                      );
                                      const contracts = [...formData.config.contracts];
                                      contracts[idx].name_en = t;
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        config: { ...prev.config, contracts },
                                      }));
                                      setIsTranslating(false);
                                    }}
                                    disabled={isTranslating}
                                    className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                                  >
                                    {isTranslating ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin inline"
                                      />
                                    ) : (
                                      <Languages size={10} className="inline" />
                                    )}
                                  </button>
                                </label>
                                <input
                                  type="text"
                                  value={contract.name_en || ""}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].name_en = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  placeholder="Ex: Kolwezi Mine"
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Description FR
                                </label>
                                <input
                                  type="text"
                                  value={contract.description_fr || ""}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].description_fr = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  placeholder="Ex: Contrat d'exploitation minière"
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] text-gray-500 block mb-1">
                                  Description EN
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!contract.description_fr?.trim()) return;
                                      setIsTranslating(true);
                                      const t = await autoTranslate(
                                        contract.description_fr,
                                        "fr"
                                      );
                                      const contracts = [...formData.config.contracts];
                                      contracts[idx].description_en = t;
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        config: { ...prev.config, contracts },
                                      }));
                                      setIsTranslating(false);
                                    }}
                                    disabled={isTranslating}
                                    className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                                  >
                                    {isTranslating ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin inline"
                                      />
                                    ) : (
                                      <Languages size={10} className="inline" />
                                    )}
                                  </button>
                                </label>
                                <input
                                  type="text"
                                  value={contract.description_en || ""}
                                  onChange={(e) => {
                                    const contracts = [...formData.config.contracts];
                                    contracts[idx].description_en = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, contracts },
                                    }));
                                  }}
                                  placeholder="Ex: Mining exploitation contract"
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                              </div>
                            </div>

                            <MediaUploader
                              label="Image du contrat (optionnel)"
                              url={contract.image_url}
                              onUpload={(url) => {
                                const contracts = [...formData.config.contracts];
                                contracts[idx].image_url = url;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, contracts },
                                }));
                              }}
                              icon={<ImagePlus size={10} />}
                            />

                            {/* Signature correcte */}
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Signature correcte (celle qui doit être appariée)
                              </label>
                              <select
                                value={contract.correct_signature_id || ""}
                                onChange={(e) => {
                                  const contracts = [...formData.config.contracts];
                                  contracts[idx].correct_signature_id = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, contracts },
                                  }));
                                }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              >
                                <option value="">— Sélectionner une signature —</option>
                                {(formData.config?.signatures || []).map((sig: any) => (
                                  <option key={sig.id} value={sig.id}>
                                    {sig.name_fr}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Signatures pour le matching */}
                    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-amber-400 font-bold uppercase">
                          🖋️ Signatures disponibles
                        </label>
                        <button
                          onClick={() => {
                            const sigs = [...(formData.config?.signatures || [])];
                            sigs.push({
                              id: `sig_${Date.now()}`,
                              name_fr: "Nouvelle signature",
                              name_en: "New signature",
                              image_url: "",
                            });
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, signatures: sigs },
                            }));
                          }}
                          className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-amber-500/20"
                        >
                          <Plus size={10} /> Ajouter signature
                        </button>
                      </div>

                      {(formData.config?.signatures || []).map((sig: any, idx: number) => (
                        <div
                          key={sig.id}
                          className="p-3 rounded-lg border border-amber-500/20 bg-black/20 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">
                              Signature {idx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const sigs = formData.config.signatures.filter(
                                  (s: any) => s.id !== sig.id
                                );
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, signatures: sigs },
                                }));
                              }}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Nom FR
                              </label>
                              <input
                                type="text"
                                value={sig.name_fr || ""}
                                onChange={(e) => {
                                  const sigs = [...formData.config.signatures];
                                  sigs[idx].name_fr = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, signatures: sigs },
                                  }));
                                }}
                                placeholder="Ex: M. Kabila"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">
                                Nom EN
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!sig.name_fr?.trim()) return;
                                    setIsTranslating(true);
                                    const t = await autoTranslate(sig.name_fr, "fr");
                                    const sigs = [...formData.config.signatures];
                                    sigs[idx].name_en = t;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, signatures: sigs },
                                    }));
                                    setIsTranslating(false);
                                  }}
                                  disabled={isTranslating}
                                  className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                                >
                                  {isTranslating ? (
                                    <Loader2 size={10} className="animate-spin inline" />
                                  ) : (
                                    <Languages size={10} className="inline" />
                                  )}
                                </button>
                              </label>
                              <input
                                type="text"
                                value={sig.name_en || ""}
                                onChange={(e) => {
                                  const sigs = [...formData.config.signatures];
                                  sigs[idx].name_en = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, signatures: sigs },
                                  }));
                                }}
                                placeholder="Ex: Mr. Kabila"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                            </div>
                          </div>

                          <MediaUploader
                            label="Image de la signature"
                            url={sig.image_url}
                            onUpload={(url) => {
                              const sigs = [...formData.config.signatures];
                              sigs[idx].image_url = url;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, signatures: sigs },
                              }));
                            }}
                            icon={<ImagePlus size={10} />}
                          />

                          {/* Aperçu */}
                          {sig.image_url && (
                            <div className="bg-gray-900 rounded p-2 h-20 flex items-center justify-center">
                              <img
                                src={sig.image_url}
                                alt="Signature"
                                className="h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* CONTRACT_CLAUSES (Analyse de Contrat) */}
{formData.type === "contract_clauses" && (
  <div className="space-y-4">
    {/* Informations du contrat */}
    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
      <label className="text-[10px] text-amber-400 font-bold uppercase block">
        📋 Informations du contrat
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Titre FR</label>
          <input
            type="text"
            value={formData.config?.title_fr || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, title_fr: e.target.value },
              }))
            }
            placeholder="Ex: Contrat minier de Kolwezi"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-gray-500 block mb-1">
            Titre EN
            <button
              type="button"
              onClick={async () => {
                if (!formData.config?.title_fr?.trim()) return;
                setIsTranslating(true);
                const t = await autoTranslate(formData.config.title_fr, "fr");
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, title_en: t },
                }));
                setIsTranslating(false);
              }}
              disabled={isTranslating}
              className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
            >
              {isTranslating ? (
                <Loader2 size={10} className="animate-spin inline" />
              ) : (
                <Languages size={10} className="inline" />
              )}
            </button>
          </label>
          <input
            type="text"
            value={formData.config?.title_en || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, title_en: e.target.value },
              }))
            }
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Nom de l'État (FR)</label>
          <input
            type="text"
            value={formData.config?.state_name_fr || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, state_name_fr: e.target.value },
              }))
            }
            placeholder="Ex: République du Congo"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-gray-500 block mb-1">
            Nom de l'État (EN)
            <button
              type="button"
              onClick={async () => {
                if (!formData.config?.state_name_fr?.trim()) return;
                setIsTranslating(true);
                const t = await autoTranslate(formData.config.state_name_fr, "fr");
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, state_name_en: t },
                }));
                setIsTranslating(false);
              }}
              disabled={isTranslating}
              className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
            >
              {isTranslating ? (
                <Loader2 size={10} className="animate-spin inline" />
              ) : (
                <Languages size={10} className="inline" />
              )}
            </button>
          </label>
          <input
            type="text"
            value={formData.config?.state_name_en || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, state_name_en: e.target.value },
              }))
            }
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Nom de l'Entreprise (FR)</label>
          <input
            type="text"
            value={formData.config?.company_name_fr || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, company_name_fr: e.target.value },
              }))
            }
            placeholder="Ex: MiningCorp International"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-gray-500 block mb-1">
            Nom de l'Entreprise (EN)
            <button
              type="button"
              onClick={async () => {
                if (!formData.config?.company_name_fr?.trim()) return;
                setIsTranslating(true);
                const t = await autoTranslate(formData.config.company_name_fr, "fr");
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, company_name_en: t },
                }));
                setIsTranslating(false);
              }}
              disabled={isTranslating}
              className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
            >
              {isTranslating ? (
                <Loader2 size={10} className="animate-spin inline" />
              ) : (
                <Languages size={10} className="inline" />
              )}
            </button>
          </label>
          <input
            type="text"
            value={formData.config?.company_name_en || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, company_name_en: e.target.value },
              }))
            }
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Date</label>
          <input
            type="date"
            value={formData.config?.date || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, date: e.target.value },
              }))
            }
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Référence</label>
          <input
            type="text"
            value={formData.config?.reference || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, reference: e.target.value },
              }))
            }
            placeholder="Ex: MC-2024-COL-001"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Minimum à trouver</label>
          <input
            type="number"
            min="1"
            value={formData.config?.minimum_abusive_count || 3}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, minimum_abusive_count: Number(e.target.value) },
              }))
            }
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] text-gray-500 block mb-1">Objet FR</label>
          <input
            type="text"
            value={formData.config?.object_fr || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, object_fr: e.target.value },
              }))
            }
            placeholder="Ex: Exploitation de la mine de cuivre de Kolwezi"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-gray-500 block mb-1">
            Objet EN
            <button
              type="button"
              onClick={async () => {
                if (!formData.config?.object_fr?.trim()) return;
                setIsTranslating(true);
                const t = await autoTranslate(formData.config.object_fr, "fr");
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, object_en: t },
                }));
                setIsTranslating(false);
              }}
              disabled={isTranslating}
              className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
            >
              {isTranslating ? (
                <Loader2 size={10} className="animate-spin inline" />
              ) : (
                <Languages size={10} className="inline" />
              )}
            </button>
          </label>
          <input
            type="text"
            value={formData.config?.object_en || ""}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                config: { ...prev.config, object_en: e.target.value },
              }))
            }
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <MediaUploader
        label="Image du contrat (optionnel)"
        url={formData.config?.contract_image_url}
        onUpload={(url) =>
          setFormData((prev: any) => ({
            ...prev,
            config: { ...prev.config, contract_image_url: url },
          }))
        }
        icon={<ImagePlus size={10} />}
      />
    </div>

    {/* Articles du contrat */}
    <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-amber-400 font-bold uppercase">
          📄 Articles du contrat
        </label>
        <button
          onClick={() => {
            const clauses = [...(formData.config?.clauses || [])];
            clauses.push({
              id: `clause_${Date.now()}`,
              article_number: `Article ${clauses.length + 1}`,
              title_fr: "Nouvel article",
              title_en: "New article",
              text_fr: "",
              text_en: "",
              is_abusive: false,
              justifications: [
                {
                  id: `just_${Date.now()}_1`,
                  text_fr: "Justification correcte",
                  text_en: "Correct justification",
                  is_correct: true,
                },
                {
                  id: `just_${Date.now()}_2`,
                  text_fr: "Justification incorrecte 1",
                  text_en: "Incorrect justification 1",
                  is_correct: false,
                },
                {
                  id: `just_${Date.now()}_3`,
                  text_fr: "Justification incorrecte 2",
                  text_en: "Incorrect justification 2",
                  is_correct: false,
                },
                {
                  id: `just_${Date.now()}_4`,
                  text_fr: "Justification incorrecte 3",
                  text_en: "Incorrect justification 3",
                  is_correct: false,
                },
              ],
              explanation_fr: "",
              explanation_en: "",
            });
            setFormData((prev: any) => ({
              ...prev,
              config: { ...prev.config, clauses },
            }));
          }}
          className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1 hover:bg-amber-500/20"
        >
          <Plus size={10} /> Ajouter article
        </button>
      </div>

      {(formData.config?.clauses || []).map((clause: any, idx: number) => (
        <div
          key={clause.id}
          className={`p-3 rounded-lg border space-y-3 ${
            clause.is_abusive
              ? "bg-red-900/20 border-red-500/30"
              : "bg-green-900/20 border-green-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold">
              Article {idx + 1}
            </span>
            <button
              onClick={() => {
                const clauses = formData.config.clauses.filter(
                  (c: any) => c.id !== clause.id
                );
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, clauses },
                }));
              }}
              className="p-1 text-red-500 hover:bg-red-500/10 rounded"
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 block mb-1">Numéro</label>
              <input
                type="text"
                value={clause.article_number || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].article_number = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                placeholder="Ex: Article 5"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-500 block mb-1">Titre FR</label>
              <input
                type="text"
                value={clause.title_fr || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].title_fr = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                placeholder="Ex: Fiscalité"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 block mb-1">
                Titre EN
                <button
                  type="button"
                  onClick={async () => {
                    if (!clause.title_fr?.trim()) return;
                    setIsTranslating(true);
                    const t = await autoTranslate(clause.title_fr, "fr");
                    const clauses = [...formData.config.clauses];
                    clauses[idx].title_en = t;
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                    setIsTranslating(false);
                  }}
                  disabled={isTranslating}
                  className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                >
                  {isTranslating ? (
                    <Loader2 size={10} className="animate-spin inline" />
                  ) : (
                    <Languages size={10} className="inline" />
                  )}
                </button>
              </label>
              <input
                type="text"
                value={clause.title_en || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].title_en = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 block mb-1">Texte FR (court et impactant)</label>
              <textarea
                value={clause.text_fr || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].text_fr = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                placeholder="Ex: L'Entreprise bénéficie d'une exonération fiscale totale pendant vingt-cinq ans."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-500 block mb-1">
                Texte EN
                <button
                  type="button"
                  onClick={async () => {
                    if (!clause.text_fr?.trim()) return;
                    setIsTranslating(true);
                    const t = await autoTranslate(clause.text_fr, "fr");
                    const clauses = [...formData.config.clauses];
                    clauses[idx].text_en = t;
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                    setIsTranslating(false);
                  }}
                  disabled={isTranslating}
                  className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                >
                  {isTranslating ? (
                    <Loader2 size={10} className="animate-spin inline" />
                  ) : (
                    <Languages size={10} className="inline" />
                  )}
                </button>
              </label>
              <textarea
                value={clause.text_en || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].text_en = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none resize-none"
              />
            </div>
          </div>

          {/* Marquage abusif/acceptable */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const clauses = [...formData.config.clauses];
                clauses[idx].is_abusive = true;
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, clauses },
                }));
              }}
              className={`py-2 rounded text-xs font-bold transition-all ${
                clause.is_abusive
                  ? "bg-red-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              ❌ Clause ABUSIVE
            </button>
            <button
              onClick={() => {
                const clauses = [...formData.config.clauses];
                clauses[idx].is_abusive = false;
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, clauses },
                }));
              }}
              className={`py-2 rounded text-xs font-bold transition-all ${
                !clause.is_abusive
                  ? "bg-green-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              ✅ Clause acceptable
            </button>
          </div>

          {/* Justifications */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-[9px] text-gray-500 block font-bold">
              Justifications possibles (4 choix, 1 correct)
            </label>

            {(clause.justifications || []).map((just: any, jIdx: number) => (
              <div key={just.id} className="flex gap-2 items-center">
                <input
                  type="radio"
                  name={`correct_just_${clause.id}`}
                  checked={just.is_correct}
                  onChange={() => {
                    const clauses = [...formData.config.clauses];
                    clauses[idx].justifications = clauses[idx].justifications.map(
                      (j: any, i: number) => ({
                        ...j,
                        is_correct: i === jIdx,
                      })
                    );
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                  }}
                  className="accent-green-500"
                />
                <input
                  type="text"
                  value={just.text_fr || ""}
                  onChange={(e) => {
                    const clauses = [...formData.config.clauses];
                    clauses[idx].justifications[jIdx].text_fr = e.target.value;
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                  }}
                  placeholder="Justification FR"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                />
                <input
                  type="text"
                  value={just.text_en || ""}
                  onChange={(e) => {
                    const clauses = [...formData.config.clauses];
                    clauses[idx].justifications[jIdx].text_en = e.target.value;
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                  }}
                  placeholder="Justification EN"
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                />
                <button
                  onClick={() => {
                    const clauses = [...formData.config.clauses];
                    clauses[idx].justifications = clauses[idx].justifications.filter(
                      (j: any) => j.id !== just.id
                    );
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                  }}
                  className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}

            <button
              onClick={() => {
                const clauses = [...formData.config.clauses];
                clauses[idx].justifications.push({
                  id: `just_${Date.now()}`,
                  text_fr: "",
                  text_en: "",
                  is_correct: false,
                });
                setFormData((prev: any) => ({
                  ...prev,
                  config: { ...prev.config, clauses },
                }));
              }}
              className="text-[9px] text-amber-400 font-bold hover:text-amber-300 flex items-center gap-1"
            >
              <Plus size={8} /> Ajouter une justification
            </button>
          </div>

          {/* Explication pédagogique */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <div>
              <label className="text-[9px] text-gray-500 block mb-1">Explication pédagogique FR</label>
              <textarea
                value={clause.explanation_fr || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].explanation_fr = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                placeholder="Ex: Une exonération totale de 25 ans prive l'État de milliards..."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-500 block mb-1">
                Explication pédagogique EN
                <button
                  type="button"
                  onClick={async () => {
                    if (!clause.explanation_fr?.trim()) return;
                    setIsTranslating(true);
                    const t = await autoTranslate(clause.explanation_fr, "fr");
                    const clauses = [...formData.config.clauses];
                    clauses[idx].explanation_en = t;
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, clauses },
                    }));
                    setIsTranslating(false);
                  }}
                  disabled={isTranslating}
                  className="ml-1 text-amber-400 hover:text-white disabled:opacity-50"
                >
                  {isTranslating ? (
                    <Loader2 size={10} className="animate-spin inline" />
                  ) : (
                    <Languages size={10} className="inline" />
                  )}
                </button>
              </label>
              <textarea
                value={clause.explanation_en || ""}
                onChange={(e) => {
                  const clauses = [...formData.config.clauses];
                  clauses[idx].explanation_en = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    config: { ...prev.config, clauses },
                  }));
                }}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none resize-none"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

            {/* MAP (Cartographie) */}
            {formData.type === "map" && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block flex items-center gap-1">
                    Mode de Carte
                  </label>
                  <select
                    value={formData.config?.map_mode || "image"}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, map_mode: e.target.value },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="image">
                      🗺️ Carte Image (Historique / Statique)
                    </option>
                    <option value="geo">
                      🌍 Carte GPS Interactive (Moderne)
                    </option>
                  </select>
                </div>

                {/* MODE IMAGE */}
                {(!formData.config?.map_mode ||
                  formData.config.map_mode === "image") && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MediaUploader
                          label="Fond de Carte (FR)"
                          url={formData.config?.map_url_fr}
                          onUpload={(url) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, map_url_fr: url },
                            }))
                          }
                          icon={<ImagePlus size={12} />}
                        />
                        <MediaUploader
                          label="Fond de Carte (EN - Optionnel)"
                          url={formData.config?.map_url_en}
                          onUpload={(url) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, map_url_en: url },
                            }))
                          }
                          icon={<ImagePlus size={12} />}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-gray-300 font-bold uppercase">
                            Points sur l'image
                          </label>
                          <button
                            onClick={() => {
                              const pts = [...(formData.config?.points || [])];
                              pts.push({
                                id: `pt_${Date.now()}`,
                                x: 50,
                                y: 50,
                                name_fr: "Nouveau Point",
                              });
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, points: pts },
                              }));
                            }}
                            className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Plus size={10} /> Ajouter
                          </button>
                        </div>

                        {formData.config?.map_url_fr && (
                          <div
                            className="relative w-full aspect-[4/3] bg-black border border-gray-700 rounded-lg overflow-hidden cursor-crosshair"
                            onClick={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const x =
                                ((e.clientX - rect.left) / rect.width) * 100;
                              const y =
                                ((e.clientY - rect.top) / rect.height) * 100;
                              const pts = [...(formData.config?.points || [])];
                              pts.push({
                                id: `pt_${Date.now()}`,
                                x,
                                y,
                                name_fr: "Nouveau",
                              });
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, points: pts },
                              }));
                            }}
                          >
                            <img
                              src={formData.config.map_url_fr}
                              alt="preview"
                              className="absolute inset-0 w-full h-full object-cover opacity-50"
                            />
                            {(formData.config?.points || []).map(
                              (pt: any, idx: number) => (
                                <div
                                  key={pt.id}
                                  className="absolute w-3 h-3 bg-amber-500 rounded-full border-2 border-black transform -translate-x-1/2 -translate-y-1/2"
                                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                                >
                                  <span className="absolute top-4 left-1/2 transform -translate-x-1/2 text-[8px] bg-black/80 px-1 rounded text-white whitespace-nowrap">
                                    {idx + 1}. {pt.name_fr}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                        {(formData.config?.points || []).map(
                          (pt: any, idx: number) => (
                            <div
                              key={pt.id}
                              className="bg-black/30 p-2 rounded border border-amber-500/20 flex gap-2 items-center"
                            >
                              <span className="text-amber-500 font-mono text-xs">
                                {idx + 1}.
                              </span>
                              <input
                                type="text"
                                value={pt.name_fr || ""}
                                onChange={(e) => {
                                  const pts = [
                                    ...(formData.config?.points || []),
                                  ];
                                  pts[idx].name_fr = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, points: pts },
                                  }));
                                }}
                                placeholder="Nom FR"
                                className="flex-1 bg-transparent border-b border-gray-700 text-xs text-white outline-none"
                              />
                              <div className="flex gap-1 items-center flex-1">
                                <input
                                  type="text"
                                  value={pt.name_en || ""}
                                  onChange={(e) => {
                                    const pts = [
                                      ...(formData.config?.points || []),
                                    ];
                                    pts[idx].name_en = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: { ...prev.config, points: pts },
                                    }));
                                  }}
                                  placeholder="Nom EN"
                                  className="flex-1 bg-transparent border-b border-gray-700 text-xs text-white outline-none"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const pts = [
                                    ...(formData.config?.points || []),
                                  ];
                                  pts.splice(idx, 1);
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, points: pts },
                                  }));
                                }}
                                className="text-red-500 p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* MODE GEO (GPS) */}
                {formData.config?.map_mode === "geo" && (
                  <div className="space-y-4 border-t border-white/10 pt-4">
                    <AdminMapGeo
                      points={formData.config?.geo_points || []}
                      onAddPoint={(newPoint) => setFormData((prev: any) => ({ ...prev, config: { ...prev.config, geo_points: [...(prev.config?.geo_points || []), newPoint] } }))}
                      targetSequence={formData.config?.target_sequence || []}
                      center={formData.config?.map_center || [0, 0]}
                      setCenter={(c) => setFormData((prev: any) => ({ ...prev, config: { ...prev.config, map_center: c } }))}
                      zoom={formData.config?.map_zoom || 2}
                      setZoom={(z) => setFormData((prev: any) => ({ ...prev, config: { ...prev.config, map_zoom: z } }))}
                    />

                    <div className="space-y-2 mt-4">
                      <label className="text-[10px] text-gray-300 font-bold uppercase">
                        Liste des repères GPS créés
                      </label>
                      {(formData.config?.geo_points || []).length === 0 && (
                        <p className="text-[10px] text-gray-500 italic">
                          Cliquez sur la carte au-dessus pour ajouter des
                          points.
                        </p>
                      )}
                      {(formData.config?.geo_points || []).map(
                        (pt: any, idx: number) => (
                          <div
                            key={pt.id}
                            className="bg-black/30 p-2 rounded border border-amber-500/20 flex gap-2 items-center"
                          >
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              {idx + 1}.
                            </span>
                            <div className="flex flex-col flex-1 gap-1">
                              <div className="text-[9px] text-gray-500 font-mono">
                                Lat: {pt.lat.toFixed(4)}, Lng:{" "}
                                {pt.lng.toFixed(4)}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={pt.name_fr || ""}
                                  onChange={(e) => {
                                    const pts = [
                                      ...(formData.config?.geo_points || []),
                                    ];
                                    pts[idx].name_fr = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: {
                                        ...prev.config,
                                        geo_points: pts,
                                      },
                                    }));
                                  }}
                                  placeholder="Nom de la ville/lieu (FR)"
                                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                />
                                <div className="flex gap-1 flex-1">
                                  <input
                                    type="text"
                                    value={pt.name_en || ""}
                                    onChange={(e) => {
                                      const pts = [
                                        ...(formData.config?.geo_points || []),
                                      ];
                                      pts[idx].name_en = e.target.value;
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        config: {
                                          ...prev.config,
                                          geo_points: pts,
                                        },
                                      }));
                                    }}
                                    placeholder="Nom (EN)"
                                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!pt.name_fr?.trim()) return;
                                      setIsTranslating(true);
                                      const t = await autoTranslate(
                                        pt.name_fr,
                                        "fr",
                                      );
                                      const pts = [
                                        ...(formData.config?.geo_points || []),
                                      ];
                                      pts[idx].name_en = t;
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        config: {
                                          ...prev.config,
                                          geo_points: pts,
                                        },
                                      }));
                                      setIsTranslating(false);
                                    }}
                                    className="p-1 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0 disabled:opacity-50"
                                    disabled={isTranslating}
                                  >
                                    {isTranslating ? (
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
                            </div>
                            <button
                              onClick={() => {
                                const pts = [
                                  ...(formData.config?.geo_points || []),
                                ];
                                pts.splice(idx, 1);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, geo_points: pts },
                                }));
                              }}
                              className="text-red-500 p-2 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* SÉQUENCE CIBLE (Partagée par les deux modes) */}
                <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <label className="text-[10px] text-green-400 font-bold uppercase mb-2 block">Ordre de l'itinéraire (Séquence gagnante)</label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Entrez les numéros des points dans l'ordre du voyage (ex: 1,3,2,4). <br />
                    {formData.config?.map_mode === "geo" && <span className="text-[#D4AF37]">La carte tracera les lignes automatiquement en haut.</span>}
                  </p>
                  <input
                    type="text"
                    placeholder="Ex: 1,2,3"
                    value={formData.config?.raw_target_sequence ?? (formData.config?.target_sequence || []).map((id: string) => {
                      const pts = formData.config?.map_mode === "geo" ? formData.config?.geo_points : formData.config?.points;
                      return (pts || []).findIndex((p: any) => p.id === id) + 1;
                    }).join(',')}
                    onChange={(e) => {
                      const rawText = e.target.value;
                      const indices = rawText.split(',').map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n));
                      const pts = formData.config?.map_mode === "geo" ? formData.config?.geo_points : formData.config?.points;
                      const seq = indices.map(i => (pts || [])[i]?.id).filter(id => id);

                      setFormData((prev: any) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          target_sequence: seq,
                          raw_target_sequence: rawText // Mémorise exactement ce que tu as tapé !
                        }
                      }));
                    }}
                    className="w-full bg-[#1a1a1a] border border-green-500/30 rounded px-2 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* CANVAS (Ancien Grattage) */}
            {formData.type === "canvas" && (
              <div className="space-y-4">
                <MediaUploader
                  label="Image opaque (à frotter)"
                  url={formData.config?.opaque_image_url}
                  onUpload={(url) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, opaque_image_url: url },
                    }))
                  }
                  icon={<ImagePlus size={12} />}
                />
                <MediaUploader
                  label="Image révélée (message caché)"
                  url={formData.config?.revealed_image_url}
                  onUpload={(url) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, revealed_image_url: url },
                    }))
                  }
                  icon={<ImagePlus size={12} />}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Seuil de révélation (%)
                    </label>
                    <input
                      type="number"
                      value={formData.config?.reveal_threshold || 75}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            reveal_threshold: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                      Taille du pinceau
                    </label>
                    <select
                      value={formData.config?.brush_size || "medium"}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            brush_size: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="small">Petit</option>
                      <option value="medium">Moyen</option>
                      <option value="large">Grand</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PORTRAIT */}
            {formData.type === "portrait" && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block flex items-center gap-1">
                    <Sliders size={12} /> Mode de Jeu "Portrait"
                  </label>
                  <select
                    value={formData.config?.portrait_mode || "layers"}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          portrait_mode: e.target.value,
                        },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="layers">
                      🎨 Création par Calques (Portrait-Robot)
                    </option>
                    <option value="lineup">
                      👥 Tapissage de Police (Line-up / Sélection)
                    </option>
                    <option value="reveal">
                      🎛️ Développement Photo (Amélioration/Filtre)
                    </option>
                  </select>
                </div>

                {/* MODE : LAYERS */}
                {(!formData.config?.portrait_mode ||
                  formData.config.portrait_mode === "layers") && (
                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-300 font-bold uppercase">
                          Catégories de calques
                        </label>
                        <button
                          onClick={() => {
                            const cats = [...(formData.config?.categories || [])];
                            cats.push({
                              name_fr: "Nouvelle catégorie",
                              name_en: "",
                              layer_order: cats.length,
                              options: [""],
                            });
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, categories: cats },
                            }));
                          }}
                          className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"
                        >
                          <Plus size={10} /> Catégorie
                        </button>
                      </div>

                      {(formData.config?.categories || []).map(
                        (cat: any, catIdx: number) => (
                          <div
                            key={catIdx}
                            className="bg-black/30 p-3 rounded border border-amber-500/20 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-amber-400 font-bold">
                                Catégorie {catIdx + 1}
                              </span>
                              <button
                                onClick={() => {
                                  const cats = [
                                    ...(formData.config?.categories || []),
                                  ];
                                  cats.splice(catIdx, 1);
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, categories: cats },
                                  }));
                                }}
                                className="p-1 text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={cat.name_fr || ""}
                                onChange={(e) => {
                                  const cats = [
                                    ...(formData.config?.categories || []),
                                  ];
                                  cats[catIdx].name_fr = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, categories: cats },
                                  }));
                                }}
                                placeholder="Nom FR (ex: Forme du Visage, Yeux...)"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={cat.name_en || ""}
                                  onChange={(e) => {
                                    const cats = [
                                      ...(formData.config?.categories || []),
                                    ];
                                    cats[catIdx].name_en = e.target.value;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: {
                                        ...prev.config,
                                        categories: cats,
                                      },
                                    }));
                                  }}
                                  placeholder="Nom EN (ex: Face Shape, Eyes...)"
                                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                />
                                <button
                                  onClick={async () => {
                                    if (!cat.name_fr?.trim()) return;
                                    setIsTranslating(true);
                                    const t = await autoTranslate(
                                      cat.name_fr,
                                      "fr",
                                    );
                                    const cats = [
                                      ...(formData.config?.categories || []),
                                    ];
                                    cats[catIdx].name_en = t;
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      config: {
                                        ...prev.config,
                                        categories: cats,
                                      },
                                    }));
                                    setIsTranslating(false);
                                  }}
                                  className="p-1 bg-white/5 rounded flex-shrink-0"
                                >
                                  <Languages
                                    size={10}
                                    className="text-gray-400"
                                  />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-4 pl-3 border-l-2 border-amber-500/20 py-2">
                              {(cat.options || []).map(
                                (opt: string, optIdx: number) => (
                                  <div
                                    key={optIdx}
                                    className="flex gap-2 items-start bg-black/40 p-2 rounded border border-white/5"
                                  >
                                    <span className="text-[9px] text-gray-600 w-4 pt-6">
                                      {optIdx + 1}.
                                    </span>
                                    <div className="flex-1">
                                      <MediaUploader
                                        label={`Option ${optIdx + 1} (ex: PNG Yeux bleus)`}
                                        url={opt}
                                        onUpload={(url) => {
                                          const cats = [
                                            ...(formData.config?.categories ||
                                              []),
                                          ];
                                          cats[catIdx].options[optIdx] = url;
                                          setFormData((prev: any) => ({
                                            ...prev,
                                            config: {
                                              ...prev.config,
                                              categories: cats,
                                            },
                                          }));
                                        }}
                                        icon={<ImagePlus size={10} />}
                                      />
                                    </div>
                                    <button
                                      onClick={() => {
                                        const cats = [
                                          ...(formData.config?.categories || []),
                                        ];
                                        cats[catIdx].options.splice(optIdx, 1);
                                        setFormData((prev: any) => ({
                                          ...prev,
                                          config: {
                                            ...prev.config,
                                            categories: cats,
                                          },
                                        }));
                                      }}
                                      className="p-1 text-red-500 pt-6 hover:bg-red-500/10 rounded"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ),
                              )}
                              <button
                                onClick={() => {
                                  const cats = [
                                    ...(formData.config?.categories || []),
                                  ];
                                  cats[catIdx].options = [
                                    ...(cats[catIdx].options || []),
                                    "",
                                  ];
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, categories: cats },
                                  }));
                                }}
                                className="text-[9px] text-amber-400 font-bold hover:text-amber-300 flex items-center gap-1"
                              >
                                <Plus size={8} /> Ajouter une option d'image
                              </button>
                            </div>

                            <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/20">
                              <span className="text-[9px] text-green-400 font-bold">
                                🎯 Option Correcte (Le coupable) :
                              </span>
                              <select
                                value={
                                  formData.config?.target_combination?.[
                                  cat.name_fr
                                  ] ?? 0
                                }
                                onChange={(e) => {
                                  const target = {
                                    ...(formData.config?.target_combination ||
                                      {}),
                                  };
                                  target[cat.name_fr] = Number(e.target.value);
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: {
                                      ...prev.config,
                                      target_combination: target,
                                    },
                                  }));
                                }}
                                className="bg-[#1a1a1a] border border-green-500/30 rounded px-2 py-1 text-xs text-white outline-none"
                              >
                                {(cat.options || []).map((_: any, i: number) => (
                                  <option key={i} value={i}>
                                    Option {i + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                {/* MODE : LINEUP */}
                {formData.config?.portrait_mode === "lineup" && (
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-300 font-bold uppercase">
                        Base de Suspects
                      </label>
                      <button
                        onClick={() => {
                          const suspects = [
                            ...(formData.config?.suspects || []),
                          ];
                          suspects.push({
                            id: Date.now().toString(),
                            name_fr: "",
                            name_en: "",
                            image_url: "",
                            is_correct: false,
                          });
                          setFormData((prev: any) => ({
                            ...prev,
                            config: { ...prev.config, suspects },
                          }));
                        }}
                        className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Plus size={10} /> Ajouter Suspect
                      </button>
                    </div>

                    {(formData.config?.suspects || []).map(
                      (suspect: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="bg-black/30 p-3 rounded border border-amber-500/20 space-y-3"
                        >
                          <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
                            <label className="text-[9px] text-green-400 font-bold flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="lineup_correct_suspect"
                                checked={suspect.is_correct}
                                onChange={() => {
                                  const suspects = (
                                    formData.config?.suspects || []
                                  ).map((s: any, i: number) => ({
                                    ...s,
                                    is_correct: i === sIdx,
                                  }));
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, suspects },
                                  }));
                                }}
                                className="accent-green-500"
                              />{" "}
                              ✅ C'est le Coupable
                            </label>
                            <button
                              onClick={() => {
                                const suspects = [
                                  ...(formData.config?.suspects || []),
                                ];
                                suspects.splice(sIdx, 1);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, suspects },
                                }));
                              }}
                              className="text-red-500 p-1 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={suspect.name_fr || ""}
                              onChange={(e) => {
                                const suspects = [
                                  ...(formData.config?.suspects || []),
                                ];
                                suspects[sIdx].name_fr = e.target.value;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, suspects },
                                }));
                              }}
                              placeholder="Nom FR (ex: Homme au chapeau)"
                              className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white w-full"
                            />
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={suspect.name_en || ""}
                                onChange={(e) => {
                                  const suspects = [
                                    ...(formData.config?.suspects || []),
                                  ];
                                  suspects[sIdx].name_en = e.target.value;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, suspects },
                                  }));
                                }}
                                placeholder="Nom EN (ex: Man with hat)"
                                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!suspect.name_fr?.trim()) return;
                                  setIsTranslating(true);
                                  const t = await autoTranslate(
                                    suspect.name_fr,
                                    "fr",
                                  );
                                  const suspects = [
                                    ...(formData.config?.suspects || []),
                                  ];
                                  suspects[sIdx].name_en = t;
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    config: { ...prev.config, suspects },
                                  }));
                                  setIsTranslating(false);
                                }}
                                className="p-1 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0 disabled:opacity-50"
                                disabled={isTranslating}
                              >
                                {isTranslating ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Languages size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                          <MediaUploader
                            label="Photo du suspect"
                            url={suspect.image_url}
                            onUpload={(url) => {
                              const suspects = [
                                ...(formData.config?.suspects || []),
                              ];
                              suspects[sIdx].image_url = url;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, suspects },
                              }));
                            }}
                            icon={<ImagePlus size={10} />}
                          />
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* MODE : REVEAL */}
                {formData.config?.portrait_mode === "reveal" && (
                  <div className="border-t border-white/10 pt-4 space-y-4">
                    <MediaUploader
                      label="Image originale (la preuve à trouver)"
                      url={formData.config?.reveal_image_url}
                      onUpload={(url) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, reveal_image_url: url },
                        }))
                      }
                      icon={<ImagePlus size={12} />}
                    />
                    <div className="bg-black/30 p-4 rounded border border-amber-500/20 space-y-4">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">
                        Réglages Cibles (que le joueur doit trouver)
                      </p>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] text-gray-300">
                            Niveau de Flou (0 = net, 10 = max)
                          </label>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {formData.config?.target_blur || 0} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={formData.config?.target_blur || 0}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                target_blur: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] text-gray-300">
                            Contraste (100 = normal)
                          </label>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {formData.config?.target_contrast ?? 100} %
                          </span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          step="5"
                          value={formData.config?.target_contrast ?? 100}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                target_contrast: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] text-gray-300">
                            Luminosité (100 = normal)
                          </label>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {formData.config?.target_brightness ?? 100} %
                          </span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          step="5"
                          value={formData.config?.target_brightness ?? 100}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                target_brightness: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CHEMICAL */}
            {formData.type === "chemical" && (
              <div className="space-y-4">
                <MediaUploader
                  label="Courbe de référence"
                  url={formData.config?.reference_image_url}
                  onUpload={(url) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      config: { ...prev.config, reference_image_url: url },
                    }))
                  }
                  icon={<ImagePlus size={12} />}
                />
                <div>
                  <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                    Seuil de similarité (%)
                  </label>
                  <input
                    type="number"
                    value={formData.config?.similarity_threshold || 85}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          similarity_threshold: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-300 font-bold uppercase">
                      Échantillons
                    </label>
                    <button
                      onClick={() => {
                        const samples = [...(formData.config?.samples || [])];
                        samples.push({
                          name_fr: "",
                          name_en: "",
                          image_url: "",
                          is_correct: false,
                        });
                        setFormData((prev: any) => ({
                          ...prev,
                          config: { ...prev.config, samples },
                        }));
                      }}
                      className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded"
                    >
                      <Plus size={10} /> Échantillon
                    </button>
                  </div>
                  {(formData.config?.samples || []).map(
                    (sample: any, sIdx: number) => (
                      <div
                        key={sIdx}
                        className="bg-black/30 p-3 rounded border border-amber-500/20 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] text-green-400 flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sample.is_correct}
                              onChange={(e) => {
                                const samples = [
                                  ...(formData.config?.samples || []),
                                ];
                                samples[sIdx].is_correct = e.target.checked;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, samples },
                                }));
                              }}
                              className="accent-green-500"
                            />{" "}
                            Correcte
                          </label>
                          <button
                            onClick={() => {
                              const samples = [
                                ...(formData.config?.samples || []),
                              ];
                              samples.splice(sIdx, 1);
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, samples },
                              }));
                            }}
                            className="text-red-500 p-1"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={sample.name_fr || ""}
                            onChange={(e) => {
                              const samples = [
                                ...(formData.config?.samples || []),
                              ];
                              samples[sIdx].name_fr = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                config: { ...prev.config, samples },
                              }));
                            }}
                            placeholder="Nom FR"
                            className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white w-full"
                          />
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={sample.name_en || ""}
                              onChange={(e) => {
                                const samples = [
                                  ...(formData.config?.samples || []),
                                ];
                                samples[sIdx].name_en = e.target.value;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, samples },
                                }));
                              }}
                              placeholder="Nom EN"
                              className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!sample.name_fr?.trim()) return;
                                setIsTranslating(true);
                                const t = await autoTranslate(
                                  sample.name_fr,
                                  "fr",
                                );
                                const samples = [
                                  ...(formData.config?.samples || []),
                                ];
                                samples[sIdx].name_en = t;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  config: { ...prev.config, samples },
                                }));
                                setIsTranslating(false);
                              }}
                              className="p-1 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0 disabled:opacity-50"
                              disabled={isTranslating}
                            >
                              {isTranslating ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Languages size={10} />
                              )}
                            </button>
                          </div>
                        </div>
                        <MediaUploader
                          label="Image Échantillon"
                          url={sample.image_url}
                          onUpload={(url) => {
                            const samples = [
                              ...(formData.config?.samples || []),
                            ];
                            samples[sIdx].image_url = url;
                            setFormData((prev: any) => ({
                              ...prev,
                              config: { ...prev.config, samples },
                            }));
                          }}
                          icon={<ImagePlus size={10} />}
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ANCRAGE (SCOPE) */}
      <div className="border border-purple-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("scope")}
          className="w-full flex items-center justify-between p-3 bg-purple-500/10 hover:bg-purple-500/20"
        >
          <span className="text-xs font-bold text-purple-400 uppercase">
            📍 Ancrage (Chapitre / Scène)
          </span>
          {expandedSections.scope ? (
            <ChevronUp size={16} className="text-purple-400" />
          ) : (
            <ChevronDown size={16} className="text-purple-400" />
          )}
        </button>
        {expandedSections.scope && (
          <div className="p-4 space-y-4 bg-purple-950/10">
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Chapitre
              </label>
              <select
                value={formData.chapter_id}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    chapter_id: e.target.value,
                    scene_id: null,
                  }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="">— Sélectionner —</option>
                {chapters.map((chap: any) => (
                  <option key={chap.id} value={chap.id}>
                    {chap.title_fr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Scène (optionnel, conseillé pour contextualisation)
              </label>
              <select
                value={formData.scene_id || ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    scene_id: e.target.value || null,
                  }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="">— Tout le chapitre —</option>
                {getScenesForChapter(formData.chapter_id).map(
                  (scene: any, idx: number) => (
                    <option key={scene.id} value={scene.id}>
                      Scène {idx + 1} — {scene.title_fr}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ECONOMIE */}
      <div className="border border-[#D4AF37]/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("economy")}
          className="w-full flex items-center justify-between p-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20"
        >
          <span className="text-xs font-bold text-[#D4AF37] uppercase flex items-center gap-1">
            <DollarSign size={14} /> Économie Cauris
          </span>
          {expandedSections.economy ? (
            <ChevronUp size={16} className="text-[#D4AF37]" />
          ) : (
            <ChevronDown size={16} className="text-[#D4AF37]" />
          )}
        </button>
        {expandedSections.economy && (
          <div className="p-4 space-y-4 bg-[#D4AF37]/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                  Récompense totale
                </label>
                <input
                  type="number"
                  value={formData.reward_cauris}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      reward_cauris: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                  Pénalité par erreur
                </label>
                <input
                  type="number"
                  value={formData.penalty_per_error}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      penalty_per_error: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-[#1a1a1a] border border-[#D4AF37]/50 rounded px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TIMER */}
      <div className="border border-red-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("timer")}
          className="w-full flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20"
        >
          <span className="text-xs font-bold text-red-400 uppercase flex items-center gap-1">
            <Clock size={14} /> Timer
          </span>
          {expandedSections.timer ? (
            <ChevronUp size={16} className="text-red-400" />
          ) : (
            <ChevronDown size={16} className="text-red-400" />
          )}
        </button>
        {expandedSections.timer && (
          <div className="p-4 space-y-4 bg-red-950/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                  Durée (secondes)
                </label>
                <input
                  type="number"
                  value={formData.timer_seconds}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      timer_seconds: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TENTATIVES */}
      <div className="border border-orange-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("attempts")}
          className="w-full flex items-center justify-between p-3 bg-orange-500/10 hover:bg-orange-500/20"
        >
          <span className="text-xs font-bold text-orange-400 uppercase flex items-center gap-1">
            <AlertTriangle size={14} /> Tentatives
          </span>
          {expandedSections.attempts ? (
            <ChevronUp size={16} className="text-orange-400" />
          ) : (
            <ChevronDown size={16} className="text-orange-400" />
          )}
        </button>
        {expandedSections.attempts && (
          <div className="p-4 space-y-4 bg-orange-950/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-300 font-bold uppercase mb-1 block">
                  Nombre max (0 = illimité)
                </label>
                <input
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      max_attempts: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DÉCLENCHEMENTS / ÉVÉNEMENTS NARRATIFS */}
      <div className="border border-purple-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("triggers")}
          className="w-full flex items-center justify-between p-3 bg-purple-500/10 hover:bg-purple-500/20"
        >
          <span className="text-xs font-bold text-purple-400 uppercase flex items-center gap-1">
            <Zap size={14} /> Événements Narratifs
          </span>
          {expandedSections.triggers ? (
            <ChevronUp size={16} className="text-purple-400" />
          ) : (
            <ChevronDown size={16} className="text-purple-400" />
          )}
        </button>
        {expandedSections.triggers && (
          <div className="p-4 space-y-4 bg-purple-950/10">
            <div className="bg-green-900/10 p-3 rounded border border-green-500/20 space-y-3">
              <h4 className="text-[10px] text-green-400 font-bold uppercase">
                ✅ Si succès
              </h4>
              <select
                value={formData.trigger_event_on_success_id || ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    trigger_event_on_success_id: e.target.value || null,
                  }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">— Aucun événement —</option>
                {(outroConfig?.narrative_events || []).map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <select
                  value={formData.success_target_scene_id || ""}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      success_target_scene_id: e.target.value || null,
                    }))
                  }
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">— Aller à une scène —</option>
                  {chapters.map((chap: any) => (
                    <optgroup key={chap.id} label={chap.title_fr}>
                      {(chap.scenes || []).map((s: any, i: number) => (
                        <option key={s.id} value={s.id}>
                          Scène {i + 1}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select
                  value={formData.success_target_chapter_id || ""}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      success_target_chapter_id: e.target.value || null,
                    }))
                  }
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">— Ou aller à un chapitre —</option>
                  {chapters.map((chap: any) => (
                    <option key={chap.id} value={chap.id}>
                      {chap.title_fr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-red-900/10 p-3 rounded border border-red-500/20 space-y-3">
              <h4 className="text-[10px] text-red-400 font-bold uppercase">
                ❌ Si échec
              </h4>
              <select
                value={formData.trigger_event_on_failure_id || ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    trigger_event_on_failure_id: e.target.value || null,
                  }))
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">— Aucun événement —</option>
                {(outroConfig?.narrative_events || []).map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* INDICES PAYANTS */}
      <div className="border border-blue-500/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("clues")}
          className="w-full flex items-center justify-between p-3 bg-blue-500/10 hover:bg-blue-500/20"
        >
          <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1">
            <Lightbulb size={14} /> Indices Payants
          </span>
          {expandedSections.clues ? (
            <ChevronUp size={16} className="text-blue-400" />
          ) : (
            <ChevronDown size={16} className="text-blue-400" />
          )}
        </button>
        {expandedSections.clues && (
          <div className="p-4 space-y-3 bg-blue-950/10">
            {(formData.mini_game_clues || []).length === 0 ? (
              <p className="text-[10px] text-gray-600 italic">
                Aucun indice ajouté
              </p>
            ) : (
              <div className="space-y-3">
                {(formData.mini_game_clues || []).map(
                  (clue: any, idx: number) => (
                    <div
                      key={clue.id}
                      className="bg-blue-900/10 p-3 rounded border border-blue-500/20 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-400 font-bold">
                          Indice {idx + 1}
                        </span>
                        <button
                          onClick={() => {
                            setFormData((prev: any) => ({
                              ...prev,
                              mini_game_clues: (
                                prev.mini_game_clues || []
                              ).filter((_: any, i: number) => i !== idx),
                            }));
                          }}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center p-2 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30">
                        <span className="text-[10px] text-[#D4AF37] font-bold">
                          💰 Coût
                        </span>
                        <input
                          type="number"
                          value={clue.reveal_cost_cauris ?? 5}
                          onChange={(e) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              mini_game_clues: (prev.mini_game_clues || []).map(
                                (c: any, i: number) =>
                                  i === idx
                                    ? {
                                      ...c,
                                      reveal_cost_cauris: Number(
                                        e.target.value,
                                      ),
                                    }
                                    : c,
                              ),
                            }));
                          }}
                          className="flex-1 bg-[#1a1a1a] border border-[#D4AF37]/30 rounded px-2 py-1 text-xs text-[#D4AF37] font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={clue.text_fr || ""}
                          onChange={(e) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              mini_game_clues: (prev.mini_game_clues || []).map(
                                (c: any, i: number) =>
                                  i === idx
                                    ? { ...c, text_fr: e.target.value }
                                    : c,
                              ),
                            }));
                          }}
                          placeholder="Ex: Regardez dans le coin en haut à gauche (Optionnel si média)"
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                        />
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={clue.text_en || ""}
                            onChange={(e) => {
                              setFormData((prev: any) => ({
                                ...prev,
                                mini_game_clues: (
                                  prev.mini_game_clues || []
                                ).map((c: any, i: number) =>
                                  i === idx
                                    ? { ...c, text_en: e.target.value }
                                    : c,
                                ),
                              }));
                            }}
                            placeholder="Ex: Look at the top left corner (Optional)"
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!clue.text_fr?.trim()) return;
                              setIsTranslating(true);
                              const t = await autoTranslate(clue.text_fr, "fr");
                              setFormData((prev: any) => ({
                                ...prev,
                                mini_game_clues: (
                                  prev.mini_game_clues || []
                                ).map((c: any, i: number) =>
                                  i === idx ? { ...c, text_en: t } : c,
                                ),
                              }));
                              setIsTranslating(false);
                            }}
                            className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white flex-shrink-0 disabled:opacity-50"
                            disabled={isTranslating}
                          >
                            {isTranslating ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Languages size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                      {/* UPLOAD MEDIA POUR L'INDICE */}
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <MediaUploader
                          label="Média de l'indice (Optionnel - Image, Audio, Vidéo...)"
                          url={clue.media_url}
                          resourceType="auto"
                          onUpload={(url) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              mini_game_clues: (prev.mini_game_clues || []).map(
                                (c: any, i: number) =>
                                  i === idx ? { ...c, media_url: url } : c,
                              ),
                            }));
                          }}
                          icon={<ImagePlus size={10} />}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
            <button
              onClick={() => {
                setFormData((prev: any) => ({
                  ...prev,
                  mini_game_clues: [
                    ...(prev.mini_game_clues || []),
                    {
                      id: Date.now().toString(),
                      text_fr: "",
                      text_en: "",
                      reveal_cost_cauris: 5,
                      clue_order: (prev.mini_game_clues || []).length,
                    },
                  ],
                }));
              }}
              className="w-full py-2 border border-dashed border-blue-500/30 text-blue-400 text-xs font-bold rounded hover:bg-blue-500/10"
            >
              + Ajouter un indice
            </button>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 pt-4 border-t border-white/10">
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
        >
          Annuler
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Eye size={12} /> Aperçu
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}{" "}
          Sauvegarder
        </button>
      </div>

      {/* MINI GAME PREVIEW MODAL */}
      <MiniGamePreview
        miniGame={{
          ...formData,
          id: miniGameId || "preview-" + Date.now(),
        }}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        lang={previewLang}
      />
    </div>
  );
}
