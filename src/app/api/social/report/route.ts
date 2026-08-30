// src/app/api/social/report/route.ts
//
// Fase 2 sección 4: reportar debe ser accesible directo desde cualquier
// perfil, sin importar si la cuenta reportada es de un menor — es una
// función general, no exclusiva de proteger a menores, pero los cubre.
// No se autoresuelve nada aquí, solo se registra para revisión manual de
// un admin (panel fuera de alcance de esta ronda).

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { reports, socialProfiles } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  // Fix (auditoría de seguridad 2026-08-30): sin límite, una cuenta podía
  // usar "reportar" como herramienta de hostigamiento — mandar decenas de
  // reportes contra el mismo perfil (o varios) sin costo.
  const limitKey = `report:${user.id}`;
  const { allowed, retryAfterMs } = checkRateLimit(limitKey, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiados reportes enviados. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const { targetUsername, reason } = await request.json();
  if (!reason || String(reason).trim().length === 0) {
    return NextResponse.json({ error: 'Describe brevemente el motivo.' }, { status: 400 });
  }

  const db = getDb();
  const [target] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, String(targetUsername || '').toLowerCase())).limit(1);
  if (!target) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await db.insert(reports).values({
    id: randomUUID(),
    reporterId: user.id,
    reportedId: target.customerId,
    reason: String(reason).slice(0, 500),
  });

  return NextResponse.json({ success: true });
}
