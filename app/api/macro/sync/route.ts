// /app/api/macro/sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AFRICAN_COUNTRIES = [
  'SEN', 'CIV', 'NGA', 'ZAF', 'KEN', 'GHA', 'CMR', 'MAR', 
  'DZA', 'EGY', 'COD', 'AGO', 'TZA', 'ETH', 'UGA', 'RWA', 'MLI'
];

export async function POST(request: Request) {
  try {
    // ✅ FIX LUK-006: Auth superadmin OU CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCron) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
      if (!profile || profile.role !== 'superadmin') {
        return NextResponse.json({ error: 'superadmin uniquement' }, { status: 403 });
      }
    }
    const { data: indicators, error: indError } = await supabaseAdmin
      .from('macro_indicators')
      .select('code, source_api')
      .eq('is_active', true);

    if (indError || !indicators) throw new Error('Impossible de récupérer les indicateurs.');

    const upsertPromises = [];
    const currentYear = new Date().getFullYear(); // Rends l'année de fin dynamique (ex: 2026)

    for (const indicator of indicators) {
      if (indicator.source_api !== 'WORLDBANK') continue;

      // URL avec date dynamique (2008 jusqu'à l'année en cours)
      const apiUrl = `https://api.worldbank.org/v2/country/${AFRICAN_COUNTRIES.join(';')}/indicator/${indicator.code}?format=json&per_page=1000&date=2008:${currentYear}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data && data[1]) {
        const rawData = data[1];

        const formattedData = rawData
          .filter((item: any) => item.value !== null)
          .map((item: any) => ({
            country_code: item.countryiso3code,
            indicator_code: indicator.code,
            period: item.date,
            value: item.value,
            updated_at: new Date().toISOString()
          }));

        if (formattedData.length > 0) {
          upsertPromises.push(
            supabaseAdmin.from('macro_data_cache').upsert(formattedData, {
              onConflict: 'country_code, indicator_code, period'
            })
          );
        }
      }
    }

    await Promise.all(upsertPromises);

    return NextResponse.json({ success: true, message: `${indicators.length} indicateurs synchronisés jusqu'en ${currentYear}.` });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}