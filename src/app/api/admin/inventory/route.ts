// src/app/api/admin/inventory/route.ts
//
// Catálogo completo (incluye ocultos) para el panel de Gestión de Inventario.

import { NextResponse } from 'next/server';
import { getCatalogLive } from '@/lib/catalog-source';
import { getHiddenProductIds } from '@/lib/inventory-store';

export async function GET() {
  const { products } = await getCatalogLive({ includeHidden: true });
  const hidden = await getHiddenProductIds();
  return NextResponse.json({ products, hidden });
}
