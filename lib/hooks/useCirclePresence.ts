import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  user_id: string;
  online_at: string;
  full_name?: string;
  avatar_url?: string;
  username?: string;
}

export function useCirclePresence(circleId: string, userId?: string) {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!circleId || !userId) return;

    let presenceChannel: RealtimeChannel | null = null;
    let isCleanup = false;

    const setupPresence = async () => {
      presenceChannel = supabase.channel(`presence:${circleId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      // ── Sync : Récupérer tous les utilisateurs en ligne
      presenceChannel.on('presence', { event: 'sync' }, () => {
        if (isCleanup || !presenceChannel) return;

        const state = presenceChannel.presenceState();
        const users: PresenceUser[] = [];

        for (const key in state) {
          const presences = state[key] as any[];
          if (presences && Array.isArray(presences)) {
            const latest = presences.reduce((latest: any, current: any) => {
              return new Date(current.online_at) > new Date(latest.online_at) ? current : latest;
            });
            users.push({
              user_id: latest.user_id,
              online_at: latest.online_at,
              full_name: latest.full_name,
              avatar_url: latest.avatar_url,
              username: latest.username,
            });
          }
        }

        setPresentUsers(users);
      });

      // ── Join : Un nouvel utilisateur arrive
      presenceChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
        if (isCleanup) return;
        const joined = (newPresences as any[]) || [];
        console.log('✅ Presence join:', joined.map((p: any) => p.user_id));
      });

      // ── Leave : Un utilisateur quitte
      presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (isCleanup) return;
        const left = (leftPresences as any[]) || [];
        console.log('❌ Presence leave:', left.map((p: any) => p.user_id));

        const leftIds = new Set(left.map((p: any) => p.user_id));
        setPresentUsers(prev => prev.filter(p => !leftIds.has(p.user_id)));
      });

      // ── S'abonner
      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !isCleanup) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', userId)
            .maybeSingle();

          await presenceChannel?.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            username: profile?.username || null,
          });
        }
      });
    };

    setupPresence();

    // ── Heartbeat : Mettre à jour la présence toutes les 15 secondes
    const heartbeatInterval = setInterval(async () => {
      if (presenceChannel && !isCleanup) {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    }, 15000);

    // ── Nettoyage
    return () => {
      isCleanup = true;

      if (presenceChannel) {
        presenceChannel.untrack().then(() => {
          presenceChannel?.unsubscribe();
        });
      }

      clearInterval(heartbeatInterval);
      setPresentUsers([]);
    };
  }, [circleId, userId]);

  return {
    presentUsers,
    isUserOnline: (checkUserId: string) => presentUsers.some(u => u.user_id === checkUserId),
  };
}