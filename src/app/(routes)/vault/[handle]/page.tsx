// src/app/(routes)/vault/[handle]/page.tsx
//
// URL pública normal de la bóveda de un coleccionista — respeta la
// visibilidad configurada (público/solo seguidores/privado) según la
// relación real con quien visita. Distinta de /vault/pass/[token] (lo que
// abre un QR físico, que SIEMPRE ve la versión más conservadora sin
// importar la visibilidad — ver profile-view.ts).
//
// Nota de ruta: Next.js reserva carpetas que EMPIEZAN con "@" para rutas
// paralelas — no se puede crear literalmente `@[handle]/`. Esta carpeta
// se llama `[handle]` a secas; la URL real `/vault/@usuario` funciona
// igual porque el "@" vive en el VALOR capturado, no en el nombre de la
// carpeta — se limpia abajo con replace(/^@/, '').

import React from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { getProfileView } from '@/lib/social/profile-view';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { deriveCollectorSerial } from '@/lib/utils';
import { getReactionSummaries } from '@/lib/vault-reactions';
import { PublicVaultReveal } from '@/components/vault/PublicVaultReveal';
import { PublicVaultContent } from '@/components/vault/PublicVaultContent';

export const revalidate = 60; // Fase C.5: la bóveda pública puede volverse viral desde un escaneo en evento

interface PageProps {
  params: { handle: string };
}

export default async function PublicVaultPage({ params }: PageProps) {
  const handle = params.handle.replace(/^@/, '').toLowerCase();
  const db = getDb();

  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.username, handle)).limit(1);
  if (!profile) notFound();

  const token = cookies().get('lamk_customer_token')?.value;
  const viewer = token ? await getCustomerProfile(token) : null;

  const view = await getProfileView(profile.customerId, viewer?.id ?? null);
  if (!view) notFound(); // privado o bloqueado — mismo 404 que "no existe", no delata nada

  let tier: string | undefined;
  if (view.canShowTier) {
    try {
      const customers = await getStoreCustomersWithXp(500);
      tier = customers.find((c) => c.id === profile.customerId)?.tier;
    } catch {
      // Admin API no configurada — sin tier, no rompe la página
    }
  }

  // Totales de me gusta / no me gusta, más la reacción propia del visitante
  // (solo la suya: quién más reaccionó no sale nunca de la base).
  const reactions = Object.fromEntries(
    await getReactionSummaries(view.vault.map((v) => v.id), viewer?.id ?? null)
  );

  const serial = deriveCollectorSerial(profile.customerId).replace('LK-C-', '');

  return (
    <PublicVaultReveal
      data={{ handle, serial, tier, followerCount: view.followerCount, vault: view.vault }}
    >
      <PublicVaultContent
        handle={handle}
        serial={serial}
        tier={tier}
        bio={view.bio}
        followerCount={view.followerCount}
        vault={view.vault}
        reactions={reactions}
        // Se puede reaccionar con sesión iniciada y sin ser el dueño. El
        // servidor lo revalida igual (api/vault/reactions): esto solo evita
        // enseñar un botón que iba a rebotar.
        canReact={Boolean(viewer) && !view.isOwner}
        isOwner={view.isOwner}
        viewerLoggedIn={Boolean(viewer)}
      />
    </PublicVaultReveal>
  );
}
