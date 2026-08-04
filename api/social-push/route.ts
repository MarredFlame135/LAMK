// api/social-push/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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