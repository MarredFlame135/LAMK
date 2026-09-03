// src/components/home/DropsCoverflow.tsx
//
// "Curaduría LAMK" — el carrusel insignia del home (pedido explícito del
// cliente: "debe ser el mejor, el más llamativo").
//
// Cambio 2026-09-01: el coverflow 3D (5 miniaturas del mismo tamaño girando
// en perspectiva) se reemplazó por una vitrina de una pieza a la vez, con el
// producto flotando sobre su nombre en tipografía gigante — ver
// `components/ui/spotlight-carousel.tsx` para el porqué del diseño y de la
// banda clara. El archivo `coverflow-carousel.tsx` sigue existiendo pero ya
// no se monta en ningún lado (mismo criterio que se usó con CustomCursor.tsx
// en la Fase 6). **Efecto secundario bueno:** ese componente tenía un bug de
// hidratación con `prefers-reduced-motion` que tumbaba el render de toda la
// home; al dejar de montarlo, deja de afectar a nadie. El bug sigue en el
// archivo si algún día se retoma — ver CLAUDE.md.
//
// Curaduría diversificada (2026-08-27, sin cambios): antes era un sort()
// global por Hype score, que en la práctica siempre terminaba siendo puro
// sneaker (es la categoría con más piezas e interacción). Ahora se toma
// primero la pieza con más Hype de CADA categoría disponible, y se rellena el
// resto con las siguientes de mayor Hype — la vitrina refleja todo el
// catálogo, no solo un rincón.

'use client';

import React from 'react';
import { SpotlightCarousel, SpotlightItem } from '@/components/ui/spotlight-carousel';
import { Product } from '@/types/product';
import { track } from '@/lib/analytics';

// 6 piezas. La vitrina enseña los nombres de TODAS en las pastillas de abajo,
// y arriba de ~6 nombres largos de sneaker se envuelven en tres renglones y se
// comen la sección.
const MAX_ITEMS = 6;
const CAROUSEL_NAME = 'drops_coverflow';

// Mismo umbral que ProductCard/HypeMeter (hallazgo #2 de la auditoría "Prompt
// Maestro v4"): por debajo de esto el score no tiene muestra suficiente detrás
// y no significa nada.
const MIN_HYPE_SAMPLE = 50;

/**
 * Qué piezas salen en la vitrina.
 *
 * El objetivo final es "las más hypeadas", y eso es lo que hace en cuanto el
 * catálogo tenga tráfico real. El problema es HOY: el sitio todavía no se
 * comparte, así que ningún producto llega a `MIN_HYPE_SAMPLE` y todos los
 * scores salen iguales. Ordenar por un score empatado da un orden estable pero
 * arbitrario — siempre las mismas 6 piezas, para siempre.
 *
 * Mientras no haya señal real, la vitrina ROTA por día: `daySeed` corre la
 * ventana de selección dentro de cada categoría, así que la portada cambia
 * todos los días sin ser aleatoria (todo el mundo ve lo mismo el mismo día, y
 * recargar no la cambia — importante para que la analítica de posiciones siga
 * siendo comparable, ver Fase 5).
 *
 * El día que exista Hype real, `hasRealHype` se vuelve true y la rotación se
 * apaga sola: manda el score y ya. No hay que venir a borrar nada.
 */
