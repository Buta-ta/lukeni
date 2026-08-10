import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Protéger par CRON_SECRET
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key manquante.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Marquer les tickets expirés
    const { data: expiredTickets, error: selectError } = await supabaseAdmin
      .from('visitor_tickets')
      .select('id, user_id, code, expires_at, renewed, new_expires_at')
      .eq('status', 'active');

    if (selectError) throw selectError;

    const now = new Date();
    const toExpire: string[] = [];
    const toDelete: string[] = []; // visiteurs expirés depuis 7+ jours

    for (const ticket of expiredTickets || []) {
      const effectiveExpiry = ticket.renewed && ticket.new_expires_at
        ? new Date(ticket.new_expires_at)
        : new Date(ticket.expires_at);

      if (now > effectiveExpiry) {
        toExpire.push(ticket.id);

        // Si expiré depuis plus de 7 jours → supprimer le compte
        const daysSinceExpiry = (now.getTime() - effectiveExpiry.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceExpiry >= 7) {
          toDelete.push(ticket.user_id);
        }
      }
    }

    // 2. Marquer comme expirés
    let expiredCount = 0;
    if (toExpire.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('visitor_tickets')
        .update({ status: 'expired' })
        .in('id', toExpire);

      if (updateError) console.error('❌ Update expired error:', updateError.message);
      else expiredCount = toExpire.length;
    }

    // 3. Supprimer les comptes visiteurs expirés depuis 7+ jours
    let deletedCount = 0;
    for (const userId of toDelete) {
      try {
        // Supprimer d'abord le ticket
        await supabaseAdmin
          .from('visitor_tickets')
          .delete()
          .eq('user_id', userId);

        // Supprimer le profil
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        // Supprimer l'utilisateur Auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error(`❌ Delete user ${userId}:`, deleteError.message);
        } else {
          deletedCount++;
        }
      } catch (e: any) {
        console.error(`❌ Cleanup user ${userId}:`, e.message);
      }
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      deleted: deletedCount,
      total_checked: expiredTickets?.length || 0,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('❌ cleanup-visitors error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
