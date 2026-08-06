// src/lib/hype.ts
//
// RF-05: Hype Meter = Vistas(24h) / Stock Restante. Como el proyecto no tiene
// base de datos propia, las vistas se guardan en un archivo JSON local
// (data/views.json, gitignored) — funciona perfecto para un solo servidor;
// si en el futuro se despliega en múltiples instancias serverless conviene
// migrar esto a un store compartido real (ej. Redis/Upstash).

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const VIEWS_FILE = path.join(DATA_DIR, 'views.json');
const DAY_MS = 24 * 60 * 60 * 1000;

type ViewsStore = Record<string, number[]>; // productId -> array de timestamps

function readStore(): ViewsStore {
  try {
    if (!fs.existsSync(VIEWS_FILE)) return {};
    return JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error al leer data/views.json:', err);
    return {};
  }
}

function writeStore(store: ViewsStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VIEWS_FILE, JSON.stringify(store));
  } catch (err) {
    console.error('Error al guardar data/views.json:', err);
  }
}

function pruneOld(timestamps: number[]): number[] {
  const cutoff = Date.now() - DAY_MS;
  return timestamps.filter((t) => t > cutoff);
}

// Registra una vista real para un producto (llamado server-side desde la
// página de ficha de producto en cada request).
export function recordView(productId: string): void {
  const store = readStore();
  const fresh = pruneOld(store[productId] || []);
  fresh.push(Date.now());
  store[productId] = fresh;
  writeStore(store);
}

export function getViews24h(productId: string): number {
  const store = readStore();
  return pruneOld(store[productId] || []).length;
}

export function getAllViews24h(): Record<string, number> {
  const store = readStore();
  const result: Record<string, number> = {};
  for (const [productId, timestamps] of Object.entries(store)) {
    result[productId] = pruneOld(timestamps).length;
  }
  return result;
}

// Hype = Vistas24h / StockRestante (RF-05). Normalizado a 0-100 para la barra
// visual: una relación de 5 vistas por par restante o más ya se considera
// "al tope" (100%). Sin stock, el hype es máximo (se agotó = hubo demanda).
export function computeHypeMeter(views24h: number, stockRemaining: number): { score: number; label: 'NORMAL' | 'ALTA DEMANDA' | 'DROPPED' | 'ULTIMOS PARES' } {
  if (stockRemaining <= 0) {
    return { score: views24h > 0 ? 100 : 0, label: views24h > 0 ? 'DROPPED' : 'DROPPED' };
  }

  const ratio = views24h / stockRemaining;
  const score = Math.max(0, Math.min(100, Math.round((ratio / 5) * 100)));

  const label = stockRemaining <= 2 ? 'ULTIMOS PARES' : score >= 60 ? 'ALTA DEMANDA' : 'NORMAL';

  return { score, label };
}
