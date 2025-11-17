import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseClientConfig } from './lib/supabase/config';

export async function middleware(req: NextRequest) {
  try {
    let res = NextResponse.next({
      request: {
        headers: req.headers,
      },
    });

    const supabaseConfig = getSupabaseClientConfig({
      context: 'middleware',
      allowUndefined: true,
    });

    // If Supabase is not configured, allow the request through
    if (!supabaseConfig) {
      console.warn('Supabase not configured in middleware, allowing request');
      return res;
    }

    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              req.cookies.set(name, value)
            );
            res = NextResponse.next({
              request: {
                headers: req.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/contact', '/pricing', '/login', '/signup', '/auth'];
  const isPublicRoute = publicRoutes.some(route =>
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route + '/')
  );

  // If user is not signed in and trying to access a protected route, redirect to /login
  if (!user && !isPublicRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

    // If user is signed in and trying to access /login or /signup, redirect to /dashboard
    if (user && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup'))) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // If middleware fails, allow the request through rather than blocking the entire app
    return NextResponse.next({
      request: {
        headers: req.headers,
      },
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
