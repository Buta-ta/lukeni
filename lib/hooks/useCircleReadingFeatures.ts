import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface CircleBookmark {
  id: string;
  circle_id: string;
  user_id: string;
  page_number: number;
  label: string;
  category: 'spoiler' | 'concept' | 'citation' | 'important' | 'note';
  created_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface CircleHighlight {
  id: string;
  circle_id: string;
  user_id: string;
  page_number: number;
  text_excerpt: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  annotation?: string;
  created_at: string;
  profiles?: {
    full_name?: string;
  };
}

export interface ReadingStage {
  id: string;
  circle_id: string;
  title: string;
  start_page: number;
  end_page: number;
  description?: string;
  position: number;
  created_at: string;
}

export interface ReadingStats {
  circle_id: string;
  average_page: number;
  furthest_page: number;
  members_count: number;
  updated_at: string;
}

export interface CircleEvent {
  id: string;
  circle_id: string;
  event_type: string;
  user_id?: string;
  description: string;
  metadata?: any;
  created_at: string;
  profiles?: {
    full_name?: string;
  };
}

export interface CirclePoll {
  id: string;
  circle_id: string;
  created_by: string;
  question: string;
  poll_type: 'binary' | 'multiple';
  options: string[];
  ends_at?: string;
  created_at: string;
  responses?: CirclePollResponse[];
  profiles?: {
    full_name?: string;
  };
}

export interface CirclePollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface CircleSummary {
  id: string;
  circle_id: string;
  stage_id?: string;
  user_id: string;
  title: string;
  content: string;
  is_official: boolean;
  upvote_count: number;
  created_at: string;
  profiles?: {
    full_name?: string;
  };
  userVote?: boolean; // true = upvote, false = downvote, null = no vote
}

export interface CircleQuiz {
  id: string;
  circle_id: string;
  created_by: string;
  stage_id?: string;
  question: string;
  quiz_type: 'true_false' | 'multiple';
  options: string[];
  correct_index: number;
  created_at: string;
  userResponse?: CircleQuizResponse;
}

export interface CircleQuizResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  selected_option_index: number;
  is_correct: boolean;
  created_at: string;
}

// ============================================================================
// HOOK : Repères collectifs (Bookmarks)
// ============================================================================
export function useCircleBookmarks(circleId: string, userId?: string) {
  const [bookmarks, setBookmarks] = useState<CircleBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;

    const loadBookmarks = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_bookmarks')
          .select('*')
          .eq('circle_id', circleId)
          .order('page_number', { ascending: true });

        if (err) throw err;
        setBookmarks(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load bookmarks error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookmarks();

    // Realtime
    const channel = supabase.channel(`bookmarks:${circleId}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_bookmarks',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setBookmarks(prev => [...prev, payload.new]);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'circle_bookmarks',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setBookmarks(prev => prev.filter(b => b.id !== payload.old.id));
      }
    );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [circleId]);

  const addBookmark = useCallback(async (page: number, label: string, category: string) => {
    if (!userId || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_bookmarks')
        .insert({
          circle_id: circleId,
          user_id: userId,
          page_number: page,
          label,
          category,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Add bookmark error:', err);
    }
  }, [circleId, userId]);

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    try {
      const { error: err } = await supabase
        .from('circle_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (err) throw err;
    } catch (err: any) {
      console.error('Remove bookmark error:', err);
    }
  }, []);

  return {
    bookmarks,
    isLoading,
    error,
    addBookmark,
    removeBookmark,
  };
}

// ============================================================================
// HOOK : Highlights partagés
// ============================================================================
export function useCircleHighlights(circleId: string, userId?: string) {
  const [highlights, setHighlights] = useState<CircleHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;

    const loadHighlights = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_highlights')
          .select('*')
          .eq('circle_id', circleId)
          .order('page_number', { ascending: true });

        if (err) throw err;
        setHighlights(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load highlights error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHighlights();

    // Realtime
    const channel = supabase.channel(`highlights:${circleId}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_highlights',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setHighlights(prev => [...prev, payload.new]);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'circle_highlights',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setHighlights(prev => prev.filter(h => h.id !== payload.old.id));
      }
    );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [circleId]);

  const addHighlight = useCallback(async (page: number, text: string, color: string, annotation?: string) => {
    if (!userId || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_highlights')
        .insert({
          circle_id: circleId,
          user_id: userId,
          page_number: page,
          text_excerpt: text.substring(0, 500),
          color,
          annotation,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Add highlight error:', err);
    }
  }, [circleId, userId]);

  const removeHighlight = useCallback(async (highlightId: string) => {
    try {
      const { error: err } = await supabase
        .from('circle_highlights')
        .delete()
        .eq('id', highlightId);

      if (err) throw err;
    } catch (err: any) {
      console.error('Remove highlight error:', err);
    }
  }, []);

  return {
    highlights,
    isLoading,
    error,
    addHighlight,
    removeHighlight,
  };
}

// ============================================================================
// HOOK : Statistiques de lecture
// ============================================================================
export function useCircleReadingStats(circleId: string, members: any[]) {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!circleId || members.length === 0) return;

    const updateStats = () => {
      const pages = members.map(m => m.current_page);
      const average = Math.round(pages.reduce((a, b) => a + b, 0) / pages.length);
      const furthest = Math.max(...pages);

      setStats({
        circle_id: circleId,
        average_page: average,
        furthest_page: furthest,
        members_count: members.length,
        updated_at: new Date().toISOString(),
      });

      setIsLoading(false);
    };

    updateStats();
  }, [circleId, members]);

  return { stats, isLoading };
}

