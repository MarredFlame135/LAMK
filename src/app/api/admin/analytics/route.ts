// src/app/api/admin/analytics/route.ts
//
// Métricas reales disponibles hoy sin la Admin API de Shopify (que aún no
// tiene scopes de lectura activados): vistas reales por producto (Hype
// Meter) cruzadas con el catálogo, para armar un ranking de "más deseados".
// Ventas/top-sellers reales de Shopify se agregan aquí en cuanto haya un
// Admin API token con read_orders/read_products.

import { NextResponse } from 'next/server';
import { getCatalogLive } from '@/lib/catalog-source';
import { getAllViews24h } from '@/lib/hype';

export async function GET() {
  const { products } = await getCatalogLive();
  // Fix (bug real encontrado en Fase D, arrastrado desde el hallazgo #2 de
  // Fase A): getAllViews24h() pasó de síncrona a asíncrona (fs -> Postgres)
  // en esa auditoría — este call site se quedó sin el `await`. `tsc` no lo
  // marcó porque el tsconfig no tiene noImplicitAny estricto sobre índices
  // computados; en runtime, `viewsById[p.id]` siempre daba `undefined`
  // (indexar un objeto Promise por string no lanza, solo no encuentra
  // nada) — "más deseados" en este panel llevaba tiempo mostrando 0 vistas
  // para todo, silenciosamente.
  const viewsById = await getAllViews24h();

  const topViewed = [...products]
    .map((p) => ({
      id: p.id,
      title: p.title,
      brand: p.brand,
      category: p.category,
      views: viewsById[p.id] || 0,
      stockRemaining: p.hypeMeter.stockRemaining,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const products_lite = products.map((p) => ({ id: p.id, category: p.category, title: p.title }));

  return NextResponse.json({ topViewed, products: products_lite });
}
