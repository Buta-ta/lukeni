import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const periodType = searchParams.get('periodType');
    const periodValue = searchParams.get('periodValue');
    const limit = searchParams.get('limit');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    let query = supabaseAdmin
      .from('macro_globe_data')
      .select('*, category:categories(id, name_fr, name_en, color)');

    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }
    if (periodType && periodType !== 'all') {
      query = query.eq('period_type', periodType);
    }
    if (periodValue && periodValue !== 'all') {
      query = query.eq('period_value', periodValue);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query.order('period_value', { ascending: false });

    if (error) {
      console.error('GET macro-globe error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET macro-globe exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    // ✅ FIX: Auth admin — placé APRÈS le check supabaseAdmin
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
    console.log('POST macro-globe body:', body);

    const cleanBody = {
      ...body,
      category_id: body.category_id || null,
      unit_fr: body.unit_fr || null,
      unit_en: body.unit_en || null,
      trend: body.trend || 'stable',
      source: body.source || null,
      source_url: body.source_url || null,
      value: Number(body.value) || 0,
    };

    const { data, error } = await supabaseAdmin
      .from('macro_globe_data')
      .insert(cleanBody)
      .select()
      .single();

    if (error) {
      console.error('POST macro-globe error:', error);
      return NextResponse.json({ error: error.message, details: error.details }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST macro-globe exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    // ✅ FIX: Auth admin
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll() } });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin','superadmin'].includes(profile.role)) return NextResponse.json({ error: 'admin uniquement' }, { status: 403 });

    const body = await request.json();
    console.log('PUT macro-globe body:', body);

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const cleanUpdate = {
      ...updateData,
      category_id: updateData.category_id || null,
      unit_fr: updateData.unit_fr || null,
      unit_en: updateData.unit_en || null,
      source: updateData.source || null,
      source_url: updateData.source_url || null,
      value: Number(updateData.value) || 0,
    };

    const { data, error } = await supabaseAdmin
      .from('macro_globe_data')
      .update(cleanUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('PUT macro-globe error:', error);
      return NextResponse.json({ error: error.message, details: error.details }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PUT macro-globe exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    // ✅ FIX: Auth admin
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll() } });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin','superadmin'].includes(profile.role)) return NextResponse.json({ error: 'admin uniquement' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('macro_globe_data')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('DELETE macro-globe error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE macro-globe exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}