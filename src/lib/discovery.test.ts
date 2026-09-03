// Lo que se fija aquí son los BORDES de los tramos de precio: el bug que un
// filtro de precio produce no es una excepción, es una pieza que aparece en
// dos tramos (o en ninguno) y un conteo que ya no cuadra con el total.

import { describe, it, expect } from 'vitest';
import { PRICE_BANDS, filterByPriceBand, matchesPriceBand, PriceBandId } from './discovery';
import { Product } from '@/types/product';

const p = (price: number) => ({ variants: [{ price }] } as Product);

describe('rangos de precio', () => {
  it('cada pieza cae en exactamente un tramo', () => {
    for (const price of [0.5, 300, 2499, 2500, 4999, 5000, 9999, 10000, 25000]) {
      const hits = PRICE_BANDS.filter((b) => matchesPriceBand(p(price), b.id));
      expect(hits.map((b) => b.label), `precio ${price}`).toHaveLength(1);
    }
  });

  it('el borde pertenece al tramo de arriba', () => {
    expect(PRICE_BANDS.find((b) => matchesPriceBand(p(5000), b.id))!.id).toBe('B2');
    expect(PRICE_BANDS.find((b) => matchesPriceBand(p(10000), b.id))!.id).toBe('B3');
  });

  it('los tramos suman el total del catálogo', () => {
    const catalogo = [300, 2500, 3500, 5500, 9500, 25000].map(p);
    const suma = PRICE_BANDS.reduce((acc, b) => acc + filterByPriceBand(catalogo, b.id).length, 0);
    expect(suma).toBe(catalogo.length);
  });

  it('ALL no filtra nada', () => {
    const catalogo = [300, 25000].map(p);
    expect(filterByPriceBand(catalogo, 'ALL' as PriceBandId)).toHaveLength(2);
  });
});
