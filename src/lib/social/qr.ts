// src/lib/social/qr.ts
//
// Fase 2 de la auditoría, sección 3: el QR es un token temporal y
// revocable de verdad, distinto de la URL pública del perfil — antes,
// sin base de datos, esto se habría tenido que resolver con un ticket
// firmado sin estado (como el OTP de la Fase 1). Ahora sí hay una base de
// datos real, así que "revocar" es una fila que de verdad se actualiza —
// más simple y más honesto que fingir revocación con un ticket que no se
// puede invalidar de verdad sin un store en algún lado.

import { randomBytes } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { qrTokens } from '@/db/schema';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas, ver Fase 2 sección 3

export async function generateQrToken(customerId: string, longDuration = false): Promise<{ token: string; expiresAt: Date | null }> {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = longDuration ? null : new Date(Date.now() + DEFAULT_TTL_MS);

  const db = getDb();
  await db.insert(qrTokens).values({ token, customerId, expiresAt });

  return { token, expiresAt };
}

export interface QrScanResult {
  valid: boolean;
  customerId?: string;
}

// Escanear no solo verifica — también cuenta, para que el dueño tenga una
// señal real de "esto se ha usado X veces" (Fase 2 sección 3).
export async function scanQrToken(token: string): Promise<QrScanResult> {
  const db = getDb();
  const [row] = await db.select().from(qrTokens).where(eq(qrTokens.token, token)).limit(1);

  if (!row) return { valid: false };
  if (row.revokedAt) return { valid: false };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { valid: false };

  await db.update(qrTokens).set({ scanCount: row.scanCount + 1 }).where(eq(qrTokens.token, token));

  return { valid: true, customerId: row.customerId };
}

// Revoca TODOS los tokens activos del dueño (no solo uno) — "revocar mi QR"
// es la acción que espera el dueño, no "revocar un token específico que
// tendría que identificar a mano".
export async function revokeAllQrTokens(customerId: string): Promise<number> {
  const db = getDb();
  const result = await db
    .update(qrTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(qrTokens.customerId, customerId), isNull(qrTokens.revokedAt)));
  return (result as unknown as { rowCount?: number }).rowCount ?? 0;
}

export async function getActiveQrTokens(customerId: string) {
  const db = getDb();
  return db.select().from(qrTokens).where(and(eq(qrTokens.customerId, customerId), isNull(qrTokens.revokedAt)));
}
