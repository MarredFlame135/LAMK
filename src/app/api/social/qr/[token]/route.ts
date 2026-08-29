// src/app/api/social/qr/[token]/route.ts
//
// Escanear un QR — público, sin sesión requerida (así funciona un QR físico
// escaneado en una tienda/evento). Siempre pasa `isQrScan: true` a
// getProfileView(), que aplica el tope de "nunca más que la vista de
// seguidor" sin importar la visibilidad configurada (Fase 2 sección 3).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { scanQrToken } from '@/lib/social/qr';
import { getProfileView } from '@/lib/social/profile-view';

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const result = await scanQrToken(params.token);
  if (!result.valid || !result.customerId) {
    return NextResponse.json({ error: 'Este código ya no es válido.' }, { status: 404 });
  }

  const db = getDb();
  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, result.customerId)).limit(1);
  if (!profile) return NextResponse.json({ error: 'Este código ya no es válido.' }, { status: 404 });

  const view = await getProfileView(result.customerId, null, { isQrScan: true });
  if (!view) return NextResponse.json({ error: 'Este código ya no es válido.' }, { status: 404 });

  return NextResponse.json(view);
}
