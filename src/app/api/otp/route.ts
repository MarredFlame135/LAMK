// src/app/api/otp/route.ts
//
// Fix (hallazgos #2 y #4 de la auditoría de Fase 1): el código ahora se
// genera aquí (servidor) — ver src/lib/otp.ts para el detalle completo del
// cambio — y la ruta está protegida con rate limiting: sin esto, cualquiera
// podía (y en cuanto haya credenciales reales de WhatsApp, podrá) usar este
// endpoint como relay abierto para mandar WhatsApps con el número de
// negocio de LAMK a cualquier teléfono, sin límite.

import { NextResponse } from 'next/server';
import { generateOtpCode, signOtpTicket } from '@/lib/otp';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    // Fix (auditoría de seguridad 2026-08-30): antes cualquier string no
    // vacío pasaba — un valor arbitrario (o larguísimo) llegaba tal cual
    // al límite de intentos (como parte de la clave) y, con credenciales
    // reales de WhatsApp configuradas, se habría reenviado tal cual al
    // "to" de la API de Meta. Un teléfono mexicano son 10 dígitos.
    if (typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Teléfono inválido — deben ser 10 dígitos.' }, { status: 400 });
    }

    const limitKey = `otp:${getClientIp(request)}:${phone}`;
    const { allowed, retryAfterMs } = checkRateLimit(limitKey, 3, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Demasiados códigos solicitados. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
        { status: 429 }
      );
    }

    const code = generateOtpCode();
    const ticket = await signOtpTicket(phone, code);

    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Si aún no hay llaves reales en .env, simulamos envío exitoso en modo
    // desarrollo — se mantiene igual que antes (ver nota en src/lib/otp.ts
    // sobre por qué no se quitó `devCode` de aquí: hoy en producción tampoco
    // hay credenciales de WhatsApp configuradas, y quitarlo dejaría a todo
    // mundo sin forma de completar el checkout).
    if (!token || !phoneId) {
      console.log(`[DEV MODE] OTP ${code} generado para +52${phone}`);
      return NextResponse.json({
        success: true,
        message: 'Código enviado (Modo Desarrollo Simulado)',
        ticket,
        devCode: code,
      });
    }

    // Petición real a la API de WhatsApp Cloud de Meta
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: `52${phone}`, // Código de país México (+52)
          type: 'text',
          text: {
            body: `🔥 Look At My Kicks MX: Tu código de verificación para asegurar tu par es: *${code}*. No lo compartas con nadie.`,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error WhatsApp API:', data);
      return NextResponse.json({ error: 'Error al enviar WhatsApp' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket, messageId: data.messages?.[0]?.id });
  } catch (error) {
    console.error('Error en Endpoint OTP:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
