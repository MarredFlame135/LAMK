// src/app/(routes)/catalog/page.tsx

import React from 'react';
import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { getCatalogLive } from '@/lib/catalog-source';

// Fix (hallazgo #3 de la auditoría de Fase 3): ver el mismo comentario en
// (routes)/page.tsx — sin esto la página era 100% estática, stock/Hype
// Meter congelados hasta el siguiente deploy.
export const revalidate = 60;

export default async function CatalogPage() {
  const { products } = await getCatalogLive();
  return <CatalogGrid products={products} />;
}
