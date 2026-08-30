// src/app/api/admin/vault-claims/route.ts
//
// Cola de aprobación de reclamos de compra manual (ver lib/vault-claims.ts).
// Protegida por el middleware central (vive bajo /api/admin/*, ver
// middleware.ts) — no hace falta verificar sesión aquí, mismo patrón que
// el resto de api/admin/*. Abierta a cualquier rol autenticado (admin o
// staff) — no está en ADMIN_ONLY_PREFIXES de middleware.ts a propósito:
// aprobar piezas de clientes es una tarea operativa, no financiera.

import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForAdmin, reviewPurchaseClaim } from '@/lib/vault-claims';

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get('status');
  const status = statusParam === 'pending' || statusParam === 'approved' || statusParam === 'rejected' ? statusParam : undefined;

  const claims = await getClaimsForAdmin(status);
  return NextResponse.json({ claims });
}

export async function PATCH(request: NextRequest) {
  const { id, status, reviewNote } = await request.json();

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Falta id.' }, { status: 400 });
  }
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'status debe ser "approved" o "rejected".' }, { status: 400 });
  }

  await reviewPurchaseClaim(id, status, typeof reviewNote === 'string' ? reviewNote : undefined);
  return NextResponse.json({ success: true });
}
