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

export const WordDefinitionPopover = memo(
    ({ definition, onClose, isOpen, lang = 'en', word = '' }: WordDefinitionPopoverProps) => {
        const [audioUrl, setAudioUrl] = useState<string | null>(null);

        // ── Drag state ──────────────────────────────────────────────────────
        const [pos, setPos] = useState({ x: 0, y: 0 });
        const [isDragging, setIsDragging] = useState(false);
        const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
        const popoverRef = useRef<HTMLDivElement>(null);

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

        // ── Drag handlers ───────────────────────────────────────────────────
        const onMouseDown = useCallback((e: React.MouseEvent) => {
            setIsDragging(true);
            dragStart.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                elX: pos.x,
                elY: pos.y,
            };
            e.preventDefault();
        }, [pos]); // ✅ Ajoute pos

        useEffect(() => {
            if (!isDragging) return;

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
        }, [isDragging]);

        // Touch drag
        const onTouchStart = useCallback((e: React.TouchEvent) => {
            setIsDragging(true);
            dragStart.current = {
                mouseX: e.touches[0].clientX,
                mouseY: e.touches[0].clientY,
                elX: pos.x,
                elY: pos.y,
            };
        }, [pos]); // ✅ Ajoute pos

        useEffect(() => {
            if (!isDragging) return;
            const onTouchMove = (e: TouchEvent) => {
                const dx = e.touches[0].clientX - dragStart.current.mouseX;
                const dy = e.touches[0].clientY - dragStart.current.mouseY;
                setPos({ x: dragStart.current.elX + dx, y: dragStart.current.elY + dy });
                e.preventDefault();
            };
            const onTouchEnd = () => setIsDragging(false);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd);
            return () => {
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('touchend', onTouchEnd);
            };
        }, [isDragging]);

        if (!isOpen) return null;

        // ✅ Utilise word (qui vient du hook maintenant)
        const isWiktionary = (definition as any)?._source === 'wiktionary-fr';
        const wiktionaryUrl = `https://fr.wiktionary.org/wiki/${encodeURIComponent(word)}`;
        const freeDictUrl = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;

        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay transparent pour fermer en cliquant ailleurs */}
                        <div
                            className="fixed inset-0 z-[99]"
                            onClick={onClose}
                            aria-hidden="true"
                        />

                        <motion.div
                            ref={popoverRef}
                            initial={{ opacity: 0, scale: 0.92, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 10 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="fixed z-[100] w-80 max-w-[calc(100vw-2rem)]"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                                cursor: isDragging ? 'grabbing' : 'auto',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-br from-[#0d0d1a] to-[#060610] border border-[#D4AF37]/25 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">

                                {/* ── Drag handle ── */}
                                <div
                                    className="flex items-center justify-between px-4 py-2 bg-[#D4AF37]/5 border-b border-white/[0.05] cursor-grab active:cursor-grabbing select-none"
                                    onMouseDown={onMouseDown}
                                    onTouchStart={onTouchStart}
                                >
                                    <div className="flex items-center gap-2">
                                        <GripHorizontal size={14} className="text-gray-600" />
                                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-600">
                                            {lang === 'fr' ? 'Dictionnaire' : 'Dictionary'}
                                            {isWiktionary && (
                                                <span className="ml-1.5 text-[#D4AF37]/60">· Wiktionnaire</span>
                                            )}
                                        </span>
                                    </div>
                                    <button onClick={onClose}
                                        className="p-1 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all">
                                        <X size={13} />
                                    </button>
                                </div>

                                {/* ── Content ── */}
                                <div className="p-4">
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
                                                    className="flex items-center justify-center gap-1.5 text-xs text-[#D4AF37] hover:underline">
                                                    <ExternalLink size={10} />
                                                    {lang === 'fr' ? 'Chercher sur Wiktionnaire' : 'Search on Wiktionary'}
                                                </a>
                                                {lang === 'en' && (
                                                    <a 
                                                        href={freeDictUrl}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
                                                        <ExternalLink size={10} />
                                                        Merriam-Webster
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Word + phonetic */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="text-white font-serif text-lg font-bold leading-tight">
                                                        {definition.word || word}
                                                    </h3>
                                                    {definition.phonetic && (
                                                        <p className="text-gray-500 text-xs italic mt-0.5">
                                                            {definition.phonetic}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Audio button (EN only) */}
                                                {audioUrl && (
                                                    <button
                                                        onClick={() => {
                                                            const audio = new Audio(audioUrl);
                                                            audio.play().catch(err => console.error('Audio error:', err));
                                                        }}
                                                        className="flex-shrink-0 p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all text-[#D4AF37] ml-3"
                                                        title="Pronunciation"
                                                    >
                                                        <Volume2 size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Meanings */}
                                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                                                {definition.meanings.map((meaning, idx) => (
                                                    <div key={idx}
                                                        className="border-t border-white/[0.06] pt-3 first:border-0 first:pt-0">
                                                        {/* Part of speech */}
                                                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] uppercase tracking-wider mb-2">
                                                            {meaning.partOfSpeech}
                                                        </span>

                                                        <div className="space-y-2">
                                                            {meaning.definitions.slice(0, 2).map((def, i) => (
                                                                <div key={i}>
                                                                    <p className="text-gray-300 text-xs leading-relaxed">
                                                                        <span className="text-gray-600 mr-1 font-mono">{i + 1}.</span>
                                                                        {def.definition}
                                                                    </p>
                                                                    {def.example && (
                                                                        <p className="text-gray-600 italic text-[10px] mt-1 pl-3 border-l border-white/10">
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
                                                                {meaning.synonyms.slice(0, 4).map(syn => (
                                                                    <span key={syn}
                                                                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
                                                                        {syn}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Source link */}
                                            <div className="mt-3 pt-3 border-t border-white/[0.05]">
                                                <a
                                                    href={isWiktionary ? wiktionaryUrl : freeDictUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[9px] text-gray-600 hover:text-[#D4AF37] transition-colors"
                                                >
                                                    <ExternalLink size={8} />
                                                    {isWiktionary ? 'Wiktionnaire' : 'Merriam-Webster'}
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