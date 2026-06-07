'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Loader2, Clock, Moon
} from 'lucide-react';
import { useNotesplit } from '@/lib/hooks/useNotesplit';

interface NotesplitContainerProps {
    itemId: string;
    itemType: 'article' | 'press' | 'wiki' | 'scholar' | 'book';
    userId?: string;
    catColor?: string;
    lang?: 'fr' | 'en';
    children: React.ReactNode;
    mode?: 'bottom' | 'side';
}

// ─── HOOK MOBILE ───────────────────────────
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check(); 
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
}

const CaurisIcon = ({ className, style }: { className?: string; style?: React.CSSProperties; }) => (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="currentColor">
        <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
        <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
        <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ─── STARFIELD OPTIMISÉ ───────────────────────────────────────────────────────
interface StarData { id: number; x: number; y: number; size: number; duration: number; delay: number; depth: number; }
interface NebulaData { id: number; x: number; y: number; size: number; color: string; opacity: number; }

function NotesStarField({ catColor, isMobile }: { catColor: string, isMobile: boolean }) {
    const stars = useMemo<StarData[]>(() =>
        Array.from({ length: isMobile ? 30 : 120 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 1.8 + 0.4,
            duration: Math.random() * 4 + 2,
            delay: Math.random() * 3,
            depth: Math.random() * 10 + 2,
        })), [isMobile]);

    const nebulae = useMemo<NebulaData[]>(() => {
        if (isMobile) return [{ id: 1, x: 50, y: 50, size: 200, color: catColor, opacity: 0.05 }];
        return [
            { id: 1, x: 15, y: 30, size: 180, color: '#9370DB', opacity: 0.12 },
            { id: 2, x: 70, y: 60, size: 150, color: catColor, opacity: 0.10 },
            { id: 3, x: 45, y: 80, size: 130, color: '#20B2AA', opacity: 0.08 },
            { id: 4, x: 85, y: 20, size: 120, color: '#FF6B9D', opacity: 0.07 },
        ];
    }, [catColor, isMobile]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ willChange: 'transform' }}>
            {nebulae.map((nebula) => (
                <motion.div
                    key={`nebula-${nebula.id}`}
                    className="absolute rounded-full"
                    style={{
                        left: `${nebula.x}%`, top: `${nebula.y}%`,
                        width: nebula.size, height: nebula.size,
                        transform: 'translate(-50%, -50%)',
                        background: `radial-gradient(circle, ${nebula.color}${Math.round(nebula.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                        filter: isMobile ? 'none' : 'blur(30px)',
                        willChange: 'opacity, transform'
                    }}
                    animate={{ scale: [1, 1.1, 1], opacity: [nebula.opacity * 0.7, nebula.opacity * 1.2, nebula.opacity * 0.7] }}
                    transition={{ duration: 10 + nebula.id * 3, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
            {stars.map((star) => (
                <motion.div
                    key={`star-${star.id}`}
                    className="absolute rounded-full bg-white"
                    style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, willChange: 'opacity' }}
                    animate={{ opacity: [0.1, 0.7, 0.1] }}
                    transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: 'easeInOut' }}
                />
            ))}
            {!isMobile && (
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.08 }}>
                    <motion.line x1="15%" y1="20%" x2="30%" y2="35%" stroke="white" strokeWidth="0.5" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity }} />
                    <motion.line x1="30%" y1="35%" x2="50%" y2="25%" stroke="white" strokeWidth="0.5" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }} />
                    <motion.line x1="50%" y1="25%" x2="70%" y2="40%" stroke="white" strokeWidth="0.5" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} />
                </svg>
            )}
        </div>
    );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export function NotesplitContainer({
    itemId,
    itemType,
    userId,
    catColor = '#D4AF37',
    lang = 'fr',
    children,
    mode = 'bottom',
}: NotesplitContainerProps) {
    const {
        content, isOpen, isSaving, lastSaved, error,
        handleContentChange, toggleNotes,
    } = useNotesplit({ itemId, itemType, userId });

    const isMobile = useIsMobile();
    const [notesHeight, setNotesHeight] = useState(340);
    const [notesWidth, setNotesWidth] = useState(380);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startSize = useRef(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [cursorParticles, setCursorParticles] = useState<{ id: number; x: number; y: number }[]>([]);
    const particleIdRef = useRef(0);

    // ── Resizing ──
    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true; startPos.current = e.clientY; startSize.current = notesHeight; e.preventDefault();
    }, [notesHeight]);
    const onResizeTouchStart = useCallback((e: React.TouchEvent) => {
        isDragging.current = true; startPos.current = e.touches[0].clientY; startSize.current = notesHeight;
    }, [notesHeight]);
    const onSideResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true; startPos.current = e.clientX; startSize.current = notesWidth; e.preventDefault();
    }, [notesWidth]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            if (mode === 'side') setNotesWidth(Math.min(Math.max(startSize.current + (startPos.current - e.clientX), 280), window.innerWidth * 0.55));
            else setNotesHeight(Math.min(Math.max(startSize.current + (startPos.current - e.clientY), 200), window.innerHeight * 0.85));
        };
        const onTouchMove = (e: TouchEvent) => {
            if (!isDragging.current) return;
            setNotesHeight(Math.min(Math.max(startSize.current + (startPos.current - e.touches[0].clientY), 200), window.innerHeight * 0.85));
        };
        const onUp = () => { isDragging.current = false; };
        window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false }); window.addEventListener('touchend', onUp);
        return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onUp); };
    }, [mode]);

    // ── Particules curseur ──
    const handleTextareaMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
        if (isMobile) return; 
        if (Math.random() > 0.85) {
            const rect = e.currentTarget.getBoundingClientRect();
            const newParticle = { id: particleIdRef.current++, x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCursorParticles(prev => [...prev.slice(-8), newParticle]);
            setTimeout(() => setCursorParticles(prev => prev.filter(p => p.id !== newParticle.id)), 800);
        }
    }, [isMobile]);

    const panelContent = (
        <>
            <NotesStarField catColor={catColor} isMobile={isMobile} />

            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 z-10" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                <div className="flex items-center gap-3">
                    <Moon size={16} style={{ color: catColor }} />
                    <div>
                        <p className="text-white font-bold text-sm flex items-center gap-2">
                            {lang === 'fr' ? 'Mes notes' : 'My notes'}
                        </p>
                        <p className="text-gray-600 text-[10px]">
                            {lastSaved ? `${lang === 'fr' ? 'Sauvegardé à' : 'Saved at'} ${lastSaved.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : (lang === 'fr' ? 'Privé & Sécurisé' : 'Private & Secure')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSaving && <Loader2 size={13} className="animate-spin" style={{ color: catColor }} />}
                    {!isSaving && !error && lastSaved && <span className="hidden sm:flex items-center gap-1 text-green-400 text-[10px]"><Clock size={11} /> Synced</span>}
                    
                    <button onClick={toggleNotes} className="p-1.5 rounded-lg transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative z-10 overflow-hidden">
                <div className="relative h-full">
                    {!isMobile && cursorParticles.map((p) => (
                        <motion.div key={p.id} className="absolute pointer-events-none rounded-full z-20"
                            style={{ left: p.x, top: p.y, width: 4, height: 4, backgroundColor: catColor, boxShadow: `0 0 6px ${catColor}` }}
                            initial={{ opacity: 0.8, scale: 1 }} animate={{ opacity: 0, scale: 0, y: -15 }} transition={{ duration: 0.8 }} />
                    ))}
                    <textarea ref={textareaRef} value={content} onChange={(e) => handleContentChange(e.target.value)} onMouseMove={handleTextareaMouseMove}
                        placeholder={userId ? (lang === 'fr' ? '✨ Vos notes personnelles (visibles uniquement par vous)...' : '✨ Your personal notes (visible only to you)...') : (lang === 'fr' ? '🌙 Connectez-vous pour sauvegarder vos notes...' : '🌙 Sign in to save your notes...')}
                        className="absolute inset-0 w-full h-full px-5 py-4 bg-transparent outline-none resize-none text-sm leading-relaxed"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'rgba(255,255,255,0.85)', caretColor: catColor }} dir="ltr" />
                </div>
            </div>
            
            <div className="flex-shrink-0 px-5 py-2 z-10 flex justify-between items-center" style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{content.length} {lang === 'fr' ? 'caractères' : 'characters'}</span>
            </div>
        </>
    );

    if (mode === 'bottom') {
        return (
            <>
                <div style={{ paddingBottom: isOpen ? notesHeight + 48 : 0, transition: 'padding-bottom 0.35s ease' }}>{children}</div>
                <AnimatePresence>
                    {!isOpen && (
                        <motion.button key="open-btn" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            onClick={toggleNotes} className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl"
                            style={{ background: `linear-gradient(135deg, ${catColor}ee, ${catColor})`, color: '#000' }}>
                            <CaurisIcon className="w-4 h-4" /> <span>{lang === 'fr' ? 'Notes' : 'Notes'}</span>
                        </motion.button>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div key="notes-panel" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 90, damping: 18 }} className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col overflow-hidden"
                            style={{ height: notesHeight, background: '#020111', borderTop: `1px solid ${catColor}30` }}>
                            <div className="relative flex-shrink-0 flex items-center justify-center h-10 cursor-row-resize z-10" onMouseDown={onResizeMouseDown} onTouchStart={onResizeTouchStart}>
                                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${catColor}80, transparent)` }} />
                                <CaurisIcon className="w-5 h-5 opacity-50" style={{ color: catColor }} />
                            </div>
                            {panelContent}
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    }

    return (
        <>
            {children}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button key="side-open-btn" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        onClick={toggleNotes} className="fixed right-0 top-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-2 py-5 px-3"
                        style={{ background: `linear-gradient(180deg, ${catColor}ee, ${catColor})`, color: '#000', borderRadius: '12px 0 0 12px' }}>
                        <CaurisIcon className="w-4 h-4" />
                        <span className="text-[11px] font-bold tracking-[0.15em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                            {lang === 'fr' ? 'Notes' : 'Notes'}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOpen && (
                    <motion.div key="side-notes-panel" initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 90, damping: 18 }} className="fixed top-0 right-0 bottom-0 z-[150] flex flex-row overflow-hidden"
                        style={{ width: isMobile ? '100vw' : notesWidth, background: '#020111', borderLeft: `1px solid ${catColor}30` }}>
                        {!isMobile && (
                            <div className="relative flex-shrink-0 flex items-center justify-center w-5 cursor-col-resize z-10 h-full" onMouseDown={onSideResizeMouseDown}>
                                <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: `linear-gradient(180deg, transparent, ${catColor}80, transparent)` }} />
                            </div>
                        )}
                        <div className="flex-1 flex flex-col overflow-hidden relative">{panelContent}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}