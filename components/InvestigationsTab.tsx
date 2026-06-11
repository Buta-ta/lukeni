"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2, Search, PlusCircle, Edit2, Trash2, X,
  CheckCircle, ImagePlus, Languages, FileText, Star,
  ListOrdered, Save, FileQuestion, KeyRound, Paperclip
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import DeleteModal from "@/components/admin/shared/DeleteModal";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Investigation {
  id: string; title_fr: string; title_en: string;
  description_fr: string; description_en: string;
  cover_url: string; difficulty: string;
  reward_cauris: number; status: string;
}

interface Chapter {
  id: string; investigation_id: string; step_order: number;
  title_fr: string; title_en: string;
  narrative_fr: string; narrative_en: string;
  question_fr: string; question_en: string;
  expected_answer_fr: string; expected_answer_en: string;
  clue_fr: string; clue_en: string;
}

interface Evidence {
  id: string; chapter_id: string;
  media_url: string; media_type: string;
  caption_fr: string; caption_en: string;
}

export default function InvestigationsTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── States : Enquête (Niveau 1) ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFr, setTitleFr] = useState(""); const [titleEn, setTitleEn] = useState("");
  const [descFr, setDescFr] = useState(""); const [descEn, setDescEn] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [difficulty, setDifficulty] = useState("intermediaire");
  const [reward, setReward] = useState<number>(50);
  const [status, setStatus] = useState("draft");

  // ── States : Chapitres (Niveau 2) ──
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingChapter, setEditingChapter] = useState<Partial<Chapter> | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // ── States : Suppression ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'investigation' | 'chapter' | 'evidence' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchInvestigations(); }, []);

  // ── FETCH DATA ───────────────────────────────────────────────────────────
  async function fetchInvestigations() {
    setIsLoading(true);
    const { data, error } = await supabase.from("investigations").select("*").order("created_at", { ascending: false });
    if (error) showMsg("error", "Erreur de chargement");
    else setInvestigations(data || []);
    setIsLoading(false);
  }

  async function fetchChaptersAndEvidences(invId: string) {
    const { data: chaps } = await supabase.from("investigation_chapters").select("*").eq("investigation_id", invId).order("step_order", { ascending: true });
    setChapters(chaps || []);
    
    if (chaps && chaps.length > 0) {
      const chapIds = chaps.map(c => c.id);
      const { data: evs } = await supabase.from("investigation_evidences").select("*").in("chapter_id", chapIds);
      setEvidences(evs || []);
    } else {
      setEvidences([]);
    }
  }

  // ── FORMULAIRES ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null); setEditingChapter(null);
    setTitleFr(""); setTitleEn(""); setDescFr(""); setDescEn("");
    setCoverUrl(""); setDifficulty("intermediaire"); setReward(50); setStatus("draft");
  };

  const handleEdit = (inv: Investigation) => {
    setEditingId(inv.id);
    setTitleFr(inv.title_fr || ""); setTitleEn(inv.title_en || "");
    setDescFr(inv.description_fr || ""); setDescEn(inv.description_en || "");
    setCoverUrl(inv.cover_url || ""); setDifficulty(inv.difficulty || "intermediaire");
    setReward(inv.reward_cauris || 50); setStatus(inv.status || "draft");
    fetchChaptersAndEvidences(inv.id);
    setEditingChapter(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── CLOUDINARY ───────────────────────────────────────────────────────────
  const openCloudinaryWidget = (target: 'cover' | 'evidence') => {
    setIsUploading(true);
    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ["local", "url"],
        resourceType: "auto",
        multiple: false,
        folder: "lukeni/investigations",
      },
      async (error: any, result: any) => {
        setIsUploading(false);
        if (result?.event === "success") {
          const url = result.info.secure_url;
          if (target === 'cover') {
            setCoverUrl(url);
            showMsg("success", "✅ Couverture uploadée !");
          } else if (target === 'evidence' && editingChapter?.id) {
            // Création directe de la pièce à conviction en BDD
            const { error: evErr } = await supabase.from("investigation_evidences").insert({
              chapter_id: editingChapter.id, media_url: url, media_type: result.info.resource_type === 'video' ? 'audio' : 'image'
            });
            if (!evErr) {
              fetchChaptersAndEvidences(editingId!);
              showMsg("success", "✅ Pièce à conviction ajoutée !");
            }
          }
        }
      }
    );
    widget.open();
  };

  // ── SAVE DOSSIER (NIVEAU 1) ──────────────────────────────────────────────
  const handleSaveInvestigation = async () => {
    if (!titleFr.trim()) return showMsg("error", "Le titre FR est requis.");
    setIsSaving(true);
    const payload = { title_fr: titleFr, title_en: titleEn, description_fr: descFr, description_en: descEn, cover_url: coverUrl, difficulty, reward_cauris: reward, status };
    
    try {
      if (editingId) {
        const { error } = await supabase.from("investigations").update(payload).eq("id", editingId);
        if (error) throw error;
        showMsg("success", "✅ Dossier mis à jour !");
      } else {
        const { data, error } = await supabase.from("investigations").insert(payload).select().single();
        if (error) throw error;
        showMsg("success", "✅ Dossier créé ! Vous pouvez maintenant ajouter des chapitres.");
        handleEdit(data); // Bascule automatiquement en mode édition pour ajouter les chapitres
      }
      fetchInvestigations();
    } catch (err: any) { showMsg("error", err.message); }
    setIsSaving(false);
  };

  // ── SAVE CHAPITRE (NIVEAU 2) ─────────────────────────────────────────────
  const handleSaveChapter = async () => {
    if (!editingChapter?.title_fr || !editingChapter?.narrative_fr) return showMsg("error", "Titre et Narration FR requis.");
    setIsSaving(true);

    const payload = {
      investigation_id: editingId,
      step_order: editingChapter.step_order || chapters.length + 1,
      title_fr: editingChapter.title_fr, title_en: editingChapter.title_en,
      narrative_fr: editingChapter.narrative_fr, narrative_en: editingChapter.narrative_en,
      question_fr: editingChapter.question_fr, question_en: editingChapter.question_en,
      expected_answer_fr: editingChapter.expected_answer_fr?.toLowerCase().trim(),
      expected_answer_en: editingChapter.expected_answer_en?.toLowerCase().trim(),
      clue_fr: editingChapter.clue_fr, clue_en: editingChapter.clue_en
    };

    try {
      if (editingChapter.id) {
        const { error } = await supabase.from("investigation_chapters").update(payload).eq("id", editingChapter.id);
        if (error) throw error; showMsg("success", "✅ Chapitre mis à jour !");
      } else {
        const { error } = await supabase.from("investigation_chapters").insert(payload);
        if (error) throw error; showMsg("success", "✅ Chapitre ajouté !");
      }
      setEditingChapter(null);
      fetchChaptersAndEvidences(editingId!);
    } catch (err: any) { showMsg("error", err.message); }
    setIsSaving(false);
  };

  // ── DELETE ───────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      let table = "investigations";
      if (itemToDelete.type === 'chapter') table = "investigation_chapters";
      if (itemToDelete.type === 'evidence') table = "investigation_evidences";

      const { error } = await supabase.from(table).delete().eq("id", itemToDelete.id);
      if (error) throw error;

      showMsg("success", `✅ Élément supprimé.`);
      if (itemToDelete.type === 'investigation') {
        setInvestigations(prev => prev.filter(i => i.id !== itemToDelete.id));
        if (editingId === itemToDelete.id) resetForm();
      } else {
        fetchChaptersAndEvidences(editingId!);
      }
    } catch (err: any) { showMsg("error", err.message); }
    setDeleteModalOpen(false); setItemToDelete(null); setIsDeleting(false);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={40} /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Search className="text-red-500" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Enquêtes Historiques</h2>
          <p className="text-gray-400 text-xs">Gérer les scénarios, chapitres et pièces à conviction</p>
        </div>
      </div>

      {/* ── NIVEAU 1 : DOSSIER ── */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId ? <Edit2 size={18} className="text-red-500" /> : <PlusCircle size={18} className="text-red-500" />}
            {editingId ? "Paramètres du Dossier" : "Nouveau Dossier d'Enquête"}
          </h3>
          {editingId && <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><X size={14} /> Fermer</button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Titre du dossier (FR) *</label>
            <input type="text" value={titleFr} onChange={(e) => setTitleFr(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Titre du dossier (EN)</label>
            <div className="flex gap-2">
              <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none" />
              <button onClick={async () => setTitleEn(await autoTranslate(titleFr, "fr"))} className="px-3 bg-white/5 rounded-lg text-gray-400 hover:text-white"><Languages size={14}/></button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSaveInvestigation} disabled={isSaving} className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-500">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editingId ? "Sauvegarder le dossier" : "Créer le dossier"}
          </button>
        </div>
      </div>

      {/* ── NIVEAU 2 : SCÉNARIO (CHAPITRES) ── */}
      {editingId && (
        <div className="bg-red-950/10 p-4 md:p-6 rounded-xl border border-red-500/20 space-y-6">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ListOrdered size={18} className="text-red-400" /> Scénario de l'enquête
            </h3>
            {!editingChapter && (
              <button onClick={() => setEditingChapter({ step_order: chapters.length + 1 })} className="flex items-center gap-2 bg-red-600/20 text-red-400 px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-600/40">
                <PlusCircle size={14} /> Ajouter un chapitre
              </button>
            )}
          </div>

          {/* Formulaire de Chapitre */}
          {editingChapter && (
            <div className="bg-[#111] p-5 rounded-lg border border-white/10 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-red-400">Édition du Chapitre {editingChapter.step_order}</span>
                <button onClick={() => setEditingChapter(null)} className="text-gray-500 hover:text-white"><X size={16}/></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Titre de l'étape (FR)</label>
                  <input type="text" value={editingChapter.title_fr || ''} onChange={e => setEditingChapter({...editingChapter, title_fr: e.target.value})} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Titre (EN)</label>
                  <input type="text" value={editingChapter.title_en || ''} onChange={e => setEditingChapter({...editingChapter, title_en: e.target.value})} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><FileText size={12}/> Narration (L'histoire racontée au joueur) - FR</label>
                <textarea rows={4} value={editingChapter.narrative_fr || ''} onChange={e => setEditingChapter({...editingChapter, narrative_fr: e.target.value})} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-lg border border-white/5">
                <div>
                  <label className="block text-xs text-yellow-500 mb-1 flex items-center gap-1"><FileQuestion size={12}/> Énigme / Question posée</label>
                  <input type="text" placeholder="Ex: Quel était le nom de code de l'opération ?" value={editingChapter.question_fr || ''} onChange={e => setEditingChapter({...editingChapter, question_fr: e.target.value})} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white mb-2" />
                  
                  <label className="block text-xs text-green-400 mb-1 flex items-center gap-1"><KeyRound size={12}/> Réponse exacte (FR)</label>
                  <input type="text" placeholder="Ex: barracuda" value={editingChapter.expected_answer_fr || ''} onChange={e => setEditingChapter({...editingChapter, expected_answer_fr: e.target.value})} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-blue-400 mb-1">Indice si le joueur bloque (Optionnel)</label>
                  <textarea rows={4} placeholder="Ex: Lisez attentivement la signature du télégramme..." value={editingChapter.clue_fr || ''} onChange={e => setEditingChapter({...editingChapter, clue_fr: e.target.value})} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white resize-none" />
                </div>
              </div>

              {/* Pièces à conviction */}
              {editingChapter.id && (
                <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-900/10">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs text-blue-400 font-bold flex items-center gap-1"><Paperclip size={12}/> Pièces à conviction liées à ce chapitre</label>
                    <button onClick={() => openCloudinaryWidget('evidence')} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500">
                      + Joindre un document
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {evidences.filter(e => e.chapter_id === editingChapter.id).map(ev => (
                      <div key={ev.id} className="relative w-16 h-16 bg-black rounded border border-white/20 group">
                        <img src={ev.media_url} className="w-full h-full object-cover rounded opacity-80 group-hover:opacity-100" alt=""/>
                        <button onClick={() => { setItemToDelete({ id: ev.id, type: 'evidence' }); setDeleteModalOpen(true); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><Trash2 size={10}/></button>
                      </div>
                    ))}
                    {evidences.filter(e => e.chapter_id === editingChapter.id).length === 0 && <span className="text-xs text-gray-500">Aucun document joint.</span>}
                  </div>
                </div>
              )}
              {!editingChapter.id && <p className="text-xs text-gray-500 italic">Sauvegardez ce chapitre pour pouvoir y attacher des pièces à conviction.</p>}

              <div className="flex justify-end pt-2">
                <button onClick={handleSaveChapter} disabled={isSaving} className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-200">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer le Chapitre
                </button>
              </div>
            </div>
          )}

          {/* Liste des Chapitres existants */}
          <div className="space-y-2 mt-4">
            {chapters.length === 0 && !editingChapter && <p className="text-sm text-gray-500 text-center py-4">Cette enquête n'a pas encore de scénario.</p>}
            {chapters.map(chap => (
              <div key={chap.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg hover:border-red-500/30">
                <div>
                  <p className="text-white text-sm font-bold"><span className="text-red-500 mr-2">Étape {chap.step_order} :</span>{chap.title_fr}</p>
                  <p className="text-gray-500 text-xs truncate max-w-xl">{chap.narrative_fr}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingChapter(chap)} className="p-2 text-gray-400 hover:text-white"><Edit2 size={14}/></button>
                  <button onClick={() => { setItemToDelete({ id: chap.id, type: 'chapter' }); setDeleteModalOpen(true); }} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LISTE DES DOSSIERS GLOBAUX ── */}
      {!editingId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {investigations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl hover:border-red-500/50 transition-colors cursor-pointer" onClick={() => handleEdit(inv)}>
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mb-2 inline-block ${inv.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {inv.status === "published" ? "✅ Publié" : "📝 Brouillon"}
                </span>
                <p className="text-white text-base font-bold">{inv.title_fr}</p>
                <p className="text-gray-500 text-xs mt-1 line-clamp-1">{inv.description_fr}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setItemToDelete({ id: inv.id, type: 'investigation' }); setDeleteModalOpen(true); }} className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <DeleteModal
        isOpen={deleteModalOpen} title="Confirmer la suppression"
        description="Cette action est irréversible."
        itemName={itemToDelete?.type === 'investigation' ? investigations.find(i => i.id === itemToDelete.id)?.title_fr : "Cet élément"}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        isDeleting={isDeleting} confirmText="Supprimer" cancelText="Annuler"
      />
    </div>
  );
}