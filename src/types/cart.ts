// src/types/cart.ts

import { ProductVariant } from './product';

export interface CartItem {
  id: string;                // ID único de ítem en carrito
  productId: string;
  productTitle: string;
  productImage: string;
  variant: ProductVariant;
  quantity: number;
  addedAt: number;           // Timestamp
}

export interface ShippingAddress {
  fullName: string;
  phone: string;             // 10 dígitos MX (para WhatsApp)
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;      // Colonia
  postalCode: string;        // 5 dígitos MX
  city: string;
  state: string;
  isNormalized: boolean;     // Validado por algoritmo de CP
}

export type VerificationStatus = 'NOT_REQUIRED' | 'PENDING_OTP' | 'VERIFIED' | 'FAILED';

export interface SpecialCartState {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  freeShippingThreshold: number; // Meta para recompensa/envío gratis
  shippingAddress: ShippingAddress | null;
  verificationStatus: VerificationStatus;
  otpCodeSent?: string;
  isPersistentLocal: boolean;    // Estado guardado en IndexedDB
}