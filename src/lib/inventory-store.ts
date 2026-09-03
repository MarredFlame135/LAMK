// src/lib/inventory-store.ts
//
// Control de inventario local mientras el token de Shopify no tenga el scope
// write_products de la Admin API:
//  - "Ocultos del catálogo PWA": IDs de productos reales de Shopify que el
//    admin desactivó — se filtran en catalog-source.ts antes de mostrarse a
//    clientes, sin tocar ni borrar nada en Shopify (RF-3.2: "sin borrar su
//    historial contable").
//  - "Borradores": artículos nuevos capturados desde el admin (con imagen ya
//    procesada por el pipeline IA) en espera de publicarse en Shopify en
//    cuanto haya credenciales de escritura.
//
// Vivían en `data/hidden-products.json` y `data/product-drafts.json`; desde el
// 2026-09-02 están en Postgres — ver la cabecera de sales-store.ts.
//
// Ocultar un producto era el caso más grave de los cinco stores: al perderse
// el archivo, los productos ocultos volvían a aparecer solos en el catálogo
// público, sin ninguna señal de que había pasado.

import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { hiddenProducts, productDrafts } from '@/db/schema';

export interface ProductDraft {
  id: string;
  title: string;
  brand: string;
  category: 'SNEAKERS' | 'APPAREL' | 'ACCESSORIES' | 'COLLECTIBLES' | 'JEWELRY';
  price: number;
  sizeOptions: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  status: 'DRAFT';
}

export async function getHiddenProductIds(): Promise<string[]> {
  const rows = await getDb().select({ productId: hiddenProducts.productId }).from(hiddenProducts);
  return rows.map((r) => r.productId);
}

export async function setProductHidden(productId: string, hidden: boolean): Promise<string[]> {
  const db = getDb();
  if (hidden) {
    await db.insert(hiddenProducts).values({ productId }).onConflictDoNothing();
  } else {
    await db.delete(hiddenProducts).where(eq(hiddenProducts.productId, productId));
  }
  return getHiddenProductIds();
}

type DraftRow = typeof productDrafts.$inferSelect;

function toDraft(row: DraftRow): ProductDraft {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    category: row.category,
    price: Number(row.price),
    sizeOptions: row.sizeOptions,
    description: row.description,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    status: 'DRAFT',
  };
}

export async function getProductDrafts(): Promise<ProductDraft[]> {
  const rows = await getDb().select().from(productDrafts).orderBy(desc(productDrafts.createdAt));
  return rows.map(toDraft);
}

export async function addProductDraft(draft: Omit<ProductDraft, 'id' | 'createdAt' | 'status'>): Promise<ProductDraft> {
  const [row] = await getDb()
    .insert(productDrafts)
    .values({
      id: `DRAFT-${Date.now()}`,
      title: draft.title,
      brand: draft.brand,
      category: draft.category,
      price: draft.price.toFixed(2),
      sizeOptions: draft.sizeOptions,
      description: draft.description,
      imageUrl: draft.imageUrl,
    })
    .returning();
  return toDraft(row);
}

export async function deleteProductDraft(id: string): Promise<void> {
  await getDb().delete(productDrafts).where(eq(productDrafts.id, id));
}
