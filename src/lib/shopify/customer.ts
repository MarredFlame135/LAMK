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
  CUSTOMER_RECOVER_MUTATION,
  GET_CUSTOMER_QUERY,
} from './queries';
import { UserProfile, CollectionItem, OrderSummary } from '@/types/user';
import { calculateGamificationTier, calculateHypeXp } from '@/utils/gamification';
import { normalizeMexicanPhoneE164 } from '@/lib/validators';
import { getCatalogLive } from '@/lib/catalog-source';

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
}): Promise<CustomerAccessToken & { customerId: string }> {
  // Shopify exige E.164 (+52XXXXXXXXXX) — un número de 10 dígitos suelto
  // rebota con "Phone is invalid". Si no se puede normalizar, mejor omitirlo
  // que bloquear el registro completo por un campo opcional.
  let normalizedPhone: string | undefined;
  if (input.phone && input.phone.trim()) {
    const normalized = normalizeMexicanPhoneE164(input.phone);
    if (!normalized) throw new Error('El teléfono debe ser un número mexicano válido a 10 dígitos.');
    normalizedPhone = normalized;
  }

  const createData: any = await shopifyFetch({
    query: CUSTOMER_CREATE_MUTATION,
    variables: { input: { ...input, phone: normalizedPhone } },
  });

  const createErrors = collectUserErrors(createData.customerCreate?.customerUserErrors);
  if (createErrors) throw new Error(createErrors);
  const customerId = createData.customerCreate?.customer?.id;
  if (!customerId) throw new Error('No se pudo crear la cuenta.');

  // Shopify no regresa un token en customerCreate: hay que pedirlo aparte.
  // customerId se propaga junto con el token (hallazgo #3 de la auditoría
  // "Prompt Maestro v4": la ruta de registro lo necesita para escribir la
  // fila de consentimiento en consent_log, ver api/auth/register/route.ts).
  const token = await loginCustomer({ email: input.email, password: input.password });
  return { ...token, customerId };
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

// Dispara el correo de recuperación NATIVO de Shopify (plantilla configurada
// en Shopify Admin → Configuración → Notificaciones). Por diseño de Shopify
// (para no filtrar qué correos están registrados) esto no distingue entre
// "correo existe" y "correo no existe": siempre hay que mostrar el mismo
// mensaje de éxito en la UI.
export async function recoverCustomerPassword(email: string): Promise<void> {
  const data: any = await shopifyFetch({
    query: CUSTOMER_RECOVER_MUTATION,
    variables: { email },
  });

  const errors = collectUserErrors(data.customerRecover?.customerUserErrors);
  if (errors) throw new Error(errors);
}

export async function logoutCustomer(accessToken: string): Promise<void> {
  await shopifyFetch({
    query: CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
    variables: { customerAccessToken: accessToken },
  });
}

// Trae el perfil real del cliente y lo mapea al UserProfile de la Bóveda del
// Coleccionista: xp = suma de cada línea de pedido ponderada por el Hype
// Score que tenía ESE producto (ver calculateHypeXp en utils/gamification.ts
// — comprar algo con hype 98% rinde casi el doble que algo sin demanda), tier
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

  // Hype Score vigente de cada producto (no el que tenía al momento de la
  // compra — no lo guardamos histórico — pero sirve de buena aproximación y
  // sigue premiando los drops que YA demostraron ser calientes). Productos
  // descontinuados o que ya no están en catálogo caen a factor 1.0 (sin bono).
  let hypeById = new Map<string, number>();
  try {
    const { products } = await getCatalogLive();
    hypeById = new Map(products.map((p) => [p.id, p.hypeMeter.score]));
  } catch (err) {
    console.error('No se pudo cargar el catálogo para ponderar XP por Hype, usando factor 1.0:', err);
  }

  const xp = lineItems.reduce((acc: number, li: any) => {
    const price = parseFloat(li.node.originalTotalPrice?.amount || '0');
    const productId = li.node.variant?.product?.id;
    const hypeScore = productId ? (hypeById.get(productId) ?? 0) : 0;
    return acc + calculateHypeXp(price, hypeScore);
  }, 0);
  const tier = calculateGamificationTier(xp).currentTier;

  const recentOrders: OrderSummary[] = orderEdges.slice(0, 15).map((e: any) => ({
    id: e.node.id,
    name: e.node.name,
    date: e.node.processedAt,
    total: parseFloat(e.node.currentTotalPrice?.amount || '0'),
    currency: e.node.currentTotalPrice?.currencyCode || 'MXN',
  }));

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
    recentOrders,
  };
}
