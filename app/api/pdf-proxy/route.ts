import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Vérifier que c'est bien une URL Cloudinary
    if (!url.includes('cloudinary.com')) {
      return NextResponse.json({ error: 'URL non autorisée' }, { status: 403 });
    }

    // Fetch le PDF depuis Cloudinary
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lukeni/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Cloudinary fetch failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Retourner le PDF avec les bons headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });

  } catch (error: any) {
    console.error('PDF Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}