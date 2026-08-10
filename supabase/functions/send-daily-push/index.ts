// supabase/functions/send-daily-push/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// 🔒 VERSION SÉCURISÉE
//
// Rôles de cette fonction :
//   1. Webhook déclenché par une modification de la table `events`
//      (nouvel événement → push à tous les abonnés)
//   2. Webhook déclenché par une modification de `press_articles`
//      (article publié → push aux abonnés de la catégorie)
//   3. CRON anniversaire quotidien (08h00 via Vercel Cron)
//
// Avant : aucune authentification → n'importe qui pouvait appeler la fonction
//         et envoyer des push à tous les utilisateurs (faille critique).
//
// Après : deux méthodes d'authentification, selon le type d'appel :
//   • CRON        → header `Authorization: Bearer <CRON_SECRET>`
//   • WEBHOOK DB  → header `x-webhook-signature: <SHA256_HMAC>` signé avec
//                   le secret `SUPABASE_DB_WEBHOOK_SECRET`. Le payload n'est
//                   jamais décodé à partir d'un header client non vérifié.
//
// Variables d'environnement à définir dans Supabase (Settings → Edge Functions):
//   VAPID_PRIVATE_KEY              (déjà présente)
//   SUPABASE_URL                   (auto)
//   SUPABASE_SERVICE_ROLE_KEY      (auto)
//   SUPABASE_ANON_KEY              (auto)
//   FUNCTIONS_APP_URL              ex: https://lukeni.app
//   CRON_SECRET                    (doit correspondre à celui de Vercel)
//   SUPABASE_DB_WEBHOOK_SECRET     (secret partagé avec le webhook Supabase)
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_PUBLIC_KEY = 'BKPE1Su7art9Se7kdRmCOLK8xKelmtv2223SzHCcoipMlFfGLjoKM1ToupD0JkJjPyF26e36UX6_NqkpxopcCgs'
const SITE_URL = Deno.env.get('FUNCTIONS_APP_URL') || 'https://lukeni.app'

if (!VAPID_PRIVATE_KEY) throw new Error('VAPID_PRIVATE_KEY manquant')

webpush.setVapidDetails('mailto:lukeni.team@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// CORS : on n'autorise PAS le navigateur à appeler cette fonction.
// Seuls Vercel Cron (serveur à serveur) et Supabase Database Webhooks
// (serveur à serveur) sont légitimes.
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lukeni.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-signature',
}

