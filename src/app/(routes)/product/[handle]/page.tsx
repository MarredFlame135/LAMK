// src/app/(routes)/product/[handle]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/ProductDetail';
import { getProductByHandleLive } from '@/lib/catalog-source';
import { recordView, getViews24h, computeHypeMeter } from '@/lib/hype';

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

  return <ProductDetail product={productWithFreshHype} />;
}
