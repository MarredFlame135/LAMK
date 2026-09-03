// src/lib/shopify/index.ts

import { getStorefrontEndpoint, SHOPIFY_CONFIG } from './config';
import { GET_PRODUCTS_QUERY, GET_PRODUCT_BY_HANDLE_QUERY } from './queries';
import { Product, ProductVariant } from '@/types/product';
import { mapCategory } from '@/lib/product-category';

// Conector genérico HTTP para GraphQL
export async function shopifyFetch<T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  const endpoint = getStorefrontEndpoint();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Usar Token Privado o Público de Storefront API
  if (SHOPIFY_CONFIG.privateAccessToken) {
    headers['Shopify-Storefront-Private-Token'] = SHOPIFY_CONFIG.privateAccessToken;
  } else {
    headers['X-Shopify-Storefront-Access-Token'] = SHOPIFY_CONFIG.storefrontAccessToken;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 }, // Cache por 60 segundos
  });

  const body = await response.json();

  // Shopify puede devolver `errors` (ej. campos sin permiso, como quantityAvailable
  // sin el scope de inventario) JUNTO con `data` parcialmente válida. Solo debe
  // considerarse fatal si no hay datos utilizables — de lo contrario se loguea
  // y se sigue con lo que sí vino, en vez de tirar todo el catálogo por un campo.
  if (body.errors) {
    const uniqueMessages = Array.from(new Set(body.errors.map((e: any) => e.message)));
    console.warn(`Shopify GraphQL devolvió ${body.errors.length} error(es) parcial(es):`, uniqueMessages);
  }
  if (!body.data) {
    throw new Error(body.errors?.[0]?.message || 'Error en petición Shopify GraphQL: sin datos');
  }

  return body.data;
}

// La tabla productType -> categoría se mudó a lib/product-category.ts para
// que la Bóveda (componente de cliente) pueda agrupar piezas por zona usando
// exactamente la misma clasificación, sin importar este módulo de servidor.
// El campo `vendor` de Shopify siempre trae el nombre de la tienda, no la
// marca real, así que la marca se extrae del título con un heurístico
// best-effort (ver guessBrandFromTitle abajo).

// Palabras de categoría que suelen abrir el título (ej. "TENIS SAMBA OG...",
// "GORRA DANDY HATS x JUNIOR H...") — se recortan para exponer la marca real.
const LEADING_CATEGORY_WORDS = [
  'TENIS', 'SANDALIA', 'GORRA', 'HOODIE', 'T-SHIRT', 'TSHIRT', 'PLAYERA',
  'BOMBER JACKET', 'SHORT', 'PULSO', 'PULSERA', 'CHAMARRA', 'SUDADERA', 'COLLAR',
];

