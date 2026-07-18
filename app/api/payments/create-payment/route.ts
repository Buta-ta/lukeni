import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1️⃣ Vérification anti-crash des variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secretKey = process.env.FEDAPAY_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Clés Supabase manquantes dans Vercel.' });
    }
    if (!secretKey) {
      return NextResponse.json({ success: false, error: 'Clé FEDAPAY_SECRET_KEY manquante dans Vercel.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 2️⃣ Lecture sécurisée des données envoyées par le modal
    const bodyText = await req.text();
    if (!bodyText) return NextResponse.json({ success: false, error: 'La requête envoyée est vide.' });
    
    const body = JSON.parse(bodyText);
    const { productType, productId, userId, userEmail } = body; 

    if (!productType || !productId || !userId) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants depuis le frontend.' });
    }

    // 3️⃣ Vérification du produit
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('product_pricing')
      .select('*')
      .eq('product_type', productType)
      .eq('product_id', productId)
      .single();

    if (pricingError || !pricing) {
      return NextResponse.json({ success: false, error: 'Produit introuvable dans la base de données.' });
    }

    // 4️⃣ Montant forcé en XOF (CFA) pour éviter les bugs FedaPay
    const finalAmount = pricing.price_xof_cfa;
    const finalCurrency = 'XOF';
    
    if (!finalAmount || isNaN(finalAmount)) {
      return NextResponse.json({ success: false, error: `Prix XOF invalide dans la BDD: ${finalAmount}` });
    }

    const description = productType === 'investigation' ? `Investigation - ${productId}` : `Livre - ${productId}`;
    const isLive = secretKey.startsWith('sk_live');
    const fedapayBaseUrl = isLive ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://lukeni.vercel.app';
    
    // -----------------------------------------------------
    // ÉTAPE 1 : CRÉER LA TRANSACTION FEDAPAY
    // -----------------------------------------------------
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
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fedapayPayload),
    });

    const createText = await createRes.text();
    let createData;
    try { 
      createData = JSON.parse(createText); 
    } catch (e) { 
      return NextResponse.json({ success: false, error: `Crash API FedaPay (Étape 1) : ${createText}` }); 
    }

    if (!createRes.ok) {
      return NextResponse.json({ success: false, error: `Refus FedaPay : ${createData.message || JSON.stringify(createData)}` });
    }

    const transaction = createData.v1?.transaction || createData.transaction || createData;
    const transactionId = transaction?.id;

    if (!transactionId) {
      return NextResponse.json({ success: false, error: `Impossible d'extraire l'ID. Réponse API: ${JSON.stringify(createData)}` });
    }

    // -----------------------------------------------------
    // ÉTAPE 2 : GÉNÉRER LE TOKEN DE PAIEMENT
    // -----------------------------------------------------
    const tokenRes = await fetch(`${fedapayBaseUrl}/transactions/${transactionId}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({}) // Requis par FedaPay pour les requêtes POST
    });

    const tokenText = await tokenRes.text();
    let tokenData;
    try { 
      tokenData = JSON.parse(tokenText); 
    } catch (e) { 
      return NextResponse.json({ success: false, error: `Crash API FedaPay (Étape 2 Token) : ${tokenText}` }); 
    }

    if (!tokenRes.ok) {
      return NextResponse.json({ success: false, error: `Refus Token FedaPay : ${tokenData.message || JSON.stringify(tokenData)}` });
    }

    const transactionToken = tokenData.v1?.token || tokenData.token;

    if (!transactionToken) {
      return NextResponse.json({ success: false, error: `Token introuvable. Réponse API: ${JSON.stringify(tokenData)}` });
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

    return NextResponse.json({
      success: true,
      transactionToken: transactionToken,
    });

  } catch (err: any) {
    // Dernier rempart : capture toute erreur inattendue
    return NextResponse.json({ success: false, error: `Erreur interne du serveur : ${err.message}` });
  }
}