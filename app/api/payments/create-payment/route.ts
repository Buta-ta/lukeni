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

    // 💡 L'ASTUCE EST ICI : On envoie TOUJOURS en XOF à FedaPay, 
    // car ton compte FedaPay n'accepte que le CFA.
    const finalAmount = pricing.price_xof_cfa;
    const finalCurrency = 'XOF';
    
    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;

    const secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    if (!secretKey) {
       return NextResponse.json({ error: 'FEDAPAY_SECRET_KEY is missing' }, { status: 500 });
    }

    const isLive = secretKey.startsWith('sk_live');
    const fedapayApiUrl = isLive 
      ? 'https://api.fedapay.com/v1/transactions' 
      : 'https://sandbox-api.fedapay.com/v1/transactions';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';
    
    // On retire 'payment_methods' pour laisser FedaPay afficher tout ce qui est disponible
    const fedapayPayload = {
      description,
      amount: finalAmount,
      currency: { iso: finalCurrency }, // 👈 On remet l'objet obligatoire pour éviter l'erreur 500
      customer: { email: userEmail || 'joueur@lukeni.com' },
      callback_url: `${appUrl}/api/webhooks/fedapay`,
      metadata: { userId, productType, productId }
    };

    const fedapayResponse = await fetch(fedapayApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fedapayPayload),
    });

    const fedapayRawText = await fedapayResponse.text();
    let fedapayData;
    try {
      fedapayData = JSON.parse(fedapayRawText);
    } catch (e) {
      return NextResponse.json({ error: `Erreur critique FedaPay.` }, { status: 500 });
    }

    if (!fedapayResponse.ok) {
      const errorMessage = fedapayData.message || JSON.stringify(fedapayData);
      return NextResponse.json({ error: `FedaPay a refusé : ${errorMessage}` }, { status: 400 });
    }

    const transactionId = fedapayData.v1?.transaction?.id || fedapayData.transaction?.id || fedapayData.id;
    const transactionToken = fedapayData.v1?.token || fedapayData.token || fedapayData.v1?.transaction?.token || transactionId;

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
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}