// src/lib/discovery.ts
//
// Taxonomía de descubrimiento (HOT RIGHT NOW / JUST DROPPED / GRAILS /
// MEXICAN HEAT / UNDER $5K / COLLECTIBLES) — todos los criterios están
// atados a datos reales del producto (hype score real, precio real,
// categoría real, colaboración real), NO a números inventados. Donde no hay
// una señal real disponible (fecha de publicación en el catálogo mock de
// respaldo) se documenta el heurístico explícitamente en vez de fingir un
// dato que no existe.

import { Product } from '@/types/product';

export type DiscoveryTab = 'ALL' | 'HOT' | 'JUST_DROPPED' | 'GRAILS' | 'MEXICAN_HEAT' | 'UNDER_5K' | 'COLLECTIBLES';

// `index` reemplaza al emoji decorativo que tenía cada pestaña — se muestra
// como prefijo numérico HUD ("01 //"), no como ícono informal.
export const DISCOVERY_TABS: Array<{ id: DiscoveryTab; label: string; index: string }> = [
  { id: 'HOT', label: 'HOT RIGHT NOW', index: '01' },
  { id: 'JUST_DROPPED', label: 'JUST DROPPED', index: '02' },
  { id: 'GRAILS', label: 'GRAILS', index: '03' },
  { id: 'MEXICAN_HEAT', label: 'MEXICAN HEAT', index: '04' },
  { id: 'UNDER_5K', label: 'UNDER $5K', index: '05' },
  { id: 'COLLECTIBLES', label: 'COLLECTIBLES', index: '06' },
];

const JUST_DROPPED_WINDOW_DAYS = 21;
const GRAIL_PRICE_THRESHOLD_MXN = 10000;
const UNDER_THRESHOLD_MXN = 5000;

function minPrice(product: Product): number {
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
