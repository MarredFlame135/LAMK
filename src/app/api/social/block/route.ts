// src/app/api/social/block/route.ts
//
// Fase 2 sección 6: bloquear implica automáticamente dejar de seguir (en
// ambas direcciones) y no poder volver a solicitar seguir — se aplica aquí
// en una sola transacción lógica, no queda a medias.

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, or } from 'drizzle-orm';
import { getDb } from '@/db';
import { blocks, follows, socialProfiles } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { targetUsername } = await request.json();
  const db = getDb();
  const [target] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, String(targetUsername || '').toLowerCase())).limit(1);
  if (!target) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (target.customerId === user.id) return NextResponse.json({ error: 'No puedes bloquearte a ti mismo.' }, { status: 400 });

  await db.insert(blocks).values({ blockerId: user.id, blockedId: target.customerId }).onConflictDoNothing();
  await db.delete(follows).where(
    or(
      and(eq(follows.followerId, user.id), eq(follows.followeeId, target.customerId)),
      and(eq(follows.followerId, target.customerId), eq(follows.followeeId, user.id))
    )
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { targetUsername } = await request.json();
  const db = getDb();
  const [target] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, String(targetUsername || '').toLowerCase())).limit(1);
  if (!target) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await db.delete(blocks).where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, target.customerId)));
  return NextResponse.json({ success: true });
}
