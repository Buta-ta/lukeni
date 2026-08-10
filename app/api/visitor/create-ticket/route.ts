// app/api/visitor/create-ticket/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 pour lisibilité
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LUKENI-V${code}`;
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Erreur de configuration serveur.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Générer un code unique
    let code = generateTicketCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('visitor_tickets')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (!existing) break;
      code = generateTicketCode();
      attempts++;
    }

    const email = `${code.toLowerCase()}@lukeni.visitor`;
    const password = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h

    // 2. Créer l'utilisateur Supabase Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Visiteur ${code}`, is_visitor: true },
    });

    if (createError || !authData?.user) {
      console.error('❌ Visitor create error:', createError?.message);
      return NextResponse.json({ error: 'Impossible de créer le ticket visiteur.' }, { status: 500 });
    }

    // 3. Créer le profil visiteur
    await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      full_name: `Visiteur ${code}`,
      email,
      role: 'visitor',
      created_at: now.toISOString(),
    });

    // 4. Créer le ticket
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';

    const { error: ticketError } = await supabaseAdmin.from('visitor_tickets').insert({
      code,
      user_id: authData.user.id,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      ip_address: ip,
      user_agent: ua,
    });

    if (ticketError) {
      console.error('❌ Ticket insert error:', ticketError.message);
    }

    // 5. Créer la session (signIn)
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('❌ Visitor signIn error:', signInError.message);
      return NextResponse.json({ success: true, code, requireLogin: true });
    }

    return NextResponse.json({
      success: true,
      code,
      ticket: {
        code,
        expires_at: expiresAt.toISOString(),
      },
      session: {
        access_token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
        expires_at: sessionData.session?.expires_at,
        user: sessionData.user,
      },
    });
  } catch (err: any) {
    console.error('❌ create-ticket error:', err.message);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
