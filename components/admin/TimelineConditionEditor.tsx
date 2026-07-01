// components/admin/TimelineConditionEditor.tsx
"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
  Languages,
  Loader2,
  Zap,
  Gift,
} from "lucide-react";
import { autoTranslate } from "@/lib/lingua";

interface TimelineAction {
  id: string;
  actionType:
    | "navigate_scene"
    | "navigate_chapter"
    | "reveal_hotspot"
    | "trigger_event"
    | "reward";
  targetId?: string;
  rewardData?: any;
  description_fr: string;
  description_en: string;
}

interface TimelineCondition {
  id: string;
  type: "success" | "failure" | "partial";
  actions: TimelineAction[];
}

interface Props {
  slot: any;
  onUpdateSlot: (updatedSlot: any) => void;
  scenes: any[];
  chapters: any[];
  outroConfig: any;
  wordSearches: any[];
  allEnigmas: any[];
  lang: "fr" | "en";
  evidences: any[];
  sceneHotspots: any[];
}

const CONDITION_TYPES = [
  { id: "success", label: "✅ Succès (bonne preuve)", color: "green" },
  { id: "failure", label: "❌ Échec (mauvaise preuve)", color: "red" },
  { id: "partial", label: "⚠️ Partiel (preuve vague)", color: "yellow" },
];

const ACTION_TYPES = [
  { id: "navigate_scene", label: "🗺️ Aller vers une scène", icon: "🗺️" },
  {
    id: "navigate_chapter",
    label: "📖 Aller vers un chapitre",
    icon: "📖",
  },
  {
    id: "reveal_hotspot",
    label: "👁️ Révéler un hotspot",
    icon: "👁️",
  },
  {
    id: "trigger_event",
    label: "🎬 Déclencher un événement",
    icon: "🎬",
  },
  { id: "reward", label: "🎁 Ajouter une récompense", icon: "🎁" },
];

const REWARD_TYPES = [
  { value: "scene", label: "🗺️ Scène panoramique" },
  { value: "hotspot", label: "📍 Hotspot" },
  { value: "enigma", label: "🧩 Énigme" },
  { value: "evidence", label: "📄 Preuve" },
  { value: "clue", label: "💡 Indice" },
  { value: "chapter", label: "📖 Chapitre" },
  { value: "narrative_event", label: "🎬 Événement narratif" },
];

