import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/explore';

  console.log('🔵 [CALLBACK] Code:', !!code, '| Type:', type);

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=no_code`);
  }

  const redirectTo = type === 'recovery'
    ? `${origin}/auth?type=recovery`
    : `${origin}${next}`;

  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Laisser @supabase/ssr gérer les options nativement
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log('🔵 [CALLBACK] Exchange:', {
    ok: !!data?.session,
    user: data?.session?.user?.email,
    error: error?.message,
  });

  if (error || !data.session) {
    console.error('❌ [CALLBACK] Exchange failed:', error?.message);
    return NextResponse.redirect(`${origin}/auth?error=exchange_failed`);
  }

  console.log('✅ [CALLBACK] Cookies set:', response.cookies.getAll().map(c => c.name));
  return response;
}