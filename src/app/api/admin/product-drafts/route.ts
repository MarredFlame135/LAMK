// src/app/api/admin/product-drafts/route.ts

import { NextResponse } from 'next/server';
import { getProductDrafts, addProductDraft, deleteProductDraft } from '@/lib/inventory-store';

export async function GET() {
  return NextResponse.json({ drafts: getProductDrafts() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title || !body.imageUrl) {
    return NextResponse.json({ error: 'Título e imagen son obligatorios' }, { status: 400 });
  }
  const draft = addProductDraft(body);
  return NextResponse.json({ draft });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });
  deleteProductDraft(id);
  return NextResponse.json({ success: true });
}
