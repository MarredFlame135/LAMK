// src/app/api/vault/rating/route.ts
//
// Calificar la colección completa de un coleccionista (1 a 5).
//
// Mismas barreras que las reacciones por pieza, y por el mismo motivo: la
// visibilidad se comprueba reusando getProfileView(), que es la función que ya
// decide qué se ve en /vault/[handle]. Si no puedes VER la colección, no puedes
// calificarla — eso cubre de un golpe perfiles privados, bloqueos y menores,
// sin escribir aquí una segunda copia de las reglas.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';
import { getProfileView } from '@/lib/social/profile-view';
import { getCollectionRating, rateCollection } from '@/lib/social/discover';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Inicia sesión para calificar.' }, { status: 401 });

  const { allowed, retryAfterMs } = checkRateLimit(`rating:${user.id}`, 30, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiadas calificaciones seguidas. Espera ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const { username, stars } = await request.json();

  if (typeof username !== 'string' || !username) {
    return NextResponse.json({ error: 'Falta el coleccionista.' }, { status: 400 });
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'La calificación va de 1 a 5.' }, { status: 400 });
  }

  const handle = username.replace(/^@/, '').trim().toLowerCase();
  const [profile] = await getDb()
    .select()
    .from(socialProfiles)
    .where(eq(socialProfiles.username, handle))
    .limit(1);

  // Mismo 404 para "no existe" y "no puedes verlo": la respuesta no delata.
  if (!profile) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  if (profile.customerId === user.id) {
    return NextResponse.json({ error: 'No puedes calificar tu propia colección.' }, { status: 403 });
  }

  const view = await getProfileView(profile.customerId, user.id);
  if (!view) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

  await rateCollection(profile.customerId, user.id, stars);
  const rating = await getCollectionRating(profile.customerId, user.id);

  return NextResponse.json(rating);
}
