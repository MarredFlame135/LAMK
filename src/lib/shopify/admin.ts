// src/lib/shopify/admin.ts
//
// Cliente de Shopify Admin API (GraphQL) — SOLO server-side, nunca se importa
// desde un componente 'use client'. Requiere un Custom App con scopes
// read_customers + read_orders (Shopify Admin → Configuración → Apps y
// canales de venta → Desarrollo de apps) y el token vive exclusivamente en
// SHOPIFY_ADMIN_API_ACCESS_TOKEN (.env.local), nunca con prefijo NEXT_PUBLIC_.
//
// La Admin API es un producto DISTINTO de la Storefront API que ya usa el
// resto del sitio (src/lib/shopify/index.ts, customer.ts): corre en
// {shop}.myshopify.com/admin/api/{version}/graphql.json y por eso necesita su
// propio dominio (SHOPIFY_ADMIN_API_STORE_DOMAIN) — el dominio personalizado
// de la tienda (NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) normalmente NO sirve aquí.

import { calculateGamificationTier, calculateHypeXp } from '@/utils/gamification';
import { getCatalogLive } from '@/lib/catalog-source';
import { AdminCustomer } from '@/types/admin';

function getAdminConfig() {
  return {
    domain: process.env.SHOPIFY_ADMIN_API_STORE_DOMAIN || '',
    token: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-07',
  };
}

export function isAdminApiConfigured(): boolean {
  const { domain, token } = getAdminConfig();
  return Boolean(domain && token);
}

async function adminGraphqlFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { domain, token, apiVersion } = getAdminConfig();
  const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store', // datos de clientes: siempre en vivo, nunca cacheados
  });

  const body = await response.json();
  if (body.errors) {
    throw new Error(`Shopify Admin API: ${body.errors.map((e: any) => e.message).join(' ')}`);
  }
  return body.data as T;
}

const CUSTOMERS_QUERY = `
  query AdminCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          firstName
          lastName
          email
          phone
          numberOfOrders
          amountSpent { amount }
          orders(first: 20) {
            edges {
              node {
                lineItems(first: 50) {
                  edges {
                    node {
                      originalTotalSet { shopMoney { amount } }
                      product { id }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Trae clientes reales de Shopify (Admin API) con el mismo cálculo de XP
// ponderado por Hype que usa la Bóveda del propio cliente (ver
// shopify/customer.ts::getCustomerProfile) para que el ranking que ve el
// admin sea consistente con el que ve el comprador.
export async function getStoreCustomersWithXp(limit = 50): Promise<AdminCustomer[]> {
  if (!isAdminApiConfigured()) return [];

  let hypeById = new Map<string, number>();
  try {
    const { products } = await getCatalogLive();
    hypeById = new Map(products.map((p) => [p.id, p.hypeMeter.score]));
  } catch (err) {
    console.error('No se pudo cargar el catálogo para ponderar XP de clientes por Hype:', err);
  }

  const data = await adminGraphqlFetch<any>(CUSTOMERS_QUERY, { first: Math.min(limit, 100) });
  const edges = data?.customers?.edges || [];

  return edges.map((edge: any): AdminCustomer => {
    const c = edge.node;
    const lineItems = (c.orders?.edges || []).flatMap((o: any) => o.node.lineItems?.edges || []);

    const xp = lineItems.reduce((acc: number, li: any) => {
      const price = parseFloat(li.node.originalTotalSet?.shopMoney?.amount || '0');
      const productId = li.node.product?.id;
      const hypeScore = productId ? (hypeById.get(productId) ?? 0) : 0;
      return acc + calculateHypeXp(price, hypeScore);
    }, 0);

    return {
      id: c.id,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Cliente sin nombre',
      email: c.email || '',
      phone: (c.phone || '').replace(/\D/g, '').slice(-10),
      xp,
      tier: calculateGamificationTier(xp).currentTier,
      ordersCount: c.numberOfOrders ?? 0,
      totalSpent: parseFloat(c.amountSpent?.amount || '0'),
      source: 'SHOPIFY',
    };
  });
}
