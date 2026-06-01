import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params;

    if (!paperId) {
      return NextResponse.json({ error: 'Missing paperId' }, { status: 400 });
    }

    const url = new URL(`https://api.semanticscholar.org/graph/v1/paper/${paperId}`);
    url.searchParams.append('fields', 'paperId,title,abstract,authors,year,venue,citationCount,openAccessPdf,externalIds,url');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch paper' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Semantic Scholar detail proxy error:', error);
    return NextResponse.json(
      { error: error?.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}