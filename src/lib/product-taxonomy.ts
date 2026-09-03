// src/lib/product-taxonomy.ts
//
// Las secciones con las que un cliente busca, que NO son las cuatro categorías
// que devuelve Shopify.
//
// --- Por qué hace falta ---
//
// Shopify solo distingue SNEAKERS / APPAREL / ACCESSORIES / JEWELRY. Pero
// "ACCESSORIES" son 114 de las 265 piezas del catálogo, y dentro caben cosas
// que nadie buscaría juntas: 74 gorras, 7 relojes, cartas de Pokémon, figuras
// de KAWS y Bearbricks, y hasta ropa mal clasificada (boxers y calcetas
// Supreme). Ofrecer "Accesorios" como una sola opción es ofrecer un cajón.
//
// El orden IMPORTA: cada pieza cae en la primera sección que la reconoce. Por
// eso Coleccionables va antes que Bolsos (un "monedero Murakami" es una pieza
// de colección, no un bolso) y Ropa antes que nada (los boxers Supreme están
// archivados como accesorio en Shopify, pero son ropa).
//
// Los conteos de los comentarios son reales, medidos contra el catálogo vivo el
// 2026-09-03. Si Shopify cambia, cambian — no son promesas.

import { Product } from '@/types/product';

export interface ProductSection {
  key: string;
  label: string;
  matches: (p: Product) => boolean;
}

const t = (p: Product) => p.title || '';

// Ropa que Shopify archivó como accesorio. Va primero para rescatarla.
const ROPA_MAL_CLASIFICADA = /boxer|calceta|calcetin|t-shirt|playera|hoodie|sudadera/i;

// Piezas de colección: cartas, figuras y art toys. Antes que Bolsos, porque
// varias traen "pouch" o "monedero" en el título y no son bolsos de uso.
const COLECCIONABLE = /pokemon|pokémon|cartas|kaws|murakami|bearbrick|shifu|peluche|plush|labubu|funko|figure|vinyl|almohada/i;

const BOLSO = /bolso|bag\b|mochila|backpack|monedero|pouch|cartera|maleta/i;
const GORRA = /gorra|cap\b|snapback|trucker/i;
const RELOJ = /reloj|watch/i;

export const PRODUCT_SECTIONS: ProductSection[] = [
  { key: 'SNEAKERS', label: 'Sneakers', matches: (p) => p.category === 'SNEAKERS' },
  {
    key: 'ROPA',
    label: 'Ropa',
    matches: (p) => p.category === 'APPAREL' || ROPA_MAL_CLASIFICADA.test(t(p)),
  },
  { key: 'GORRAS', label: 'Gorras', matches: (p) => GORRA.test(t(p)) },
  {
    key: 'COLECCIONABLES',
    label: 'Coleccionables',
    matches: (p) => COLECCIONABLE.test(t(p)) || p.category === 'COLLECTIBLES',
  },
  { key: 'BOLSOS', label: 'Bolsos y mochilas', matches: (p) => BOLSO.test(t(p)) },
  { key: 'RELOJES', label: 'Relojes', matches: (p) => RELOJ.test(t(p)) },
  { key: 'JOYERIA', label: 'Joyería', matches: (p) => p.category === 'JEWELRY' },
];

// La sección de una pieza: la PRIMERA que la reconoce, o null si ninguna.
// Devolver null y no forzar un cajón "otros" es deliberado: quien consume esto
// decide si mostrar una sección de sobrantes o simplemente no ofrecerla.
export function sectionOf(product: Product): ProductSection | null {
  return PRODUCT_SECTIONS.find((s) => s.matches(product)) ?? null;
}

