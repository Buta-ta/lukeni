import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserCircle {
  id: string;
  name: string;
  description?: string;
  book_title?: string;
  book_cover?: string;
  role: string;
}

export interface CircleRequest {
  circle_id: string;
  circle_name: string;
  book_title?: string;
  book_cover?: string;
  status: 'pending' | 'rejected';
  rejected_count: number;
  remaining_attempts: number;
}

export function useUserCircles(user: User | null) {
  const [circles, setCircles] = useState<UserCircle[]>([]);
  const [requests, setRequests] = useState<CircleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        // ── 1. Récupérer les cercles où l'utilisateur est membre
        const { data: memberData } = await supabase
          .from('circle_members')
          .select('role, circle_id')
          .eq('user_id', user.id);

        if (memberData && memberData.length > 0) {
          const circleIds = memberData.map(m => m.circle_id);

          const { data: circlesData } = await supabase
            .from('reading_circles')
            .select('id, name, description, book_id, library_books(title_fr, cover_url)')
            .in('id', circleIds);

          if (circlesData) {
            const roleMap = new Map(memberData.map(m => [m.circle_id, m.role]));
            
            const formatted = circlesData.map(c => ({
              id: c.id,
              name: c.name,
              description: c.description,
              book_title: (c.library_books as any)?.title_fr,
              book_cover: (c.library_books as any)?.cover_url,
              role: roleMap.get(c.id) || 'member',
            }));

            setCircles(formatted);
          }
        }

        // ── 2. Récupérer les demandes d'adhésion
        const { data: requestData } = await supabase
          .from('circle_join_requests')
          .select('circle_id, status')
          .eq('user_id', user.id);

        if (requestData && requestData.length > 0) {
          const circleIds = [...new Set(requestData.map(r => r.circle_id))];

          const { data: circlesData } = await supabase
            .from('reading_circles')
            .select('id, name, library_books(title_fr, cover_url)')
            .in('id', circleIds);

          const circleMap = new Map(
            (circlesData || []).map(c => [c.id, c])
          );

          // Grouper par cercle et compter les rejets
          const requestMap = new Map<string, { rejected: number; latestStatus: string }>();

          requestData.forEach(r => {
            if (!requestMap.has(r.circle_id)) {
              requestMap.set(r.circle_id, { rejected: 0, latestStatus: r.status });
            }
            const entry = requestMap.get(r.circle_id)!;
            if (r.status === 'rejected') {
              entry.rejected += 1;
            }
            entry.latestStatus = r.status;
          });

          const enrichedRequests: CircleRequest[] = [];

          requestMap.forEach((data, circleId) => {
            const circle = circleMap.get(circleId);
            enrichedRequests.push({
              circle_id: circleId,
              circle_name: (circle as any)?.name || 'Cercle inconnu',
              book_title: (circle as any)?.library_books?.title_fr,
              book_cover: (circle as any)?.library_books?.cover_url,
              status: data.latestStatus as 'pending' | 'rejected',
              rejected_count: data.rejected,
              remaining_attempts: 3 - data.rejected,
            });
          });

          setRequests(enrichedRequests);
        }
      } catch (err) {
        console.error('Fetch user circles error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { circles, requests, isLoading };
}