// src/lib/customer-segmentation.ts
//
// Fase D.5: segmentación RFM (Recencia, Frecuencia, Monto) — los 7
// segmentos que pide el brief, operacionalizados con umbrales concretos
// (el brief los define en términos cualitativos: "compra reciente,
// seguido, mucho" — aquí se traduce a días/pedidos/pesos reales).
// Constantes documentadas y fáciles de ajustar cuando haya volumen real
// de LAMK que las calibre mejor (mismo criterio que los caps de
// normalización en hype.ts).
//
// Función pura — separada de la consulta a Shopify a propósito, mismo
// patrón que computeHypeIndexFromCounts (hype.ts) y computeCollectionIndex
// (utils/gamification.ts), para poder probarla sin la Admin API real.

export type CustomerSegment = 'CAMPEONES' | 'LEALES' | 'PROMETEDORES' | 'EN_RIESGO' | 'DORMIDOS' | 'PERDIDOS' | 'NUEVOS' | 'SIN_COMPRAS';

export const SEGMENT_META: Record<CustomerSegment, { label: string; action: string }> = {
  CAMPEONES: { label: 'Campeones', action: 'Acceso anticipado a drops' },
  LEALES: { label: 'Leales', action: 'Programa de referidos' },
  PROMETEDORES: { label: 'Prometedores', action: 'Segunda compra con incentivo' },
  EN_RIESGO: { label: 'En riesgo', action: 'Reactivación por WhatsApp' },
  DORMIDOS: { label: 'Dormidos', action: 'Oferta de recuperación' },
  PERDIDOS: { label: 'Perdidos', action: 'Última campaña o archivar' },
  NUEVOS: { label: 'Nuevos', action: 'Secuencia de bienvenida' },
  SIN_COMPRAS: { label: 'Sin compras', action: 'Sin pedidos todavía — nada que segmentar' },
};

// Umbrales — tunables, documentados aquí porque es el único lugar donde
// se usan. HIGH_SPEND_MXN parte de los precios reales del catálogo
// (piezas entre $4,000-$11,500 MXN, ver propuesta comercial) — dos piezas
// de gama media ya cuenta como "gasta mucho".
const NEW_WITHIN_DAYS = 30;
const AT_RISK_MIN_DAYS = 60;
const AT_RISK_MAX_DAYS = 90;
const DORMANT_MAX_DAYS = 180;
const LOYAL_MIN_ORDERS = 3;
const HIGH_SPEND_MXN = 15000;

export interface RfmInput {
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string | null; // ISO
}

export function segmentCustomer(input: RfmInput, now: Date = new Date()): CustomerSegment {
  if (input.ordersCount === 0 || !input.lastOrderDate) return 'SIN_COMPRAS';

  const recencyDays = Math.floor((now.getTime() - new Date(input.lastOrderDate).getTime()) / (24 * 60 * 60 * 1000));

  if (recencyDays > DORMANT_MAX_DAYS) return 'PERDIDOS';
  if (recencyDays > AT_RISK_MAX_DAYS) return 'DORMIDOS';
  if (recencyDays > AT_RISK_MIN_DAYS) return 'EN_RIESGO';

  // Recencia buena (≤60 días) — ahora sí importa frecuencia/monto.
  if (input.ordersCount === 1 && recencyDays <= NEW_WITHIN_DAYS) return 'NUEVOS';
  if (input.ordersCount >= LOYAL_MIN_ORDERS && input.totalSpent >= HIGH_SPEND_MXN) return 'CAMPEONES';
  if (input.ordersCount >= LOYAL_MIN_ORDERS) return 'LEALES';
  return 'PROMETEDORES'; // reciente, pocas compras (incluye al que compró 1 vez pero ya pasó su ventana de "nuevo")
}

export function buildSegmentDistribution(customers: RfmInput[], now: Date = new Date()): Record<CustomerSegment, number> {
  const dist = Object.fromEntries(Object.keys(SEGMENT_META).map((k) => [k, 0])) as Record<CustomerSegment, number>;
  for (const c of customers) dist[segmentCustomer(c, now)]++;
  return dist;
}
