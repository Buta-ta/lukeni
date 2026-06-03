import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId manquant' },
        { status: 400 }
      );
    }

    // ── 1. Vérifier le token de l'appelant ──────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user || user.id !== userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
    }

    // ── 2. Supprimer les données utilisateur ────────────────────────────
    const tables: Array<{ table: string; column: string }> = [
      { table: 'user_favorites',     column: 'user_id' },
      { table: 'user_notes',         column: 'user_id' },
      { table: 'user_subscriptions', column: 'user_id' },
      { table: 'book_ratings',       column: 'user_id' },
      { table: 'book_comments',      column: 'user_id' },
      { table: 'profiles',           column: 'id' },      // ← profiles utilise 'id'
    ];

    for (const { table, column } of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);

      if (error) {
        console.warn(`[delete-account] ${table}:`, error.message);
        // On continue même si une table échoue
      }
    }

    // ── 3. Supprimer le compte Auth ──────────────────────────────────────
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[delete-account] Auth delete failed:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error('[delete-account] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}