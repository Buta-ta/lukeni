// pages/api/webhooks/fedapay.js

import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1️⃣ Vérifier la signature Fedapay
    const signature = req.headers['x-fedapay-signature'];
    const body = JSON.stringify(req.body);

    const computedSignature = crypto
      .createHmac('sha256', process.env.FEDAPAY_SECRET_KEY)
      .update(body)
      .digest('hex');

    if (signature !== computedSignature) {
      console.warn('Invalid Fedapay signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2️⃣ Récupérer les données de la transaction
    const { transaction } = req.body;

    if (!transaction || !transaction.id) {
      return res.status(400).json({ error: 'Missing transaction data' });
    }

    // 3️⃣ Récupérer la transaction en BDD
    const { data: dbTransaction, error: fetchError } = await supabase
      .from('fedapay_transactions')
      .select('*')
      .eq('fedapay_transaction_id', transaction.id)
      .single();

    if (fetchError || !dbTransaction) {
      console.error('Transaction not found:', transaction.id);
      return res.status(404).json({ error: 'Transaction not found in database' });
    }

    // 4️⃣ Gérer les différents statuts
    if (transaction.status === 'completed') {
      // ✅ PAIEMENT RÉUSSI

      // Mettre à jour la transaction
      const { error: updateError } = await supabase
        .from('fedapay_transactions')
        .update({
          status: 'completed',
          payment_method: transaction.method?.name || transaction.method || 'card',
          completed_at: new Date().toISOString(),
        })
        .eq('fedapay_transaction_id', transaction.id);

      if (updateError) {
        console.error('Failed to update transaction:', updateError);
        return res.status(500).json({ error: 'Failed to update transaction' });
      }

      // Créer l'accès utilisateur (achat permanent)
      const { error: accessError } = await supabase
        .from('user_access')
        .insert({
          user_id: dbTransaction.user_id,
          access_type: dbTransaction.product_type,
          target_id: dbTransaction.product_id,
          price_cfa: dbTransaction.currency === 'XOF'
            ? dbTransaction.amount
            : Math.round(dbTransaction.amount * 655), // Reconvertir en CFA pour historique
          transaction_id: transaction.id,
          status: 'completed',
          purchased_at: new Date().toISOString(),
          expires_at: null, // Accès permanent
        });

      if (accessError) {
        console.error('Failed to create user access:', accessError);
        return res.status(500).json({ error: 'Failed to grant access' });
      }

      console.log(`✅ Payment completed for user ${dbTransaction.user_id}, product ${dbTransaction.product_id}`);

    } else if (transaction.status === 'failed') {
      // ❌ PAIEMENT ÉCHOUÉ

      const { error: updateError } = await supabase
        .from('fedapay_transactions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('fedapay_transaction_id', transaction.id);

      if (updateError) {
        console.error('Failed to update failed transaction:', updateError);
      }

      console.log(`❌ Payment failed for user ${dbTransaction.user_id}`);

    } else if (transaction.status === 'pending') {
      // ⏳ EN ATTENTE (garder le statut)
      console.log(`⏳ Payment pending for transaction ${transaction.id}`);
    }

    // 5️⃣ Retourner succès à Fedapay
    return res.json({ success: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}