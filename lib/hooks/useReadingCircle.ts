import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CircleMember {
  id: string;
  user_id: string;
  current_page: number;
  role: 'creator' | 'moderator' | 'member';
  last_active_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
}

export interface ReadingCircle {
  id: string;
  book_id: string;
  name: string;
  description?: string;
  creator_id: string;
  is_public: boolean;
  max_members: number;
  access_code: string;
  current_page: number;
  is_live: boolean;
  created_at: string;
  updated_at: string;
  members?: CircleMember[];
}

export function useReadingCircle(circleId: string, userId?: string) {
  const [circle, setCircle] = useState<ReadingCircle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Charger les données initiales ──
  useEffect(() => {
    if (!circleId) return;

    const loadCircle = async () => {
      try {
        setIsLoading(true);
        
        const [circleRes, membersRes] = await Promise.all([
          supabase
            .from('reading_circles')
            .select('*')
            .eq('id', circleId)
            .single(),
          supabase
            .from('circle_members')
            .select('*, profiles(full_name, avatar_url, username)')
            .eq('circle_id', circleId)
            .order('last_active_at', { ascending: false })
        ]);

        if (circleRes.error) throw circleRes.error;
        
        setCircle(circleRes.data);
        setMembers(membersRes.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load circle error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCircle();
  }, [circleId]);

  // ── Supabase Realtime ──
  useEffect(() => {
    if (!circleId || !userId) return;

    const realtimeChannel = supabase.channel(`circle:${circleId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      }
    });

    // 🔴 PRESENCE : Qui est en ligne ?
    realtimeChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = realtimeChannel.presenceState();
        console.log('📍 Online members:', Object.keys(presenceState));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('✅ Member joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('❌ Member left:', leftPresences);
      });

    // 📡 BROADCAST : Changement de page
    realtimeChannel.on('broadcast', { event: 'page-change' }, ({ payload }) => {
      setCircle(prev => prev ? { ...prev, current_page: payload.page } : null);
    });

    // 📡 BROADCAST : Nouveau membre
    realtimeChannel.on('broadcast', { event: 'member-joined' }, ({ payload }) => {
      setMembers(prev => [...prev, payload.member]);
    });

    // 📡 BROADCAST : Progression mise à jour
    realtimeChannel.on('broadcast', { event: 'progress-update' }, ({ payload }) => {
      setMembers(prev =>
        prev.map(m => m.user_id === payload.user_id ? { ...m, current_page: payload.page } : m)
      );
    });

    // 🗃️ POSTGRES CHANGES : Mises à jour de la DB
    realtimeChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'reading_circles',
        filter: `id=eq.${circleId}`
      },
      (payload) => {
        setCircle(prev => prev ? { ...prev, ...payload.new } : null);
      }
    );

    realtimeChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await realtimeChannel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [circleId, userId]);

  // ── Actions ──
  const changePage = useCallback(async (newPage: number) => {
    if (!circle || !channel) return;

    // 1. Broadcast immédiat
    await channel.send({
      type: 'broadcast',
      event: 'page-change',
      payload: { page: newPage }
    });

    // 2. Mise à jour DB
    const { error } = await supabase
      .from('reading_circles')
      .update({ current_page: newPage, updated_at: new Date().toISOString() })
      .eq('id', circle.id);

    if (error) {
      setError(error.message);
    }
  }, [circle, channel]);

  const updateMyProgress = useCallback(async (page: number) => {
    if (!userId || !circle) return;

    // 1. Broadcast
    await channel?.send({
      type: 'broadcast',
      event: 'progress-update',
      payload: { user_id: userId, page }
    });

    // 2. Update DB
    const { error } = await supabase
      .from('circle_members')
      .update({ current_page: page, last_active_at: new Date().toISOString() })
      .eq('circle_id', circle.id)
      .eq('user_id', userId);

    if (error) setError(error.message);
  }, [userId, circle, channel]);

  const toggleLive = useCallback(async () => {
    if (!circle) return;

    const { error } = await supabase
      .from('reading_circles')
      .update({ is_live: !circle.is_live })
      .eq('id', circle.id);

    if (error) setError(error.message);
  }, [circle]);

  return {
    circle,
    members,
    isLoading,
    error,
    changePage,
    updateMyProgress,
    toggleLive,
  };
}