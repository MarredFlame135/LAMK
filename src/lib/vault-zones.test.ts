// src/lib/vault-zones.test.ts
//
// El reparto en zonas se ve "obvio" hasta que Shopify devuelve un
// productType que nadie había visto. Esta suite fija las dos reglas que de
// verdad importan: ninguna pieza se pierde en el camino, y la clasificación
// es la MISMA que usa el catálogo (no una tabla paralela que se desincroniza).

import { describe, it, expect } from 'vitest';
import { groupIntoZones, zoneForItem, acquisitionYear } from './vault-zones';
import { CollectionItem } from '@/types/user';

function item(partial: Partial<CollectionItem> & { id: string }): CollectionItem {
  return {
    sneakerTitle: 'Pieza',
    sku: '',
    serialNumber: '#LK-001/26',
    purchaseDate: '2026-03-14T00:00:00.000Z',
    imageUrl: '',
    category: '',
    rarity: 'COMMON',
    ...partial,
  } as CollectionItem;
}

describe('zoneForItem', () => {
  it('manda el calzado al Sneaker Vault (los 3 productType reales de la tienda)', () => {
    for (const t of ['CASUAL', 'CONFORT', 'RUNNING']) {
      expect(zoneForItem(item({ id: t, category: t }))).toBe('SNEAKER_VAULT');
    }
  });

  it('manda la ropa al Apparel Wardrobe', () => {
    expect(zoneForItem(item({ id: '1', category: 'ROPA' }))).toBe('APPAREL_WARDROBE');
  });

  it('manda accesorios y joyería a la Luxury Vitrine', () => {
    expect(zoneForItem(item({ id: '1', category: 'ACCESORIOS' }))).toBe('LUXURY_VITRINE');
    expect(zoneForItem(item({ id: '2', category: 'JOYERÍA' }))).toBe('LUXURY_VITRINE');
    expect(zoneForItem(item({ id: '3', category: 'JOYERIA' }))).toBe('LUXURY_VITRINE');
  });

  it('no se rompe con mayúsculas/minúsculas ni espacios de más', () => {
    expect(zoneForItem(item({ id: '1', category: '  casual ' }))).toBe('SNEAKER_VAULT');
  });

  // Regresión de la regla "no afirmar de más": una pieza sin productType
  // reconocible NO debe aterrizar en Sneakers (eso sería declarar que es
  // calzado sin saberlo); va a la vitrina, igual que en el catálogo.
  it('un productType desconocido o vacío cae en la vitrina, nunca en Sneakers', () => {
    expect(zoneForItem(item({ id: '1', category: '' }))).toBe('LUXURY_VITRINE');
    expect(zoneForItem(item({ id: '2', category: 'ALGO_NUEVO_DE_SHOPIFY' }))).toBe('LUXURY_VITRINE');
  });
});

describe('groupIntoZones', () => {
  it('no pierde ni duplica ninguna pieza', () => {
    const collection = [
      item({ id: '1', category: 'CASUAL' }),
      item({ id: '2', category: 'ROPA' }),
      item({ id: '3', category: 'ACCESORIOS' }),
      item({ id: '4', category: 'RUNNING' }),
      item({ id: '5', category: 'JOYERÍA' }),
    ];
    const zones = groupIntoZones(collection);
    const ids = zones.flatMap((z) => z.items.map((i) => i.id)).sort();
    expect(ids).toEqual(['1', '2', '3', '4', '5']);
  });

  it('oculta las zonas vacías en vez de mostrarlas sin contenido', () => {
    const zones = groupIntoZones([item({ id: '1', category: 'CASUAL' })]);
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe('SNEAKER_VAULT');
  });

  it('una colección vacía no produce ninguna zona', () => {
    expect(groupIntoZones([])).toEqual([]);
  });

  it('conserva el orden A -> B -> C aunque la colección venga revuelta', () => {
    const zones = groupIntoZones([
      item({ id: '1', category: 'JOYERÍA' }),
      item({ id: '2', category: 'ROPA' }),
      item({ id: '3', category: 'CASUAL' }),
    ]);
    expect(zones.map((z) => z.letter)).toEqual(['A', 'B', 'C']);
  });
});

describe('acquisitionYear', () => {
  it('saca el año real de la fecha de compra', () => {
    expect(acquisitionYear(item({ id: '1', purchaseDate: '2025-11-02T10:00:00.000Z' }))).toBe('2025');
  });

  it('devuelve null si no hay fecha, en vez de inventar un año', () => {
    expect(acquisitionYear(item({ id: '1', purchaseDate: '' }))).toBeNull();
    expect(acquisitionYear(item({ id: '2', purchaseDate: 'no-es-fecha' }))).toBeNull();
  });
});
