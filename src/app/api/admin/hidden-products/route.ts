// src/app/api/admin/hidden-products/route.ts

import { NextResponse } from 'next/server';
import { getHiddenProductIds, setProductHidden } from '@/lib/inventory-store';

export async function GET() {
  return NextResponse.json({ hidden: await getHiddenProductIds() });
}

export async function POST(request: Request) {
  const { productId, hidden } = await request.json();
  if (!productId || typeof hidden !== 'boolean') {
    return NextResponse.json({ error: 'productId y hidden son obligatorios' }, { status: 400 });
  }
  const next = await setProductHidden(productId, hidden);
  return NextResponse.json({ hidden: next });
}
