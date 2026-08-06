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

    // ✅ FIX SÉCURITÉ LUK-001: Vérifier que l'appelant est authentifié et superadmin
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé: superadmin uniquement' }, { status: 403 });
    }

    const { email, password, fullName, allowedTabs } = await request.json();

    // ✅ Validation basique
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (!password || password.length < 12) {
      return NextResponse.json({ error: 'Mot de passe 12 caractères minimum' }, { status: 400 });
    }

    // 1. Créer l'utilisateur
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Utilisateur non créé');

    // 2. Vérifier si le profil existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (existingProfile) {
      // Mettre à jour
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          full_name: fullName, 
          role: 'admin', 
          allowed_tabs: allowedTabs 
        })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;
    } else {
      // Créer
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          role: 'admin',
          allowed_tabs: allowedTabs,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id 
    });

  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}