// Reparte el catálogo y devuelve SOLO las secciones que de verdad tienen
// piezas disponibles.
//
// Esto último no es cosmético: el menú de TENISIN ofrecía "PELUCHES" y siempre
// devolvía cero, porque buscaba en la categoría COLLECTIBLES de Shopify y en
// este catálogo no hay ninguna pieza ahí. Un botón que nunca encuentra nada es
// peor que no tener el botón.
export function sectionsWithProducts(
  catalog: Product[]
): Array<ProductSection & { products: Product[] }> {
  const buckets = new Map<string, Product[]>();
  for (const p of catalog) {
    const s = sectionOf(p);
    if (!s) continue;
    const list = buckets.get(s.key) ?? [];
    list.push(p);
    buckets.set(s.key, list);
  }
  return PRODUCT_SECTIONS.filter((s) => (buckets.get(s.key)?.length ?? 0) > 0).map((s) => ({
    ...s,
    products: buckets.get(s.key)!,
  }));
}

// --- El árbol del catálogo -------------------------------------------------
//
// Lo de arriba (`PRODUCT_SECTIONS`) es la clasificación PLANA: siete cajones,
// cada pieza cae en el primero que la reconoce. Sirve para clasificar, y la
// sigue usando el menú de TENISIN.
//
// Pero como MENÚ es demasiado ancha. El catálogo llegó a tener cuatro filas de
// pastillas seguidas —siete categorías, 54 marcas, cuatro tramos de precio y
// seis colecciones— y el cliente lo dijo claro: "no quiero tantas categorías,
// que se muestren las principales y que de ahí se desplieguen jerárquicamente".
// Tenía razón: un filtro que exige leer 70 opciones antes de elegir la primera
// no es un filtro, es un índice.
//
// Así que la navegación es un ÁRBOL de dos niveles, el mismo que tenía la
// tienda anterior (SNEAKERS / STREETWEAR / ACCESORIOS / COLECCIONABLES, con lo
// demás colgando de ellas):
//
//   Sneakers        75
//   Ropa            75  →  Hoodies y sudaderas · Playeras · Chamarras ·
//                          Pants y shorts · Ropa interior
//   Accesorios      95  →  Gorras · Bolsos y mochilas · Relojes · Joyería
//   Coleccionables  20
//
// Cuatro puertas en vez de siete, y 75 opciones que solo existen cuando abres
// la puerta que las contiene. Los conteos son reales, medidos contra el
// catálogo vivo el 2026-09-03, y suman 265 exactas.
//
// **La clasificación NO se duplica.** El nivel 1 se deriva de `sectionOf()`,
// la misma función ordenada de arriba: una pieza se clasifica UNA vez y el
// grupo sale de a qué cajón cayó. Si se resolviera aquí con predicados
// propios, una "GORRA POKEMON" cumpliría a la vez el patrón de Gorras y el de
// Coleccionables, y saldría en dos ramas — que es justo lo que el orden de
// `PRODUCT_SECTIONS` existe para evitar.

/** Nivel 2 dentro de Ropa. Ordenado: gana el primero que reconoce la pieza. */
export const ROPA_SUBSECTIONS: ProductSection[] = [
  // Sudaderas antes que playeras: hay títulos como "HOODIE ... LONGSLEEVE" que
  // cumplirían los dos patrones, y son sudaderas.
  { key: 'HOODIES', label: 'Hoodies y sudaderas', matches: (p) => /hoodie|sudadera|sweater|crewneck|zip/i.test(t(p)) },
  // "T SHIRT" con espacio es como está escrito en el catálogo real; sin el
  // `\s*` la mitad de las playeras no se reconocían.
  { key: 'PLAYERAS', label: 'Playeras', matches: (p) => /t\s*-?\s*shirt|playera|\btee\b|jersey|longsleeve/i.test(t(p)) },
  { key: 'CHAMARRAS', label: 'Chamarras', matches: (p) => /chamarra|jacket|bomber|puffer|windbreaker|varsity/i.test(t(p)) },
  { key: 'PANTS', label: 'Pants y shorts', matches: (p) => /short|pants|jogger|sweatpant|pantal(o|ó)n|lounger/i.test(t(p)) },
  { key: 'INTERIOR', label: 'Ropa interior', matches: (p) => /boxer|calceta|calcetin|\bsock/i.test(t(p)) },
];

