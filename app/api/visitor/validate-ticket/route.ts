// app/api/visitor/validate-ticket/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code requis.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Erreur de configuration.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ticket } = await supabaseAdmin
      .from('visitor_tickets')
      .select('id, code, status, expires_at, renewed, new_expires_at, created_at')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json({ valid: false, error: 'Ticket introuvable.' }, { status: 404 });
    }

    // Vérifier si expiré
    const now = new Date();
    const effectiveExpiry = ticket.renewed && ticket.new_expires_at
      ? new Date(ticket.new_expires_at)
      : new Date(ticket.expires_at);

    const isExpired = now > effectiveExpiry;
    const remainingMs = effectiveExpiry.getTime() - now.getTime();
    const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));

    return NextResponse.json({
      valid: !isExpired && ticket.status === 'active',
      ticket: {
        code: ticket.code,
        status: isExpired ? 'expired' : ticket.status,
        created_at: ticket.created_at,
        expires_at: ticket.expires_at,
        renewed: ticket.renewed,
        new_expires_at: ticket.new_expires_at,
        effective_expires_at: effectiveExpiry.toISOString(),
        remaining_minutes: remainingMinutes,
        is_expired: isExpired,
        can_renew: !isExpired && !ticket.renewed,
      },
    });
  } catch (err: any) {
    console.error('❌ validate-ticket error:', err.message);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
