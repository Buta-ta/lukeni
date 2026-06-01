// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Anonymise l'IP ────────────────────────────────────────────────────────────
function anonymizeIP(ip: string): string {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return 'localhost';
  // IPv4 → garde 3 octets
  const ipv4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (ipv4) return `${ipv4[1]}.xxx`;
  // IPv6 → garde les 4 premiers groupes
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + ':xxxx';
  }
  return ip.substring(0, 8) + '***';
}

// ── Détecte mobile ────────────────────────────────────────────────────────────
function isMobileUA(ua: string): boolean {
  return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(ua);
}

// ── Géolocalisation via ip-api.com (gratuit, 45 req/min) ─────────────────────
async function geolocateIP(ip: string): Promise<{
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
}> {
  // Ne pas géolocaliser localhost
  if (!ip || ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
    return { country: 'Local', country_code: 'LC', city: 'Localhost', region: null };
  }

  try {
    // ip-api.com : gratuit, pas de clé API, 45 req/min
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city&lang=fr`,
      { 
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'Lukeni/1.0' }
      }
    );

    if (!res.ok) throw new Error(`ip-api status: ${res.status}`);
    
    const data = await res.json();

    if (data.status === 'success') {
      return {
        country:      data.country      || null,
        country_code: data.countryCode  || null,
        city:         data.city         || null,
        region:       data.regionName   || null,
      };
    }

    throw new Error(`ip-api failed: ${data.message}`);

  } catch (err1) {
    console.warn('[TRACK] ip-api.com failed, trying fallback...', err1);
    
    // Fallback : ipwho.is (aussi gratuit)
    try {
      const res2 = await fetch(
        `https://ipwho.is/${ip}`,
        { signal: AbortSignal.timeout(3000) }
      );

      if (!res2.ok) throw new Error('ipwho.is failed');
      
      const data2 = await res2.json();

      if (data2.success) {
        return {
          country:      data2.country      || null,
          country_code: data2.country_code || null,
          city:         data2.city         || null,
          region:       data2.region       || null,
        };
      }

      throw new Error('ipwho.is: success=false');

    } catch (err2) {
      console.warn('[TRACK] ipwho.is also failed:', err2);
      return { country: null, country_code: null, city: null, region: null };
    }
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, user_id, page, referrer } = body;

    // Validation
    if (!session_id || !page) {
      return NextResponse.json(
        { error: 'Missing session_id or page' }, 
        { status: 400 }
      );
    }

    // ── Récupérer l'IP réelle ──────────────────────────────────────────────────
    // Priorité : Cloudflare → X-Forwarded-For → X-Real-IP → fallback
    const cfIP      = req.headers.get('cf-connecting-ip');
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP    = req.headers.get('x-real-ip');

    let rawIP = cfIP 
      || (forwarded ? forwarded.split(',')[0].trim() : null) 
      || realIP 
      || '127.0.0.1';

    // Nettoyer l'IP (enlever ::ffff: préfixe IPv6-mapped IPv4)
    if (rawIP.startsWith('::ffff:')) {
      rawIP = rawIP.replace('::ffff:', '');
    }

    const anonIP    = anonymizeIP(rawIP);
    const userAgent = req.headers.get('user-agent') || '';
    const mobile    = isMobileUA(userAgent);

    console.log(`[TRACK] IP: ${rawIP} → ${anonIP} | Page: ${page} | User: ${user_id || 'anon'}`);

    // ── Anti-doublon : même session + même page dans les 5 minutes ───────────
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: existing } = await supabaseAdmin
      .from('page_visits')
      .select('id')
      .eq('session_id', session_id)
      .eq('page', page)
      .gte('created_at', fiveMinAgo)
      .limit(1)
      .maybeSingle(); // maybeSingle() ne throw pas si 0 résultat

    if (existing) {
      console.log(`[TRACK] Duplicate skipped: ${session_id} → ${page}`);
      return NextResponse.json({ status: 'duplicate', skipped: true });
    }

    // ── Géolocalisation ───────────────────────────────────────────────────────
    const geo = await geolocateIP(rawIP);
    
    console.log(`[TRACK] Geo result:`, geo);

    // ── Insérer en base ───────────────────────────────────────────────────────
    const { error: insertError } = await supabaseAdmin
      .from('page_visits')
      .insert({
        session_id,
        user_id:      user_id || null,
        page,
        referrer:     referrer || null,
        country:      geo.country,
        country_code: geo.country_code,
        city:         geo.city,
        region:       geo.region,
        ip:           anonIP,
        user_agent:   userAgent.substring(0, 255),
        is_mobile:    mobile,
      });

    if (insertError) {
      console.error('[TRACK] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[TRACK] ✅ Saved: ${page} | ${geo.city}, ${geo.country}`);

    return NextResponse.json({ 
      status: 'ok',
      debug: {
        ip: anonIP,
        geo,
        page,
        mobile,
        user: user_id || 'anonymous'
      }
    });

  } catch (err: any) {
    console.error('[TRACK] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' }, 
      { status: 500 }
    );
  }
}

// ── GET de debug (à supprimer en production) ──────────────────────────────────
export async function GET(req: NextRequest) {
  const testIP = req.nextUrl.searchParams.get('ip') || '8.8.8.8';
  const geo = await geolocateIP(testIP);
  
  const cfIP      = req.headers.get('cf-connecting-ip');
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP    = req.headers.get('x-real-ip');

  return NextResponse.json({
    test_ip: testIP,
    geo,
    headers: {
      'cf-connecting-ip': cfIP,
      'x-forwarded-for':  forwarded,
      'x-real-ip':        realIP,
    }
  });
}