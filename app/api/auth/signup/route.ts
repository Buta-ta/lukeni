import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json();

    // Valider les données
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit faire au moins 6 caractères.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('❌ SERVICE_ROLE_KEY non configurée');
      return NextResponse.json(
        { error: 'Erreur de configuration serveur.' },
        { status: 500 }
      );
    }

    // ✅ Client ADMIN pour créer l'utilisateur (bypass rate limits)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Créer l'utilisateur avec l'API Admin
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ✅ Confirmé immédiatement
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error('Create user error:', createError.message);

      if (createError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'already_registered' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de la création du compte.' },
        { status: 500 }
      );
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte.' },
        { status: 500 }
      );
    }

    // 2. Créer le profil utilisateur
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        email: email,
        role: 'user',
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile creation error:', profileError.message);
      // Non bloquant
    }

    // 3. ✅ Créer la session avec signInWithPassword (client normal)
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('SignIn error:', signInError.message);
      // Compte créé mais connexion échouée → retourner succès sans session
      return NextResponse.json({
        success: true,
        message: 'Compte créé. Connecte-toi maintenant.',
        requireLogin: true,
      });
    }

    // 4. Retourner la session pour connexion automatique
    return NextResponse.json({
      success: true,
      session: {
        access_token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
        expires_at: sessionData.session?.expires_at,
        user: sessionData.user,
      },
    });

  } catch (err: any) {
    console.error('Signup API error:', err.message);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}