// src/app/api/social/discover/route.ts
//
// Buscador de coleccionistas. La regla de privacidad completa está en
// lib/social/discover.ts: aquí solo se valida la entrada y se limita el abuso.

import { NextRequest, NextResponse } from 'next/server';
import { searchCollectors } from '@/lib/social/discover';
import { requireCustomer } from '@/lib/social/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Se permite buscar sin sesión (el directorio es de perfiles públicos), pero
  // con sesión el resultado además dice a quién ya sigues y respeta bloqueos.
  const viewer = await requireCustomer(request);

  // Por IP: esta ruta responde sin sesión, así que atarlo a la cuenta dejaría
  // fuera justo el caso que hay que limitar. 40 en 5 minutos es de sobra para
  // alguien escribiendo, y corta en seco a un script barriendo nombres.
  const { allowed, retryAfterMs } = checkRateLimit(`discover:${getClientIp(request)}`, 40, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiadas búsquedas. Espera ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 40);
  const collectors = await searchCollectors(q, viewer?.id ?? null);

  return NextResponse.json({ collectors, viewerLoggedIn: Boolean(viewer) });
}
