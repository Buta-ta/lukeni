import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  circle_id: string;
  user_id: string;
  content: string;
  page_number?: number;
  created_at: string;
  mentions?: string[]; // ✅ NOUVEAU : mentions des users
  replied_to_message_id?: string; // ✅ NOUVEAU : message parent
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
  // ✅ CHAMPS CALCULÉS (non stockés)
  reactions?: MessageReaction[];
  replies?: ChatMessage[];
  repliedToMessage?: ChatMessage | null;
  isPinned?: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasUserReacted: boolean;
}

export function useCircleChat(circleId: string, userId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // ✅ NOUVEAU : Réactions
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  
  // ✅ NOUVEAU : Messages épinglés
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);

  // ✅ Charger l'historique SANS JOIN
  useEffect(() => {
    if (!circleId) return;

    const loadMessages = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_messages')
          .select('*')
          .eq('circle_id', circleId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (err) throw err;
        setMessages(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load messages error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [circleId]);

  // ✅ NOUVEAU : Charger les réactions
  useEffect(() => {
    if (!circleId || messages.length === 0) return;

    const loadReactions = async () => {
      try {
        const messageIds = messages.map(m => m.id);
        const { data } = await supabase
          .from('circle_message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (data) {
          const reactionsMap: Record<string, any[]> = {};
          data.forEach(r => {
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
  }, [circleId, messages.length]);

  // ✅ NOUVEAU : Charger les messages épinglés
  useEffect(() => {
    if (!circleId) return;

    const loadPinnedMessages = async () => {
      try {
        const { data } = await supabase
          .from('circle_pinned_messages')
          .select('message_id')
          .eq('circle_id', circleId);

        if (data) {
          setPinnedMessageIds(data.map(p => p.message_id));
        }
      } catch (err) {
        console.warn('Load pinned messages error:', err);
      }
    };

    loadPinnedMessages();
  }, [circleId]);

  // ✅ Charger les profils SÉPARÉMENT
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const loadProfiles = async () => {
      try {
        const userIds = messages.map(m => m.user_id);
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', userIds);

        if (data) {
          const profileMap = Object.fromEntries(data.map(p => [p.id, p]));
          setMessages(prev =>
            prev.map(m => ({
              ...m,
              profiles: profileMap[m.user_id] || undefined
            }))
          );
        }
      } catch (err: any) {
        console.error('Load profiles error:', err);
      }
    };

    loadProfiles();
  }, [messages.length]);

  // ✅ REALTIME : Écouter les nouveaux messages
  useEffect(() => {
    if (!circleId) return;

    const chatChannel = supabase.channel(`chat:${circleId}`);

    // 📡 Nouveaux messages
    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_messages',
        filter: `circle_id=eq.${circleId}`
      },
      async (payload) => {
        let profile = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', payload.new.user_id)
            .single();
          profile = data;
        } catch (err) {
          console.warn('Profile fetch error:', err);
        }

        const newMessage: ChatMessage = {
          ...payload.new,
          profiles: profile || undefined
        };

        setMessages(prev => [...prev, newMessage]);
      }
    );

    // ✅ NOUVEAU : Réactions en temps réel
    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_message_reactions',
      },
      (payload) => {
        setReactions(prev => ({
          ...prev,
          [payload.new.message_id]: [
            ...(prev[payload.new.message_id] || []),
            payload.new
          ]
        }));
      }
    );

    // ✅ NOUVEAU : Supprimer réaction
    chatChannel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'circle_message_reactions',
      },
      (payload) => {
        setReactions(prev => ({
          ...prev,
          [payload.old.message_id]: (prev[payload.old.message_id] || []).filter(
            r => !(r.user_id === payload.old.user_id && r.emoji === payload.old.emoji)
          )
        }));
      }
    );

    // ✅ NOUVEAU : Messages épinglés
    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_pinned_messages',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setPinnedMessageIds(prev => [...prev, payload.new.message_id]);
      }
    );

    // ✅ NOUVEAU : Dépingler
    chatChannel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'circle_pinned_messages',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setPinnedMessageIds(prev => prev.filter(id => id !== payload.old.message_id));
      }
    );

    chatChannel.subscribe();
    setChannel(chatChannel);

    return () => {
      chatChannel.unsubscribe();
    };
  }, [circleId]);

  // ✅ Envoyer un message
  const sendMessage = useCallback(async (content: string, pageNumber?: number, mentions?: string[], repliedToMessageId?: string) => {
    if (!userId || !content.trim() || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_messages')
        .insert({
          circle_id: circleId,
          user_id: userId,
          content: content.trim(),
          page_number: pageNumber,
          mentions: mentions || [],
          replied_to_message_id: repliedToMessageId || null,
        });

      if (err) throw err;
    } catch (err: any) {
      setError(err.message);
      console.error('Send message error:', err);
    }
  }, [circleId, userId]);

  // ✅ NOUVEAU : Ajouter une réaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('circle_message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        });

      if (err) {
        if (err.code === '23505') {
          // Déjà une réaction identique → la supprimer
          await removeReaction(messageId, emoji);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Add reaction error:', err);
    }
  }, [userId]);

  // ✅ NOUVEAU : Supprimer une réaction
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('circle_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (err) throw err;
    } catch (err: any) {
      console.error('Remove reaction error:', err);
    }
  }, [userId]);

  // ✅ NOUVEAU : Épingler un message
  const pinMessage = useCallback(async (circleId: string, messageId: string) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('circle_pinned_messages')
        .insert({
          circle_id: circleId,
          message_id: messageId,
          pinned_by: userId,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Pin message error:', err);
    }
  }, [userId]);

  // ✅ NOUVEAU : Dépingler un message
  const unpinMessage = useCallback(async (messageId: string) => {
    try {
      const { error: err } = await supabase
        .from('circle_pinned_messages')
        .delete()
        .eq('message_id', messageId);

      if (err) throw err;
    } catch (err: any) {
      console.error('Unpin message error:', err);
    }
  }, []);

  // ✅ Enrichir les messages avec réactions & épinglage
  const enrichedMessages = messages.map(msg => {
    const msgReactions = reactions[msg.id] || [];
    
    const reactionMap = new Map<string, { count: number; userIds: string[]; hasUserReacted: boolean }>();
    msgReactions.forEach(r => {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, { count: 0, userIds: [], hasUserReacted: false });
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
        ...data
      })),
      isPinned: pinnedMessageIds.includes(msg.id)
    };
  });

  return {
    messages: enrichedMessages,
    isLoading,
    error,
    sendMessage,
    addReaction,
    removeReaction,
    pinMessage,
    unpinMessage,
  };
}