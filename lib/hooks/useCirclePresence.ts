import { useEffect, useState, useCallback } from 'react';
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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!circleId || !userId) return;

    const presenceChannel = supabase.channel(`presence:${circleId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // ── Sync : Récupérer tous les utilisateurs en ligne
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const users: PresenceUser[] = [];

      Object.values(state).forEach((userList: any) => {
        userList.forEach((user: PresenceUser) => {
          users.push(user);
        });
      });

      setPresentUsers(users);
    });

    // ── Join : Un nouvel utilisateur arrive
    presenceChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
      setPresentUsers(prev => {
        const newUsers = newPresences.filter(
          (np: PresenceUser) => !prev.find(p => p.user_id === np.user_id)
        );
        return [...prev, ...newUsers];
      });
    });

    // ── Leave : Un utilisateur quitte
    presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      setPresentUsers(prev =>
        prev.filter(p => !leftPresences.some((lp: PresenceUser) => lp.user_id === p.user_id))
      );
    });

    presenceChannel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        // Charger le profil de l'utilisateur actuel
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('id', userId)
          .single();

        // Envoyer la présence
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
          username: profile?.username,
        });
      }
    });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [circleId, userId]);

  return {
    presentUsers,
    isUserOnline: (checkUserId: string) => presentUsers.some(u => u.user_id === checkUserId),
  };
}