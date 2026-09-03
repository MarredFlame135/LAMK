// src/lib/product-category.ts
//
// Traducción del `productType` crudo de Shopify a las 4 categorías de negocio
// de LAMK. Vivía dentro de lib/shopify/index.ts, que es código de servidor
// (hace fetch a la Storefront API y lee tokens); se sacó aquí para poder
// reusarlo desde componentes de cliente —la Bóveda agrupa las piezas por
// zona— sin arrastrar todo el módulo de Shopify al bundle del navegador.
//
// Es UNA sola tabla a propósito. La clasificación de una pieza tiene que dar
// el mismo resultado en el catálogo y en la Bóveda; con dos copias, el día
// que aparezca un `productType` nuevo en Shopify se actualizaría una y la
// otra no, y la misma gorra saldría en Accesorios en un lado y en otra zona
// en el otro.

export type ProductCategory = 'SNEAKERS' | 'APPAREL' | 'ACCESSORIES' | 'JEWELRY' | 'COLLECTIBLES';

// Valores reales vistos en el inventario de LAMK MX (Shopify no impone un
// vocabulario, son los que capturó la tienda).
const PRODUCT_TYPE_TO_CATEGORY: Record<string, ProductCategory> = {
  CASUAL: 'SNEAKERS',
  CONFORT: 'SNEAKERS',
  RUNNING: 'SNEAKERS',
  ROPA: 'APPAREL',
  ACCESORIOS: 'ACCESSORIES',
  JOYERÍA: 'JEWELRY',
  JOYERIA: 'JEWELRY',
};

// Default 'ACCESSORIES' (no 'SNEAKERS'): es la categoría más grande del
// catálogo real y la menos afirmativa de las cuatro. Meter por default en
// Sneakers algo cuyo tipo no reconocemos sería afirmar de más.
export function mapCategory(productType: string): ProductCategory {
  return PRODUCT_TYPE_TO_CATEGORY[(productType || '').toUpperCase().trim()] || 'ACCESSORIES';
}