function guessBrandFromTitle(title: string, category: Product['category']): string {
  let rest = title.trim();
  for (const word of LEADING_CATEGORY_WORDS) {
    const re = new RegExp(`^${word}\\s+`, 'i');
    if (re.test(rest)) {
      rest = rest.replace(re, '');
      break;
    }
  }
  // Corta en la primera comilla (donde suele empezar el nombre del colorway/modelo)
  const quoteIdx = rest.search(/['"‘’]/);
  const brand = (quoteIdx > 0 ? rest.slice(0, quoteIdx) : rest).trim();
  return brand || category;
}

// Convierte el título de una variante en la conversión de tallas correspondiente.
// Solo sneakers reales usan MX/US/EU; el resto (ropa, accesorios) usa su propia
// etiqueta (S/M/L, "Default Title" → ÚNICA) vía sizeLabel — ver types/product.ts.
function parseVariantSize(variantTitle: string, category: Product['category']) {
  if (category === 'SNEAKERS') {
    const mx = parseFloat(variantTitle.replace(/mx/i, '').trim());
    if (!isNaN(mx)) {
      return {
        size: { mx, usMen: mx - 18, usWomen: mx - 16.5, eu: mx + 15.5, cm: mx },
        sizeLabel: undefined as string | undefined,
      };
    }
  }
  const label = variantTitle === 'Default Title' ? 'ÚNICA' : variantTitle;
  return {
    size: { mx: 0, usMen: 0, usWomen: 0, eu: 0, cm: 0 },
    sizeLabel: label,
  };
}

// Función auxiliar para formatear la respuesta raw de GraphQL al tipo Product
function formatShopifyProduct(node: any): Product {
  const images = node.images?.edges?.map((e: any) => e.node.url) || [];
  const category = mapCategory(node.productType);

  const variants: ProductVariant[] = (node.variants?.edges || []).map((e: any) => {
    const v = e.node;
    const { size, sizeLabel } = parseVariantSize(v.title, category);

    return {
      id: v.id,
      sku: v.sku || '',
      price: parseFloat(v.price.amount),
      compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice.amount) : undefined,
      // quantityAvailable requiere el scope `unauthenticated_read_product_inventory`.
      // Mientras no esté activo llega null: nos apoyamos en availableForSale (sí
      // confiable) y evitamos inventar una cantidad falsa.
      stock: typeof v.quantityAvailable === 'number' ? v.quantityAvailable : (v.availableForSale ? 1 : 0),
      isAvailable: v.availableForSale,
      size,
      sizeLabel,
    };
  });

  const availableVariants = variants.filter((v) => v.isAvailable).length;
  const totalStock = variants.reduce((acc, v) => acc + v.stock, 0);
  const hasInventoryData = variants.length > 0; // placeholder de señal, ver src/lib/hype.ts para el cálculo real

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    brand: guessBrandFromTitle(node.title, category),
    category,
    description: node.description || '',
    images,
    variants,
    isSoldOut: availableVariants === 0,
    fitAdvisor: node.fitAdvisor?.value ? JSON.parse(node.fitAdvisor.value) : {
      fitType: 'TRUE_TO_SIZE',
      recommendationNote: 'Viene exactamente a la talla.',
    },
    storytelling: node.storytelling?.value ? JSON.parse(node.storytelling.value) : {
      storySummary: 'Edición limitada seleccionada por Look At My Kicks MX.',
      colorway: 'Exclusive',
    },
    hypeMeter: {
      score: availableVariants > 0 && availableVariants <= 2 ? 95 : availableVariants === 0 ? 0 : 70,
      sampleSize: 0, // se completa en tiempo real — ver withRealHype en catalog-source.ts
      viewsLast24h: 0, // se completa en tiempo real — ver src/lib/hype.ts
      stockRemaining: hasInventoryData ? totalStock : availableVariants,
      label: availableVariants === 0 ? 'DROPPED' : availableVariants <= 2 ? 'ULTIMOS PARES' : 'ALTA DEMANDA',
    },
    publishedAt: node.publishedAt,
  };
}

// Método público: Obtener catálogo de productos COMPLETO — pagina hasta que
// Shopify diga que ya no hay más (hasNextPage: false), sin tope artificial.
// El límite de "safety" de abajo (100 páginas × 50 = 5,000 productos) es
// solo una válvula de escape contra un bug de paginación infinita, no un
// techo de inventario real — ningún catálogo de LAMK MX se acerca a eso.
export async function getProducts(query?: string): Promise<Product[]> {
  const all: Product[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;
  let safety = 0;
  const PAGE_SIZE = 50;
  const MAX_PAGES = 100;

  while (hasNextPage && safety < MAX_PAGES) {
    const data: any = await shopifyFetch<any>({
      query: GET_PRODUCTS_QUERY,
      variables: { first: PAGE_SIZE, query, after: cursor },
    });

    const edges = data.products?.edges || [];
    all.push(...edges.map((e: any) => formatShopifyProduct(e.node)));

    hasNextPage = data.products?.pageInfo?.hasNextPage || false;
    cursor = edges[edges.length - 1]?.cursor;
    safety += 1;
  }

  if (hasNextPage) {
    console.warn(`getProducts: se alcanzó el límite de seguridad de ${MAX_PAGES} páginas (${all.length} productos) sin agotar la paginación de Shopify.`);
  }

  return all;
}

// Método público: Obtener un solo producto por handle
export async function getProductByHandle(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<any>({
    query: GET_PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  });

  if (!data.product) return null;
  return formatShopifyProduct(data.product);
}
