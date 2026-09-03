// src/app/api/cart/checkout/route.ts
//
// Recibe el carrito local y devuelve la URL real de Checkout de Shopify.
// El token de Storefront se queda server-side (igual que el resto de
// shopify/*) — el cliente nunca lo ve.

import { NextResponse } from 'next/server';
import { createShopifyCheckout } from '@/lib/shopify/cart';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { CartItem } from '@/types/cart';

export async function POST(request: Request) {
  try {
    // Rate limiting (auditoría 2026-09-02). Esta ruta era la única de las
    // cuatro críticas —OTP, login, checkout, búsqueda social— que se había
    // quedado sin límite. Cada llamada crea un carrito REAL en Shopify vía
    // Storefront API: sin tope, cualquiera puede quemar la cuota de API de
    // la tienda desde una sola IP y dejar sin poder pagar a los clientes
    // reales. 20 en 10 minutos es holgado para alguien que de verdad está
    // comprando (reintentos, cambiar de opinión, editar el carrito) y
    // ridículo para un script.
    const limitKey = `checkout:${getClientIp(request)}`;
    const { allowed, retryAfterMs } = checkRateLimit(limitKey, 20, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos de pago. Espera ${Math.ceil(retryAfterMs / 60000)} minuto(s) e intenta de nuevo.` },
        { status: 429 }
      );
    }

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
