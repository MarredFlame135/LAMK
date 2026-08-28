// src/app/(routes)/product/[handle]/page.tsx

import React from 'react';
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/ProductDetail';
import { getProductByHandleLive } from '@/lib/catalog-source';
import { recordView, getViews24h, computeHypeMeter } from '@/lib/hype';
import { getSiteUrl } from '@/lib/site-url';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { Product } from '@/types/product';

interface ProductPageProps {
  params: { handle: string };
}

// Fix (hallazgo #1 de la auditoría de Fase 4): generateMetadata() y el
// componente de página necesitan el mismo producto — sin cache(), sería un
// segundo round-trip a Shopify por cada visita. cache() de React memoiza
// por request, así que el segundo call reusa el resultado del primero sin
// tocar la red otra vez.
const getProduct = cache((handle: string) => getProductByHandleLive(handle));

// Fix (hallazgo #1 de la auditoría de Fase 4): sin esto, TODAS las fichas de
// producto compartían el mismo <title>/<meta description> genérico del
// layout raíz — nada distinguía una ficha de otra en un resultado de
// búsqueda de Google.
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { product } = await getProduct(params.handle);
  if (!product) return {};

  const description = product.description || product.storytelling.storySummary;
  const image = product.images[0];

  return {
    title: `${product.title} | ${product.brand} — ${SAAS_CONFIG.brandName}`,
    description,
    openGraph: {
      title: product.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

function buildProductJsonLd(product: Product) {
  const variant = product.variants.find((v) => v.isAvailable) || product.variants[0];
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.storytelling.storySummary,
    image: product.images,
    brand: { '@type': 'Brand', name: product.brand },
    sku: variant?.sku || product.id,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/product/${product.handle}`,
      priceCurrency: 'MXN',
      price: variant?.price ?? 0,
      availability: product.isSoldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

// Fix (hallazgo #7 de la auditoría de Fase 4): breadcrumb Home → Catálogo →
// Producto — no depende de que existan URLs de categoría (a diferencia del
// breadcrumb por categoría, que sí queda pendiente de esa decisión).
function buildBreadcrumbJsonLd(product: Product) {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${siteUrl}/catalog` },
      { '@type': 'ListItem', position: 3, name: product.title, item: `${siteUrl}/product/${product.handle}` },
    ],
  };
}

// Nota: ya no se usa generateStaticParams() con handles fijos del mock — el
// catálogo real de Shopify cambia (nuevos drops, productos agotados/eliminados),
// así que cada handle se resuelve dinámicamente en request time.
//
// Fix (hallazgo #4 de la auditoría de Fase 3): `force-dynamic` hacía que
// CADA visita a una ficha de producto —la página con más tráfico repetido
// del sitio— disparara un round-trip en vivo a Shopify, sin caché de CDN
// posible. `revalidate` no contradice la nota de arriba: el primer visitante
// de un handle sigue resolviéndolo en vivo (no hay generateStaticParams,
// así que no hay nada pre-generado), pero el resultado se sirve desde
// caché/CDN hasta por 60s antes de volver a tocar Shopify — el checkout
// real siempre revalida el precio/stock contra Shopify de todos modos, así
// que nunca se vende algo desactualizado por este margen.
export const revalidate = 60;

export default async function ProductPage({ params }: ProductPageProps) {
  const { product } = await getProduct(params.handle);

  if (!product) {
    notFound();
  }

  // RF-05: cada visita a la ficha cuenta como una vista real para el Hype Meter.
  recordView(product.id);
  const views24h = getViews24h(product.id);
  const { score, label } = computeHypeMeter(views24h, product.hypeMeter.stockRemaining);
  const productWithFreshHype = {
    ...product,
    hypeMeter: { ...product.hypeMeter, score, label, viewsLast24h: views24h },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(productWithFreshHype)) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(productWithFreshHype)) }}
      />
      <ProductDetail product={productWithFreshHype} />
    </>
  );
}
