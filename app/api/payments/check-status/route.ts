// app/api/payments/check-status/route.ts
// ----------------------------------------------------------------------------
// Vérifie le statut d'une transaction FedaPay.
//
// 🔒 CORRECTIF DE SÉCURITÉ
// Avant, cette route :
//   1. utilisait le client `supabase` (anon) — pouvait donc être bloquée par
//      RLS, mais pire, permettait à quiconque connaissant l'ID d'une
//      transaction de la marquer "completed" ;
//   2. ne vérifiait PAS que l'utilisateur appelant était bien le propriétaire
//      de la transaction → un attaquant pouvait sonder des IDs et forcer le
//      statut de transactions d'autres utilisateurs ;
//   3. marquait `fedapay_transactions.status = 'completed'` côté BDD avant
//      même que le webhook vérifie la signature HMAC, ce qui ouvrait la porte
//      à un contournement de paiement (l'URL de retour FedaPay étant
//      atteignable sans payer).
//
// Maintenant :
//   - L'utilisateur DOIT être authentifié ;
//   - La transaction doit lui appartenir ;
//   - On ne fait PLUS de .update() côté BDD à partir de cette route : seul le
//     webhook signé `/api/webhooks/fedapay` (appelé par FedaPay avec HMAC)
//     est habilité à marquer la transaction "completed" et à créer la ligne
//     dans `user_access`. Cette route ne fait que LIRE le statut courant
//     (de la BDD si déjà complétée, ou de FedaPay pour le suivi en temps
//     réel) et le renvoie au front.
// ----------------------------------------------------------------------------
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    // 1. Authentification obligatoire
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    // 2. Vérifier que la transaction appartient bien à l'utilisateur
    const { data: tx, error: txError } = await supabaseAdmin
      .from('fedapay_transactions')
      .select('id, user_id, status, product_type, product_id')
      .eq('fedapay_transaction_id', transactionId)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }
    if (tx.user_id !== user.id) {
      // On ne divulgue pas si l'ID existe chez un autre utilisateur
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    // 3. Si déjà complétée (reçu via le webhook signé), on le renvoie directement
    if (tx.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        product_type: tx.product_type,
        product_id: tx.product_id,
      });
    }

    // 4. Sinon, interroger FedaPay pour le statut en temps réel
    //    (utile pour afficher "en attente" pendant que l'utilisateur paie).
    //    On choisit l'URL (sandbox/live) selon la clé configurée.
    const isLive = (process.env.FEDAPAY_SECRET_KEY || '').startsWith('sk_live');
    const baseUrl = isLive
      ? 'https://api.fedapay.com/v1'
      : 'https://sandbox-api.fedapay.com/v1';

    const fedapayResponse = await fetch(`${baseUrl}/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      // Éviter qu'un polling ne bloque les fonctions serverless
      signal: AbortSignal.timeout(8000),
    });

    if (!fedapayResponse.ok) {
      // On ne casse pas la UX : on renvoie le statut BDD courant
      return NextResponse.json({
        success: true,
        status: tx.status,
        product_type: tx.product_type,
        product_id: tx.product_id,
      });
    }

    const fedapayData = await fedapayResponse.json();
    const remoteTx = fedapayData.v1?.transaction || fedapayData;
    const remoteStatus = remoteTx?.status || tx.status;

    // 🔒 ON NE MET PAS LA BDD À JOUR ICI.
    // Seul le webhook signé peut le faire. Si le webhook n'a pas encore été
    // appelé, le front continuera de poller ; au prochain appel, si FedaPay
    // confirme "approved", le webhook aura normalement déjà mis à jour la BDD.
    return NextResponse.json({
      success: true,
      status: remoteStatus,
      product_type: tx.product_type,
      product_id: tx.product_id,
    });
  } catch (err: any) {
    console.error('Check status error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}