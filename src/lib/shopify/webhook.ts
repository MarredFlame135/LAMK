// src/lib/shopify/webhook.ts
//
// Verificación de la firma de los webhooks de Shopify.
//
// Shopify firma cada webhook con HMAC-SHA256 sobre el CUERPO CRUDO del
// request, usando el secreto de la suscripción, y manda el resultado en
// base64 en la cabecera `X-Shopify-Hmac-Sha256`. Sin esta verificación,
// cualquiera que conozca la URL puede POSTear un "pedido pagado" inventado y
// sembrar piezas en la bóveda de quien quiera — por eso es fail-closed: sin
// `SHOPIFY_WEBHOOK_SECRET` configurado no se procesa NADA, ni en desarrollo.
//
// Dos detalles que rompen esto si se hacen mal:
//  1. Hay que firmar el texto EXACTO que llegó (`await request.text()`), no
//     `JSON.stringify(await request.json())` — reserializar cambia espacios y
//     orden de llaves, y la firma deja de coincidir.
//  2. La comparación es en tiempo constante (`timingSafeEqual`). Un `===`
//     normal se rinde en el primer byte distinto, y esa diferencia de tiempo
//     deja adivinar la firma byte por byte.

import { createHmac, timingSafeEqual } from 'crypto';

// Un solo tipo con `reason` opcional en vez de una unión discriminada
// { ok: true } | { ok: false, reason }: este tsconfig tiene "strict": false,
// y sin strictNullChecks TypeScript no estrecha la unión en el consumidor
// (el webhook creía que `reason` no existía dentro del propio if de error).
export interface WebhookVerification {
  ok: boolean;
  reason?: 'not-configured' | 'missing-signature' | 'invalid-signature';
}

export function verifyShopifyWebhook(rawBody: string, signatureHeader: string | null): WebhookVerification {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'not-configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing-signature' };

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();

  let received: Buffer;
  try {
    received = Buffer.from(signatureHeader, 'base64');
  } catch {
    return { ok: false, reason: 'invalid-signature' };
  }

  // timingSafeEqual truena si los buffers miden distinto, así que la longitud
  // se compara antes (esa sí es información pública: son 32 bytes siempre).
  if (received.length !== expected.length) return { ok: false, reason: 'invalid-signature' };
  if (!timingSafeEqual(received, expected)) return { ok: false, reason: 'invalid-signature' };

  return { ok: true };
}
