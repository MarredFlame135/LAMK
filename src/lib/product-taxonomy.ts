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
