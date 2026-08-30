// src/lib/account-deletion.ts
//
// Borrado de cuenta con ventana de arrepentimiento de 14 días (brief B.4 +
// docs/audit/FASE-2-PRIVACIDAD.md sección 7). Ver comentario largo en
// db/schema.ts (accountDeletionRequests) para el límite real de Shopify
// que hace que esto NO siempre borre el customer de Shopify.

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  accountDeletionRequests,
  socialProfiles,
  follows,
  blocks,
  reports,
  qrTokens,
  vaultItems,
  wishlistItems,
  linkedAccounts,
} from '@/db/schema';
import { deleteShopifyCustomer } from '@/lib/shopify/admin';

const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export async function requestAccountDeletion(customerId: string): Promise<Date> {
  const scheduledFor = new Date(Date.now() + GRACE_PERIOD_MS);
  await getDb()
    .insert(accountDeletionRequests)
    .values({ customerId, scheduledFor })
    .onConflictDoUpdate({ target: accountDeletionRequests.customerId, set: { scheduledFor, requestedAt: new Date() } });
  return scheduledFor;
}

export async function cancelAccountDeletion(customerId: string): Promise<void> {
  await getDb().delete(accountDeletionRequests).where(eq(accountDeletionRequests.customerId, customerId));
}

export async function getPendingDeletion(customerId: string): Promise<{ scheduledFor: Date } | null> {
  const db = getDb();
  const [row] = await db
    .select({ scheduledFor: accountDeletionRequests.scheduledFor })
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.customerId, customerId))
    .limit(1);
  return row ?? null;
}

// Borra TODO lo propio de este proyecto para ese customerId — nunca falla
// a medias en silencio: cada tabla se borra independiente, un error en
// una no debe dejar huérfanas las demás sin intentarlo. El registro de
// Shopify se intenta borrar aparte (ver deleteShopifyCustomer) — si tiene
// pedidos, Shopify lo rechaza y el caller (processDueDeletions) decide
// qué hacer con eso.
async function purgeOwnData(customerId: string): Promise<void> {
  const db = getDb();
  const tables = [socialProfiles, vaultItems, wishlistItems, linkedAccounts, qrTokens];
  for (const table of tables) {
    try {
      await db.delete(table).where(eq((table as any).customerId, customerId));
    } catch (err) {
      console.error(`Error borrando ${table} para ${customerId} (borrado de cuenta):`, err);
    }
  }
  // follows/blocks/reports tienen columnas de relación en ambas direcciones
  try {
    await db.delete(follows).where(eq(follows.followerId, customerId));
    await db.delete(follows).where(eq(follows.followeeId, customerId));
  } catch (err) {
    console.error(`Error borrando follows para ${customerId}:`, err);
  }
  try {
    await db.delete(blocks).where(eq(blocks.blockerId, customerId));
    await db.delete(blocks).where(eq(blocks.blockedId, customerId));
  } catch (err) {
    console.error(`Error borrando blocks para ${customerId}:`, err);
  }
  try {
    await db.delete(reports).where(eq(reports.reporterId, customerId));
    await db.delete(reports).where(eq(reports.reportedId, customerId));
  } catch (err) {
    console.error(`Error borrando reports para ${customerId}:`, err);
  }
  // consent_log NO se borra a propósito — es evidencia de que hubo
  // consentimiento y su retiro, útil justo en un reclamo posterior; borrar
  // el propio historial de consentimiento sería contraproducente.
}

export interface DeletionResult {
  customerId: string;
  shopifyDeleted: boolean;
  shopifyReason?: string;
}

// Llamado por el cron (api/cron/process-account-deletions) — procesa TODAS
// las solicitudes cuya ventana de 14 días ya pasó.
export async function processDueDeletions(): Promise<DeletionResult[]> {
  const db = getDb();
  const due = await db.select().from(accountDeletionRequests);
  const now = Date.now();
  const results: DeletionResult[] = [];

  for (const row of due) {
    if (row.scheduledFor.getTime() > now) continue;

    const shopifyResult = await deleteShopifyCustomer(row.customerId).catch((err) => {
      console.error(`Error al intentar borrar customer de Shopify ${row.customerId}:`, err);
      return { deleted: false, reason: 'error de red/API' };
    });

    await purgeOwnData(row.customerId);
    await db.delete(accountDeletionRequests).where(eq(accountDeletionRequests.customerId, row.customerId));

    results.push({ customerId: row.customerId, shopifyDeleted: shopifyResult.deleted, shopifyReason: shopifyResult.reason });
  }

  return results;
}
