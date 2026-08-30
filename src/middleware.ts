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
import { verifyAdminSession, getEffectiveRole } from '@/lib/session';

// Únicas rutas de /api/admin/* que deben quedar abiertas sin sesión: login
// (es el propio punto de entrada) y logout (siempre debe poder limpiar la
// cookie, incluso con una sesión ya vencida).
const PUBLIC_ADMIN_API_ROUTES = new Set(['/api/admin/login', '/api/admin/logout']);

// Fase D.7 — roles admin/staff: "staff" (brief) es pedidos e inventario,
// SIN finanzas ni datos de clientes. Se listan aquí los prefijos que
// requieren rol 'admin' completo — cualquier ruta de /admin*//api/admin*
// que NO esté en esta lista queda abierta a cualquier rol autenticado
// (el default es permisivo entre roles válidos, restrictivo solo contra
// quien no tiene sesión — eso ya lo cubre `needsSession` de arriba).
const ADMIN_ONLY_PREFIXES = ['/admin/finanzas', '/admin/clientes', '/api/admin/customers'];

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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

    // Fase D.7: rol 'staff' no entra a finanzas/clientes — ni la página ni
    // el endpoint que la alimenta, la misma barrera centralizada de
    // siempre, nunca confiada solo a que la UI oculte el link.
    if (isAdminOnlyPath(pathname) && getEffectiveRole(session) !== 'admin') {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Tu rol (staff) no tiene acceso a esta sección.' }, { status: 403 });
      }
      const url = new URL('/admin', request.url);
      url.searchParams.set('denied', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
