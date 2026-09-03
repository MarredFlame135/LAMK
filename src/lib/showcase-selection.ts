// src/lib/showcase-selection.ts
//
// Qué piezas salen en las vitrinas de la home, y en qué orden.
//
// Vivía dentro de DropsCoverflow.tsx. Se sacó aquí (2026-09-03) porque el
// cliente pidió que "TRENDING & HYPE DROPS" mostrara lo más hypeado de CADA
// sección — que es exactamente lo que esta función ya hacía para la otra
// vitrina. Copiarla habría dejado dos criterios de curaduría que se
// desincronizan; ahora las dos vitrinas eligen con la misma regla y solo
// cambian en cuántas piezas piden.
//
// --- Las dos reglas ---
//
// 1. **Primero una pieza de cada categoría real**, antes de repetir ninguna.
//    Sin esto, ordenar por Hype llena la vitrina de sneakers: es la categoría
//    con más interacción, aunque NO es la más grande del catálogo (de 265
//    piezas reales, 114 son accesorios y solo 75 son sneakers). La vitrina
//    presumía justo la categoría que menos peso tiene.
//
// 2. **Rotación diaria mientras no haya Hype real.** Hoy ningún producto llega
//    a `MIN_HYPE_SAMPLE` porque el sitio no se ha compartido, así que todos los
//    scores empatan y el orden sale estable pero arbitrario: las mismas piezas
//    para siempre. Con `daySeed` la selección rota por día. En cuanto exista
//    Hype real, `hasRealHype` se vuelve true y la rotación se apaga sola — no
//    hay que venir a borrar nada.
//
// El `daySeed` se calcula en el SERVIDOR y se pasa como prop. Nunca con
// `new Date()` dentro de un componente de cliente: cerca de la medianoche el
// servidor y el navegador elegirían días distintos y React tiraría la
// hidratación. Un solo reloj.

import { Product } from '@/types/product';

// Por debajo de esta muestra, el Hype de un producto no es una señal: es ruido.
// Mismo umbral que MIN_SAMPLE_SIZE en lib/hype.ts.
export const MIN_HYPE_SAMPLE = 50;

export function buildShowcaseSelection(
  products: Product[],
  daySeed: number,
  maxItems: number
): Product[] {
  const available = products.filter((p) => !p.isSoldOut);
  if (available.length === 0 || maxItems <= 0) return [];

  const byScore = (a: Product, b: Product) => b.hypeMeter.score - a.hypeMeter.score;
  const hasRealHype = available.some((p) => p.hypeMeter.sampleSize >= MIN_HYPE_SAMPLE);

  const categories = Array.from(new Set(available.map((p) => p.category))).sort();
  const picked = new Map<string, Product>();

  // 1) Una pieza de cada categoría real. Con Hype real es la de más score; sin
  //    él, la que le toque hoy.
  for (const cat of categories) {
    if (picked.size >= maxItems) break;
    const inCat = available.filter((p) => p.category === cat).sort(byScore);
    if (inCat.length === 0) continue;
    const idx = hasRealHype ? 0 : daySeed % inCat.length;
    picked.set(inCat[idx].id, inCat[idx]);
  }

  // 2) Rellena el resto sin volver a agotar una sola categoría: se recorre por
  //    RONDAS, tomando la siguiente mejor de cada categoría por vuelta. Antes
  //    esto ordenaba todo el catálogo junto, así que a partir de la pieza 6 la
  //    vitrina volvía a ser casi puro sneaker — el sesgo entraba por la puerta
  //    de atrás justo después de haberlo corregido en el paso 1.
  const queues = categories.map((cat) => {
    const inCat = available.filter((p) => p.category === cat).sort(byScore);
    const start = hasRealHype ? 0 : daySeed % Math.max(1, inCat.length);
    // Sin Hype real, cada categoría arranca en un punto distinto según el día.
    return inCat.map((_, i) => inCat[(start + i) % inCat.length]);
  });

  let round = 0;
  let addedInRound = true;
  while (picked.size < maxItems && addedInRound) {
    addedInRound = false;
    for (const queue of queues) {
      if (picked.size >= maxItems) break;
      const p = queue[round];
      if (!p) continue;
      addedInRound = true;
      if (!picked.has(p.id)) picked.set(p.id, p);
    }
    round += 1;
  }

  return Array.from(picked.values()).sort(byScore).slice(0, maxItems);
}

// La pieza MÁS CARA del catálogo vivo — el "grail" que se presenta en la home
// (sección GrailSpotlight, 2026-09-03, pedido del cliente).
//
// Tres decisiones que no son obvias:
//
// 1. **Se comparan precios MÁXIMOS de variante, no mínimos.** El resto del
//    sitio usa el mínimo (es el "desde $X" que ve el comprador), pero aquí la
//    pregunta es cuál es la pieza más cara que existe en la tienda, y esa la
//    define su variante más cara.
// 2. **Solo entran piezas disponibles.** Coronar como "la pieza más cara" algo
//    agotado manda a la gente a una ficha donde no puede comprar nada.
// 3. **Empate resuelto por handle**, no por posición en el arreglo: con dos
//    piezas de $16,000 (hay dos relojes Laarvee exactamente así en el catálogo
//    real), el orden en que Shopify devuelva los productos decidiría cuál sale,
//    y la home cambiaría de grail sin que nadie tocara nada.
export function pickGrail(products: Product[]): Product | null {
  const available = products.filter((p) => !p.isSoldOut && maxPrice(p) > 0);
  if (available.length === 0) return null;
  return available.reduce((best, p) => {
    const d = maxPrice(p) - maxPrice(best);
    if (d !== 0) return d > 0 ? p : best;
    return p.handle < best.handle ? p : best;
  });
}

export function maxPrice(product: Product): number {
  const prices = product.variants.map((v) => v.price).filter((p) => p > 0);
  return prices.length > 0 ? Math.max(...prices) : 0;
}
