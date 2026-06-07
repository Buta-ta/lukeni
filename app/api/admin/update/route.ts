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

    const { userId, email, password, fullName } = await request.json();

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