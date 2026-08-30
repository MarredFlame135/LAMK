// src/lib/customer-segmentation.test.ts

import { describe, it, expect } from 'vitest';
import { segmentCustomer } from './customer-segmentation';

const NOW = new Date('2026-08-30T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe('segmentCustomer', () => {
  it('sin pedidos: SIN_COMPRAS', () => {
    expect(segmentCustomer({ ordersCount: 0, totalSpent: 0, lastOrderDate: null }, NOW)).toBe('SIN_COMPRAS');
  });

  it('primera compra hace 5 días: NUEVOS', () => {
    expect(segmentCustomer({ ordersCount: 1, totalSpent: 4000, lastOrderDate: daysAgo(5) }, NOW)).toBe('NUEVOS');
  });

  it('reciente pero pocas compras (no calza en NUEVOS por antigüedad): PROMETEDORES', () => {
    expect(segmentCustomer({ ordersCount: 2, totalSpent: 8000, lastOrderDate: daysAgo(10) }, NOW)).toBe('PROMETEDORES');
  });

  it('compra seguido, mucho gasto, reciente: CAMPEONES', () => {
    expect(segmentCustomer({ ordersCount: 5, totalSpent: 30000, lastOrderDate: daysAgo(10) }, NOW)).toBe('CAMPEONES');
  });

  it('compra seguido, gasto medio: LEALES', () => {
    expect(segmentCustomer({ ordersCount: 4, totalSpent: 9000, lastOrderDate: daysAgo(10) }, NOW)).toBe('LEALES');
  });

  it('buen historial pero sin comprar hace 75 días: EN_RIESGO', () => {
    expect(segmentCustomer({ ordersCount: 6, totalSpent: 25000, lastOrderDate: daysAgo(75) }, NOW)).toBe('EN_RIESGO');
  });

  it('sin comprar hace 150 días: DORMIDOS', () => {
    expect(segmentCustomer({ ordersCount: 3, totalSpent: 15000, lastOrderDate: daysAgo(150) }, NOW)).toBe('DORMIDOS');
  });

  it('sin comprar hace más de 180 días: PERDIDOS', () => {
    expect(segmentCustomer({ ordersCount: 3, totalSpent: 15000, lastOrderDate: daysAgo(200) }, NOW)).toBe('PERDIDOS');
  });

  it('recencia manda sobre frecuencia/monto — un campeón viejo sin comprar es PERDIDO, no CAMPEON', () => {
    expect(segmentCustomer({ ordersCount: 20, totalSpent: 100000, lastOrderDate: daysAgo(300) }, NOW)).toBe('PERDIDOS');
  });
});
