// src/lib/vault-reactions.ts
//
// Me gusta / no me gusta sobre las piezas de una bóveda pública.
//
// Server-only: nunca se llama desde un componente de cliente directo, siempre
// vía api/vault/reactions. Mismo patrón que lib/wishlist.ts.
//
// Regla que atraviesa todo el archivo: **hacia afuera solo salen totales**.
// Ninguna función de aquí devuelve la lista de quién reaccionó, ni siquiera al
// dueño de la bóveda. Un "no me gusta" con nombre sobre las pertenencias de
// alguien es acoso con otro nombre; el número agregado no lo es. Lo único
// personal que se devuelve es la reacción de QUIEN PREGUNTA, y solo la suya.

import { and, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { vaultItemReactions, vaultItems } from '@/db/schema';
import { isReactionValue } from './vault-reactions-shared';
import type { ReactionValue, ReactionSummary } from './vault-reactions-shared';

// Los tipos, la guarda y la aritmética viven en vault-reactions-shared.ts —
// sin dependencias— para que el botón de me gusta (componente de cliente)
// pueda usarlos sin arrastrar el driver de Postgres al bundle del navegador.
export type { ReactionValue, ReactionSummary } from './vault-reactions-shared';
export { isReactionValue, applyReaction } from './vault-reactions-shared';

// Devuelve el dueño de una pieza, o null si no existe. Se usa para dos cosas
// distintas y ambas importan: comprobar que la pieza es real antes de escribir
// (si no, cualquiera puede sembrar filas con ids inventados y hacer crecer la
// tabla sin límite) y evitar que alguien se aplauda a sí mismo.
export async function getVaultItemOwner(vaultItemId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ customerId: vaultItems.customerId })
    .from(vaultItems)
    .where(eq(vaultItems.id, vaultItemId))
    .limit(1);
  return row?.customerId ?? null;
}

// Alternar: pulsar la misma reacción que ya tenías la QUITA. Es lo que espera
// cualquiera que haya usado un botón de "me gusta", y evita el estado sin
// salida de "ya no opino esto pero no puedo retirarlo".
export async function setReaction(
  vaultItemId: string,
  customerId: string,
  value: ReactionValue
): Promise<ReactionValue | null> {
  const db = getDb();

  const [existing] = await db
    .select({ value: vaultItemReactions.value })
    .from(vaultItemReactions)
    .where(and(eq(vaultItemReactions.vaultItemId, vaultItemId), eq(vaultItemReactions.customerId, customerId)))
    .limit(1);

  if (existing?.value === value) {
    await db
      .delete(vaultItemReactions)
      .where(and(eq(vaultItemReactions.vaultItemId, vaultItemId), eq(vaultItemReactions.customerId, customerId)));
    return null;
  }

  await db
    .insert(vaultItemReactions)
    .values({ vaultItemId, customerId, value })
    .onConflictDoUpdate({
      target: [vaultItemReactions.vaultItemId, vaultItemReactions.customerId],
      set: { value, createdAt: new Date() },
    });

  return value;
}

// Totales de varias piezas en UNA consulta. La bóveda pública muestra hasta
// decenas de piezas: pedir los totales pieza por pieza serían N consultas por
// carga de página.
export async function getReactionSummaries(
  vaultItemIds: string[],
  viewerCustomerId: string | null
): Promise<Map<string, ReactionSummary>> {
  const summaries = new Map<string, ReactionSummary>();
  if (vaultItemIds.length === 0) return summaries;

  for (const id of vaultItemIds) summaries.set(id, { likes: 0, dislikes: 0, mine: null });

  const db = getDb();

  const totals = await db
    .select({
      vaultItemId: vaultItemReactions.vaultItemId,
      likes: sql<number>`count(*) filter (where ${vaultItemReactions.value} = 1)::int`,
      dislikes: sql<number>`count(*) filter (where ${vaultItemReactions.value} = -1)::int`,
    })
    .from(vaultItemReactions)
    .where(inArray(vaultItemReactions.vaultItemId, vaultItemIds))
    .groupBy(vaultItemReactions.vaultItemId);

  for (const row of totals) {
    const entry = summaries.get(row.vaultItemId);
    if (entry) {
      entry.likes = row.likes;
      entry.dislikes = row.dislikes;
    }
  }

  if (viewerCustomerId) {
    const mine = await db
      .select({ vaultItemId: vaultItemReactions.vaultItemId, value: vaultItemReactions.value })
      .from(vaultItemReactions)
      .where(
        and(
          inArray(vaultItemReactions.vaultItemId, vaultItemIds),
          eq(vaultItemReactions.customerId, viewerCustomerId)
        )
      );
    for (const row of mine) {
      const entry = summaries.get(row.vaultItemId);
      if (entry && isReactionValue(row.value)) entry.mine = row.value;
    }
  }

  return summaries;
}
