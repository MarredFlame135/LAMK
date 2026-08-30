// src/app/api/vault/settings/delete-account/route.ts
//
// GET: estado (¿hay una solicitud pendiente y para cuándo?).
// POST: solicita el borrado — exige escribir el correo exacto como
// confirmación (mismo patrón que "escribe DELETE para confirmar" de
// otras apps), no un solo clic. Programa 14 días, no borra nada todavía.
// DELETE: cancela una solicitud pendiente — el usuario se arrepintió.

import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/social/auth';
import { requestAccountDeletion, cancelAccountDeletion, getPendingDeletion } from '@/lib/account-deletion';

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const pending = await getPendingDeletion(user.id);
  return NextResponse.json({ pending: pending ? { scheduledFor: pending.scheduledFor.toISOString() } : null });
}

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { confirmEmail } = await request.json();
  if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'El correo no coincide con el de tu cuenta.' }, { status: 400 });
  }

  const scheduledFor = await requestAccountDeletion(user.id);
  return NextResponse.json({ scheduledFor: scheduledFor.toISOString() });
}

export async function DELETE(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  await cancelAccountDeletion(user.id);
  return NextResponse.json({ ok: true });
}
