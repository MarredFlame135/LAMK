// src/app/api/wishlist/[productId]/route.ts
//
// Usado por WishlistButton (ficha de producto) para saber su estado
// inicial sin tener que traer la wishlist completa solo para revisar un
// producto.

import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/social/auth';
import { isInWishlist } from '@/lib/wishlist';

export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ inWishlist: false });

  const inWishlist = await isInWishlist(user.id, decodeURIComponent(params.productId));
  return NextResponse.json({ inWishlist });
}
