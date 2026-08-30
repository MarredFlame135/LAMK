// src/app/api/auth/social/prepare-consent/route.ts
//
// El botón de Google/Apple en /auth/register dispara un redirect completo
// del navegador (signIn() de NextAuth) — no hay forma de mandar el estado
// del checkbox de consentimiento como parte de ese flujo salvo guardándolo
// ANTES de salir. Este endpoint lo hace: una cookie corta (5 min, tiempo de
// sobra para completar el login en el proveedor) que el callback de
// NextAuth lee de vuelta (ver lib/social-auth/bridge.ts) para escribir
// consent_log exactamente igual que el registro con contraseña — el login
// social no se salta el requisito de consentimiento del hallazgo #3.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { privacyAccepted, marketingOptIn } = await request.json();

  if (privacyAccepted !== true) {
    return NextResponse.json({ error: 'Debes aceptar el Aviso de Privacidad para continuar.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('lamk_pending_consent', JSON.stringify({ privacyAccepted: true, marketingOptIn: marketingOptIn === true }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // necesita sobrevivir el redirect de vuelta desde Google/Apple
    path: '/',
    maxAge: 5 * 60,
  });
  return response;
}
