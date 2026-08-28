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

  const lines = items.map((item) => ({
    merchandiseId: item.variant.id,
    quantity: item.quantity,
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
