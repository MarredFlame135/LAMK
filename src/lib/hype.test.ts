// src/lib/hype.test.ts
//
// No es uno de los 4 caminos que pide el brief textualmente, pero sí es un
// cálculo de negocio real: el Hype Meter decide qué aparece primero en los
// carruseles de home (ver Fase 6 — confirmamos ahí que "hyped" ya es
// calculado, no curado a mano; esta prueba deja ese cálculo cubierto).
// Solo se prueba `computeHypeMeter` (función pura) — `recordView`/
// `getViews24h` tocan el filesystem (`data/views.json`) y no se prueban
// aquí para no depender de I/O real en la suite.

import { describe, it, expect } from 'vitest';
import { computeHypeMeter } from './hype';

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
