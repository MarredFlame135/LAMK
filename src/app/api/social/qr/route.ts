// src/app/api/social/qr/route.ts
//
// Fase 2 sección 4: una cuenta de menor no tiene botón para generar QR —
// no es que el QR generado sea más restrictivo, es que la función no está
// disponible. Se aplica aquí server-side (401/403), no solo ocultando el
// botón en la UI.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';
import { isMinor } from '@/lib/social/age';
import { generateQrToken, revokeAllQrTokens, getActiveQrTokens } from '@/lib/social/qr';

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const tokens = await getActiveQrTokens(user.id);
  return NextResponse.json({ tokens: tokens.map((t) => ({ token: t.token, expiresAt: t.expiresAt, scanCount: t.scanCount, createdAt: t.createdAt })) });
}

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const db = getDb();
  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1);
  if (isMinor(profile?.dateOfBirth ?? null)) {
    return NextResponse.json({ error: 'Esta función no está disponible para cuentas de menores de edad.' }, { status: 403 });
  }
  if (!profile || profile.profileVisibility === 'private') {
    return NextResponse.json({ error: 'Activa tu perfil (que no sea privado) antes de generar un QR.' }, { status: 400 });
  }

  const { longDuration } = await request.json().catch(() => ({ longDuration: false }));
  const { token, expiresAt } = await generateQrToken(user.id, Boolean(longDuration));

  return NextResponse.json({ token, expiresAt });
}

// Revoca TODOS los QR activos — "revocar mi QR" es una sola acción, sin
// tener que identificar cuál token específico.
export async function DELETE(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const revoked = await revokeAllQrTokens(user.id);
  return NextResponse.json({ success: true, revoked });
}
