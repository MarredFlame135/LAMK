// src/types/product.ts

export type SizeSystem = 'MX' | 'US_M' | 'US_W' | 'EU' | 'CM';

export interface SizeConversion {
  mx: number;       // ej. 27
  usMen: number;    // ej. 9
  usWomen: number;  // ej. 10.5
  eu: number;       // ej. 42.5
  cm: number;       // ej. 27
}

export interface FitAdvisor {
  fitType: 'TRUE_TO_SIZE' | 'HALF_SIZE_UP' | 'HALF_SIZE_DOWN';
  recommendationNote: string; // ej. "Este modelo viene 0.5 talla reducido"
}

export interface HypeMeterData {
  score: number;             // 0 a 100%
  viewsLast24h: number;
  stockRemaining: number;
  label: 'NORMAL' | 'ALTA DEMANDA' | 'DROPPED' | 'ULTIMOS PARES';
}

export interface StorytellingMeta {
  collaboration?: string;    // ej. "Travis Scott x Jordan Brand"
  releaseYear?: number;      // ej. 2023
  designer?: string;
  storySummary: string;      // Historia corta del par para percepción de lujo
  colorway: string;          // ej. "Mocha / Black / Velvet"
}

export interface ProductVariant {
  id: string;                // GID de Shopify
  size: SizeConversion;      // Requerido para compatibilidad; en no-calzado se usa un valor neutro (ver sizeLabel)
  sizeLabel?: string;        // Etiqueta real a mostrar cuando la prenda NO es calzado, ej. "M", "AJUSTABLE", "ÚNICA"
  stock: number;
  price: number;             // MXN
  compareAtPrice?: number;   // Precio original si tiene descuento
  sku: string;
  isAvailable: boolean;
}

export interface Product {
  id: string;                // GID de Shopify
  handle: string;            // ej. "jordan-1-retro-high-travis-scott"
  title: string;
  brand: string;             // ej. "Nike", "Yeezy", "Fear of God"
  category: 'SNEAKERS' | 'APPAREL' | 'ACCESSORIES' | 'COLLECTIBLES' | 'JEWELRY';
  description: string;
  images: string[];          // URLs procesadas en WebP 4K por IA
  variants: ProductVariant[];
  storytelling: StorytellingMeta;
  fitAdvisor: FitAdvisor;
  hypeMeter: HypeMeterData;
  isSoldOut: boolean;
  publishedAt?: string;      // ISO — solo viene poblado desde Shopify real (ver discovery.ts "JUST DROPPED")
}