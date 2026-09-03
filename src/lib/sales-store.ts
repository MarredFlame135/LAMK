// src/lib/sales-store.ts
//
// Ventas físicas y deudas. Vivían en `data/offline-sales.json` con
// `fs.writeFileSync`; desde el 2026-09-02 están en Postgres (tabla
// `offline_sales`). El filesystem de una función serverless de Vercel es
// efímero y no se comparte entre instancias: una venta capturada en el
// celular podía no existir cuando el admin abría el panel en la computadora,
// y el store viejo no distinguía "no hay ventas" de "no pude leer el archivo".
//
// Dinero: la tabla usa numeric(12,2) y Drizzle lo devuelve como string. La
// conversión a `number` pasa aquí, en la frontera, para que OfflineSale siga
// siendo exactamente el mismo tipo que antes para todos los consumidores.
//
// NOTA: las dos ventas de ejemplo ("Carlos Mendoza", "Sofía Guerrero") que el
// store viejo devolvía cuando no existía el archivo NO se migraron. Eran
// datos inventados y la regla del repo es no simular contenido — una tabla
// vacía se muestra vacía.

import { desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { offlineSales } from '@/db/schema';
import { OfflineSale } from '@/types/admin';

type Row = typeof offlineSales.$inferSelect;

function toSale(row: Row): OfflineSale {
  return {
    id: row.id,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    itemsSummary: row.itemsSummary,
    totalAmount: Number(row.totalAmount),
    amountPaid: Number(row.amountPaid),
    pendingBalance: Number(row.pendingBalance),
    dueDate: row.dueDate,
    paymentStatus: row.paymentStatus,
    createdAt: row.createdAt.toISOString().split('T')[0],
  };
}

export async function getSales(): Promise<OfflineSale[]> {
  const rows = await getDb().select().from(offlineSales).orderBy(desc(offlineSales.createdAt));
  return rows.map(toSale);
}

export async function addSale(
  input: Omit<OfflineSale, 'id' | 'createdAt' | 'pendingBalance' | 'paymentStatus'> & { dueDate?: string }
): Promise<OfflineSale> {
  const pending = Math.max(0, input.totalAmount - input.amountPaid);
  const [row] = await getDb()
    .insert(offlineSales)
    .values({
      id: `SALE-${Date.now().toString().slice(-6)}`,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      itemsSummary: input.itemsSummary,
      totalAmount: input.totalAmount.toFixed(2),
      amountPaid: input.amountPaid.toFixed(2),
      pendingBalance: pending.toFixed(2),
      dueDate: input.dueDate || new Date().toISOString().split('T')[0],
      paymentStatus: pending === 0 ? 'PAID' : 'PARTIAL_DEBT',
    })
    .returning();
  return toSale(row);
}
