// hooks/useGameChat.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { GameMessage } from '@/types/game';

export function useGameChat(gameId: string, userId?: string) {
  const [messages, setMessages] = useState<GameMessage[]>([]);

  useEffect(() => {
    if (!gameId) return;

    // Charger historique
    const loadMessages = async () => {
      const { data } = await supabase
        .from('game_messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (data) setMessages(data);
    };
    loadMessages();

    // Realtime
    const channel = supabase.channel(`game_chat:${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_messages',
        filter: `game_id=eq.${gameId}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', payload.new.user_id)
          .single();
        
        const newMsg: GameMessage = {
          ...payload.new as GameMessage,
          profiles: profile || undefined
        };
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'system' = 'text') => {
    if (!userId || !content.trim()) return;
    await supabase.from('game_messages').insert({
      game_id: gameId,
      user_id: userId,
      content: content.trim(),
      type
    });
  }, [gameId, userId]);

  return { messages, sendMessage };
};