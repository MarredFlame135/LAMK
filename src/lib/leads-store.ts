// src/lib/leads-store.ts
//
// Peticiones de demanda capturadas por TENISIN. Vivían en `data/leads.json`;
// desde el 2026-09-02 están en Postgres (tabla `product_demand_requests`) por
// el mismo motivo que las ventas en piso — ver la cabecera de sales-store.ts.
//
// Estas peticiones las genera el CLIENTE en su navegador y el admin las
// necesita ver desde el suyo, así que nunca pudieron vivir en localStorage;
// ahora tampoco dependen de que la misma instancia serverless siga viva.

import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { productDemandRequests } from '@/db/schema';
import { DemandRequest } from '@/types/admin';

type Row = typeof productDemandRequests.$inferSelect;

function toLead(row: Row): DemandRequest {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.productTitle,
    requestedSize: row.requestedSize,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    createdAt: row.createdAt.toISOString(),
    notified: row.notified,
    rawQuery: row.rawQuery,
    wasMatched: row.wasMatched,
    source: 'TENISIN_CHAT',
  };
}

export async function getLeads(): Promise<DemandRequest[]> {
  const rows = await getDb().select().from(productDemandRequests).orderBy(desc(productDemandRequests.createdAt));
  return rows.map(toLead);
}

export async function addLead(input: {
  productId: string;
  productTitle: string;
  requestedSize?: string;
  customerPhone?: string;
  customerEmail?: string;
  rawQuery: string;
  wasMatched: boolean;
}): Promise<DemandRequest> {
  const [row] = await getDb()
    .insert(productDemandRequests)
    .values({
      id: `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: input.productId,
      productTitle: input.productTitle,
      requestedSize: input.requestedSize || 'N/A',
      customerPhone: input.customerPhone || '',
      customerEmail: input.customerEmail || '',
      rawQuery: input.rawQuery,
      wasMatched: input.wasMatched,
    })
    .returning();
  return toLead(row);
}

export async function updateLead(id: string, patch: Partial<DemandRequest>): Promise<void> {
  // Solo se dejan actualizar los campos que el panel realmente edita. Antes
  // era un spread del patch completo sobre el objeto en memoria, así que
  // cualquier campo que llegara en el body del request se escribía tal cual.
  const fields: Partial<typeof productDemandRequests.$inferInsert> = {};
  if (patch.notified !== undefined) fields.notified = patch.notified;
  if (patch.customerPhone !== undefined) fields.customerPhone = patch.customerPhone;
  if (patch.customerEmail !== undefined) fields.customerEmail = patch.customerEmail;
  if (patch.requestedSize !== undefined) fields.requestedSize = patch.requestedSize;
  if (Object.keys(fields).length === 0) return;

  await getDb().update(productDemandRequests).set(fields).where(eq(productDemandRequests.id, id));
}

export async function deleteLead(id: string): Promise<void> {
  await getDb().delete(productDemandRequests).where(eq(productDemandRequests.id, id));
}
