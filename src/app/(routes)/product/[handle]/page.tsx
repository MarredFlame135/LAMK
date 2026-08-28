// src/app/(routes)/product/[handle]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/ProductDetail';
import { getProductByHandleLive } from '@/lib/catalog-source';
import { recordView, getViews24h, computeHypeMeter } from '@/lib/hype';
import { Product } from '@/types/product';

// Fix (auditoría 2026-08-27, hallazgo #8): sin JSON-LD, Google Shopping y
// los rich results no tienen forma de leer precio/disponibilidad de las
// piezas — cero snippets de producto en buscador. Con precio y stock reales
// (mismos datos que ya usa la ficha, nada inventado). La URL pública final
// del sitio todavía no está definida (dominio propio pendiente de compra),
// así que se usa NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN — el mismo dominio real
// que ya sirve de referencia en el resto del proyecto — con fallback
// relativo si algún día cambia.
function buildProductJsonLd(product: Product) {
  const variant = product.variants.find((v) => v.isAvailable) || product.variants[0];
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
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
      url: domain ? `https://${domain}/product/${product.handle}` : `/product/${product.handle}`,
      priceCurrency: 'MXN',
      price: variant?.price ?? 0,
      availability: product.isSoldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

interface ProductPageProps {
  params: { handle: string };
}

// Nota: ya no se usa generateStaticParams() con handles fijos del mock — el
// catálogo real de Shopify cambia (nuevos drops, productos agotados/eliminados),
// así que cada handle se resuelve dinámicamente en request time.
export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: ProductPageProps) {
  const { product } = await getProductByHandleLive(params.handle);

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
      <ProductDetail product={productWithFreshHype} />
    </>
  );
}
