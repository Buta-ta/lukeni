// components/game/EvidenceModal.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star } from "lucide-react";
import { Hotspot, HOTSPOT_CONFIG } from "@/types/panorama";

interface Props {
  hotspot: Hotspot | null;
  evidence: any | null;
  lang?: 'fr' | 'en';
  onClose: () => void;
  onEvidenceCollected?: (evidenceId: string) => void;
}

export default function EvidenceModal({
  hotspot,
  evidence,
  lang = 'fr',
  onClose,
  onEvidenceCollected,
}: Props) {
  if (!hotspot) return null;

  const config = HOTSPOT_CONFIG[hotspot.type] || HOTSPOT_CONFIG.evidence;
  
  // ✅ INTELLIGENCE UI : On récupère la couleur et l'icône exactes choisies par l'admin
  const activeColor = hotspot.color || config.color;
  const hasCustomImage = !!hotspot.icon_url;
  const activeIcon = hotspot.icon || config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#0a0a0a] rounded-2xl border max-w-lg w-full overflow-hidden shadow-2xl"
          style={{ borderColor: activeColor + '44' }} // 🎨 Utilise la couleur du hotspot
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-5 border-b"
            style={{ borderColor: activeColor + '22', backgroundColor: activeColor + '11' }}
          >
            <div className="flex items-center gap-3">
              {/* 🎨 Affichage intelligent de l'icône */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: activeColor + '33', border: `2px solid ${activeColor}` }}
              >
                {hasCustomImage ? (
                  <img src={hotspot.icon_url} alt="icon" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{activeIcon}</span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: activeColor }}>
                  {lang === 'fr' ? config.label_fr : config.label_en}
                </p>
                <h3 className="text-white font-bold text-lg">
                  {lang === 'fr' ? hotspot.label_fr : hotspot.label_en}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-5">

            {/* ── TYPE INFO ── */}
            {hotspot.type === 'info' && (
              <div className="space-y-4">
                <p className="text-gray-200 leading-relaxed font-serif text-sm md:text-base">
                  {lang === 'fr' ? hotspot.info_text_fr : hotspot.info_text_en}
                </p>
                {hotspot.inline_audio_url && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">
                      Audio
                    </p>
                    <audio
                      src={hotspot.inline_audio_url}
                      controls
                      autoPlay
                      className="w-full h-8"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── TYPE IMAGE INLINE ── */}
            {hotspot.type === 'image' && hotspot.inline_image_url && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <img
                    src={hotspot.inline_image_url}
                    alt=""
                    className="w-full max-h-80 object-contain"
                  />
                </div>
                {(hotspot.inline_image_caption_fr || hotspot.inline_image_caption_en) && (
                  <p className="text-gray-400 text-xs text-center italic">
                    {lang === 'fr' ? hotspot.inline_image_caption_fr : hotspot.inline_image_caption_en}
                  </p>
                )}
              </div>
            )}

            {/* ── TYPE EVIDENCE / AUDIO / DOCUMENT (médias liés) ── */}
            {['evidence', 'audio', 'document'].includes(hotspot.type) && (
              evidence ? (
                <div className="space-y-4">
                  {evidence.media_type === 'image' && (
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={evidence.media_url}
                        alt="Pièce à conviction"
                        className="w-full object-contain max-h-72 bg-black"
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)' }}
                      />
                    </div>
                  )}
                  {evidence.media_type === 'audio' && (
                    <div
                      className="p-6 rounded-xl flex flex-col items-center gap-4"
                      style={{ backgroundColor: activeColor + '11' }}
                    >
                      <div className="text-5xl animate-pulse">🎵</div>
                      <audio src={evidence.media_url} controls autoPlay className="w-full" />
                      <p className="text-xs text-gray-400 text-center">
                        {lang === 'fr' ? 'Témoignage audio' : 'Audio testimony'}
                      </p>
                    </div>
                  )}
                  {evidence.media_type === 'video' && (
                    <video
                      src={evidence.media_url}
                      controls
                      autoPlay
                      className="w-full rounded-xl max-h-64 bg-black"
                    />
                  )}
                  {evidence.media_type === 'document' && (
                    <iframe src={evidence.media_url} className="w-full h-64 rounded-xl bg-white" />
                  )}
                </div>
              ) : (
                <div
                  className="p-8 rounded-xl text-center"
                  style={{ backgroundColor: activeColor + '11' }}
                >
                  <p className="text-5xl mb-3">{activeIcon}</p>
                  <p className="text-gray-400 text-sm">
                    {lang === 'fr' ? 'Aucun média lié à cet indice.' : 'No media linked to this clue.'}
                  </p>
                </div>
              )
            )}

            {/* ── Bouton collecter (uniquement pour les médias liés) ── */}
            {['evidence', 'audio', 'document'].includes(hotspot.type) && evidence && onEvidenceCollected && (
              <button
                onClick={() => { onEvidenceCollected(evidence.id); onClose(); }}
                className="w-full mt-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110"
                style={{ backgroundColor: activeColor }}
              >
                <Star size={16} fill="currentColor" />
                {lang === 'fr' ? 'Ajouter à mon dossier' : 'Add to my case file'}
              </button>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}