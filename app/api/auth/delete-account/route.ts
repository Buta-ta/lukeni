import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId } = await request.json();
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log(`🗑️ Deleting account for user: ${userId}`);

    // ✅ 1. Supprimer les données utilisateur dans l'ORDRE
    const tablesToClean = [
      'page_visits',          // ← AJOUT (contrainte FK)
      'user_favorites',
      'user_notes',
      'user_subscriptions',
      'book_ratings',
      'book_comments',
      'article_ratings',
      'article_comments',
      'press_ratings',
      'press_comments',
      'event_registrations',
      'profiles',
    ];

    for (const table of tablesToClean) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.warn(`⚠️ Error deleting from ${table}:`, error.message);
        // Continue même en cas d'erreur (certaines tables peuvent ne pas exister)
      }
    }

    // ✅ 2. Supprimer l'utilisateur Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Auth deletion error:', deleteError);
      return NextResponse.json(
        { error: `Auth deletion failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Account successfully deleted');

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });

  } catch (error: any) {
    console.error('💥 Delete account error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}