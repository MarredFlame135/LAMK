// src/lib/cart-math.ts
//
// Fase 7 de la auditoría: cálculo del total del carrito extraído de
// `CartContext.tsx` a una función pura — antes vivía inline dentro del
// Provider, imposible de probar sin renderizar un componente de React
// entero. La lógica no cambió ni un carácter, solo se movió aquí para
// poder tener un test real de "cómo se calcula lo que alguien va a pagar"
// (uno de los cuatro caminos críticos que pidió el brief de auditoría).
//
// Nota importante, ya documentada en Fase 1: este total es solo lo que se
// le muestra al cliente ANTES de llegar a Shopify — el cobro real lo
// calcula Shopify del lado del servidor a partir de los IDs de variante
// (`cartCreate`, ver lib/shopify/cart.ts), así que un bug aquí afectaría la
// UI del carrito, nunca el monto que de verdad se cobra.

import { CartItem } from '@/types/cart';

// Subido de 3,000 a 5,000 el 2026-09-03 por decisión del cliente. Es el mismo
// corte que la pestaña UNDER $5K y el tramo de precio del catálogo (ver
// lib/discovery.ts): un solo número en todo el sitio, no tres parecidos.
export const FREE_SHIPPING_THRESHOLD = 5000; // $5,000 MXN para envío gratis
export const SHIPPING_COST = 180;

export interface CartTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
  remainingForFreeShipping: number;
  progressPercentage: number;
}

export function computeCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((acc, item) => acc + item.variant.price * item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercentage = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : SHIPPING_COST;
  const total = subtotal + shippingCost;

  return { subtotal, shippingCost, total, remainingForFreeShipping, progressPercentage };
}
