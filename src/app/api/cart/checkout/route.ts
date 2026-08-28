// src/app/api/cart/checkout/route.ts
//
// Recibe el carrito local y devuelve la URL real de Checkout de Shopify.
// El token de Storefront se queda server-side (igual que el resto de
// shopify/*) — el cliente nunca lo ve.

import { NextResponse } from 'next/server';
import { createShopifyCheckout } from '@/lib/shopify/cart';
import { CartItem } from '@/types/cart';

export async function POST(request: Request) {
  try {
    const { items, email, phone } = (await request.json()) as {
      items: CartItem[];
      email?: string;
      phone?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });
    }

    const checkoutUrl = await createShopifyCheckout(items, { email, phone });
    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    console.error('Error al crear el checkout de Shopify:', error);
    return NextResponse.json(
      { error: error.message || 'No se pudo iniciar el pago. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
