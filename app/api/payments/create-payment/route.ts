import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1️⃣ Création d'un client Supabase ADMIN (contourne les sécurités RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Clé secrète de Supabase
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productType, productId, currency, userId, userEmail } = body; 

    if (!productType || !productId || !currency || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 2️⃣ Utilisation de supabaseAdmin au lieu de supabase
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      console.error("Erreur Supabase:", pricingError);
      return NextResponse.json({ error: 'Product not found in DB' }, { status: 404 });
    }

    let amount = currency === 'EUR' ? Math.round(pricing.price_eur * 100) : pricing.price_xof_cfa;
    const paymentMethods = currency === 'EUR'
      ? ['card'] 
      : ['mtn_money', 'orange_money', 'moov_money', 'card'];

    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;

    const secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    const isLive = secretKey.startsWith('sk_live');
    const fedapayApiUrl = isLive 
      ? 'https://api.fedapay.com/v1/transactions' 
      : 'https://sandbox-api.fedapay.com/v1/transactions';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';
    const callbackUrl = `${appUrl}/api/webhooks/fedapay`;

    const fedapayPayload = {
      description,
      amount,
      currency,
      customer: { email: userEmail || 'joueur@lukeni.com' },
      payment_methods: paymentMethods,
      callback_url: callbackUrl,
      metadata: { userId, productType, productId }
    };

    const fedapayResponse = await fetch(fedapayApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fedapayPayload),
    });

    const fedapayData = await fedapayResponse.json();

    if (!fedapayResponse.ok) {
      const errorMessage = fedapayData.message || (fedapayData.errors ? JSON.stringify(fedapayData.errors) : 'Payment failed');
      return NextResponse.json({ error: `FedaPay rejected: ${errorMessage}` }, { status: 400 });
    }

    const transactionId = fedapayData.v1?.transaction?.id || fedapayData.transaction?.id || fedapayData.id;

    // 3️⃣ Utilisation de supabaseAdmin pour forcer l'insertion dans la BDD
    await supabaseAdmin.from('fedapay_transactions').insert({
      user_id: userId,
      fedapay_transaction_id: transactionId,
      currency,
      amount,
      product_type: productType,
      product_id: productId,
      status: 'pending',
      description,
    });

    return NextResponse.json({
      success: true,
      transactionToken: transactionId,
    });

  } catch (err: any) {
    console.error('Serveur Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}