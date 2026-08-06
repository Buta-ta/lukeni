import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ✅ Rate-limit en mémoire (10 emails / minute / user)
const lastSent = new Map<string, number[]>();
function isRateLimited(userId: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = lastSent.get(userId) || [];
  const recent = arr.filter(t => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  lastSent.set(userId, recent);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // ✅ FIX LUK-003: Auth obligatoire + superadmin
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ error: 'Config manquante' }, { status: 500 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé: superadmin uniquement' }, { status: 403 });
    }

    if (isRateLimited(user.id, 5, 60_000)) {
      return NextResponse.json({ error: 'Trop de requêtes, réessayez dans 1 min' }, { status: 429 });
    }

    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Email, sujet et contenu requis' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'Email destinataire invalide' }, { status: 400 });
    }
    if (subject.length > 200) return NextResponse.json({ error: 'Sujet trop long' }, { status: 400 });
    if (html.length > 50000) return NextResponse.json({ error: 'Contenu trop long' }, { status: 400 });

    // ✅ Log pour traçage
    console.log(`[EMAIL] superadmin ${user.id} -> ${to} | ${subject}`);

    await transporter.sendMail({
      from: `"Lukeni Team" <${process.env.GMAIL_USER}>`,
      to,
      subject: `[Lukeni] ${subject}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}