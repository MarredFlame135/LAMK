// src/lib/showcase-selection.test.ts
//
// El punto entero de esta función es que la vitrina NO sea puro sneaker. Eso no
// se puede comprobar mirando la pantalla un día concreto —con otro catálogo o
// con otro día podría salir bien por casualidad—, así que se fija aquí.

import { describe, it, expect } from 'vitest';
import { buildShowcaseSelection, MIN_HYPE_SAMPLE, pickGrail } from './showcase-selection';
import { Product } from '@/types/product';

function producto(
  id: string,
  category: Product['category'],
  score: number,
  sampleSize = 0,
  isSoldOut = false
): Product {
  return {
    id,
    handle: id,
    title: id,
    brand: '',
    category,
    description: '',
    images: [],
    variants: [],
    isSoldOut,
    hypeMeter: { score, sampleSize, viewsLast24h: 0, stockRemaining: 5, label: 'NORMAL' },
  } as unknown as Product;
}

// Catálogo con la forma REAL de LAMK: los sneakers no son la mayoría, pero sí
// los de más score — que es exactamente la trampa que esta función evita.
const catalogo: Product[] = [
  ...Array.from({ length: 8 }, (_, i) => producto(`sneaker-${i}`, 'SNEAKERS', 90 - i)),
  ...Array.from({ length: 10 }, (_, i) => producto(`acc-${i}`, 'ACCESSORIES', 40 - i)),
  ...Array.from({ length: 6 }, (_, i) => producto(`ropa-${i}`, 'APPAREL', 30 - i)),
  producto('joya-0', 'JEWELRY', 10),
];

const categoriasDe = (ps: Product[]) => new Set(ps.map((p) => p.category));

describe('buildShowcaseSelection', () => {
  it('la vitrina NUNCA sale de una sola categoría, aunque esa domine el score', () => {
    const sel = buildShowcaseSelection(catalogo, 0, 6);
    expect(sel).toHaveLength(6);
    expect(categoriasDe(sel).size).toBeGreaterThanOrEqual(4);
  });

  // Regresión del bug que motivó el cambio: ordenar por hype y cortar.
  it('con 6 huecos y 4 categorías, entra al menos una de cada una', () => {
    const sel = buildShowcaseSelection(catalogo, 0, 6);
    for (const cat of ['SNEAKERS', 'ACCESSORIES', 'APPAREL', 'JEWELRY']) {
      expect(sel.some((p) => p.category === cat)).toBe(true);
    }
  });

  it('al pedir más piezas sigue repartiendo, no se llena de la categoría dominante', () => {
    const sel = buildShowcaseSelection(catalogo, 0, 14);
    const sneakers = sel.filter((p) => p.category === 'SNEAKERS').length;
    expect(sel).toHaveLength(14);
    // Sin el reparto por rondas, aquí salían 8 de 14 sneakers (todos los que hay).
    expect(sneakers).toBeLessThanOrEqual(5);
  });

  it('nunca repite una pieza', () => {
    const sel = buildShowcaseSelection(catalogo, 3, 14);
    expect(new Set(sel.map((p) => p.id)).size).toBe(sel.length);
  });

  it('nunca muestra agotados', () => {
    const conAgotados = [...catalogo, producto('agotado', 'SNEAKERS', 100, 0, true)];
    const sel = buildShowcaseSelection(conAgotados, 0, 14);
    expect(sel.some((p) => p.id === 'agotado')).toBe(false);
  });

  it('sin Hype real, días distintos dan selecciones distintas', () => {
    const hoy = buildShowcaseSelection(catalogo, 10, 6).map((p) => p.id).join();
    const manana = buildShowcaseSelection(catalogo, 11, 6).map((p) => p.id).join();
    expect(hoy).not.toBe(manana);
  });

  it('el mismo día siempre da lo mismo: recargar no cambia la vitrina', () => {
    const a = buildShowcaseSelection(catalogo, 42, 6).map((p) => p.id);
    const b = buildShowcaseSelection(catalogo, 42, 6).map((p) => p.id);
    expect(a).toEqual(b);
  });

  // En cuanto haya tráfico real, la rotación se apaga sola y manda el score.
  it('con Hype real deja de rotar y manda la señal, no el día', () => {
    const conSenal = catalogo.map((p) =>
      p.id === 'sneaker-0' ? producto(p.id, p.category, 95, MIN_HYPE_SAMPLE) : p
    );
    const dia1 = buildShowcaseSelection(conSenal, 1, 6).map((p) => p.id);
    const dia2 = buildShowcaseSelection(conSenal, 999, 6).map((p) => p.id);
    expect(dia1).toEqual(dia2);
    expect(dia1[0]).toBe('sneaker-0');
  });

  it('un catálogo vacío no truena ni inventa piezas', () => {
    expect(buildShowcaseSelection([], 0, 6)).toEqual([]);
    expect(buildShowcaseSelection(catalogo, 0, 0)).toEqual([]);
  });

  it('si hay menos piezas que huecos, devuelve las que hay', () => {
    const pocas = [producto('a', 'SNEAKERS', 5), producto('b', 'APPAREL', 4)];
    expect(buildShowcaseSelection(pocas, 0, 6)).toHaveLength(2);
  });
});

describe('pickGrail', () => {
  const pieza = (handle: string, precios: number[], isSoldOut = false): Product =>
    ({ handle, isSoldOut, variants: precios.map((price) => ({ price })) } as Product);

  it('gana la pieza con la variante más cara, no la del precio "desde" más alto', () => {
    // A arranca más caro ("desde $9,000") pero su tope es menor que el de B.
    const a = pieza('a', [9000, 9500]);
    const b = pieza('b', [3000, 16000]);
    expect(pickGrail([a, b])!.handle).toBe('b');
  });

  it('ignora lo agotado — coronar algo que no se puede comprar manda a una ficha muerta', () => {
    const agotado = pieza('caro-agotado', [25000], true);
    const disponible = pieza('barato-disponible', [4000]);
    expect(pickGrail([agotado, disponible])!.handle).toBe('barato-disponible');
  });

  it('el empate NO lo decide el orden en que Shopify devolvió los productos', () => {
    // Caso real: dos relojes Laarvee de $16,000 exactos en el catálogo.
    const uno = pieza('laarvee-black', [16000]);
    const dos = pieza('laarvee-green', [16000]);
    expect(pickGrail([uno, dos])!.handle).toBe(pickGrail([dos, uno])!.handle);
  });

  it('sin piezas disponibles devuelve null, y la sección no se muestra', () => {
    expect(pickGrail([])).toBeNull();
    expect(pickGrail([pieza('x', [5000], true)])).toBeNull();
  });
});
