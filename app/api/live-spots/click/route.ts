import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  console.log('📩 API /live-spots/click appelée');
  
  try {
    const body = await request.json();
    const { spotId } = body;
    
    console.log('🔍 Spot ID reçu:', spotId);

    if (!spotId) {
      console.error('❌ Spot ID manquant');
      return NextResponse.json({ error: 'Spot ID requis' }, { status: 400 });
    }

    // Vérifier que la clé service_role existe
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