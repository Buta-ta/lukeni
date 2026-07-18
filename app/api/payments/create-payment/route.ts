import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productType, productId, currency, userId, userEmail } = body; 

    // 1️⃣ Vérification des paramètres
    if (!productType || !productId || !currency || !userId) {
      return NextResponse.json({ error: 'Missing parameters (Frontend did not send all data)' }, { status: 400 });
    }

    // 2️⃣ Vérification du produit
    const { data: pricing, error: pricingError } = await supabase
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      return NextResponse.json({ error: 'Product not found in DB' }, { status: 404 });
    }

    // 3️⃣ Configuration du montant
    let amount = currency === 'EUR' ? Math.round(pricing.price_eur * 100) : pricing.price_xof_cfa;
    const paymentMethods = currency === 'EUR'
      ? ['card'] 
      : ['mtn_money', 'orange_money', 'moov_money', 'card'];

    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;

    // 4️⃣ Configuration FedaPay (Live / Sandbox)
    const secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    if (!secretKey) {
       return NextResponse.json({ error: 'FEDAPAY_SECRET_KEY is missing on Vercel' }, { status: 500 });
    }

    const isLive = secretKey.startsWith('sk_live');
    const fedapayApiUrl = isLive 
      ? 'https://api.fedapay.com/v1/transactions' 
      : 'https://sandbox-api.fedapay.com/v1/transactions';

    // Sécurité URL (Utilise l'URL Vercel auto-générée si ton .env n'est pas défini)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';
    const callbackUrl = `${appUrl}/api/webhooks/fedapay`;

    const fedapayPayload = {
      description: description,
      amount: amount,
      currency: currency,
      customer: { 
        email: userEmail || 'joueur@lukeni.com' 
      },
      payment_methods: paymentMethods,
      callback_url: callbackUrl,
      metadata: { userId, productType, productId }
    };

    console.log("Envoi à FedaPay :", fedapayPayload); // Visible dans les logs Vercel

    // 5️⃣ Appel API FedaPay
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
      console.error('Erreur FedaPay:', fedapayData);
      // FedaPay renvoie parfois les erreurs dans `errors` ou `message`
      const errorMessage = fedapayData.message || (fedapayData.errors ? JSON.stringify(fedapayData.errors) : 'Payment creation failed');
      return NextResponse.json({ error: `FedaPay rejected: ${errorMessage}` }, { status: 400 });
    }

    const transactionId = fedapayData.v1?.transaction?.id || fedapayData.transaction?.id || fedapayData.id;

    // 6️⃣ Sauvegarde en BDD
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

    // 7️⃣ Renvoie du Token
    return NextResponse.json({
      success: true,
      transactionToken: transactionId,
    });

  } catch (err: any) {
    console.error('Serveur Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}