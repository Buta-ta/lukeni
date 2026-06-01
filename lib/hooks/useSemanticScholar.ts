'use client';

import { useState, useEffect, useRef } from 'react';
import { ScholarResult } from '@/lib/types/external-apis';
import { scholarCache, getCacheKey } from '@/lib/cache';

interface ScholarResponse {
  data: Array<ScholarResult>;
  total: number;
}

export function useSemanticScholar(query: string, enabled: boolean) {
  const [results, setResults] = useState<ScholarResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, ScholarResult[]>>(new Map());

  useEffect(() => {
    if (!enabled || query.length < 3) {
      setResults([]);
      return;
    }

    const cacheKey = getCacheKey.scholar(query);

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }

    const sharedCached = scholarCache.get<ScholarResult[]>(cacheKey);
    if (sharedCached) {
      cacheRef.current.set(cacheKey, sharedCached);
      setResults(sharedCached);
      return;
    }

    const t = setTimeout(async () => {
      setIsLoading(true);

      try {
    

        // ✅ APRÈS
const res = await fetch(
  `/api/proxy/semantic-scholar?` +
  new URLSearchParams({
    query: query,
    limit: '5',
  })
);

        if (!res.ok) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as ScholarResponse;
        const mapped = (data.data || []).slice(0, 3);

        cacheRef.current.set(cacheKey, mapped);
        scholarCache.set(cacheKey, mapped);
        setResults(mapped);
      } catch (err) {
        console.error('Semantic Scholar search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [query, enabled]);

  return { results, isLoading };
}