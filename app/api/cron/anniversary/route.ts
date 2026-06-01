import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // ✅ Vérifier le CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expected) {
      console.log('❌ CRON_SECRET incorrect');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ CRON Anniversary lancé');

    // ✅ Appeler la Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Variables Supabase manquantes');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          type: 'anniversary',
          timestamp: new Date().toISOString(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function error:', data);
      return NextResponse.json(
        { error: 'Edge function failed', details: data },
        { status: response.status }
      );
    }

    console.log('✅ Push notifications sent:', data);

    return NextResponse.json({
      success: true,
      message: 'Anniversary notifications sent',
      data: data,
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