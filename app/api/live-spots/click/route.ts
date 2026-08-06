import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Rate-limit clics: 5/min/IP
const clickCounts = new Map<string, number[]>();
function isClickFlooding(ip: string): boolean {
  const now = Date.now();
  const arr = clickCounts.get(ip) || [];
  const recent = arr.filter(t => now - t < 60_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  clickCounts.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  console.log('📩 API /live-spots/click appelée');
  
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    if (isClickFlooding(ip)) {
      return NextResponse.json({ error: 'Trop de clics, réessayez dans 1 min' }, { status: 429 });
    }

    const body = await request.json();
    const { spotId } = body;
    
    console.log('🔍 Spot ID reçu:', spotId);

    if (!spotId || typeof spotId !== 'string' || spotId.length > 100) {
      console.error('❌ Spot ID manquant');
      return NextResponse.json({ error: 'Spot ID requis' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Variables Supabase manquantes');
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Étape 1 : Lire le compteur actuel
    const { data: spot, error: fetchError } = await supabaseAdmin
      .from('live_spots')
      .select('clicks_count')
      .eq('id', spotId)
      .single();

    if (fetchError) {
      console.error('❌ Erreur lecture spot:', fetchError);
      return NextResponse.json({ error: 'Spot non trouvé', details: fetchError }, { status: 404 });
    }

    console.log('📊 Compteur actuel:', spot?.clicks_count);

    // Étape 2 : Incrémenter
    const newCount = (spot.clicks_count || 0) + 1;

    const { error: updateError } = await supabaseAdmin
      .from('live_spots')
      .update({ clicks_count: newCount })
      .eq('id', spotId);

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      return NextResponse.json({ error: 'Erreur mise à jour', details: updateError }, { status: 500 });
    }

    console.log('✅ Nouveau compteur:', newCount);
    return NextResponse.json({ success: true, clicks_count: newCount });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}