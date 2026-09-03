// src/lib/vault-purchase.ts
//
// Qué le pasa a la Bóveda cuando un pedido REAL se paga. Lo llama el webhook
// `orders/paid` (src/app/api/webhooks/shopify/orders-paid/route.ts) y no
// debería llamarlo nadie más — es la única vía por la que una pieza entra a
// la bóveda con número de serie, porque es la única en la que consta que
// alguien pagó.
//
// Antes de esto, el sitio nunca se enteraba de que una compra se completaba
// (deuda técnica #3 de CLAUDE.md): Shopify se llevaba el checkout y no
// devolvía nada. De ahí colgaban tres cosas: no había señal de "velocidad de
// venta" para el Índice, la bóveda se reconstruía en cada carga leyendo los
// pedidos de Shopify, y el número de serie salía de la posición en ese
// arreglo — o sea que cambiaba solo.

import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { vaultItems } from '@/db/schema';
import { recordEvent } from './hype';
import { calculateHypeXp } from '@/utils/gamification';
import { computeHypeIndex } from './hype';

export interface PaidLineItem {
  productId: string | null; // GID de Shopify, null si la línea no trae producto
  title: string;
  imageUrl: string;
  quantity: number;
  lineTotalMxn: number;
}

export interface PaidOrder {
  orderId: string;
  customerId: string | null; // GID de Shopify Customer, null en compra de invitado
  lineItems: PaidLineItem[];
}

export interface FulfillmentResult {
  vaultItemsCreated: number;
  xpEarned: number;
  salesRecorded: number;
  skippedReason?: 'no-customer';
}

// Número de serie: `#LK-007/26` = séptima unidad de ESE modelo registrada en
// LAMK, en 2026. Dos decisiones deliberadas:
//  - La secuencia es POR PRODUCTO, no global: para un coleccionista significa
//    algo ser el #007 de un par concreto; ser el #4821 de la tienda entera,
//    no.
//  - El sufijo es el AÑO, no el total de la edición. No sabemos cuántas
//    unidades existen de nada (Shopify no lo dice), y un denominador que
//    crece con cada venta convertiría el serial en un número que cambia —
//    justo el defecto que este campo viene a corregir.
//
// La secuencia se calcula DENTRO del INSERT (subconsulta), no en Node: con
// dos compras simultáneas del mismo par, leer-y-luego-escribir le daría el
// mismo número a las dos.
function serialExpression(productId: string, yearSuffix: string) {
  return sql`'#LK-' || lpad(((SELECT count(*) FROM ${vaultItems} v WHERE v.product_id = ${productId} AND v.serial_number IS NOT NULL) + 1)::text, 3, '0') || '/' || ${yearSuffix}`;
}

export async function fulfillPaidOrder(order: PaidOrder, now = new Date()): Promise<FulfillmentResult> {
  const yearSuffix = String(now.getFullYear()).slice(-2);
  let vaultItemsCreated = 0;
  let salesRecorded = 0;
  let xpEarned = 0;

  for (const line of order.lineItems) {
    if (!line.productId) continue;

    // Señal real de venta para el Índice ponderado. Se registra SIEMPRE, aunque
    // la compra haya sido de invitado y no haya bóveda que llenar: la demanda
    // del producto es la misma. Una fila por unidad vendida, no por línea de
    // pedido — dos pares del mismo modelo son dos ventas.
    //
    // La clave de dedup incluye el índice de unidad para que las 2 unidades de
    // una misma línea sí cuenten como 2, pero el reintento del MISMO pedido no
    // vuelva a contar ninguna.
    for (let i = 0; i < Math.max(1, line.quantity); i++) {
      const inserted = await recordEvent(line.productId, 'sale', `${order.orderId}#${line.productId}#${i}`);
      if (inserted) salesRecorded++;
    }

    // XP ganado con la fórmula de Hype ya existente (calculateHypeXp:
    // precio × (1 + hypeScore/100)). NO se guarda en vault_items a
    // propósito: el XP de una pieza es su precio disfrazado, y esa tabla
    // alimenta bóvedas PÚBLICAS — la Fase 2 (sección 1.2) decidió que nunca
    // tenga columnas de precio ni valor, justamente para que no puedan
    // filtrarse. El XP del cliente se sigue derivando en vivo de sus pedidos
    // reales en getCustomerProfile(), con esta misma función, así que el
    // número no se contradice; aquí se calcula para dejarlo en el log del
    // webhook y poder auditar cuánto rindió un pedido.
    const { score } = await computeHypeIndex(line.productId);
    xpEarned += calculateHypeXp(line.lineTotalMxn, score);

    if (!order.customerId) continue;

    // onConflictDoNothing + el índice único (order_id, product_id,
    // customer_id) es lo que hace inofensivo el reintento de Shopify.
    const inserted = await getDb()
      .insert(vaultItems)
      .values({
        id: randomUUID(),
        customerId: order.customerId,
        productId: line.productId,
        title: line.title,
        imageUrl: line.imageUrl,
        orderId: order.orderId,
        serialNumber: serialExpression(line.productId, yearSuffix) as unknown as string,
      })
      .onConflictDoNothing()
      .returning({ id: vaultItems.id });

    vaultItemsCreated += inserted.length;
  }

  return {
    vaultItemsCreated,
    xpEarned,
    salesRecorded,
    ...(order.customerId ? {} : { skippedReason: 'no-customer' as const }),
  };
}

// Números de serie ya asignados a las piezas de un cliente, agrupados por
// producto. Los consume getCustomerProfile() para mostrar el serial REAL
// (fijado en el momento de la compra) en vez del posicional que se calculaba
// al vuelo. Un cliente puede tener dos unidades del mismo modelo, así que el
// valor es una lista y se consume en orden.
export async function getStoredSerialsByProduct(customerId: string): Promise<Map<string, string[]>> {
  const rows = await getDb()
    .select({ productId: vaultItems.productId, serialNumber: vaultItems.serialNumber })
    .from(vaultItems)
    .where(eq(vaultItems.customerId, customerId))
    .orderBy(vaultItems.addedAt);

  const byProduct = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.productId || !row.serialNumber) continue;
    const list = byProduct.get(row.productId) ?? [];
    list.push(row.serialNumber);
    byProduct.set(row.productId, list);
  }
  return byProduct;
}
