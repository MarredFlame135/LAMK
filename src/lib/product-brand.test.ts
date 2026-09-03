// La regla que hace falta fijar aquí es el ORDEN, no la lista: cualquiera
// puede agregar una marca nueva, pero si la mete arriba de las casas de
// calzado, todas las colaboraciones cambian de marca en silencio.

import { describe, it, expect } from 'vitest';
import { brandOf, brandsWithCounts } from './product-brand';
import { Product } from '@/types/product';

const p = (title: string) => ({ title } as Product);

describe('brandOf', () => {
  it('en una colaboración gana la casa, no el colaborador', () => {
    expect(brandOf(p("TENIS JORDAN 4 x OFF-WHITE 'SAIL'"))).toBe('Jordan');
    expect(brandOf(p("TENIS JORDAN 1 LOW x TRAVIS SCOTT 'REVERSE OLIVE'"))).toBe('Jordan');
    expect(brandOf(p("TENIS FORUM x BAD BUNNY 'TRIPLE BLACK'"))).toBe('Adidas');
    expect(brandOf(p('HOODIE BAPE x MR SHARK FULL ZIP'))).toBe('Bape');
  });

  it('reconoce la marca aunque el título no la nombre completa', () => {
    expect(brandOf(p('BACKPACK BABY MILO'))).toBe('Bape');
    expect(brandOf(p('HOODIE ASSC "ALONE NOT LONELY"'))).toBe('Anti Social Social Club');
    expect(brandOf(p("TENIS ONCLOUDTILT 'BLACK IVORY'"))).toBe('On');
  });

  it('devuelve null cuando el título no nombra ninguna marca conocida', () => {
    // Real del catálogo: hay gorras cuyo título es puro nombre de colorway.
    expect(brandOf(p("GORRA 'CONCRETE JUNGLE'"))).toBeNull();
  });
});

describe('brandsWithCounts', () => {
  it('ordena por conteo y excluye las piezas sin marca', () => {
    const counts = brandsWithCounts([
      p('TENIS JORDAN 4'), p('TENIS JORDAN 1'), p('HOODIE SUPREME'), p("GORRA 'PURP'"),
    ]);
    expect(counts).toEqual([
      { brand: 'Jordan', count: 2 },
      { brand: 'Supreme', count: 1 },
    ]);
  });
});
