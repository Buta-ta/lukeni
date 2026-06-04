import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// ✅ DÉFINITION DES HEADERS CORS (Indispensable pour éviter l'erreur sur Vercel)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

// Configuration web-push avec ta clé privée
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_PUBLIC_KEY = 'BKPE1Su7art9Se7kdRmCOLK8xKelmtv2223SzHCcoipMlFfGLjoKM1ToupD0JkJjPyF26e36UX6_NqkpxopcCgs';

if (!VAPID_PRIVATE_KEY) {
  throw new Error('VAPID_PRIVATE_KEY non défini dans les secrets Supabase');
}

webpush.setVapidDetails(
  'mailto:lukeni.team@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  // ✅ GESTION DU PREFLIGHT CORS (Pour autoriser ton site web à appeler cette fonction)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json().catch(() => ({}));
    
    // Si c'est un push manuel venu de NotificationsTab.tsx
    if (body.payload && body.subscriptions) {
      console.log(`[MANUAL-PUSH] Envoyant à ${body.subscriptions.length} utilisateurs`);
      let sent = 0;
      let errors = 0;
      const failedEndpoints: string[] = [];

      const { data: logData } = await supabase.from('notification_logs').insert({
        notification_type: 'manual_push',
        sent_at: new Date().toISOString(),
        recipients_count: 0,
      }).select('id').single();

      const logId = logData?.id;

      await Promise.allSettled(
        body.subscriptions.map(async (sub: any) => {
          try {
            if (!sub.endpoint || !sub.p256dh || (!sub.auth_key && !sub.auth)) throw new Error('Subscription incomplète');
            
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key || sub.auth }
            }, body.payload);
            
            sent++;
            if (logId) await supabase.from('notification_recipients').insert({ notification_log_id: logId, user_id: sub.user_id, endpoint: sub.endpoint, status: 'sent' }).catch(() => {});
          } catch (error: any) {
            errors++;
            failedEndpoints.push(sub.endpoint);
            if (logId) {
              let errorStatus = 'failed';
              if (error.statusCode === 410) {
                errorStatus = 'expired';
                await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', sub.id).catch(() => {});
              }
              await supabase.from('notification_recipients').insert({ notification_log_id: logId, user_id: sub.user_id, endpoint: sub.endpoint, status: errorStatus, error_message: error.message }).catch(() => {});
            }
          }
        })
      );

      if (logId) await supabase.from('notification_logs').update({ recipients_count: sent, errors_count: errors, status: errors === 0 ? 'sent' : 'partially_sent' }).eq('id', logId);

      // ✅ AJOUT DES HEADERS CORS ICI
      return new Response(
        JSON.stringify({ success: true, type: 'manual_push', sent, errors, failed: failedEndpoints.slice(0, 5), log_id: logId }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Autres types de notifications (anniversaires, etc.) non spécifiés ici pour alléger,
    // ✅ AJOUT DES HEADERS CORS ICI
    return new Response(
      JSON.stringify({ error: 'Payload invalide' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ERROR]', error.message);
    // ✅ AJOUT DES HEADERS CORS ICI
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});