// app/api/payments/get-user-currency/route.ts
import { NextResponse } from 'next/server';
import { maxmind } from '@/lib/geoip';

export async function GET(req: Request) {
  try {
    // Récupérer l'IP du client (Version App Router)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // Lookup GeoIP
    let geoData: any = { iso_code: null, country: 'Unknown' };
    try {
      geoData = maxmind.getCountry(ip) || geoData;
    } catch (e) {
      console.warn('GeoIP detection failed, defaulting.');
    }

    // Pays utilisant le CFA (Franc CFA Ouest WAEMU)
    const cfaCountries = ['CI', 'SN', 'BJ', 'BF', 'ML', 'NE', 'TG', 'GM', 'GW', 'LR', 'SL'];

    // Déterminer la devise
    const currency = cfaCountries.includes(geoData.iso_code) ? 'XOF' : 'EUR';

    return NextResponse.json({
      success: true,
      currency,
      country_code: geoData.iso_code,
      country_name: geoData.country,
      ip,
    });

  } catch (err: any) {
    console.error('Currency detection error:', err);
    return NextResponse.json({
      success: true,
      currency: 'EUR', // Par défaut
      country_code: null,
      country_name: 'Default',
    });
  }
}