// src/lib/shopify/finance.ts
//
// Fase D (brief D.1/D.3): las cifras reales del Panel de Mando. Todo en
// vivo contra la Admin API — no hay tabla de Order propia en este
// proyecto (deuda técnica ya documentada en CLAUDE.md: sin webhook de
// Shopify configurado), así que "en vivo" es la única fuente honesta.
//
// Límite documentado: se trae UNA página de hasta 250 pedidos de los
// últimos 60 días y se agrega en memoria — suficiente para el volumen
// real de LAMK hoy. Si el negocio crece más allá de eso, hace falta
// paginar de verdad (no se construyó paginación completa en esta ronda
// para no sobre-construir sin necesidad real todavía).
//
// Margen (D.1): usa InventoryItem.unitCost, el campo NATIVO de Shopify
// para esto (verificado contra la doc 2026-01) — nunca se inventó un
// campo de costo propio. Ese campo requiere el permiso "View product
// costs" en la Admin API custom app; si no está concedido, el margen se
// reporta como no disponible en vez de asumir 0 (que se leería como
// "margen negativo", falso y peor que no mostrar nada).

import { isAdminApiConfigured } from './admin';

function getAdminConfig() {
  return {
    domain: process.env.SHOPIFY_ADMIN_API_STORE_DOMAIN || '',
    token: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-07',
  };
}

async function adminFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<{ data: T; errors?: any[] }> {
  const { domain, token, apiVersion } = getAdminConfig();
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  const body = await res.json();
  return { data: body.data, errors: body.errors };
}

const ORDERS_FOR_DASHBOARD_QUERY = `
  query DashboardOrders($query: String!) {
    orders(first: 250, sortKey: CREATED_AT, reverse: true, query: $query) {
      edges {
        node {
          id
          createdAt
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount } }
          lineItems(first: 20) {
            edges {
              node {
                quantity
                originalTotalSet { shopMoney { amount } }
                variant {
                  inventoryItem { unitCost { amount } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface DashboardFinance {
  salesToday: number;
  salesTodayOrders: number;
  salesMonth: number;
  salesMonthOrders: number;
  avgTicket: number;
  ordersToFulfill: number;
  ordersOverdue48h: number;
  grossMarginPct: number | null; // null = sin permiso "View product costs" en la Admin API
  xpOutstanding: number; // informativo — no hay sistema de canje de XP por descuento construido todavía, nunca se convierte a pesos sin esa pieza real
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const PRODUCT_VARIANTS_VALUATION_QUERY = `
  query ProductVariantsValuation($first: Int!, $after: String) {
    productVariants(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          price
          inventoryQuantity
          inventoryItem { unitCost { amount } }
          product { id title productType }
        }
      }
    }
  }