// ============================================================================
// HOOK : Timeline d'événements
// ============================================================================
export function useCircleEvents(circleId: string) {
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;

    const loadEvents = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_events')
          .select('*')
          .eq('circle_id', circleId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (err) throw err;
        setEvents(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load events error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();

    // Realtime
    const channel = supabase.channel(`events:${circleId}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_events',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setEvents(prev => [payload.new, ...prev]);
      }
    );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [circleId]);

  const logEvent = useCallback(async (type: string, description: string, metadata?: any, userId?: string) => {
    if (!circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_events')
        .insert({
          circle_id: circleId,
          event_type: type,
          description,
          metadata,
          user_id: userId,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Log event error:', err);
    }
  }, [circleId]);

  return {
    events,
    isLoading,
    error,
    logEvent,
  };
}

// ============================================================================
// HOOK : Sondages
// ============================================================================
export function useCirclePolls(circleId: string, userId?: string) {
  const [polls, setPolls] = useState<CirclePoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;

    const loadPolls = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_polls')
          .select('*')
          .eq('circle_id', circleId)
          .order('created_at', { ascending: false });

        if (err) throw err;

        // Charger les réponses pour chaque sondage
        const pollsWithResponses = await Promise.all(
          (data || []).map(async poll => {
            const { data: responses } = await supabase
              .from('circle_poll_responses')
              .select('*')
              .eq('poll_id', poll.id);

            return {
              ...poll,
              responses: responses || [],
            };
          })
        );

        setPolls(pollsWithResponses);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load polls error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolls();

    // Realtime
    const channel = supabase.channel(`polls:${circleId}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_polls',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setPolls(prev => [{ ...payload.new, responses: [] }, ...prev]);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_poll_responses',
      },
      (payload) => {
        setPolls(prev =>
          prev.map(p =>
            p.id === payload.new.poll_id
              ? { ...p, responses: [...(p.responses || []), payload.new] }
              : p
          )
        );
      }
    );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [circleId]);

  const createPoll = useCallback(async (question: string, options: string[], type: string) => {
    if (!userId || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_polls')
        .insert({
          circle_id: circleId,
          created_by: userId,
          question,
          options,
          poll_type: type,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Create poll error:', err);
    }
  }, [circleId, userId]);

  const votePoll = useCallback(async (pollId: string, optionIndex: number) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('circle_poll_responses')
        .insert({
          poll_id: pollId,
          user_id: userId,
          option_index: optionIndex,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Vote poll error:', err);
    }
  }, [userId]);

  return {
    polls,
    isLoading,
    error,
    createPoll,
    votePoll,
  };
}

// ============================================================================
// HOOK : Résumés collaboratifs
// ============================================================================
export function useCircleSummaries(circleId: string, userId?: string) {
  const [summaries, setSummaries] = useState<CircleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;

    const loadSummaries = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_summaries')
          .select('*')
          .eq('circle_id', circleId)
          .order('upvote_count', { ascending: false });

        if (err) throw err;

        // Charger les votes pour l'utilisateur
        if (userId) {
          const { data: votes } = await supabase
            .from('circle_summary_votes')
            .select('*')
            .eq('user_id', userId);

          const voteMap = new Map(votes?.map(v => [v.summary_id, v.is_upvote]) || []);

          setSummaries((data || []).map(s => ({
            ...s,
            userVote: voteMap.get(s.id),
          })));
        } else {
          setSummaries(data || []);
        }

        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load summaries error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummaries();

    // Realtime
    const channel = supabase.channel(`summaries:${circleId}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_summaries',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setSummaries(prev => [payload.new, ...prev]);
      }
    );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [circleId, userId]);

  const createSummary = useCallback(async (title: string, content: string, stageId?: string) => {
    if (!userId || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_summaries')
        .insert({
          circle_id: circleId,
          user_id: userId,
          title,
          content,
          stage_id: stageId,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Create summary error:', err);
    }
  }, [circleId, userId]);

  const voteSummary = useCallback(async (summaryId: string, isUpvote: boolean) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('circle_summary_votes')
        .insert({
          summary_id: summaryId,
          user_id: userId,
          is_upvote: isUpvote,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Vote summary error:', err);
    }
  }, [userId]);

  return {
    summaries,
    isLoading,
    error,
    createSummary,
    voteSummary,
  };
}

// ============================================================================
// HOOK : Questions de compréhension
// ============================================================================
export function useCircleQuizzes(circleId: string, userId?: string) {
  const [quizzes, setQuizzes] = useState<CircleQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;

    const loadQuizzes = async () => {
      try {
        const { data, error: err } = await supabase
          .from('circle_quizzes')
          .select('*')
          .eq('circle_id', circleId)
          .order('created_at', { ascending: false });

        if (err) throw err;

        // Charger les réponses de l'utilisateur
        if (userId) {
          const { data: responses } = await supabase
            .from('circle_quiz_responses')
            .select('*')
            .eq('user_id', userId);

          const responseMap = new Map(responses?.map(r => [r.quiz_id, r]) || []);

          setQuizzes((data || []).map(q => ({
            ...q,
            correct_index: q.options.length, // Ne pas révéler la réponse côté client
            userResponse: responseMap.get(q.id),
          })));
        } else {
          setQuizzes(data || []);
        }

        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Load quizzes error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuizzes();

    // Realtime
    const channel = supabase.channel(`quizzes:${circleId}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_quizzes',
        filter: `circle_id=eq.${circleId}`
      },
      (payload) => {
        setQuizzes(prev => [payload.new, ...prev]);
      }
    );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [circleId, userId]);

  const createQuiz = useCallback(async (question: string, options: string[], correctIndex: number, type: string, stageId?: string) => {
    if (!userId || !circleId) return;

    try {
      const { error: err } = await supabase
        .from('circle_quizzes')
        .insert({
          circle_id: circleId,
          created_by: userId,
          question,
          options,
          correct_index: correctIndex,
          quiz_type: type,
          stage_id: stageId,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Create quiz error:', err);
    }
  }, [circleId, userId]);

  const answerQuiz = useCallback(async (quizId: string, optionIndex: number) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('circle_quiz_responses')
        .insert({
          quiz_id: quizId,
          user_id: userId,
          selected_option_index: optionIndex,
        });

      if (err) throw err;
    } catch (err: any) {
      console.error('Answer quiz error:', err);
    }
  }, [userId]);

  return {
    quizzes,
    isLoading,
    error,
    createQuiz,
    answerQuiz,
  };
}