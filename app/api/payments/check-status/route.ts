// app/api/payments/check-status/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    // 1️⃣ Récupérer la transaction Fedapay
    const fedapayResponse = await fetch(
      `https://sandbox-api.fedapay.com/v1/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const fedapayData = await fedapayResponse.json();

    if (!fedapayResponse.ok) {
      return NextResponse.json({ error: fedapayData.message }, { status: 400 });
    }

    const transaction = fedapayData.v1?.transaction || fedapayData;

    // 2️⃣ Mettre à jour la base de données si complété manuellement
    if (transaction.status === 'approved' || transaction.status === 'completed') {
      await supabase
        .from('fedapay_transactions')
        .update({ status: 'completed' })
        .eq('fedapay_transaction_id', transactionId);
    }

    return NextResponse.json({
      success: true,
      status: transaction.status,
    });

  } catch (err: any) {
    console.error('Check status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}