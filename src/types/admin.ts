// src/types/admin.ts

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

export interface AIImagePipelineJob {
  id: string;
  originalImageUrl: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processedImageUrl?: string;   // Imagen en WebP sin fondo y reiluminada
  backgroundOption: 'DARK_ASPHALT' | 'OFF_WHITE' | 'TRANSPARENT';
}