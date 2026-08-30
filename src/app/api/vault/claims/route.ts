// src/app/api/vault/claims/route.ts
//
// Reclamos de compra manual (ver lib/vault-claims.ts para el porqué). GET
// trae los reclamos del cliente (cualquier estado, para que vea en qué va
// cada uno). POST registra uno nuevo — queda 'pending' hasta que un admin
// lo revise en /api/admin/vault-claims.

import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/social/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClaimsForCustomer, submitPurchaseClaim, isImageDataUrlTooLarge } from '@/lib/vault-claims';

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const claims = await getClaimsForCustomer(user.id);
  return NextResponse.json({ claims });
}

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  // Fix (auditoría de seguridad 2026-08-30): sin esto, una cuenta real
  // podía inundar la cola de aprobación del admin con registros sin
  // límite — la foto ya tenía tope de tamaño, pero no había tope de
  // cuántos registros por hora. Mismo patrón que el resto de mutaciones
  // sensibles de esta auditoría: por cliente, no por IP (ya está
  // autenticado, es su propia cuenta la que se limita).
  const limitKey = `vault-claim:${user.id}`;
  const { allowed, retryAfterMs } = checkRateLimit(limitKey, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiados registros enviados. Intenta de nuevo en ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const { productTitle, imageUrl, note } = await request.json();

  if (typeof productTitle !== 'string' || !productTitle.trim() || productTitle.length > 200) {
    return NextResponse.json({ error: 'Falta el modelo exacto del producto (máximo 200 caracteres).' }, { status: 400 });
  }
  if (typeof note === 'string' && note.length > 500) {
    return NextResponse.json({ error: 'La nota es demasiado larga (máximo 500 caracteres).' }, { status: 400 });
  }
  // Solo formatos raster reales — nunca 'data:image/svg+xml', que puede
  // llevar <script> embebido. No hay ningún caso de uso legítimo de un SVG
  // para una foto de producto, así que se rechaza por completo en vez de
  // intentar sanearlo.
  if (typeof imageUrl !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(imageUrl)) {
    return NextResponse.json({ error: 'Falta una foto válida del producto (PNG, JPG, WEBP o GIF).' }, { status: 400 });
  }
  if (isImageDataUrlTooLarge(imageUrl)) {
    return NextResponse.json({ error: 'La foto es demasiado grande. Usa una imagen de menos de 2MB.' }, { status: 400 });
  }

  const claim = await submitPurchaseClaim({
    customerId: user.id,
    customerEmail: user.email,
    customerName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    productTitle: productTitle.trim(),
    imageUrl,
    note: typeof note === 'string' ? note.trim() : undefined,
  });

  return NextResponse.json({ claim });
}
