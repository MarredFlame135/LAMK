// src/lib/catalog-source.ts
//
// Fuente de datos "real" del catálogo: intenta Shopify Storefront API en vivo
// y cae de vuelta al catálogo local mock (src/lib/catalog.ts) si la API falla,
// no hay credenciales configuradas, o la tienda no devuelve productos. Así el
// sitio nunca se rompe por un problema temporal de conexión con Shopify.
//
// También sobrepone el Hype Meter real (RF-05: Vistas24h / Stock) usando las
// vistas registradas en src/lib/hype.ts sobre lo que formatShopifyProduct ya
// trae de stock, para que catálogo/home reflejen la fórmula real.

import { Product } from '@/types/product';
import { getProducts, getProductByHandle as getShopifyProductByHandle } from '@/lib/shopify';
import { SHOPIFY_CONFIG } from '@/lib/shopify/config';
import { getCatalog, getProductByHandle as getMockProductByHandle } from '@/lib/catalog';
import { getAllViews24h, getViews24h, computeHypeMeter } from '@/lib/hype';

const hasShopifyCredentials = Boolean(SHOPIFY_CONFIG.domain && (SHOPIFY_CONFIG.storefrontAccessToken || SHOPIFY_CONFIG.privateAccessToken));

function withRealHype(product: Product, views24h: number): Product {
  const { score, label } = computeHypeMeter(views24h, product.hypeMeter.stockRemaining);
  return {
    ...product,
    hypeMeter: { ...product.hypeMeter, score, label, viewsLast24h: views24h },
  };
}

export async function getCatalogLive(): Promise<{ products: Product[]; source: 'shopify' | 'mock' }> {
  const viewsById = getAllViews24h();

  if (hasShopifyCredentials) {
    try {
      const products = await getProducts();
      if (products.length > 0) {
        return { products: products.map((p) => withRealHype(p, viewsById[p.id] || 0)), source: 'shopify' };
      }
      console.warn('Shopify devolvió 0 productos; usando catálogo mock de respaldo.');
    } catch (err) {
      console.error('No se pudo cargar el catálogo real de Shopify, usando mock de respaldo:', err);
    }
  }
  return { products: getCatalog().map((p) => withRealHype(p, viewsById[p.id] || 0)), source: 'mock' };
}

export async function getProductByHandleLive(handle: string): Promise<{ product: Product | null; source: 'shopify' | 'mock' }> {
  if (hasShopifyCredentials) {
    try {
      const product = await getShopifyProductByHandle(handle);
      if (product) return { product: withRealHype(product, getViews24h(product.id)), source: 'shopify' };
    } catch (err) {
      console.error(`No se pudo cargar el producto "${handle}" de Shopify, probando mock de respaldo:`, err);
    }
  }
  const mock = getMockProductByHandle(handle) || null;
  return { product: mock ? withRealHype(mock, getViews24h(mock.id)) : null, source: 'mock' };
}
