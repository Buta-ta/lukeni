import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Erreur de configuration.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Récupérer l'utilisateur depuis le token Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Vérifier le token avec Supabase
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    // 2. Vérifier que c'est un visiteur
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'visitor') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });
    }

    // 3. Récupérer le ticket actif
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('visitor_tickets')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket introuvable.' }, { status: 404 });
    }

    // 4. Vérifier qu'il n'a pas déjà été renouvelé
    if (ticket.renewed) {
      return NextResponse.json({ error: 'Déjà renouvelé. Maximum atteint (4h).' }, { status: 400 });
    }

    // 5. Renouveler : +2h
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { error: updateError } = await supabaseAdmin
      .from('visitor_tickets')
      .update({
        renewed: true,
        renewed_at: now.toISOString(),
        new_expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', ticket.id);

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors du renouvellement.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      new_expires_at: newExpiresAt.toISOString(),
      renewed: true,
    });
  } catch (err: any) {
    console.error('❌ renew-ticket error:', err.message);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
