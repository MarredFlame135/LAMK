// src/lib/cart-math.test.ts
//
// Camino crítico #1 del brief de Fase 7: cálculo de totales.

import { describe, it, expect } from 'vitest';
import { computeCartTotals, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from './cart-math';
import { CartItem } from '@/types/cart';
import { ProductVariant } from '@/types/product';

function makeItem(price: number, quantity: number): CartItem {
  const variant: ProductVariant = {
    id: `variant-${price}-${quantity}`,
    sku: 'SKU',
    price,
    isAvailable: true,
  } as ProductVariant;
  return {
    id: `item-${price}-${quantity}`,
    productId: 'product-1',
    productTitle: 'Producto de prueba',
    productImage: '/placeholder.png',
    variant,
    quantity,
    addedAt: Date.now(),
  };
}

describe('computeCartTotals', () => {
  it('carrito vacío: todo en cero, sin envío gratis pendiente', () => {
    const totals = computeCartTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.shippingCost).toBe(0); // carrito vacío no cobra envío
    expect(totals.total).toBe(0);
  });

  it('suma correctamente precio × cantidad de varios artículos', () => {
    const totals = computeCartTotals([makeItem(1000, 2), makeItem(500, 1)]);
    expect(totals.subtotal).toBe(2500); // 1000*2 + 500*1
  });

  it('cobra envío cuando el subtotal está por debajo del umbral', () => {
    const totals = computeCartTotals([makeItem(1000, 1)]);
    expect(totals.subtotal).toBe(1000);
    expect(totals.shippingCost).toBe(SHIPPING_COST);
    expect(totals.total).toBe(1000 + SHIPPING_COST);
  });

  it('envío gratis exactamente al llegar al umbral (no solo por encima)', () => {
    const totals = computeCartTotals([makeItem(FREE_SHIPPING_THRESHOLD, 1)]);
    expect(totals.shippingCost).toBe(0);
    expect(totals.total).toBe(FREE_SHIPPING_THRESHOLD);
  });

  it('envío gratis por encima del umbral', () => {
    const totals = computeCartTotals([makeItem(FREE_SHIPPING_THRESHOLD + 1000, 1)]);
    expect(totals.shippingCost).toBe(0);
  });

  it('remainingForFreeShipping nunca es negativo, aunque el subtotal ya lo supere', () => {
    const totals = computeCartTotals([makeItem(FREE_SHIPPING_THRESHOLD + 5000, 1)]);
    expect(totals.remainingForFreeShipping).toBe(0);
  });

  it('progressPercentage tope en 100, aunque el subtotal sea mucho mayor al umbral', () => {
    const totals = computeCartTotals([makeItem(FREE_SHIPPING_THRESHOLD * 3, 1)]);
    expect(totals.progressPercentage).toBe(100);
  });

  it('progressPercentage a mitad de camino del umbral', () => {
    const totals = computeCartTotals([makeItem(FREE_SHIPPING_THRESHOLD / 2, 1)]);
    expect(totals.progressPercentage).toBe(50);
  });
});
