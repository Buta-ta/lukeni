import { useEffect, useState, useRef } from 'react';
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isCleanupRef = useRef(false);

  useEffect(() => {
    if (!circleId || !userId) return;

    isCleanupRef.current = false;

    // Nettoyer l'ancien channel s'il existe
    if (channelRef.current) {
      channelRef.current.untrack();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const presenceChannel = supabase.channel(`presence:${circleId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = presenceChannel;

    // ── Sync : source de vérité pour les utilisateurs en ligne
    presenceChannel.on('presence', { event: 'sync' }, () => {
      if (isCleanupRef.current) return;

      const state = presenceChannel.presenceState();
      const users: PresenceUser[] = [];

      for (const key in state) {
        const presences = state[key] as any[];
        if (presences && Array.isArray(presences)) {
          // Prendre la présence la plus récente
          const latest = presences.reduce((best: any, cur: any) => {
            return new Date(cur.online_at) > new Date(best.online_at) ? cur : best;
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

    // ── S'abonner et tracker
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && !isCleanupRef.current) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('id', userId)
          .maybeSingle();

        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          username: profile?.username || null,
        });
      }
    });

    // ── Nettoyage
    return () => {
      isCleanupRef.current = true;

      if (channelRef.current) {
        channelRef.current.untrack();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      setPresentUsers([]);
    };
  }, [circleId, userId]);

  return {
    presentUsers,
    isUserOnline: (checkUserId: string) => presentUsers.some(u => u.user_id === checkUserId),
  };
}