// src/app/(routes)/vault/pass/[token]/page.tsx
//
// A donde apunta la URL codificada en el QR físico (ver /vault/pass). Un
// desconocido escaneando en persona es el caso de mayor riesgo del brief
// (Fase 2 sección 3) — por eso SIEMPRE ve la versión más conservadora del
// perfil (isQrScan: true en getProfileView), sin importar que el dueño
// tenga la visibilidad en "público". El token es de un solo uso repetible
// pero revocable — nunca la URL directa del perfil (revocar significa algo
// de verdad, ver lib/social/qr.ts).

import React from 'react';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { scanQrToken } from '@/lib/social/qr';
import { getProfileView } from '@/lib/social/profile-view';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { deriveCollectorSerial } from '@/lib/utils';
import { getReactionSummaries } from '@/lib/vault-reactions';
import { getCollectionRating } from '@/lib/social/discover';
import { PublicVaultReveal } from '@/components/vault/PublicVaultReveal';
import { PublicVaultContent } from '@/components/vault/PublicVaultContent';

// Nunca cacheado — escanear cuenta de verdad cada vez (scanCount, ver
// qr.ts) y un token puede revocarse en cualquier momento.
export const dynamic = 'force-dynamic';

export default async function PassScanPage({ params }: { params: { token: string } }) {
  const result = await scanQrToken(params.token);
  if (!result.valid || !result.customerId) notFound();

  const db = getDb();
  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, result.customerId)).limit(1);
  if (!profile) notFound();

  const view = await getProfileView(result.customerId, null, { isQrScan: true });
  if (!view) notFound();

  let tier: string | undefined;
  if (view.canShowTier) {
    try {
      const customers = await getStoreCustomersWithXp(500);
      tier = customers.find((c) => c.id === result.customerId)?.tier;
    } catch {
      // Admin API no configurada
    }
  }

  // Los totales se muestran, pero desde un escaneo NO se puede reaccionar:
  // esta pantalla trata a quien llega como un desconocido por diseño (arriba,
  // isQrScan), y dejarlo opinar contradiría esa misma postura.
  const reactions = Object.fromEntries(await getReactionSummaries(view.vault.map((v) => v.id), null));

  // Igual que las reacciones: desde un escaneo se VE la calificación pero no
  // se puede dar. Esta pantalla trata a quien llega como un desconocido por
  // diseño, y dejarlo votar contradiría esa postura.
  const rating = await getCollectionRating(result.customerId, null);

  const serial = deriveCollectorSerial(result.customerId).replace('LK-C-', '');
  const handle = profile.username || 'coleccionista';

  return (
    <PublicVaultReveal data={{ handle, serial, tier, followerCount: view.followerCount, vault: view.vault }}>
      <PublicVaultContent
        handle={handle}
        serial={serial}
        tier={tier}
        bio={view.bio}
        followerCount={view.followerCount}
        vault={view.vault}
        reactions={reactions}
        canReact={false}
        rating={rating}
        canRate={false}
        isOwner={false} // un escaneo siempre es de un desconocido, por definición
        viewerLoggedIn={false} // no hay sesión de por medio en un escaneo anónimo
      />
    </PublicVaultReveal>
  );
}
