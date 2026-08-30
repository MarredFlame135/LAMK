// src/app/api/auth/register/route.ts

import { NextResponse } from 'next/server';
import { registerCustomer } from '@/lib/shopify/customer';
import { getDb } from '@/db';
import { consentLog } from '@/db/schema';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    // Fix (encontrado en la auditoría de seguridad 2026-08-30): esta ruta
    // no tenía ningún límite de intentos — a diferencia de /api/auth/login,
    // /api/admin/login y /api/otp (Fase 1), que sí lo tienen. Sin esto,
    // cualquiera podía crear cuentas de Shopify sin límite desde una sola
    // IP (spam de registros, o tantear qué correos ya existen leyendo el
    // mensaje de error de registerCustomer). Mismo patrón que el resto:
    // 5 intentos / 10 min por IP.
    const limitKey = `register:${getClientIp(request)}`;
    const { allowed, retryAfterMs } = checkRateLimit(limitKey, 5, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos de registro. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
        { status: 429 }
      );
    }

    const { email, password, firstName, lastName, phone, privacyAccepted, marketingOptIn } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Fix (hallazgo #3 de la auditoría "Prompt Maestro v4", Fase A): sin
    // esto el registro no capturaba consentimiento en absoluto. Se valida
    // server-side (nunca solo en el cliente, mismo principio que el resto
    // de la auditoría de Fase 1) — un POST directo sin el checkbox marcado
    // rebota igual que si faltara el correo.
    if (privacyAccepted !== true) {
      return NextResponse.json({ error: 'Debes aceptar el Aviso de Privacidad para crear tu cuenta.' }, { status: 400 });
    }

    const token = await registerCustomer({ email, password, firstName, lastName, phone });

    try {
      await getDb().insert(consentLog).values({
        id: randomUUID(),
        customerId: token.customerId,
        privacyVersion: PRIVACY_NOTICE_VERSION,
        marketingOptIn: marketingOptIn === true,
        ip: getClientIp(request),
      });
    } catch (consentErr) {
      // La cuenta en Shopify ya existe en este punto — no la tiramos por un
      // fallo al escribir el log de consentimiento (ej. la base de datos
      // caída un instante), pero sí queda registrado en servidor para
      // revisar manualmente. Nunca fallar silenciosamente sin log.
      console.error('No se pudo guardar consent_log para', token.customerId, consentErr);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('lamk_customer_token', token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(token.expiresAt),
    });
    return response;
  } catch (error: any) {
    console.error('Error en registro de cliente:', error);
    return NextResponse.json({ error: error.message || 'No se pudo crear la cuenta.' }, { status: 400 });
  }
}
