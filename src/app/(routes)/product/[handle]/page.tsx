// src/app/(routes)/product/[handle]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/ProductDetail';
import { getProductByHandle, getCatalog } from '@/lib/catalog';

interface ProductPageProps {
  params: { handle: string };
}

// Genera las rutas estáticas para cada producto del catálogo en build time
export function generateStaticParams() {
  return getCatalog().map((p) => ({ handle: p.handle }));
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = getProductByHandle(params.handle);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
