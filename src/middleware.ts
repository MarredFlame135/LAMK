// src/middleware.ts
//
// Protege /admin/* (páginas) Y /api/admin/* (endpoints de datos) — sin sesión
// de admin válida, redirige al login (páginas) o responde 401 (API). Corre en
// el runtime Edge, por eso src/lib/session.ts usa Web Crypto en vez de Node
// `crypto`/`Buffer`.
//
// IMPORTANTE (fix de seguridad): antes el matcher solo cubría '/admin/:path*'
// — las rutas bajo '/api/admin/*' (ventas, inventario, leads, apartados,
// clientes...) viven en un prefijo distinto y NO estaban cubiertas, así que
// cualquiera que conociera la URL del endpoint podía leer/escribir esos datos
// sin haber iniciado sesión nunca. Los handlers de esas rutas no tenían (ni
// necesitan tener) su propia verificación — la protección centralizada aquí
// es la única barrera, así que el matcher DEBE incluir ambos prefijos.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/session';

// Únicas rutas de /api/admin/* que deben quedar abiertas sin sesión: login
// (es el propio punto de entrada) y logout (siempre debe poder limpiar la
// cookie, incluso con una sesión ya vencida).
const PUBLIC_ADMIN_API_ROUTES = new Set(['/api/admin/login', '/api/admin/logout']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin');
  const isPublicAdminApi = PUBLIC_ADMIN_API_ROUTES.has(pathname);

  const needsSession = (isAdminPage && !isLoginPage) || (isAdminApi && !isPublicAdminApi);

  if (needsSession) {
    const token = request.cookies.get('lamk_admin_session')?.value;
    const session = await verifyAdminSession(token);

    if (!session) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'No autorizado. Inicia sesión como administrador.' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
