// src/lib/reviews-store.ts
//
// Reseñas reales de clientes con compra verificada (On-Feet Review, RF-4.4).
// Vivían en `data/reviews.json`; desde el 2026-09-02 están en Postgres
// (tabla `verified_reviews`) — ver la cabecera de sales-store.ts para el
// motivo. Estas son las que alimentan SocialProofSection en la home: perder
// el archivo significaba que la sección de prueba social se apagaba sola sin
// que nadie se enterara.
//
// "Un cliente, una reseña" ya no depende de filtrar-y-reescribir el archivo
// completo: `customer_id` es UNIQUE en la tabla y el upsert lo garantiza.

import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { verifiedReviews } from '@/db/schema';

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  text: string;
  photoUrl?: string;
  createdAt: string;
  verifiedPurchase: true; // solo se crean reseñas de clientes con pedidos reales
}

type Row = typeof verifiedReviews.$inferSelect;

function toReview(row: Row): Review {
  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customerName,
    rating: row.rating,
    text: row.text,
    photoUrl: row.photoUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
    verifiedPurchase: true,
  };
}

export async function getReviews(): Promise<Review[]> {
  const rows = await getDb().select().from(verifiedReviews).orderBy(desc(verifiedReviews.createdAt));
  return rows.map(toReview);
}

export async function addReview(input: Omit<Review, 'id' | 'createdAt' | 'verifiedPurchase'>): Promise<Review> {
  const [row] = await getDb()
    .insert(verifiedReviews)
    .values({
      id: `REV-${Date.now()}`,
      customerId: input.customerId,
      customerName: input.customerName,
      rating: input.rating,
      text: input.text,
      photoUrl: input.photoUrl ?? null,
    })
    .onConflictDoUpdate({
      target: verifiedReviews.customerId,
      set: {
        customerName: input.customerName,
        rating: input.rating,
        text: input.text,
        photoUrl: input.photoUrl ?? null,
        createdAt: new Date(),
      },
    })
    .returning();
  return toReview(row);
}
