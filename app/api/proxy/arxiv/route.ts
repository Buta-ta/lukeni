export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const maxResults = searchParams.get('maxResults') || '5';

    if (!query) {
      return Response.json({ error: 'Missing query' }, { status: 400 });
    }

    const url = new URL('https://export.arxiv.org/api/query');
    url.searchParams.append('search_query', `all:${query}`);
    url.searchParams.append('start', '0');
    url.searchParams.append('max_results', maxResults);
    url.searchParams.append('sortBy', 'submittedDate');
    url.searchParams.append('sortOrder', 'descending');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/atom+xml',
        'User-Agent': 'Lukeni/1.0 (contact@lukeni.app)',
      },
    });

    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/atom+xml' },
    });

  } catch (error: any) {
    console.error('arXiv proxy error:', error);
    return Response.json(
      { error: error?.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}