import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Support des deux formats : { q, source, target } et { text, target }
        const text: string = body.q || body.text || '';
        const source: string = body.source || 'auto';
        const target: string = body.target || 'fr';

        if (!text.trim() || !target) {
            return NextResponse.json(
                { error: 'Missing text or target parameter' },
                { status: 400 }
            );
        }

        if (text.length > 5000) {
            return NextResponse.json(
                { error: 'Text too long (max 5000 characters)' },
                { status: 400 }
            );
        }

        // ── Google Translate API publique (sans clé, gratuite) ──────────────
        const url = new URL('https://translate.googleapis.com/translate_a/single');
        url.searchParams.set('client', 'gtx');
        url.searchParams.set('sl', source);
        url.searchParams.set('tl', target);
        url.searchParams.set('dt', 't');
        url.searchParams.set('q', text);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                'Referer': 'https://translate.google.com/',
            },
            // Important : pas de cache côté serveur
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error(`Google Translate error: ${res.status} ${res.statusText}`);
            return NextResponse.json(
                { error: `Translation service error: ${res.status}` },
                { status: 502 }
            );
        }

        const data = await res.json();

        // Structure de la réponse Google :
        // data[0] = tableau de segments [texte_traduit, texte_original, ...]
        // data[0][i][0] = segment traduit i
        if (!Array.isArray(data) || !Array.isArray(data[0])) {
            return NextResponse.json(
                { error: 'Unexpected translation response format' },
                { status: 502 }
            );
        }

        const translated: string = data[0]
            .filter((segment: any) => Array.isArray(segment) && segment[0])
            .map((segment: any) => segment[0] as string)
            .join('');

        if (!translated) {
            return NextResponse.json(
                { error: 'Empty translation result' },
                { status: 502 }
            );
        }

        // Retourne les deux formats pour compatibilité
        return NextResponse.json({
            translatedText: translated,   // compat ancien format
            translated,                   // nouveau format NotesplitContainer
            source,
            target,
            originalLength: text.length,
        });

    } catch (error: any) {
        console.error('Translate proxy error:', error);
        return NextResponse.json(
            { error: error?.message || 'Translation failed' },
            { status: 500 }
        );
    }
}