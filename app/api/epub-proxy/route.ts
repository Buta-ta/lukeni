// app/api/epub-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOMAINS = [
  'res.cloudinary.com',
  'cloudinary.com',
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

function isAllowedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return NextResponse.json({ error: 'Paramètre "url" manquant.' }, { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(fileUrl);
  } catch {
    return NextResponse.json({ error: 'URL malformée.' }, { status: 400 });
  }

  if (!isAllowedDomain(decodedUrl)) {
    return NextResponse.json({ error: 'Domaine non autorisé.' }, { status: 403 });
  }

  if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'Protocole non supporté.' }, { status: 400 });
  }

  console.log('[epub-proxy] Fetching:', decodedUrl);

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    response = await fetch(decodedUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lukeni/1.0)',
        'Accept': '*/*',
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
  } catch (err: any) {
    console.error('[epub-proxy] Fetch error:', err?.name, err?.message);
    const isAbort = err?.name === 'AbortError';
    return NextResponse.json(
      { error: isAbort ? 'Délai dépassé (30s).' : `Fetch échoué: ${err?.message}` },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[epub-proxy] Remote error:', response.status, response.statusText, body.slice(0, 200));
    return NextResponse.json(
      { error: `Cloudinary a répondu avec ${response.status}: ${response.statusText}` },
      { status: response.status }
    );
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await response.arrayBuffer();
  } catch (err: any) {
    console.error('[epub-proxy] ArrayBuffer read error:', err);
    return NextResponse.json(
      { error: `Erreur lecture: ${err?.message}` },
      { status: 502 }
    );
  }

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: 'Fichier reçu vide.' }, { status: 502 });
  }

  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (${Math.round(buffer.byteLength / 1024 / 1024)}Mo, max 50Mo).` },
      { status: 413 }
    );
  }

  // Vérification magic bytes ZIP (PK\x03\x04)
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (!isZip) {
    console.warn('[epub-proxy] Fichier ne commence pas par PK — peut ne pas être un EPUB valide');
  }

  console.log(`[epub-proxy] OK — ${Math.round(buffer.byteLength / 1024)}Ko — isZip: ${isZip}`);

  // ✅ On retourne le buffer avec le bon Content-Type
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Length': buffer.byteLength.toString(),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': 'inline; filename="book.epub"',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}