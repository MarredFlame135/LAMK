// src/lib/catalog-source.ts
//
// Fuente de datos "real" del catálogo: intenta Shopify Storefront API en vivo
// y cae de vuelta al catálogo local mock (src/lib/catalog.ts) si la API falla,
// no hay credenciales configuradas, o la tienda no devuelve productos. Así el
// sitio nunca se rompe por un problema temporal de conexión con Shopify.
//
// También sobrepone el Hype Meter real (RF-05: Vistas24h / Stock, decide el
// `label`) y el Índice ponderado real (hallazgo #2 de la auditoría "Prompt
// Maestro v4" — decide el `score` que se muestra como "INDEX" en las
// tarjetas) usando lo que hype.ts trae de Postgres, sobre lo que
// formatShopifyProduct ya trae de stock.

import { Product } from '@/types/product';
import { getProducts, getProductByHandle as getShopifyProductByHandle } from '@/lib/shopify';
import { SHOPIFY_CONFIG } from '@/lib/shopify/config';
import { getCatalog, getProductByHandle as getMockProductByHandle } from '@/lib/catalog';
import { getAllViews24h, getViews24h, computeHypeMeter, computeHypeIndex } from '@/lib/hype';
import { getHiddenProductIds } from '@/lib/inventory-store';

const hasShopifyCredentials = Boolean(SHOPIFY_CONFIG.domain && (SHOPIFY_CONFIG.storefrontAccessToken || SHOPIFY_CONFIG.privateAccessToken));

async function withRealHype(product: Product, views24h: number): Promise<Product> {
  const [{ label }, { score, sampleSize }] = await Promise.all([
    Promise.resolve(computeHypeMeter(views24h, product.hypeMeter.stockRemaining)),
    computeHypeIndex(product.id),
  ]);
  return {
    ...product,
    hypeMeter: { ...product.hypeMeter, score, sampleSize, label, viewsLast24h: views24h },
  };
}

// `includeHidden` es solo para el panel admin (Gestión de inventario), que
// necesita ver también los productos desactivados para poder reactivarlos.
export async function getCatalogLive(options: { includeHidden?: boolean } = {}): Promise<{ products: Product[]; source: 'shopify' | 'mock' }> {
  const viewsById = await getAllViews24h();
  const hiddenIds = options.includeHidden ? new Set<string>() : new Set(await getHiddenProductIds());
  const applyFilters = (products: Product[]) =>
    Promise.all(products.filter((p) => !hiddenIds.has(p.id)).map((p) => withRealHype(p, viewsById[p.id] || 0)));

  if (hasShopifyCredentials) {
    try {
      const products = await getProducts();
      if (products.length > 0) {
        return { products: await applyFilters(products), source: 'shopify' };
      }
      console.warn('Shopify devolvió 0 productos; usando catálogo mock de respaldo.');
    } catch (err) {
      console.error('No se pudo cargar el catálogo real de Shopify, usando mock de respaldo:', err);
    }
  }
  return { products: await applyFilters(getCatalog()), source: 'mock' };
}

export async function getProductByHandleLive(handle: string): Promise<{ product: Product | null; source: 'shopify' | 'mock' }> {
  const hiddenIds = new Set(await getHiddenProductIds());

  if (hasShopifyCredentials) {
    try {
      const product = await getShopifyProductByHandle(handle);
      if (product && !hiddenIds.has(product.id)) return { product: await withRealHype(product, await getViews24h(product.id)), source: 'shopify' };
      if (product) return { product: null, source: 'shopify' }; // oculto por el admin
    } catch (err) {
      console.error(`No se pudo cargar el producto "${handle}" de Shopify, probando mock de respaldo:`, err);
    }
  }
  const mock = getMockProductByHandle(handle) || null;
  if (mock && hiddenIds.has(mock.id)) return { product: null, source: 'mock' };
  return { product: mock ? await withRealHype(mock, await getViews24h(mock.id)) : null, source: 'mock' };
}
