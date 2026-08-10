// app/api/notifications/send-push/route.ts
// ----------------------------------------------------------------------------
// Envoi d'une notification push manuelle (réservé aux superadmins).
//
// Pourquoi cette route ?
// Auparavant, le front appelait DIRECTEMENT la fonction Edge Supabase
// "/functions/v1/notify" avec la clé anon. Cette fonction orpheline n'exigeait
// aucune authentification → n'importe qui, sans compte, pouvait envoyer des
// push à tous les abonnés.
//
// Désormais :
//  1. Le front appelle /api/notifications/send-push (avec le cookie de session).
//  2. Cette route vérifie que l'appelant est authentifié ET superadmin.
//  3. Elle envoie les notifications depuis le serveur avec la clé VAPID privée.
// ----------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import webpush from 'web-push';

// Helper : ignorer silencieusement une erreur d'écriture en BDD (logs, etc.)
// sans utiliser .catch() (non typé sur PostgrestFilterBuilder).
async function safeQuery(p: PromiseLike<unknown>): Promise<void> {
  try {
    await p;
  } catch {
    /* ignore */
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification obligatoire via cookie de session
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    // 2. Vérification stricte du rôle superadmin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé : superadmin uniquement' }, { status: 403 });
    }

    // 3. Validation du payload
    const { title, body, url: targetUrl, icon, tag } = await req.json();
    if (!title || typeof title !== 'string' || title.length > 100) {
      return NextResponse.json({ error: 'Titre invalide (1-100 car.)' }, { status: 400 });
    }
    if (!body || typeof body !== 'string' || body.length > 240) {
      return NextResponse.json({ error: 'Contenu invalide (1-240 car.)' }, { status: 400 });
    }

    const safeUrl = targetUrl && /^\/[a-zA-Z0-9\-_\/]*/.test(targetUrl) ? targetUrl : '/';
    const safeIcon = icon && /^https:\/\/(?:[a-zA-Z0-9-]+\.)*cloudinary\.com\//.test(icon)
      ? icon
      : 'https://lukeni.app/icons/icon-192x192.png';

    // 4. Récupérer les abonnés actifs
    const { data: subs, error: subErr } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key, user_id')
      .eq('is_active', true);

    if (subErr) throw subErr;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, notifications_sent: 0, errors: 0 });
    }

    // 5. Configurer web-push
    const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: 'Configuration VAPID manquante' }, { status: 500 });
    }
    webpush.setVapidDetails('mailto:lukeni.team@gmail.com', vapidPublic, vapidPrivate);

    const payload = JSON.stringify({
      title,
      body,
      url: safeUrl,
      icon: safeIcon,
      tag: tag || `lukeni-${Date.now()}`,
    });

    // 6. Journalisation
    const { data: logRow } = await supabaseAdmin
      .from('notification_logs')
      .insert({
        notification_type: 'manual_push',
        sent_at: new Date().toISOString(),
        recipients_count: 0,
      })
      .select('id')
      .single();
    const logId = logRow?.id;

    // 7. Envoi en parallèle
    let sent = 0;
    let errors = 0;
    await Promise.allSettled(
      subs.map(async (s: any) => {
        try {
          if (!s.endpoint || !s.p256dh || !s.auth_key) throw new Error('Subscription incomplète');
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            payload
          );
          sent++;
          if (logId) {
            await safeQuery(
              supabaseAdmin.from('notification_recipients').insert({
                notification_log_id: logId,
                user_id: s.user_id,
                endpoint: s.endpoint,
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
            );
          }
        } catch (e: any) {
          errors++;
          if (e?.statusCode === 410) {
            // Abonnement expiré → le désactiver
            await safeQuery(
              supabaseAdmin
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', s.id)
            );
          }
          if (logId) {
            await safeQuery(
              supabaseAdmin.from('notification_recipients').insert({
                notification_log_id: logId,
                user_id: s.user_id,
                endpoint: s.endpoint,
                status: e?.statusCode === 410 ? 'expired' : 'failed',
                error_message: e?.message?.slice(0, 200) || 'unknown',
                sent_at: new Date().toISOString(),
              })
            );
          }
        }
      })
    );

    if (logId) {
      await supabaseAdmin
        .from('notification_logs')
        .update({
          recipients_count: sent,
          errors_count: errors,
          status: errors === 0 ? 'sent' : 'partially_sent',
        })
        .eq('id', logId);
    }

    return NextResponse.json({ success: true, notifications_sent: sent, errors });
  } catch (err: any) {
    console.error('send-push error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
