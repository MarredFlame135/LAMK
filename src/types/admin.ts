// src/types/admin.ts

import { CollectorTier } from './user';

export interface OfflineSale {
  id: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;         // ej. "Yeezy 350 V2 Onyx Talla 28"
  totalAmount: number;
  amountPaid: number;
  pendingBalance: number;       // Deuda
  dueDate: string;              // Fecha límite de pago
  paymentStatus: 'PAID' | 'PARTIAL_DEBT' | 'OVERDUE';
  createdAt: string;
}

export interface DemandRequest {
  id: string;
  productId: string;
  productTitle: string;
  requestedSize: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: string;
  notified: boolean;
  // Campos adicionales capturados por TENISIN (asistente IA) — opcionales para
  // no romper otros consumidores del tipo que ya usaban el contrato original.
  rawQuery?: string;          // Texto exacto que escribió el cliente en el chat
  wasMatched?: boolean;       // true si TENISIN encontró un producto disponible
  source?: 'TENISIN_CHAT';    // Origen de la petición, por si en el futuro hay más canales
}

export type LayawayStatus = 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CANCELLED';

// Registro de un abono/adelanto de pago sobre un apartado — con fecha y monto,
// a diferencia del campo `note` (comentario libre, un solo valor editable).
// Es un historial: cada abono queda registrado por separado y nunca se borra
// solo, para que el admin pueda reconstruir cuánto y cuándo pagó el cliente.
export interface PaymentNoteEntry {
  id: string;
  date: string;      // ISO
  amount: number;     // MXN
  note: string;        // ej. "Abono en efectivo en tienda", "Transferencia BBVA"
}

export interface LayawayRequest {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  requestedSize: string;
  totalPrice: number;           // Precio total de la prenda/par, MXN
  percentage: number;           // % que el cliente quiere apartar (20, 30, 50 u OTRO)
  depositAmount: number;        // totalPrice * percentage/100, redondeado
  hypeScore: number;            // Hype del producto al momento del apartado (para priorizar en admin)
  customerPhone: string;
  note: string;                 // Comentario del apartado — visible para admin y cliente
  paymentNotes: PaymentNoteEntry[]; // Historial de abonos con fecha y monto (Fase 4 — Clientes)
  status: LayawayStatus;
  createdAt: string;
  source: 'TENISIN_CHAT';
}

// Fila unificada de la pestaña "Clientes" del Admin Dashboard: combina
// clientes reales de Shopify (Admin API, si está configurada — ver
// shopify/admin.ts) con clientes que solo existen como leads/apartados
// capturados por TENISIN (sin cuenta Shopify todavía).
export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;             // 10 dígitos, sin +52
  xp: number;
  tier: CollectorTier;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string | null; // ISO real (Fase D.5, base de "Recencia" en RFM) — null si nunca ha comprado o es LEAD_ONLY
  source: 'SHOPIFY' | 'LEAD_ONLY';
}

// Fila completa que consume ClientsPanel: el cliente + sus apartados activos
// (con historial de abonos) ya cruzados por teléfono.
export interface AdminCustomerDetail extends AdminCustomer {
  layaways: LayawayRequest[];
}

export interface AIImagePipelineJob {
  id: string;
  originalImageUrl: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processedImageUrl?: string;   // Imagen en WebP sin fondo y reiluminada
  backgroundOption: 'DARK_ASPHALT' | 'OFF_WHITE' | 'TRANSPARENT';
}