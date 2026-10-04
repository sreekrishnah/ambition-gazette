import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Routes requiring active authentication
 */
const PROTECTED_ROUTES = [
  '/today',
  '/dashboard',
  '/ambitions',
  '/my-ambitions',
  '/agent',
  '/ambition',
  '/welcome',
];

/**
 * Routes reserved for unauthenticated visitors
 */
const AUTH_ROUTES = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Presence check only; the API verifies the token on every request.
  const isAuthenticated = Boolean(request.cookies.get(SESSION_COOKIE)?.value?.trim());

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 1. Unauthenticated user trying to access protected screens
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Strict cache-control headers prevent browser history cache retention
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 2. Authenticated user trying to access login/signup
  if (isAuthRoute && isAuthenticated) {
    const todayUrl = new URL('/today', request.url);
    return NextResponse.redirect(todayUrl);
  }

  // 3. For authenticated visits to protected pages, enforce no-store so bfcache cannot restore data
  if (isProtectedRoute && isAuthenticated) {
    const response = NextResponse.next();
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (same-origin API proxy route handler)
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon, images, worklets, manifest, static files
     */
    '/((?!api|_next/static|_next/image|favicon.*|images|worklets|site.webmanifest).*)',
  ],
};
