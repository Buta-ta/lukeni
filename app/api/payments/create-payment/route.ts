import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    if (!bodyText) return NextResponse.json({ error: 'Body is empty' }, { status: 400 });
    const body = JSON.parse(bodyText);

    const { productType, productId, currency, userId, userEmail } = body; 

    if (!productType || !productId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      return NextResponse.json({ error: 'Product not found in DB' }, { status: 404 });
    }

    // Toujours en XOF pour éviter l'erreur FedaPay
    const finalAmount = pricing.price_xof_cfa;
    const finalCurrency = 'XOF';
    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;

    const secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    if (!secretKey) {
       return NextResponse.json({ error: 'FEDAPAY_SECRET_KEY is missing' }, { status: 500 });
    }

    const isLive = secretKey.startsWith('sk_live');
    const fedapayBaseUrl = isLive ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';
    
    // -----------------------------------------------------
    // ÉTAPE 1 : CRÉER LA TRANSACTION
    // -----------------------------------------------------
    const fedapayPayload = {
      description,
      amount: finalAmount,
      currency: { iso: finalCurrency }, 
      customer: { email: userEmail || 'joueur@lukeni.com' },
      callback_url: `${appUrl}/api/webhooks/fedapay`,
      metadata: { userId, productType, productId }
    };

    const fedapayResponse = await fetch(`${fedapayBaseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fedapayPayload),
    });

    const fedapayData = await fedapayResponse.json();

    if (!fedapayResponse.ok) {
      const errorMessage = fedapayData.message || JSON.stringify(fedapayData);
      return NextResponse.json({ error: `FedaPay a refusé : ${errorMessage}` }, { status: 400 });
    }

    // Récupération de l'ID de la transaction
    const transaction = fedapayData.v1?.transaction || fedapayData.transaction || fedapayData;
    const transactionId = transaction?.id;

    if (!transactionId) {
      return NextResponse.json({ error: `Impossible de récupérer l'ID. Réponse API: ${JSON.stringify(fedapayData)}` }, { status: 500 });
    }

    // -----------------------------------------------------
    // ÉTAPE 2 : GÉNÉRER LE TOKEN DE PAIEMENT POUR LA REDIRECTION
    // -----------------------------------------------------
    const tokenResponse = await fetch(`${fedapayBaseUrl}/transactions/${transactionId}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const tokenData = await tokenResponse.json();
    
    // Récupération du fameux Token !
    const transactionToken = tokenData.v1?.token || tokenData.token;

    if (!transactionToken) {
       return NextResponse.json({ error: `Impossible de générer le Token. Réponse API: ${JSON.stringify(tokenData)}` }, { status: 500 });
    }

    // -----------------------------------------------------
    // ÉTAPE 3 : SAUVEGARDE BDD ET ENVOI AU FRONTEND
    // -----------------------------------------------------
    await supabaseAdmin.from('fedapay_transactions').insert({
      user_id: userId,
      fedapay_transaction_id: transactionId,
      currency: finalCurrency,
      amount: finalAmount,
      product_type: productType,
      product_id: productId,
      status: 'pending',
      description,
    });

    // On renvoie le bon Token au composant PaywallModal.tsx !
    return NextResponse.json({
      success: true,
      transactionToken: transactionToken,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}