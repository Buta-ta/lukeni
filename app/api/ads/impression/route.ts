// /app/api/ads/impression/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { adId } = await req.json();
    
    if (!adId) {
      return NextResponse.json({ error: 'Missing adId' }, { status: 400 });
    }

    // Incrémenter impressions
    await supabase.rpc('increment_ad_impressions', { ad_id: adId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ad impression error:', error);
    return NextResponse.json({ error: 'Failed to track impression' }, { status: 500 });
  }
}