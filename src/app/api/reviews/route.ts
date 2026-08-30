// src/app/api/reviews/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getReviews, addReview } from '@/lib/reviews-store';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  return NextResponse.json({ reviews: getReviews() });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('lamk_customer_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión para dejar una reseña.' }, { status: 401 });
  }

  const user = await getCustomerProfile(token);
  if (!user) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  }
  // Solo clientes con al menos un pedido real pueden dejar reseña (On-Feet Review verificada)
  if (!user.ordersCount || user.ordersCount < 1) {
    return NextResponse.json({ error: 'Solo clientes con una compra completada pueden dejar reseña.' }, { status: 403 });
  }

  // Fix (auditoría de seguridad 2026-08-30): sin límite de intentos, una
  // cuenta real (requisito de arriba) podía publicar reseñas sin tope.
  const limitKey = `review:${user.id}`;
  const { allowed, retryAfterMs } = checkRateLimit(limitKey, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiadas reseñas enviadas. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const { rating, text, photoUrl } = await request.json();
  if (!rating || !text) {
    return NextResponse.json({ error: 'Calificación y texto son obligatorios.' }, { status: 400 });
  }
  if (typeof text === 'string' && text.length > 1000) {
    return NextResponse.json({ error: 'El texto de la reseña es demasiado largo (máximo 1000 caracteres).' }, { status: 400 });
  }
  // Mismo criterio que vault/claims: solo raster real, nunca SVG (puede
  // llevar <script> embebido), y con tope de tamaño — antes esta ruta no
  // validaba nada del lado servidor sobre la foto.
  if (typeof photoUrl === 'string' && photoUrl.length > 0) {
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(photoUrl)) {
      return NextResponse.json({ error: 'Foto inválida (usa PNG, JPG, WEBP o GIF).' }, { status: 400 });
    }
    if (photoUrl.length > 2 * 1024 * 1024 * 1.4) {
      return NextResponse.json({ error: 'La foto es demasiado grande. Usa una imagen de menos de 2MB.' }, { status: 400 });
    }
  }

  const review = addReview({
    customerId: user.id,
    customerName: `${user.firstName} ${user.lastName[0] || ''}.`.trim(),
    rating: Math.max(1, Math.min(5, Number(rating))),
    text,
    photoUrl,
  });

  return NextResponse.json({ review });
}
