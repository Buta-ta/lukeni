import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('macro_globe_relations')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    // ✅ FIX LUK-006: Auth admin obligatoire — placé APRÈS le check supabaseAdmin
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'admin uniquement' }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('macro_globe_relations')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST relations error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    // ✅ FIX LUK-006: Auth admin obligatoire — placé APRÈS le check supabaseAdmin
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'admin uniquement' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('macro_globe_relations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE relations error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}