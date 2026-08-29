// src/app/api/social/follow/route.ts
//
// Fase 2 sección 5: seguir un perfil público es inmediato; seguir uno de
// "solo seguidores" es una solicitud que el dueño debe aprobar. Un perfil
// privado (o el de un menor, siempre forzado a privado) está excluido de
// esto por completo — no se puede ni empezar a seguir.

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles, follows, blocks } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';
import { isMinor } from '@/lib/social/age';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { targetUsername } = await request.json();
  if (!targetUsername) return NextResponse.json({ error: 'Falta el usuario a seguir.' }, { status: 400 });

  const db = getDb();
  const [target] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, String(targetUsername).toLowerCase())).limit(1);
  if (!target) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (target.customerId === user.id) return NextResponse.json({ error: 'No puedes seguirte a ti mismo.' }, { status: 400 });

  const [blockedRow] = await db.select().from(blocks).where(and(eq(blocks.blockerId, target.customerId), eq(blocks.blockedId, user.id))).limit(1);
  const [blockingRow] = await db.select().from(blocks).where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, target.customerId))).limit(1);
  if (blockedRow || blockingRow) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const effectiveVisibility = isMinor(target.dateOfBirth) ? 'private' : target.profileVisibility;
  if (effectiveVisibility === 'private') {
    return NextResponse.json({ error: 'Este perfil no acepta seguidores.' }, { status: 403 });
  }

  const status = effectiveVisibility === 'public' ? 'accepted' : 'pending';

  await db
    .insert(follows)
    .values({ followerId: user.id, followeeId: target.customerId, status })
    .onConflictDoNothing();

  return NextResponse.json({ success: true, status });
}

export async function DELETE(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { targetUsername } = await request.json();
  const db = getDb();
  const [target] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, String(targetUsername || '').toLowerCase())).limit(1);
  if (!target) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.followeeId, target.customerId)));
  return NextResponse.json({ success: true });
}
