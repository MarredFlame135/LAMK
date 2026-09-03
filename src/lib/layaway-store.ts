// src/lib/layaway-store.ts
//
// Solicitudes de apartado ("layaway") capturadas por TENISIN cuando un
// cliente quiere reservar un par/prenda pagando un % por adelantado.
// Vivían en `data/layaway.json`; desde el 2026-09-02 están en Postgres
// (tabla `layaway_reservations`) — ver la cabecera de sales-store.ts.
//
// De los cinco stores este era el que más dolía perder: un apartado es dinero
// que el cliente YA entregó. El historial de abonos (`paymentNotes`) vive en
// una columna jsonb y se agrega con el operador `||` de Postgres, en la misma
// sentencia UPDATE — nunca leyendo-modificando-escribiendo desde Node, que es
// como dos abonos capturados casi al mismo tiempo se pisaban el uno al otro.

import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { layawayReservations } from '@/db/schema';
import { LayawayRequest, PaymentNoteEntry } from '@/types/admin';

type Row = typeof layawayReservations.$inferSelect;

function toLayaway(row: Row): LayawayRequest {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.productTitle,
    productImage: row.productImage,
    requestedSize: row.requestedSize,
    totalPrice: Number(row.totalPrice),
    percentage: row.percentage,
    depositAmount: Number(row.depositAmount),
    hypeScore: row.hypeScore,
    customerPhone: row.customerPhone,
    note: row.note,
    paymentNotes: (row.paymentNotes as PaymentNoteEntry[]) ?? [],
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    source: 'TENISIN_CHAT',
  };
}

export async function getLayaways(): Promise<LayawayRequest[]> {
  const rows = await getDb().select().from(layawayReservations).orderBy(desc(layawayReservations.createdAt));
  return rows.map(toLayaway);
}

export async function addLayaway(input: {
  productId: string;
  productTitle: string;
  productImage: string;
  requestedSize?: string;
  totalPrice: number;
  percentage: number;
  depositAmount: number;
  hypeScore?: number;
  customerPhone: string;
  note?: string;
}): Promise<LayawayRequest> {
  const [row] = await getDb()
    .insert(layawayReservations)
    .values({
      id: `LAYAWAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: input.productId,
      productTitle: input.productTitle,
      productImage: input.productImage,
      requestedSize: input.requestedSize || 'N/A',
      totalPrice: input.totalPrice.toFixed(2),
      percentage: input.percentage,
      depositAmount: input.depositAmount.toFixed(2),
      hypeScore: input.hypeScore ?? 0,
      customerPhone: input.customerPhone,
      note: input.note || '',
      paymentNotes: [],
      status: 'PENDING',
    })
    .returning();
  return toLayaway(row);
}

export async function updateLayaway(id: string, patch: Partial<LayawayRequest>): Promise<void> {
  // Lista explícita, no un spread del patch: `paymentNotes` NUNCA se
  // sobreescribe por esta vía (para eso está addPaymentNote, que agrega sin
  // perder el historial) y ningún campo que llegue de más en el body toca la
  // tabla.
  const fields: Partial<typeof layawayReservations.$inferInsert> = {};
  if (patch.status !== undefined) fields.status = patch.status;
  if (patch.note !== undefined) fields.note = patch.note;
  if (patch.requestedSize !== undefined) fields.requestedSize = patch.requestedSize;
  if (patch.customerPhone !== undefined) fields.customerPhone = patch.customerPhone;
  if (patch.percentage !== undefined) fields.percentage = patch.percentage;
  if (patch.depositAmount !== undefined) fields.depositAmount = patch.depositAmount.toFixed(2);
  if (Object.keys(fields).length === 0) return;

  await getDb().update(layawayReservations).set(fields).where(eq(layawayReservations.id, id));
}

// Agrega un abono al historial (nunca reemplaza los anteriores) — usado por
// la pestaña Clientes del admin para dejar constancia de fecha y monto.
export async function addPaymentNote(
  id: string,
  entry: { amount: number; note: string }
): Promise<PaymentNoteEntry | null> {
  const newEntry: PaymentNoteEntry = {
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    amount: entry.amount,
    note: entry.note,
  };

  // El abono nuevo va al frente (el panel muestra el más reciente primero) y
  // la concatenación ocurre dentro de Postgres, así que no hay ventana entre
  // leer y escribir en la que otro abono se pueda perder.
  const rows = await getDb()
    .update(layawayReservations)
    .set({
      paymentNotes: sql`${JSON.stringify([newEntry])}::jsonb || ${layawayReservations.paymentNotes}`,
    })
    .where(eq(layawayReservations.id, id))
    .returning({ id: layawayReservations.id });

  return rows.length > 0 ? newEntry : null;
}

export async function deleteLayaway(id: string): Promise<void> {
  await getDb().delete(layawayReservations).where(eq(layawayReservations.id, id));
}
