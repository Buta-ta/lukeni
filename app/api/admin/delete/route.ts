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

    // ✅ FIX SÉCURITÉ: Auth + superadmin obligatoire
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

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
    // ✅ Empêcher auto-suppression
    if (userId === user.id) return NextResponse.json({ error: 'Impossible de se supprimer soi-même' }, { status: 400 });

    // Supprimer le profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    // Supprimer l'utilisateur
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError && authError.status !== 404) {
      console.warn('Could not delete auth user:', authError.message);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}