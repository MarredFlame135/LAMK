// src/lib/shopify/cart.ts
//
// Checkout real (reemplaza el `alert('Redirigiendo a pasarela segura...')`
// que no hacía nada). Arma un carrito de verdad en Shopify a partir de lo
// que ya está en el carrito local — los IDs de variante que usa CartItem ya
// son GIDs reales de Shopify (ver types/product.ts), así que no hace falta
// re-resolverlos — y devuelve `checkoutUrl`: la URL del Checkout oficial de
// Shopify, que sí procesa tarjeta/OXXO/lo que tengas configurado en la
// tienda, sin construir una pasarela de pago propia.

import { shopifyFetch } from './index';
import { CART_CREATE_MUTATION } from './queries';
import { CartItem } from '@/types/cart';

interface CartCreateResponse {
  cartCreate: {
    cart: { id: string; checkoutUrl: string } | null;
    userErrors: { field: string[]; message: string }[];
  };
}

export async function createShopifyCheckout(
  items: CartItem[],
  buyer?: { email?: string; phone?: string }
): Promise<string> {
  if (items.length === 0) throw new Error('El carrito está vacío.');

  // Fix (auditoría de seguridad 2026-08-30): el precio nunca viene del
  // cliente (Shopify lo resuelve server-side a partir de merchandiseId,
  // ver comentario del archivo — no es un hallazgo, es lo que ya hacía
  // bien), pero `quantity` no tenía ningún límite antes de reenviarse tal
  // cual a Shopify. Un valor absurdo (negativo, cero, o desproporcionado)
  // no compromete el precio, pero no hay razón para no acotarlo aquí antes
  // de gastar una llamada a la API con algo que Shopify va a rechazar de
  // todos modos.
  const lines = items.map((item) => ({
    merchandiseId: item.variant.id,
    quantity: Math.min(99, Math.max(1, Math.round(item.quantity) || 1)),
  }));

  const input: Record<string, unknown> = { lines };
  if (buyer?.email || buyer?.phone) {
    input.buyerIdentity = {
      ...(buyer.email ? { email: buyer.email } : {}),
      ...(buyer.phone ? { phone: buyer.phone.startsWith('+') ? buyer.phone : `+52${buyer.phone}` } : {}),
    };
  }

  const data = await shopifyFetch<CartCreateResponse>({
    query: CART_CREATE_MUTATION,
    variables: { input },
  });

  const { cart, userErrors } = data.cartCreate;

  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join(' — '));
  }
  if (!cart?.checkoutUrl) {
    throw new Error('Shopify no devolvió una URL de checkout.');
  }

  return cart.checkoutUrl;
}
