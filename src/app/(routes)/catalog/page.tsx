// src/app/(routes)/catalog/page.tsx

import React from 'react';
import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { getCatalogLive } from '@/lib/catalog-source';

export default async function CatalogPage() {
  const { products } = await getCatalogLive();
  return <CatalogGrid products={products} />;
}
