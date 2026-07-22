// hooks/useGamePresence.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { GamePresence } from '@/types/game';

export function useGamePresence(gameId: string, userId: string, role?: string) {
  const [presentUsers, setPresentUsers] = useState<GamePresence[]>([]);

  useEffect(() => {
    if (!gameId || !userId) return;

    let presenceChannel: RealtimeChannel | null = null;
    let isCleanup = false;

    const setupPresence = async () => {
      presenceChannel = supabase.channel(`game_presence:${gameId}`, {
        config: { presence: { key: userId } },
      });

      presenceChannel.on('presence', { event: 'sync' }, () => {
        if (isCleanup || !presenceChannel) return;
        const state = presenceChannel.presenceState();
        const users: GamePresence[] = [];
        
        for (const key in state) {
          const presences = state[key] as any[];
          if (presences?.length) {
            const latest = presences.reduce((latest, current) => 
              new Date(current.online_at) > new Date(latest.online_at) ? current : latest
            );
            users.push({
              user_id: latest.user_id,
              online_at: latest.online_at,
              role: latest.role,
              full_name: latest.full_name,
              avatar_url: latest.avatar_url,
            });
          }
        }
        setPresentUsers(users);
      });

      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !isCleanup) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', userId)
            .single();

          await presenceChannel?.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            role: role || 'SPECTATOR',
            full_name: profile?.full_name,
            avatar_url: profile?.avatar_url,
          });
        }
      });
    };

    setupPresence();

    const heartbeat = setInterval(async () => {
      if (presenceChannel && !isCleanup) {
        await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    }, 15000);

    return () => {
      isCleanup = true;
      if (presenceChannel) {
        presenceChannel.untrack().then(() => presenceChannel?.unsubscribe());
      }
      clearInterval(heartbeat);
    };
  }, [gameId, userId, role]);

  return { presentUsers, opponent: presentUsers.find(u => u.user_id !== userId) };
};