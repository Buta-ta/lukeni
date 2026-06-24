import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface InvestigationPresenceUser {
  user_id: string;
  character_id: string | null;
  scene_id: string | null;
  online_at: string;
  profile?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
  character?: {
    name_fr: string;
    name_en: string;
    avatar_url?: string;
  };
}

export function useInvestigationPresence(
  investigationId: string,
  groupId: string | null,
  userId?: string
) {
  const [presentUsers, setPresentUsers] = useState<InvestigationPresenceUser[]>([]);

  useEffect(() => {
     if (!investigationId || investigationId.includes('[id]') || investigationId.includes('%5B') || !userId) return;

    let presenceChannel: RealtimeChannel | null = null;
    let isCleanup = false;

    const setupPresence = async () => {
      const channelName = groupId
        ? `presence:investigation:${investigationId}:group:${groupId}`
        : `presence:investigation:${investigationId}`;

      presenceChannel = supabase.channel(channelName, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      // ── Sync : Récupérer tous les utilisateurs en ligne
      presenceChannel.on('presence', { event: 'sync' }, async () => {
        if (isCleanup || !presenceChannel) return;

        const state = presenceChannel.presenceState();
        const users: InvestigationPresenceUser[] = [];

        for (const key in state) {
          const presences = state[key] as any[];
          if (presences && Array.isArray(presences)) {
            const latest = presences.reduce((latest: any, current: any) => {
              return new Date(current.online_at) > new Date(latest.online_at)
                ? current
                : latest;
            });

            users.push({
              user_id: latest.user_id,
              character_id: latest.character_id || null,
              scene_id: latest.scene_id || null,
              online_at: latest.online_at,
              profile: {
                full_name: latest.profile_full_name,
                avatar_url: latest.profile_avatar_url,
                username: latest.profile_username,
              },
              character: latest.character_name_fr
                ? {
                    name_fr: latest.character_name_fr,
                    name_en: latest.character_name_en,
                    avatar_url: latest.character_avatar_url,
                  }
                : undefined,
            });
          }
        }

        setPresentUsers(users);
      });

      // ── Leave : Un utilisateur quitte
      presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (isCleanup) return;

        const leftIds = new Set((leftPresences as any[]).map((p: any) => p.user_id));
        setPresentUsers(prev => prev.filter(p => !leftIds.has(p.user_id)));
      });

      // ── Subscribe
      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !isCleanup) {
          // Récupérer la session actuelle pour les infos du personnage
          const { data: session } = await supabase
            .from('investigation_sessions')
            .select('character_id, current_scene_id')
            .eq('investigation_id', investigationId)
            .eq('user_id', userId)
            .maybeSingle();

          // Récupérer le profil
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', userId)
            .maybeSingle();

          // Récupérer le personnage si présent
          let character = null;
          if (session?.character_id) {
            const { data: char } = await supabase
              .from('investigation_characters')
              .select('name_fr, name_en, avatar_url')
              .eq('id', session.character_id)
              .maybeSingle();
            character = char;
          }

          await presenceChannel?.track({
            user_id: userId,
            character_id: session?.character_id || null,
            scene_id: session?.current_scene_id || null,
            online_at: new Date().toISOString(),
            profile_full_name: profile?.full_name || null,
            profile_avatar_url: profile?.avatar_url || null,
            profile_username: profile?.username || null,
            character_name_fr: character?.name_fr || null,
            character_name_en: character?.name_en || null,
            character_avatar_url: character?.avatar_url || null,
          });
        }
      });
    };

    setupPresence();

    // ── Heartbeat : Mettre à jour la présence toutes les 15 secondes
    const heartbeatInterval = setInterval(async () => {
      if (presenceChannel && !isCleanup) {
        const { data: session } = await supabase
          .from('investigation_sessions')
          .select('character_id, current_scene_id')
          .eq('investigation_id', investigationId)
          .eq('user_id', userId)
          .maybeSingle();

        await presenceChannel.track({
          user_id: userId,
          character_id: session?.character_id || null,
          scene_id: session?.current_scene_id || null,
          online_at: new Date().toISOString(),
        });
      }
    }, 15000);

    // ── Cleanup
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
  }, [investigationId, groupId, userId]);

  return {
    presentUsers,
    isUserOnline: (checkUserId: string) =>
      presentUsers.some(u => u.user_id === checkUserId),
  };
}