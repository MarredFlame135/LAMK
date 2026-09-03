// src/utils/gamification.ts

import { CollectorTier } from '@/types/user';

export interface TierInfo {
  currentTier: CollectorTier;
  nextTier: CollectorTier | 'HALL_OF_FAME';
  currentXp: number;
  nextTierXp: number;
  progressPercentage: number;
  xpRemaining: number;
  /** Piezas verificadas que tiene hoy en la Bóveda. */
  currentPieces: number;
  /** Piezas que exige el siguiente rango (0 si ya está en el máximo). */
  nextTierPieces: number;
  /** Cuántas piezas le faltan para cumplir ese requisito. */
  piecesRemaining: number;
}

// XP dinámico por Hype: mientras más caliente esté la prenda al momento de la
// compra, más XP rinde cada peso gastado en ella. Un producto sin hype (0%)
// da el 1:1 de siempre; un drop al tope (100%) da el doble.
//   Factor de Hype = 1 + (Hype Score / 100)
//   XP Ganados = Precio MXN × Factor de Hype
export function calculateHypeXp(priceMxn: number, hypeScore: number): number {
  const factor = 1 + Math.max(0, Math.min(100, hypeScore)) / 100;
  return Math.round(priceMxn * factor);
}

// --- La escalera de rangos ------------------------------------------------
//
// Recalibrada el 2026-09-03 a petición del cliente: "no queremos que con una
// sola compra subas de nivel 4… debe haber restricciones súper justas, para
// todos… el nivel 4 sí debería ser complicado, arriba de 100,000".
//
// Qué estaba roto. Los umbrales anteriores eran 0 / 2,000 / 4,600 / 7,980 XP,
// y el XP es el precio de la pieza multiplicado por su Hype (×1 a ×2). Con el
// catálogo real —mediana $3,500, máximo $25,000— UNA sola compra del par más
// caro daba hasta 50,000 XP: seis veces el rango máximo. Es decir, el sistema
// no medía "coleccionar", medía "gastar una vez".
//
// Qué lo arregla. Cada rango pide DOS cosas a la vez: XP y un mínimo de piezas
// distintas en la Bóveda. Ninguna compra única, por cara que sea, mueve el
// contador de piezas más de uno — así que la escalera deja de poderse saltar
// con la cartera. Y como el XP sigue contando, quien acumula muchas piezas
// baratas tampoco llega solo por volumen: hacen falta las dos.
//
// Los números salen del catálogo vivo (265 piezas, medido el 2026-09-03), no
// de una progresión bonita:
//   HYPEBEAST  8,000 XP + 2 piezas   ≈ dos piezas de precio mediano
//   COLLECTOR  30,000 XP + 5 piezas  ≈ cinco piezas, o menos si son caras
//   LEGEND     100,000 XP + 12 piezas — el "complicado" que pidió el cliente:
//              ni 12 gorras baratas (no llegan al XP) ni dos grails (no llegan
//              a las piezas) alcanzan por sí solos.
export const TIER_THRESHOLDS = {
  ROOKIE: 0,
  HYPEBEAST: 8000,
  COLLECTOR: 30000,
  LEGEND: 100000,
  /** Tope del riel de la barra de progreso — el último rango, no un quinto. */
  MAX: 100000,
};

export const TIER_MIN_PIECES: Record<CollectorTier, number> = {
  ROOKIE: 0,
  HYPEBEAST: 2,
  COLLECTOR: 5,
  LEGEND: 12,
};

// Fuente única para todo lo que muestre la escalera de rangos (Placa de
// Coleccionista, barra de XP, panel de rangos) — antes CollectorVault.tsx
// tenía esta misma lista de perks hardcodeada inline solo para el panel
// lateral; ahora RankProgress ("próximo desbloqueo") y RankLadder la
// comparten, así que no puede quedar desincronizada entre los dos.
export const TIER_LADDER: { tier: CollectorTier; threshold: number; minPieces: number; perk: string }[] = [
  { tier: 'ROOKIE', threshold: TIER_THRESHOLDS.ROOKIE, minPieces: TIER_MIN_PIECES.ROOKIE, perk: 'Perfil básico y acceso a la comunidad.' },
  { tier: 'HYPEBEAST', threshold: TIER_THRESHOLDS.HYPEBEAST, minPieces: TIER_MIN_PIECES.HYPEBEAST, perk: 'Alertas prioritarias de restock por WhatsApp.' },
  { tier: 'COLLECTOR', threshold: TIER_THRESHOLDS.COLLECTOR, minPieces: TIER_MIN_PIECES.COLLECTOR, perk: 'Acceso anticipado a drops (30 min antes).' },
  { tier: 'LEGEND', threshold: TIER_THRESHOLDS.LEGEND, minPieces: TIER_MIN_PIECES.LEGEND, perk: 'Piezas exclusivas, apartado extendido y eventos VIP.' },
];

