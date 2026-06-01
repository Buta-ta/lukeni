export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = searchParams.get('limit') || '5';

    if (!query) {
      return Response.json({ error: 'Missing query' }, { status: 400 });
    }

    const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
    url.searchParams.append('query', query);
    url.searchParams.append('limit', limit);
    url.searchParams.append('fields', 'paperId,title,abstract,authors,year,venue,citationCount,openAccessPdf,externalIds,url');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    return Response.json(data);

  } catch (error: any) {
    console.error('Semantic Scholar proxy error:', error);
    return Response.json(
      { error: error?.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}