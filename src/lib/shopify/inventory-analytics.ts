// src/lib/shopify/inventory-analytics.ts
//
// Fase D.6: rotación, antigüedad, señal de reposición/descuento por pieza.
// Cruza tres fuentes reales que ya existían por separado:
//   - Catálogo (stock, Hype Index, publishedAt) — catalog-source.ts
//   - Vistas 24h — product_events (hype.ts)
//   - Ventas reales por producto — Admin API, ventana de 90 días (mismo
//     límite documentado que finance.ts: una página de hasta 250 pedidos,
//     suficiente para el volumen real de LAMK hoy)
//
// Nunca se inventa "antigüedad en inventario" — se usa `publishedAt`
// (fecha real de publicación en Shopify) como proxy honesto; no es
// exactamente "cuándo llegó físicamente" pero es el dato real más cercano
// que existe sin agregar un campo nuevo a Shopify.

import { getCatalogLive } from '@/lib/catalog-source';
import { getAllViewsInWindow } from '@/lib/hype';
import { isAdminApiConfigured } from './admin';

const SALES_WINDOW_DAYS = 90;
const STALE_THRESHOLD_DAYS = 30; // "sin vistas ni ventas en 30 días" — brief D.6

function getAdminConfig() {
  return {
    domain: process.env.SHOPIFY_ADMIN_API_STORE_DOMAIN || '',
    token: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-07',
  };
}

async function adminFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<{ data: T; errors?: any[] }> {
  const { domain, token, apiVersion } = getAdminConfig();
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  const body = await res.json();
  return { data: body.data, errors: body.errors };
}

const SALES_BY_PRODUCT_QUERY = `
  query SalesByProduct($query: String!) {
    orders(first: 250, sortKey: CREATED_AT, reverse: true, query: $query) {
      edges {
        node {
          lineItems(first: 20) {
            edges {
              node {
                quantity
                originalTotalSet { shopMoney { amount } }
                variant { product { id } }
              }
            }
          }
        }
      }
    }
  }
`;

async function getSalesByProduct(): Promise<Map<string, { units: number; revenue: number }>> {
  const result = new Map<string, { units: number; revenue: number }>();
  if (!isAdminApiConfigured()) return result;

  const windowStart = new Date(Date.now() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const { data, errors } = await adminFetch<any>(SALES_BY_PRODUCT_QUERY, {
    query: `created_at:>='${windowStart.toISOString()}'`,
  });
  if (!data?.orders) {
    console.error(`No se pudieron cargar ventas por producto (ventana ${SALES_WINDOW_DAYS}d):`, errors);
    return result;
  }

  for (const edge of data.orders.edges) {
    for (const liEdge of edge.node.lineItems?.edges || []) {
      const li = liEdge.node;
      const productId = li.variant?.product?.id;
      if (!productId) continue;
      const prev = result.get(productId) || { units: 0, revenue: 0 };
      prev.units += li.quantity || 0;
      prev.revenue += parseFloat(li.originalTotalSet?.shopMoney?.amount || '0');
      result.set(productId, prev);
    }
  }
  return result;
}

export type InventorySignal = 'REPONER' | 'DESCONTAR' | 'NORMAL' | 'SIN_ACTIVIDAD';

export interface InventoryRow {
  id: string;
  handle: string;
  title: string;
  brand: string;
  stockRemaining: number;
  isSoldOut: boolean;
  daysListed: number | null; // null = sin publishedAt real, no se inventa una fecha
  hypeScore: number;
  hypeSampleSize: number;
  views24h: number;
  salesUnits90d: number;
  salesRevenue90d: number;
  signal: InventorySignal;
}

export async function getInventoryAnalytics(): Promise<{ rows: InventoryRow[]; salesDataAvailable: boolean }> {
  const [{ products }, salesByProduct, views30d] = await Promise.all([
    getCatalogLive(),
    getSalesByProduct(),
    getAllViewsInWindow(STALE_THRESHOLD_DAYS),
  ]);

  const salesDataAvailable = isAdminApiConfigured();
  const now = Date.now();

  const rows: InventoryRow[] = products.map((p) => {
    const sales = salesByProduct.get(p.id) || { units: 0, revenue: 0 };
    const daysListed = p.publishedAt ? Math.floor((now - new Date(p.publishedAt).getTime()) / (24 * 60 * 60 * 1000)) : null;
    const hasEnoughHypeData = p.hypeMeter.sampleSize >= 50;
    const viewsInWindow = views30d[p.id] || 0;

    // Señal real (brief D.6): mucho hype + poco stock = reponer; mucho
    // stock + poco hype = descontar. Sin vistas NI ventas en
    // STALE_THRESHOLD_DAYS días completos (no solo 24h — cualquier
    // producto normal puede no tener vistas en un día por ruido), se
    // marca sin actividad. Sin datos suficientes de ninguna señal, no
    // se arriesga una recomendación.
    let signal: InventorySignal = 'NORMAL';
    if (!p.isSoldOut && viewsInWindow === 0 && sales.units === 0) {
      signal = 'SIN_ACTIVIDAD';
    } else if (hasEnoughHypeData && p.hypeMeter.score >= 70 && p.hypeMeter.stockRemaining <= 3 && !p.isSoldOut) {
      signal = 'REPONER';
    } else if (p.hypeMeter.stockRemaining > 10 && sales.units === 0) {
      signal = 'DESCONTAR';
    }

    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      brand: p.brand,
      stockRemaining: p.hypeMeter.stockRemaining,
      isSoldOut: p.isSoldOut,
      daysListed,
      hypeScore: p.hypeMeter.score,
      hypeSampleSize: p.hypeMeter.sampleSize,
      views24h: p.hypeMeter.viewsLast24h,
      salesUnits90d: sales.units,
      salesRevenue90d: sales.revenue,
      signal,
    };
  });

  return { rows, salesDataAvailable };
}
