import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { spotId } = await request.json();
    
    if (!spotId) {
      return NextResponse.json(
        { error: 'Spot ID requis' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }
    
    const { error } = await supabaseAdmin.rpc('increment_live_spot_clicks', { spot_id: spotId });

    if (error) {
      console.error('Error updating click count:', error);
      return NextResponse.json(
        { error: 'Erreur lors du tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Click tracking error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}