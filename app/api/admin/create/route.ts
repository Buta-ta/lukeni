import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    const { email, password, fullName, allowedTabs } = await request.json();

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