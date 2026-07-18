// app/api/payments/create-payment/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // 1️⃣ Récupérer les données du body
    const body = await req.json();
    const { productType, productId, currency, userId, userEmail } = body; 
    // ⚠️ Astuce : passe userId et userEmail depuis le client (page.tsx), 
    // car récupérer la session serveur requiert une configuration spéciale des cookies.

    if (!productType || !productId || !currency || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!['XOF', 'EUR'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    // 2️⃣ Récupérer les prix du produit
    const { data: pricing, error: pricingError } = await supabase
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 3️⃣ Déterminer le montant selon la devise
    let amount;
    if (currency === 'EUR') {
      amount = Math.round(pricing.price_eur * 100); // Fedapay en centimes pour EUR
    } else {
      amount = pricing.price_xof_cfa; // CFA en unités
    }

    // 4️⃣ Déterminer les moyens de paiement
    const paymentMethods = currency === 'EUR'
      ? ['card'] // 'bank_transfer'
      : ['mtn_money', 'orange_money', 'moov_money', 'card'];

    // 5️⃣ Créer la transaction Fedapay
    const description = productType === 'investigation'
      ? `🎓 Investigation - ${productId}`
      : `📖 Livre - ${productId}`;

    const fedapayPayload = {
      description,
      amount,
      currency,
      customer: {
        email: userEmail || 'joueur@lukeni.com',
      },
      payment_methods: paymentMethods,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fedapay`,
      metadata: { userId, productType, productId },
    };

    const fedapayResponse = await fetch('https://sandbox-api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fedapayPayload),
    });

    const fedapayData = await fedapayResponse.json();

    if (!fedapayResponse.ok) {
      console.error('Fedapay error:', fedapayData);
      return NextResponse.json({ error: fedapayData.message || 'Payment creation failed' }, { status: 400 });
    }

    // 6️⃣ Sauvegarder la transaction en BDD (Optionnel mais recommandé)
    const transactionId = fedapayData.v1?.transaction?.id || fedapayData.id || fedapayData.token;

    await supabase.from('fedapay_transactions').insert({
      user_id: userId,
      fedapay_transaction_id: transactionId,
      currency,
      amount,
      product_type: productType,
      product_id: productId,
      status: 'pending',
      description,
    });

    // 7️⃣ Retourner le Token FedaPay au client
    return NextResponse.json({
      success: true,
      transactionToken: transactionId,
    });

  } catch (err: any) {
    console.error('Payment creation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}