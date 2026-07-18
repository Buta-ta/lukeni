import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    const { productType, productId, currency, userId, userEmail } = body; 

    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      return NextResponse.json({ success: false, error: 'Produit introuvable dans la BDD.' });
    }

    const finalAmount = pricing.price_xof_cfa;
    const finalCurrency = 'XOF';
    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;
    
    const secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    const isLive = secretKey.startsWith('sk_live');
    const fedapayBaseUrl = isLive ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';

    // --- ÉTAPE 1 : CRÉATION ---
    const fedapayPayload = {
      description,
      amount: finalAmount,
      currency: { iso: finalCurrency }, 
      customer: { email: userEmail || 'joueur@lukeni.com' },
      callback_url: `${appUrl}/api/webhooks/fedapay`,
      metadata: { userId, productType, productId }
    };

    const createRes = await fetch(`${fedapayBaseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fedapayPayload),
    });

    const createData = await createRes.json();
    const transactionId = createData?.['v1/transaction']?.id || createData?.transaction?.id || createData?.id;

    if (!transactionId) return NextResponse.json({ success: false, error: `ID introuvable.` });

    // --- ÉTAPE 2 : TOKEN ET URL ---
    const tokenRes = await fetch(`${fedapayBaseUrl}/transactions/${transactionId}/token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const tokenData = await tokenRes.json();
    const transactionToken = tokenData?.['v1/token']?.token || tokenData?.token;
    
    // 💥 LA MAGIE EST ICI : On récupère l'URL exacte générée par FedaPay
    const paymentUrl = tokenData?.['v1/token']?.url || tokenData?.url;

    if (!transactionToken || !paymentUrl) {
      return NextResponse.json({ success: false, error: `URL de paiement introuvable.` });
    }

    // --- ÉTAPE 3 : BDD ---
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

    return NextResponse.json({
      success: true,
      transactionToken: transactionToken,
      paymentUrl: paymentUrl, // 👈 On envoie l'URL officielle au frontend !
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: `Erreur interne : ${err.message}` });
  }
}