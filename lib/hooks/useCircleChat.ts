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
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
}

export function useCircleChat(circleId: string, userId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // ✅ CHARGER L'HISTORIQUE SANS JOIN
  useEffect(() => {
    if (!circleId) return;

    const loadMessages = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_messages')
          .select('*') // ✅ Sans join aux profiles
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

  // ✅ REALTIME : Écouter les nouveaux messages
  useEffect(() => {
    if (!circleId) return;

    const chatChannel = supabase.channel(`chat:${circleId}`);

    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_messages',
        filter: `circle_id=eq.${circleId}`
      },
      async (payload) => {
        // ✅ Charger le profil du user SÉPARÉMENT
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

    chatChannel.subscribe();
    setChannel(chatChannel);

    return () => {
      chatChannel.unsubscribe();
    };
  }, [circleId]);

  // ✅ ENVOYER UN MESSAGE
  const sendMessage = useCallback(async (content: string, pageNumber?: number) => {
    if (!userId || !content.trim() || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_messages')
        .insert({
          circle_id: circleId,
          user_id: userId,
          content: content.trim(),
          page_number: pageNumber,
        });

      if (err) throw err;
    } catch (err: any) {
      setError(err.message);
      console.error('Send message error:', err);
    }
  }, [circleId, userId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}