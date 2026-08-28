// src/app/api/otp/verify/route.ts
//
// Verificación real del OTP, del lado del servidor — antes ocurría 100% en
// el navegador (ver src/lib/otp.ts para el detalle del hallazgo #4 de la
// Fase 1). Recibe el ticket que /api/otp regresó al pedir el código, más lo
// que el usuario tecleó, y confirma que coincide sin necesitar guardar
// nada en el servidor entre una llamada y otra.

import { NextResponse } from 'next/server';
import { verifyOtpTicket } from '@/lib/otp';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { phone, ticket, code } = await request.json();
    if (!phone || !ticket || !code) {
      return NextResponse.json({ error: 'Faltan datos de verificación.' }, { status: 400 });
    }

    // Evita que alguien pruebe los 10,000 códigos posibles a fuerza bruta
    // contra un mismo ticket.
    const limitKey = `otp-verify:${getClientIp(request)}:${phone}`;
    const { allowed, retryAfterMs } = checkRateLimit(limitKey, 8, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
        { status: 429 }
      );
    }

    const verified = await verifyOtpTicket(ticket, phone, String(code));
    if (!verified) {
      return NextResponse.json({ verified: false, error: 'Código incorrecto o expirado.' }, { status: 400 });
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error('Error en verificación de OTP:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
