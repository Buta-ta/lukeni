// components/admin/PanoramaHotspotEditor.tsx
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import dynamic from "next/dynamic";
import {
  X, Plus, Trash2, Eye, EyeOff, Move, Save, AlertCircle, Languages,
  Loader2, Palette, Upload, ChevronDown, ChevronUp, PlusCircle, Layers,
  ArrowRight, Music, Camera, Clock, ImagePlus, User, FileQuestion, Paperclip, AlertTriangle, Zap, Lightbulb
} from "lucide-react";
import {
  Hotspot, HotspotType, HOTSPOT_CONFIG,
  HOTSPOT_ICONS_PRESET, HOTSPOT_COLORS, PanoramaScene, TRANSITION_ICONS_PRESET
} from "@/types/panorama";
import { autoTranslate } from "@/lib/lingua";
import { supabase } from "@/lib/supabase";

const MiniPanoramaViewer = dynamic(
  () => import("@/components/game/PanoramaViewer"),
  { ssr: false, loading: () => <div className="w-full h-[500px] bg-black flex items-center justify-center"><Loader2 className="animate-spin text-red-500" /></div> }
);

const HOTSPOT_TYPES: HotspotType[] = ['evidence', 'audio', 'document', 'enigma', 'image', 'info', 'transition', 'locked', 'character', 'ending', 'dialogue_bubble'];

interface Props {
  investigationId: string;
  chapterId: string;
  scenes: PanoramaScene[];
  evidences: any[];
  chapters: any[];
  currentChapterId: string;
  onScenesUpdate: () => void;
  lang?: 'fr' | 'en';
  outroConfig?: any
  showMsg?: (type: "success" | "error", text: string) => void;
}

