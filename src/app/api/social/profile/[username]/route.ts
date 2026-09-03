// src/app/api/social/profile/[username]/route.ts
//
// Vista pública de un perfil por username — pasa TODO por
// lib/social/profile-view.ts, nunca arma la respuesta a mano aquí (ver el
// porqué en ese archivo).

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { getProfileView } from '@/lib/social/profile-view';
import { requireCustomer } from '@/lib/social/auth';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  // Rate limiting (auditoría 2026-09-02). Este endpoint responde por
  // username, así que sin tope es una máquina de ENUMERAR handles: se le
  // disparan miles de nombres y los 404 contra los 200 dibujan la lista de
  // quién tiene cuenta en LAMK. El propio archivo ya cuidaba no delatar la
  // diferencia entre "no existe" y "es privado" (mismo 404 para ambos) — el
  // límite es la otra mitad de esa misma protección: sin él, basta con
  // preguntar suficientes veces.
  //
  // 60 en 5 minutos: nadie navegando perfiles a mano se acerca; un script
  // que barre un diccionario se topa con el muro de inmediato.
  const limitKey = `social-profile:${getClientIp(request)}`;
  const { allowed, retryAfterMs } = checkRateLimit(limitKey, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiadas consultas. Espera ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const username = params.username.trim().toLowerCase();
  const db = getDb();

  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, username)).limit(1);
  if (!profile) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const viewer = await requireCustomer(request);
  const view = await getProfileView(profile.customerId, viewer?.id ?? null);
  if (!view) return NextResponse.json({ error: 'No encontrado' }, { status: 404 }); // mismo 404 que "no existe" — no delatar que el perfil existe pero es privado

  let tier: string | undefined;
  if (view.canShowTier) {
    try {
      const customers = await getStoreCustomersWithXp(500);
      tier = customers.find((c) => c.id === profile.customerId)?.tier;
    } catch {
      // Admin API no configurada — sin tier, no rompe la respuesta.
    }
  }

  return NextResponse.json({ ...view, tier });
}
