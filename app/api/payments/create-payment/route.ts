import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // ✅ FIX LUK-011: Ne JAMAIS faire confiance à userId/userEmail du body
    // On récupère l'utilisateur depuis le cookie de session
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    const { productType, productId, currency } = body;
    // ✅ Forcer userId et userEmail depuis la session — ignorer le body
    const userId = user.id;
    const userEmail = user.email || 'joueur@lukeni.com';

    // ✅ Validation stricte
    if (!productType || !['investigation','book'].includes(productType)) {
      return NextResponse.json({ success: false, error: 'productType invalide' }, { status: 400 });
    }
    if (!productId || typeof productId !== 'string' || productId.length > 100) {
      return NextResponse.json({ success: false, error: 'productId invalide' }, { status: 400 });
    }

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
      callback_url: `${appUrl}/api/webhooks/fedapay?product_id=${productId}`,
      // ✅ NOUVEAU : URL de retour utilisateur après paiement
      return_url: `${appUrl}/investigations?payment_success=${productId}&product_type=${productType}`,
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
      paymentUrl: paymentUrl,
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: `Erreur interne : ${err.message}` });
  }
}