function IconPicker({ currentIcon, currentIconUrl, onSelectEmoji, onSelectCustomUrl, transitionMode = false }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [tab, setTab] = useState<'preset' | 'custom' | 'upload'>('preset');
  const [isUploading, setIsUploading] = useState(false);

  // ✅ NOUVEAU : Utilise TRANSITION_ICONS_PRESET si transitionMode
  const iconPreset = transitionMode ? TRANSITION_ICONS_PRESET : HOTSPOT_ICONS_PRESET;
  const filtered = iconPreset.filter(i => i.label.toLowerCase().includes(search.toLowerCase()) || i.value.includes(search));

  const handleUploadCustomIcon = () => {
    setIsUploading(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: "lukeni_upload",
        sources: ['local', 'url'], resourceType: 'image', folder: 'lukeni/hotspot-icons', croppingAspectRatio: 1,
      }, (error: any, result: any) => {
        setIsUploading(false);
        if (result?.event === 'success') { onSelectCustomUrl(result.info.secure_url); setIsOpen(false); }
      });
      widget.open();
    };
    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  return (
    <div className="relative">
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Icône du Hotspot</label>
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 cursor-pointer hover:border-red-500/50">
        {currentIconUrl ? <img src={currentIconUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="text-2xl">{currentIcon}</span>}
        <span className="text-sm text-gray-400 flex-1">{currentIconUrl ? 'Icône custom' : 'Changer l\'icône'}</span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#111] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-white/10">
            {[{ id: 'preset', label: '📦 Prédéfinis' }, { id: 'custom', label: '⌨️ Emoji perso' }, { id: 'upload', label: '📤 Uploader' }].map(t => (
              <div key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 py-2 text-center text-xs cursor-pointer ${tab === t.id ? 'bg-red-600/20 text-red-400 font-bold' : 'text-gray-500 hover:text-white'}`}>{t.label}</div>
            ))}
          </div>
          {tab === 'preset' && (
            <div className="p-2"><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une icône..." className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 mb-2" />
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {filtered.map(icon => <div key={icon.value} onClick={() => { onSelectEmoji(icon.value); onSelectCustomUrl(''); setIsOpen(false); }} className={`flex items-center justify-center w-8 h-8 rounded-lg text-xl cursor-pointer hover:bg-white/10 ${currentIcon === icon.value && !currentIconUrl ? 'bg-red-500/20 ring-1 ring-red-500' : ''}`}>{icon.value}</div>)}
              </div>
            </div>
          )}
          {tab === 'custom' && (
            <div className="p-4 space-y-3"><div className="flex gap-2"><input type="text" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} placeholder="Ex: ◈ ꩜ ⬡ ✦" className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-2xl text-white outline-none focus:border-red-500" maxLength={4} /><div className="w-12 h-10 bg-[#1a1a1a] border border-white/10 rounded flex items-center justify-center text-2xl">{customEmoji || '?'}</div></div><div onClick={() => { if (customEmoji.trim()) { onSelectEmoji(customEmoji.trim()); onSelectCustomUrl(''); setIsOpen(false); setCustomEmoji(''); } }} className="w-full py-2 bg-red-600 text-white text-sm font-bold rounded-lg text-center cursor-pointer hover:bg-red-500">Utiliser</div></div>
          )}
          {tab === 'upload' && (
            <div className="p-4 space-y-3">
              {currentIconUrl && <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"><img src={currentIconUrl} alt="" className="w-10 h-10 rounded-full object-cover" /><div onClick={() => onSelectCustomUrl('')} className="text-red-500 cursor-pointer"><X size={14} /></div></div>}
              <div onClick={handleUploadCustomIcon} className="w-full py-3 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-red-500/50">{isUploading ? <Loader2 size={16} className="animate-spin mx-auto text-red-500" /> : <><Upload size={20} className="mx-auto text-gray-500 mb-1" /><p className="text-xs text-gray-400">Cliquez pour uploader (PNG/SVG)</p></>}</div>
            </div>
          )}
          <div className="p-2 border-t border-white/10 flex justify-end"><div onClick={() => setIsOpen(false)} className="text-xs text-gray-400 hover:text-white cursor-pointer px-3 py-1">Fermer</div></div>
        </div>
      )}
    </div>
  );
}

function ColorPicker({ currentColor, onSelect }: any) {
  const [customColor, setCustomColor] = useState(currentColor);
  return (
    <div>
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block"><Palette size={10} className="inline mr-1" /> Couleur du Hotspot</label>
      <div className="flex flex-wrap gap-2 mb-2">{HOTSPOT_COLORS.map(c => <div key={c.value} onClick={() => onSelect(c.value)} title={c.label} className={`w-7 h-7 rounded-full cursor-pointer hover:scale-110 ${currentColor === c.value ? 'ring-2 ring-white scale-110' : ''}`} style={{ backgroundColor: c.value }} />)}</div>
      <div className="flex items-center gap-2 mt-2"><input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" /><input type="text" value={customColor} onChange={e => setCustomColor(e.target.value)} placeholder="#D4AF37" className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-red-500 font-mono" /><div onClick={() => onSelect(customColor)} className="px-2 py-1 bg-white/10 rounded text-xs cursor-pointer hover:bg-white/20">OK</div></div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// FORMULAIRE DE CONTENU
// ────────────────────────────────────────────────────────────
function HotspotContentForm({
  hotspot, evidences, scenes, chapters, characters, allEnigmas, dialogueSpeakers, wordSearches, updateHotspot, isTranslating, setIsTranslating, lang
}: any) {

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const translate = async (frText: string, field: keyof Hotspot) => {
    if (!frText.trim()) return;
    setIsTranslating(true);
    try { const t = await autoTranslate(frText, "fr"); updateHotspot(hotspot.id, { [field]: t }); } catch { }
    setIsTranslating(false);
  };

  const uploadMedia = (field: keyof Hotspot, resourceType: 'image' | 'video' | 'auto') => {
    setIsUploadingMedia(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'url'],
          resourceType: resourceType,
          folder: 'lukeni/scene-media'
        },
        (_error: any, result: any) => {
          setIsUploadingMedia(false);
          if (result?.event === 'success') {
            updateHotspot(hotspot.id, { [field]: result.info.secure_url });
          }
        }
      );
      widget.open();
    };
    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  // ── CONTENU SPÉCIFIQUE AU TYPE ──
  const renderTypeContent = () => {
    // ── EVIDENCE / DOCUMENT / AUDIO ──
    if (['evidence', 'audio', 'document'].includes(hotspot.type)) {
      return (
        <div>
          <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><Paperclip size={10} /> Sélectionner une pièce à conviction existante</label>
          <select value={hotspot.evidence_id || ''} onChange={e => updateHotspot(hotspot.id, { evidence_id: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500">
            <option value="">— Sélectionner —</option>
            {evidences.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.media_type === 'image' ? '🖼️' : ev.media_type === 'audio' ? '🎵' : '📄'} {ev.name_fr || 'Sans nom'}</option>)}
          </select>
          {evidences.length === 0 && <p className="text-[10px] text-gray-500 mt-1">Créez d'abord une pièce à conviction dans le chapitre.</p>}
        </div>
      );
    }

    // ── PERSONNAGE (PNJ) ──
    if (hotspot.type === 'character') {
      return (
        <div>
          <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><User size={10} /> Associer un Personnage (PNJ)</label>
          <select value={hotspot.character_id || ''} onChange={e => updateHotspot(hotspot.id, { character_id: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-teal-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-teal-500">
            <option value="">— Choisir un personnage —</option>
            {characters.map((char: any) => <option key={char.id} value={char.id}>{char.role} - {char.name_fr}</option>)}
          </select>
          {characters.length === 0 && <p className="text-[10px] text-gray-500 mt-1">Créez d'abord des personnages dans la section PNJ.</p>}
        </div>
      );
    }

    // ── ÉNIGME ──
    if (hotspot.type === 'enigma') {
      return (
        <div>
          <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><FileQuestion size={10} /> Lier à une Énigme existante</label>
          <select value={hotspot.enigma_id || ''} onChange={e => updateHotspot(hotspot.id, { enigma_id: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-yellow-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-yellow-500">
            <option value="">— Choisir une énigme —</option>
            {allEnigmas.map((enig: any) => <option key={enig.id} value={enig.id}>❓ {enig.question_fr || 'Énigme sans question'}</option>)}
          </select>
        </div>
      );
    }

    // ── IMAGE INLINE ──
    if (hotspot.type === 'image') {
      return (
        <div className="space-y-3">
          <button onClick={() => uploadMedia('inline_image_url', 'image')} className="w-full py-2 bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold hover:bg-cyan-900/40 flex items-center justify-center gap-2">
            {isUploadingMedia ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {hotspot.inline_image_url ? "Changer l'image" : 'Uploader une image dans la scène'}
          </button>
          {hotspot.inline_image_url && <img src={hotspot.inline_image_url} alt="" className="w-full h-32 object-cover rounded-lg border border-white/10" />}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-gray-500 font-bold">Légende (FR)</label><input type="text" value={hotspot.inline_image_caption_fr || ''} onChange={e => updateHotspot(hotspot.id, { inline_image_caption_fr: e.target.value })} placeholder="Ex: Photographie de 1923" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-red-500" /></div>
            <div><label className="text-[10px] text-gray-500 font-bold">Caption (EN)</label><div className="flex gap-1"><input type="text" value={hotspot.inline_image_caption_en || ''} onChange={e => updateHotspot(hotspot.id, { inline_image_caption_en: e.target.value })} placeholder="Ex: 1923 photograph" className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none" /><div onClick={() => translate(hotspot.inline_image_caption_fr || '', 'inline_image_caption_en')} className="p-1.5 bg-white/5 rounded cursor-pointer hover:bg-white/10">{isTranslating ? <Loader2 size={12} className="animate-spin text-red-500" /> : <Languages size={12} className="text-gray-400" />}</div></div></div>
          </div>
        </div>
      );
    }

    // ── INFO ──
    if (hotspot.type === 'info') {
      return (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Texte informatif (FR)</label>
            <textarea rows={3} value={hotspot.info_text_fr || ''} onChange={e => updateHotspot(hotspot.id, { info_text_fr: e.target.value })} placeholder="Ex: Ce bâtiment fut le théâtre de l'indépendance en 1960..." className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Text (EN)</label>
            <div className="flex gap-2">
              <textarea rows={3} value={hotspot.info_text_en || ''} onChange={e => updateHotspot(hotspot.id, { info_text_en: e.target.value })} placeholder="Ex: This building was the stage of independence in 1960..." className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500" />
              <div onClick={() => translate(hotspot.info_text_fr || '', 'info_text_en')} className="p-2 bg-white/5 rounded cursor-pointer mt-1 h-fit hover:bg-white/10">{isTranslating ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Languages size={14} className="text-gray-400" />}</div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Audio d'accompagnement (Optionnel)</label>
            {hotspot.inline_audio_url ? (
              <div className="flex items-center gap-2"><audio src={hotspot.inline_audio_url} controls className="h-6 flex-1" /><button onClick={() => updateHotspot(hotspot.id, { inline_audio_url: undefined })} className="text-red-500 p-1 hover:text-red-400"><X size={14} /></button></div>
            ) : (
              <button onClick={() => uploadMedia('inline_audio_url', 'video')} className="w-full py-2 bg-blue-900/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-900/40 flex items-center justify-center gap-2">
                {isUploadingMedia ? <Loader2 size={14} className="animate-spin" /> : <Music size={14} />} Ajouter un fichier Audio
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── FIN ALTERNATIVE ──
    if (hotspot.type === 'ending') {
      return (
        <div className="space-y-4 bg-red-950/20 p-4 rounded-lg border border-red-500/20">
          <h4 className="text-sm font-bold text-red-400 flex items-center gap-2"><AlertTriangle size={14} /> Fin Alternative (Branchement Narratif)</h4>
          <div>
            <label className="text-xs text-gray-400 font-bold mb-1 block">Type de Fin</label>
            <select value={hotspot.ending_type || 'abandon'} onChange={(e) => updateHotspot(hotspot.id, { ending_type: e.target.value as any })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white">
              <option value="victory">✅ Victoire Alternative</option>
              <option value="abandon">🚪 Abandon / Fuite</option>
              <option value="alternate">❓ Fin Alternative (Mauvaise)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-400 mb-1 block">Titre court (FR)</label><input type="text" value={hotspot.ending_title_fr || ''} onChange={(e) => updateHotspot(hotspot.id, { ending_title_fr: e.target.value })} placeholder="Ex: FUITE RÉUSSIE" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white" /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Titre court (EN)</label><input type="text" value={hotspot.ending_title_en || ''} onChange={(e) => updateHotspot(hotspot.id, { ending_title_en: e.target.value })} placeholder="Ex: SUCCESSFUL ESCAPE" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white" /></div>
          </div>
          <div><label className="text-xs text-gray-400 mb-1 block">Récit narratif (FR)</label><textarea rows={3} value={hotspot.ending_msg_fr || ''} onChange={(e) => updateHotspot(hotspot.id, { ending_msg_fr: e.target.value })} placeholder="Décrivez dramatiquement ce qui se passe..." className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none" /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Récit narratif (EN)</label><textarea rows={3} value={hotspot.ending_msg_en || ''} onChange={(e) => updateHotspot(hotspot.id, { ending_msg_en: e.target.value })} placeholder="Describe dramatically what happens..." className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none" /></div>
        </div>
      );
    }

    // ── DIALOGUE BUBBLE ──
    if (hotspot.type === 'dialogue_bubble') {
      return (
        <div className="space-y-4 bg-purple-900/10 p-4 rounded-xl border border-purple-500/20">
          <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">💬 Configuration Bulle de Dialogue</h4>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Texte (FR)</label><textarea rows={3} value={hotspot.dialogue_text_fr || ''} onChange={e => updateHotspot(hotspot.id, { dialogue_text_fr: e.target.value })} placeholder="Ex: Voici un message important..." className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-purple-500" /></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Texte (EN)</label><div className="flex gap-2"><textarea rows={3} value={hotspot.dialogue_text_en || ''} onChange={e => updateHotspot(hotspot.id, { dialogue_text_en: e.target.value })} placeholder="Ex: Here is an important message..." className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-purple-500" /><button onClick={async () => { if (!hotspot.dialogue_text_fr?.trim()) return; setIsTranslating(true); try { const t = await autoTranslate(hotspot.dialogue_text_fr, 'fr'); updateHotspot(hotspot.id, { dialogue_text_en: t }); } catch { console.error('Translation error'); } setIsTranslating(false); }} className="p-2 bg-white/5 rounded hover:bg-white/10 mt-1 flex-shrink-0">{isTranslating ? <Loader2 size={14} className="animate-spin text-purple-500" /> : <Languages size={14} className="text-gray-400" />}</button></div></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Qui parle ? (Optionnel)</label><select value={hotspot.dialogue_speaker_id || ''} onChange={e => updateHotspot(hotspot.id, { dialogue_speaker_id: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"><option value="">— Aucun speaker —</option>{(dialogueSpeakers || []).map((speaker: any) => (<option key={speaker.id} value={speaker.id}>{speaker.avatar_url && '🖼️'} {speaker.name_fr} ({speaker.role_fr})</option>))}</select></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Style de la bulle</label><select value={hotspot.dialogue_style || 'classic_blue'} onChange={e => updateHotspot(hotspot.id, { dialogue_style: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"><option value="classic_blue">💙 Classique Bleu</option><option value="warning_red">❤️ Alerte Rouge</option><option value="success_green">💚 Succès Vert</option><option value="dark_gold">✦ Mystère Or</option><option value="ethereal_purple">🔮 Éthéré Violet</option></select></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Taille de la bulle</label><div className="flex gap-2">{[{ value: 'small', label: '📱 Petit' }, { value: 'medium', label: '🖥️ Moyen' }, { value: 'large', label: '📺 Grand' }].map(size => (<button key={size.value} onClick={() => updateHotspot(hotspot.id, { dialogue_size: size.value as any })} className={`flex-1 py-1.5 rounded text-xs font-bold border transition-colors ${hotspot.dialogue_size === size.value ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>{size.label}</button>))}</div></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">⌨️ Vitesse de l'animation (ms par caractère)</label><input type="number" value={hotspot.dialogue_typewriter_speed || 30} onChange={e => updateHotspot(hotspot.id, { dialogue_typewriter_speed: Number(e.target.value) })} min="10" max="200" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500" /><p className="text-[10px] text-gray-600 mt-1">20 = Très rapide | 50 = Normal | 100 = Lent</p></div>
        </div>
      );
    }

    // ── TRANSITION ──
    if (hotspot.type === 'transition') {
      return (
        <div className="space-y-4">
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Style d'affichage</label><div className="flex gap-2 bg-[#1a1a1a] p-1 rounded-lg border border-white/10"><div onClick={() => updateHotspot(hotspot.id, { variant: 'floating' })} className={`flex-1 text-center py-2 rounded text-xs font-bold cursor-pointer transition-all ${hotspot.variant !== 'ground' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>💭 Flottant (Face caméra)</div><div onClick={() => updateHotspot(hotspot.id, { variant: 'ground' })} className={`flex-1 text-center py-2 rounded text-xs font-bold cursor-pointer transition-all ${hotspot.variant === 'ground' ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'text-gray-500 hover:text-gray-300'}`}>🔽 Au sol (Street View)</div></div></div>
          {hotspot.variant !== 'ground' && (<IconPicker currentIcon={hotspot.icon} currentIconUrl={hotspot.icon_url} onSelectEmoji={(e: string) => updateHotspot(hotspot.id, { icon: e, icon_url: undefined })} onSelectCustomUrl={(u: string) => updateHotspot(hotspot.id, { icon_url: u || undefined })} transitionMode={true} />)}
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block"><ArrowRight size={10} className="inline mr-1" /> Aller vers une autre scène</label><select value={hotspot.target_scene_id || ''} onChange={e => updateHotspot(hotspot.id, { target_scene_id: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"><option value="">— Même chapitre —</option>{scenes.map((sc: any, idx: number) => <option key={sc.id} value={sc.id}>Scène {idx + 1} — {sc.title_fr}</option>)}</select></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Ou vers un autre chapitre</label><select value={hotspot.target_chapter_id || ''} onChange={e => updateHotspot(hotspot.id, { target_chapter_id: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"><option value="">— Aucun —</option>{chapters.map((chap: any) => <option key={chap.id} value={chap.id}>{chap.step_order}. {chap.title_fr}</option>)}</select></div>
          <div><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Condition de déverrouillage</label><select value={hotspot.condition || ''} onChange={e => updateHotspot(hotspot.id, { condition: e.target.value || undefined })} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-red-500"><option value="">— Aucune condition —</option><optgroup label="❓ Énigmes">{allEnigmas.map((enig: any) => (<option key={enig.id} value={`enigma_${enig.id}_solved`}>❓ {enig.question_fr || 'Énigme sans question'}</option>))}</optgroup><optgroup label="🧩 Mots Mêlés">{(wordSearches || []).map((ws: any) => (<option key={ws.id} value={`wordsearch_${ws.id}_completed`}>{ws.title_fr}</option>))}</optgroup></select></div>
        </div>
      );
    }

    // ── LOCKED (pas de contenu spécifique) ──
    if (hotspot.type === 'locked') {
      return (
        <p className="text-gray-500 text-xs italic">Ce hotspot est verrouillé. Configurez la condition dans la section "Avancé" ci-dessous.</p>
      );
    }

    return null;
  };

  // ── SECTION AVANCÉE (Commune à tous les types) ──
  const renderAdvancedSection = () => {
    // La transition a déjà ses propres champs, on ne les duplique pas
    const isTransition = hotspot.type === 'transition';

    return (
      <div className="space-y-4 border-t border-white/10 pt-4 mt-4">
        <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
          ⚙️ Configuration Avancée
        </h4>

        {/* 🔒 Condition de verrouillage (sauf transition qui l'a déjà) */}
        {!isTransition && (
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
              🔒 Condition d'accès
            </label>
            <select
              value={hotspot.condition || ''}
              onChange={e => updateHotspot(hotspot.id, { condition: e.target.value || undefined })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-red-500"
            >
              <option value="">— Aucune condition —</option>
              <optgroup label="❓ Énigmes">
                {allEnigmas.map((enig: any) => (
                  <option key={enig.id} value={`enigma_${enig.id}_solved`}>
                    {enig.question_fr || 'Énigme sans question'}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🧩 Mots Mêlés">
                {(wordSearches || []).map((ws: any) => (
                  <option key={ws.id} value={`wordsearch_${ws.id}_completed`}>
                    {ws.title_fr}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[10px] text-gray-600 mt-1">
              Le joueur doit résoudre ceci pour accéder au hotspot
            </p>
          </div>
        )}

        {/* 🚀 Navigation après interaction (sauf transition) */}
        {!isTransition && (
          <div className="border-t border-white/10 pt-3">
            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
              🚀 Navigation après interaction
            </label>
            <select
              value={hotspot.target_scene_id || ''}
              onChange={e => updateHotspot(hotspot.id, { target_scene_id: e.target.value || undefined })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-green-500 mb-2"
            >
              <option value="">— Aller vers une scène —</option>
              {scenes.map((sc: any, idx: number) => (
                <option key={sc.id} value={sc.id}>
                  Scène {idx + 1} — {sc.title_fr}
                </option>
              ))}
            </select>
            <select
              value={hotspot.target_chapter_id || ''}
              onChange={e => updateHotspot(hotspot.id, { target_chapter_id: e.target.value || undefined })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-green-500"
            >
              <option value="">— Ou aller vers un chapitre —</option>
              {chapters.map((chap: any) => (
                <option key={chap.id} value={chap.id}>
                  {chap.title_fr}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 👁️ Révéler d'autres hotspots */}
        <div className="border-t border-white/10 pt-3">
          <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">
            👁️ Révéler d'autres hotspots
          </label>
          <p className="text-[10px] text-gray-600 mb-2">
            Cochez les hotspots qui apparaîtront après l'interaction
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto bg-black/20 p-2 rounded">
            {scenes.flatMap((sc: any) =>
              (sc.hotspots || [])
                .filter((h: any) => h.id !== hotspot.id)
                .map((h: any) => (
                  <label
                    key={h.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(hotspot.reveals_hotspot_ids || []).includes(h.id)}
                      onChange={(e) => {
                        const current = hotspot.reveals_hotspot_ids || [];
                        const updated = e.target.checked
                          ? [...current, h.id]
                          : current.filter((id: string) => id !== h.id);
                        updateHotspot(hotspot.id, { reveals_hotspot_ids: updated });
                      }}
                      className="w-3 h-3 accent-purple-500"
                    />
                    <span className="text-xs text-gray-300">
                      {h.icon} {h.label_fr}
                    </span>
                  </label>
                ))
            )}
            {scenes.flatMap((sc: any) => (sc.hotspots || [])).filter((h: any) => h.id !== hotspot.id).length === 0 && (
              <p className="text-[10px] text-gray-600 italic text-center py-2">
                Aucun autre hotspot dans cette scène
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDU FINAL ──
  return (
    <div className="space-y-0">
      {renderTypeContent()}
      {renderAdvancedSection()}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ────────────────────────────────────────────────────────────
export default function PanoramaHotspotEditor({
  investigationId, chapterId, scenes: initialScenes, evidences, chapters, currentChapterId, onScenesUpdate, lang = 'fr', outroConfig
}: Props) {
  const [scenes, setScenes] = useState<PanoramaScene[]>(initialScenes || []);
  const [characters, setCharacters] = useState<any[]>([]);

  const [dialogueSpeakers, setDialogueSpeakers] = useState<any[]>([]);

  const [wordSearchesState, setWordSearchesState] = useState<any[]>([])
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingScene, setIsUploadingScene] = useState(false);

  const [isTranslatingScene, setIsTranslatingScene] = useState(false);
  const [isTranslatingMission, setIsTranslatingMission] = useState(false);
  const [isTranslatingContext, setIsTranslatingContext] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const activeScene = scenes[activeSceneIndex] || null;
  const hotspots = activeScene?.hotspots || [];
  const selectedHotspot = hotspots.find(h => h.id === selectedHotspotId) || null;
  const allEnigmas = chapters.flatMap(c => c.enigmas || []);

  useEffect(() => { setScenes(initialScenes || []); }, [initialScenes]);
  useEffect(() => { setImageLoaded(false); setSelectedHotspotId(null); }, [activeSceneIndex]);

  useEffect(() => {
    supabase.from('investigation_characters').select('*').eq('investigation_id', investigationId)
      .then(({ data }) => setCharacters(data || []));
  }, [investigationId]);


  // ✅ Charger les dialogue speakers
  useEffect(() => {
    if (!investigationId) return;
    supabase
      .from('investigation_dialogue_speakers')
      .select('*')
      .eq('investigation_id', investigationId)
      .then(({ data }) => setDialogueSpeakers(data || []));
  }, [investigationId]);



  // ✅ Charger les mots mêlés
  useEffect(() => {
    if (!investigationId) return;
    supabase
      .from('investigation_word_search')
      .select('*')
      .eq('investigation_id', investigationId)
      .then(({ data }) => setWordSearchesState(data || []));
  }, [investigationId]);


  const [allInstructions, setAllInstructions] = useState<any[]>([]);

  useEffect(() => {
    if (!investigationId) return;
    supabase
      .from("investigation_instructions")
      .select("*")
      .eq("investigation_id", investigationId)
      .then(({ data }) => setAllInstructions(data || []));
  }, [investigationId]);

  const updateHotspot = useCallback((id: string, updates: Partial<Hotspot>) => {
    setScenes(prev => prev.map((sc, idx) => idx === activeSceneIndex ? { ...sc, hotspots: sc.hotspots.map(h => h.id === id ? { ...h, ...updates } : h) } : sc));
    setIsDirty(true);
  }, [activeSceneIndex]);


  // ── Traduction du titre de scène ──
  const translateSceneTitle = async (sceneId: string, frText: string) => {
    if (!frText.trim()) return;
    setIsTranslatingScene(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setScenes(prev => prev.map((s, i) =>
        s.id === sceneId ? { ...s, title_en: translated } : s
      ));
      await supabase
        .from("investigation_scenes")
        .update({ title_en: translated })
        .eq("id", sceneId);
      console.log("✅ Titre traduit !");  // ✅ Remplacement
    } catch (err) {
      console.error("Translation error:", err);  // ✅ Déjà bon
    }
    setIsTranslatingScene(false);
  };




  // ── Traduction de la mission ──
  const translateMission = async (sceneId: string, frText: string) => {
    if (!frText.trim()) return;
    setIsTranslatingMission(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setScenes(prev => prev.map((s, i) =>
        s.id === sceneId ? { ...s, mission_en: translated } : s
      ));
      await supabase
        .from("investigation_scenes")
        .update({ mission_en: translated })
        .eq("id", sceneId);
    } catch (err) {
      console.error("Translation error:", err);
    }
    setIsTranslatingMission(false);
  };

  // ── Traduction de l'indice mission ──
  const translateMissionHint = async (sceneId: string, frText: string) => {
    if (!frText.trim()) return;
    setIsTranslatingMission(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setScenes(prev => prev.map((s, i) =>
        s.id === sceneId ? { ...s, mission_hint_en: translated } : s
      ));
      await supabase
        .from("investigation_scenes")
        .update({ mission_hint_en: translated })
        .eq("id", sceneId);
    } catch (err) {
      console.error("Translation error:", err);
    }
    setIsTranslatingMission(false);
  };


    // ── Traduction du Contexte Historique ──
  const translateContext = async (sceneId: string, frText: string) => {
    if (!frText.trim()) return;
    setIsTranslatingContext(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, historical_context_en: translated } : s));
      await supabase.from("investigation_scenes").update({ historical_context_en: translated }).eq("id", sceneId);
    } catch (err) {
      console.error("Translation error:", err);
    }
    setIsTranslatingContext(false);
  };


  // ── Traduction d'un objectif ──
  const translateObjective = async (sceneId: string, frText: string, index: number) => {
    if (!frText.trim()) return;
    setIsTranslatingMission(true);
    try {
      const translated = await autoTranslate(frText, "fr");
      setScenes(prev => prev.map((s, i) => {
        if (s.id !== sceneId) return s;
        const objectivesEn = s.mission_objectives_en || [];
        const newObjectivesEn = [...objectivesEn];
        newObjectivesEn[index] = translated;
        return { ...s, mission_objectives_en: newObjectivesEn };
      }));
      await supabase
        .from("investigation_scenes")
        .update({ mission_objectives_en: (activeScene.mission_objectives_en || []) })
        .eq("id", sceneId);
    } catch (err) {
      console.error("Translation error:", err);
    }
    setIsTranslatingMission(false);
  };

  // ── Ajouter un objectif ──
  const addObjective = (sceneId: string) => {
    setScenes(prev => prev.map((s, i) => {
      if (s.id !== sceneId) return s;
      const objectives = s.mission_objectives_fr || [];
      return {
        ...s,
        mission_objectives_fr: [...objectives, "Nouvel objectif"],
        mission_objectives_en: [...(s.mission_objectives_en || []), "New objective"]
      };
    }));
  };

  // ── Modifier un objectif ──
  const updateObjective = (sceneId: string, index: number, value: string, lang: 'fr' | 'en') => {
    setScenes(prev => prev.map((s, i) => {
      if (s.id !== sceneId) return s;
      const objectives = lang === 'fr' ? s.mission_objectives_fr : s.mission_objectives_en;
      if (!objectives) return s;
      const newObjectives = [...objectives];
      newObjectives[index] = value;
      return {
        ...s,
        [lang === 'fr' ? 'mission_objectives_fr' : 'mission_objectives_en']: newObjectives
      };
    }));
  };

  // ── Supprimer un objectif ──
  const deleteObjective = (sceneId: string, index: number) => {
    setScenes(prev => prev.map((s, i) => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        mission_objectives_fr: (s.mission_objectives_fr || []).filter((_, i) => i !== index),
        mission_objectives_en: (s.mission_objectives_en || []).filter((_, i) => i !== index)
      };
    }));
  };

  // ── Sauvegarder la mission ──
  const saveMission = async (scene: PanoramaScene) => {
    const { error } = await supabase
      .from("investigation_scenes")
      .update({
        mission_fr: scene.mission_fr || '',
        mission_en: scene.mission_en || '',
        mission_objectives_fr: scene.mission_objectives_fr || [],
        mission_objectives_en: scene.mission_objectives_en || [],
        mission_hint_fr: scene.mission_hint_fr || '',
        mission_hint_en: scene.mission_hint_en || '',
      })
      .eq("id", scene.id);

    if (error) {
      console.error("Save mission error:", error);
    } else {
      console.log("✅ Mission sauvegardée");
    }
  };

  const deleteHotspot = useCallback((id: string) => {
    setScenes(prev => prev.map((sc, idx) => idx === activeSceneIndex ? { ...sc, hotspots: sc.hotspots.filter(h => h.id !== id) } : sc));
    if (selectedHotspotId === id) setSelectedHotspotId(null);
    setIsDirty(true);
  }, [activeSceneIndex, selectedHotspotId]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (!isPlacingMode || draggingId || !imageRef.current) return;
    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const pos = { x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)) };

    const newHotspot: Hotspot = { id: uuidv4(), x_percent: pos.x, y_percent: pos.y, type: 'evidence', label_fr: 'Nouveau', label_en: 'New', icon: HOTSPOT_CONFIG.evidence.icon, color: HOTSPOT_CONFIG.evidence.color };
    setScenes(prev => prev.map((sc, idx) => idx === activeSceneIndex ? { ...sc, hotspots: [...sc.hotspots, newHotspot] } : sc));
    setSelectedHotspotId(newHotspot.id); setIsPlacingMode(false); setIsDirty(true);
  }, [isPlacingMode, draggingId, activeSceneIndex]);

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation(); e.preventDefault(); setSelectedHotspotId(id); setDraggingId(id);
    const handleMouseMove = (me: MouseEvent) => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((me.clientY - rect.top) / rect.height) * 100));
      updateHotspot(id, { x_percent: x, y_percent: y });
    };
    const handleMouseUp = () => { setDraggingId(null); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
  }, [activeSceneIndex, updateHotspot]);

  const handleSave = async () => {
    if (!activeScene) return;
    setIsSaving(true);
    await supabase.from('investigation_scenes').update({
      panorama_url: activeScene.panorama_url, // ✅ AJOUT CRUCIAL ICI
      hotspots: activeScene.hotspots,
      ambient_audio_url: activeScene.ambient_audio_url,
      ambient_audio_volume: activeScene.ambient_audio_volume ?? 0.5,
      historical_context_fr: activeScene.historical_context_fr || null, 
      historical_context_en: activeScene.historical_context_en || null,
      timer_duration: activeScene.timer_duration,
      visual_filter: activeScene.visual_filter,
      instruction_id: activeScene.instruction_id || null
    }).eq('id', activeScene.id);
    setIsDirty(false); setIsSaving(false);
  };

  const uploadSceneMedia = (field: 'panorama_url' | 'ambient_audio_url' | 'replace_panorama', isAudio = false) => {
    setIsUploadingScene(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        resourceType: isAudio ? 'video' : 'image',
        folder: 'lukeni/scenes'
      }, async (error: any, result: any) => {
        setIsUploadingScene(false);
        if (result?.event === 'success') {
          const url = result.info.secure_url;
          if (field === 'panorama_url') {
            // Création d'une nouvelle scène
            const newScene = { id: uuidv4(), chapter_id: chapterId, scene_order: scenes.length + 1, title_fr: `Scène ${scenes.length + 1}`, title_en: `Scene ${scenes.length + 1}`, panorama_url: url, hotspots: [] };
            const { data } = await supabase.from('investigation_scenes').insert(newScene).select().single();
            if (data) { setScenes(prev => [...prev, data]); setActiveSceneIndex(scenes.length); onScenesUpdate(); }
          } else if (field === 'replace_panorama') {
            // ✅ Remplacement de l'image de la scène ACTUELLE
            setScenes(prev => prev.map((sc, idx) => idx === activeSceneIndex ? { ...sc, panorama_url: url } : sc));
            setIsDirty(true);
          } else {
            setScenes(prev => prev.map((sc, idx) => idx === activeSceneIndex ? { ...sc, [field]: url } : sc)); setIsDirty(true);
          }
        }
      });
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header : Gestion des scènes ── */}
      <div className="bg-black/40 p-4 rounded-xl border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-bold text-purple-400 flex items-center gap-2"><Layers size={16} /> Scènes Panoramiques ({scenes.length})</h5>
          <div onClick={() => uploadSceneMedia('panorama_url')} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-600/40">
            {isUploadingScene ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />} Ajouter une scène
          </div>
        </div>
        {scenes.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-bold border ${activeSceneIndex === idx ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`} onClick={() => setActiveSceneIndex(idx)}>
                <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">{idx + 1}</span>

                {/* Titre FR */}
                <input
                  type="text"
                  value={scene.title_fr}
                  onChange={async e => {
                    e.stopPropagation();
                    const newValue = e.target.value;
                    setScenes(p => p.map((s, i) => i === idx ? { ...s, title_fr: newValue } : s));
                    const { error } = await supabase.from('investigation_scenes').update({ title_fr: newValue }).eq('id', scene.id);
                    if (error) console.error("Save error:", error);
                  }}
                  onClick={e => e.stopPropagation()}
                  placeholder="Nom FR"
                  className="bg-transparent outline-none w-20 text-xs"
                />

                {/* Bouton Traduction */}
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    await translateSceneTitle(scene.id, scene.title_fr);
                  }}
                  disabled={isTranslatingScene}
                  className="p-1 text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-50"
                  title="Traduire en anglais"
                >
                  {isTranslatingScene ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Languages size={10} />
                  )}
                </button>

                {/* Titre EN (affiché après traduction) */}
                <input
                  type="text"
                  value={scene.title_en || ''}
                  onChange={async e => {
                    e.stopPropagation();
                    const newValue = e.target.value;
                    setScenes(p => p.map((s, i) => i === idx ? { ...s, title_en: newValue } : s));
                    await supabase.from('investigation_scenes').update({ title_en: newValue }).eq('id', scene.id);
                  }}
                  onClick={e => e.stopPropagation()}
                  placeholder="Name EN"
                  className="bg-transparent outline-none w-20 text-xs text-purple-300"
                />

                <div onClick={async (e) => {
                  e.stopPropagation();

                  // ✅ Confirmation avant suppression
                  if (!confirm(`Supprimer la scène "${scene.title_fr}" ?`)) return;

                  // ✅ Supprimer de Supabase
                  const { error } = await supabase
                    .from('investigation_scenes')
                    .delete()
                    .eq('id', scene.id);

                  if (error) {
                    console.error("Erreur suppression scène:", error);
                    return;
                  }

                  // ✅ Supprimer de l'état local
                  const newScenes = scenes.filter((_, i) => i !== idx);
                  setScenes(newScenes);

                  // ✅ FIX : Ajuster l'index actif
                  if (newScenes.length === 0) {
                    setActiveSceneIndex(0);
                  } else if (idx === activeSceneIndex) {
                    // Si on supprime la scène active, aller à la précédente
                    setActiveSceneIndex(Math.max(0, idx - 1));
                  } else if (idx < activeSceneIndex) {
                    // Si on supprime une scène avant l'active, décrémenter l'index
                    setActiveSceneIndex(activeSceneIndex - 1);
                  }

                  // ✅ Notifier le parent
                  onScenesUpdate();

                }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500">
                  <X size={12} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-purple-500/20 rounded-xl"><p className="text-gray-500 text-sm">Aucune scène</p></div>
        )}
      </div>

      {activeScene && (
        <>
          <div className="bg-[#111] p-4 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase">
                <Music size={12} className="inline mr-1" /> Audio d'ambiance
              </label>
              {activeScene.ambient_audio_url ? (
                <>
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded">
                    <audio src={activeScene.ambient_audio_url} controls className="h-6 flex-1" />
                    <button
                      onClick={() => {
                        setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, ambient_audio_url: null } : s));
                        setIsDirty(true);
                      }}
                      className="text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {/* ✅ NOUVEAU SLIDER DE VOLUME */}
                  <div className="bg-black/30 p-2 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">🔊 Volume par défaut</span>
                      <span className="text-[10px] text-purple-400 font-mono font-bold">
                        {Math.round((activeScene.ambient_audio_volume ?? 0.5) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={activeScene.ambient_audio_volume ?? 0.5}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setScenes(p => p.map((s, i) =>
                          i === activeSceneIndex ? { ...s, ambient_audio_volume: newVolume } : s
                        ));
                        setIsDirty(true);
                      }}
                      className="w-full accent-purple-500 h-1 cursor-pointer"
                    />
                    <p className="text-[9px] text-gray-600 italic">
                      Le joueur pourra ajuster ce volume en jeu.
                    </p>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => uploadSceneMedia('ambient_audio_url', true)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400"
                >
                  Ajouter un son
                </button>
              )}
            </div>
            <div className="space-y-2"><label className="text-[10px] text-gray-500 font-bold uppercase"><Camera size={12} className="inline mr-1" /> Filtre Historique</label><select value={activeScene.visual_filter || 'none'} onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, visual_filter: e.target.value } : s)); setIsDirty(true); }} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white"><option value="none">Couleurs originales</option><option value="sepia">Sépia (Années 1900)</option><option value="grayscale">Noir & Blanc (Archives)</option><option value="vintage">Vintage (Contraste élevé)</option></select></div>
            <div className="space-y-2"><label className="text-[10px] text-gray-500 font-bold uppercase"><Clock size={12} className="inline mr-1" /> Compte à rebours (sec)</label><input type="number" value={activeScene.timer_duration || 0} onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, timer_duration: Number(e.target.value) } : s)); setIsDirty(true); }} placeholder="0 = Infini" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white" /></div>
          </div>



          {/* ── MISSION DE LA SCÈNE ── */}
          <div className="bg-[#111] p-4 rounded-xl border border-green-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-green-400 flex items-center gap-2">
                🎯 Mission de la scène
              </h4>
              <button
                onClick={() => saveMission(activeScene)}
                className="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-500/30 rounded text-xs font-bold hover:bg-green-600/40 flex items-center gap-1"
              >
                <Save size={12} /> Sauvegarder
              </button>
            </div>

            {/* Mission principale */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Mission principale (FR)</label>
              <textarea
                rows={2}
                value={activeScene.mission_fr || ''}
                onChange={e => setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, mission_fr: e.target.value } : s))}
                placeholder="Ex: Trouvez le document secret avant minuit..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Main Mission (EN)</label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={activeScene.mission_en || ''}
                  onChange={e => setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, mission_en: e.target.value } : s))}
                  placeholder="Ex: Find the secret document before midnight..."
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none"
                />
                <button
                  onClick={() => translateMission(activeScene.id, activeScene.mission_fr || '')}
                  className="p-2 bg-white/5 rounded hover:bg-white/10 mt-1 flex-shrink-0"
                >
                  {isTranslatingMission ? <Loader2 size={14} className="animate-spin text-green-500" /> : <Languages size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Objectifs */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase">Objectifs</label>
                <button
                  onClick={() => addObjective(activeScene.id)}
                  className="text-[10px] text-green-400 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded hover:bg-green-500/20"
                >
                  <Plus size={10} /> Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {(activeScene.mission_objectives_fr || []).map((obj: string, idx: number) => (
                  <div key={idx} className="space-y-1">
                    {/* Objectif FR */}
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-gray-500 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={obj}
                        onChange={e => updateObjective(activeScene.id, idx, e.target.value, 'fr')}
                        placeholder="Objectif FR"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-green-500"
                      />
                    </div>
                    {/* Objectif EN + Traduction */}
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-gray-500 w-4"></span>
                      <input
                        type="text"
                        value={(activeScene.mission_objectives_en || [])[idx] || ''}
                        onChange={e => updateObjective(activeScene.id, idx, e.target.value, 'en')}
                        placeholder="Objective EN"
                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-green-500"
                      />
                      <button
                        onClick={() => translateObjective(activeScene.id, obj, idx)}
                        disabled={isTranslatingMission}
                        className="p-1.5 bg-white/5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Traduire en anglais"
                      >
                        {isTranslatingMission ? (
                          <Loader2 size={10} className="animate-spin text-green-500" />
                        ) : (
                          <Languages size={10} className="text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteObjective(activeScene.id, idx)}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {(activeScene.mission_objectives_fr || []).length === 0 && (
                  <p className="text-[10px] text-gray-600 italic">Aucun objectif</p>
                )}
              </div>
            </div>

            {/* Indice */}
            <div className="border-t border-white/10 pt-4">
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">💡 Indice (FR)</label>
              <input
                type="text"
                value={activeScene.mission_hint_fr || ''}
                onChange={e => setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, mission_hint_fr: e.target.value } : s))}
                placeholder="Ex: La clé est cachée dans le tiroir..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-green-500 mb-2"
              />
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Hint (EN)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activeScene.mission_hint_en || ''}
                  onChange={e => setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, mission_hint_en: e.target.value } : s))}
                  placeholder="Ex: The key is hidden in the drawer..."
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white outline-none"
                />
                <button
                  onClick={() => translateMissionHint(activeScene.id, activeScene.mission_hint_fr || '')}
                  className="p-2 bg-white/5 rounded hover:bg-white/10"
                >
                  {isTranslatingMission ? <Loader2 size={14} className="animate-spin text-green-500" /> : <Languages size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>
          </div>




                    {/* ── MÉMOIRE / CONTEXTE HISTORIQUE DU LIEU ── */}
          <div className="bg-[#111] p-4 rounded-xl border border-[#06b6d4]/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#06b6d4] flex items-center gap-2">
                📖 Mémoire (Contexte Historique du lieu)
              </h4>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Texte FR</label>
              <textarea
                rows={3}
                value={activeScene.historical_context_fr || ''}
                onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, historical_context_fr: e.target.value } : s)); setIsDirty(true); }}
                placeholder="Ex: Ce bâtiment a été construit en 1960..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none focus:border-[#06b6d4]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Texte EN</label>
              <div className="flex gap-2">
                <textarea
                  rows={3}
                  value={activeScene.historical_context_en || ''}
                  onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, historical_context_en: e.target.value } : s)); setIsDirty(true); }}
                  placeholder="Ex: This building was constructed in 1960..."
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm text-white resize-none outline-none"
                />
                <button
                  onClick={() => translateContext(activeScene.id, activeScene.historical_context_fr || '')}
                  className="p-2 bg-white/5 rounded hover:bg-white/10 mt-1 h-fit flex-shrink-0"
                >
                  {isTranslatingContext ? <Loader2 size={14} className="animate-spin text-[#06b6d4]" /> : <Languages size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 col-span-1 md:col-span-3"><label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1"><AlertTriangle size={12} className="inline mr-1 text-red-500" /> Game Over Spécifique (si temps écoulé ici)</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={activeScene.game_over_msg_fr || ''} onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, game_over_msg_fr: e.target.value } : s)); setIsDirty(true); }} placeholder="Ex: La garde a fait irruption... (FR)" className="w-full bg-[#1a1a1a] border border-red-500/20 rounded px-3 py-2 text-xs text-white outline-none focus:border-red-500" />
              <input type="text" value={activeScene.game_over_msg_en || ''} onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, game_over_msg_en: e.target.value } : s)); setIsDirty(true); }} placeholder="Ex: The guards burst in... (EN)" className="w-full bg-[#1a1a1a] border border-red-500/20 rounded px-3 py-2 text-xs text-white outline-none focus:border-red-500" />
            </div>
          </div>

          {/* Instruction de la scène */}
          <div className="space-y-2 col-span-1 md:col-span-3">
            <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
              <Lightbulb size={12} className="inline mr-1 text-blue-400" /> Instruction à afficher quand le joueur entre dans cette scène (optionnel)
            </label>
            <select
              value={activeScene.instruction_id || ''}
              onChange={e => { setScenes(p => p.map((s, i) => i === activeSceneIndex ? { ...s, instruction_id: e.target.value || undefined } : s)); setIsDirty(true); }}
              className="w-full bg-[#1a1a1a] border border-blue-500/30 rounded px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            >
              <option value="">— Aucune instruction —</option>
              {allInstructions.map((instr: any) => (
                <option key={instr.id} value={instr.id}>
                  {instr.icon} {instr.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div onClick={() => setIsPlacingMode(!isPlacingMode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer ${isPlacingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-gray-300'}`}><Plus size={14} /> Placer Hotspot</div>
              <span className="text-xs text-gray-500">{hotspots.length} hotspots</span>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && <span className="text-xs text-amber-400 flex items-center gap-1"><AlertCircle size={12} /> Non sauvegardé</span>}
              <div onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1 px-3 py-2 text-xs rounded-lg font-bold cursor-pointer ${showPreview ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400'}`}><Eye size={12} /> Aperçu</div>
              <div onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-bold cursor-pointer ${isDirty ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-500'}`}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Sauvegarder</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`lg:col-span-2 relative rounded-xl overflow-hidden border-2 ${isPlacingMode ? 'border-red-500 cursor-crosshair' : 'border-white/10'}`} style={{ minHeight: '300px' }}>

              {/* ✅ NOUVEAU BOUTON : Changer l'image de fond */}
              <div className="absolute top-2 right-2 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); uploadSceneMedia('replace_panorama'); }}
                  className="flex items-center gap-2 bg-black/80 hover:bg-black text-white px-3 py-2 rounded-lg text-xs font-bold border border-white/20 shadow-xl transition-all"
                >
                  {isUploadingScene ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  Changer l'image 360°
                </button>
              </div>

              <img ref={imageRef} src={activeScene.panorama_url} className="w-full h-full object-cover select-none" onLoad={() => setImageLoaded(true)} onClick={handleImageClick} draggable={false} style={{ minHeight: '280px', maxHeight: '420px' }} />
              {imageLoaded && hotspots.map(h => (
                <div key={h.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${h.x_percent}%`, top: `${h.y_percent}%` }} onMouseDown={e => handleMarkerMouseDown(e, h.id)} onClick={e => { e.stopPropagation(); setSelectedHotspotId(h.id); }}>

                  {h.invisible ? (
                    /* ── ADMIN : hotspot invisible → contour pointillé violet ── */
                    <div className={`flex items-center justify-center w-11 h-11 rounded-full border-2 border-dashed bg-purple-900/20 ${selectedHotspotId === h.id ? 'ring-4 ring-white scale-125 border-purple-400' : 'hover:scale-110 border-purple-500/60'}`}>
                      <span className="text-base">👻</span>
                    </div>
                  ) : (
                    /* ── ADMIN : hotspot visible → rendu normal ── */
                    <div className={`flex items-center justify-center w-11 h-11 rounded-full border-2 bg-black/50 ${selectedHotspotId === h.id ? 'ring-4 ring-white scale-125' : 'hover:scale-110'}`} style={{ borderColor: h.color || '#ef4444' }}>
                      {h.type === 'character' && characters.find(c => c.id === h.character_id)?.avatar_url ? (
                        <img src={characters.find(c => c.id === h.character_id)?.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                      ) : h.icon_url ? (
                        <img src={h.icon_url} className="w-full h-full object-cover rounded-full" alt="" />
                      ) : (
                        <span className="text-lg">{h.icon}</span>
                      )}
                    </div>
                  )}

                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                    {h.invisible && <span className="text-purple-400 mr-1">👻</span>}{h.label_fr}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {selectedHotspot ? (
                <div className="bg-[#0f0f0f] p-4 rounded-xl border border-white/10 space-y-4 max-h-[700px] overflow-y-auto">
                  <div className="flex justify-between items-center"><h4 className="font-bold text-white">Configurer</h4><button onClick={() => deleteHotspot(selectedHotspot.id)} className="text-red-500"><Trash2 size={14} /></button></div>
                  <IconPicker currentIcon={selectedHotspot.icon} currentIconUrl={selectedHotspot.icon_url} onSelectEmoji={(e: string) => updateHotspot(selectedHotspot.id, { icon: e, icon_url: undefined })} onSelectCustomUrl={(u: string) => updateHotspot(selectedHotspot.id, { icon_url: u || undefined })} />
                  <ColorPicker currentColor={selectedHotspot.color || '#ef4444'} onSelect={(c: string) => updateHotspot(selectedHotspot.id, { color: c })} />

                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Type</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {HOTSPOT_TYPES.map(type => {
                        const cfg = HOTSPOT_CONFIG[type] || { color: '#fff', icon: '❓', label_fr: type };
                        return <div key={type} onClick={() => updateHotspot(selectedHotspot.id, { type, color: cfg.color, icon: cfg.icon, character_id: undefined, enigma_id: undefined, evidence_id: undefined })} className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs cursor-pointer border ${selectedHotspot.type === type ? 'border-white' : 'border-white/10 text-gray-400'}`} style={selectedHotspot.type === type ? { backgroundColor: cfg.color + '22', color: cfg.color } : {}}><span>{cfg.icon}</span><span className="truncate">{cfg.label_fr}</span></div>
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-gray-500 font-bold uppercase">Label FR</label><input type="text" value={selectedHotspot.label_fr} onChange={e => updateHotspot(selectedHotspot.id, { label_fr: e.target.value })} placeholder="Ex: Lettre compromise" className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-red-500" /></div>
                    <div><label className="text-[10px] text-gray-500 font-bold uppercase">Label EN</label>
                      <div className="flex gap-1">
                        <input type="text" value={selectedHotspot.label_en} onChange={e => updateHotspot(selectedHotspot.id, { label_en: e.target.value })} placeholder="Ex: Compromising letter" className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-red-500" />
                        <div onClick={async () => { if (!selectedHotspot.label_fr.trim()) return; setIsTranslating(true); try { const t = await autoTranslate(selectedHotspot.label_fr, 'fr'); updateHotspot(selectedHotspot.id, { label_en: t }); } catch { } setIsTranslating(false); }} className="p-1.5 bg-white/5 rounded cursor-pointer hover:bg-white/10 flex items-center">
                          {isTranslating ? <Loader2 size={12} className="animate-spin text-red-500" /> : <Languages size={12} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <HotspotContentForm hotspot={selectedHotspot} evidences={evidences} scenes={scenes} chapters={chapters} characters={characters} dialogueSpeakers={dialogueSpeakers} wordSearches={wordSearchesState} allEnigmas={allEnigmas} updateHotspot={updateHotspot} isTranslating={isTranslating} setIsTranslating={setIsTranslating} lang={lang} />


                  {/* ✅ INSTRUCTION DU HOTSPOT */}
                  <div className="pt-3 border-t border-white/10">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                      💡 Instruction à afficher (optionnel)
                    </label>
                    <select
                      value={selectedHotspot.instruction_id || ""}
                      onChange={(e) => updateHotspot(selectedHotspot.id, { instruction_id: e.target.value || undefined })}
                      className="w-full bg-[#1a1a1a] border border-blue-500/30 rounded px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                      <option value="">— Aucune instruction —</option>
                      {allInstructions.map((instr: any) => (
                        <option key={instr.id} value={instr.id}>
                          {instr.icon} {instr.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Cette instruction s'affichera quand le joueur interagit avec ce hotspot.
                    </p>
                  </div>



                  {/* ── MODE INVISIBLE ── */}
                  <div className="pt-3 border-t border-white/10">
                    <div
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => updateHotspot(selectedHotspot.id, { invisible: !selectedHotspot.invisible })}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{selectedHotspot.invisible ? '👻' : '👁️'}</span>
                          Hotspot Invisible
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {selectedHotspot.invisible
                            ? 'Le joueur ne voit rien — il doit cliquer par lui-même'
                            : 'Le joueur voit l\'icône et l\'animation'}
                        </p>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${selectedHotspot.invisible ? 'bg-purple-600' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${selectedHotspot.invisible ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>

                    {selectedHotspot.invisible && (
                      <div className="mt-2 px-3 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                        <p className="text-[10px] text-purple-300">
                          ⚠️ En mode admin, le hotspot reste visible (contour pointillé violet).
                          Seul le joueur ne le verra pas.
                        </p>
                      </div>
                    )}
                  </div>



                  {/* ✅ ÉVÉNEMENT NARRATIF (COMMUN À TOUS LES HOTSPOTS) */}
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={10} /> Déclencher un Événement Narratif</h4>
                    <select
                      value={selectedHotspot.trigger_event_id || ''}
                      onChange={e => updateHotspot(selectedHotspot.id, { trigger_event_id: e.target.value || undefined })}
                      className="w-full bg-[#1a1a1a] border border-purple-500/30 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                    >
                      <option value="">— Aucun événement lié —</option>
                      {(outroConfig?.narrative_events || []).map((ev: any) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.type === 'takeover' ? '🎬 Takeover' : '💭 Toast'} : {ev.name || `Événement ${ev.id.slice(0, 4)}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-600">Si défini, cet événement se déclenchera quand le joueur interagit avec ce hotspot (avec un léger délai).</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0f0f0f] p-6 rounded-xl border border-dashed border-white/10 text-center"><p className="text-4xl mb-2">📍</p><p className="text-gray-500 text-xs">Sélectionnez un hotspot</p></div>
              )}
            </div>
          </div>

          {showPreview && (
            <div className="mt-4 rounded-xl overflow-hidden border border-green-500/20 shadow-2xl">
              <MiniPanoramaViewer
                key={activeScene.id}
                panoramaUrl={activeScene.panorama_url}
                hotspots={hotspots}
                evidences={[]}
                solvedEnigmas={[]}
                lang={lang}
                onHotspotActivate={(h) => setSelectedHotspotId(h.id)}
                isEditorPreview={true}
                characters={characters}
                visualFilter={activeScene.visual_filter || 'none'}
                ambientAudioUrl={activeScene.ambient_audio_url}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}