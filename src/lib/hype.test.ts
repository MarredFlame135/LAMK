// src/lib/hype.test.ts
//
// No es uno de los 4 caminos que pide el brief textualmente, pero sí es un
// cálculo de negocio real: el Hype Meter decide qué aparece primero en los
// carruseles de home (ver Fase 6 — confirmamos ahí que "hyped" ya es
// calculado, no curado a mano; esta prueba deja ese cálculo cubierto).
// Solo se prueban las funciones puras (`computeHypeMeter`,
// `computeHypeIndexFromCounts`) — `recordView`/`getViews24h`/
// `computeHypeIndex` tocan Postgres real (ver Fase A, hallazgo #2 — antes
// era `data/views.json`) y no se prueban aquí para no depender de I/O real
// en la suite.

import { describe, it, expect } from 'vitest';
import { computeHypeMeter, computeHypeIndexFromCounts, MIN_SAMPLE_SIZE } from './hype';

describe('computeHypeMeter', () => {
  it('sin stock y sin vistas: DROPPED, score 0', () => {
    const { score, label } = computeHypeMeter(0, 0);
    expect(score).toBe(0);
    expect(label).toBe('DROPPED');
  });

  it('sin stock pero con vistas recientes: DROPPED, score al máximo (se agotó con demanda real)', () => {
    const { score, label } = computeHypeMeter(10, 0);
    expect(score).toBe(100);
    expect(label).toBe('DROPPED');
  });

  it('2 pares o menos restantes: ÚLTIMOS PARES, sin importar las vistas', () => {
    const { label } = computeHypeMeter(1, 2);
    expect(label).toBe('ULTIMOS PARES');
  });

  it('relación vistas/stock alta (≥5:1): ALTA DEMANDA, score tope 100', () => {
    const { score, label } = computeHypeMeter(50, 5); // 10:1
    expect(score).toBe(100);
    expect(label).toBe('ALTA DEMANDA');
  });

  it('relación vistas/stock baja: NORMAL', () => {
    const { score, label } = computeHypeMeter(1, 20); // 0.05:1
    expect(label).toBe('NORMAL');
    expect(score).toBeLessThan(60);
  });

  it('el score nunca es negativo ni pasa de 100', () => {
    const low = computeHypeMeter(0, 50);
    const high = computeHypeMeter(10000, 3);
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(high.score).toBeLessThanOrEqual(100);
  });
});

describe('computeHypeIndexFromCounts', () => {
  it('sin eventos: score 0, sampleSize 0', () => {
    const { score, sampleSize } = computeHypeIndexFromCounts({ views7d: 0, cart7d: 0 });
    expect(score).toBe(0);
    expect(sampleSize).toBe(0);
  });

  it('sampleSize es la suma real de eventos, no un valor inventado', () => {
    const { sampleSize } = computeHypeIndexFromCounts({ views7d: 30, cart7d: 12 });
    expect(sampleSize).toBe(42);
  });

  it('por debajo de MIN_SAMPLE_SIZE, la UI debe mostrar "—" (no es el trabajo de esta función, pero el umbral debe ser consistente)', () => {
    const { sampleSize } = computeHypeIndexFromCounts({ views7d: 10, cart7d: 5 });
    expect(sampleSize).toBeLessThan(MIN_SAMPLE_SIZE);
  });

  it('vistas y carrito al tope de su cap, sin wishlist: score = 0.30*100 + 0.25*100 = 55', () => {
    const { score } = computeHypeIndexFromCounts({ views7d: 150, cart7d: 20 });
    expect(score).toBe(55);
  });

  it('vistas, carrito y wishlist al tope, sin ventas: score = 0.30*100 + 0.25*100 + 0.25*100 = 80', () => {
    const { score } = computeHypeIndexFromCounts({ views7d: 150, cart7d: 20, wishlist7d: 30 });
    expect(score).toBe(80);
  });

  // Antes de que existiera el webhook orders/paid este término estaba
  // reservado en 0 y el tope real del índice era 80. Con ventas reales
  // (product_events tipo 'sale') los cuatro términos ya tienen fuente y el
  // índice puede llegar a 100 — que era el punto del hallazgo #2 de Fase A.
  it('las ventas reales aportan su 20%: solo velocidad al tope da 20', () => {
    const { score } = computeHypeIndexFromCounts({ views7d: 0, cart7d: 0, wishlist7d: 0, velocity30d: 10 });
    expect(score).toBe(20);
  });

  it('las cuatro señales al tope dan 100 — el índice ya no está capado en 80', () => {
    const { score } = computeHypeIndexFromCounts({ views7d: 150, cart7d: 20, wishlist7d: 30, velocity30d: 10 });
    expect(score).toBe(100);
  });

  it('el score nunca pasa de 100 por más ventas que haya', () => {
    const { score } = computeHypeIndexFromCounts({ views7d: 99999, cart7d: 99999, wishlist7d: 99999, velocity30d: 99999 });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('las ventas cuentan en el tamaño de muestra (un producto que vende sí tiene datos)', () => {
    const { sampleSize } = computeHypeIndexFromCounts({ views7d: 10, cart7d: 5, wishlist7d: 0, velocity30d: 40 });
    expect(sampleSize).toBe(55);
  });

  it('el score nunca es negativo', () => {
    const { score } = computeHypeIndexFromCounts({ views7d: 0, cart7d: 0 });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
