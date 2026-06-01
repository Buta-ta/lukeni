import { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface OpenLibraryBook {
  key: string;              // Ex: "/works/OL45804W"
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  ia?: string[];            // Internet Archive IDs
  public_scan_b?: boolean;  // true = domaine public lisible directement
  edition_key?: string[];
  subject?: string[];
}

export interface EnrichedOLBook extends OpenLibraryBook {
  readableId?: string;      // OCAID si disponible
  readStatus: 'public' | 'borrow' | 'unknown';
  embedUrl?: string | null; // URL pour iframe archive.org
}

export interface LibGenBook {
  md5: string;
  title: string;
  author: string;
  extension: string;
  filesize: string;
  coverurl?: string;
}

// ============================================================================
// HOOK — Open Library Search
// ============================================================================

export function useOpenLibrary(query: string, enabled: boolean) {
  const [books, setBooks] = useState<EnrichedOLBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || query.length < 3) {
      setBooks([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i,first_publish_year,ia,public_scan_b,edition_key&limit=8`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`OL status ${res.status}`);

        const data = await res.json();

        const enriched: EnrichedOLBook[] = (data.docs || []).map(
          (book: OpenLibraryBook): EnrichedOLBook => {
            // ✅ Domaine public — ia[] existe ET public_scan_b = true
            if (book.public_scan_b && book.ia?.[0]) {
              return {
                ...book,
                readableId: book.ia[0],
                readStatus: 'public',
                // URL embed correcte pour archive.org
                embedUrl: `https://archive.org/embed/${book.ia[0]}`,
              };
            }

            // ia[] existe mais pas lisible librement → emprunt OL
            if (book.ia?.[0]) {
              return {
                ...book,
                readableId: book.ia[0],
                readStatus: 'borrow',
                embedUrl: null,
              };
            }

            // Pas de fichier connu
            return {
              ...book,
              readStatus: 'unknown',
              embedUrl: null,
            };
          }
        );

        setBooks(enriched);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('OpenLibrary search error:', err.message);
        }
        setBooks([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return { books, isLoading };
}

// ============================================================================
// HOOK — LibGen Search (via notre API route)
// ============================================================================

export function useLibGen(query: string, enabled: boolean) {
  const [books, setBooks] = useState<LibGenBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || query.length < 3) {
      setBooks([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/libgen?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`LibGen API status ${res.status}`);

        const data = await res.json();
        setBooks(Array.isArray(data.books) ? data.books : []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('LibGen search error:', err.message);
        }
        setBooks([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return { books, isLoading };
}