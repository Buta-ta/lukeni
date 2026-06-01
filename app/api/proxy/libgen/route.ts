import { NextRequest, NextResponse } from 'next/server';

interface LibGenRawBook {
  Title?: string;
  title?: string;
  Author?: string;
  author?: string;
  Extension?: string;
  extension?: string;
  Filesize?: string;
  filesize?: string;
  MD5?: string;
  md5?: string;
  Coverurl?: string;
  coverurl?: string;
}

// Normalise les champs (LibGen renvoie parfois en CamelCase, parfois lowercase)
function normalizeBook(raw: LibGenRawBook) {
  const md5 = raw.MD5 || raw.md5 || '';
  return {
    md5,
    title:     raw.Title     || raw.title     || 'Unknown',
    author:    raw.Author    || raw.author    || '',
    extension: raw.Extension || raw.extension || '',
    filesize:  raw.Filesize  || raw.filesize  || '',
    coverurl:  raw.Coverurl  || raw.coverurl  || '',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ books: [] });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; Lukeni/1.0)',
    'Accept': 'application/json, text/html',
  };

  // ── Tentative 1 : libgen.is JSON API ─────────────────────────────────────
  try {
    const url = `https://libgen.is/search.php?req=${encodeURIComponent(q)}&res=10&output=json`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const text = await res.text();
      // LibGen peut renvoyer du HTML ou du JSON selon la requête
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        const books = Array.isArray(data)
          ? data.slice(0, 8).map(normalizeBook)
          : [];
        if (books.length > 0) {
          return NextResponse.json(
            { books },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              },
            }
          );
        }
      }
    }
  } catch (err) {
    console.warn('LibGen mirror 1 failed:', err);
  }

  // ── Tentative 2 : libgen.st (mirror alternatif) ───────────────────────────
  try {
    const url = `https://libgen.st/search.php?req=${encodeURIComponent(q)}&res=10&output=json`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        const books = Array.isArray(data)
          ? data.slice(0, 8).map(normalizeBook)
          : [];
        return NextResponse.json(
          { books },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
          }
        );
      }
    }
  } catch (err) {
    console.warn('LibGen mirror 2 failed:', err);
  }

  // ── Échec total → retourne tableau vide (pas d'erreur affichée) ───────────
  return NextResponse.json({ books: [] });
}