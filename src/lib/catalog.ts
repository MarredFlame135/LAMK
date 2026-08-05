// src/lib/catalog.ts
//
// Fuente única de verdad del catálogo mientras no hay products_export.csv ni
// credenciales reales de Shopify Storefront API en el proyecto (ver .env.example).
// Home, Catálogo, Ficha de Producto, Vault y Tenisin leen TODOS de aquí para
// evitar los 3 datasets hardcodeados distintos e inconsistentes que había antes.
//
// Cuando SHOPIFY_CONFIG tenga credenciales reales, getCatalog() puede
// reemplazarse por getProducts() de '@/lib/shopify' sin tocar a los consumidores.

import { Product, ProductVariant } from '@/types/product';

// Talla neutra para productos que NO son calzado (bolsos, gorras, peluches).
// El UI nunca debe mostrar estos números: siempre debe preferir `sizeLabel`.
const NA_SIZE = { mx: 0, usMen: 0, usWomen: 0, eu: 0, cm: 0 };

function shoeVariant(mx: number, price: number, stock: number, sku: string): ProductVariant {
  return {
    id: `${sku}-${mx}`,
    sku: `${sku}-${mx}`,
    price,
    stock,
    isAvailable: stock > 0,
    size: { mx, usMen: mx - 18, usWomen: mx - 16.5, eu: mx + 15.5, cm: mx },
  };
}

function labeledVariant(sizeLabel: string, price: number, stock: number, sku: string): ProductVariant {
  return {
    id: `${sku}-${sizeLabel}`,
    sku: `${sku}-${sizeLabel}`,
    price,
    stock,
    isAvailable: stock > 0,
    size: NA_SIZE,
    sizeLabel,
  };
}

