// api/otp/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Teléfono y código son obligatorios' },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Si aún no hay llaves reales en .env, simulamos envío exitoso en modo desarrollo
    if (!token || !phoneId) {
      console.log(`[DEV MODE] OTP ${code} enviado exitosamente a WhatsApp +52${phone}`);
      return NextResponse.json({
        success: true,
        message: 'Código enviado (Modo Desarrollo Simulado)',
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

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });
  } catch (error) {
    console.error('Error en Endpoint OTP:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}