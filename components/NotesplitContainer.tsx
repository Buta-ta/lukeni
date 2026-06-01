'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Loader2, AlertCircle, Clock, Download,
    FileText, FileJson, Bold, Italic, Underline,
    Highlighter, List, Languages, Sparkles, Moon, Star
} from 'lucide-react';
import { useNotesplit } from '@/lib/hooks/useNotesplit';

interface NotesplitContainerProps {
    itemId: string;
    itemType: 'article' | 'press' | 'wiki' | 'scholar' | 'book';
    userId?: string;
    catColor?: string;
    lang?: 'fr' | 'en';
    children: React.ReactNode;
    // ← NOUVEAU : mode latéral pour la bibliothèque
    mode?: 'bottom' | 'side';
}

// ... (tous les composants internes restent identiques : CaurisIcon, NotesStarField, helpers)

const CaurisIcon = ({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) => (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="currentColor">
        <path d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
        <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" />
        <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ─── STARFIELD (identique) ────────────────────────────────────────────────────

interface StarData {
    id: number; x: number; y: number; size: number;
    duration: number; delay: number; depth: number;
}
interface ShootingStarData {
    id: number; startX: number; startY: number; angle: number;
    duration: number; delay: number; length: number;
}
interface NebulaData {
    id: number; x: number; y: number; size: number; color: string; opacity: number;
}

function NotesStarField({ catColor }: { catColor: string }) {
    const stars = useMemo<StarData[]>(() =>
        Array.from({ length: 120 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 1.8 + 0.4,
            duration: Math.random() * 4 + 2,
            delay: Math.random() * 3,
            depth: Math.random() * 10 + 2,
        })), []);

    const shootingStars = useMemo<ShootingStarData[]>(() =>
        Array.from({ length: 4 }).map((_, i) => ({
            id: i,
            startX: Math.random() * 80 + 10,
            startY: Math.random() * 40,
            angle: 35 + Math.random() * 20,
            duration: 1.2 + Math.random() * 0.8,
            delay: i * 7 + Math.random() * 5,
            length: 60 + Math.random() * 40,
        })), []);

    const nebulae = useMemo<NebulaData[]>(() => [
        { id: 1, x: 15, y: 30, size: 180, color: '#9370DB', opacity: 0.12 },
        { id: 2, x: 70, y: 60, size: 150, color: catColor, opacity: 0.10 },
        { id: 3, x: 45, y: 80, size: 130, color: '#20B2AA', opacity: 0.08 },
        { id: 4, x: 85, y: 20, size: 120, color: '#FF6B9D', opacity: 0.07 },
    ], [catColor]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {nebulae.map((nebula) => (
                <motion.div
                    key={`nebula-${nebula.id}`}
                    className="absolute rounded-full"
                    style={{
                        left: `${nebula.x}%`,
                        top: `${nebula.y}%`,
                        width: nebula.size,
                        height: nebula.size,
                        transform: 'translate(-50%, -50%)',
                        background: `radial-gradient(circle, ${nebula.color}${Math.round(nebula.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                        filter: 'blur(30px)',
                    }}
                    animate={{ scale: [1, 1.2, 1], opacity: [nebula.opacity * 0.6, nebula.opacity * 1.4, nebula.opacity * 0.6] }}
                    transition={{ duration: 8 + nebula.id * 3, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
            {stars.map((star) => (
                <motion.div
                    key={`star-${star.id}`}
                    className="absolute rounded-full bg-white"
                    style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
                    animate={{ opacity: [0.1, 0.7, 0.1], scale: [0.8, 1.3, 0.8] }}
                    transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: 'easeInOut' }}
                />
            ))}
            {stars.filter((_, i) => i % 8 === 0).map((star) => (
                <motion.div
                    key={`glow-star-${star.id}`}
                    className="absolute rounded-full"
                    style={{
                        left: `${(star.x + 5) % 100}%`,
                        top: `${(star.y + 5) % 100}%`,
                        width: star.size + 1,
                        height: star.size + 1,
                        backgroundColor: star.id % 3 === 0 ? catColor : '#ffffff',
                        boxShadow: star.id % 3 === 0
                            ? `0 0 ${star.size * 4}px ${star.size}px ${catColor}80`
                            : `0 0 ${star.size * 3}px ${star.size}px rgba(255,255,255,0.6)`,
                    }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
                    transition={{ duration: star.duration * 1.5, repeat: Infinity, delay: star.delay * 0.5, ease: 'easeInOut' }}
                />
            ))}
            {shootingStars.map((s) => (
                <motion.div
                    key={`shoot-${s.id}`}
                    className="absolute"
                    style={{
                        left: `${s.startX}%`, top: `${s.startY}%`,
                        width: s.length, height: 2, borderRadius: 1,
                        background: `linear-gradient(90deg, transparent, ${catColor}, white)`,
                        transformOrigin: 'left center',
                        rotate: `${s.angle}deg`,
                    }}
                    initial={{ opacity: 0, scaleX: 0, x: 0, y: 0 }}
                    animate={{
                        opacity: [0, 1, 0], scaleX: [0, 1, 1],
                        x: [0, s.length * 1.5],
                        y: [0, s.length * Math.tan((s.angle * Math.PI) / 180)],
                    }}
                    transition={{ duration: s.duration, repeat: Infinity, repeatDelay: s.delay + 12, ease: 'easeOut' }}
                />
            ))}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.08 }}>
                <motion.line x1="15%" y1="20%" x2="30%" y2="35%" stroke="white" strokeWidth="0.5"
                    animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity }} />
                <motion.line x1="30%" y1="35%" x2="50%" y2="25%" stroke="white" strokeWidth="0.5"
                    animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }} />
                <motion.line x1="50%" y1="25%" x2="70%" y2="40%" stroke="white" strokeWidth="0.5"
                    animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} />
                <motion.line x1="70%" y1="40%" x2="85%" y2="30%" stroke="white" strokeWidth="0.5"
                    animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 6, repeat: Infinity, delay: 1.5 }} />
                <motion.line x1="20%" y1="70%" x2="40%" y2="60%" stroke={catColor} strokeWidth="0.5"
                    animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }} />
                <motion.line x1="40%" y1="60%" x2="60%" y2="75%" stroke={catColor} strokeWidth="0.5"
                    animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 8, repeat: Infinity, delay: 2.5 }} />
                {[
                    { cx: '15%', cy: '20%' }, { cx: '30%', cy: '35%' }, { cx: '50%', cy: '25%' },
                    { cx: '70%', cy: '40%' }, { cx: '85%', cy: '30%' }, { cx: '20%', cy: '70%' },
                    { cx: '40%', cy: '60%' }, { cx: '60%', cy: '75%' },
                ].map((node, i) => (
                    <motion.circle key={`node-${i}`} cx={node.cx} cy={node.cy} r="1.5" fill="white"
                        animate={{ opacity: [0.4, 1, 0.4], r: [1, 2, 1] }}
                        transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }} />
                ))}
            </svg>
        </div>
    );
}

// ─── HELPERS (identiques) ─────────────────────────────────────────────────────

function prettifyItemId(raw: string): string {
    if (!raw) return '';
    const withoutUuid = raw.replace(/^[0-9a-f]{6,8}-/i, '');
    return withoutUuid.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function markdownToHtml(text: string): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = escaped.split('\n');
    const result: string[] = [];
    let inUl = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
            if (!inUl) { result.push('<ul>'); inUl = true; }
            result.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
        } else {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (!trimmed) result.push('<br>');
            else result.push(`<p>${formatInline(trimmed)}</p>`);
        }
    }
    if (inUl) result.push('</ul>');
    return result.join('\n');
}

function formatInline(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/==(.*?)==/g, '<mark>$1</mark>');
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export function NotesplitContainer({
    itemId,
    itemType,
    userId,
    catColor = '#D4AF37',
    lang = 'fr',
    children,
    mode = 'bottom', // ← défaut : comportement actuel préservé
}: NotesplitContainerProps) {
    const {
        content, isOpen, isSaving, lastSaved, error, isOnline,
        pendingSync, tags, handleContentChange, toggleNotes, removeTag, handleTagInput,
    } = useNotesplit({ itemId, itemType, userId });

    // ── States communs ────────────────────────────────────────────────────────

    // Pour le mode bottom : resize vertical
    const [notesHeight, setNotesHeight] = useState(340);

    // Pour le mode side : resize horizontal
    const [notesWidth, setNotesWidth] = useState(380);

    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startSize = useRef(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedContent, setTranslatedContent] = useState<string | null>(null);
    const [displayLang, setDisplayLang] = useState<'fr' | 'en'>(lang);

    const [cursorParticles, setCursorParticles] = useState<{ id: number; x: number; y: number }[]>([]);
    const particleIdRef = useRef(0);

    useEffect(() => { setDisplayLang(lang); setTranslatedContent(null); }, [lang]);

    // ── Resize — bottom (vertical) ────────────────────────────────────────────
    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startPos.current = e.clientY;
        startSize.current = notesHeight;
        e.preventDefault();
    }, [notesHeight]);

    const onResizeTouchStart = useCallback((e: React.TouchEvent) => {
        isDragging.current = true;
        startPos.current = e.touches[0].clientY;
        startSize.current = notesHeight;
    }, [notesHeight]);

    // ── Resize — side (horizontal) ────────────────────────────────────────────
    const onSideResizeMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startPos.current = e.clientX;
        startSize.current = notesWidth;
        e.preventDefault();
    }, [notesWidth]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            if (mode === 'side') {
                // Drag depuis la gauche du panneau → on tire vers la gauche pour agrandir
                const delta = startPos.current - e.clientX;
                setNotesWidth(Math.min(Math.max(startSize.current + delta, 280), window.innerWidth * 0.55));
            } else {
                const delta = startPos.current - e.clientY;
                setNotesHeight(Math.min(Math.max(startSize.current + delta, 200), window.innerHeight * 0.85));
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (!isDragging.current) return;
            const delta = startPos.current - e.touches[0].clientY;
            setNotesHeight(Math.min(Math.max(startSize.current + delta, 200), window.innerHeight * 0.85));
        };
        const onUp = () => { isDragging.current = false; };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [mode]);

    // ── Particules curseur ────────────────────────────────────────────────────
    const handleTextareaMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
        if (Math.random() > 0.85) {
            const rect = e.currentTarget.getBoundingClientRect();
            const newParticle = { id: particleIdRef.current++, x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCursorParticles(prev => [...prev.slice(-8), newParticle]);
            setTimeout(() => setCursorParticles(prev => prev.filter(p => p.id !== newParticle.id)), 800);
        }
    }, []);

    // ── Traduction ────────────────────────────────────────────────────────────
    const handleTranslate = useCallback(async () => {
        if (!content.trim()) return;
        if (translatedContent !== null) { setTranslatedContent(null); setDisplayLang(lang); return; }
        const targetLang = lang === 'fr' ? 'en' : 'fr';
        setIsTranslating(true);
        try {
            const res = await fetch('/api/proxy/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: content, text: content, source: 'auto', target: targetLang }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const result: string = data.translated || data.translatedText || '';
            if (!result) throw new Error('Empty translation');
            setTranslatedContent(result);
            setDisplayLang(targetLang);
        } catch {
            window.open(
                `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(content.slice(0, 500))}&op=translate`,
                '_blank', 'noopener,noreferrer'
            );
        } finally { setIsTranslating(false); }
    }, [content, lang, translatedContent]);

    // ── Exports ───────────────────────────────────────────────────────────────
    const prettyTitle = prettifyItemId(itemId);
    const exportDate = new Date().toISOString().split('T')[0];

    const exportToTXT = useCallback(() => {
        if (!content.trim()) return;
        const header = `Note — ${prettyTitle}\nType : ${itemType}\nDate : ${new Date().toLocaleDateString('fr-FR')}\n${'─'.repeat(40)}\n\n`;
        const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `note-${exportDate}.txt`; a.click();
        URL.revokeObjectURL(url);
    }, [content, prettyTitle, itemType, exportDate]);

    const exportToJSON = useCallback(() => {
        if (!content.trim()) return;
        const data = { title: prettyTitle, itemId, itemType, content, tags, exportedAt: new Date().toISOString(), characterCount: content.length };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `note-${exportDate}.json`; a.click();
        URL.revokeObjectURL(url);
    }, [content, prettyTitle, itemId, itemType, tags, exportDate]);

    const exportToPDF = useCallback(() => {
        if (!content.trim()) return;
        const w = window.open('', '_blank');
        if (!w) return;
        const htmlContent = markdownToHtml(content);
        const tagsHtml = tags.length > 0 ? `<div class="tags">${tags.map(t => `<span>#${t}</span>`).join('')}</div>` : '';
        w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Note — ${prettyTitle}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;padding:48px;max-width:780px;margin:0 auto;color:#1a1a1a;line-height:1.7}header{border-bottom:3px solid #D4AF37;padding-bottom:16px;margin-bottom:24px}.badge{display:inline-block;background:#D4AF37;color:#000;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:999px;margin-bottom:8px}h1{font-size:24px;color:#111;margin-bottom:6px}.meta{color:#777;font-size:12px;font-family:monospace}.content{margin-top:24px;font-size:15px}.content p{margin-bottom:12px}.content ul{padding-left:20px;margin-bottom:12px}.content li{margin-bottom:4px;list-style:disc}.content mark{background:#FFF3CD;padding:0 3px;border-radius:2px}.tags{margin-top:24px;padding-top:16px;border-top:1px solid #eee}.tags span{display:inline-block;background:#f5f0e0;color:#8B6914;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:999px;margin-right:6px}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;color:#aaa;font-size:10px;text-align:center}@media print{body{padding:24px}}</style>
</head><body><header><div class="badge">Lukeni · Note</div><h1>${prettyTitle}</h1>
<div class="meta">Type : ${itemType} · Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${content.length} caractères</div></header>
<div class="content">${htmlContent}</div>${tagsHtml}
<div class="footer">Exporté depuis Lukeni — lukeni.app</div></body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 300);
    }, [content, prettyTitle, itemType, tags]);

    // ── Formatting ────────────────────────────────────────────────────────────
    const wrapSelection = useCallback((wrapper: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const sel = content.substring(start, end);
        let newContent = content;
        let newStart = start;
        let newEnd = end;

        if (wrapper === 'list') {
            if (sel) {
                const listed = sel.split('\n').map(l => `- ${l}`).join('\n');
                newContent = content.substring(0, start) + listed + content.substring(end);
                newEnd = start + listed.length;
            } else {
                const insert = '- ';
                newContent = content.substring(0, start) + insert + content.substring(end);
                newStart = start + insert.length;
                newEnd = newStart;
            }
        } else {
            if (!sel) return;
            const map: Record<string, [string, string]> = {
                bold: ['**', '**'], italic: ['*', '*'],
                underline: ['__', '__'], highlight: ['==', '=='],
            };
            const [open, close] = map[wrapper] ?? ['', ''];
            const wrapped = `${open}${sel}${close}`;
            newContent = content.substring(0, start) + wrapped + content.substring(end);
            newStart = start + open.length;
            newEnd = end + open.length;
        }
        handleContentChange(newContent);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(newStart, newEnd); }, 0);
    }, [content, handleContentChange]);

    const handleBold = useCallback(() => wrapSelection('bold'), [wrapSelection]);
    const handleItalic = useCallback(() => wrapSelection('italic'), [wrapSelection]);
    const handleUnderline = useCallback(() => wrapSelection('underline'), [wrapSelection]);
    const handleHighlight = useCallback(() => wrapSelection('highlight'), [wrapSelection]);
    const handleList = useCallback(() => wrapSelection('list'), [wrapSelection]);

    useEffect(() => {
        if (isOpen && textareaRef.current) setTimeout(() => textareaRef.current?.focus(), 150);
    }, [isOpen]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (!isOpen || document.activeElement !== textareaRef.current) return;
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') { e.preventDefault(); handleBold(); }
                if (e.key === 'i') { e.preventDefault(); handleItalic(); }
                if (e.key === 'u') { e.preventDefault(); handleUnderline(); }
            }
        };
        window.addEventListener('keydown', down);
        return () => window.removeEventListener('keydown', down);
    }, [isOpen, handleBold, handleItalic, handleUnderline]);

    const TOOLBAR = [
        { icon: <Bold size={13} />, handler: handleBold, title: 'Gras (Ctrl+B)', key: 'bold' },
        { icon: <Italic size={13} />, handler: handleItalic, title: 'Italique (Ctrl+I)', key: 'italic' },
        { icon: <Underline size={13} />, handler: handleUnderline, title: 'Souligné (Ctrl+U)', key: 'underline' },
        { icon: <Highlighter size={13} />, handler: handleHighlight, title: 'Surligné', key: 'highlight' },
        { icon: <List size={13} />, handler: handleList, title: 'Liste', key: 'list' },
    ];

    // ════════════════════════════════════════════════════════════════════════
    // CONTENU DU PANEL — identique dans les deux modes
    // Extrait en sous-composant inline pour éviter la duplication
    // ════════════════════════════════════════════════════════════════════════

    const panelContent = (
        <>
            {/* ── STARFIELD ── */}
            <NotesStarField catColor={catColor} />

            {/* ── HEADER ── */}
            <div
                className="flex-shrink-0 flex items-center justify-between px-5 py-3 z-10"
                style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
            >
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Moon size={16} style={{ color: catColor }} />
                    </motion.div>
                    <div>
                        <p className="text-white font-bold text-sm flex items-center gap-2">
                            {lang === 'fr' ? 'Mes notes' : 'My notes'}
                            {translatedContent && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${catColor}20`, color: catColor }}>
                                    {displayLang.toUpperCase()}
                                </span>
                            )}
                            <motion.span
                                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <Star size={10} style={{ color: catColor }} />
                            </motion.span>
                        </p>
                        <p className="text-gray-600 text-[10px]">
                            {lastSaved
                                ? `${lang === 'fr' ? 'Sauvegardé à' : 'Saved at'} ${lastSaved.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
                                : userId
                                    ? (lang === 'fr' ? 'Non sauvegardé' : 'Not saved')
                                    : (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Sign in to save')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Bouton Traduire */}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleTranslate}
                        disabled={isTranslating || !content.trim()}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-30"
                        style={translatedContent
                            ? { backgroundColor: catColor, color: '#000' }
                            : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                        {isTranslating ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
                        {translatedContent ? (lang === 'fr' ? 'Original' : 'Original') : (lang === 'fr' ? 'EN' : 'FR')}
                    </motion.button>

                    {/* Export dropdown */}
                    <div className="relative group/export">
                        <button className="p-1.5 rounded-lg transition-all"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                            <Download size={14} />
                        </button>
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover/export:flex flex-col rounded-xl shadow-xl overflow-hidden z-50 min-w-[150px]"
                            style={{
                                background: 'linear-gradient(to bottom, #0d0d1a, #020111)',
                                border: `1px solid ${catColor}30`,
                                boxShadow: `0 -8px 40px rgba(0,0,0,0.8), 0 0 20px ${catColor}15`,
                            }}>
                            {[
                                { fn: exportToTXT, icon: <FileText size={12} />, label: 'TXT' },
                                { fn: exportToJSON, icon: <FileJson size={12} />, label: 'JSON' },
                                { fn: exportToPDF, icon: <Download size={12} />, label: 'PDF' },
                            ].map(({ fn, icon, label }) => (
                                <button key={label} onClick={fn}
                                    className="flex items-center gap-2 px-4 py-2.5 text-xs transition-colors text-left"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${catColor}15`; (e.currentTarget as HTMLElement).style.color = catColor; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Statuts */}
                    {!isOnline && <span className="flex items-center gap-1 text-orange-400 text-[10px]"><AlertCircle size={11} /> Offline</span>}
                    {pendingSync && isOnline && <span className="flex items-center gap-1 text-blue-400 text-[10px]"><Loader2 size={11} className="animate-spin" /> Sync…</span>}
                    {error && <span className="flex items-center gap-1 text-red-400 text-[10px]"><AlertCircle size={11} /> {lang === 'fr' ? 'Erreur' : 'Error'}</span>}
                    {isSaving && <Loader2 size={13} className="animate-spin" style={{ color: catColor }} />}
                    {!isSaving && !error && lastSaved && <span className="flex items-center gap-1 text-green-400 text-[10px]"><Clock size={11} /> Synced</span>}

                    <button onClick={toggleNotes} className="p-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}>
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* ── FORMAT TOOLBAR ── */}
            <div className="flex-shrink-0 flex items-center gap-1 px-5 py-2 z-10"
                style={{ borderBottom: `1px solid rgba(255,255,255,0.05)`, background: 'rgba(255,255,255,0.01)' }}>
                {TOOLBAR.map(({ icon, handler, title, key }) => (
                    <motion.button key={key} onClick={handler} title={title}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${catColor}20`; (e.currentTarget as HTMLElement).style.color = catColor; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}>
                        {icon}
                    </motion.button>
                ))}
                <div className="w-px h-4 mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <span className="text-[9px] ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }}>Markdown</span>
                <motion.div animate={{ rotate: [0, 180, 360], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} className="ml-2">
                    <Sparkles size={10} style={{ color: catColor }} />
                </motion.div>
            </div>

            {/* ── ZONE TEXTE ── */}
            <div className="flex-1 relative z-10 overflow-hidden">
                {translatedContent ? (
                    <div className="h-full overflow-y-auto px-5 py-3">
                        <div className="text-[10px] font-bold mb-2 flex items-center gap-1.5" style={{ color: catColor }}>
                            <Languages size={10} />
                            {lang === 'fr' ? 'Traduction en anglais (lecture seule)' : 'Translation in French (read-only)'}
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{translatedContent}</p>
                    </div>
                ) : (
                    <div className="relative h-full">
                        {cursorParticles.map((p) => (
                            <motion.div key={p.id} className="absolute pointer-events-none rounded-full z-20"
                                style={{ left: p.x, top: p.y, width: 4, height: 4, backgroundColor: catColor, boxShadow: `0 0 6px ${catColor}` }}
                                initial={{ opacity: 0.8, scale: 1 }}
                                animate={{ opacity: 0, scale: 0, y: -15 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }} />
                        ))}
                        <textarea ref={textareaRef} value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onMouseMove={handleTextareaMouseMove}
                            placeholder={userId
                                ? (lang === 'fr' ? '✨ Tapez vos notes ici… les étoiles gardent vos mots' : '✨ Type your notes here… the stars keep your words')
                                : (lang === 'fr' ? '🌙 Connectez-vous pour sauvegarder vos notes…' : '🌙 Sign in to save your notes…')}
                            className="absolute inset-0 w-full h-full px-5 py-3 bg-transparent outline-none resize-none text-sm leading-relaxed"
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'rgba(255,255,255,0.85)', caretColor: catColor }}
                            dir="ltr" />
                    </div>
                )}
            </div>

            {/* ── TAGS ── */}
            <div className="flex-shrink-0 px-5 py-2 z-10" style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {tags.map((tag) => (
                        <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                            style={{ backgroundColor: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30`, boxShadow: `0 0 8px ${catColor}20` }}>
                            #{tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors"><X size={9} /></button>
                        </motion.span>
                    ))}
                    <input type="text" placeholder={lang === 'fr' ? '+ tag (Entrée)' : '+ tag (Enter)'}
                        onKeyDown={handleTagInput}
                        className="flex-1 min-w-[100px] bg-transparent text-xs outline-none"
                        style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
            </div>

            {/* ── PIED DE PAGE ── */}
            <div className="flex-shrink-0 px-5 py-2 z-10 flex justify-between items-center"
                style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {content.length} {lang === 'fr' ? 'caractères' : 'characters'}
                </span>
                <div className="flex items-center gap-3">
                    {[...Array(5)].map((_, i) => (
                        <motion.div key={i} className="rounded-full"
                            style={{ width: i === 2 ? 4 : 2, height: i === 2 ? 4 : 2, backgroundColor: i === 2 ? catColor : 'rgba(255,255,255,0.4)', boxShadow: i === 2 ? `0 0 6px ${catColor}` : 'none' }}
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                            transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.4 }} />
                    ))}
                </div>
                {content.length > 50000 && (
                    <span className="text-red-400 text-[10px]">{lang === 'fr' ? 'Limite approchée' : 'Limit approaching'}</span>
                )}
            </div>
        </>
    );

    // ════════════════════════════════════════════════════════════════════════
    // RENDU — MODE BOTTOM (comportement original inchangé)
    // ════════════════════════════════════════════════════════════════════════

    if (mode === 'bottom') {
        const paddingBottom = isOpen ? notesHeight + 48 : 0;

        return (
            <>
                <div style={{
                    paddingBottom,
                    transition: 'padding-bottom 0.35s ease',
                    maskImage: isOpen
                        ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)'
                        : 'none',
                    WebkitMaskImage: isOpen
                        ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)'
                        : 'none',
                }}>
                    {children}
                </div>

                {/* Floating button */}
                <AnimatePresence>
                    {!isOpen && (
                        <motion.button key="open-btn"
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                            onClick={toggleNotes}
                            className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl overflow-hidden"
                            style={{ background: `linear-gradient(135deg, ${catColor}ee, ${catColor})`, color: '#000', boxShadow: `0 4px 30px ${catColor}50, 0 0 60px ${catColor}20` }}>
                            <motion.div className="absolute inset-0 pointer-events-none" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                                {[...Array(5)].map((_, i) => (
                                    <motion.div key={i} className="absolute rounded-full bg-white"
                                        style={{ width: 2, height: 2, left: `${15 + i * 18}%`, top: `${20 + (i % 2) * 60}%` }}
                                        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
                                ))}
                            </motion.div>
                            <CaurisIcon className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{lang === 'fr' ? 'Notes' : 'Notes'}</span>
                            {content.trim() && (
                                <motion.span className="relative z-10 w-1.5 h-1.5 rounded-full bg-black/40"
                                    animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Bottom panel */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div key="notes-panel"
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                            className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col overflow-hidden"
                            style={{
                                height: notesHeight,
                                background: 'linear-gradient(to bottom, #020111 0%, #03032B 40%, #000000 100%)',
                                borderTop: `1px solid ${catColor}30`,
                                boxShadow: `0 -16px 70px rgba(0,0,0,0.95), 0 -2px 0 ${catColor}40, inset 0 1px 0 rgba(255,255,255,0.05)`,
                            }}>
                            {/* Drag handle */}
                            <div className="relative flex-shrink-0 flex items-center justify-center h-10 cursor-row-resize group select-none z-10"
                                onMouseDown={onResizeMouseDown} onTouchStart={onResizeTouchStart}>
                                <div className="absolute top-0 left-0 right-0 h-px"
                                    style={{ background: `linear-gradient(90deg, transparent, ${catColor}80, ${catColor}, ${catColor}80, transparent)` }} />
                                <div className="absolute top-0 left-1/4 right-1/4 h-px blur-sm" style={{ background: catColor, opacity: 0.5 }} />
                                <motion.div whileHover={{ scale: 1.3, rotate: 360 }} transition={{ duration: 0.5 }}>
                                    <CaurisIcon className="w-5 h-5 transition-colors group-hover:text-white drop-shadow-lg"
                                        style={{ color: catColor, filter: `drop-shadow(0 0 6px ${catColor})` }} />
                                </motion.div>
                                {[...Array(4)].map((_, i) => (
                                    <motion.div key={i} className="absolute rounded-full bg-white"
                                        style={{ width: 2, height: 2, left: `${30 + i * 12}%`, top: '50%' }}
                                        animate={{ opacity: [0.2, 0.8, 0.2] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
                                ))}
                            </div>
                            {panelContent}
                        </motion.div>
                    )}
                </AnimatePresence>

                <style jsx global>{`
                    textarea::placeholder { color: rgba(255,255,255,0.2); font-style: italic; }
                    textarea:focus::placeholder { color: rgba(255,255,255,0.12); }
                `}</style>
            </>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDU — MODE SIDE (bibliothèque uniquement)
    // ════════════════════════════════════════════════════════════════════════

    return (
        <>
            {children}

            {/* ── Bouton flottant (fermé) ── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        key="side-open-btn"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={toggleNotes}
                        // Positionné à droite, centré verticalement
                        className="fixed right-0 top-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-2 py-5 px-3 overflow-hidden"
                        style={{
                            background: `linear-gradient(180deg, ${catColor}ee, ${catColor})`,
                            color: '#000',
                            boxShadow: `-4px 0 30px ${catColor}50`,
                            borderRadius: '12px 0 0 12px',
                        }}
                    >
                        {/* Étoiles décoratives */}
                        <motion.div className="absolute inset-0 pointer-events-none"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}>
                            {[...Array(4)].map((_, i) => (
                                <motion.div key={i} className="absolute rounded-full bg-white"
                                    style={{ width: 2, height: 2, left: `${20 + i * 20}%`, top: `${15 + (i % 2) * 65}%` }}
                                    animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
                            ))}
                        </motion.div>

                        <CaurisIcon className="w-4 h-4 relative z-10" />

                        {/* Label vertical */}
                        <span className="relative z-10 text-[11px] font-bold tracking-[0.15em]"
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                            {lang === 'fr' ? 'Notes' : 'Notes'}
                        </span>

                        {/* Point indicateur si contenu */}
                        {content.trim() && (
                            <motion.span className="relative z-10 w-1.5 h-1.5 rounded-full bg-black/40"
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }} />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── Panel latéral (ouvert) ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="side-notes-panel"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                        className="fixed top-0 right-0 bottom-0 z-[150] flex flex-row overflow-hidden"
                        style={{
                            width: notesWidth,
                            background: 'linear-gradient(to bottom, #020111 0%, #03032B 40%, #000000 100%)',
                            borderLeft: `1px solid ${catColor}30`,
                            boxShadow: `-16px 0 70px rgba(0,0,0,0.95), -2px 0 0 ${catColor}40, inset 1px 0 0 rgba(255,255,255,0.05)`,
                        }}
                    >
                        {/* ── Drag handle vertical (bord gauche du panneau) ── */}
                        <div
                            className="relative flex-shrink-0 flex items-center justify-center w-5 cursor-col-resize group select-none z-10 h-full"
                            onMouseDown={onSideResizeMouseDown}
                            style={{ background: 'transparent' }}
                        >
                            {/* Ligne colorée sur le bord */}
                            <div className="absolute top-0 bottom-0 left-0 w-px"
                                style={{ background: `linear-gradient(180deg, transparent, ${catColor}80, ${catColor}, ${catColor}80, transparent)` }} />
                            <div className="absolute top-1/4 bottom-1/4 left-0 w-px blur-sm"
                                style={{ background: catColor, opacity: 0.5 }} />

                            {/* Icône de drag */}
                            <motion.div
                                whileHover={{ scale: 1.3, rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <CaurisIcon className="w-4 h-4"
                                    style={{ color: catColor, filter: `drop-shadow(0 0 6px ${catColor})` }} />
                            </motion.div>
                        </div>

                        {/* ── Contenu du panel (flex-col) ── */}
                        <div className="flex-1 flex flex-col overflow-hidden relative">
                            {panelContent}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                textarea::placeholder { color: rgba(255,255,255,0.2); font-style: italic; }
                textarea:focus::placeholder { color: rgba(255,255,255,0.12); }
            `}</style>
        </>
    );
}