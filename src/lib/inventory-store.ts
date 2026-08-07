// src/lib/inventory-store.ts
//
// Control de inventario local (server-side, JSON en /data — mismo patrón que
// hype.ts) mientras el token de Shopify no tenga el scope write_products de
// la Admin API:
//  - "Ocultos del catálogo PWA": IDs de productos reales de Shopify que el
//    admin desactivó — se filtran en catalog-source.ts antes de mostrarse a
//    clientes, sin tocar ni borrar nada en Shopify (RF-3.2: "sin borrar su
//    historial contable").
//  - "Borradores": artículos nuevos capturados desde el admin (con imagen ya
//    procesada por el pipeline IA) en espera de publicarse en Shopify en
//    cuanto haya credenciales de escritura.

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HIDDEN_FILE = path.join(DATA_DIR, 'hidden-products.json');
const DRAFTS_FILE = path.join(DATA_DIR, 'product-drafts.json');

export interface ProductDraft {
  id: string;
  title: string;
  brand: string;
  category: 'SNEAKERS' | 'APPAREL' | 'ACCESSORIES' | 'COLLECTIBLES' | 'JEWELRY';
  price: number;
  sizeOptions: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  status: 'DRAFT';
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.error(`Error al leer ${file}:`, err);
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (err) {
    console.error(`Error al guardar ${file}:`, err);
  }
}

export function getHiddenProductIds(): string[] {
  return readJson<string[]>(HIDDEN_FILE, []);
}

export function setProductHidden(productId: string, hidden: boolean): string[] {
  const current = new Set(getHiddenProductIds());
  if (hidden) current.add(productId);
  else current.delete(productId);
  const next = Array.from(current);
  writeJson(HIDDEN_FILE, next);
  return next;
}

export function getProductDrafts(): ProductDraft[] {
  return readJson<ProductDraft[]>(DRAFTS_FILE, []);
}

export function addProductDraft(draft: Omit<ProductDraft, 'id' | 'createdAt' | 'status'>): ProductDraft {
  const full: ProductDraft = { ...draft, id: `DRAFT-${Date.now()}`, createdAt: new Date().toISOString(), status: 'DRAFT' };
  const current = getProductDrafts();
  writeJson(DRAFTS_FILE, [full, ...current]);
  return full;
}

export function deleteProductDraft(id: string): void {
  writeJson(DRAFTS_FILE, getProductDrafts().filter((d) => d.id !== id));
}