// El rango es el PELDAÑO MÁS ALTO cuyos dos requisitos se cumplen, recorriendo
// de arriba hacia abajo. Buscar "el primero que ya no se cumple" daría otro
// resultado el día que alguien tenga el XP de LEGEND pero le falte una pieza:
// se quedaría en COLLECTOR (correcto) solo si la comparación es por peldaño
// completo, no por umbral suelto.
//
// `pieces` es obligatorio a propósito y no tiene valor por defecto: un 0
// implícito degradaría en silencio a cualquiera desde un llamador que se
// olvide de pasarlo, y ese es exactamente el tipo de bug que no se reporta.
export function calculateGamificationTier(xp: number, pieces: number): TierInfo {
  let index = 0;
  for (let i = TIER_LADDER.length - 1; i >= 0; i -= 1) {
    if (xp >= TIER_LADDER[i].threshold && pieces >= TIER_LADDER[i].minPieces) {
      index = i;
      break;
    }
  }

  const current = TIER_LADDER[index];
  const next = TIER_LADDER[index + 1];

  if (!next) {
    return {
      currentTier: current.tier,
      nextTier: 'HALL_OF_FAME',
      currentXp: xp,
      nextTierXp: current.threshold,
      progressPercentage: 100,
      xpRemaining: 0,
      currentPieces: pieces,
      nextTierPieces: 0,
      piecesRemaining: 0,
    };
  }

  // El avance que se muestra es el del requisito MÁS ATRASADO de los dos. Un
  // 95% que en realidad significa "tienes el XP pero te faltan 7 piezas" es
  // una barra que miente justo en el tramo que más importa.
  const xpSpan = next.threshold - current.threshold;
  const xpProgress = xpSpan <= 0 ? 1 : (xp - current.threshold) / xpSpan;
  const pieceSpan = next.minPieces - current.minPieces;
  const pieceProgress = pieceSpan <= 0 ? 1 : (pieces - current.minPieces) / pieceSpan;

  return {
    currentTier: current.tier,
    nextTier: next.tier,
    currentXp: xp,
    nextTierXp: next.threshold,
    progressPercentage: Math.max(0, Math.min(100, Math.min(xpProgress, pieceProgress) * 100)),
    xpRemaining: Math.max(0, next.threshold - xp),
    currentPieces: pieces,
    nextTierPieces: next.minPieces,
    piecesRemaining: Math.max(0, next.minPieces - pieces),
  };
}

// Perk del rango que todavía no alcanza — lo que muestra RankProgress como
// "próximo desbloqueo". null cuando ya está en el rango máximo (MAX).
export function getNextUnlockPerk(tierInfo: TierInfo): string | null {
  if (tierInfo.nextTier === 'HALL_OF_FAME') return null;
  return TIER_LADDER.find((row) => row.tier === tierInfo.nextTier)?.perk ?? null;
}

// Fix (Fase B, "rareza falsa" corregida 2026-08-29): antes `rarity` en
// CollectionItem se asignaba por POSICIÓN en el array (la primera compra
// siempre "LEGENDARY", sin importar qué fuera) — no era una señal real de
// nada. Esto sí lo es: cruza cada pieza comprada contra el estado VIGENTE
// de ese producto en el catálogo (agotado / pocas unidades / Hype Score
// alto ahora mismo). No es "rareza al momento de la compra" (no se guarda
// histórico, mismo límite que ya tiene el cálculo de XP por Hype) — es
// honesto sobre eso: describe qué tan difícil sería conseguir esa MISMA
// pieza HOY, que es información real y útil aunque no sea retroactiva.
export function deriveRealRarity(product: { isSoldOut: boolean; stockRemaining: number; hypeScore: number } | null): 'COMMON' | 'RARE' | 'LEGENDARY' {
  if (!product) return 'COMMON'; // ya no está en catálogo — no se puede verificar escasez, no se asume rara
  if (product.isSoldOut) return 'LEGENDARY'; // se agotó del todo — la señal de escasez más fuerte que hay
  if (product.stockRemaining <= 2 || product.hypeScore >= 70) return 'RARE'; // mismo umbral "ÚLTIMOS PARES"/trending que ya usa el resto del sitio
  return 'COMMON';
}

