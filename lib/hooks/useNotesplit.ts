'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface UseNotesplitOptions {
    itemId: string;
    itemType: 'article' | 'press' | 'wiki' | 'scholar' | 'book';
    userId?: string;
}

interface UseNotesplitReturn {
    content: string;
    isOpen: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
    shadowIntensity: number;
    isOnline: boolean;
    pendingSync: boolean;
    tags: string[];
    handleContentChange: (value: string) => void;
    toggleNotes: () => void;
    handleResizeStart: (e: React.MouseEvent) => void;
    handleTouchStart: (e: React.TouchEvent) => void;
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
    handleTagInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useNotesplit({
    itemId,
    itemType,
    userId,
}: UseNotesplitOptions): UseNotesplitReturn {
    const [content, setContent] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSync, setPendingSync] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [shadowIntensity, setShadowIntensity] = useState(0);

    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const localKey = `notesplit_${itemId}`;
    const localTagKey = `notesplit_tags_${itemId}`;
    const noteIdRef = useRef<string | null>(null);
    const isLoadedRef = useRef(false);

    // ── Online/offline ──────────────────────────────────────────────────────
    useEffect(() => {
        const onOnline = () => {
            setIsOnline(true);
            if (pendingSync) syncToSupabase(content, tags);
        };
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [pendingSync, content, tags]);

    // ── Load note on mount ──────────────────────────────────────────────────
    useEffect(() => {
        if (!itemId || isLoadedRef.current) return;
        isLoadedRef.current = true;

        const loadNote = async () => {
            // 1. Charger depuis localStorage d'abord (instantané)
            const localContent = localStorage.getItem(localKey) || '';
            const localTags = JSON.parse(localStorage.getItem(localTagKey) || '[]');
            setContent(localContent);
            setTags(localTags);

            // 2. Charger depuis Supabase si connecté
            if (userId) {
                try {
                    const { data, error: fetchError } = await supabase
                        .from('user_notes')
                        .select('id, content, tags, updated_at')
                        .eq('user_id', userId)
                        .eq('item_id', itemId)
                        .eq('item_type', itemType)
                        .maybeSingle();

                    if (fetchError) {
                        console.error('Load note error:', fetchError);
                        return;
                    }

                    if (data) {
                        noteIdRef.current = data.id;
                        // Supabase prioritaire si plus récent
                        const remoteContent = data.content || '';
                        const remoteTags = data.tags || [];
                        setContent(remoteContent);
                        setTags(remoteTags);
                        localStorage.setItem(localKey, remoteContent);
                        localStorage.setItem(localTagKey, JSON.stringify(remoteTags));
                        setLastSaved(new Date(data.updated_at));
                    }
                } catch (err) {
                    console.error('Supabase load error:', err);
                }
            }
        };

        loadNote();
    }, [itemId, userId, itemType]);

    // ── Sync to Supabase ────────────────────────────────────────────────────
    const syncToSupabase = useCallback(
        async (contentToSave: string, tagsToSave: string[]) => {
            if (!userId) return;

            setIsSaving(true);
            setError(null);

            try {
                const payload = {
                    user_id: userId,
                    item_id: itemId,
                    item_type: itemType,
                    content: contentToSave,
                    tags: tagsToSave,
                    updated_at: new Date().toISOString(),
                };

                if (noteIdRef.current) {
                    // UPDATE
                    const { error: updateError } = await supabase
                        .from('user_notes')
                        .update({
                            content: contentToSave,
                            tags: tagsToSave,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', noteIdRef.current);

                    if (updateError) throw updateError;
                } else {
                    // INSERT
                    const { data: inserted, error: insertError } = await supabase
                        .from('user_notes')
                        .insert(payload)
                        .select('id')
                        .single();

                    if (insertError) throw insertError;
                    if (inserted) noteIdRef.current = inserted.id;
                }

                setLastSaved(new Date());
                setPendingSync(false);
            } catch (err: any) {
                console.error('Save error:', err);
                setError(err.message || 'Erreur de sauvegarde');
                setPendingSync(true);
            } finally {
                setIsSaving(false);
            }
        },
        [userId, itemId, itemType]
    );

    // ── Handle content change with debounced save ───────────────────────────
    const handleContentChange = useCallback(
        (value: string) => {
            setContent(value);
            // Sauvegarde locale immédiate
            localStorage.setItem(localKey, value);

            // Debounce 2s pour Supabase
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                if (navigator.onLine && userId) {
                    syncToSupabase(value, tags);
                } else {
                    setPendingSync(true);
                }
            }, 2000);
        },
        [localKey, tags, userId, syncToSupabase]
    );

    // ── Tags ────────────────────────────────────────────────────────────────
    const addTag = useCallback(
        (tag: string) => {
            const trimmed = tag.trim().toLowerCase();
            if (!trimmed || tags.includes(trimmed)) return;
            const newTags = [...tags, trimmed];
            setTags(newTags);
            localStorage.setItem(localTagKey, JSON.stringify(newTags));
            // Auto-save avec nouveaux tags
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                if (navigator.onLine && userId) syncToSupabase(content, newTags);
            }, 1000);
        },
        [tags, localTagKey, content, userId, syncToSupabase]
    );

    const removeTag = useCallback(
        (tag: string) => {
            const newTags = tags.filter((t) => t !== tag);
            setTags(newTags);
            localStorage.setItem(localTagKey, JSON.stringify(newTags));
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                if (navigator.onLine && userId) syncToSupabase(content, newTags);
            }, 1000);
        },
        [tags, localTagKey, content, userId, syncToSupabase]
    );

    const handleTagInput = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const input = e.currentTarget;
                addTag(input.value);
                input.value = '';
            }
        },
        [addTag]
    );

    // ── Toggle ──────────────────────────────────────────────────────────────
    const toggleNotes = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    // ── Scroll shadow intensity ─────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            const ratio = Math.min(window.scrollY / 300, 1);
            setShadowIntensity(ratio);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ── Dummy resize handlers (handled in component) ─────────────────────────
    const handleResizeStart = useCallback((_e: React.MouseEvent) => {}, []);
    const handleTouchStart = useCallback((_e: React.TouchEvent) => {}, []);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    return {
        content,
        isOpen,
        isSaving,
        lastSaved,
        error,
        shadowIntensity,
        isOnline,
        pendingSync,
        tags,
        handleContentChange,
        toggleNotes,
        handleResizeStart,
        handleTouchStart,
        addTag,
        removeTag,
        handleTagInput,
    };
}