// app/api/webhooks/fedapay/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Attention : l'idéal ici est d'utiliser le supabase-admin avec la SERVICE_ROLE_KEY
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // 1️⃣ Récupérer le texte brut pour la signature
    const bodyText = await req.text();
    const signature = req.headers.get('x-fedapay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 });
    }

    // 2️⃣ Vérifier la signature
    const computedSignature = crypto
      .createHmac('sha256', process.env.FEDAPAY_SECRET_KEY!)
      .update(bodyText)
      .digest('hex');

    if (signature !== computedSignature) {
      console.warn('Invalid Fedapay signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3️⃣ Parser le JSON (Fedapay envoie l'objet dans "entity")
    const body = JSON.parse(bodyText);
    const transaction = body.entity; 

    if (!transaction || !transaction.id) {
      return NextResponse.json({ error: 'Missing transaction data' }, { status: 400 });
    }

    // 4️⃣ Récupérer la transaction en BDD
    const { data: dbTransaction, error: fetchError } = await supabase
      .from('fedapay_transactions')
      .select('*')
      .eq('fedapay_transaction_id', transaction.id)
      .single();

    if (fetchError || !dbTransaction) {
      return NextResponse.json({ error: 'Transaction not found in db' }, { status: 404 });
    }

    // 5️⃣ Gérer les statuts Fedapay (approved, declined, etc.)
    // Note: FedaPay utilise "approved", "canceled", "declined"
    if (transaction.status === 'approved' || transaction.status === 'completed') {
      
      // Maj transaction
      await supabase
        .from('fedapay_transactions')
        .update({
          status: 'completed',
          payment_method: transaction.method?.name || 'card',
          completed_at: new Date().toISOString(),
        })
        .eq('fedapay_transaction_id', transaction.id);

      // Créer l'accès
      await supabase
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
      await supabase
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