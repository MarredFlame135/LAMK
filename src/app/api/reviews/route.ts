// src/app/api/reviews/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getReviews, addReview } from '@/lib/reviews-store';
import { getCustomerProfile } from '@/lib/shopify/customer';

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

  const { rating, text, photoUrl } = await request.json();
  if (!rating || !text) {
    return NextResponse.json({ error: 'Calificación y texto son obligatorios.' }, { status: 400 });
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
