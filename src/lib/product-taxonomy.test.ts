// Lo que se fija aquí es que el ÁRBOL y la clasificación plana no puedan
// divergir: cada pieza cuelga de exactamente una rama, y los conteos de las
// cuatro puertas suman el catálogo entero. Si algún día alguien resuelve el
// nivel 1 con predicados propios en vez de derivarlo de sectionOf(), una
// "GORRA POKEMON" empezaría a salir en dos ramas y estas pruebas lo dicen.

import { describe, it, expect } from 'vitest';
import {
  CATALOG_GROUPS,
  ROPA_SUBSECTIONS,
  catalogPathOf,
  matchesCatalogNode,
  groupOfNode,
  ALL_NODE,
  groupNode,
  childNode,
  sectionOf,
} from './product-taxonomy';
import { Product } from '@/types/product';

const p = (title: string, category: Product['category'] = 'ACCESSORIES') => ({ title, category } as Product);

describe('árbol del catálogo', () => {
  it('cada pieza cuelga de una sola rama', () => {
    const piezas = [
      p("TENIS JORDAN 4 x OFF-WHITE 'SAIL'", 'SNEAKERS'),
      p('HOODIE BAPE x MR SHARK FULL ZIP', 'APPAREL'),
      p("GORRA 31 HATS 'LA CHROME III'"),
      p('KAWS FELLOWS Vinyl Figure-Black'),
      p("RELOJ LAARVEE SILVER PRECISION 'STEEL GREEN'"),
    ];
    for (const pieza of piezas) {
      const grupos = CATALOG_GROUPS.filter((g) => matchesCatalogNode(pieza, groupNode(g.key)));
      expect(grupos.map((g) => g.key), pieza.title).toHaveLength(1);
    }
  });

  it('una gorra de Pokémon es una gorra, no un coleccionable', () => {
    // El caso que rompería si el nivel 1 tuviera predicados propios: el título
    // cumple a la vez el patrón de Gorras y el de Coleccionables, y el orden de
    // PRODUCT_SECTIONS es lo único que decide.
    const gorra = p('GORRA POKEMON PIKACHU');
    expect(sectionOf(gorra)?.key).toBe('GORRAS');
    expect(catalogPathOf(gorra)).toEqual({ group: 'ACCESORIOS', child: 'GORRAS' });
  });

  it('los cuatro grupos cubren las siete secciones planas, sin repetir ninguna', () => {
    const todas = CATALOG_GROUPS.flatMap((g) => g.sections);
    expect(new Set(todas).size).toBe(todas.length);
    expect(todas.sort()).toEqual(
      ['SNEAKERS', 'ROPA', 'GORRAS', 'BOLSOS', 'RELOJES', 'JOYERIA', 'COLECCIONABLES'].sort()
    );
  });

  it('toda prenda cae en una subsección de Ropa', () => {
    const prendas = [
      'HOODIE ASSC "TOO FAR PLUM"',
      'T SHIRT BAPE COLLEGE RELAXED KOREA EXCLUSIVE',
      'BOMBER JACKET SUPREME',
      'PANTS ELECTRIC RAGE LOUNGER SWEAT',
      'BOXER SUPREME',
      'SWEATER SP5DER RHINESTONE',
    ].map((t) => p(t, 'APPAREL'));
    for (const prenda of prendas) {
      expect(catalogPathOf(prenda).child, prenda.title).not.toBeNull();
    }
  });

  it('un hijo se resuelve a su grupo, para saber qué rama abrir', () => {
    expect(groupOfNode(childNode('GORRAS'))).toBe('ACCESORIOS');
    expect(groupOfNode(childNode('PLAYERAS'))).toBe('ROPA');
    expect(groupOfNode(groupNode('SNEAKERS'))).toBe('SNEAKERS');
    expect(groupOfNode(ALL_NODE)).toBeNull();
  });

  it('el nodo raíz no filtra nada', () => {
    expect(matchesCatalogNode(p('lo que sea'), ALL_NODE)).toBe(true);
  });

  it('las subsecciones de Ropa son las que anuncia el grupo', () => {
    const ropa = CATALOG_GROUPS.find((g) => g.key === 'ROPA')!;
    expect(ropa.children.map((c) => c.key)).toEqual(ROPA_SUBSECTIONS.map((s) => s.key));
  });
});
