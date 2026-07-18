import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1️⃣ Lecture sécurisée du body
    const bodyText = await req.text();
    if (!bodyText) return NextResponse.json({ error: 'Body is empty' }, { status: 400 });
    const body = JSON.parse(bodyText);

    const { productType, productId, currency, userId, userEmail } = body; 

    if (!productType || !productId || !currency || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 2️⃣ Vérification du produit via Admin
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      return NextResponse.json({ error: 'Product not found in DB' }, { status: 404 });
    }

    let amount = currency === 'EUR' ? Math.round(pricing.price_eur * 100) : pricing.price_xof_cfa;
    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;

    // 3️⃣ Configuration des clés et de l'URL
    const secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    if (!secretKey) {
       return NextResponse.json({ error: 'FEDAPAY_SECRET_KEY is missing in Vercel' }, { status: 500 });
    }

    const isLive = secretKey.startsWith('sk_live');
    const fedapayApiUrl = isLive 
      ? 'https://api.fedapay.com/v1/transactions' 
      : 'https://sandbox-api.fedapay.com/v1/transactions';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';
    
       // 4️⃣ Formatage pour FedaPay (On lui donne la version qui marche)
    const fedapayPayload = {
      description,
      amount,
      currency,  // <-- Juste ça ! PAS d'objet { iso: currency }
      customer: { email: userEmail || 'joueur@lukeni.com' },
      callback_url: `${appUrl}/api/webhooks/fedapay`,
      metadata: { userId, productType, productId }
    };

    // 5️⃣ Appel à FedaPay avec entêtes stricts
    const fedapayResponse = await fetch(fedapayApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json' // Force FedaPay à répondre en JSON
      },
      body: JSON.stringify(fedapayPayload),
    });

    // 6️⃣ Lecture SÉCURISÉE de la réponse FedaPay
    const fedapayRawText = await fedapayResponse.text();
    let fedapayData;
    try {
      fedapayData = JSON.parse(fedapayRawText);
    } catch (e) {
      // Si FedaPay renvoie du vide ou du HTML, on capture l'erreur proprement
      return NextResponse.json({ 
        error: `Erreur critique FedaPay (Code ${fedapayResponse.status}). Réponse: ${fedapayRawText || 'Vide'}` 
      }, { status: 500 });
    }

    // 7️⃣ Gestion d'un refus de transaction
    if (!fedapayResponse.ok) {
      const errorMessage = fedapayData.message || JSON.stringify(fedapayData);
      return NextResponse.json({ error: `FedaPay a refusé : ${errorMessage}` }, { status: 400 });
    }

    // 8️⃣ Extraction du Token (Pour rediriger le joueur)
    const transactionId = fedapayData.v1?.transaction?.id || fedapayData.transaction?.id || fedapayData.id;
    // On récupère le vrai token de paiement (nécessaire pour checkout.fedapay.com)
    const transactionToken = fedapayData.v1?.token || fedapayData.token || fedapayData.v1?.transaction?.token || transactionId;

    // 9️⃣ Sauvegarde en BDD
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
      transactionToken: transactionToken, // On renvoie le bon Token au frontend
    });

  } catch (err: any) {
    console.error('Serveur Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}