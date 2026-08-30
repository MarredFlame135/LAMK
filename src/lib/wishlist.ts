// src/lib/wishlist.ts
//
// Most Wanted (Fase B, brief B.3 punto 5). Server-only — nunca se llama
// desde un componente de cliente directo, siempre vía las rutas de
// api/wishlist/*.

import { randomUUID } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { wishlistItems } from '@/db/schema';
import { recordEvent } from './hype';
import { getCatalogLive } from './catalog-source';
import { Product } from '@/types/product';

export async function addToWishlist(customerId: string, productId: string): Promise<void> {
  await getDb()
    .insert(wishlistItems)
    .values({ id: randomUUID(), customerId, productId })
    .onConflictDoNothing({ target: [wishlistItems.customerId, wishlistItems.productId] });

  // Señal real para el Índice ponderado (hallazgo #2, Fase A) — el término
  // de wishlist estaba reservado en 0 porque Most Wanted no existía; ahora
  // sí, ver computeHypeIndex en hype.ts.
  await recordEvent(productId, 'wishlist');
}

export async function removeFromWishlist(customerId: string, productId: string): Promise<void> {
  await getDb()
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)));
}

export async function isInWishlist(customerId: string, productId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))
    .limit(1);
  return Boolean(row);
}

export async function getWishlistProductIds(customerId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ productId: wishlistItems.productId, createdAt: wishlistItems.createdAt })
    .from(wishlistItems)
    .where(eq(wishlistItems.customerId, customerId))
    .orderBy(sql`${wishlistItems.createdAt} desc`);
  return rows.map((r) => r.productId);
}

// Wishlist ya hidratada con datos reales de producto (imagen, precio,
// stock) — usada tanto por GET /api/wishlist como por /vault/page.tsx
// directo (server-side, sin round-trip HTTP extra a su propia API).
export async function getWishlistProducts(customerId: string): Promise<Product[]> {
  const productIds = await getWishlistProductIds(customerId);
  if (productIds.length === 0) return [];

  const { products } = await getCatalogLive();
  const byId = new Map(products.map((p) => [p.id, p]));
  return productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}
