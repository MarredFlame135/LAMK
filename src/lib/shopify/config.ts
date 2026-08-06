// src/lib/shopify/config.ts

// Las credenciales NUNCA van hardcodeadas aquí — viven solo en .env.local
// (gitignored) o en las variables de entorno del hosting en producción.
// Ver .env.example para la lista de variables requeridas.
export const SHOPIFY_CONFIG = {
  domain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || '',
  storefrontAccessToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
  privateAccessToken: process.env.SHOPIFY_PRIVATE_STOREFRONT_ACCESS_TOKEN || '',
  apiVersion: process.env.SHOPIFY_API_VERSION || '2024-07',
};

export const getStorefrontEndpoint = (): string => {
  return `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;
};