// ── Vérification HMAC du webhook base de données ────────────────────────────
async function verifyWebhookSignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('SUPABASE_DB_WEBHOOK_SECRET')
  if (!secret) {
    console.error('[AUTH] SUPABASE_DB_WEBHOOK_SECRET non configuré')
    return false
  }
  const signature = req.headers.get('x-webhook-signature')
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (signature.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

// ── Vérification du secret CRON (Vercel) ───────────────────────────────────
function verifyCronSecret(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret) return false
  const auth = req.headers.get('Authorization') || ''
  const expected = `Bearer ${secret}`
  if (auth.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= auth.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

// ── Valider et échapper les champs affichés dans une push ──────────────────
function cleanText(value: unknown, max = 200): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, max)
    .trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await req.text()
  const body = rawBody ? JSON.parse(rawBody) : {}

  const isCron = verifyCronSecret(req)
  const isWebhook = await verifyWebhookSignature(req, rawBody)
  if (!isCron && !isWebhook) {
    console.warn('[AUTH] Appel rejeté : ni CRON_SECRET ni signature webhook valide')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    console.log(`[AUTH] Appel autorisé (${isCron ? 'cron' : 'webhook'})`)

    if (isWebhook && body.table === 'events' && body.record) {
      const event = body.record
      if (event.status !== 'published') {
        return json({ message: 'Événement non publié, ignoré' })
      }
      return await handleNewEvent(event, supabase)
    }

    if (isWebhook && body.table === 'press_articles' && body.record) {
      const isPublished = body.record.status === 'published'
      const wasNotPublished = !body.old_record || body.old_record.status !== 'published'
      if (isPublished && wasNotPublished) {
        return await handleNewArticle(body.record, supabase)
      }
      return json({ message: 'Article non publié, ignoré' })
    }

    if (isCron && !body.table) {
      return await handleAnniversary(supabase)
    }

    return json({ error: 'Type non supporté' }, 400)
  } catch (error: any) {
    console.error('[ERROR]', error.message)
    return json({ error: error.message || 'Internal server error' }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  Nouvel événement
// ═══════════════════════════════════════════════════════════════════════════
async function handleNewEvent(event: any, supabase: any) {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key, user_id')
    .eq('is_active', true)

  if (error) throw error
  if (!subscriptions || subscriptions.length === 0) {
    return json({ success: true, type: 'new_event', subscribers_count: 0 })
  }

  const title = cleanText(`🌍 ${event.year || ''} — ${event.country || 'Événement'}`)
  const bodyText = cleanText(event.title_fr || event.title_en || 'Un nouvel événement historique')

  const payload = JSON.stringify({
    title,
    body: bodyText,
    icon: event.image_url && /^https:\/\//.test(event.image_url)
      ? event.image_url
      : `${SITE_URL}/icon-192x192.png`,
    badge: `${SITE_URL}/icon-192x192.png`,
    url: `${SITE_URL}/chronologie`,
    tag: `event-${event.id}`,
    requireInteraction: false,
    data: { event_id: event.id, year: event.year },
  })

  const result = await broadcastPush(subscriptions, payload, 'new_event', event.id, supabase)
  return json({
    success: true,
    type: 'new_event',
    event_id: event.id,
    total_subscribers: subscriptions.length,
    ...result,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  Nouvel article de presse publié
// ═══════════════════════════════════════════════════════════════════════════
async function handleNewArticle(article: any, supabase: any) {
  const { data: userSubs } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('category_id', article.category_id)

  if (!userSubs || userSubs.length === 0) {
    return json({ message: 'No subscribers', type: 'new_article' })
  }

  const userIds = userSubs.map((s: any) => s.user_id)

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key, user_id')
    .in('user_id', userIds)
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) {
    return json({ message: 'No push subscriptions', type: 'new_article' })
  }

  const title = '📰 Nouvel Article'
  const bodyText = cleanText(article.title_fr || article.title_en || 'Un nouvel article a été publié')

  const payload = JSON.stringify({
    title,
    body: bodyText,
    icon: article.cover_url && /^https:\/\//.test(article.cover_url)
      ? article.cover_url
      : `${SITE_URL}/icon-192x192.png`,
    badge: `${SITE_URL}/icon-192x192.png`,
    url: `${SITE_URL}/presse`,
    tag: `article-${article.id}`,
  })

  const result = await broadcastPush(subscriptions, payload, 'new_article', undefined, supabase)
  return json({ success: true, type: 'new_article', ...result })
}

// ═══════════════════════════════════════════════════════════════════════════
//  CRON anniversaire quotidien
// ═══════════════════════════════════════════════════════════════════════════
async function handleAnniversary(supabase: any) {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const currentYear = today.getFullYear()

  const { data: events } = await supabase
    .from('events')
    .select('id, title_fr, title_en, year, country, slug, image_url')
    .eq('event_month', month)
    .eq('event_day', day)
    .eq('status', 'published')

  if (!events || events.length === 0) {
    return json({ success: true, type: 'anniversary', events_count: 0 })
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key, user_id')
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) {
    return json({
      success: true,
      type: 'anniversary',
      events_count: events.length,
      notifications_sent: 0,
    })
  }

  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      notification_type: 'anniversary',
      sent_at: new Date().toISOString(),
      recipients_count: 0,
    })
    .select('id')
    .single()
  const logId = log?.id

  let totalSent = 0
  let totalErrors = 0
  const allRecipients: any[] = []

  for (const event of events) {
    const yearsAgo = currentYear - (event.year || currentYear)
    const payload = JSON.stringify({
      title: cleanText(`🌍 Il y a ${yearsAgo} ans — ${event.country || ''}`),
      body: cleanText(event.title_fr || event.title_en),
      icon: event.image_url && /^https:\/\//.test(event.image_url)
        ? event.image_url
        : `${SITE_URL}/icon-192x192.png`,
      badge: `${SITE_URL}/icon-192x192.png`,
      url: `${SITE_URL}/chronologie`,
      tag: `anniversary-${event.id}`,
    })

    const result = await sendToMany(subscriptions, payload, logId, supabase)
    totalSent += result.sent
    totalErrors += result.errors
    allRecipients.push(...result.recipients)
  }

  if (allRecipients.length > 0) {
    for (let i = 0; i < allRecipients.length; i += 1000) {
      await supabase
        .from('notification_recipients')
        .insert(allRecipients.slice(i, i + 1000))
        .catch((e: any) => console.warn('[ANNIVERSARY] insert recipients:', e.message))
    }
  }

  if (logId) {
    await supabase
      .from('notification_logs')
      .update({
        recipients_count: totalSent,
        errors_count: totalErrors,
        status: totalErrors === 0 ? 'sent' : 'partially_sent',
      })
      .eq('id', logId)
  }

  return json({
    success: true,
    type: 'anniversary',
    events_count: events.length,
    notifications_sent: totalSent,
    errors: totalErrors,
    log_id: logId,
    timestamp: new Date().toISOString(),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  Helpers d'envoi
// ═══════════════════════════════════════════════════════════════════════════
async function broadcastPush(
  subscriptions: any[],
  payload: string,
  type: string,
  eventId: string | undefined,
  supabase: any
) {
  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      notification_type: type,
      sent_at: new Date().toISOString(),
      event_id: eventId,
      recipients_count: 0,
      errors_count: 0,
      status: 'pending',
    })
    .select('id')
    .single()
  const logId = log?.id

  const { sent, errors, recipients } = await sendToMany(subscriptions, payload, logId, supabase)

  if (recipients.length > 0) {
    for (let i = 0; i < recipients.length; i += 1000) {
      await supabase
        .from('notification_recipients')
        .insert(recipients.slice(i, i + 1000))
        .catch(() => {})
    }
  }

  if (logId) {
    await supabase
      .from('notification_logs')
      .update({
        recipients_count: sent,
        errors_count: errors,
        status: errors === 0 ? 'sent' : sent > 0 ? 'partially_sent' : 'failed',
      })
      .eq('id', logId)
  }

  return { notifications_sent: sent, errors, log_id: logId }
}

async function sendToMany(
  subscriptions: any[],
  payload: string,
  logId: string | undefined,
  supabase: any
) {
  let sent = 0
  let errors = 0
  const recipients: any[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub: any) => {
      try {
        if (!sub.endpoint || !sub.p256dh || !sub.auth_key) {
          throw new Error('Subscription incomplète')
        }
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        )
        sent++
        if (logId) {
          recipients.push({
            notification_log_id: logId,
            user_id: sub.user_id,
            endpoint: sub.endpoint,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
        }
      } catch (error: any) {
        errors++
        let errorStatus = 'failed'
        if (error.statusCode === 410 || (error.message && error.message.includes('expired'))) {
          errorStatus = 'expired'
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
            .catch(() => {})
        }
        if (logId) {
          recipients.push({
            notification_log_id: logId,
            user_id: sub.user_id,
            endpoint: sub.endpoint,
            status: errorStatus,
            error_message: (error.message || 'unknown').slice(0, 200),
            sent_at: new Date().toISOString(),
          })
        }
      }
    })
  )

  return { sent, errors, recipients }
}