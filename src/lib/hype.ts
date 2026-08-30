// src/lib/hype.ts
//
// RF-05: Hype Meter = Vistas(24h) / Stock Restante — determina el `label`
// (NORMAL / ALTA DEMANDA / DROPPED / ULTIMOS PARES). Ver computeHypeMeter,
// función pura sin cambios (sigue probada en hype.test.ts).
//
// Fix (hallazgo #2 de la auditoría "Prompt Maestro v4", Fase A): el
// contador de vistas vivía en `data/views.json` — un archivo en el
// filesystem de una función serverless de Vercel, que no persiste entre
// invocaciones (ver CLAUDE.md, "Persistencia — deuda técnica más
// importante"). Por eso el índice marcaba 0.0 en producción: el archivo se
// reseteaba solo. Ahora las vistas (y los "agregar al carrito") se guardan
// en `product_events` (Postgres real, ver db/schema.ts) — recordView/
// getViews24h/getAllViews24h pasan de síncronas (fs) a asíncronas (DB),
// pero mantienen el mismo propósito para no romper el resto del sitio.
//
// Además se suma computeHypeIndex(): la fórmula ponderada del brief
// (vistas 30% + carrito 25% + wishlist 25% + velocidad de venta 20%). Hoy
// SOLO vistas y carrito tienen una fuente de datos real — wishlist no
// existe todavía (es Most Wanted, Fase B) y velocidad de venta necesitaría
// un webhook de Shopify que tampoco existe (deuda técnica ya documentada).
// Esos dos términos quedan en 0, a propósito, documentado — nunca se
// inventa una señal que no existe. El resultado es un índice más bajo de
// lo que será "en su versión final", pero siempre real.

import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { productEvents } from '@/db/schema';
import { randomUUID } from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;

async function recordEvent(productId: string, type: 'view' | 'cart' | 'wishlist' | 'sale'): Promise<void> {
  try {
    await getDb().insert(productEvents).values({ id: randomUUID(), productId, type });
  } catch (err) {
    // Nunca tirar la carga de la página por un fallo al registrar el
    // evento — mismo principio que el resto del sitio con IO no crítico.
    console.error(`No se pudo registrar evento "${type}" para ${productId}:`, err);
  }
}

async function countEvents(productId: string, type: 'view' | 'cart' | 'wishlist' | 'sale', sinceMs: number): Promise<number> {
  try {
    const db = getDb();
    const since = new Date(Date.now() - sinceMs);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productEvents)
      .where(and(eq(productEvents.productId, productId), eq(productEvents.type, type), gte(productEvents.createdAt, since)));
    return row?.count ?? 0;
  } catch (err) {
    console.error(`No se pudo contar eventos "${type}" para ${productId}:`, err);
    return 0;
  }
}

export async function recordView(productId: string): Promise<void> {
  await recordEvent(productId, 'view');
}

export async function recordCartAdd(productId: string): Promise<void> {
  await recordEvent(productId, 'cart');
}

export async function getViews24h(productId: string): Promise<number> {
  return countEvents(productId, 'view', DAY_MS);
}

// Usado por catalog-source.ts para pintar el catálogo completo sin una
// consulta por producto — trae vistas de 24h de TODOS los productos con
// eventos recientes en una sola pasada.
export async function getAllViews24h(): Promise<Record<string, number>> {
  try {
    const db = getDb();
    const since = new Date(Date.now() - DAY_MS);
    const rows = await db
      .select({ productId: productEvents.productId, count: sql<number>`count(*)::int` })
      .from(productEvents)
      .where(and(eq(productEvents.type, 'view'), gte(productEvents.createdAt, since)))
      .groupBy(productEvents.productId);
    return Object.fromEntries(rows.map((r) => [r.productId, r.count]));
  } catch (err) {
    console.error('No se pudo agregar vistas 24h de todo el catálogo:', err);
    return {};
  }
}

// Hype = Vistas24h / StockRestante (RF-05). Normalizado a 0-100 para la barra
// visual: una relación de 5 vistas por par restante o más ya se considera
// "al tope" (100%). Sin stock, el hype es máximo (se agotó = hubo demanda).
// Determina SOLO el `label` — el `score` que se muestra en el badge INDEX
// ahora viene de computeHypeIndex() (ver abajo), no de aquí.
export function computeHypeMeter(views24h: number, stockRemaining: number): { score: number; label: 'NORMAL' | 'ALTA DEMANDA' | 'DROPPED' | 'ULTIMOS PARES' } {
  if (stockRemaining <= 0) {
    return { score: views24h > 0 ? 100 : 0, label: views24h > 0 ? 'DROPPED' : 'DROPPED' };
  }

  const ratio = views24h / stockRemaining;
  const score = Math.max(0, Math.min(100, Math.round((ratio / 5) * 100)));

  const label = stockRemaining <= 2 ? 'ULTIMOS PARES' : score >= 60 ? 'ALTA DEMANDA' : 'NORMAL';

  return { score, label };
}

// Por debajo de este total de eventos reales (todas las señales sumadas),
// el índice se considera sin suficiente muestra — la UI debe mostrar "—"
// en vez de un número que técnicamente es real pero engañosamente bajo
// (ver hallazgo #2: un 0.0 se lee como decoración rota, no como "sin datos
// todavía"). Constante, no mágica: documentada aquí porque es el único
// lugar donde se usa.
export const MIN_SAMPLE_SIZE = 50;

// Topes de normalización por señal — cuántos eventos en la ventana
// equivalen a "100% en esa señal". Elegidos como punto de partida
// razonable (no hay histórico todavía para calibrarlos con datos reales);
// documentados y fáciles de ajustar cuando haya volumen real que revisar.
const VIEWS_7D_CAP = 150; // ~21/día
const CART_7D_CAP = 20;

// Función pura — separada de la IO de arriba a propósito, mismo patrón que
// computeHypeMeter, para poder probarla sin una base de datos real.
export function computeHypeIndexFromCounts(counts: {
  views7d: number;
  cart7d: number;
  wishlist7d?: number; // siempre 0 hasta que exista Most Wanted (Fase B)
  velocity30d?: number; // siempre 0 hasta que exista el webhook de Shopify
}): { score: number; sampleSize: number } {
  const { views7d, cart7d, wishlist7d = 0, velocity30d = 0 } = counts;
  const sampleSize = views7d + cart7d + wishlist7d + velocity30d;

  const viewsScore = Math.min(100, (views7d / VIEWS_7D_CAP) * 100);
  const cartScore = Math.min(100, (cart7d / CART_7D_CAP) * 100);
  const wishlistScore = 0; // términos reservados — ver comentario de arriba
  const velocityScore = 0;

  const score = 0.3 * viewsScore + 0.25 * cartScore + 0.25 * wishlistScore + 0.2 * velocityScore;

  return { score: Math.round(score * 10) / 10, sampleSize };
}

export async function computeHypeIndex(productId: string): Promise<{ score: number; sampleSize: number }> {
  const WEEK_MS = 7 * DAY_MS;
  const [views7d, cart7d] = await Promise.all([
    countEvents(productId, 'view', WEEK_MS),
    countEvents(productId, 'cart', WEEK_MS),
  ]);
  return computeHypeIndexFromCounts({ views7d, cart7d });
}
