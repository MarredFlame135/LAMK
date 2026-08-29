// src/app/api/social/profile/route.ts
//
// Crea/actualiza el perfil social propio. Fix de mass-assignment (mismo
// criterio que la Fase 1): un menor NO puede subir su perfil a
// público/seguidores mandando ese valor directo en el body — se fuerza a
// 'private' aquí, server-side, sin importar lo que llegue en la request.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';
import { isMinor } from '@/lib/social/age';

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const db = getDb();
  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1);
  return NextResponse.json({ profile: profile ?? null });
}

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  const [existing] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1);

  // La fecha de nacimiento, una vez declarada, no se puede volver a mandar
  // distinta desde este endpoint — evita el caso obvio de "me declaro
  // adulto, subo mi perfil a público, y luego 'me corrijo' de vuelta a
  // menor para que nadie note el hueco". Se puede corregir, pero requeriría
  // un flujo de soporte aparte, no un POST silencioso.
  const dateOfBirth = existing?.dateOfBirth ?? (typeof body.dateOfBirth === 'string' ? body.dateOfBirth : null);
  const minor = isMinor(dateOfBirth);

  if (body.username !== undefined) {
    const username = String(body.username).trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ error: 'El usuario debe tener 3-24 caracteres: minúsculas, números o guion bajo.' }, { status: 400 });
    }
    const [taken] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, username)).limit(1);
    if (taken && taken.customerId !== user.id) {
      return NextResponse.json({ error: 'Ese usuario ya está en uso.' }, { status: 409 });
    }
  }

  const values = {
    customerId: user.id,
    username: body.username !== undefined ? String(body.username).trim().toLowerCase() : existing?.username ?? null,
    dateOfBirth,
    // Fix (mass-assignment): sin importar lo que mande el body, un menor
    // nunca queda en 'public'/'followers'.
    profileVisibility: minor ? 'private' : (['public', 'followers', 'private'].includes(body.profileVisibility) ? body.profileVisibility : existing?.profileVisibility ?? 'private'),
    vaultVisibility: minor ? 'private' : (['public', 'followers', 'private'].includes(body.vaultVisibility) ? body.vaultVisibility : existing?.vaultVisibility ?? 'private'),
    showTier: typeof body.showTier === 'boolean' ? body.showTier : existing?.showTier ?? false,
    showFollowLists: typeof body.showFollowLists === 'boolean' ? body.showFollowLists : existing?.showFollowLists ?? false,
    showFollowerCount: typeof body.showFollowerCount === 'boolean' ? body.showFollowerCount : existing?.showFollowerCount ?? false,
    bio: typeof body.bio === 'string' ? body.bio.slice(0, 280) : existing?.bio ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(socialProfiles)
    .values(values)
    .onConflictDoUpdate({ target: socialProfiles.customerId, set: values });

  return NextResponse.json({ success: true, isMinor: minor });
}
