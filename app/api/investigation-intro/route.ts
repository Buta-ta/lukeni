// app/api/investigation-intro.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const investigationId = searchParams.get('investigationId');

    if (!investigationId) {
      return NextResponse.json(
        { error: 'Missing investigationId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('investigation_intro_config')
      .select('*')
      .eq('investigation_id', investigationId)
      .maybeSingle();

    if (error) {
      console.error('Intro config fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Pas de config = passer directement au jeu
    if (!data) {
      return NextResponse.json({ introConfig: null });
    }

    return NextResponse.json({ introConfig: data });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}