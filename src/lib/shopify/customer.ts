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
import { getStoredSerialsByProduct } from '@/lib/vault-purchase';
import { calculateGamificationTier, calculateHypeXp, deriveRealRarity } from '@/utils/gamification';
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

  // Fix (Fase B): antes se aplanaban los lineItems de todas las órdenes
  // perdiendo de qué orden venía cada uno — hacía falta `processedAt` real
  // para poder poner una fecha de adquisición real en cada pieza (antes
  // siempre ''), no solo para el resumen de pedidos.
  const lineItems = orderEdges.flatMap((e: any) =>
    (e.node.lineItems?.edges || []).map((li: any) => ({ ...li, orderProcessedAt: e.node.processedAt }))
  );
  const totalPieces = lineItems.length;

  // Estado VIGENTE de cada producto (score/stock/agotado) — antes solo se
  // traía el score para el bono de XP; ahora también alimenta la rareza
  // real de cada pieza (ver deriveRealRarity en utils/gamification.ts,
  // corrige el hallazgo de "rarity" inventado por posición en el array).
  let productInfoById = new Map<string, { hypeScore: number; stockRemaining: number; isSoldOut: boolean }>();
  try {
    const { products } = await getCatalogLive();
    productInfoById = new Map(
      products.map((p) => [p.id, { hypeScore: p.hypeMeter.score, stockRemaining: p.hypeMeter.stockRemaining, isSoldOut: p.isSoldOut }])
    );
  } catch (err) {
    console.error('No se pudo cargar el catálogo para ponderar XP/rareza por Hype, usando valores neutros:', err);
  }

  // Números de serie REALES, fijados en el momento en que el pedido se pagó
  // (webhook orders/paid -> vault_items). El posicional de abajo queda solo
  // como respaldo para piezas compradas ANTES de que existiera el webhook:
  // ese cambiaba solo cada vez que el cliente compraba otra cosa, porque
  // salía de la POSICIÓN de la pieza en el arreglo de pedidos.
  let serialsByProduct = new Map<string, string[]>();
  try {
    serialsByProduct = await getStoredSerialsByProduct(customer.id);
  } catch (err) {
    console.error('No se pudieron leer los números de serie guardados; se usa el posicional heredado:', err);
  }
  // Un cliente puede tener dos unidades del mismo modelo, cada una con su
  // propio serial — este cursor va consumiéndolos en orden.
  const serialCursor = new Map<string, number>();

  const collection: CollectionItem[] = lineItems.slice(0, 24).map((li: any, idx: number) => {
    const productId = li.node.variant?.product?.id;
    const info = productId ? productInfoById.get(productId) ?? null : null;

    let serialNumber = `#${String(idx + 1).padStart(3, '0')}/${String(totalPieces).padStart(3, '0')}`;
    if (productId) {
      const stored = serialsByProduct.get(productId);
      const used = serialCursor.get(productId) ?? 0;
      if (stored && stored[used]) {
        serialNumber = stored[used];
        serialCursor.set(productId, used + 1);
      }
    }

    return {
      id: `${customer.id}-item-${idx}`,
      sneakerTitle: li.node.title,
      sku: li.node.variant?.sku || '',
      serialNumber,
      purchaseDate: li.orderProcessedAt || '',
      imageUrl: li.node.variant?.image?.url || '/placeholder-sneaker.svg',
      category: li.node.variant?.product?.productType || '',
      rarity: deriveRealRarity(info),
    };
  });

  const xp = lineItems.reduce((acc: number, li: any) => {
    const price = parseFloat(li.node.originalTotalPrice?.amount || '0');
    const productId = li.node.variant?.product?.id;
    const hypeScore = productId ? (productInfoById.get(productId)?.hypeScore ?? 0) : 0;
    return acc + calculateHypeXp(price, hypeScore);
  }, 0);
  // El rango ya no depende solo del XP: también del número de piezas
  // verificadas (ver utils/gamification.ts). `collection` es exactamente esa
  // lista, una entrada por unidad comprada.
  const tier = calculateGamificationTier(xp, collection.length).currentTier;

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
