// src/app/api/webhooks/shopify/orders-paid/route.ts
//
// El webhook que le faltaba al proyecto desde siempre (deuda técnica #3 de
// CLAUDE.md). Shopify se lleva el checkout completo y hasta hoy nunca
// regresaba nada: el sitio sabía que alguien EMPEZÓ a pagar (`checkout_started`
// de la Fase 5) y jamás si terminó. Con esto, un pedido pagado:
//
//   1. Registra una señal real de venta por unidad (product_events, tipo
//      'sale') — el término "velocidad de venta" del Índice ponderado deja
//      de estar reservado en 0 (hallazgo #2 de la Fase A).
//   2. Siembra las piezas en la Bóveda del comprador con número de serie
//      estable (ver lib/vault-purchase.ts).
//
// Cómo se conecta (no está automatizado, hay que darlo de alta una vez):
//   Shopify Admin › Configuración › Notificaciones › Webhooks
//   Evento: "Pedido pagado" (orders/paid) · Formato: JSON
//   URL: https://<dominio>/api/webhooks/shopify/orders-paid
//   Después copiar el secreto que muestra Shopify a SHOPIFY_WEBHOOK_SECRET.
//
// Runtime Node (no Edge) a propósito: la verificación usa `crypto` de Node y
// abajo se escribe a Postgres.

import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopify/webhook';
import { fulfillPaidOrder, PaidLineItem } from '@/lib/vault-purchase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// El payload REST de Shopify trae IDs numéricos; el resto del proyecto usa
// GIDs (`gid://shopify/Customer/123`) porque es lo que devuelve la Storefront
// API y con eso está poblado `vault_items.customer_id`. Traducir aquí es lo
// que evita que la bóveda quede partida en dos identidades del mismo cliente.
function toGid(kind: 'Customer' | 'Product' | 'Order', id: number | string | null | undefined): string | null {
  if (id === null || id === undefined || id === '') return null;
  return `gid://shopify/${kind}/${id}`;
}

export async function POST(request: NextRequest) {
  // El cuerpo CRUDO, antes de cualquier parseo: la firma se calcula sobre
  // estos bytes exactos (ver lib/shopify/webhook.ts).
  const rawBody = await request.text();
  const verification = verifyShopifyWebhook(rawBody, request.headers.get('x-shopify-hmac-sha256'));

  if (!verification.ok) {
    if (verification.reason === 'not-configured') {
      console.error('[webhook orders/paid] SHOPIFY_WEBHOOK_SECRET no está configurado — el webhook rechaza todo hasta que lo esté.');
      return NextResponse.json({ error: 'Webhook no configurado en el servidor.' }, { status: 503 });
    }
    // 401 sin detalle: a quien manda una firma inválida no se le explica por qué.
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // 200 a propósito: el cuerpo venía firmado por Shopify pero ilegible.
    // Un 4xx haría que Shopify reintente 19 veces algo que nunca va a
    // funcionar; se registra y se cierra.
    console.error('[webhook orders/paid] cuerpo firmado pero no es JSON válido.');
    return NextResponse.json({ ok: true, ignored: 'invalid-json' });
  }

  const orderId = payload.admin_graphql_api_id || toGid('Order', payload.id);
  if (!orderId) {
    console.error('[webhook orders/paid] pedido sin id — ignorado.');
    return NextResponse.json({ ok: true, ignored: 'no-order-id' });
  }

  const lineItems: PaidLineItem[] = (payload.line_items || []).map((li: any) => ({
    productId: li.admin_graphql_api_product_id || toGid('Product', li.product_id),
    title: li.title || li.name || 'Pieza sin título',
    // El payload de orders/paid no trae imagen de producto. Se deja vacío y
    // la UI de la bóveda cae a la imagen del catálogo por productId — nunca
    // se inventa una URL aquí.
    imageUrl: '',
    quantity: Number(li.quantity) || 1,
    lineTotalMxn: Number(li.price || 0) * (Number(li.quantity) || 1),
  }));

  try {
    const result = await fulfillPaidOrder({
      orderId,
      customerId: payload.customer?.admin_graphql_api_id || toGid('Customer', payload.customer?.id),
      lineItems,
    });

    console.log(
      `[webhook orders/paid] ${orderId}: ${result.salesRecorded} venta(s) registrada(s), ` +
        `${result.vaultItemsCreated} pieza(s) a la bóveda, ${result.xpEarned} XP` +
        (result.skippedReason === 'no-customer' ? ' (compra de invitado: sin bóveda que llenar)' : '')
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // 500 sí: aquí SÍ queremos que Shopify reintente — la escritura es
    // idempotente (índice único order+producto+cliente), así que un reintento
    // no duplica nada y sí recupera una caída pasajera de la base de datos.
    console.error('[webhook orders/paid] error procesando el pedido:', err);
    return NextResponse.json({ error: 'Error procesando el pedido.' }, { status: 500 });
  }
}