export interface CatalogGroup {
  key: string;
  label: string;
  /** Claves de PRODUCT_SECTIONS que cuelgan de este grupo. */
  sections: string[];
  /** Hijos que se muestran al desplegarlo. Vacío = el grupo es una hoja. */
  children: Array<{ key: string; label: string }>;
}

export const CATALOG_GROUPS: CatalogGroup[] = [
  { key: 'SNEAKERS', label: 'Sneakers', sections: ['SNEAKERS'], children: [] },
  {
    key: 'ROPA',
    label: 'Ropa',
    sections: ['ROPA'],
    children: ROPA_SUBSECTIONS.map((s) => ({ key: s.key, label: s.label })),
  },
  {
    // Los cuatro cajones que la tienda anterior también colgaba de
    // "ACCESORIOS". Por separado son 74 / 9 / 7 / 5: uno enorme y tres que no
    // merecen una puerta propia en el primer nivel.
    key: 'ACCESORIOS',
    label: 'Accesorios',
    sections: ['GORRAS', 'BOLSOS', 'RELOJES', 'JOYERIA'],
    children: [
      { key: 'GORRAS', label: 'Gorras' },
      { key: 'BOLSOS', label: 'Bolsos y mochilas' },
      { key: 'RELOJES', label: 'Relojes' },
      { key: 'JOYERIA', label: 'Joyería' },
    ],
  },
  { key: 'COLECCIONABLES', label: 'Coleccionables', sections: ['COLECCIONABLES'], children: [] },
];

const GROUP_BY_SECTION = new Map<string, CatalogGroup>(
  CATALOG_GROUPS.flatMap((g) => g.sections.map((s) => [s, g] as [string, CatalogGroup]))
);

/**
 * Dónde vive una pieza en el árbol: su grupo de nivel 1 y, si lo tiene, su
 * hijo de nivel 2. Ambos pueden ser null (una pieza que ninguna sección
 * reconoce no se cuelga de ninguna rama — no se le inventa una).
 */
export function catalogPathOf(product: Product): { group: string | null; child: string | null } {
  const section = sectionOf(product);
  if (!section) return { group: null, child: null };
  const group = GROUP_BY_SECTION.get(section.key);
  if (!group) return { group: null, child: null };

  // En Accesorios el hijo ES la sección plana (Gorras, Bolsos…). En Ropa hay
  // que resolver un segundo nivel propio. En los grupos hoja no hay hijo.
  if (group.key === 'ROPA') {
    return { group: group.key, child: ROPA_SUBSECTIONS.find((s) => s.matches(product))?.key ?? null };
  }
  if (group.children.length > 0) {
    return { group: group.key, child: section.key };
  }
  return { group: group.key, child: null };
}

/**
 * Identificador del nodo seleccionado en el filtro:
 *   'TODAS'      — sin filtrar
 *   'g:<clave>'  — un grupo entero (Sneakers, Ropa, Accesorios…)
 *   'c:<clave>'  — un hijo (Gorras, Playeras, Relojes…)
 */
export const ALL_NODE = 'TODAS';
export const groupNode = (key: string) => `g:${key}`;
export const childNode = (key: string) => `c:${key}`;

export function matchesCatalogNode(product: Product, node: string): boolean {
  if (node === ALL_NODE) return true;
  const path = catalogPathOf(product);
  if (node.startsWith('g:')) return path.group === node.slice(2);
  if (node.startsWith('c:')) return path.child === node.slice(2);
  return true;
}

/** El grupo al que pertenece un nodo seleccionado, para saber qué rama abrir. */
export function groupOfNode(node: string): string | null {
  if (node.startsWith('g:')) return node.slice(2);
  if (node.startsWith('c:')) {
    const key = node.slice(2);
    return CATALOG_GROUPS.find((g) => g.children.some((c) => c.key === key))?.key ?? null;
  }
  return null;
}