function ActionForm({
  action,
  onUpdate,
  onDelete,
  scenes,
  chapters,
  outroConfig,
  sceneHotspots,
  allEnigmas,
  evidences,
  lang,
  isTranslating,
  setIsTranslating,
}: any) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTranslate = async (frText: string, field: string) => {
    if (!frText.trim()) return;
    setIsTranslating(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      onUpdate({ ...action, [field]: translated });
    } catch (err) {
      console.error("Translation error:", err);
    }
    setIsTranslating(false);
  };

  const getActionLabel = () => {
    const actionType = ACTION_TYPES.find((a) => a.id === action.actionType);
    return actionType ? actionType.label : "Action inconnue";
  };

  const getTargetLabel = () => {
    switch (action.actionType) {
      case "navigate_scene":
        const scene = scenes.find((s) => s.id === action.targetId);
        return scene ? `Vers: ${scene.title_fr}` : "— Non configuré —";
      case "navigate_chapter":
        const chapter = chapters.find((c) => c.id === action.targetId);
        return chapter ? `Vers: ${chapter.title_fr}` : "— Non configuré —";
      case "reveal_hotspot":
        const hotspot = sceneHotspots.find((h) => h.id === action.targetId);
        return hotspot ? `Révéler: ${hotspot.label_fr}` : "— Non configuré —";
      case "trigger_event":
        const event = outroConfig?.narrative_events?.find(
          (e: any) => e.id === action.targetId
        );
        return event ? `Déclencher: ${event.name}` : "— Non configuré —";
      case "reward":
        const rewardType = REWARD_TYPES.find(
          (r) => r.value === action.rewardData?.type
        );
        return rewardType ? `Récompense: ${rewardType.label}` : "— Non configuré —";
      default:
        return "";
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">
            {ACTION_TYPES.find((a) => a.id === action.actionType)?.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{getActionLabel()}</p>
            <p className="text-[10px] text-gray-500 truncate">{getTargetLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
          >
            <Trash2 size={14} />
          </button>
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-500" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Contenu */}
      {isExpanded && (
        <div className="p-3 border-t border-white/10 space-y-3">
          {/* Type d'action */}
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
              Type d'action
            </label>
            <select
              value={action.actionType}
              onChange={(e) =>
                onUpdate({ ...action, actionType: e.target.value, targetId: undefined })
              }
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cible selon le type d'action */}
          {action.actionType === "navigate_scene" && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Scène destination
              </label>
              <select
                value={action.targetId || ""}
                onChange={(e) =>
                  onUpdate({ ...action, targetId: e.target.value || undefined })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="">— Sélectionner —</option>
                {scenes.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Scène {idx + 1} — {s.title_fr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action.actionType === "navigate_chapter" && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Chapitre destination
              </label>
              <select
                value={action.targetId || ""}
                onChange={(e) =>
                  onUpdate({ ...action, targetId: e.target.value || undefined })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="">— Sélectionner —</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title_fr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action.actionType === "reveal_hotspot" && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Hotspot à révéler
              </label>
              <select
                value={action.targetId || ""}
                onChange={(e) =>
                  onUpdate({ ...action, targetId: e.target.value || undefined })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="">— Sélectionner —</option>
                {sceneHotspots.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.icon} {h.label_fr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action.actionType === "trigger_event" && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                Événement à déclencher
              </label>
              <select
                value={action.targetId || ""}
                onChange={(e) =>
                  onUpdate({ ...action, targetId: e.target.value || undefined })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="">— Sélectionner —</option>
                {(outroConfig?.narrative_events || []).map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name || `Événement ${ev.id.slice(0, 4)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action.actionType === "reward" && (
            <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <label className="text-[10px] text-gray-500 font-bold uppercase block">
                Type de récompense
              </label>
              <select
                value={action.rewardData?.type || ""}
                onChange={(e) =>
                  onUpdate({
                    ...action,
                    rewardData: { ...action.rewardData, type: e.target.value },
                  })
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="">— Sélectionner —</option>
                {REWARD_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              {action.rewardData?.type && (
                <div className="mt-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                    Cible de la récompense
                  </label>
                  {action.rewardData.type === "scene" && (
                    <select
                      value={action.rewardData.target_id || ""}
                      onChange={(e) =>
                        onUpdate({
                          ...action,
                          rewardData: {
                            ...action.rewardData,
                            target_id: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">— Sélectionner —</option>
                      {scenes.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          Scène {idx + 1}
                        </option>
                      ))}
                    </select>
                  )}
                  {action.rewardData.type === "chapter" && (
                    <select
                      value={action.rewardData.target_id || ""}
                      onChange={(e) =>
                        onUpdate({
                          ...action,
                          rewardData: {
                            ...action.rewardData,
                            target_id: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">— Sélectionner —</option>
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title_fr}
                        </option>
                      ))}
                    </select>
                  )}
                  {action.rewardData.type === "enigma" && (
                    <select
                      value={action.rewardData.target_id || ""}
                      onChange={(e) =>
                        onUpdate({
                          ...action,
                          rewardData: {
                            ...action.rewardData,
                            target_id: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">— Sélectionner —</option>
                      {allEnigmas.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.question_fr}
                        </option>
                      ))}
                    </select>
                  )}
                  {action.rewardData.type === "evidence" && (
                    <select
                      value={action.rewardData.target_id || ""}
                      onChange={(e) =>
                        onUpdate({
                          ...action,
                          rewardData: {
                            ...action.rewardData,
                            target_id: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">— Sélectionner —</option>
                      {evidences.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name_fr}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Notification */}
              <div className="mt-2 space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase block">
                  Notification (FR)
                </label>
                <input
                  type="text"
                  value={action.rewardData?.notif_fr || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...action,
                      rewardData: {
                        ...action.rewardData,
                        notif_fr: e.target.value,
                      },
                    })
                  }
                  placeholder="Ex: Un secret révélé..."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase block">
                  Notification (EN)
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={action.rewardData?.notif_en || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...action,
                        rewardData: {
                          ...action.rewardData,
                          notif_en: e.target.value,
                        },
                      })
                    }
                    placeholder="Ex: A secret revealed..."
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    onClick={() =>
                      handleTranslate(action.rewardData?.notif_fr || "", "rewardData")
                    }
                    disabled={isTranslating}
                    className="p-1.5 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50"
                  >
                    {isTranslating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Languages size={12} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description FR/EN */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase block">
              Description (FR)
            </label>
            <textarea
              rows={2}
              value={action.description_fr}
              onChange={(e) =>
                onUpdate({ ...action, description_fr: e.target.value })
              }
              placeholder="Description de cette action..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase block">
              Description (EN)
            </label>
            <div className="flex gap-1">
              <textarea
                rows={2}
                value={action.description_en}
                onChange={(e) =>
                  onUpdate({ ...action, description_en: e.target.value })
                }
                placeholder="Description of this action..."
                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none outline-none focus:border-blue-500"
              />
              <button
                onClick={() =>
                  handleTranslate(action.description_fr, "description_en")
                }
                disabled={isTranslating}
                className="p-1.5 bg-white/5 rounded hover:bg-white/10 mt-1 flex-shrink-0 disabled:opacity-50"
              >
                {isTranslating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Languages size={12} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelineConditionEditor({
  slot,
  onUpdateSlot,
  scenes,
  chapters,
  outroConfig,
  wordSearches,
  allEnigmas,
  lang,
  evidences,
  sceneHotspots,
}: Props) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);

  const conditions: TimelineCondition[] = slot.conditions || [];

  const addCondition = (type: "success" | "failure" | "partial") => {
    const newCondition: TimelineCondition = {
      id: uuidv4(),
      type,
      actions: [],
    };
    onUpdateSlot({
      ...slot,
      conditions: [...conditions, newCondition],
    });
  };

  const updateCondition = (conditionId: string, updates: any) => {
    onUpdateSlot({
      ...slot,
      conditions: conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  const deleteCondition = (conditionId: string) => {
    onUpdateSlot({
      ...slot,
      conditions: conditions.filter((c) => c.id !== conditionId),
    });
  };

  const addAction = (conditionId: string) => {
    const newAction: TimelineAction = {
      id: uuidv4(),
      actionType: "navigate_scene",
      description_fr: "Nouvelle action",
      description_en: "New action",
    };
    updateCondition(conditionId, {
      actions: [
        ...(conditions.find((c) => c.id === conditionId)?.actions || []),
        newAction,
      ],
    });
  };

  const updateAction = (conditionId: string, actionId: string, updates: any) => {
    updateCondition(conditionId, {
      actions: (conditions.find((c) => c.id === conditionId)?.actions || []).map(
        (a) => (a.id === actionId ? { ...a, ...updates } : a)
      ),
    });
  };

  const deleteAction = (conditionId: string, actionId: string) => {
    updateCondition(conditionId, {
      actions: (conditions.find((c) => c.id === conditionId)?.actions || []).filter(
        (a) => a.id !== actionId
      ),
    });
  };

  return (
    <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-purple-500/20">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
          <Zap size={16} /> Actions Conditionnelles (Si-Alors)
        </h4>
        <div className="text-[10px] text-gray-500">
          {conditions.length} condition(s)
        </div>
      </div>

      {conditions.length === 0 && (
        <p className="text-[10px] text-gray-600 italic">
          Aucune condition configurée. Le slot aura un comportement par défaut.
        </p>
      )}

      {conditions.map((condition) => {
        const conditionCfg = CONDITION_TYPES.find((c) => c.id === condition.type);
        const isExpanded = expandedCondition === condition.id;

        return (
          <div
            key={condition.id}
            className={`border rounded-lg overflow-hidden ${
              conditionCfg?.color === "green"
                ? "border-green-500/30 bg-green-900/10"
                : conditionCfg?.color === "red"
                  ? "border-red-500/30 bg-red-900/10"
                  : "border-yellow-500/30 bg-yellow-900/10"
            }`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
              onClick={() =>
                setExpandedCondition(isExpanded ? null : condition.id)
              }
            >
              <div className="flex items-center gap-2 flex-1">
                <span
                  className={`text-sm font-bold ${
                    conditionCfg?.color === "green"
                      ? "text-green-400"
                      : conditionCfg?.color === "red"
                        ? "text-red-400"
                        : "text-yellow-400"
                  }`}
                >
                  {conditionCfg?.label}
                </span>
                <span className="text-[10px] text-gray-500">
                  ({condition.actions.length} action{condition.actions.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCondition(condition.id);
                  }}
                  className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                >
                  <Trash2 size={14} />
                </button>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-gray-500" />
                ) : (
                  <ChevronDown size={14} className="text-gray-500" />
                )}
              </div>
            </div>

            {/* Contenu */}
            {isExpanded && (
              <div className="p-3 border-t border-white/20 space-y-3">
                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">
                      Alors, faire :
                    </span>
                    <button
                      onClick={() => addAction(condition.id)}
                      className="text-[10px] text-purple-400 font-bold flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded hover:bg-purple-500/20"
                    >
                      <Plus size={10} /> Ajouter une action
                    </button>
                  </div>

                  {condition.actions.length === 0 && (
                    <p className="text-[10px] text-gray-600 italic py-2">
                      Aucune action. Ajoutez-en une pour définir les conséquences.
                    </p>
                  )}

                  <div className="space-y-2">
                    {condition.actions.map((action) => (
                      <ActionForm
                        key={action.id}
                        action={action}
                        onUpdate={(updated) =>
                          updateAction(condition.id, action.id, updated)
                        }
                        onDelete={() => deleteAction(condition.id, action.id)}
                        scenes={scenes}
                        chapters={chapters}
                        outroConfig={outroConfig}
                        sceneHotspots={sceneHotspots}
                        allEnigmas={allEnigmas}
                        evidences={evidences}
                        lang={lang}
                        isTranslating={isTranslating}
                        setIsTranslating={setIsTranslating}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Boutons pour ajouter les conditions manquantes */}
      <div className="flex flex-wrap gap-2 pt-2">
        {CONDITION_TYPES.map((condType) => {
          const exists = conditions.some((c) => c.type === condType.id);
          return (
            !exists && (
              <button
                key={condType.id}
                onClick={() => addCondition(condType.id as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${
                  condType.color === "green"
                    ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                    : condType.color === "red"
                      ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                }`}
              >
                <Plus size={12} className="inline mr-1" /> Ajouter {condType.label}
              </button>
            )
          );
        })}
      </div>
    </div>
  );
}