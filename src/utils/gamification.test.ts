// src/utils/gamification.test.ts
//
// gamification.ts no tenía pruebas todavía. Se agregan aquí junto con las
// dos funciones nuevas de Fase B (deriveRealRarity, computeCollectionIndex)
// en vez de un archivo aparte, porque comparten módulo — mismo criterio
// que ya usa el repo (cart-math.test.ts, hype.test.ts).

import { describe, it, expect } from 'vitest';
import { calculateGamificationTier, calculateHypeXp, deriveRealRarity, computeCollectionIndex, TIER_THRESHOLDS, TIER_MIN_PIECES } from './gamification';

describe('calculateGamificationTier', () => {
  it('0 XP y 0 piezas es ROOKIE', () => {
    expect(calculateGamificationTier(0, 0).currentTier).toBe('ROOKIE');
  });

  it('en el umbral exacto de un tier, con las piezas exigidas, ya cuenta como ese tier', () => {
    expect(
      calculateGamificationTier(TIER_THRESHOLDS.HYPEBEAST, TIER_MIN_PIECES.HYPEBEAST).currentTier
    ).toBe('HYPEBEAST');
  });

  it('en el máximo, rango máximo sin siguiente tier', () => {
    const info = calculateGamificationTier(TIER_THRESHOLDS.LEGEND, TIER_MIN_PIECES.LEGEND);
    expect(info.currentTier).toBe('LEGEND');
    expect(info.nextTier).toBe('HALL_OF_FAME');
    expect(info.progressPercentage).toBe(100);
  });

  // La regresión que motivó todo el recálculo (2026-09-03): con los umbrales
  // anteriores, comprar UNA pieza del par más caro del catálogo ($25,000 con
  // hype al tope = 50,000 XP) dejaba a esa persona en LEGEND al instante.
  it('una sola compra, por cara que sea, NO puede llegar a LEGEND', () => {
    const xpDeUnGrail = calculateHypeXp(25000, 100); // 50,000 XP, el máximo posible en una pieza
    const info = calculateGamificationTier(xpDeUnGrail, 1);
    expect(info.currentTier).toBe('ROOKIE');
    expect(info.nextTier).toBe('HYPEBEAST');
    expect(info.piecesRemaining).toBe(TIER_MIN_PIECES.HYPEBEAST - 1);
  });

  it('tampoco se llega solo por volumen de piezas baratas', () => {
    // 20 gorras de $900 sin nada de hype: piezas de sobra, XP muy lejos.
    const info = calculateGamificationTier(900 * 20, 20);
    expect(info.currentTier).toBe('HYPEBEAST');
    expect(info.xpRemaining).toBe(TIER_THRESHOLDS.COLLECTOR - 18000);
  });

  it('el avance mostrado es el del requisito más atrasado, no el más adelantado', () => {
    // XP de sobra para COLLECTOR, pero solo 2 de las 5 piezas: la barra no
    // puede ir al 100% y luego no subir de rango.
    const info = calculateGamificationTier(TIER_THRESHOLDS.COLLECTOR, 2);
    expect(info.currentTier).toBe('HYPEBEAST');
    expect(info.progressPercentage).toBeLessThan(100);
    expect(info.piecesRemaining).toBe(3);
  });
});

describe('calculateHypeXp', () => {
  it('sin hype (0%), factor 1:1', () => {
    expect(calculateHypeXp(1000, 0)).toBe(1000);
  });

  it('hype al tope (100%), factor 2:1', () => {
    expect(calculateHypeXp(1000, 100)).toBe(2000);
  });
});

describe('deriveRealRarity', () => {
  it('producto que ya no existe en catálogo: COMMON, nunca se asume raro', () => {
    expect(deriveRealRarity(null)).toBe('COMMON');
  });

  it('agotado del todo: LEGENDARY', () => {
    expect(deriveRealRarity({ isSoldOut: true, stockRemaining: 0, hypeScore: 0 })).toBe('LEGENDARY');
  });

  it('pocas unidades restantes: RARE', () => {
    expect(deriveRealRarity({ isSoldOut: false, stockRemaining: 2, hypeScore: 0 })).toBe('RARE');
  });

  it('Hype Score alto aunque haya stock: RARE', () => {
    expect(deriveRealRarity({ isSoldOut: false, stockRemaining: 50, hypeScore: 85 })).toBe('RARE');
  });

  it('stock normal y sin hype: COMMON', () => {
    expect(deriveRealRarity({ isSoldOut: false, stockRemaining: 50, hypeScore: 10 })).toBe('COMMON');
  });
});

describe('computeCollectionIndex', () => {
  it('sin colección ni gasto: todo en 0', () => {
    const result = computeCollectionIndex({ totalSpentMxn: 0, collection: [] });
    expect(result.score).toBe(0);
    expect(result.accumulatedValue).toBe(0);
    expect(result.averageRarity).toBe(0);
    expect(result.categoryDiversity).toBe(0);
    expect(result.vintage).toBe(0);
  });

  it('el score nunca pasa de 100 sin importar qué tan extremos sean los insumos', () => {
    const result = computeCollectionIndex({
      totalSpentMxn: 999999,
      collection: Array.from({ length: 20 }, (_, i) => ({
        rarity: 'LEGENDARY' as const,
        category: `CAT_${i}`,
        purchaseDate: '2020-01-01',
      })),
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('diversidad de categoría se calcula sobre categorías DISTINTAS, no piezas totales', () => {
    const result = computeCollectionIndex({
      totalSpentMxn: 0,
      collection: [
        { rarity: 'COMMON', category: 'SNEAKERS', purchaseDate: '' },
        { rarity: 'COMMON', category: 'SNEAKERS', purchaseDate: '' },
        { rarity: 'COMMON', category: 'SNEAKERS', purchaseDate: '' },
      ],
    });
    // 1 categoría distinta de 5 posibles = 20%
    expect(result.categoryDiversity).toBe(20);
  });

  it('rareza promedio real: mezcla de rarezas da un promedio, no el máximo', () => {
    const result = computeCollectionIndex({
      totalSpentMxn: 0,
      collection: [
        { rarity: 'LEGENDARY', category: '', purchaseDate: '' }, // 100
        { rarity: 'COMMON', category: '', purchaseDate: '' },    // 20
      ],
    });
    expect(result.averageRarity).toBe(60); // (100+20)/2
  });
});
