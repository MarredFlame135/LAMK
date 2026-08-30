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

const CUSTOMER_BY_EMAIL_QUERY = `
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      edges { node { id } }
    }
  }
`;

// Usado por el puente de login social (src/lib/social-auth/bridge.ts,
// hallazgo #4): antes de crear una cuenta nueva para un login de
// Google/Apple, hay que saber si YA existe un customer de Shopify con ese
// correo (alguien que se registró antes con contraseña) — si existe, no se
// vincula automáticamente sin más (ver nota larga en db/schema.ts sobre
// por qué la Admin API no permite fusionar sin fricción en plan estándar).
export async function findCustomerIdByEmail(email: string): Promise<string | null> {
  if (!isAdminApiConfigured()) return null;
  const data = await adminGraphqlFetch<any>(CUSTOMER_BY_EMAIL_QUERY, { query: `email:${email}` });
  return data?.customers?.edges?.[0]?.node?.id ?? null;
}

const CUSTOMER_DELETE_MUTATION = `
  mutation CustomerDelete($id: ID!) {
    customerDelete(input: { id: $id }) {
      deletedCustomerId
      userErrors { field message }
    }
  }
`;

// Usado por lib/account-deletion.ts. Límite real de la plataforma
// (verificado contra la doc 2026-01, `Customer.canDelete`): Shopify
// rechaza borrar un customer que ya tiene pedidos — devuelve `false` en
// ese caso en vez de lanzar, para que el caller decida qué hacer (en
// nuestro caso: borrar todo lo propio igual y conservar el registro de
// Shopify por obligación fiscal, ver nota larga en db/schema.ts).
export async function deleteShopifyCustomer(customerId: string): Promise<{ deleted: boolean; reason?: string }> {
  if (!isAdminApiConfigured()) return { deleted: false, reason: 'Admin API no configurada' };
  const data = await adminGraphqlFetch<any>(CUSTOMER_DELETE_MUTATION, { id: customerId });
  const errors = data?.customerDelete?.userErrors;
  if (errors?.length) return { deleted: false, reason: errors.map((e: any) => e.message).join(' ') };
  return { deleted: Boolean(data?.customerDelete?.deletedCustomerId) };
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

  // Fix (Fase D): el tope real de Shopify Admin API para `first` es 250,
  // no 100 — varios callers ya pedían 500 asumiendo que servía de algo
  // (profile/[username]/route.ts, api/vault/pass/story-image), pero se
  // recortaba en silencio a 100 sin que nadie se enterara.
  const data = await adminGraphqlFetch<any>(CUSTOMERS_QUERY, { first: Math.min(limit, 250) });
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
