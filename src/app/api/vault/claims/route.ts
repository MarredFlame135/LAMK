// src/app/api/vault/claims/route.ts
//
// Reclamos de compra manual (ver lib/vault-claims.ts para el porqué). GET
// trae los reclamos del cliente (cualquier estado, para que vea en qué va
// cada uno). POST registra uno nuevo — queda 'pending' hasta que un admin
// lo revise en /api/admin/vault-claims.

import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/social/auth';
import { getClaimsForCustomer, submitPurchaseClaim, isImageDataUrlTooLarge } from '@/lib/vault-claims';

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const claims = await getClaimsForCustomer(user.id);
  return NextResponse.json({ claims });
}

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { productTitle, imageUrl, note } = await request.json();

  if (typeof productTitle !== 'string' || !productTitle.trim()) {
    return NextResponse.json({ error: 'Falta el modelo exacto del producto.' }, { status: 400 });
  }
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Falta una foto válida del producto.' }, { status: 400 });
  }
  if (isImageDataUrlTooLarge(imageUrl)) {
    return NextResponse.json({ error: 'La foto es demasiado grande. Usa una imagen de menos de 2MB.' }, { status: 400 });
  }

  const claim = await submitPurchaseClaim({
    customerId: user.id,
    customerEmail: user.email,
    customerName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    productTitle: productTitle.trim(),
    imageUrl,
    note: typeof note === 'string' ? note.trim() : undefined,
  });

  return NextResponse.json({ claim });
}
