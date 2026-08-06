// src/app/api/catalog/route.ts
//
// Expone el catálogo real (con fallback a mock) para componentes cliente que
// no pueden llamar directo a Shopify de forma segura, como TenisinWidget.

import { NextResponse } from 'next/server';
import { getCatalogLive } from '@/lib/catalog-source';

export const revalidate = 60;

export async function GET() {
  const { products, source } = await getCatalogLive();
  return NextResponse.json({ products, source });
}
