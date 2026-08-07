// src/lib/sales-store.ts
//
// Ventas físicas y deudas (server-side, JSON en /data). Antes vivían en el
// localStorage del navegador del admin: no sincronizaban entre su celular y
// su computadora, y se perdían al limpiar datos del navegador.

import fs from 'fs';
import path from 'path';
import { OfflineSale } from '@/types/admin';

const DATA_DIR = path.join(process.cwd(), 'data');
const SALES_FILE = path.join(DATA_DIR, 'offline-sales.json');

const SEED_SALES: OfflineSale[] = [
  {
    id: 'SALE-101',
    customerName: 'Carlos Mendoza',
    customerPhone: '5512345678',
    itemsSummary: 'Yeezy Boost 350 V2 Onyx (Talla 28 MX)',
    totalAmount: 5800,
    amountPaid: 3000,
    pendingBalance: 2800,
    dueDate: '2026-08-15',
    paymentStatus: 'PARTIAL_DEBT',
    createdAt: '2026-07-30',
  },
  {
    id: 'SALE-102',
    customerName: 'Sofía Guerrero',
    customerPhone: '5587654321',
    itemsSummary: 'Air Jordan 1 Retro High OG Lost & Found (Talla 24 MX)',
    totalAmount: 9200,
    amountPaid: 9200,
    pendingBalance: 0,
    dueDate: '2026-07-30',
    paymentStatus: 'PAID',
    createdAt: '2026-07-28',
  },
];

function readSales(): OfflineSale[] {
  try {
    if (!fs.existsSync(SALES_FILE)) return SEED_SALES;
    return JSON.parse(fs.readFileSync(SALES_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error al leer offline-sales.json:', err);
    return SEED_SALES;
  }
}

function writeSales(sales: OfflineSale[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales));
  } catch (err) {
    console.error('Error al guardar offline-sales.json:', err);
  }
}

export function getSales(): OfflineSale[] {
  return readSales();
}

export function addSale(input: Omit<OfflineSale, 'id' | 'createdAt' | 'pendingBalance' | 'paymentStatus'> & { dueDate?: string }): OfflineSale {
  const pending = Math.max(0, input.totalAmount - input.amountPaid);
  const sale: OfflineSale = {
    id: `SALE-${Date.now().toString().slice(-6)}`,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    itemsSummary: input.itemsSummary,
    totalAmount: input.totalAmount,
    amountPaid: input.amountPaid,
    pendingBalance: pending,
    dueDate: input.dueDate || new Date().toISOString().split('T')[0],
    paymentStatus: pending === 0 ? 'PAID' : 'PARTIAL_DEBT',
    createdAt: new Date().toISOString().split('T')[0],
  };
  writeSales([sale, ...readSales()]);
  return sale;
}
