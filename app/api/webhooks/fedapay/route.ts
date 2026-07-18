import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ----------------------------------------------------------------------
// 🚦 GET : GESTION DES REDIRECTIONS (Quand le joueur quitte FedaPay)
// ----------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const close = searchParams.get('close'); // Renvoi par FedaPay si le joueur ferme la fenêtre
  const productId = searchParams.get('product_id');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';

  // Si on n'a pas l'ID du produit, on redirige vers l'accueil des enquêtes par défaut
  if (!productId) {
    return NextResponse.redirect(`${appUrl}/investigations`);
  }

  // Que le joueur ait cliqué sur "Annuler (X)" ou qu'il ait terminé son paiement,
  // on le renvoie proprement sur la page du jeu.
  // S'il a payé, la page détectera son accès et se débloquera.
  // S'il a annulé, le Paywall s'affichera à nouveau.
  return NextResponse.redirect(`${appUrl}/investigations/${productId}`);
}


// ----------------------------------------------------------------------
// 🔒 POST : VALIDATION SILENCIEUSE DES PAIEMENTS (Envoyé par le serveur FedaPay)
// ----------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1️⃣ Récupérer le texte brut pour la signature
    const bodyText = await req.text();
    const signature = req.headers.get('x-fedapay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 });
    }

    // 2️⃣ Vérifier la signature FedaPay
    const computedSignature = crypto
      .createHmac('sha256', process.env.FEDAPAY_SECRET_KEY!)
      .update(bodyText)
      .digest('hex');

    if (signature !== computedSignature) {
      console.warn('Invalid Fedapay signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3️⃣ Parser les données
    const body = JSON.parse(bodyText);
    const transaction = body.entity; 

    if (!transaction || !transaction.id) {
      return NextResponse.json({ error: 'Missing transaction data' }, { status: 400 });
    }

    // 4️⃣ Récupérer la transaction en BDD
    const { data: dbTransaction, error: fetchError } = await supabaseAdmin
      .from('fedapay_transactions')
      .select('*')
      .eq('fedapay_transaction_id', transaction.id)
      .single();

    if (fetchError || !dbTransaction) {
      return NextResponse.json({ error: 'Transaction not found in db' }, { status: 404 });
    }

    // 5️⃣ Mettre à jour l'accès selon le statut du paiement
    if (transaction.status === 'approved' || transaction.status === 'completed') {
      
      // Valider la transaction
      await supabaseAdmin
        .from('fedapay_transactions')
        .update({
          status: 'completed',
          payment_method: transaction.method?.name || 'card',
          completed_at: new Date().toISOString(),
        })
        .eq('fedapay_transaction_id', transaction.id);

      // 🔓 Débloquer l'accès définitif au jeu !
      await supabaseAdmin
        .from('user_access')
        .insert({
          user_id: dbTransaction.user_id,
          access_type: dbTransaction.product_type,
          target_id: dbTransaction.product_id,
          price_cfa: dbTransaction.currency === 'XOF' ? dbTransaction.amount : Math.round(dbTransaction.amount * 655),
          transaction_id: transaction.id.toString(),
          status: 'completed',
          purchased_at: new Date().toISOString(),
          expires_at: null,
        });

    } else if (transaction.status === 'canceled' || transaction.status === 'declined') {
      // Marquer comme échoué
      await supabaseAdmin
        .from('fedapay_transactions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('fedapay_transaction_id', transaction.id);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}