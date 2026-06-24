// components/admin/InvestigationCharacters.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import { 
  PlusCircle, Trash2, Users, MessageSquare, 
  ImagePlus, X, Loader2, Languages
} from "lucide-react";

export default function InvestigationCharacters({
  investigationId,
  evidences,
  showMsg
}: {
  investigationId: string;
  evidences: any[];
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChar, setExpandedChar] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [investigationId]);

  async function fetchCharacters() {
    setIsLoading(true);
    // Note: on s'assure de récupérer role_en de la BDD (il faudra peut-être l'ajouter en SQL si ce n'est pas fait)
    const { data } = await supabase
      .from("investigation_characters")
      .select("*, topics:character_topics(*)")
      .eq("investigation_id", investigationId)
      .order("created_at", { ascending: true });
    
    const sortedData = (data || []).map(char => ({
      ...char,
      topics: (char.topics || []).sort((a: any, b: any) => a.topic_order - b.topic_order)
    }));
    
    setCharacters(sortedData);
    setIsLoading(false);
  }

  const addCharacter = async () => {
    const { data } = await supabase.from("investigation_characters").insert({
      investigation_id: investigationId,
      name_fr: "Nouveau Personnage",
      role: "👁️ Témoin"
    }).select().single();
    if (data) {
      setExpandedChar(data.id);
      fetchCharacters();
    }
  };

  const addTopic = async (characterId: string, currentLength: number) => {
    await supabase.from("character_topics").insert({
      character_id: characterId,
      question_fr: "Question du joueur ?",
      answer_fr: "Réponse du personnage.",
      topic_order: currentLength + 1
    });
    fetchCharacters();
  };

  const updateCharacter = async (id: string, field: string, value: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    await supabase.from("investigation_characters").update({ [field]: value }).eq("id", id);
  };

  const updateTopic = async (charId: string, topicId: string, field: string, value: string | null) => {
    setCharacters(prev => prev.map(c => c.id === charId ? {
      ...c, topics: c.topics.map((t: any) => t.id === topicId ? { ...t, [field]: value } : t)
    } : c));
    await supabase.from("character_topics").update({ [field]: value }).eq("id", topicId);
  };

  const deleteCharacter = async (id: string) => {
    if (!confirm("Supprimer ce personnage et tous ses dialogues ?")) return;
    await supabase.from("investigation_characters").delete().eq("id", id);
    fetchCharacters();
  };

  const deleteTopic = async (id: string) => {
    if (!confirm("Supprimer ce dialogue ?")) return;
    await supabase.from("character_topics").delete().eq("id", id);
    fetchCharacters();
  };

  const openCloudinary = (charId: string) => {
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
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paramsToSign }),
              });
              const { signature } = await res.json();
              callback(signature);
            } catch (err) { console.error("Erreur de signature", err); }
          },
          sources: ["local", "url", "camera", "image_search"],
          resourceType: "image",
          folder: "lukeni/characters",
          cropping: true,
          croppingAspectRatio: 1,
        },
        (error: any, result: any) => {
          setIsUploading(false);
          if (result?.event === "success") {
            updateCharacter(charId, "avatar_url", result.info.secure_url);
            showMsg("success", "Portrait ajouté avec succès !");
          }
        }
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

  const translateField = async (id: string, frText: string, field: string, type: 'character' | 'topic', charId?: string) => {
    if (!frText.trim()) return;
    setIsProcessing(id + field);
    try {
      const translated = await autoTranslate(frText, "fr");
      if (type === 'character') {
        updateCharacter(id, field, translated);
      } else if (type === 'topic' && charId) {
        updateTopic(charId, id, field, translated);
      }
    } catch {
      showMsg("error", "Erreur de traduction");
    }
    setIsProcessing(null);
  };

  if (isLoading) return <div className="text-center py-4"><Loader2 className="animate-spin text-blue-500 mx-auto" /></div>;

  return (
    <div className="bg-blue-950/10 p-4 sm:p-6 rounded-xl border border-blue-500/20 space-y-4">
      <div className="flex justify-between items-center border-b border-blue-500/20 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users size={18} className="text-blue-400" />
          Personnages & Interrogatoires (PNJ)
        </h3>
        <button onClick={addCharacter} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-500 font-bold">
          <PlusCircle size={14} /> Ajouter un Personnage
        </button>
      </div>

      <div className="space-y-4">
        {characters.map((char) => {
          const isExpanded = expandedChar === char.id;
          return (
            <div key={char.id} className="bg-[#0a0a0a] rounded-xl border border-white/10 shadow-lg overflow-hidden">
              {/* HEADER PERSONNAGE */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedChar(isExpanded ? null : char.id)}
              >
                <div className="flex items-center gap-3">
                  {char.avatar_url ? (
                    <img src={char.avatar_url} className="w-10 h-10 rounded-full object-cover border border-white/20" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Users size={16} className="text-blue-400" /></div>
                  )}
                  <div>
                    <p className="text-blue-400 font-bold text-sm">{char.name_fr || "Sans nom"}</p>
                    <p className="text-gray-500 text-[10px] uppercase">{char.role} • {(char.topics || []).length} dialogue(s)</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
              </div>

              {/* CONTENU PERSONNAGE */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-white/5 space-y-6">
                  
                  {/* Identité */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-1 space-y-2">
                      <button 
                        onClick={() => openCloudinary(char.id)} 
                        disabled={isUploading}
                        className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-white/10 text-gray-300 disabled:opacity-50"
                      >
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14}/>} 
                        {char.avatar_url ? "Changer Portrait" : "Uploader Portrait"}
                      </button>
                    </div>

                    <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Noms */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Nom (FR)</label>
                          <input type="text" value={char.name_fr} onChange={e => updateCharacter(char.id, "name_fr", e.target.value)} className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Nom (EN)</label>
                          <div className="flex gap-2">
                            <input type="text" value={char.name_en || ""} onChange={e => updateCharacter(char.id, "name_en", e.target.value)} className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                            <button onClick={() => translateField(char.id, char.name_fr, "name_en", 'character')} className="p-2 bg-white/5 rounded text-gray-400 hover:text-white">
                              {isProcessing === char.id+"name_en" ? <Loader2 size={14} className="animate-spin"/> : <Languages size={14}/>}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Rôles (NOUVEAU) */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Rôle (FR)</label>
                          <input type="text" value={char.role || ""} onChange={e => updateCharacter(char.id, "role", e.target.value)} placeholder="Ex: 👑 Roi, ⚔️ Garde" className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Rôle (EN)</label>
                          <div className="flex gap-2">
                            <input type="text" value={char.role_en || ""} onChange={e => updateCharacter(char.id, "role_en", e.target.value)} placeholder="Ex: 👑 King, ⚔️ Guard" className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                            <button onClick={() => translateField(char.id, char.role || "", "role_en", 'character')} className="p-2 bg-white/5 rounded text-gray-400 hover:text-white">
                              {isProcessing === char.id+"role_en" ? <Loader2 size={14} className="animate-spin"/> : <Languages size={14}/>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arbre de Dialogues */}
                  <div className="border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                        <MessageSquare size={12} className="text-blue-400"/> Choix de Dialogues Scriptés
                      </label>
                      <button onClick={() => addTopic(char.id, char.topics?.length || 0)} className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded font-bold hover:bg-blue-500/20">
                        + Ajouter une question
                      </button>
                    </div>

                    <div className="space-y-4">
                      {char.topics?.map((topic: any) => (
                        <div key={topic.id} className="bg-[#1a1a1a] p-4 rounded-lg border border-white/10 relative">
                          <button onClick={() => deleteTopic(topic.id)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500 p-1"><X size={14}/></button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Question */}
                            <div className="space-y-2">
                              <label className="text-[10px] text-gray-500 font-bold uppercase">1. Ce que dit le Joueur (FR)</label>
                              <input type="text" value={topic.question_fr} onChange={e => updateTopic(char.id, topic.id, "question_fr", e.target.value)} className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                              
                              <div className="flex gap-2">
                                <input type="text" value={topic.question_en || ""} onChange={e => updateTopic(char.id, topic.id, "question_en", e.target.value)} placeholder="Player question (EN)" className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                                <button onClick={() => translateField(topic.id, topic.question_fr, "question_en", 'topic', char.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:text-white">
                                  {isProcessing === topic.id+"question_en" ? <Loader2 size={14} className="animate-spin"/> : <Languages size={14}/>}
                                </button>
                              </div>
                            </div>
                            
                            {/* Réponse */}
                            <div className="space-y-2">
                              <label className="text-[10px] text-blue-400 font-bold uppercase">2. La réponse du PNJ (FR)</label>
                              <textarea rows={2} value={topic.answer_fr} onChange={e => updateTopic(char.id, topic.id, "answer_fr", e.target.value)} className="w-full bg-[#111] border border-blue-500/30 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500" />
                              
                              <div className="flex gap-2">
                                <textarea rows={2} value={topic.answer_en || ""} onChange={e => updateTopic(char.id, topic.id, "answer_en", e.target.value)} placeholder="NPC answer (EN)" className="flex-1 bg-[#111] border border-blue-500/30 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500" />
                                <button onClick={() => translateField(topic.id, topic.answer_fr, "answer_en", 'topic', char.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:text-white h-fit mt-1">
                                  {isProcessing === topic.id+"answer_en" ? <Loader2 size={14} className="animate-spin"/> : <Languages size={14}/>}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Conditions & Récompenses */}
                          <div className="flex flex-col sm:flex-row gap-4 p-3 bg-black/40 rounded border border-dashed border-white/10">
                            <div className="flex-1">
                              <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">🔒 Débloqué si le joueur possède :</label>
                              <select value={topic.required_evidence_id || ""} onChange={e => updateTopic(char.id, topic.id, "required_evidence_id", e.target.value || null)} className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                <option value="">-- Toujours visible --</option>
                                {evidences.map(ev => <option key={ev.id} value={ev.id}>Indice : {ev.name_fr || 'Sans nom'}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-green-500 uppercase font-bold mb-1 block">🎁 Donner un indice après la réponse :</label>
                              <select value={topic.unlocks_evidence_id || ""} onChange={e => updateTopic(char.id, topic.id, "unlocks_evidence_id", e.target.value || null)} className="w-full bg-[#111] border border-green-500/30 rounded px-2 py-1.5 text-xs text-green-400 outline-none">
                                <option value="">-- Aucun --</option>
                                {evidences.map(ev => <option key={ev.id} value={ev.id}>Donner : {ev.name_fr || 'Sans nom'}</option>)}
                              </select>
                            </div>
                          </div>

                        </div>
                      ))}
                      {char.topics?.length === 0 && <p className="text-xs text-gray-600 italic">Aucune ligne de dialogue ajoutée.</p>}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}