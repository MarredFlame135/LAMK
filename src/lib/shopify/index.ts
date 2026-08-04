// src/lib/shopify/index.ts

import { getStorefrontEndpoint, SHOPIFY_CONFIG } from './config';
import { GET_PRODUCTS_QUERY, GET_PRODUCT_BY_HANDLE_QUERY } from './queries';
import { Product, ProductVariant } from '@/types/product';

// Conector genérico HTTP para GraphQL
export async function shopifyFetch<T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  try {
    const response = await fetch(getStorefrontEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 60 }, // Cache por 60 segundos
    });

    const body = await response.json();

    if (body.errors) {
      console.error('GraphQL Errors:', body.errors);
      throw new Error(body.errors[0]?.message || 'Error en petición Shopify GraphQL');
    }

    return body.data;
  } catch (error) {
    console.error('Error al conectar con Shopify Storefront API:', error);
    throw error;
  }
}

// Función auxiliar para formatear la respuesta raw de GraphQL al tipo Product
function formatShopifyProduct(node: any): Product {
  const images = node.images?.edges?.map((e: any) => e.node.url) || [];
  
  const variants: ProductVariant[] = node.variants?.edges?.map((e: any) => {
    const v = e.node;
    const sizeVal = parseFloat(v.title) || 27; // Talla por defecto si no aplica
    
    return {
      id: v.id,
      sku: v.sku || '',
      price: parseFloat(v.price.amount),
      compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice.amount) : undefined,
      stock: v.quantityAvailable ?? 1,
      isAvailable: v.availableForSale,
      size: {
        mx: sizeVal,
        usMen: sizeVal + 2,
        usWomen: sizeVal + 3.5,
        eu: sizeVal + 15.5,
        cm: sizeVal,
      },
    };
  }) || [];

  const totalStock = variants.reduce((acc, v) => acc + v.stock, 0);

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    brand: node.vendor || 'LAMK Exclusive',
    category: 'SNEAKERS',
    description: node.description || '',
    images,
    variants,
    isSoldOut: totalStock === 0,
    fitAdvisor: node.fitAdvisor?.value ? JSON.parse(node.fitAdvisor.value) : {
      fitType: 'TRUE_TO_SIZE',
      recommendationNote: 'Viene exactamente a la talla.',
    },
    storytelling: node.storytelling?.value ? JSON.parse(node.storytelling.value) : {
      storySummary: 'Edición limitada seleccionada por Look At My Kicks MX.',
      colorway: 'Exclusive',
    },
    hypeMeter: {
      score: totalStock < 3 ? 95 : 70,
      viewsLast24h: 120,
      stockRemaining: totalStock,
      label: totalStock < 3 ? 'ULTIMOS PARES' : 'ALTA DEMANDA',
    },
  };
}

// Método público: Obtener catálogo de productos
export async function getProducts(query?: string): Promise<Product[]> {
  const data = await shopifyFetch<any>({
    query: GET_PRODUCTS_QUERY,
    variables: { first: 20, query },
  });

  return data.products.edges.map((e: any) => formatShopifyProduct(e.node));
}

// Método público: Obtener un solo producto por handle
export async function getProductByHandle(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<any>({
    query:GET_PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  });

  if (!data.product) return null;
  return formatShopifyProduct(data.product);
}