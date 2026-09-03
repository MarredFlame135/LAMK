// src/lib/discovery.ts
//
// Taxonomía de descubrimiento (MOST HYPE / MOST DROPPED / GRAILS / UNDER $5K /
// MEXICAN HEAT / COLLECTIBLES) y los rangos de precio del catálogo — todos los
// criterios están atados a datos reales del producto (hype score real, precio
// real, categoría real, colaboración real), NO a números inventados. Donde no
// hay una señal real disponible (fecha de publicación en el catálogo mock de
// respaldo) se documenta el heurístico explícitamente en vez de fingir un dato
// que no existe.
//
// Nombres de las pestañas (2026-09-03, pedido del cliente): "HOT RIGHT NOW"
// pasó a MOST HYPE y "JUST DROPPED" a MOST DROPPED. Los ids NO cambiaron —
// son la clave con la que la analítica de Fase 5 ya tiene historia, y
// renombrarlos partiría la serie en dos sin ganar nada.

import { Product } from '@/types/product';

export type DiscoveryTab = 'ALL' | 'HOT' | 'JUST_DROPPED' | 'GRAILS' | 'MEXICAN_HEAT' | 'UNDER_5K' | 'COLLECTIBLES';

// `index` reemplaza al emoji decorativo que tenía cada pestaña — se muestra
// como prefijo numérico HUD ("01 //"), no como ícono informal.
export const DISCOVERY_TABS: Array<{ id: DiscoveryTab; label: string; index: string }> = [
  { id: 'HOT', label: 'MOST HYPE', index: '01' },
  { id: 'JUST_DROPPED', label: 'MOST DROPPED', index: '02' },
  { id: 'GRAILS', label: 'GRAILS', index: '03' },
  { id: 'UNDER_5K', label: 'UNDER $5K', index: '04' },
  { id: 'MEXICAN_HEAT', label: 'MEXICAN HEAT', index: '05' },
  { id: 'COLLECTIBLES', label: 'COLLECTIBLES', index: '06' },
];

const JUST_DROPPED_WINDOW_DAYS = 21;
const GRAIL_PRICE_THRESHOLD_MXN = 10000;
const UNDER_THRESHOLD_MXN = 5000;

export function minPrice(product: Product): number {
  const prices = product.variants.map((v) => v.price).filter((p) => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function isMexicanHeat(product: Product): boolean {
  const haystack = `${product.brand} ${product.storytelling.collaboration || ''}`.toLowerCase();
  return haystack.includes('báez') || haystack.includes('baez') || haystack.includes('méxico') || haystack.includes('mexico') || haystack.includes('local');
}

// `publishedAt` solo existe cuando el producto viene de Shopify real (ver
// shopify/index.ts::formatShopifyProduct). El catálogo mock de respaldo no
// tiene fecha de publicación real, así que ahí se usa la posición en el
// arreglo (los primeros ~6 productos declarados) como heurístico de "recién
// llegado" — documentado aquí, no es un dato inventado presentado como real.
function isJustDropped(product: Product, index: number): boolean {
  if (product.publishedAt) {
    const days = (Date.now() - new Date(product.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= JUST_DROPPED_WINDOW_DAYS;
  }
  return index < 6;
}

export function matchesDiscoveryTab(product: Product, tab: DiscoveryTab, index: number): boolean {
  switch (tab) {
    case 'HOT':
      return product.hypeMeter.score >= 70 && !product.isSoldOut;
    case 'JUST_DROPPED':
      return isJustDropped(product, index);
    case 'GRAILS':
      return Boolean(product.storytelling.collaboration) || minPrice(product) >= GRAIL_PRICE_THRESHOLD_MXN;
    case 'MEXICAN_HEAT':
      return isMexicanHeat(product);
    case 'UNDER_5K':
      return minPrice(product) > 0 && minPrice(product) < UNDER_THRESHOLD_MXN;
    case 'COLLECTIBLES':
      return product.category === 'COLLECTIBLES';
    case 'ALL':
    default:
      return true;
  }
}

export function filterByDiscoveryTab(products: Product[], tab: DiscoveryTab): Product[] {
  if (tab === 'ALL') return products;
  return products.filter((p, i) => matchesDiscoveryTab(p, tab, i));
}

// --- Rangos de precio ------------------------------------------------------
//
// Los cortes NO son redondos por gusto: salen de la distribución real de
// precios del catálogo vivo, medida el 2026-09-03 sobre las 265 piezas —
// mínimo $300, mediana $3,500, p75 $5,500, p90 $9,500, máximo $25,000. Con
// cortes en 2,500 / 5,000 / 10,000 los cuatro tramos quedan poblados en vez
// de dejar uno vacío y otro con el 80% del catálogo.
//
// El corte de $5,000 es además el mismo de la pestaña UNDER $5K y el del
// envío gratis (lib/cart-math.ts), y el de $10,000 el mismo de GRAILS: un
// solo mapa de precios en todo el sitio, no tres que casi coinciden.

export type PriceBandId = 'ALL' | 'B0' | 'B1' | 'B2' | 'B3';

export const PRICE_BANDS: Array<{ id: PriceBandId; label: string; min: number; max: number }> = [
  { id: 'B0', label: 'Hasta $2,500', min: 0, max: 2500 },
  { id: 'B1', label: '$2,500 – $5,000', min: 2500, max: 5000 },
  { id: 'B2', label: '$5,000 – $10,000', min: 5000, max: 10000 },
  { id: 'B3', label: '$10,000+', min: 10000, max: Infinity },
];

// Tramos semiabiertos [min, max): una pieza de exactamente $5,000 cae en
// "$5,000 – $10,000" y en ningún otro. Sin esto, sumar los conteos de los
// cuatro tramos daría más que el total y el número de la pastilla dejaría de
// ser verificable.
export function matchesPriceBand(product: Product, band: PriceBandId): boolean {
  if (band === 'ALL') return true;
  const spec = PRICE_BANDS.find((b) => b.id === band);
  if (!spec) return true;
  const price = minPrice(product);
  return price >= spec.min && price < spec.max;
}

export function filterByPriceBand(products: Product[], band: PriceBandId): Product[] {
  if (band === 'ALL') return products;
  return products.filter((p) => matchesPriceBand(p, band));
}
