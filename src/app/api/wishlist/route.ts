// src/app/api/wishlist/route.ts
//
// Most Wanted (Fase B). GET trae la wishlist del cliente ya con datos
// reales de producto (imagen, precio, stock) — nunca solo los IDs, la UI
// no debería tener que hacer un segundo round-trip. POST/DELETE
// agregan/quitan un producto. Misma identidad que el resto del sitio: la
// cookie httpOnly, nunca un customerId que venga en el body.

import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/social/auth';
import { addToWishlist, removeFromWishlist, getWishlistProducts } from '@/lib/wishlist';

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const items = await getWishlistProducts(user.id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { productId } = await request.json();
  if (typeof productId !== 'string' || !productId) {
    return NextResponse.json({ error: 'Falta productId.' }, { status: 400 });
  }

  await addToWishlist(user.id, productId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { productId } = await request.json();
  if (typeof productId !== 'string' || !productId) {
    return NextResponse.json({ error: 'Falta productId.' }, { status: 400 });
  }

  await removeFromWishlist(user.id, productId);
  return NextResponse.json({ ok: true });
}
