// /app/api/ads/click/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { adId, linkUrl } = await req.json();
    
    if (!adId || !linkUrl) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Incrémenter clicks
    await supabase.rpc('increment_ad_clicks', { ad_id: adId });

    return NextResponse.json({ success: true, redirect: linkUrl });
  } catch (error) {
    console.error('Ad click error:', error);
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }
}