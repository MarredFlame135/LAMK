// src/app/api/cron/process-account-deletions/route.ts
//
// Procesa las solicitudes de borrado cuya ventana de 14 días ya pasó (ver
// lib/account-deletion.ts). Protegido por CRON_SECRET — mismo patrón que
// recomienda Vercel para sus Cron Jobs (header Authorization: Bearer
// <secret>, nunca una ruta pública sin más).
//
// NO hay un cron configurado en vercel.json todavía — Dante tiene que
// agregarlo (Vercel → Project → Cron Jobs, o un `crons` en vercel.json
// apuntando aquí, 1 vez al día es de sobra) después de probar esta ruta
// a mano con una cuenta desechable. Borrar de verdad es irreversible, no
// se activó nada en automático sin esa prueba explícita.

import { NextRequest, NextResponse } from 'next/server';
import { processDueDeletions } from '@/lib/account-deletion';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const results = await processDueDeletions();
  return NextResponse.json({ processed: results.length, results });
}
