import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface PresenceUser {
  user_id: string;
  online_at: string;
  full_name?: string;
  avatar_url?: string;
  username?: string;
}

export function useCirclePresence(circleId: string, userId?: string) {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const didTrackRef = useRef(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!circleId || !userId) return;

    // Nettoyer l'ancien channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    didTrackRef.current = false;

    const channel = supabase.channel(`presence:${circleId}`, {
      config: { presence: { key: userId } }
    });

    channelRef.current = channel;

    // ── Sync = source de vérité unique
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: PresenceUser[] = [];

      for (const key in state) {
        const presences = state[key] as any[];
        if (presences?.length > 0) {
          const p = presences[presences.length - 1];
          users.push({
            user_id: p.user_id,
            online_at: p.online_at,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            username: p.username,
          });
        }
      }

      console.log('👥 Online:', users.map(u => u.full_name || u.user_id));
      setPresentUsers(users);
    });

    // ── Subscribe + Track
    channel.subscribe(async (status, err) => {
      if (err) console.error('❌ Presence error:', err);

      if (status === 'SUBSCRIBED' && !didTrackRef.current) {
        didTrackRef.current = true;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('id', userId)
          .maybeSingle();

        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          username: profile?.username || null,
        });

        console.log('✅ Tracked:', profile?.full_name || userId);
      }
    });

    // ── Cleanup
    return () => {
      console.log('🧹 Cleanup presence:', userId);
      didTrackRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
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