function buildSelection(products: Product[], daySeed: number): Product[] {
  const available = products.filter((p) => !p.isSoldOut);
  if (available.length === 0) return [];

  const byScore = (a: Product, b: Product) => b.hypeMeter.score - a.hypeMeter.score;
  const hasRealHype = available.some((p) => p.hypeMeter.sampleSize >= MIN_HYPE_SAMPLE);

  const categories = Array.from(new Set(available.map((p) => p.category))).sort();
  const picked = new Map<string, Product>();

  // 1) Una pieza de cada categoría real del catálogo — así la vitrina no se
  //    vuelve puro sneaker (que es la categoría con más piezas e interacción).
  //    Con Hype real es la de más score; sin él, la que le toque hoy.
  for (const cat of categories) {
    const inCat = available.filter((p) => p.category === cat).sort(byScore);
    if (inCat.length === 0) continue;
    const idx = hasRealHype ? 0 : daySeed % inCat.length;
    picked.set(inCat[idx].id, inCat[idx]);
  }

  // 2) Rellena el resto. Con Hype real, las siguientes de mayor score. Sin él,
  //    se recorre el catálogo desde un punto de arranque distinto cada día.
  const rest = [...available].sort(byScore);
  const start = hasRealHype ? 0 : daySeed % rest.length;
  for (let i = 0; i < rest.length && picked.size < MAX_ITEMS; i += 1) {
    const p = rest[(start + i) % rest.length];
    if (!picked.has(p.id)) picked.set(p.id, p);
  }

  return Array.from(picked.values()).sort(byScore).slice(0, MAX_ITEMS);
}

// Los títulos reales de Shopify vienen como "TENIS DUNK LOW REVERSE UNC": el
// prefijo de categoría es ruido cuando el nombre se va a pintar a 8vw, y se
// repetiría idéntico en todas las piezas de calzado. Se quita solo cuando de
// verdad es un prefijo (no si el nombre ENTERO es "TENIS").
function displayName(title: string): string {
  const cleaned = title.replace(/^\s*TENIS\s+/i, '').trim();
  return cleaned.length > 0 ? cleaned : title.trim();
}

// Solo datos que de verdad varían por pieza y que salen de una fuente real.
// El HEAT respeta el mismo umbral de muestra que ProductCard/HypeMeter
// (hallazgo #2 de la auditoría "Prompt Maestro v4"): sin muestra suficiente
// se omite el dato en vez de mostrar un 0 que se lee como roto.
function buildMeta(p: Product): string[] {
  const meta: string[] = [];

  const price = p.variants[0]?.price;
  if (typeof price === 'number') meta.push(`$${price.toLocaleString('es-MX')} MXN`);

  if (p.hypeMeter.sampleSize >= 50) meta.push(`HEAT ${p.hypeMeter.score.toFixed(0)}`);

  // 'NORMAL' no aporta nada (es el estado por defecto); los otros tres sí son
  // una señal real de urgencia.
  if (p.hypeMeter.label !== 'NORMAL') meta.push(p.hypeMeter.label);

  return meta;
}

interface DropsCoverflowProps {
  products: Product[];
  /**
   * Número de día, calculado en el SERVIDOR (ver page.tsx) y pasado como prop.
   *
   * No se calcula aquí con `new Date()` a propósito: este es un componente de
   * cliente que el servidor también renderiza, y si los dos leyeran el reloj
   * por su cuenta cerca de la medianoche elegirían días distintos y React
   * tiraría la hidratación. Un solo reloj, el del servidor.
   */
  daySeed: number;
}

export function DropsCoverflow({ products, daySeed }: DropsCoverflowProps) {
  const items: SpotlightItem[] = buildSelection(products, daySeed).map((p) => ({
    id: p.id,
    image: p.images[0] || '/placeholder-sneaker.svg',
    name: displayName(p.title),
    meta: buildMeta(p),
    href: `/product/${p.handle}`,
  }));

  if (items.length === 0) return null;

  // Fix (hallazgo #2 de la auditoría de Fase 5), se conserva tal cual:
  // impresión = la pieza que llega a estar activa; clic = alguien la tocó
  // para ir a la ficha. Es justo el dato que la Fase 6 necesita para saber si
  // este carrusel —pedido explícito del cliente como "el más llamativo"— de
  // verdad convierte.
  return (
    <SpotlightCarousel
      items={items}
      onActiveChange={(_item, position) => track('carousel_impression', { carouselName: CAROUSEL_NAME, position })}
      onItemClick={(_item, position) => track('carousel_click', { carouselName: CAROUSEL_NAME, position })}
    />
  );
}