`;

export interface CategoryValuation {
  category: string;
  unitsInStock: number;
  retailValue: number; // precio de venta × stock — siempre disponible
  costValue: number | null; // costo real × stock — null si falta el permiso "View product costs"
  marginPct: number | null;
}

export interface InventoryValuation {
  categories: CategoryValuation[];
  totalRetailValue: number;
  totalCostValue: number | null; // "capital inmovilizado" real — null si no hay costos
  costDataAvailable: boolean;
}

// D.4: "capital inmovilizado en inventario" — el brief lo pide en costo,
// no en precio de venta (son números muy distintos: el costo es lo que
// de verdad tienes atado, el precio de venta es lo que esperas recuperar
// SI se vende). Requiere el mismo permiso "View product costs" que el
// margen del Panel de Mando, MÁS el scope `read_products` en la Admin
// API (que CLAUDE.md documenta que hoy solo tiene read_customers +
// read_orders) — si cualquiera de los dos falta, se reporta
// `costDataAvailable: false` y se muestra el valor a precio de venta
// como lo único disponible, nunca como si fuera lo mismo.
export async function getInventoryValuation(): Promise<InventoryValuation | null> {
  if (!isAdminApiConfigured()) return null;

  const byCategory = new Map<string, { units: number; retail: number; cost: number; costKnown: boolean }>();
  let costDataAvailable = false;
  let after: string | null = null;
  let pages = 0;

  // Pagina de verdad (a diferencia de finance.ts/inventory-analytics.ts,
  // que se quedan en una sola página de 250 — un catálogo completo SÍ
  // puede pasar de 250 variantes y subvaluar "capital inmovilizado" en
  // silencio sería peor que en ventas/vistas, que son estimaciones por
  // naturaleza). Tope de 10 páginas (2,500 variantes) como salvaguarda.
  do {
    const { data, errors }: { data: any; errors?: any[] } = await adminFetch(PRODUCT_VARIANTS_VALUATION_QUERY, { first: 250, after });
    if (!data?.productVariants) {
      console.error('No se pudo cargar la valuación de inventario (revisa el scope read_products):', errors);
      return { categories: [], totalRetailValue: 0, totalCostValue: null, costDataAvailable: false };
    }

    for (const edge of data.productVariants.edges) {
      const v = edge.node;
      const category = v.product?.productType || 'Sin categoría';
      const qty = Math.max(0, v.inventoryQuantity || 0);
      const price = parseFloat(v.price || '0');
      const unitCostRaw = v.inventoryItem?.unitCost?.amount;

      const entry = byCategory.get(category) || { units: 0, retail: 0, cost: 0, costKnown: true };
      entry.units += qty;
      entry.retail += price * qty;
      if (unitCostRaw != null) {
        costDataAvailable = true;
        entry.cost += parseFloat(unitCostRaw) * qty;
      } else {
        entry.costKnown = false;
      }
      byCategory.set(category, entry);
    }

    after = data.productVariants.pageInfo?.hasNextPage ? data.productVariants.pageInfo.endCursor : null;
    pages++;
  } while (after && pages < 10);

  const categories: CategoryValuation[] = Array.from(byCategory.entries()).map(([category, v]) => ({
    category,
    unitsInStock: v.units,
    retailValue: v.retail,
    costValue: costDataAvailable && v.costKnown ? v.cost : null,
    marginPct: costDataAvailable && v.costKnown && v.retail > 0 ? Math.round(((v.retail - v.cost) / v.retail) * 1000) / 10 : null,
  }));

  const totalRetailValue = categories.reduce((sum, c) => sum + c.retailValue, 0);
  const totalCostValue = costDataAvailable ? categories.reduce((sum, c) => sum + (c.costValue ?? 0), 0) : null;

  return { categories: categories.sort((a, b) => b.retailValue - a.retailValue), totalRetailValue, totalCostValue, costDataAvailable };
}

export async function getDashboardFinance(): Promise<DashboardFinance | null> {
  if (!isAdminApiConfigured()) return null;

  const now = new Date();
  const todayStart = startOfDayUTC(now);
  const monthStart = startOfMonthUTC(now);
  // 60 días de sobra para cubrir "este mes" completo aun a inicios de mes
  // (mes anterior, si algún día se agrega comparación) sin traer todo el
  // histórico de la tienda.
  const windowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const { data, errors } = await adminFetch<any>(ORDERS_FOR_DASHBOARD_QUERY, {
    query: `created_at:>='${windowStart.toISOString()}'`,
  });
  if (!data?.orders) {
    console.error('No se pudieron cargar pedidos para el Panel de Mando:', errors);
    return null;
  }

  const orders = data.orders.edges.map((e: any) => e.node);

  let salesToday = 0, salesTodayOrders = 0;
  let salesMonth = 0, salesMonthOrders = 0;
  let ordersToFulfill = 0, ordersOverdue48h = 0;
  let totalRevenue = 0, totalCost = 0;
  let costDataAvailable = false;
  let anyCostFieldPresent = false;

  const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

  for (const order of orders) {
    const total = parseFloat(order.totalPriceSet?.shopMoney?.amount || '0');
    const createdAt = new Date(order.createdAt);

    if (createdAt >= monthStart) {
      salesMonth += total;
      salesMonthOrders++;
    }
    if (createdAt >= todayStart) {
      salesToday += total;
      salesTodayOrders++;
    }

    const status = order.displayFulfillmentStatus;
    if (status === 'UNFULFILLED' || status === 'PARTIALLY_FULFILLED' || status === 'IN_PROGRESS' || status === 'ON_HOLD' || status === 'SCHEDULED') {
      ordersToFulfill++;
      if (now.getTime() - createdAt.getTime() > FORTY_EIGHT_H_MS) ordersOverdue48h++;
    }

    for (const liEdge of order.lineItems?.edges || []) {
      const li = liEdge.node;
      const lineRevenue = parseFloat(li.originalTotalSet?.shopMoney?.amount || '0');
      totalRevenue += lineRevenue;

      const unitCostRaw = li.variant?.inventoryItem?.unitCost?.amount;
      if (unitCostRaw != null) {
        anyCostFieldPresent = true;
        totalCost += parseFloat(unitCostRaw) * (li.quantity || 0);
      }
    }
  }
  costDataAvailable = anyCostFieldPresent;

  const grossMarginPct = costDataAvailable && totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : null;

  return {
    salesToday,
    salesTodayOrders,
    salesMonth,
    salesMonthOrders,
    avgTicket: salesMonthOrders > 0 ? Math.round(salesMonth / salesMonthOrders) : 0,
    ordersToFulfill,
    ordersOverdue48h,
    grossMarginPct,
    xpOutstanding: 0, // se completa en el caller con datos reales de clientes (ver admin overview) — no hay query de "todos los clientes con su XP" en este mismo módulo
  };
}
