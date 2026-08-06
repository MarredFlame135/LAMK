// src/middleware.ts
//
// Protege /admin/* (excepto /admin/login) — sin sesión de admin válida,
// redirige al login. Corre en el runtime Edge, por eso src/lib/session.ts
// usa Web Crypto en vez de Node `crypto`/`Buffer`.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';

  if (isAdminRoute && !isLoginPage) {
    const token = request.cookies.get('lamk_admin_session')?.value;
    const session = await verifyAdminSession(token);

    if (!session) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
