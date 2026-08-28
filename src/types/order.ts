// src/types/order.ts
//
// Tipo de Orden completo — hoy no existe una tabla propia de órdenes (el
// checkout real vive en Shopify); este tipo describe la forma que tomaría
// el registro LOCAL que dispara el webhook de post-compra (email + WhatsApp
// + tracking). Pensado para poblarse desde el webhook de Shopify
// (orders/create) o desde el checkout OTP actual — ver arquitectura en
// api/orders/webhook/route.ts (pseudocódigo, no implementado todavía).

import { CartItem, ShippingAddress } from './cart';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FULFILLED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type ShippingCarrier = 'FEDEX' | 'DHL' | 'ESTAFETA' | 'UNKNOWN';

export interface OrderItem extends Pick<CartItem, 'productId' | 'productTitle' | 'productImage' | 'variant' | 'quantity'> {
  unitPrice: number;   // Precio congelado al momento de la orden (no el actual del catálogo)
}

export interface Order {
  id: string;
  orderNumber: string;          // ej. "LAMK-1042", visible al cliente
  customerId: string;           // UserProfile.id
  customerEmail: string;
  customerPhone: string;        // Para WhatsApp de confirmación/tracking

  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: 'MXN';

  shippingAddress: ShippingAddress;
  status: OrderStatus;

  trackingCarrier?: ShippingCarrier;
  trackingCode?: string;

  emailNotifiedAt?: string;     // ISO — null hasta que el webhook confirme el envío del recibo
  whatsappNotifiedAt?: string;  // ISO — idem, para el mensaje de WhatsApp

  createdAt: string;            // ISO
  updatedAt: string;            // ISO
}
