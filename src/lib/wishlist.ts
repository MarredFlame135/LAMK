// src/lib/wishlist.ts
//
// Most Wanted (Fase B, brief B.3 punto 5). Server-only — nunca se llama
// desde un componente de cliente directo, siempre vía las rutas de
// api/wishlist/*.

import { randomUUID } from 'crypto';
import { eq, and, sql, desc } from 'drizzle-orm';
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

// Fase D.5: "demanda insatisfecha desde Most Wanted" — cuántas personas
// distintas tienen cada producto en su wishlist, cruzado con el stock
// actual. La fila con más gente esperando un producto agotado/con poco
// stock es literalmente una orden de compra esperando a que alguien la
// lea (brief D.5) — el mismo dato ya sirve para esto y para el dashboard
// de inventario (Fase D.6) sin duplicar nada.
export interface UnmetDemandRow {
  productId: string;
  title: string;
  handle: string;
  imageUrl: string;
  stockRemaining: number;
  isSoldOut: boolean;
  wishlistCount: number;
}

export async function getUnmetDemand(limit = 20): Promise<UnmetDemandRow[]> {
  const db = getDb();
  const rows = await db
    .select({ productId: wishlistItems.productId, count: sql<number>`count(*)::int` })
    .from(wishlistItems)
    .groupBy(wishlistItems.productId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  if (rows.length === 0) return [];

  const { products } = await getCatalogLive();
  const byId = new Map(products.map((p) => [p.id, p]));

  return rows
    .map((r) => {
      const p = byId.get(r.productId);
      if (!p) return null; // producto ya no existe en catálogo — no se muestra una fila sin datos reales
      return {
        productId: r.productId,
        title: p.title,
        handle: p.handle,
        imageUrl: p.images[0] || '/placeholder-sneaker.svg',
        stockRemaining: p.hypeMeter.stockRemaining,
        isSoldOut: p.isSoldOut,
        wishlistCount: r.count,
      };
    })
    .filter((r): r is UnmetDemandRow => r !== null);
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
