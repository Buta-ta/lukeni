export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const rows = searchParams.get('rows') || '20';

    if (!q) {
      return Response.json({ error: 'Missing q parameter' }, { status: 400 });
    }

    const url = new URL('https://archive.org/advancedsearch.php');
    url.searchParams.append('q', q);
    url.searchParams.append('fl', 'identifier,title,description,mediatype,creator,date,img,downloads,publicdate,language,licenseurl');
    url.searchParams.append('output', 'json');
    url.searchParams.append('rows', rows);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    return Response.json(data);

  } catch (error: any) {
    console.error('Archive.org proxy error:', error);
    return Response.json(
      { error: error?.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}