'use client';

import { useState, useEffect, useRef } from 'react';
import { ArxivResult } from '@/lib/types/external-apis';
import { arxivCache, getCacheKey } from '@/lib/cache';

export function useArxiv(
  query: string,
  category?: string,
  enabled: boolean = false
) {
  const [results, setResults] = useState<ArxivResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, ArxivResult[]>>(new Map());

  useEffect(() => {
    if (!enabled || query.length < 3) {
      setResults([]);
      return;
    }

    const cacheKey = getCacheKey.arxiv(query);

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }

    const sharedCached = arxivCache.get<ArxivResult[]>(cacheKey);
    if (sharedCached) {
      cacheRef.current.set(cacheKey, sharedCached);
      setResults(sharedCached);
      return;
    }

    const t = setTimeout(async () => {
      setIsLoading(true);

      try {
        // Construire la requête arXiv
        let searchQuery = `search_query=all:${encodeURIComponent(query)}`;
        if (category) {
          searchQuery += `+AND+cat:${encodeURIComponent(category)}`;
        }

        // ✅ APRÈS
const res = await fetch(
  `/api/proxy/arxiv?` +
  new URLSearchParams({
    query: query,
    maxResults: '5',
  })
);

        if (!res.ok) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const xml = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const entries = Array.from(doc.querySelectorAll('entry')).slice(0, 3);

        const mapped: ArxivResult[] = entries.map((entry) => {
          const idNode = entry.querySelector('id')?.textContent || '';
          const arxivId = idNode.split('/abs/')[1] || '';

          return {
            id: arxivId,
            arxivId,
            title:
              entry.querySelector('title')?.textContent?.trim() || '',
            summary:
              entry.querySelector('summary')?.textContent?.trim() || '',
            authors: Array.from(entry.querySelectorAll('author')).map(
              (a) => ({
                name: a.querySelector('name')?.textContent || '',
              })
            ),
            published:
              entry.querySelector('published')?.textContent || '',
            updated: entry.querySelector('updated')?.textContent,
            pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
            category: entry
              .querySelector('arxiv\\:primary_category, primary_category')
              ?.getAttribute('term') || '',
            doi: entry.querySelector('arxiv\\:doi, doi')?.textContent || '',
          };
        });

        cacheRef.current.set(cacheKey, mapped);
        arxivCache.set(cacheKey, mapped);
        setResults(mapped);
      } catch (err) {
        console.error('arXiv search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [query, category, enabled]);

  return { results, isLoading };
}