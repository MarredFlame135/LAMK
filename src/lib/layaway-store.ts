// src/lib/layaway-store.ts
//
// Solicitudes de apartado ("layaway") capturadas por TENISIN cuando un
// cliente quiere reservar un par/prenda pagando un % por adelantado.
// Mismo patrón server-side en JSON que leads-store.ts / sales-store.ts —
// así el admin las ve desde su propio dispositivo sin depender de
// localStorage del navegador del cliente.

import fs from 'fs';
import path from 'path';
import { LayawayRequest, PaymentNoteEntry } from '@/types/admin';

const DATA_DIR = path.join(process.cwd(), 'data');
const LAYAWAY_FILE = path.join(DATA_DIR, 'layaway.json');

function readLayaways(): LayawayRequest[] {
  try {
    if (!fs.existsSync(LAYAWAY_FILE)) return [];
    const items: LayawayRequest[] = JSON.parse(fs.readFileSync(LAYAWAY_FILE, 'utf-8'));
    // Compatibilidad: apartados guardados antes de que existiera `paymentNotes`.
    return items.map((l) => ({ ...l, paymentNotes: l.paymentNotes || [] }));
  } catch (err) {
    console.error('Error al leer layaway.json:', err);
    return [];
  }
}

function writeLayaways(items: LayawayRequest[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LAYAWAY_FILE, JSON.stringify(items));
  } catch (err) {
    console.error('Error al guardar layaway.json:', err);
  }
}

export function getLayaways(): LayawayRequest[] {
  return readLayaways();
}

export function addLayaway(input: {
  productId: string;
  productTitle: string;
  productImage: string;
  requestedSize?: string;
  totalPrice: number;
  percentage: number;
  depositAmount: number;
  hypeScore?: number;
  customerPhone: string;
  note?: string;
}): LayawayRequest {
  const item: LayawayRequest = {
    id: `LAYAWAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: input.productId,
    productTitle: input.productTitle,
    productImage: input.productImage,
    requestedSize: input.requestedSize || 'N/A',
    totalPrice: input.totalPrice,
    percentage: input.percentage,
    depositAmount: input.depositAmount,
    hypeScore: input.hypeScore ?? 0,
    customerPhone: input.customerPhone,
    note: input.note || '',
    paymentNotes: [],
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    source: 'TENISIN_CHAT',
  };
  writeLayaways([item, ...readLayaways()]);
  return item;
}

export function updateLayaway(id: string, patch: Partial<LayawayRequest>): void {
  writeLayaways(readLayaways().map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

// Agrega un abono al historial (nunca reemplaza los anteriores) — usado por
// la pestaña Clientes del admin para dejar constancia de fecha y monto.
export function addPaymentNote(id: string, entry: { amount: number; note: string }): PaymentNoteEntry | null {
  const layaways = readLayaways();
  const target = layaways.find((l) => l.id === id);
  if (!target) return null;

  const newEntry: PaymentNoteEntry = {
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    amount: entry.amount,
    note: entry.note,
  };
  target.paymentNotes = [newEntry, ...target.paymentNotes];
  writeLayaways(layaways);
  return newEntry;
}

export function deleteLayaway(id: string): void {
  writeLayaways(readLayaways().filter((l) => l.id !== id));
}
