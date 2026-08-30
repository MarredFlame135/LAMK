// src/app/api/admin/login/route.ts

import { NextResponse } from 'next/server';
import { signAdminSession } from '@/lib/session';
import { getAdminRole } from '@/lib/admin-access';
import { loginCustomer } from '@/lib/shopify/customer';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Fix (hallazgo #2 de la auditoría de Fase 1): este es el login al
    // panel de admin completo (ventas, leads, clientes) — antes aceptaba
    // intentos ilimitados desde cualquier IP, sin bloqueo ni fricción.
    const limitKey = `admin-login:${getClientIp(request)}:${String(email || '').trim().toLowerCase()}`;
    const { allowed, retryAfterMs } = checkRateLimit(limitKey, 5, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
        { status: 429 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'El admin no está configurado en el servidor (falta ADMIN_EMAIL / ADMIN_PASSWORD en .env.local).' },
        { status: 500 }
      );
    }

    // Fix (reportado 2026-08-27): el login fallaba por comparación exacta —
    // un espacio de más al pegar el correo, o mayúsculas distintas, bastaba
    // para que `email !== adminEmail` rechazara credenciales que en la
    // práctica eran correctas. El email se normaliza (trim + lowercase) en
    // ambos lados; la contraseña se compara tal cual (sí es sensible a
    // mayúsculas, a propósito).
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    const isRootAdmin = normalizedEmail === normalizedAdminEmail && password === adminPassword;

    if (isRootAdmin) {
      return issueAdminSession(normalizedEmail, 'admin');
    }

    // Admin/staff por permiso otorgado (ADMIN_EMAILS / ADMIN_STAFF_EMAILS,
    // ver lib/admin-access.ts): ninguno tiene una contraseña de admin
    // propia — se autentican con SU cuenta de cliente normal (la misma de
    // /auth/login). El rol real (Fase D.7) sale de getAdminRole(), nunca
    // se confía en nada que venga en el body de la request.
    const role = getAdminRole(normalizedEmail);
    if (role) {
      try {
        await loginCustomer({ email: normalizedEmail, password });
        return issueAdminSession(normalizedEmail, role);
      } catch {
        return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
  } catch (error) {
    console.error('Error en login de admin:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function issueAdminSession(email: string, role: 'admin' | 'staff') {
  const token = await signAdminSession({ email, issuedAt: Date.now(), role });
  const response = NextResponse.json({ success: true });
  response.cookies.set('lamk_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 horas
  });
  return response;
}
