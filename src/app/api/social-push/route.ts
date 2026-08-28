// src/app/api/social-push/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Fix (hallazgo #3 de la auditoría de Fase 1): sin esto, cualquiera sin
    // sesión podía disparar una publicación con texto arbitrario a nombre
    // de la marca en Instagram/Facebook en cuanto se conecte la API real
    // de Meta (hoy es un stub sin impacto — solo arma el texto y responde
    // éxito, no llama a ninguna API externa todavía).
    const session = await verifyAdminSession(request.cookies.get('lamk_admin_session')?.value);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión como administrador.' }, { status: 401 });
    }

    const { productTitle, imageUrl, price, productLink } = await request.json();

    if (!productTitle || !imageUrl) {
      return NextResponse.json(
        { error: 'El título del producto y la imagen son requeridos' },
        { status: 400 }
      );
    }

    const caption = `🔥 NUEVO DROP DISPONIBLE EN LAMK MX 🔥\n\nModelo: ${productTitle}\nPrecio: $${price} MXN\n\nCompara y asegura el tuyo antes de que se agote en el link de nuestra bio o directo en:\n${productLink}\n\n#LookAtMyKicks #SneakerheadMexico #StreetwearMX #Hypebeast`;

    console.log(`[PUBLICACIÓN MASIVA] Disparando post a Instagram & Facebook: "${productTitle}"`);

    // Petición a Meta Content Publishing API (Instagram Graph API)
    // 1. Crear contenedor de imagen
    // 2. Publicar contenedor
    
    return NextResponse.json({
      success: true,
      channelsPublished: ['INSTAGRAM_FEED', 'FACEBOOK_PAGE'],
      caption,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en Publicación Masiva:', error);
    return NextResponse.json({ error: 'Error al publicar en redes sociales' }, { status: 500 });
  }
}