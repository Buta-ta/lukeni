"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import MiniGameEditor from "./MiniGameEditor";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Loader2,
} from "lucide-react";

interface Props {
  investigationId: string;
  chapters: any[];
  outroConfig: any;
  allInstructions: any[];
  showMsg: (type: "success" | "error", text: string) => void;
}

export default function MiniGameListAdmin({
  investigationId,
  chapters,
  outroConfig,
  allInstructions,
  showMsg,
}: Props) {
  const [miniGames, setMiniGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("investigation_mini_games")
        .select("*")
        .eq("investigation_id", investigationId)
        .order("created_at", { ascending: false });

      if (isMounted) {
        if (error) {
          console.error("Load mini games error:", error);
        } else {
          setMiniGames(data || []);
        }
        setIsLoading(false);
      }
    };

    if (investigationId) load();
    
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigationId]);

  const handleAdd = () => {
    setEditingId("new");
  };

  const handleEdit = (mg: any) => {
    setEditingId(mg.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce mini-jeu ?")) return;
    const { error } = await supabase
      .from("investigation_mini_games")
      .delete()
      .eq("id", id);
    if (error) {
      showMsg("error", `Erreur: ${error.message}`);
    } else {
      setMiniGames((prev) => prev.filter((mg) => mg.id !== id));
      showMsg("success", "Mini-jeu supprimé !");
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-purple-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} className="text-purple-400" />
          <span className="text-sm font-bold text-purple-400">Mini-Jeux</span>
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            {miniGames.length}
          </span>
        </div>
        {editingId === null && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-600/40"
          >
            <Plus size={14} /> Nouveau
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30">
          <MiniGameEditor
            investigationId={investigationId}
            miniGameId={editingId === "new" ? undefined : editingId}
            chapters={chapters}
            outroConfig={outroConfig}
            allInstructions={allInstructions}
            showMsg={showMsg}
            onSaved={() => {
              setEditingId(null);
              supabase
                .from("investigation_mini_games")
                .select("*")
                .eq("investigation_id", investigationId)
                .order("created_at", { ascending: false })
                .then(({ data }) => setMiniGames(data || []));
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      <div className="space-y-2">
        {miniGames.length === 0 && editingId === null ? (
          <div className="text-center py-8 border border-dashed border-purple-500/20 rounded-xl">
            <Gamepad2 size={32} className="mx-auto mb-2 text-purple-600" />
            <p className="text-gray-500 text-sm">Aucun mini-jeu créé</p>
            <button
              onClick={handleAdd}
              className="mt-3 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-bold hover:bg-purple-600/40"
            >
              <Plus size={14} className="inline mr-1" /> Créer
            </button>
          </div>
        ) : (
          miniGames.map((mg) => (
            <div
              key={mg.id}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => toggleExpanded(mg.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                      {mg.type.toUpperCase()}
                    </span>
                    <p className="font-bold text-white truncate">
                      {mg.title_fr}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {chapters.find((c) => c.id === mg.chapter_id)?.title_fr}
                    {mg.scene_id && " • Scène spécifique"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(mg);
                    }}
                    className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600/40"
                  >
                    <Edit2 size={12} className="inline mr-1" /> Éditer
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(mg.id);
                    }}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedIds[mg.id] ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </div>
              </div>
              {expandedIds[mg.id] && (
                <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 text-xs text-gray-400 space-y-1">
                  <p><strong>Type :</strong> {mg.type}</p>
                  <p><strong>Récompense :</strong> {mg.reward_cauris} Cauris</p>
                  {mg.timer_seconds > 0 && <p><strong>Timer :</strong> {mg.timer_seconds}s</p>}
                  {mg.max_attempts > 0 && <p><strong>Max essais :</strong> {mg.max_attempts}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}