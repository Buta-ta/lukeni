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

    const { userId } = await request.json();

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