// src/app/api/vault/reactions/route.ts
//
// Me gusta / no me gusta sobre una pieza de una bóveda pública.
//
// Todas las reglas de quién puede reaccionar viven aquí, y son cuatro:
//
//  1. **Sesión obligatoria.** Sin cuenta no hay reacción. Es la diferencia
//     entre un contador y una máquina de brigading.
//  2. **La pieza tiene que existir.** Se resuelve su dueño contra la base; sin
//     esto, cualquiera puede POSTear ids inventados y hacer crecer la tabla sin
//     tope alguno.
//  3. **La bóveda tiene que ser visible para quien reacciona.** Se reusa
//     getProfileView() —la misma función que decide qué se ve en
//     /vault/[handle]— en vez de escribir aquí una segunda versión de las
//     reglas de privacidad. Si no puedes VER la pieza, no puedes opinar sobre
//     ella; eso cubre de un golpe perfiles privados, bloqueos y menores.
//  4. **Nadie reacciona a lo suyo.** No aporta nada y ensucia el contador.
//
// Y una que no está aquí porque está en lib/vault-reactions.ts: hacia afuera
// solo salen totales, nunca quién reaccionó.

import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/social/auth';
import { getProfileView } from '@/lib/social/profile-view';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getVaultItemOwner, setReaction, getReactionSummaries, isReactionValue } from '@/lib/vault-reactions';

export async function POST(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión para reaccionar.' }, { status: 401 });
  }

  // Por cuenta, no por IP: la acción ya exige sesión, así que el límite tiene
  // que atar a la identidad y no a la red (una casa entera comparte IP).
  const { allowed, retryAfterMs } = checkRateLimit(`reaction:${user.id}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Demasiadas reacciones seguidas. Espera ${Math.ceil(retryAfterMs / 60000)} minuto(s).` },
      { status: 429 }
    );
  }

  const { vaultItemId, value } = await request.json();

  if (typeof vaultItemId !== 'string' || !vaultItemId) {
    return NextResponse.json({ error: 'Falta la pieza.' }, { status: 400 });
  }
  if (!isReactionValue(value)) {
    return NextResponse.json({ error: 'Reacción inválida.' }, { status: 400 });
  }

  const ownerId = await getVaultItemOwner(vaultItemId);
  // Mismo 404 para "no existe" y "no puedes verla", igual que en el resto del
  // módulo social: la respuesta no debe delatar que la pieza existe.
  if (!ownerId) {
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  }
  if (ownerId === user.id) {
    return NextResponse.json({ error: 'No puedes reaccionar a tus propias piezas.' }, { status: 403 });
  }

  const view = await getProfileView(ownerId, user.id);
  if (!view || !view.vault.some((item) => item.id === vaultItemId)) {
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  }

  const mine = await setReaction(vaultItemId, user.id, value);
  const summaries = await getReactionSummaries([vaultItemId], user.id);

  return NextResponse.json({ ...summaries.get(vaultItemId), mine });
}
