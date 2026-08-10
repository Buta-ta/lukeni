import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ce endpoint est appelé par Vercel Cron chaque jour à 08h00 (cf. vercel.json).
// Il relaie vers l'Edge Function Supabase "send-daily-push" qui se charge
// d'envoyer les notifications d'anniversaire.
export async function GET(request: Request) {
  try {
    // 1. Vérifier que l'appel provient bien de Vercel Cron
    const authHeader = request.headers.get('authorization');
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expected) {
      console.warn('❌ CRON_SECRET incorrect');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ CRON Anniversary lancé');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL manquant');

    // 2. Appeler l'Edge Function avec le CRON_SECRET (et non plus la clé anon)
    //    La fonction s'attend à recevoir :
    //      header  Authorization: Bearer <CRON_SECRET>
    //      body    {}  (déclenche la branche anniversaire)
    const response = await fetch(`${supabaseUrl}/functions/v1/send-daily-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function error:', data);
      return NextResponse.json(
        { error: 'Edge function failed', details: data },
        { status: response.status }
      );
    }

    console.log('✅ Notifications anniversaire envoyées:', data);
    return NextResponse.json({
      success: true,
      message: 'Anniversary notifications sent',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ CRON error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
