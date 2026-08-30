// src/app/api/vault/settings/notifications/route.ts
//
// Cambiar el opt-in de WhatsApp DESPUÉS del registro (brief B.4 — "debe
// poder desmarcarse después desde el perfil"). consent_log es un log de
// solo-inserción (nunca se actualiza una fila vieja) — la fila más
// reciente de cada customer ES la preferencia vigente, mismo criterio que
// ya usa el registro y el login social.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/db';
import { consentLog } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { marketingOptIn } = await request.json();
  if (typeof marketingOptIn !== 'boolean') {
    return NextResponse.json({ error: 'marketingOptIn debe ser true/false.' }, { status: 400 });
  }

  await getDb().insert(consentLog).values({
    id: randomUUID(),
    customerId: user.id,
    privacyVersion: PRIVACY_NOTICE_VERSION,
    marketingOptIn,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
