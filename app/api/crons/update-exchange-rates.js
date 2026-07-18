// pages/api/crons/update-exchange-rates.js

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  // ✅ Vérifier la clé Cron de sécurité
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    console.warn('Unauthorized cron access');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1️⃣ Récupérer le taux EUR -> XOF
    const exchangeResponse = await fetch(
      `https://api.exchangerate-api.com/v4/latest/EUR`
    );

    if (!exchangeResponse.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const exchangeData = await exchangeResponse.json();
    const rateXof = exchangeData.rates.XOF;

    if (!rateXof) {
      throw new Error('XOF rate not found');
    }

    // 2️⃣ Mettre à jour la table exchange_rates
    const { error: rateError } = await supabase
      .from('exchange_rates')
      .update({
        rate: rateXof,
        last_updated: new Date().toISOString(),
      })
      .eq('source_currency', 'EUR')
      .eq('target_currency', 'XOF');

    if (rateError) {
      throw rateError;
    }

    // 3️⃣ Mettre à jour product_pricing avec le nouveau taux
    const { error: pricingError } = await supabase
      .from('product_pricing')
      .update({
        exchange_rate_xof_to_eur: (1 / rateXof).toFixed(6),
        updated_at: new Date().toISOString(),
      })
      .gt('id', '0'); // Update all rows

    if (pricingError) {
      throw pricingError;
    }

    console.log(`✅ Exchange rates updated: 1 EUR = ${rateXof} XOF`);

    return res.json({
      success: true,
      rate: rateXof,
      message: `Updated: 1 EUR = ${rateXof} XOF`,
    });

  } catch (err) {
    console.error('Exchange rate update failed:', err);
    return res.status(500).json({ error: err.message });
  }
}