export const CATALOG: Product[] = [
  {
    id: 'prod-bape-seoul-shark',
    handle: 'hoodie-bape-seoul-exclusive-camo-shark',
    title: 'HOODIE BAPE SEOUL EXCLUSIVE CAMO SHARK',
    brand: 'BAPE',
    category: 'APPAREL',
    description: 'Edición especial Seoul Exclusive importada, corte japonés oversize.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/26_205bc3c0-8181-49ae-8b46-b5ac52fd656e.png?v=1781933042'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'HALF_SIZE_UP', recommendationNote: 'Recomendamos pedir 0.5 o 1 talla arriba (Corte Japonés).' },
    storytelling: { collaboration: 'BAPE Seoul Store', storySummary: 'Lanzamiento limitado exclusivo de la tienda BAPE Seúl.', colorway: 'Seoul Camo / Shark' },
    hypeMeter: { score: 98, viewsLast24h: 340, stockRemaining: 3, label: 'ULTIMOS PARES' },
    variants: [
      labeledVariant('S', 15500, 1, 'BAPE-SEOUL'),
      labeledVariant('M', 15500, 2, 'BAPE-SEOUL'),
      labeledVariant('L', 15500, 0, 'BAPE-SEOUL'),
    ],
  },
  {
    id: 'prod-supreme-satin-black',
    handle: 'hoodie-supreme-satin-applique-black',
    title: "HOODIE SUPREME SATIN APPLIQUE 'BLACK'",
    brand: 'SUPREME',
    category: 'APPAREL',
    description: 'Aplicación satinada bordada, temporada FW. Pieza de colección.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/24_4b814d58-aca7-4592-86c0-2ceb64117832.png?v=1782102027'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Viene exactamente a la talla americana.' },
    storytelling: { storySummary: 'Pieza icónica de la temporada, alta rotación de reventa.', colorway: 'Black' },
    hypeMeter: { score: 92, viewsLast24h: 210, stockRemaining: 5, label: 'ALTA DEMANDA' },
    variants: [
      labeledVariant('M', 8000, 2, 'SUP-SATIN-BLK'),
      labeledVariant('L', 8000, 2, 'SUP-SATIN-BLK'),
      labeledVariant('XL', 8000, 1, 'SUP-SATIN-BLK'),
    ],
  },
  {
    id: 'prod-sp5der-rhinestone-pink',
    handle: 'hoodie-sp5der-rhinestone-pink',
    title: 'HOODIE SP5DER RHINESTONE PINK',
    brand: 'SP5DER',
    category: 'APPAREL',
    description: 'Estampado de telaraña con pedrería, edición rosa.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/24_f656e803-a20d-4356-95f8-b1f5c1b94971.png?v=1783829402'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'HALF_SIZE_DOWN', recommendationNote: 'Corte oversize; si buscas fit ajustado pide 0.5 talla abajo.' },
    storytelling: { storySummary: 'Pieza statement de Sp5der con pedrería aplicada a mano.', colorway: 'Pink / Rhinestone' },
    hypeMeter: { score: 95, viewsLast24h: 275, stockRemaining: 4, label: 'ALTA DEMANDA' },
    variants: [
      labeledVariant('S', 9000, 1, 'SP5-RHINE-PNK'),
      labeledVariant('L', 9000, 2, 'SP5-RHINE-PNK'),
      labeledVariant('XL', 9000, 1, 'SP5-RHINE-PNK'),
    ],
  },
  {
    id: 'prod-diesel-1dr-mini',
    handle: 'white-1dr-xs-iconic-mini-bag-in-matte-leather',
    title: 'WHITE 1DR XS-ICONIC MINI BAG DIESEL',
    brand: 'DIESEL',
    category: 'ACCESSORIES',
    description: 'Bolso mini en piel mate, herrería D plateada icónica.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/7B8EB3E6-8BEA-4460-A6C4-ACF06539EB6C.jpg?v=1784006585'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Talla única, accesorio.' },
    storytelling: { storySummary: 'Ícono de la colección 1DR, edición mate blanca.', colorway: 'White Matte' },
    hypeMeter: { score: 89, viewsLast24h: 150, stockRemaining: 2, label: 'ALTA DEMANDA' },
    variants: [labeledVariant('ÚNICA', 5000, 2, 'DIESEL-1DR-XS')],
  },
  {
    id: 'prod-marc-jacobs-tote-mini',
    handle: 'marc-jacobs-the-tote-bag-mini-leather',
    title: "MARC JACOBS 'THE TOTE BAG' MINI LEATHER",
    brand: 'MARC JACOBS',
    category: 'ACCESSORIES',
    description: 'Tote bag mini en piel, letras troqueladas icónicas.',
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80'],
    isSoldOut: true,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Talla única, accesorio.' },
    storytelling: { storySummary: 'La bolsa más buscada del momento, restock incierto por proveedor.', colorway: 'Tan Leather' },
    hypeMeter: { score: 90, viewsLast24h: 260, stockRemaining: 0, label: 'DROPPED' },
    variants: [labeledVariant('ÚNICA', 4200, 0, 'MJ-TOTE-MINI')],
  },
  {
    id: 'prod-baez-shifu-astrogengar',
    handle: 'baez-x-shifu-astrogengar-azul',
    title: 'BÁEZ X SHIFU ASTROGENGAR AZUL',
    brand: 'BÁEZ X SHIFU',
    category: 'ACCESSORIES',
    description: 'Gorra colaborativa edición limitada, bordado 3D.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/661D32B3-5BD3-4A3B-A618-5A6536B6D96E.jpg?v=1783909694'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Ajustable con broche trasero, una talla para todos.' },
    storytelling: { collaboration: 'Báez x Shifu', storySummary: 'Colaboración local de edición limitada, drop numerado.', colorway: 'Astro Blue' },
    hypeMeter: { score: 94, viewsLast24h: 300, stockRemaining: 6, label: 'ALTA DEMANDA' },
    variants: [labeledVariant('AJUSTABLE', 2800, 6, 'BAEZ-SHIFU-ASTRO')],
  },
  {
    id: 'prod-pokemon-charmander',
    handle: 'peluche-pokemon-center-japon-charmander',
    title: "PELUCHE POKEMON CENTER JAPÓN 'CHARMANDER'",
    brand: 'POKEMON CENTER',
    category: 'COLLECTIBLES',
    description: 'Peluche oficial importado directo de Pokémon Center Japón.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/15_6ef7c100-f2b7-448c-bca4-1b1412fdb9da.png?v=1782796167'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Talla única, coleccionable.' },
    storytelling: { storySummary: 'Importación directa, stock muy limitado por par de maleta.', colorway: 'Orange / Original' },
    hypeMeter: { score: 85, viewsLast24h: 95, stockRemaining: 5, label: 'ALTA DEMANDA' },
    variants: [labeledVariant('ÚNICA', 1200, 5, 'POKE-CHARMANDER')],
  },
  {
    id: 'prod-adidas-pharrell',
    handle: 'tenis-adidas-x-pharrell-williams',
    title: 'TENIS ADIDAS x PHARRELL WILLIAMS',
    brand: 'ADIDAS',
    category: 'SNEAKERS',
    description: 'Colaboración icónica de edición limitada enfocada en cultura streetwear.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/DUNK_LOW_REVERSE_UNC_45cd9714-c500-421f-8962-d12c5a09b48e.png?v=1785819967'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Viene exactamente a la talla.' },
    storytelling: { collaboration: 'Pharrell Williams', storySummary: 'Diseño exclusivo enfocado en la cultura streetwear.', colorway: 'Multi' },
    hypeMeter: { score: 88, viewsLast24h: 190, stockRemaining: 6, label: 'ALTA DEMANDA' },
    variants: [
      shoeVariant(25, 10000, 2, 'ADI-PHAR'),
      shoeVariant(26, 10000, 2, 'ADI-PHAR'),
      shoeVariant(27, 10000, 2, 'ADI-PHAR'),
      shoeVariant(28, 10000, 0, 'ADI-PHAR'),
    ],
  },
  {
    id: 'prod-jordan1-lost-found',
    handle: 'air-jordan-1-retro-high-og-lost-and-found',
    title: 'AIR JORDAN 1 RETRO HIGH OG LOST & FOUND',
    brand: 'JORDAN',
    category: 'SNEAKERS',
    description: 'Colorway vintage inspirado en el par original de 1985.',
    images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'HALF_SIZE_DOWN', recommendationNote: 'Este modelo viene grande; pide 0.5 talla abajo.' },
    storytelling: { collaboration: 'Jordan Brand', releaseYear: 2022, storySummary: 'Réplica del acabado envejecido y caja especial del par original.', colorway: 'Chicago Vintage' },
    hypeMeter: { score: 99, viewsLast24h: 410, stockRemaining: 1, label: 'ULTIMOS PARES' },
    variants: [
      shoeVariant(24, 9200, 0, 'AJ1-LNF'),
      shoeVariant(25, 9200, 0, 'AJ1-LNF'),
      shoeVariant(26, 9200, 1, 'AJ1-LNF'),
      shoeVariant(27, 9200, 0, 'AJ1-LNF'),
    ],
  },
];

// Categorías de negocio usadas en filtros de UI (ES, como el resto de la marca)
export const CATEGORY_LABELS: Record<Product['category'], string> = {
  SNEAKERS: 'TENIS',
  APPAREL: 'ROPA',
  ACCESSORIES: 'BOLSOS Y GORRAS',
  COLLECTIBLES: 'PELUCHES',
};

export function getCatalog(): Product[] {
  return CATALOG;
}

export function getProductByHandle(handle: string): Product | undefined {
  return CATALOG.find((p) => p.handle === handle);
}

export function getProductById(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}

// Búsqueda simple usada por Tenisin y por el catálogo: coincide por título,
// marca, categoría, colaboración o colorway. Suficiente para lenguaje natural
// corto ("bape hoodie", "gorra azul", "tenis jordan talla 26").
export function searchCatalog(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);

  return CATALOG.filter((p) => {
    const haystack = [
      p.title,
      p.brand,
      p.category,
      CATEGORY_LABELS[p.category],
      p.storytelling.colorway,
      p.storytelling.collaboration || '',
    ]
      .join(' ')
      .toLowerCase();

    // Coincide si CUALQUIER término de búsqueda aparece en el texto del producto
    return terms.some((term) => haystack.includes(term));
  });
}
