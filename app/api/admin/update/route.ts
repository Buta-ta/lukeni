import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    // ✅ FIX SÉCURITÉ: Auth + superadmin
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { userId, email, password, fullName } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
    if (password && password.length < 12) return NextResponse.json({ error: 'Mot de passe 12+ requis' }, { status: 400 });

    const updateData: any = {};

    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (fullName) updateData.user_metadata = { full_name: fullName };

    // Mettre à jour dans auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (authError) throw authError;

    // Mettre à jour dans profiles
    if (fullName) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', userId);

      if (profileError) throw profileError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}