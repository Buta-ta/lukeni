// /middleware.ts (VERSION OPTIMISÉE)
import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/', '/auth', '/admin/auth'];
const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/icon-',
  '/screenshot',
];

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|txt|xml)$/.test(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Early return pour les chemins publics
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next({
    request: { headers: req.headers },
  });

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
              req.cookies.set(name, value);
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    // ✅ Vérifier l'inactivité
    const lastActivity = req.cookies.get('last_activity')?.value;
    
    if (session && lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      
      if (elapsed > INACTIVITY_TIMEOUT) {
        // Invalider la session
        await supabase.auth.signOut();
        
        const redirectUrl = new URL('/auth', req.url);
        redirectUrl.searchParams.set('reason', 'timeout');
        redirectUrl.searchParams.set('redirect', pathname);
        
        const timeoutRes = NextResponse.redirect(redirectUrl);
        timeoutRes.cookies.delete('last_activity');
        return timeoutRes;
      }
    }

    // ✅ Mettre à jour l'activité si session valide
    if (session) {
      res.cookies.set('last_activity', String(Date.now()), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: INACTIVITY_TIMEOUT / 1000,
        path: '/',
      });
    }

    // ✅ Logs UNIQUEMENT en développement
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ Middleware:', pathname, '| Session:', !!session);
    }

    // Routes /admin/*
    if (pathname.startsWith('/admin')) {
      if (!session) {
        return NextResponse.redirect(new URL('/admin/auth', req.url));
      }
      return res;
    }

    // Autres routes protégées
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/auth';
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
