// src/app/sitemap.ts
//
// Fix (hallazgos #3 y #4 de la auditoría de Fase 4): sin esto, Google solo
// podía descubrir fichas de producto siguiendo links desde el catálogo — y
// el catálogo usa "Cargar más" client-side (ver CatalogGrid.tsx), así que
// cualquier producto más allá del primer lote nunca tenía una URL que un
// crawler pudiera seguir. Este sitemap lista TODOS los productos reales del
// catálogo (mismo `getCatalogLive()` que ya usa todo el proyecto, nada
// inventado) — así Google llega directo a cada ficha sin depender de
// recorrer el catálogo paginado. `/profile/*` no entra aquí a propósito
// (son noindex, ver hallazgo #2).

import type { MetadataRoute } from 'next';
import { getCatalogLive } from '@/lib/catalog-source';
import { getSiteUrl } from '@/lib/site-url';

export const revalidate = 3600; // el sitemap no necesita regenerarse más seguido que esto

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const { products } = await getCatalogLive();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/aviso-de-privacidad`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/product/${product.handle}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
