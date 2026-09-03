// src/lib/shopify/webhook.test.ts
//
// La firma del webhook es la ÚNICA barrera entre internet y "este pedido se
// pagó". Sin ella, cualquiera que conozca la URL puede sembrar piezas en la
// bóveda de quien quiera e inflar el Índice de un producto a voluntad — así
// que esta suite existe sobre todo para que nadie afloje el fail-closed.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyShopifyWebhook } from './webhook';

const SECRET = 'secreto-de-prueba';
const BODY = '{"id":123,"line_items":[]}';

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

const ORIGINAL = process.env.SHOPIFY_WEBHOOK_SECRET;

describe('verifyShopifyWebhook', () => {
  beforeEach(() => {
    process.env.SHOPIFY_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.SHOPIFY_WEBHOOK_SECRET;
    else process.env.SHOPIFY_WEBHOOK_SECRET = ORIGINAL;
  });

  it('acepta una firma correcta', () => {
    expect(verifyShopifyWebhook(BODY, sign(BODY, SECRET)).ok).toBe(true);
  });

  it('rechaza una firma hecha con otro secreto', () => {
    const res = verifyShopifyWebhook(BODY, sign(BODY, 'otro-secreto'));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('invalid-signature');
  });

  it('rechaza si el cuerpo cambió aunque sea un byte', () => {
    const firma = sign(BODY, SECRET);
    expect(verifyShopifyWebhook(BODY.replace('123', '124'), firma).ok).toBe(false);
  });

  it('rechaza cuando no viene la cabecera de firma', () => {
    const res = verifyShopifyWebhook(BODY, null);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('missing-signature');
  });

  it('rechaza una firma de longitud distinta sin tronar', () => {
    expect(verifyShopifyWebhook(BODY, 'YWJj').ok).toBe(false);
  });

  // Regresión del fail-closed: sin secreto configurado NO se procesa nada,
  // ni siquiera en desarrollo. Si alguien alguna vez lo cambia por un
  // "pasa si no hay secreto", esta prueba lo atrapa.
  it('fail-closed: sin SHOPIFY_WEBHOOK_SECRET rechaza incluso una firma válida', () => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    const res = verifyShopifyWebhook(BODY, sign(BODY, SECRET));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not-configured');
  });
});
