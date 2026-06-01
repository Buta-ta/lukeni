'use client';

import { useState, useEffect, useRef } from 'react';
import { CoreResult } from '@/lib/types/external-apis';
import { coreCache, getCacheKey } from '@/lib/cache';

interface CoreResponse {
  results: CoreResult[];
  totalHits: number;
}

export function useCoreApi(query: string, enabled: boolean) {
  const [results, setResults] = useState<CoreResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CoreResult[]>>(new Map());

  useEffect(() => {
    if (!enabled || query.length < 3) {
      setResults([]);
      return;
    }

    const cacheKey = getCacheKey.core(query);

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }

    const sharedCached = coreCache.get<CoreResult[]>(cacheKey);
    if (sharedCached) {
      cacheRef.current.set(cacheKey, sharedCached);
      setResults(sharedCached);
      return;
    }

    const t = setTimeout(async () => {
      setIsLoading(true);

      try {
        // CORE API v3 requiert une clé API, donc on utilise une version simplifiée
        // ✅ APRÈS
const res = await fetch(
  `/api/proxy/core?` +
  new URLSearchParams({
    q: query,
    limit: '5',
  })
);

        if (!res.ok) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as CoreResponse;
        const mapped = (data.results || [])
          .filter((r) => r.downloadUrl || r.download_url || r.urls?.length)
          .slice(0, 3);

        cacheRef.current.set(cacheKey, mapped);
        coreCache.set(cacheKey, mapped);
        setResults(mapped);
      } catch (err) {
        console.error('CORE API search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [query, enabled]);

  return { results, isLoading };
}