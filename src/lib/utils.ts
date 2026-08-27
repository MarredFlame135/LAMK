// src/lib/utils.ts

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product } from '@/types/product';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Serial/código determinístico a partir de datos reales del producto (SKU si
// existe, si no un fragmento estable del GID) — nunca un número inventado.
// Compartido por ProductCard y por las tarjetas de las 3 versiones de Home.
export function deriveSerial(product: Pick<Product, 'variants' | 'id'>): string {
  const raw = product.variants[0]?.sku || product.id;
  const code = raw.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `LK-${code}`;
}
