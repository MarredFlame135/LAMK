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

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
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
