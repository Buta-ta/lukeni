'use client';

import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, GripHorizontal, ExternalLink } from 'lucide-react';
import { DictionaryResult } from '@/lib/types/external-apis';

interface WordDefinitionPopoverProps {
  definition: DictionaryResult | null;
  onClose: () => void;
  isOpen: boolean;
  lang?: 'fr' | 'en';
  word?: string;
}

// ── Helper de détection mobile ──
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

export const WordDefinitionPopover = memo(
    ({ definition, onClose, isOpen, lang = 'en', word = '' }: WordDefinitionPopoverProps) => {
        const [audioUrl, setAudioUrl] = useState<string | null>(null);
        const [isMobile, setIsMobile] = useState(false);

        // ── Drag state ──────────────────────────────────────────────────────
        const [pos, setPos] = useState({ x: 0, y: 0 });
        const [isDragging, setIsDragging] = useState(false);
        const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
        const popoverRef = useRef<HTMLDivElement>(null);

        // Détecter mobile au montage
        useEffect(() => {
            setIsMobile(isMobileDevice());
            const handleResize = () => setIsMobile(isMobileDevice());
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        // Reset position quand on change de mot
        useEffect(() => {
            if (isOpen) setPos({ x: 0, y: 0 });
        }, [isOpen, word]);

        useEffect(() => {
            if (definition?.phonetics) {
                const phoneticWithAudio = definition.phonetics.find(p => p.audio);
                setAudioUrl(phoneticWithAudio?.audio || null);
            } else {
                setAudioUrl(null);
            }
        }, [definition]);

        // ── Drag handlers (desktop uniquement) ──────────────────────────────
        const onMouseDown = useCallback((e: React.MouseEvent) => {
            if (isMobile) return; // Pas de drag sur mobile
            setIsDragging(true);
            dragStart.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                elX: pos.x,
                elY: pos.y,
            };
            e.preventDefault();
        }, [pos, isMobile]);

        useEffect(() => {
            if (!isDragging || isMobile) return;

            const onMouseMove = (e: MouseEvent) => {
                const dx = e.clientX - dragStart.current.mouseX;
                const dy = e.clientY - dragStart.current.mouseY;
                setPos({ x: dragStart.current.elX + dx, y: dragStart.current.elY + dy });
            };
            const onMouseUp = () => setIsDragging(false);

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
        }, [isDragging, isMobile]);

        if (!isOpen) return null;

        const isWiktionary = (definition as any)?._source === 'wiktionary-fr';
        const wiktionaryUrl = `https://fr.wiktionary.org/wiki/${encodeURIComponent(word)}`;
        const freeDictUrl = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;

        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm"
                            onClick={onClose}
                            aria-hidden="true"
                        />

                        {/* Popover - Bottom sheet sur mobile, centré sur desktop */}
                        <motion.div
                            ref={popoverRef}
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 10 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 10 }}
                            transition={
                                isMobile
                                    ? { type: 'spring', damping: 30, stiffness: 300 }
                                    : { duration: 0.18, ease: 'easeOut' }
                            }
                            className={`fixed z-[100] ${
                                isMobile
                                    ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh]'
                                    : 'left-1/2 top-1/2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl'
                            }`}
                            style={
                                isMobile
                                    ? undefined
                                    : {
                                          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                                          cursor: isDragging ? 'grabbing' : 'auto',
                                      }
                            }
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-br from-[#0d0d1a] to-[#060610] border border-[#D4AF37]/25 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden h-full flex flex-col rounded-t-3xl sm:rounded-2xl">

                                {/* ── Handle mobile (swipe indicator) ── */}
                                {isMobile && (
                                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 flex-shrink-0" />
                                )}

                                {/* ── Drag handle / Header ── */}
                                <div
                                    className={`flex items-center justify-between px-4 py-2 bg-[#D4AF37]/5 border-b border-white/[0.05] select-none flex-shrink-0 ${
                                        !isMobile ? 'cursor-grab active:cursor-grabbing' : ''
                                    }`}
                                    onMouseDown={onMouseDown}
                                    style={{ touchAction: isMobile ? 'none' : 'auto' }}
                                >
                                    <div className="flex items-center gap-2">
                                        {!isMobile && <GripHorizontal size={14} className="text-gray-600" />}
                                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-600">
                                            {lang === 'fr' ? 'Dictionnaire' : 'Dictionary'}
                                            {isWiktionary && (
                                                <span className="ml-1.5 text-[#D4AF37]/60">· Wiktionnaire</span>
                                            )}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 -m-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                                        style={{ minWidth: 44, minHeight: 44 }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* ── Content (scrollable) ── */}
                                <div className={`p-4 overflow-y-auto flex-1 ${isMobile ? 'pb-6' : ''}`}>
                                    {!definition ? (
                                        // Mot non trouvé
                                        <div className="text-center py-4">
                                            <p className="text-gray-400 text-sm mb-3">
                                                {lang === 'fr'
                                                    ? `« ${word} » introuvable dans le dictionnaire`
                                                    : `"${word}" not found in dictionary`}
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                <a
                                                    href={wiktionaryUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 text-xs text-[#D4AF37] hover:underline py-2"
                                                >
                                                    <ExternalLink size={12} />
                                                    {lang === 'fr' ? 'Chercher sur Wiktionnaire' : 'Search on Wiktionary'}
                                                </a>
                                                {lang === 'en' && (
                                                    <a
                                                        href={freeDictUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors py-2"
                                                    >
                                                        <ExternalLink size={12} />
                                                        Merriam-Webster
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Word + phonetic */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white font-serif text-lg sm:text-xl font-bold leading-tight">
                                                        {definition.word || word}
                                                    </h3>
                                                    {definition.phonetic && (
                                                        <p className="text-gray-500 text-xs sm:text-sm italic mt-0.5">
                                                            {definition.phonetic}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Audio button */}
                                                {audioUrl && (
                                                    <button
                                                        onClick={() => {
                                                            const audio = new Audio(audioUrl);
                                                            audio.play().catch(err => console.error('Audio error:', err));
                                                        }}
                                                        className="flex-shrink-0 p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all text-[#D4AF37] ml-3 touch-manipulation"
                                                        style={{ minWidth: 44, minHeight: 44 }}
                                                        title="Pronunciation"
                                                    >
                                                        <Volume2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Meanings */}
                                            <div className="space-y-3">
                                                {definition.meanings.map((meaning, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="border-t border-white/[0.06] pt-3 first:border-0 first:pt-0"
                                                    >
                                                        {/* Part of speech */}
                                                        <span className="inline-block text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] uppercase tracking-wider mb-2">
                                                            {meaning.partOfSpeech}
                                                        </span>

                                                        <div className="space-y-2">
                                                            {meaning.definitions.slice(0, 3).map((def, i) => (
                                                                <div key={i}>
                                                                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                                                                        <span className="text-gray-600 mr-1 font-mono">
                                                                            {i + 1}.
                                                                        </span>
                                                                        {def.definition}
                                                                    </p>
                                                                    {def.example && (
                                                                        <p className="text-gray-600 italic text-[10px] sm:text-xs mt-1 pl-3 border-l border-white/10">
                                                                            "{def.example}"
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {meaning.synonyms && meaning.synonyms.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                <span className="text-[9px] text-gray-600">
                                                                    {lang === 'fr' ? 'Syn.' : 'Syn.'}
                                                                </span>
                                                                {meaning.synonyms.slice(0, 5).map(syn => (
                                                                    <span
                                                                        key={syn}
                                                                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400"
                                                                    >
                                                                        {syn}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Source link */}
                                            <div className="mt-4 pt-3 border-t border-white/[0.05]">
                                                <a
                                                    href={isWiktionary ? wiktionaryUrl : freeDictUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-600 hover:text-[#D4AF37] transition-colors py-2 touch-manipulation"
                                                >
                                                    <ExternalLink size={10} />
                                                    {isWiktionary ? 'Voir sur Wiktionnaire' : 'View on Merriam-Webster'}
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }
);
WordDefinitionPopover.displayName = 'WordDefinitionPopover';