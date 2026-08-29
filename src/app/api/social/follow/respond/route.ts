// src/app/api/social/follow/respond/route.ts
//
// El dueño del perfil aprueba o rechaza una solicitud de seguimiento
// pendiente. Solo el dueño puede responder su propia solicitud entrante —
// se verifica contra la cookie de sesión, nunca contra un ID que mande el
// cliente (mismo criterio de IDOR de la Fase 1).

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { follows } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { followerId, action } = await request.json();
  if (!followerId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const db = getDb();
  const where = and(eq(follows.followerId, followerId), eq(follows.followeeId, user.id), eq(follows.status, 'pending'));

  const [pending] = await db.select().from(follows).where(where).limit(1);
  if (!pending) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });

  if (action === 'approve') {
    await db.update(follows).set({ status: 'accepted' }).where(where);
  } else {
    await db.delete(follows).where(where);
  }

  return NextResponse.json({ success: true });
}
