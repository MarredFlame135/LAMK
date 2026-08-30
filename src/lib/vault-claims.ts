// src/lib/vault-claims.ts
//
// Reclamos de compra manual para la Bóveda (pedido directo de Dante,
// 2026-08-30 — no es parte del brief "Prompt Maestro v4"). Ver el
// comentario largo en db/schema.ts (vaultPurchaseClaims) para el porqué
// completo: piezas sin pedido real detrás de Shopify no pueden entrar a
// `collection` como las demás — el cliente las declara, un admin las
// aprueba o rechaza a mano, nunca se auto-aprueban.

import { randomUUID } from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { vaultPurchaseClaims } from '@/db/schema';
import { CollectionItem } from '@/types/user';

export interface VaultPurchaseClaim {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  productTitle: string;
  imageUrl: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

// Límite del lado servidor sobre el tamaño de la foto (data URL en base64,
// ~33% más grande que el archivo original) — sin esto, un POST directo a
// la API (sin pasar por el input del formulario) podría meter una imagen
// arbitrariamente grande a la fila de Postgres. 2MB de archivo original
// es de sobra para una foto de producto razonable.
const MAX_IMAGE_DATA_URL_LENGTH = 2 * 1024 * 1024 * 1.4;

export function isImageDataUrlTooLarge(dataUrl: string): boolean {
  return dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH;
}

export async function submitPurchaseClaim(params: {
  customerId: string;
  customerEmail: string;
  customerName: string;
  productTitle: string;
  imageUrl: string;
  note?: string;
}): Promise<VaultPurchaseClaim> {
  const [row] = await getDb()
    .insert(vaultPurchaseClaims)
    .values({
      id: randomUUID(),
      customerId: params.customerId,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      productTitle: params.productTitle,
      imageUrl: params.imageUrl,
      note: params.note || null,
      status: 'pending',
    })
    .returning();
  return row as VaultPurchaseClaim;
}

// Todos los reclamos de un cliente (cualquier estado) — para que vea el
// estatus de lo que ha registrado, no solo lo ya aprobado.
export async function getClaimsForCustomer(customerId: string): Promise<VaultPurchaseClaim[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(vaultPurchaseClaims)
    .where(eq(vaultPurchaseClaims.customerId, customerId))
    .orderBy(desc(vaultPurchaseClaims.createdAt));
  return rows as VaultPurchaseClaim[];
}

// Reclamos aprobados de un cliente, ya en forma de CollectionItem — listo
// para fusionarse con `user.collection` en vault/page.tsx. Nunca se
// inventa un serial ni una rareza: sin pedido real detrás no se puede
// verificar ninguna de las dos, así que quedan honestamente vacías/COMMON
// (mismo criterio ya documentado en types/user.ts para piezas sin datos
// verificables) — la UI (CollectionCard) es quien marca visualmente que
// es una pieza verificada por un admin, no un pedido real.
export async function getApprovedClaimsAsCollectionItems(customerId: string): Promise<CollectionItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(vaultPurchaseClaims)
    .where(and(eq(vaultPurchaseClaims.customerId, customerId), eq(vaultPurchaseClaims.status, 'approved')))
    .orderBy(desc(vaultPurchaseClaims.reviewedAt));

  return rows.map((row) => ({
    id: `claim-${row.id}`,
    sneakerTitle: row.productTitle,
    sku: '',
    serialNumber: '',
    purchaseDate: '', // no verificable — no viene de un pedido real, no inventar una fecha
    imageUrl: row.imageUrl,
    category: '', // no verificable — mismo criterio que un producto que ya no existe en catálogo
    rarity: 'COMMON', // escasez no verificable sin pedido/catálogo real detrás
    source: 'manual',
  }));
}

// --- Lado admin ---

export async function getClaimsForAdmin(status?: 'pending' | 'approved' | 'rejected'): Promise<VaultPurchaseClaim[]> {
  const db = getDb();
  const rows = status
    ? await db.select().from(vaultPurchaseClaims).where(eq(vaultPurchaseClaims.status, status)).orderBy(desc(vaultPurchaseClaims.createdAt))
    : await db.select().from(vaultPurchaseClaims).orderBy(desc(vaultPurchaseClaims.createdAt));
  return rows as VaultPurchaseClaim[];
}

export async function reviewPurchaseClaim(id: string, status: 'approved' | 'rejected', reviewNote?: string): Promise<void> {
  await getDb()
    .update(vaultPurchaseClaims)
    .set({ status, reviewNote: reviewNote || null, reviewedAt: new Date() })
    .where(eq(vaultPurchaseClaims.id, id));
}
