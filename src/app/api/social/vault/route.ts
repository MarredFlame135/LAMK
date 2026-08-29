// src/app/api/social/vault/route.ts
//
// Fase 2 sección 1.1: agregar una pieza a la bóveda pública es SIEMPRE un
// acto explícito del dueño — este endpoint nunca se llama automáticamente
// desde el checkout ni desde ningún webhook. Nada en el proyecto dispara
// esto salvo que la propia persona lo pida.

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { vaultItems } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { productId, title, imageUrl, note } = await request.json();
  if (!title || !imageUrl) {
    return NextResponse.json({ error: 'Título e imagen son obligatorios.' }, { status: 400 });
  }

  const db = getDb();
  const [item] = await db
    .insert(vaultItems)
    .values({
      id: randomUUID(),
      customerId: user.id,
      productId: productId || null,
      title: String(title).slice(0, 120),
      imageUrl,
      note: note ? String(note).slice(0, 280) : null,
    })
    .returning();

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 });

  const db = getDb();
  // El where incluye customerId=user.id a propósito — sin esto, cualquiera
  // con sesión podría borrar la pieza de bóveda de otra persona con solo
  // adivinar/ver su id (IDOR, mismo criterio de la Fase 1).
  await db.delete(vaultItems).where(and(eq(vaultItems.id, id), eq(vaultItems.customerId, user.id)));

  return NextResponse.json({ success: true });
}
