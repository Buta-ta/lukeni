'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArchiveResult,
  ArchiveGrouped,
} from '@/lib/types/external-apis';
import { archiveCache, getCacheKey } from '@/lib/cache';

export function useInternetArchive(
  query: string,
  enabled: boolean
) {
  const [results, setResults] = useState<ArchiveGrouped>({
    texts: [],
    image: [],
    audio: [],
    movies: [],
    software: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, ArchiveGrouped>>(new Map());

  useEffect(() => {
    if (!enabled || query.length < 3) {
      setResults({
        texts: [],
        image: [],
        audio: [],
        movies: [],
        software: [],
      });
      return;
    }

    const cacheKey = getCacheKey.archive(query);

    // Vérifier le cache local d'abord
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }

    // Vérifier le cache partagé
    const sharedCached = archiveCache.get<ArchiveGrouped>(cacheKey);
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
  `/api/proxy/archive-org?` +
  new URLSearchParams({
    q: query,
    rows: '20',
  })
);
        if (!res.ok) {
          setResults({
            texts: [],
            image: [],
            audio: [],
            movies: [],
            software: [],
          });
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const docs = (data.response?.docs || []) as ArchiveResult[];

        // Grouper par mediatype
        const grouped: ArchiveGrouped = {
          texts: docs
            .filter((d) => d.mediatype === 'texts')
            .slice(0, 3),
          image: docs
            .filter((d) => d.mediatype === 'image')
            .slice(0, 3),
          audio: docs
            .filter((d) => d.mediatype === 'audio')
            .slice(0, 2),
          movies: docs
            .filter((d) => d.mediatype === 'movies')
            .slice(0, 2),
          software: docs
            .filter((d) => d.mediatype === 'software')
            .slice(0, 1),
        };

        cacheRef.current.set(cacheKey, grouped);
        archiveCache.set(cacheKey, grouped);
        setResults(grouped);
      } catch (err) {
        console.error('Archive.org search error:', err);
        setResults({
          texts: [],
          image: [],
          audio: [],
          movies: [],
          software: [],
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [query, enabled]);

  return { results, isLoading };
}