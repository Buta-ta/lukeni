export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = searchParams.get('limit') || '5';

    if (!q) {
      return Response.json({ error: 'Missing q parameter' }, { status: 400 });
    }

    const url = new URL('https://api.core.ac.uk/v3/search/works');
    url.searchParams.append('q', q);
    url.searchParams.append('limit', limit);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: 'Failed to fetch from CORE' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);

  } catch (error: any) {
    console.error('CORE proxy error:', error);
    return Response.json(
      { error: error?.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}