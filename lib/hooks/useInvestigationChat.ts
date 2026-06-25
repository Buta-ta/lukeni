import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface InvestigationChatMessage {
  id: string;
  investigation_id: string;
  group_id: string | null;
  user_id: string;
  character_id: string | null;
  content: string;
  type: 'text' | 'hint' | 'discovery' | 'system';
  scene_id: string | null;
  replied_to_message_id: string | null;
  metadata: any;
  created_at: string;

  // Enrichissement
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
  character?: {
    name_fr: string;
    name_en: string;
    avatar_url?: string;
    role: string;
    role_en?: string;
  };
  reactions?: MessageReaction[];
  repliedToMessage?: InvestigationChatMessage | null;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasUserReacted: boolean;
}

export function useInvestigationChat(
  investigationId: string,
  groupId: string | null,
  userId?: string
) {
  const [messages, setMessages] = useState<InvestigationChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});

  // ✅ Charger l'historique
  useEffect(() => {
    if (
      !investigationId ||
      investigationId.includes('[id]') ||
      investigationId.includes('%5B')
    )
      return;

    const loadMessages = async () => {
      try {
        let query = supabase
          .from('investigation_messages')
          .select('*')
          .eq('investigation_id', investigationId);

        if (groupId) {
          query = query.eq('group_id', groupId);
        } else {
          query = query.is('group_id', null);
        }

        const { data, error: err } = await query
          .order('created_at', { ascending: true })
          .limit(200);

        if (err) throw err;

        // ── Enrichir avec les messages cités ──
        const rawMessages = data || [];
        const repliedIds = rawMessages
          .map((m) => m.replied_to_message_id)
          .filter((id): id is string => id !== null);

        let repliedMap: Record<string, InvestigationChatMessage> = {};
        if (repliedIds.length > 0) {
          const { data: repliedData } = await supabase
            .from('investigation_messages')
            .select('*')
            .in('id', repliedIds);
          repliedMap = Object.fromEntries(
            (repliedData || []).map((m) => [m.id, m])
          );
        }

        const enriched = rawMessages.map((m) => ({
          ...m,
          repliedToMessage: m.replied_to_message_id
            ? repliedMap[m.replied_to_message_id] || null
            : null,
        }));

        setMessages(enriched);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load messages error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [investigationId, groupId]);

  // ✅ Charger les réactions
  useEffect(() => {
    if (!investigationId || messages.length === 0) return;

    const loadReactions = async () => {
      try {
        const messageIds = messages.map((m) => m.id);
        const { data } = await supabase
          .from('investigation_message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (data) {
          const reactionsMap: Record<string, any[]> = {};
          data.forEach((r) => {
            if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
            reactionsMap[r.message_id].push(r);
          });
          setReactions(reactionsMap);
        }
      } catch (err) {
        console.warn('Load reactions error:', err);
      }
    };

    loadReactions();
  }, [investigationId, messages.length]);

  // ✅ Enrichir profils et personnages
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const loadEnrichment = async () => {
      try {
        const userIds = [...new Set(messages.map((m) => m.user_id))];
        const characterIds = [
          ...new Set(
            messages
              .map((m) => m.character_id)
              .filter((id): id is string => id !== null)
          ),
        ];

        const [profilesRes, charactersRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, username')
            .in('id', userIds),
          characterIds.length > 0
            ? supabase
                .from('investigation_characters')
                .select('id, name_fr, name_en, avatar_url, role, role_en')
                .in('id', characterIds)
            : Promise.resolve({ data: null }),
        ]);

        const profileMap = Object.fromEntries(
          (profilesRes.data || []).map((p) => [p.id, p])
        );
        const characterMap = Object.fromEntries(
          (charactersRes.data || []).map((c) => [c.id, c])
        );

        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            profiles: profileMap[m.user_id] || m.profiles,
            character: m.character_id
              ? characterMap[m.character_id] || m.character
              : undefined,
          }))
        );
      } catch (err: any) {
        console.error('Load enrichment error:', err);
      }
    };

    loadEnrichment();
  }, [messages.length]);

  // ✅ REALTIME
  useEffect(() => {
    if (
      !investigationId ||
      investigationId.includes('[id]') ||
      investigationId.includes('%5B')
    )
      return;

    const chatChannel = supabase.channel(
      `chat:investigation:${investigationId}`
    );

    // Nouveaux messages
    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'investigation_messages',
        filter: groupId
          ? `investigation_id=eq.${investigationId}`
          : `investigation_id=eq.${investigationId}`,
      },
      async (payload) => {
        // Vérifier que le message appartient au bon groupe
        const msgGroupId = payload.new.group_id;
        if (groupId && msgGroupId !== groupId) return;
        if (!groupId && msgGroupId !== null) return;

        let profile = null;
        let character = null;
        let repliedToMessage = null;

        try {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', payload.new.user_id)
            .single();
          profile = data;
        } catch {}

        if (payload.new.character_id) {
          try {
            const { data } = await supabase
              .from('investigation_characters')
              .select('id, name_fr, name_en, avatar_url, role, role_en')
              .eq('id', payload.new.character_id)
              .single();
            character = data;
          } catch {}
        }

        // Charger le message cité si présent
        if (payload.new.replied_to_message_id) {
          try {
            const { data } = await supabase
              .from('investigation_messages')
              .select('*')
              .eq('id', payload.new.replied_to_message_id)
              .single();
            repliedToMessage = data;
          } catch {}
        }

        const newMessage: InvestigationChatMessage = {
          ...payload.new,
          profiles: profile || undefined,
          character: character || undefined,
          repliedToMessage: repliedToMessage || null,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    );

    // Réactions INSERT
    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'investigation_message_reactions',
      },
      (payload) => {
        setReactions((prev) => ({
          ...prev,
          [payload.new.message_id]: [
            ...(prev[payload.new.message_id] || []),
            payload.new,
          ],
        }));
      }
    );

    // Réactions DELETE
    chatChannel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'investigation_message_reactions',
      },
      (payload) => {
        setReactions((prev) => ({
          ...prev,
          [payload.old.message_id]: (
            prev[payload.old.message_id] || []
          ).filter(
            (r) =>
              !(
                r.user_id === payload.old.user_id &&
                r.emoji === payload.old.emoji
              )
          ),
        }));
      }
    );

    chatChannel.subscribe();
    setChannel(chatChannel);

    return () => {
      chatChannel.unsubscribe();
    };
  }, [investigationId, groupId]);

  // ✅ Envoyer un message
   // ✅ Envoyer un message (CORRIGÉ)
  const sendMessage = useCallback(
    async (
      content: string,
      type: 'text' | 'hint' | 'discovery' | 'system' = 'text',
      characterId?: string,
      sceneId?: string,
      metadata?: any,
      repliedToMessageId?: string
    ) => {
      if (!userId || !content.trim() || !investigationId) return;

      try {
        const { error: err, data } = await supabase
          .from('investigation_messages')
          .insert({
            // On s'assure de forcer 'null' au lieu de 'undefined'
            investigation_id: investigationId,
            group_id: groupId || null, 
            user_id: userId,
            character_id: characterId || null,
            content: content.trim(),
            type,
            scene_id: sceneId || null,
            metadata: metadata || null,
            replied_to_message_id: repliedToMessageId || null,
          })
          .select(); // On rajoute .select() pour s'assurer du retour

        if (err) {
          // Affiche L'ERREUR EXACTE de la base de données dans la console
          console.error('❌ Détail de l\'erreur Supabase:', err.message, err.details, err.hint);
          throw err;
        }
      } catch (err: any) {
        console.error('Send message error:', err);
      }
    },
    [investigationId, groupId, userId]
  );

  // ✅ Ajouter/Retirer une réaction (toggle)
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;

      const existingReactions = reactions[messageId] || [];
      const alreadyReacted = existingReactions.some(
        (r) => r.user_id === userId && r.emoji === emoji
      );

      if (alreadyReacted) {
        // Toggle : retirer
        try {
          await supabase
            .from('investigation_message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('emoji', emoji);
        } catch (err: any) {
          console.error('Remove reaction error:', err);
        }
      } else {
        // Ajouter
        try {
          await supabase.from('investigation_message_reactions').insert({
            message_id: messageId,
            user_id: userId,
            emoji,
          });
        } catch (err: any) {
          console.error('Add reaction error:', err);
        }
      }
    },
    [userId, reactions]
  );

  // ✅ Vider les messages (appelé par handleReplay)
  const clearMessages = useCallback(() => {
    setMessages([]);
    setReactions({});
  }, []);

  // ✅ Construire les messages enrichis avec réactions
  const enrichedMessages = messages.map((msg) => {
    const msgReactions = reactions[msg.id] || [];
    const reactionMap = new Map<
      string,
      { count: number; userIds: string[]; hasUserReacted: boolean }
    >();

    msgReactions.forEach((r) => {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, {
          count: 0,
          userIds: [],
          hasUserReacted: false,
        });
      }
      const data = reactionMap.get(r.emoji)!;
      data.count++;
      data.userIds.push(r.user_id);
      if (r.user_id === userId) data.hasUserReacted = true;
    });

    return {
      ...msg,
      reactions: Array.from(reactionMap.entries()).map(([emoji, data]) => ({
        emoji,
        ...data,
      })),
    };
  });

  return {
    messages: enrichedMessages,
    isLoading,
    error,
    sendMessage,
    addReaction,
    clearMessages,
  };
}