const RARITY_SCORE: Record<'COMMON' | 'RARE' | 'LEGENDARY', number> = { COMMON: 20, RARE: 60, LEGENDARY: 100 };

// Cuántas categorías reales distintas existen hoy en el catálogo — usado
// para normalizar "diversidad" a 0-100. Coincide con el enum de
// Product['category'] en types/product.ts (SNEAKERS/APPAREL/ACCESSORIES/
// COLLECTIBLES/JEWELRY) — si ese enum crece, actualizar aquí también.
const TOTAL_CATALOG_CATEGORIES = 5;

const COLLECTION_INDEX_CAPS = {
  // "100% en valor acumulado" — punto de partida razonable sin histórico
  // de ventas propio para calibrarlo (mismo caso que los caps del Índice
  // de producto en hype.ts); fácil de ajustar cuando haya datos reales.
  totalSpentMxn: 30000,
  // "100% en antigüedad" — un año coleccionando ya es el tope.
  daysSinceFirstPurchase: 365,
};

export interface CollectionIndexBreakdown {
  score: number;               // 0-100, compuesto
  accumulatedValue: number;    // 0-100
  averageRarity: number;       // 0-100
  categoryDiversity: number;   // 0-100
  vintage: number;             // 0-100 ("antigüedad")
}

// Índice de Colección (Fase B, brief B.3) — a diferencia del Índice de
// producto (hype.ts), aquí SÍ hay datos reales para las 4 señales: valor
// acumulado (totalSpent, ya real), rareza (deriveRealRarity, arriba),
// diversidad de categoría (productType real de Shopify, ver
// CollectionItem.category) y antigüedad (purchaseDate real, order.processedAt).
// Ninguna señal se inventa — a diferencia del Índice de producto, este NO
// tiene términos en 0 por falta de fuente de datos.
export function computeCollectionIndex(input: { totalSpentMxn: number; collection: { rarity: 'COMMON' | 'RARE' | 'LEGENDARY'; category: string; purchaseDate: string }[] }): CollectionIndexBreakdown {
  const { totalSpentMxn, collection } = input;

  const accumulatedValue = Math.min(100, (totalSpentMxn / COLLECTION_INDEX_CAPS.totalSpentMxn) * 100);

  const averageRarity = collection.length
    ? collection.reduce((sum, item) => sum + RARITY_SCORE[item.rarity], 0) / collection.length
    : 0;

  const distinctCategories = new Set(collection.map((item) => item.category).filter(Boolean)).size;
  const categoryDiversity = Math.min(100, (distinctCategories / TOTAL_CATALOG_CATEGORIES) * 100);

  const purchaseDates = collection.map((item) => item.purchaseDate).filter(Boolean).map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
  const earliestPurchase = purchaseDates.length ? Math.min(...purchaseDates) : null;
  const daysSinceFirstPurchase = earliestPurchase ? (Date.now() - earliestPurchase) / (24 * 60 * 60 * 1000) : 0;
  const vintage = Math.min(100, (daysSinceFirstPurchase / COLLECTION_INDEX_CAPS.daysSinceFirstPurchase) * 100);

  // Pesos: valor y rareza importan más que diversidad/antigüedad — mismo
  // espíritu que el ejemplo del brief (180+120 de 412 ≈ el 73% del total).
  const score = 0.4 * accumulatedValue + 0.3 * averageRarity + 0.15 * categoryDiversity + 0.15 * vintage;

  return {
    score: Math.round(score * 10) / 10,
    accumulatedValue: Math.round(accumulatedValue * 10) / 10,
    averageRarity: Math.round(averageRarity * 10) / 10,
    categoryDiversity: Math.round(categoryDiversity * 10) / 10,
    vintage: Math.round(vintage * 10) / 10,
  };
}