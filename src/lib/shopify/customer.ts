// src/lib/shopify/customer.ts
//
// Autenticación real de clientes (HU-01 / RF-02) usando el flujo clásico de
// la Storefront API: customerCreate + customerAccessTokenCreate. El token de
// Shopify se guarda en una cookie httpOnly desde las API routes en
// src/app/api/auth/*, nunca se expone al JS del cliente.

import { shopifyFetch } from './index';
import {
  CUSTOMER_CREATE_MUTATION,
  CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION,
  CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
  GET_CUSTOMER_QUERY,
} from './queries';
import { UserProfile, CollectionItem } from '@/types/user';
import { calculateGamificationTier } from '@/utils/gamification';

export interface CustomerAccessToken {
  accessToken: string;
  expiresAt: string;
}

function collectUserErrors(errors: Array<{ field?: string[]; message: string }> | undefined): string {
  if (!errors || errors.length === 0) return '';
  return errors.map((e) => e.message).join(' ');
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<CustomerAccessToken> {
  const createData: any = await shopifyFetch({
    query: CUSTOMER_CREATE_MUTATION,
    variables: { input },
  });

  const createErrors = collectUserErrors(createData.customerCreate?.customerUserErrors);
  if (createErrors) throw new Error(createErrors);
  if (!createData.customerCreate?.customer) throw new Error('No se pudo crear la cuenta.');

  // Shopify no regresa un token en customerCreate: hay que pedirlo aparte.
  return loginCustomer({ email: input.email, password: input.password });
}

export async function loginCustomer(input: { email: string; password: string }): Promise<CustomerAccessToken> {
  const data: any = await shopifyFetch({
    query: CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION,
    variables: { input },
  });

  const errors = collectUserErrors(data.customerAccessTokenCreate?.customerUserErrors);
  if (errors) throw new Error(errors);

  const token = data.customerAccessTokenCreate?.customerAccessToken;
  if (!token) throw new Error('Correo o contraseña incorrectos.');

  return token;
}

export async function logoutCustomer(accessToken: string): Promise<void> {
  await shopifyFetch({
    query: CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
    variables: { customerAccessToken: accessToken },
  });
}

// Trae el perfil real del cliente y lo mapea al UserProfile de la Bóveda del
// Coleccionista: xp = total gastado (1 MXN = 1 XP, ver types/user.ts), tier
// calculado con la curva geométrica real, y `collection` derivada de sus
// pedidos reales (el número de serie es su posición en SU propia colección,
// no un tiraje limitado inventado).
export async function getCustomerProfile(accessToken: string): Promise<UserProfile | null> {
  const data: any = await shopifyFetch({
    query: GET_CUSTOMER_QUERY,
    variables: { customerAccessToken: accessToken },
  });

  const customer = data.customer;
  if (!customer) return null;

  const orderEdges = customer.orders?.edges || [];
  const totalSpent = orderEdges.reduce((acc: number, e: any) => acc + parseFloat(e.node.currentTotalPrice?.amount || '0'), 0);

  const lineItems = orderEdges.flatMap((e: any) => e.node.lineItems?.edges || []);
  const totalPieces = lineItems.length;

  const collection: CollectionItem[] = lineItems.slice(0, 24).map((li: any, idx: number) => ({
    id: `${customer.id}-item-${idx}`,
    sneakerTitle: li.node.title,
    sku: '',
    serialNumber: `#${String(idx + 1).padStart(3, '0')}/${String(totalPieces).padStart(3, '0')}`,
    purchaseDate: '',
    imageUrl: li.node.variant?.image?.url || '/placeholder-sneaker.svg',
    rarity: idx === 0 ? 'LEGENDARY' : idx < 3 ? 'RARE' : 'COMMON',
  }));

  const xp = Math.round(totalSpent);
  const tier = calculateGamificationTier(xp).currentTier;

  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    phone: customer.phone || '',
    isRegistered: true,
    xp,
    tier,
    collection,
    ordersCount: customer.numberOfOrders ?? orderEdges.length,
    totalSpent,
  };
}
