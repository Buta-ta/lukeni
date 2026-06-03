// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/', '/auth', '/admin/auth', '/qui-sommes-nous'];
const PUBLIC_PREFIXES = ['/auth/', '/api/', '/_next/', '/favicon.ico', '/manifest.json', '/sw.js', '/icon-', '/screenshot', '/apple-touch-icon'];
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|txt|xml)$/.test(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Retour immédiat pour les chemins publics
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    const lastActivity = req.cookies.get('last_activity')?.value;

    if (session && lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        await supabase.auth.signOut();
        const redirectUrl = new URL('/auth', req.url);
        redirectUrl.searchParams.set('reason', 'timeout');
        redirectUrl.searchParams.set('redirect', pathname);
        const timeoutRes = NextResponse.redirect(redirectUrl);
        timeoutRes.cookies.delete('last_activity');
        return timeoutRes;
      }
    }

    if (session) {
      res.cookies.set('last_activity', String(Date.now()), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: INACTIVITY_TIMEOUT / 1000,
        path: '/',
      });
    }

    // Protection des routes admin
    if (pathname.startsWith('/admin') && pathname !== '/admin/auth') {
      if (!session) {
        return NextResponse.redirect(new URL('/admin/auth', req.url));
      }
      return res;
    }

    // ✅ Protection des routes utilisateur
    const protectedPrefixes = [
      '/profil',
      '/bibliotheque',      // ✅ Ajouter
      '/presse',            // ✅ Ajouter
      '/voyage-musical/contribuer',
      '/explore',
      '/encyclopedie',
      '/voyage-musical',
    ];
    const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

    if (isProtected && !session) {
      const redirectUrl = new URL('/auth', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('❌ Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)',
  ],
};